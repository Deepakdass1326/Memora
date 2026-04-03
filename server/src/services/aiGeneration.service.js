/**
 * AI Generation Service
 * Uses the AI Router to distribute work across Gemini, Mistral, and Cohere.
 *
 * Routing:
 *  generateNote      → Gemini Flash  (fast generation)
 *  summarizeNote     → Mistral       (quality reasoning)
 *  formatTranscript  → Gemini Flash  (fast/cheap)
 */

const { routeRequest } = require('./aiRouter.service');

const HTML_RULES = `
Rules for output:
- Use <h2> for main sections
- Use <p> for paragraphs
- Use <ul><li> for bullet lists
- Use <strong> for key terms
- Respond ONLY with clean HTML body content (no <html>, <head>, or <body> tags)
- No markdown, no code fences, no explanation outside the HTML
`.trim();

/**
 * Generate a structured note from a user prompt.
 * Route: Gemini Flash → Mistral (fallback)
 */
const generateNote = async (prompt, contextText = '') => {
  const systemPrompt = `You are an expert knowledge assistant. Generate a well-structured, informative note as clean HTML.
${HTML_RULES}
${contextText ? 'Use the provided context to enhance your response.' : ''}`;

  const userPrompt = contextText
    ? `Generate a structured note about:\n${prompt}\n\nContext:\n${contextText}`
    : `Generate a structured note about:\n${prompt}`;

  return routeRequest('generate-note', systemPrompt, userPrompt);
};

/**
 * Summarize existing note content into key bullet points.
 * Route: Mistral → Gemini (fallback)  — Mistral is better at reasoning/condensing
 */
const summarizeNote = async (content) => {
  const systemPrompt = `You are a concise knowledge assistant. Summarize the given note content into 3-5 key bullet points as HTML.
Return ONLY clean HTML <ul><li> bullet points.
Each bullet should be a single clear insight.
No other HTML elements, no explanation.`;

  return routeRequest('summarize', systemPrompt, `Summarize this note:\n${content}`);
};

/**
 * Format raw speech transcript into a clean structured note.
 * Route: Gemini Flash → Mistral (fallback)
 */
const formatTranscript = async (rawText) => {
  const systemPrompt = `You are a note-formatting assistant. Convert raw spoken or unformatted text into a clean structured HTML note.
${HTML_RULES}
Fix grammar and punctuation. Detect topics and create sections.`;

  return routeRequest('format-transcript', systemPrompt, `Format this text into a note:\n${rawText}`);
};

module.exports = { generateNote, summarizeNote, formatTranscript };
