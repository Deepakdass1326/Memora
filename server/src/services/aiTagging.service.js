const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

/**
 * AI Tagging Service
 * Phase 1: LangChain + Gemini (gemini-2.5-flash) for real semantic tagging
 * Fallback: Rule-based keyword analysis if GEMINI_API_KEY is not set
 */

// ─── Rule-based Fallback ───────────────────────────────────────────────────

const TOPIC_CLUSTERS = {
  technology: ['tech', 'software', 'ai', 'machine learning', 'programming', 'code', 'developer', 'javascript', 'python', 'react', 'api', 'web', 'app', 'startup', 'saas', 'llm', 'neural', 'algorithm'],
  design: ['design', 'ux', 'ui', 'figma', 'typography', 'color', 'layout', 'css', 'animation', 'branding', 'logo', 'visual', 'graphic'],
  science: ['science', 'research', 'study', 'data', 'biology', 'physics', 'chemistry', 'quantum', 'climate', 'space', 'astronomy', 'genome'],
  business: ['business', 'startup', 'entrepreneur', 'marketing', 'sales', 'revenue', 'growth', 'strategy', 'product', 'finance', 'investment', 'venture'],
  health: ['health', 'fitness', 'nutrition', 'mental', 'wellness', 'meditation', 'exercise', 'sleep', 'diet', 'therapy', 'medicine'],
  philosophy: ['philosophy', 'ethics', 'stoic', 'mindset', 'psychology', 'cognitive', 'behavior', 'thinking', 'consciousness', 'moral'],
  culture: ['culture', 'art', 'music', 'film', 'book', 'literature', 'history', 'society', 'politics', 'movie', 'podcast', 'comedy', 'entertainment', 'humor', 'funny', 'meme', 'gaming', 'game', 'sports', 'youtube', 'show', 'series', 'tv', 'streaming', 'celebrity', 'fashion', 'food', 'travel', 'vlog'],
  productivity: ['productivity', 'habit', 'workflow', 'tools', 'focus', 'time', 'management', 'system', 'note', 'planning', 'organization'],
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'if',
  'then', 'than', 'so', 'yet', 'both', 'either', 'not', 'also', 'just', 'about',
  'more', 'your', 'our', 'their', 'you', 'they', 'we', 'he', 'she', 'what',
  'when', 'where', 'how', 'which', 'who', 'can', 'all', 'new', 'use', 'used',
]);

const extractKeywordsRuleBased = (text) => {
  if (!text) return [];
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
};

const detectTopicClusterRuleBased = (tags, title = '', description = '') => {
  const allText = [...tags, ...title.toLowerCase().split(' '), ...description.toLowerCase().split(' ')].join(' ');
  const scores = {};
  Object.entries(TOPIC_CLUSTERS).forEach(([topic, keywords]) => {
    scores[topic] = keywords.filter(kw => allText.includes(kw)).length;
  });
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? top[0] : 'general';
};

const generateTagsRuleBased = (item) => {
  const { title = '', description = '', content = '', type, source } = item;
  const combinedText = `${title} ${description} ${content}`;
  const keywordTags = extractKeywordsRuleBased(combinedText);
  const typeTags = {
    article: ['reading', 'article'], tweet: ['twitter', 'social'],
    image: ['visual', 'inspiration'], video: ['video', 'watch-later'],
    pdf: ['document', 'reference'], note: ['note', 'personal'], link: ['link'],
  };
  const sourceTags = source ? [source.replace(/^www\./, '').split('.')[0]] : [];
  return [...new Set([...(typeTags[type] || []), ...sourceTags, ...keywordTags.slice(0, 5)])].slice(0, 8);
};

// ─── Gemini / LangChain AI Tagging ────────────────────────────────────────

let geminiChain = null;

const initGeminiChain = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (geminiChain) return geminiChain;

  try {
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.2,
      maxOutputTokens: 256,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a knowledge organization assistant. Analyze the given content and return ONLY a JSON object with exactly these two keys:
- "tags": an array of 5-8 lowercase single-word or short-phrase tags that best describe the content (e.g. ["machine-learning", "python", "tutorial"])
- "topicCluster": exactly ONE string from this list: technology, design, science, business, health, philosophy, culture, productivity, general

Respond ONLY with valid JSON. No markdown, no explanation.`],
      ['human', `Title: {title}
Description: {description}
Content snippet: {content}
Type: {type}`],
    ]);

    const parser = new JsonOutputParser();
    geminiChain = prompt.pipe(model).pipe(parser);
    return geminiChain;
  } catch (err) {
    console.warn('[AI Tagging] Failed to init Gemini chain:', err.message);
    return null;
  }
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Generate tags and detect topic cluster.
 * Route: Cohere (classification) → Gemini → rule-based fallback
 * @returns {{ tags: string[], topicCluster: string }}
 */
const generateTags = async (item) => {
  const { routeRequest, HAS_COHERE } = require('./aiRouter.service');
  const validClusters = Object.keys(TOPIC_CLUSTERS).concat(['general']);

  const systemPrompt = `You are a knowledge organization assistant. Analyze the given content and return ONLY a JSON object with exactly these two keys:
- "tags": an array of 5-8 lowercase single-word or short-phrase tags (e.g. ["machine-learning","python","tutorial"])
- "topicCluster": exactly ONE string from: technology, design, science, business, health, philosophy, culture, productivity, general

IMPORTANT CLUSTER GUIDE:
- culture = youtube videos, comedy, entertainment, music, film, tv shows, gaming, sports, humor, podcasts, food, travel, art
- technology = programming, ai, software, tools, web, apps
- science = research, biology, physics, environment
- business = startups, finance, marketing, product
- health = fitness, nutrition, wellness, medicine
- philosophy = ethics, psychology, mindset, thinking
- productivity = habits, workflows, planning, time management
- design = ux/ui, visual design, css, branding
- general = only if none of the above fit

Respond ONLY with valid JSON. No markdown, no explanation.`;

  const userPrompt = `Title: ${item.title || ''}
Description: ${(item.description || '').slice(0, 500)}
Content: ${(item.content || '').slice(0, 1500)}
Type: ${item.type || 'link'}`;

  // Try Cohere → Gemini → rule-based
  const modelsToTry = [];
  if (HAS_COHERE)   modelsToTry.push('cohere');
  modelsToTry.push('gemini'); // always try gemini as second option

  for (const model of modelsToTry) {
    try {
      let rawText;
      if (model === 'cohere') {
        const { callCohere } = require('./aiRouter.service');
        rawText = await callCohere(systemPrompt, userPrompt);
      } else {
        const { callGemini } = require('./aiRouter.service');
        rawText = await callGemini(systemPrompt, userPrompt);
      }

      // Strip possible markdown fences
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleaned);

      const tags = Array.isArray(result.tags)
        ? result.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 8)
        : generateTagsRuleBased(item);

      const topicCluster = validClusters.includes(result.topicCluster)
        ? result.topicCluster
        : detectTopicClusterRuleBased(tags, item.title, item.description);

      console.log(`[AI Tagging] ${model} tags:`, tags, '| Cluster:', topicCluster);
      return { tags, topicCluster };
    } catch (err) {
      console.warn(`[AI Tagging] ${model} failed:`, err.message);
    }
  }

  // Final fallback: rule-based
  console.log('[AI Tagging] Using rule-based fallback');
  const tags = generateTagsRuleBased(item);
  const topicCluster = detectTopicClusterRuleBased(tags, item.title, item.description);
  return { tags, topicCluster };
};


/**
 * Find related items based on shared tags and topic cluster.
 */
const findRelatedItems = async (item, allUserItems) => {
  const related = allUserItems
    .filter(i => i._id.toString() !== item._id?.toString())
    .map(i => {
      const sharedTags = i.tags.filter(t => item.tags?.includes(t)).length;
      const sameCluster = i.topicCluster === item.topicCluster ? 2 : 0;
      const sameType = i.type === item.type ? 1 : 0;
      return { item: i, score: sharedTags * 3 + sameCluster + sameType };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.item._id);
  return related;
};

module.exports = {
  generateTags,
  findRelatedItems,
  detectTopicCluster: detectTopicClusterRuleBased,
  extractKeywords: extractKeywordsRuleBased,
};
