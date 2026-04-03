// search.routes.js
const express = require('express');
const router = express.Router();
const Item = require('../models/Item.model');
const User = require('../models/User.model');
const { protect } = require('../middleware/auth.middleware');
const { generateEmbedding, rankBySimilarity } = require('../services/embedding.service');

router.use(protect);

/**
 * GET /api/search/history
 * Fetch user's recent search queries
 */
router.get('/history', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('searchHistory');
    res.json({ success: true, history: user?.searchHistory || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/search/history/:query
 * Delete a specific search query from history
 */
router.delete('/history/:query', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { searchHistory: req.params.query } });
    res.json({ success: true, message: 'Removed from history' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/search
 *
 * mode=semantic  → Gemini text-embedding-004 + cosine similarity
 * mode=keyword   → MongoDB $text (default fallback)
 *
 * Query params:
 *   q        - search query (required)
 *   mode     - 'semantic' | 'keyword' (default: semantic if embeddings available)
 *   type     - filter by item type
 *   cluster  - filter by topic cluster
 *   from/to  - date range filters
 *   page, limit - pagination
 */
router.get('/', async (req, res) => {
  try {
    const { q, mode = 'semantic', type, cluster, from, to, page = 1, limit = 20 } = req.query;
    if (!q) return res.json({ success: true, data: [], mode: 'none' });

    let internet = [];
    let videos = [];
    if (Number(page) === 1) {
      // Save search history (remove if exists, then prepend, keep last 15)
      try {
        await User.findByIdAndUpdate(req.user._id, { $pull: { searchHistory: q } });
        await User.findByIdAndUpdate(req.user._id, { $push: { searchHistory: { $each: [q], $slice: 15, $position: 0 } } });
      } catch (err) {
        console.warn('History save error', err.message);
      }

      // Fetch live web results using direct reliable APIs (YouTube, Dev.to, Wikipedia)
      try {
        const axios = require('axios');
        const yt = require('youtube-search-api');
        
        const [ytRes, wikiRes] = await Promise.all([
          yt.GetListByKeyword(q, false, 3).catch(() => ({ items: [] })),
          axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&utf8=&format=json&srlimit=2`, { headers: {'User-Agent':'MemoraBot/1.0'} }).catch(() => ({ data: {} }))
        ]);

        videos = ytRes.items?.filter(v => v.type === 'video').map(v => ({
          title: v.title,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          duration: v.length?.simpleText || '',
          thumbnail: v.thumbnail?.thumbnails?.[0]?.url || ''
        })) || [];

        const wikiArticles = wikiRes.data?.query?.search?.map(item => ({
          title: item.title + ' (Wikipedia)',
          description: item.snippet ? item.snippet.replace(/<\/?[^>]+(>|$)/g, "") + '...' : 'Knowledge base article',
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
        })) || [];

        internet = [...wikiArticles];
      } catch (e) {
        console.warn("[External APIs] Search error", e);
      }
    }

    // Base filter (always applied on top of search)
    const baseFilter = { user: req.user._id, isArchived: false };
    if (type)    baseFilter.type = type;
    if (cluster) baseFilter.topicCluster = cluster;
    if (from || to) {
      baseFilter.createdAt = {};
      if (from) baseFilter.createdAt.$gte = new Date(from);
      if (to)   baseFilter.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    // ── Semantic search ────────────────────────────────────────────────────────
    if (mode === 'semantic') {
      // Fetch all user items that have embeddings stored
      // `.select('+embedding')` overrides the field's `select: false`
      const candidateItems = await Item.find({ ...baseFilter, embedding: { $exists: true, $ne: [] } })
        .select('+embedding title type thumbnail url tags topicCluster createdAt description')
        .lean();

      if (candidateItems.length === 0) {
        // No embeddings yet → fall through to keyword
        return doKeywordSearch(req, res, q, baseFilter, skip, Number(limit), internet, videos);
      }

      const ranked = await rankBySimilarity(q, candidateItems);

      if (ranked.length === 0) {
        // Nothing above similarity threshold → fall through to keyword
        return doKeywordSearch(req, res, q, baseFilter, skip, Number(limit), internet, videos);
      }

      const paginated = ranked.slice(skip, skip + Number(limit));

      return res.json({
        success: true,
        mode: 'semantic',
        data: paginated.map(r => ({
          ...r.item,
          embedding: undefined,     // never send vectors to the client
          _semanticScore: parseFloat(r.score.toFixed(4)),
        })),
        internet,
        videos,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: ranked.length,
          pages: Math.ceil(ranked.length / Number(limit)),
        },
      });
    }

    // ── Keyword search (fallback / explicit) ────────────────────────────────
    return doKeywordSearch(req, res, q, baseFilter, skip, Number(limit), internet, videos);

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

async function doKeywordSearch(req, res, q, baseFilter, skip, limit, internet = [], videos = []) {
  try {
    const query = { ...baseFilter, $text: { $search: q } };
    const [items, total] = await Promise.all([
      Item.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .select('title type thumbnail url tags topicCluster createdAt description'),
      Item.countDocuments(query),
    ]);
    return res.json({
      success: true,
      mode: 'keyword',
      data: items,
      internet,
      videos,
      pagination: { page: Math.floor(skip / limit) + 1, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/search/embed-all
 * Admin-only utility: backfills embeddings for all items that don't have one yet.
 * Rate-limited to 1 item/400ms to stay well within Gemini API quotas.
 */
router.post('/embed-all', async (req, res) => {
  try {
    const { buildItemText } = require('../services/embedding.service');
    const items = await Item.find({
      user: req.user._id,
      $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
    }).select('_id title tags description content');

    if (items.length === 0) {
      return res.json({ success: true, message: 'All items already have embeddings.' });
    }

    // Start async backfill — respond immediately so client doesn't timeout
    res.json({ success: true, message: `Backfilling embeddings for ${items.length} items. Check server logs.` });

    let done = 0;
    for (const item of items) {
      await new Promise(r => setTimeout(r, 400)); // rate-limit: ~150 req/min
      try {
        const text = buildItemText(item);
        const embedding = await generateEmbedding(text, 'RETRIEVAL_DOCUMENT');
        if (embedding) {
          await Item.findByIdAndUpdate(item._id, { embedding });
          done++;
          console.log(`[Embed-All] ${done}/${items.length} — ${item._id}`);
        }
      } catch (e) {
        console.warn(`[Embed-All] Failed item ${item._id}:`, e.message);
      }
    }
    console.log(`[Embed-All] Done. Embedded ${done}/${items.length} items.`);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
