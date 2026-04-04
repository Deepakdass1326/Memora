// tag.routes.js
const express   = require('express');
const tagRouter = express.Router();
const Item      = require('../models/Item.model');
const { protect } = require('../middleware/auth.middleware');

tagRouter.use(protect);

tagRouter.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const match = { user: req.user._id, isArchived: false };
    if (type) match.type = type;   // filter tags by active content type

    const tags = await Item.aggregate([
      { $match: match },
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
