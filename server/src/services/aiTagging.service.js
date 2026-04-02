/**
 * AI Tagging Service
 * In production: integrate OpenAI/Claude embeddings for semantic tagging
 * Here: rule-based smart tagging + topic clustering
 */

const TOPIC_CLUSTERS = {
  technology: ['tech', 'software', 'ai', 'machine learning', 'programming', 'code', 'developer', 'javascript', 'python', 'react', 'api', 'web', 'app', 'startup', 'saas'],
  design: ['design', 'ux', 'ui', 'figma', 'typography', 'color', 'layout', 'css', 'animation', 'branding', 'logo'],
  science: ['science', 'research', 'study', 'data', 'biology', 'physics', 'chemistry', 'quantum', 'climate', 'space'],
  business: ['business', 'startup', 'entrepreneur', 'marketing', 'sales', 'revenue', 'growth', 'strategy', 'product', 'finance'],
  health: ['health', 'fitness', 'nutrition', 'mental', 'wellness', 'meditation', 'exercise', 'sleep', 'diet'],
  philosophy: ['philosophy', 'ethics', 'stoic', 'mindset', 'psychology', 'cognitive', 'behavior', 'thinking'],
  culture: ['culture', 'art', 'music', 'film', 'book', 'literature', 'history', 'society', 'politics'],
  productivity: ['productivity', 'habit', 'workflow', 'tools', 'focus', 'time', 'management', 'system', 'note'],
};

/**
 * Extract keywords from text using basic NLP
 */
const extractKeywords = (text) => {
  if (!text) return [];
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'if', 'then', 'than', 'so', 'yet', 'both', 'either']);
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  // Frequency count
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
};

/**
 * Determine topic cluster from tags/keywords
 */
const detectTopicCluster = (tags, title = '', description = '') => {
  const allText = [...tags, ...title.toLowerCase().split(' '), ...description.toLowerCase().split(' ')].join(' ');
  
  const scores = {};
  Object.entries(TOPIC_CLUSTERS).forEach(([topic, keywords]) => {
    scores[topic] = keywords.filter(kw => allText.includes(kw)).length;
  });
  
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? top[0] : 'general';
};

/**
 * Generate tag suggestions for an item
 */
const generateTags = (item) => {
  const { title = '', description = '', content = '', type, source } = item;
  const combinedText = `${title} ${description} ${content}`;
  
  const keywordTags = extractKeywords(combinedText);
  
  // Type-based tags
  const typeTags = {
    article: ['reading', 'article'],
    tweet: ['twitter', 'social'],
    image: ['visual', 'inspiration'],
    video: ['video', 'watch-later'],
    pdf: ['document', 'reference'],
    note: ['note', 'personal'],
    link: ['link'],
  };

  const sourceTags = source ? [source.replace(/^www\./, '').split('.')[0]] : [];
  
  const allTags = [...new Set([
    ...(typeTags[type] || []),
    ...sourceTags,
    ...keywordTags.slice(0, 5),
  ])].slice(0, 8);

  return allTags;
};

/**
 * Find related items based on shared tags and topic cluster
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

module.exports = { generateTags, detectTopicCluster, findRelatedItems, extractKeywords };
