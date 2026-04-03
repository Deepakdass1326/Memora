/**
 * ═══════════════════════════════════════════════
 * Embedding Service — Memora Semantic Search
 * ═══════════════════════════════════════════════
 *
 * Uses Google Gemini `gemini-embedding-001` (768-dim) to convert
 * text into high-dimensional vectors. Cosine similarity
 * is then used to rank items by semantic relevance.
 *
 * Model options (from API):
 *   models/gemini-embedding-001       — stable, 768 dims
 *   models/gemini-embedding-2-preview — experimental, larger
 *
 * If GEMINI_API_KEY is missing, returns null and search
 * falls back to Mongo $text automatically.
 */

require('dotenv').config();
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

const EMBEDDING_MODEL = 'models/gemini-embedding-001';

let _embeddingModel = null;

const getEmbeddingModel = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (_embeddingModel) return _embeddingModel;
  _embeddingModel = new GoogleGenerativeAIEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey: process.env.GEMINI_API_KEY,
    taskType: 'RETRIEVAL_DOCUMENT',
  });
  return _embeddingModel;
};

/**
 * Generate a text embedding vector.
 * @param {string}  text      - The text to embed
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'|'SEMANTIC_SIMILARITY'} taskType
 * @returns {Promise<number[]|null>} - 768-dim float vector, or null on failure
 */
const generateEmbedding = async (text, taskType = 'RETRIEVAL_DOCUMENT') => {
  const model = getEmbeddingModel();
  if (!model) {
    console.warn('[Embedding] No GEMINI_API_KEY — skipping embedding');
    return null;
  }

  // Trim to 8k chars — well within token limits for this model
  const trimmedText = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 8000);
  if (!trimmedText) return null;

  try {
    let vector;
    if (taskType === 'RETRIEVAL_QUERY') {
      // embedQuery uses RETRIEVAL_QUERY task type internally
      vector = await model.embedQuery(trimmedText);
    } else {
      // embedDocuments returns an array; we pass one doc
      const [vec] = await model.embedDocuments([trimmedText]);
      vector = vec;
    }
    return vector;
  } catch (err) {
    console.warn('[Embedding] Failed to generate embedding:', err.message?.slice(0, 120));
    return null;
  }
};

/**
 * Build the combined text blob used for embedding an item.
 * Weights: title (3×) > tags (2×) > description > content snippet
 */
const buildItemText = (item) => {
  const title       = (item.title       || '').repeat(3);
  const tags        = (item.tags        || []).join(' ').repeat(2);
  const description = (item.description || '').slice(0, 600);
  const content     = (item.content     || '').slice(0, 1200);
  return `${title} ${tags} ${description} ${content}`.trim();
};

/**
 * Cosine similarity between two equal-length vectors.
 * Returns a value in [-1, 1]; higher = more similar.
 */
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

/**
 * Rank a list of items by semantic similarity to a query string.
 * Items without embeddings are filtered out automatically.
 *
 * @param {string}   queryText  - The raw search query
 * @param {object[]} items      - Mongoose item documents (must have .embedding field)
 * @param {number}   threshold  - Minimum similarity score (0–1), default 0.45
 * @returns {Promise<Array<{item, score}>>}
 */
const rankBySimilarity = async (queryText, items, threshold = 0.45) => {
  const queryEmbedding = await generateEmbedding(queryText, 'RETRIEVAL_QUERY');
  if (!queryEmbedding) {
    console.warn('[Embedding] Could not embed query — returning empty');
    return [];
  }

  const scored = items
    .map(item => ({
      item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return scored;
};

module.exports = {
  generateEmbedding,
  buildItemText,
  cosineSimilarity,
  rankBySimilarity,
};
