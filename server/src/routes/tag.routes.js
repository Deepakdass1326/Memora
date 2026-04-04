// tag.routes.js
const express   = require('express');
const tagRouter = express.Router();
const Item      = require('../models/Item.model');
const { protect } = require('../middleware/auth.middleware');

tagRouter.use(protect);

tagRouter.get('/', async (req, res) => {
  try {
    // MongoDB aggregation pipeline — database does the counting, not Node.js
    const tags = await Item.aggregate([
      { $match: { user: req.user._id, isArchived: false } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, tag: '$_id', count: 1 } },
    ]);
    res.json({ success: true, data: tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = tagRouter;
