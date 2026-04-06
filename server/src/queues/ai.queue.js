/**
 * ═══════════════════════════════════════════════
 * AI Processing Queue — Memora BullMQ Worker
 * ═══════════════════════════════════════════════
 *
 * This queue handles all heavy AI tasks asynchronously so that
 * the user's "Save" action returns instantly.
 *
 * Flow:
 *   1. item.controller.js saves item with aiProcessing: true
 *   2. Dispatches a job → this queue
 *   3. Worker runs: scrape → tag → embed → related items
 *   4. Updates MongoDB item with results, sets aiProcessing: false
 *
 * Graceful fallback: If REDIS_URL is not set, the worker is not
 * started and the controller falls back to synchronous AI processing.
 */

const { Queue, Worker, QueueEvents } = require('bullmq');

const QUEUE_NAME = 'ai-processing';

// ─── Redis Connection (only when REDIS_URL is provided) ────────────────────
let connection = null;
let aiQueue = null;
let aiWorker = null;
let isQueueAvailable = false;

const initQueue = () => {
  if (!process.env.REDIS_URL) {
    console.warn('[Queue] REDIS_URL not set — BullMQ disabled, using synchronous AI processing');
    return false;
  }

  try {
    const IORedis = require('ioredis');
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,  // Required for BullMQ
      enableReadyCheck: false,
      tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
    });

    connection.on('error', (err) => {
      console.error('[Queue] Redis connection error:', err.message);
    });

    aiQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }, // Retry: 5s, 25s, 125s
        removeOnComplete: { count: 100 },               // Keep last 100 completed jobs
        removeOnFail: { count: 50 },                    // Keep last 50 failed jobs
      },
    });

    isQueueAvailable = true;
    console.log('[Queue] BullMQ queue initialized ✓');
    return true;
  } catch (err) {
    console.error('[Queue] Failed to initialize queue:', err.message);
    return false;
  }
};

// ─── Worker — runs on server startup ──────────────────────────────────────
const startWorker = () => {
  if (!isQueueAvailable || !connection) return;

  aiWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { itemId, userId, scraped, type, isUploadedFile } = job.data;
      console.log(`[Queue] Processing job ${job.id} for item ${itemId}`);

      // Lazy-load to avoid circular require issues
      const Item          = require('../models/Item.model');
      const User          = require('../models/User.model');
      const Collection    = require('../models/Collection.model');
      const { generateTags, findRelatedItems } = require('../services/aiTagging.service');
      const { generateEmbedding, buildItemText } = require('../services/embedding.service');
      const { scrapeUrl } = require('../services/scraper.service');

      try {
        // ── Step 1: Scrape if we don't have content yet ────────────────────
        let scrapedData = scraped || {};
        const item = await Item.findById(itemId);
        if (!item) { console.warn(`[Queue] Item ${itemId} not found — skipping`); return; }

        if (item.url && !isUploadedFile && !scraped) {
          try {
            scrapedData = await scrapeUrl(item.url) || {};
          } catch (e) {
            console.warn(`[Queue] Scrape failed for ${item.url}:`, e.message);
          }
        }

        const finalContent     = item.content     || scrapedData.content     || '';
        const finalDescription = item.description || scrapedData.description || '';
        const finalThumbnail   = item.thumbnail   || scrapedData.thumbnail   || '';

        // ── Step 2: AI Tag Generation ──────────────────────────────────────
        job.updateProgress(25);
        let aiTags, topicCluster, aiSummary = null;

        if (item.type === 'product') {
          // Product-specific prompt: extract brand, category, features
          const { routeRequest } = require('../services/aiRouter.service');
          const productContext = [
            item.title,
            item.price ? `Price: ${item.price}` : '',
            item.description || finalDescription,
          ].filter(Boolean).join('\n');

          const raw = await routeRequest(
            'tag',
            'You are a shopping assistant. Given a product name and description, respond with ONLY a JSON object with three keys: "tags" (array of 5-8 lowercase keywords: brand name, product category, key features), "topicCluster" (one of: electronics, fashion, home, sports, books, beauty, food, other), and "summary" (2-3 plain-English sentences describing what this product is, its key features, and its price if available — no HTML, no markdown).',
            productContext
          ).catch(() => null);

          try {
            const parsed = JSON.parse((raw || '').replace(/```json|```/g, '').trim());
            aiTags       = Array.isArray(parsed.tags) ? parsed.tags : ['product', 'wishlist'];
            topicCluster = parsed.topicCluster || 'other';
            aiSummary    = typeof parsed.summary === 'string' ? parsed.summary.trim() : null;
          } catch {
            aiTags       = ['product', 'wishlist'];
            topicCluster = 'other';
            aiSummary    = null;
          }
        } else {
          // Standard article/video/link tagging
          const result = await generateTags({
            title:       item.title,
            description: finalDescription,
            content:     finalContent,
            type:        item.type,
            source:      item.source,
          });
          aiTags       = result.tags;
          topicCluster = result.topicCluster;
          aiSummary    = result.summary || null;
        }


        // ── Step 3: Generate Embedding ─────────────────────────────────────
        job.updateProgress(50);
        let embedding = null;
        try {
          const embeddingText = buildItemText({
            title:       item.title,
            tags:        aiTags,
            description: finalDescription,
            content:     finalContent,
          });
          embedding = await generateEmbedding(embeddingText, 'RETRIEVAL_DOCUMENT');
        } catch (e) {
          console.warn(`[Queue] Embedding failed for ${itemId}:`, e.message);
        }

        // ── Step 4: Find Related Items ─────────────────────────────────────
        job.updateProgress(75);
        let related = [];
        try {
          const userItems = await Item.find({
            user: userId,
            _id: { $ne: itemId },
          }).select('_id tags topicCluster type');
          related = await findRelatedItems({ ...item.toObject(), tags: aiTags }, userItems);
        } catch (e) {
          console.warn(`[Queue] Related items failed for ${itemId}:`, e.message);
        }

        // ── Step 5: Update Item in MongoDB ─────────────────────────────────
        const updatePayload = {
          tags:         aiTags,
          topicCluster,
          aiProcessing: false,
          // Always overwrite description with AI summary if available (removes raw HTML junk)
          ...(aiSummary                              && { description: aiSummary }),
          ...(!aiSummary && finalDescription && !item.description && { description: finalDescription }),
          ...(finalThumbnail && !item.thumbnail      && { thumbnail:   finalThumbnail }),
          ...(finalContent   && !item.content        && { content:     finalContent }),
          ...(embedding                              && { embedding }),
          ...(related.length                        && { relatedItems: related }),
        };

        await Item.findByIdAndUpdate(itemId, updatePayload);

        // Also update related items to point back
        if (related.length) {
          await Item.updateMany(
            { _id: { $in: related } },
            { $addToSet: { relatedItems: itemId } }
          );
        }

        job.updateProgress(100);
        console.log(`[Queue] ✓ Done: item ${itemId} | cluster: ${topicCluster} | tags: ${aiTags.join(', ')}`);

      } catch (err) {
        // On fatal failure, ensure aiProcessing is reset so UI doesn't stay stuck
        try {
          await require('../models/Item.model').findByIdAndUpdate(itemId, { aiProcessing: false });
        } catch (_) {}
        throw err; // Re-throw so BullMQ marks the job as failed and retries
      }
    },
    {
      connection,
      concurrency: 3,           // Process up to 3 items at a time
      limiter: { max: 10, duration: 60000 }, // Max 10 jobs per minute (protect AI API quotas)
    }
  );

  aiWorker.on('completed', (job) => {
    console.log(`[Queue] Job ${job.id} completed`);
  });
  aiWorker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });
  aiWorker.on('error', (err) => {
    console.error('[Queue] Worker error:', err.message);
  });

  console.log('[Queue] BullMQ worker started ✓');
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Dispatch an AI processing job for a newly saved item.
 * Returns true if job was queued, false if running in sync fallback mode.
 */
const dispatchAIJob = async (jobData) => {
  if (!isQueueAvailable || !aiQueue) return false;
  try {
    const job = await aiQueue.add('process-item', jobData, {
      jobId: `item-${jobData.itemId}`, // Idempotent: prevents duplicate jobs for same item
    });
    console.log(`[Queue] Dispatched job ${job.id} for item ${jobData.itemId}`);
    return true;
  } catch (err) {
    console.error('[Queue] Failed to dispatch job:', err.message);
    return false;
  }
};

/**
 * Gracefully shut down worker and queue (for process exit handling).
 */
const closeQueue = async () => {
  if (aiWorker) await aiWorker.close();
  if (aiQueue)  await aiQueue.close();
  if (connection) connection.disconnect();
};

module.exports = { initQueue, startWorker, dispatchAIJob, closeQueue, isQueueAvailable: () => isQueueAvailable };
