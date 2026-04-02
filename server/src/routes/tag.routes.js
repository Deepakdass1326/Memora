// tag.routes.js
const express = require('express');
const tagRouter = express.Router();
const Item = require('../models/Item.model');
const { protect } = require('../middleware/auth.middleware');

tagRouter.use(protect);
tagRouter.get('/', async (req, res) => {
  try {
    const items = await Item.find({ user: req.user._id, isArchived: false }).select('tags');
    const tagCount = {};
    items.forEach(item => item.tags.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1; }));
    const tags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
    res.json({ success: true, data: tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = tagRouter;
