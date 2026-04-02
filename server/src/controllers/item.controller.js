const Item = require('../models/Item.model');
const Collection = require('../models/Collection.model');
const User = require('../models/User.model');
const { generateTags, detectTopicCluster, findRelatedItems } = require('../services/aiTagging.service');

// @desc  Get all items for user
// @route GET /api/items
const getItems = async (req, res) => {
  try {
    const { type, tag, collection, archived, search, page = 1, limit = 20 } = req.query;
    const query = { user: req.user._id, isArchived: archived === 'true' };

    if (type) query.type = type;
    if (tag) query.tags = tag;
    if (collection) query.collections = collection;
    if (search) query.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Item.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('collections', 'name emoji color'),
      Item.countDocuments(query),
    ]);

    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Create a new item
// @route POST /api/items
const createItem = async (req, res) => {
  try {
    const { title, description, url, type, content, thumbnail, source, author, tags: manualTags, collections } = req.body;

    // AI tag generation
    const aiTags = generateTags({ title, description, content, type, source });
    const finalTags = [...new Set([...(manualTags || []), ...aiTags])];
    const topicCluster = detectTopicCluster(finalTags, title, description);

    const item = new Item({
      user: req.user._id,
      title, description, url, type, content, thumbnail, source, author,
      tags: finalTags,
      topicCluster,
      collections: collections || [],
    });

    await item.save();

    // Update collection counts
    if (collections?.length) {
      await Collection.updateMany({ _id: { $in: collections } }, { $inc: { itemCount: 1 } });
    }

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalItems': 1 } });

    // Find & link related items async
    const userItems = await Item.find({ user: req.user._id, _id: { $ne: item._id } }).select('_id tags topicCluster type');
    const related = await findRelatedItems({ ...item.toObject(), tags: finalTags }, userItems);
    if (related.length) {
      await Item.findByIdAndUpdate(item._id, { relatedItems: related });
      await Item.updateMany({ _id: { $in: related } }, { $addToSet: { relatedItems: item._id } });
    }

    const populated = await Item.findById(item._id).populate('collections', 'name emoji color').populate('relatedItems', 'title type thumbnail');
    res.status(201).json({ success: true, data: populated, suggestedTags: aiTags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single item
// @route GET /api/items/:id
const getItem = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, user: req.user._id })
      .populate('collections', 'name emoji color')
      .populate('relatedItems', 'title type thumbnail url tags');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update item
// @route PUT /api/items/:id
const updateItem = async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('collections', 'name emoji color');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete item
// @route DELETE /api/items/:id
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    await Collection.updateMany({ _id: { $in: item.collections } }, { $inc: { itemCount: -1 } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalItems': -1 } });
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Toggle favorite
// @route PATCH /api/items/:id/favorite
const toggleFavorite = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.isFavorite = !item.isFavorite;
    await item.save();
    res.json({ success: true, data: { isFavorite: item.isFavorite } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Add highlight to item
// @route POST /api/items/:id/highlights
const addHighlight = async (req, res) => {
  try {
    const { text, color, note } = req.body;
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $push: { highlights: { text, color, note } } },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item.highlights });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get knowledge graph data
// @route GET /api/items/graph
const getGraphData = async (req, res) => {
  try {
    const items = await Item.find({ user: req.user._id, isArchived: false })
      .select('_id title type tags topicCluster relatedItems thumbnail')
      .limit(100);

    const nodes = items.map(item => ({
      id: item._id,
      label: item.title.substring(0, 40) + (item.title.length > 40 ? '...' : ''),
      type: item.type,
      cluster: item.topicCluster,
      tags: item.tags,
      thumbnail: item.thumbnail,
    }));

    const links = [];
    items.forEach(item => {
      item.relatedItems.forEach(relId => {
        const exists = links.some(l =>
          (l.source === item._id.toString() && l.target === relId.toString()) ||
          (l.source === relId.toString() && l.target === item._id.toString())
        );
        if (!exists) {
          links.push({ source: item._id.toString(), target: relId.toString() });
        }
      });
    });

    // Tag-based cluster links
    const tagMap = {};
    items.forEach(item => {
      item.tags.forEach(tag => {
        if (!tagMap[tag]) tagMap[tag] = [];
        tagMap[tag].push(item._id.toString());
      });
    });

    res.json({ success: true, data: { nodes, links, clusters: tagMap } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getItems, createItem, getItem, updateItem, deleteItem, toggleFavorite, addHighlight, getGraphData };
