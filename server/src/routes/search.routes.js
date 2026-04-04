// search.routes.js — Clean rewrite with proper 3-part search flow
//
// FLOW:
//   1. Library  → Items (regex on title/desc/tags) + Notes (regex on title/content/tags)
//   2. Videos   → YouTube Data API v3
//   3. Internet → Wikipedia API
//
const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const Item     = require('../models/Item.model');
const Note     = require('../models/Note.model');
const User     = require('../models/User.model');
const { protect } = require('../middleware/auth.middleware');
const { generateEmbedding, rankBySimilarity } = require('../services/embedding.service');

router.use(protect);

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/search/history
// ──────────────────────────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('searchHistory');
    res.json({ success: true, history: user?.searchHistory || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/search/history/:query
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/history/:query', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { searchHistory: req.params.query },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/search?q=...&page=1&limit=20
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, data: [], videos: [], internet: [], mode: 'none' });
    }

    const userId = req.user._id;
    const skip   = (Number(page) - 1) * Number(limit);

    // ── Step 1: Save search history (only on first page) ──────────────────────
    if (Number(page) === 1) {
      try {
        await User.findByIdAndUpdate(userId, { $pull: { searchHistory: q } });
        await User.findByIdAndUpdate(userId, {
          $push: { searchHistory: { $each: [q], $position: 0, $slice: 15 } },
        });
      } catch { /* non-critical */ }
    }

    // ── Step 2: External results — YouTube + Web Search ─────────────────────
    let videos   = [];
    let internet = [];

    if (Number(page) === 1) {
      const cheerio = require('cheerio');

      const [ytRes, ddgHtml, wikiRes] = await Promise.all([
        // ① YouTube Data API v3
        process.env.YOUTUBE_API_KEY
          ? axios.get('https://www.googleapis.com/youtube/v3/search', {
              params: { part: 'snippet', q, type: 'video', maxResults: 4, key: process.env.YOUTUBE_API_KEY },
              timeout: 6000,
            }).catch(e => { console.warn('[YouTube]', e.message); return { data: { items: [] } }; })
          : Promise.resolve({ data: { items: [] } }),

        // ② DuckDuckGo HTML scrape — reliable, no bot blocks, no API key needed
        axios.get('https://html.duckduckgo.com/html/', {
          params: { q },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 7000,
        }).catch(e => { console.warn('[DDG]', e.message); return { data: '' }; }),

        // ③ Wikipedia (supplementary)
        axios.get('https://en.wikipedia.org/w/api.php', {
          params: { action: 'query', list: 'search', srsearch: q, utf8: '', format: 'json', srlimit: 2 },
          headers: { 'User-Agent': 'MemoraBot/1.0' },
          timeout: 5000,
        }).catch(() => ({ data: {} })),
      ]);

      // YouTube results
      videos = (ytRes.data?.items || [])
        .map(v => ({
          title:     v.snippet?.title || '',
          url:       `https://www.youtube.com/watch?v=${v.id?.videoId}`,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '',
          channel:   v.snippet?.channelTitle || '',
        }))
        .filter(v => v.url.includes('watch?v='));

      // DuckDuckGo HTML scrape results
      const $ = cheerio.load(ddgHtml.data || '');
      const ddgResults = [];
      $('.result').each((i, el) => {
        if (i >= 4) return false; // limit to 4
        const title = $(el).find('.result__a').text().trim();
        const href  = $(el).find('.result__a').attr('href') || '';
        const desc  = $(el).find('.result__snippet').text().trim();
        // DDG uses redirect URLs — extract the actual URL from uddg param
        let url = href;
        try {
          const parsed = new URL('https://duckduckgo.com' + href);
          url = parsed.searchParams.get('uddg') || href;
        } catch { /* use href as-is */ }
        if (title && url && url.startsWith('http')) {
          ddgResults.push({ title, description: desc, url, source: 'Web' });
        }
      });

      // Wikipedia articles (supplementary)
      const wikiResults = (wikiRes.data?.query?.search || []).map(a => ({
        title:       a.title + ' — Wikipedia',
        description: a.snippet ? a.snippet.replace(/<\/?[^>]+(>|$)/g, '') + '...' : '',
        url:         `https://en.wikipedia.org/wiki/${encodeURIComponent(a.title.replace(/ /g, '_'))}`,
        source:      'Wikipedia',
      }));

      // Merge: DDG first, then Wikipedia; deduplicate by URL
      const seen = new Set();
      internet = [...ddgResults, ...wikiResults].filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      }).slice(0, 5);

      console.log(`[Search] q="${q}" → videos:${videos.length} internet:${internet.length}`);
    }


    // ── Step 3: Library search ─────────────────────────────────────────────────
    // Build per-word regex conditions (each word must appear somewhere in the doc)
    const terms = q.trim().split(/\s+/).filter(Boolean);

    const makeRegexConditions = (fields) =>
      terms.map(term => {
        const re = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
        return { $or: fields.map(f => ({ [f]: re })) };
      });

    // Items filter (has isArchived field)
    const itemConditions = makeRegexConditions(['title', 'description', 'tags', 'topicCluster']);
    const itemQuery = {
      user: userId,
      isArchived: false,
      ...(itemConditions.length > 0 && { $and: itemConditions }),
    };

    // Notes filter (NO isArchived field — separate filter!)
    const noteConditions = makeRegexConditions(['title', 'content', 'tags', 'topicCluster']);
    const noteQuery = {
      user: userId,
      ...(noteConditions.length > 0 && { $and: noteConditions }),
    };

    // Run both queries in parallel
    const [itemDocs, noteDocs] = await Promise.all([
      Item.find(itemQuery)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .select('title type thumbnail url tags topicCluster createdAt description')
        .lean(),
      Note.find(noteQuery)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .populate('workspace', 'name _id')
        .select('title tags topicCluster createdAt content workspace')
        .lean(),
    ]);

    // Format notes as item-like objects for the frontend
    const formattedNotes = noteDocs.map(n => ({
      _id:          n._id,
      title:        n.title || 'Untitled Note',
      type:         'note',
      description:  n.content ? n.content.replace(/<[^>]*>?/gm, '').substring(0, 200) : '',
      tags:         n.tags || [],
      topicCluster: n.topicCluster,
      createdAt:    n.createdAt,
      // Open the parent workspace page when clicked
      url: `/workspace/${n.workspace?._id || n.workspace}`,
      _workspaceName: n.workspace?.name || 'Workspace',
    }));

    // Merge and sort by recency
    const combined  = [...itemDocs, ...formattedNotes].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const paginated = combined.slice(skip, skip + Number(limit));

    return res.json({
      success: true,
      mode:    'keyword',
      data:    paginated,
      videos,
      internet,
      pagination: {
        page:  Number(page),
        limit: Number(limit),
        total: combined.length,
        pages: Math.ceil(combined.length / Number(limit)),
      },
    });

  } catch (err) {
    console.error('[Search] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/search/embed-all
// Backfill embeddings for items that don't have one yet (admin utility)
// ──────────────────────────────────────────────────────────────────────────────
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

    // Respond immediately — backfill is async
    res.json({ success: true, message: `Backfilling embeddings for ${items.length} items. Check server logs.` });

    let done = 0;
    for (const item of items) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const text = buildItemText(item);
        const embedding = await generateEmbedding(text, 'RETRIEVAL_DOCUMENT');
        if (embedding) {
          await Item.findByIdAndUpdate(item._id, { embedding });
          console.log(`[Embed-All] ${++done}/${items.length} — ${item.title}`);
        }
      } catch (e) {
        console.warn(`[Embed-All] Failed ${item._id}:`, e.message);
      }
    }
    console.log(`[Embed-All] Done. Embedded ${done}/${items.length} items.`);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
