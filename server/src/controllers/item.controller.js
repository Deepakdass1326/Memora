const Item = require('../models/Item.model');
const Collection = require('../models/Collection.model');
const User = require('../models/User.model');
const Note = require('../models/Note.model');
const { generateTags, findRelatedItems } = require('../services/aiTagging.service');
const { scrapeUrl } = require('../services/scraper.service');
const { generateEmbedding, buildItemText } = require('../services/embedding.service');

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

    // ── 1. Auto-scrape URL metadata if URL provided ──────────────────────
    // Skip scraping for uploaded files (pdf/image) — URL is already an ImageKit CDN link
    let scraped = null;
    const isUploadedFile = type === 'pdf' || type === 'image';
    if (url && !isUploadedFile) {
      scraped = await scrapeUrl(url);
    }

    // User-provided fields win; scraped data fills in the blanks
    const finalTitle       = title       || scraped?.title       || 'Untitled';
    const finalDescription = description || scraped?.description || '';
    const finalThumbnail   = thumbnail   || scraped?.thumbnail   || '';
    const finalSource      = source      || scraped?.source      || '';
    const finalAuthor      = author      || scraped?.author      || '';
    const finalContent     = content     || scraped?.content     || '';

    // ── 2. AI tag generation (Gemini or rule-based fallback) ──────────────
    const { tags: aiTags, topicCluster } = await generateTags({
      title: finalTitle,
      description: finalDescription,
      content: finalContent,
      type,
      source: finalSource,
    });

    const finalTags = [...new Set([...(manualTags || []), ...aiTags])];

    // ── 3. Save item ───────────────────────────────────────────────────────
    const item = new Item({
      user: req.user._id,
      title: finalTitle,
      description: finalDescription,
      url,
      type,
      content: finalContent,
      thumbnail: finalThumbnail,
      source: finalSource,
      author: finalAuthor,
      tags: finalTags,
      topicCluster,
      collections: collections || [],
    });

    await item.save();

    // ── 4. Update collection counts ────────────────────────────────────────
    if (collections?.length) {
      await Collection.updateMany({ _id: { $in: collections } }, { $inc: { itemCount: 1 } });
    }

    // ── 5. Update user stats ───────────────────────────────────────────────
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalItems': 1 } });

    // ── 6. Find & link related items (async, non-blocking) ─────────────────
    const userItems = await Item.find({ user: req.user._id, _id: { $ne: item._id } }).select('_id tags topicCluster type');
    const related = await findRelatedItems({ ...item.toObject(), tags: finalTags }, userItems);
    if (related.length) {
      await Item.findByIdAndUpdate(item._id, { relatedItems: related });
      await Item.updateMany({ _id: { $in: related } }, { $addToSet: { relatedItems: item._id } });
    }

    // ── 7. Generate & store semantic embedding (non-blocking — don't await) ──
    //    We fire this off after responding so it never slows the save API.
    setImmediate(async () => {
      try {
        const embeddingText = buildItemText({
          title: finalTitle,
          tags: [...new Set([...(manualTags || []), ...aiTags])],
          description: finalDescription,
          content: finalContent,
        });
        const embedding = await generateEmbedding(embeddingText, 'RETRIEVAL_DOCUMENT');
        if (embedding) {
          await Item.findByIdAndUpdate(item._id, { embedding });
          console.log(`[Embedding] Stored ${embedding.length}-dim vector for item ${item._id}`);
        }
      } catch (e) {
        console.warn('[Embedding] Background store failed:', e.message);
      }
    });

    const populated = await Item.findById(item._id)
      .populate('collections', 'name emoji color')
      .populate('relatedItems', 'title type thumbnail');

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

// @desc  Re-analyze item with AI (fix stale topicCluster/tags)
// @route POST /api/items/:id/reanalyze
const reanalyzeItem = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // Re-scrape YouTube if needed
    let content = item.content || '';
    let description = item.description || '';
    let thumbnail = item.thumbnail || '';
    if (item.url && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))) {
      const { scrapeUrl } = require('../services/scraper.service');
      const scraped = await scrapeUrl(item.url);
      if (scraped) {
        content = scraped.content || content;
        description = scraped.description || description;
        thumbnail = scraped.thumbnail || thumbnail;
      }
    }

    const { tags: aiTags, topicCluster } = await generateTags({
      title: item.title,
      description,
      content,
      type: item.type,
      source: item.source,
    });

    const updated = await Item.findByIdAndUpdate(
      item._id,
      { tags: aiTags, topicCluster, description, thumbnail },
      { new: true }
    ).populate('collections', 'name emoji color');

    console.log(`[Reanalyze] Item ${item._id} → cluster: ${topicCluster}, tags: ${aiTags.join(', ')}`);
    res.json({ success: true, data: updated });
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

// @desc  Delete highlight from item
// @route DELETE /api/items/:id/highlights/:highlightId
const deleteHighlight = async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $pull: { highlights: { _id: req.params.highlightId } } },
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
    const [items, notes] = await Promise.all([
      Item.find({ user: req.user._id, isArchived: false })
        .select('_id title type tags topicCluster relatedItems thumbnail')
        .limit(100),
      Note.find({ user: req.user._id })
        .select('_id title tags topicCluster workspace')
        .populate('workspace', 'name')
        .limit(50),
    ]);

    // Build combined nodes — items + workspace notes
    const itemNodes = items.map(item => ({
      id: item._id,
      label: item.title.substring(0, 40) + (item.title.length > 40 ? '...' : ''),
      type: item.type,
      cluster: item.topicCluster || 'general',
      tags: item.tags,
      thumbnail: item.thumbnail,
      source: 'item',
    }));

    const noteNodes = notes.map(note => ({
      id: note._id,
      label: (note.title || 'Untitled Note').substring(0, 40),
      type: 'note',
      cluster: note.topicCluster || 'general',
      tags: note.tags || [],
      thumbnail: null,
      source: 'note',
      workspaceName: note.workspace?.name,
    }));

    const nodes = [...itemNodes, ...noteNodes];
    const allEntities = [
      ...items.map(i => ({ id: i._id, tags: i.tags, relatedItems: i.relatedItems })),
      ...notes.map(n => ({ id: n._id, tags: n.tags || [], relatedItems: [] })),
    ];

    const links = [];
    const nodeIds = new Set(nodes.map(n => String(n.id)));

    allEntities.forEach(entity => {
      // 1. Explicit related items
      (entity.relatedItems || []).forEach(relId => {
        if (!nodeIds.has(relId.toString())) return;
        const exists = links.some(l =>
          (l.source === entity.id.toString() && l.target === relId.toString()) ||
          (l.source === relId.toString() && l.target === entity.id.toString())
        );
        if (!exists) links.push({ source: entity.id.toString(), target: relId.toString() });
      });

      // 2. Shared tags links (across items AND notes)
      allEntities.forEach(other => {
        if (entity.id.toString() === other.id.toString()) return;
        const sharedTags = entity.tags.filter(t => (other.tags || []).includes(t));
        if (sharedTags.length > 0) {
          const exists = links.some(l =>
            (l.source === entity.id.toString() && l.target === other.id.toString()) ||
            (l.source === other.id.toString() && l.target === entity.id.toString())
          );
          if (!exists) links.push({ source: entity.id.toString(), target: other.id.toString() });
        }
      });
    });

    // Tag-based cluster map (all entities)
    const tagMap = {};
    allEntities.forEach(entity => {
      (entity.tags || []).forEach(tag => {
        if (!tagMap[tag]) tagMap[tag] = [];
        tagMap[tag].push(entity.id.toString());
      });
    });

    res.json({ success: true, data: { nodes, links, clusters: tagMap } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getItems, createItem, getItem, updateItem, deleteItem, toggleFavorite, addHighlight, deleteHighlight, getGraphData, reanalyzeItem };

