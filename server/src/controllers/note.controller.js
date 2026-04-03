const Note = require('../models/Note.model');
const Workspace = require('../models/Workspace.model');
const { validationResult } = require('express-validator');
const aiTaggingService = require('../services/aiTagging.service');

// Asynchronous background tagging
const triggerAsyncTagging = async (noteId, userItems) => {
  try {
    const note = await Note.findById(noteId);
    if (!note) return;

    // strip HTML for AI text analysis
    const cleanContent = note.content ? note.content.replace(/<[^>]*>?/gm, ' ') : '';
    
    const { tags, topicCluster } = await aiTaggingService.generateTags({
      title: note.title,
      description: '',
      content: cleanContent,
      type: 'note',
    });

    note.tags = tags || [];
    note.topicCluster = topicCluster || 'general';
    
    // Find related saved items across users items
    if (userItems && userItems.length) {
       const related = await aiTaggingService.findRelatedItems(note, userItems);
       note.relatedItems = related || [];
    }

    await note.save();
    console.log(`[Notes] Async tagging completed for Node ${noteId}`);
  } catch (error) {
    console.error('[Notes] Async tagging failed:', error.message);
  }
};

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, content, workspace, isPublic } = req.body;
    
    // Validate workspace belongs to user
    const ws = await Workspace.findById(workspace);
    if (!ws || ws.user.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Invalid workspace' });
    }

    const note = await Note.create({
      user: req.user.id,
      workspace,
      title: title || 'Untitled Note',
      content: content || '',
      isPublic: isPublic || false,
    });

    // We don't fetch all user items here to save time, but we could for relatedItems
    // Trigger async AI tagging
    triggerAsyncTagging(note._id, []); 

    res.status(201).json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// Get all notes for user (or filtered by workspace)
exports.getNotes = async (req, res) => {
  try {
    const query = { user: req.user.id };
    if (req.query.workspace) {
      query.workspace = req.query.workspace;
    }
    
    const notes = await Note.find(query).sort('-updatedAt');
    res.status(200).json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get single note
exports.getNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.status(200).json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update note
exports.updateNote = async (req, res) => {
  try {
    let note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    note = await Note.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    // trigger background tagging update if content/title changed significantly (omitted heuristic for simplicity, always trigger async here)
    if (req.body.content || req.body.title) {
        triggerAsyncTagging(note._id, []);
    }

    res.status(200).json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete note
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await note.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get public note
exports.getPublicNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || !note.isPublic) {
      return res.status(404).json({ success: false, message: 'Note not found or not public' });
    }
    // We omit the user/owner check here intentionally for public view.
    res.status(200).json({ success: true, data: note });
  } catch (err) {
    // If invalid ID passed it throws cast error, catch it as 404
    res.status(404).json({ success: false, message: 'Note not found' });
  }
};
