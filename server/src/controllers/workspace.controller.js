const Workspace = require('../models/Workspace.model');
const Note = require('../models/Note.model');
const { validationResult } = require('express-validator');

// Create a new workspace
exports.createWorkspace = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description } = req.body;
    const workspace = await Workspace.create({
      user: req.user.id,
      name,
      description,
    });

    res.status(201).json({ success: true, data: workspace });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// Get all workspaces for user
exports.getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.user.id }).sort('-createdAt');
    res.status(200).json({ success: true, data: workspaces });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update workspace
exports.updateWorkspace = async (req, res) => {
  try {
    let workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    if (workspace.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    workspace = await Workspace.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: workspace });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete workspace
exports.deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    if (workspace.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete associated notes
    await Note.deleteMany({ workspace: req.params.id });
    await workspace.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
