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
    // Embedding placeholder (would be vector in prod)
    topicCluster: { type: String },
    // Resurface tracking
    lastResurfacedAt: { type: Date },
    resurfaceCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text search index
itemSchema.index({ title: 'text', description: 'text', content: 'text', tags: 'text' });
itemSchema.index({ user: 1, createdAt: -1 });
itemSchema.index({ user: 1, type: 1 });
itemSchema.index({ user: 1, tags: 1 });

module.exports = mongoose.model('Item', itemSchema);
