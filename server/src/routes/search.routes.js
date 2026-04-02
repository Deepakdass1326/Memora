// search.routes.js
const express = require('express');
const router = express.Router();
const Item = require('../models/Item.model');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const items = await Item.find({
      user: req.user._id,
      isArchived: false,
      $text: { $search: q },
    }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .select('title type thumbnail url tags topicCluster createdAt');

    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
