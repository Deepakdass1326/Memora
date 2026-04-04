require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const connectDB = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');
const collectionRoutes = require('./routes/collection.routes');
const searchRoutes = require('./routes/search.routes');
const tagRoutes = require('./routes/tag.routes');
const resurfaceRoutes = require('./routes/resurface.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const noteRoutes     = require('./routes/note.routes');
const aiRoutes       = require('./routes/ai.routes');
const uploadRoutes   = require('./routes/upload.routes');
const { initQueue, startWorker, closeQueue } = require('./queues/ai.queue');

const app = express();

// Connect to MongoDB
connectDB();

// Initialize BullMQ queue + worker (graceful — no-op if REDIS_URL is missing)
initQueue();
startWorker();

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // raised from 200
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window (was 1 min)
  max: 100,                  // 100 attempts per 15 min (was 15/min)
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

// Middleware - CORS must be first, before rate limiter
app.use(compression()); // gzip all responses — reduces payload size ~80%
const corsOptions = {
  origin: true, // Accept all origins — security enforced by httpOnly cookies
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Explicitly handle all OPTIONS preflight requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', globalLimiter);

// Request logging (dev)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/resurface', resurfaceRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/notes',      noteRoutes);
app.use('/api/ai',         aiRoutes);
app.use('/api/upload',     uploadRoutes);

// Health check — also confirms CORS is working if reachable from frontend
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0', timestamp: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`🚀 Memora server running on port ${PORT}`));

// Graceful shutdown — close BullMQ & Redis before exit
const shutdown = async (signal) => {
  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await closeQueue();
    console.log('[Server] Closed. Goodbye.');
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
