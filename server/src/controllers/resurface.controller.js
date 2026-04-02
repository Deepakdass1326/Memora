const Item = require('../models/Item.model');

// @desc  Get items to resurface (memory resurfacing feature)
// @route GET /api/resurface
const getResurfaceItems = async (req, res) => {
  try {
    const now = new Date();
    const intervals = [
      { label: 'Today in History', days: 365 },
      { label: '6 Months Ago', days: 180 },
      { label: '3 Months Ago', days: 90 },
      { label: '1 Month Ago', days: 30 },
      { label: '2 Weeks Ago', days: 14 },
    ];

    const resurfaces = [];

    for (const interval of intervals) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - interval.days);
      const rangeStart = new Date(targetDate);
      rangeStart.setDate(rangeStart.getDate() - 3);
      const rangeEnd = new Date(targetDate);
      rangeEnd.setDate(rangeEnd.getDate() + 3);

      const items = await Item.find({
        user: req.user._id,
        isArchived: false,
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
      }).limit(3).select('title type thumbnail url tags createdAt topicCluster');

      if (items.length > 0) {
        resurfaces.push({ label: interval.label, daysAgo: interval.days, items });
      }
    }

    // Random gems (items saved long ago, rarely viewed)
    const gems = await Item.find({
      user: req.user._id,
      isArchived: false,
      createdAt: { $lt: new Date(now - 30 * 24 * 60 * 60 * 1000) },
      resurfaceCount: { $lt: 3 },
    })
      .sort({ resurfaceCount: 1, createdAt: 1 })
      .limit(3)
      .select('title type thumbnail url tags createdAt topicCluster');

    if (gems.length > 0) {
      resurfaces.unshift({ label: '✨ Hidden Gems', daysAgo: null, items: gems });
      // Mark as resurfaced
      await Item.updateMany(
        { _id: { $in: gems.map(g => g._id) } },
        { $inc: { resurfaceCount: 1 }, $set: { lastResurfacedAt: now } }
      );
    }

    res.json({ success: true, data: resurfaces });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getResurfaceItems };
