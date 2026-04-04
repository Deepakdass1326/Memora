const Item = require('../models/Item.model');

// @desc  Get items to resurface (memory resurfacing feature)
// @route GET /api/resurface
const getResurfaceItems = async (req, res) => {
  try {
    const now = new Date();
    const intervals = [
      { label: 'Today in History', days: 365 },
      { label: '6 Months Ago',     days: 180 },
      { label: '3 Months Ago',     days: 90  },
      { label: '1 Month Ago',      days: 30  },
      { label: '2 Weeks Ago',      days: 14  },
    ];

    // Build all queries upfront — run ALL of them in parallel (was sequential)
    const intervalPromises = intervals.map(interval => {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - interval.days);
      const rangeStart = new Date(targetDate); rangeStart.setDate(rangeStart.getDate() - 3);
      const rangeEnd   = new Date(targetDate); rangeEnd.setDate(rangeEnd.getDate() + 3);
      return Item.find({
        user: req.user._id,
        isArchived: false,
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
      }).limit(3).select('title type thumbnail url tags createdAt topicCluster').lean()
        .then(items => ({ label: interval.label, daysAgo: interval.days, items }));
    });

    const gemsPromise = Item.find({
      user: req.user._id,
      isArchived: false,
      createdAt: { $lt: new Date(now - 30 * 24 * 60 * 60 * 1000) },
      resurfaceCount: { $lt: 3 },
    }).sort({ resurfaceCount: 1, createdAt: 1 }).limit(3)
      .select('title type thumbnail url tags createdAt topicCluster').lean();

    // All 6 queries fire simultaneously
    const [intervalResults, gems] = await Promise.all([
      Promise.all(intervalPromises),
      gemsPromise,
    ]);

    const resurfaces = intervalResults.filter(r => r.items.length > 0);

    if (gems.length > 0) {
      resurfaces.unshift({ label: '✨ Hidden Gems', daysAgo: null, items: gems });
      // Fire-and-forget update — don't block the response
      Item.updateMany(
        { _id: { $in: gems.map(g => g._id) } },
        { $inc: { resurfaceCount: 1 }, $set: { lastResurfacedAt: now } }
      ).catch(() => {});
    }

    if (resurfaces.length === 0) {
      const recent = await Item.find({ user: req.user._id, isArchived: false })
        .sort({ createdAt: -1 }).limit(6)
        .select('title type thumbnail url tags createdAt topicCluster').lean();
      if (recent.length > 0) {
        resurfaces.push({ label: '📚 Your Collection', daysAgo: null, items: recent });
      }
    }

    res.json({ success: true, data: resurfaces });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getResurfaceItems };
