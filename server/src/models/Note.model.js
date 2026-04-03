const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Untitled Note',
    },
    content: {
      type: String, // Rich text (HTML or stringified JSON depending on Editor)
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    topicCluster: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    relatedItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexing for search performance
noteSchema.index({ user: 1, workspace: 1 });
noteSchema.index({ tags: 1 });

module.exports = mongoose.model('Note', noteSchema);
