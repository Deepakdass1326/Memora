require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');
const collectionRoutes = require('./routes/collection.routes');
const searchRoutes = require('./routes/search.routes');
const tagRoutes = require('./routes/tag.routes');
const resurfaceRoutes = require('./routes/resurface.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const noteRoutes = require('./routes/note.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// Connect to MongoDB
connectDB();

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

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Accept all origins — security is enforced by httpOnly cookies, not origin filtering
    callback(null, true);
  },
  credentials: true,
}));
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
app.use('/api/notes', noteRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Memora server running on port ${PORT}`));

module.exports = app;
