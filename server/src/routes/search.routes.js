// search.routes.js
const express = require('express');
const router = express.Router();
const Item = require('../models/Item.model');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { q, type, cluster, from, to, page = 1, limit = 20 } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const query = {
      user: req.user._id,
      isArchived: false,
      $text: { $search: q },
    };

    // Optional filters
    if (type) query.type = type;
    if (cluster) query.topicCluster = cluster;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Item.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(Number(limit))
        .select('title type thumbnail url tags topicCluster createdAt description'),
      Item.countDocuments(query),
    ]);

    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
