/**
 * ═══════════════════════════════════════════════════
 * AI Model Router — Memora Multi-LLM Strategy
 * ═══════════════════════════════════════════════════
 *
 * Task → Model routing table (from SRS):
 *
 *  generate-note      → Gemini 2.5 Flash  (fast, large context)
 *  summarize          → Mistral            (quality reasoning)
 *  format-transcript  → Gemini 2.5 Flash  (fast/cheap)
 *  ai-tagging         → Cohere            (classification / embeddings)
 *
 * Fallback chain per task is defined in FALLBACK_CHAIN.
 * If a model fails, the next one in the chain is tried automatically.
 */

require('dotenv').config();
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { Mistral } = require('@mistralai/mistralai');
const { CohereClient } = require('cohere-ai');

// ─── Model availability flags ─────────────────────────────
const HAS_GEMINI  = !!process.env.GEMINI_API_KEY;
const HAS_MISTRAL = !!process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY !== 'your_mistral_api_key_here';
const HAS_COHERE  = !!process.env.COHERE_API_KEY  && process.env.COHERE_API_KEY  !== 'your_cohere_api_key_here';

console.log(`[AI Router] Gemini: ${HAS_GEMINI ? '✅' : '❌'}  Mistral: ${HAS_MISTRAL ? '✅' : '❌'}  Cohere: ${HAS_COHERE ? '✅' : '❌'}`);

// ─── Lazy client singletons ───────────────────────────────
let _gemini = null;
let _mistral = null;
let _cohere  = null;

const getGemini = () => {
  if (_gemini) return _gemini;
  _gemini = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 2048,
  });
  return _gemini;
};

const getMistral = () => {
  if (_mistral) return _mistral;
  _mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  return _mistral;
};

const getCohere = () => {
  if (_cohere) return _cohere;
  _cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  return _cohere;
};

// ─── Fallback chains per task ─────────────────────────────
const FALLBACK_CHAIN = {
  'generate-note':     ['gemini', 'mistral'],
  'summarize':         ['mistral', 'gemini'],
  'format-transcript': ['gemini', 'mistral'],
  'tag':               ['cohere', 'gemini'],
};

// ─── Per-model call implementations ──────────────────────

/**
 * Call Gemini with a system + user prompt.
 * Returns the text response.
 */
const callGemini = async (systemPrompt, userPrompt) => {
  const model = getGemini();
  const { ChatPromptTemplate } = require('@langchain/core/prompts');
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', '{input}'],
  ]);
  const chain = prompt.pipe(model);
  const response = await chain.invoke({ input: userPrompt });
  return response.content;
};

/**
 * Call Mistral with a system + user prompt.
 * Returns the text response.
 */
const callMistral = async (systemPrompt, userPrompt) => {
  const client = getMistral();
  const result = await client.chat.complete({
    model: 'mistral-small-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    maxTokens: 2048,
    temperature: 0.6,
  });
  return result.choices[0].message.content;
};

/**
 * Call Cohere for text generation.
 * Returns the text response.
 */
const callCohere = async (systemPrompt, userPrompt) => {
  const client = getCohere();
  const result = await client.chat({
    model: 'command-r-plus',
    preamble: systemPrompt,
    message: userPrompt,
    maxTokens: 1024,
    temperature: 0.3,
  });
  return result.text;
};

// ─── Core router with fallback ────────────────────────────

/**
 * Route a prompt to the best available model for the given task.
 * Falls back down the chain automatically on error.
 *
 * @param {string} task  - 'generate-note' | 'summarize' | 'format-transcript' | 'tag'
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>} - text response
 */
const routeRequest = async (task, systemPrompt, userPrompt) => {
  const chain = FALLBACK_CHAIN[task] || ['gemini'];
  const callers = { gemini: callGemini, mistral: callMistral, cohere: callCohere };
  const available = {
    gemini:  HAS_GEMINI,
    mistral: HAS_MISTRAL,
    cohere:  HAS_COHERE,
  };

  let lastError;
  for (const model of chain) {
    if (!available[model]) {
      console.log(`[AI Router] Skipping ${model} (no API key)`);
      continue;
    }
    try {
      console.log(`[AI Router] ${task} → ${model}`);
      const result = await callers[model](systemPrompt, userPrompt);
      return result;
    } catch (err) {
      console.warn(`[AI Router] ${model} failed for "${task}": ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All models failed for task "${task}": ${lastError?.message}`);
};

// ─── Public API ───────────────────────────────────────────
module.exports = {
  routeRequest,
  callGemini,
  callMistral,
  callCohere,
  getCohere,
  HAS_GEMINI,
  HAS_MISTRAL,
  HAS_COHERE,
};
