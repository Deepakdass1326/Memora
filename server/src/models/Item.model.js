const mongoose = require('mongoose');

const highlightSchema = new mongoose.Schema({
  text: { type: String, required: true },
  color: { type: String, default: '#FFF176' },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const itemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['article', 'tweet', 'image', 'video', 'pdf', 'note', 'link'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    url: { type: String, trim: true },
    content: { type: String }, // full text for search
    thumbnail: { type: String },
    source: { type: String }, // domain / platform
    author: { type: String },
    tags: [{ type: String, lowercase: true, trim: true }],
    collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
    highlights: [highlightSchema],
    isFavorite: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    readAt: { type: Date },
    // For knowledge graph edges
    relatedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
    topicCluster: { type: String },
    // Semantic embedding vector (gemini-embedding-001, 3072 dims)
    embedding: { type: [Number], select: false },
    // Background AI processing flag — true while the BullMQ worker is running
    aiProcessing: { type: Boolean, default: false },
    // Resurface tracking
    lastResurfacedAt: { type: Date },
    resurfaceCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────

// Full-text search (title, description, content, tags)
itemSchema.index({ title: 'text', description: 'text', content: 'text', tags: 'text' });

// Embedding vector — sparse so unembedded docs are excluded automatically
itemSchema.index({ embedding: 1 }, { sparse: true });

// ━━ COMPOUND indexes (cover the actual query patterns used in controllers) ━━
//
// Pattern: { user, isArchived: false }  .sort({ createdAt: -1 })
// Used by:  getItems, getGraphData, getResurfaceItems, tags aggregation, search
itemSchema.index({ user: 1, isArchived: 1, createdAt: -1 });

// Pattern: { user, isArchived: false, type }  (library type filter)
itemSchema.index({ user: 1, isArchived: 1, type: 1 });

// Pattern: { user, tags }  (library tag filter + tags aggregation)
itemSchema.index({ user: 1, isArchived: 1, tags: 1 });

// Pattern: { user, isArchived: false, resurfaceCount, createdAt }
// Used by:  getResurfaceItems — "hidden gems" query
itemSchema.index({ user: 1, isArchived: 1, resurfaceCount: 1, createdAt: 1 });

module.exports = mongoose.model('Item', itemSchema);

