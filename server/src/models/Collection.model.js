const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    emoji: { type: String, default: '📁' },
    color: { type: String, default: '#6366f1' },
    isPublic: { type: Boolean, default: false },
    itemCount: { type: Number, default: 0 },
    pinnedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  },
  { timestamps: true }
);

collectionSchema.index({ user: 1, name: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
