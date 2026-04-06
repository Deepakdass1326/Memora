const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scraper Service
 * Fetches a URL and extracts OpenGraph metadata + body content for AI tagging.
 */

// Strip HTML tags and decode common entities from a string
const stripHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // remove <style> blocks
    .replace(/<[^>]+>/g, ' ')                        // remove all HTML tags
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

// ── YouTube helper ─────────────────────────────────────────
const getYouTubeVideoId = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
  } catch {}
  return null;
};

const scrapeYouTube = async (url) => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const { data } = await axios.get(oembedUrl, { timeout: 6000 });
    return {
      title: data.title || '',
      description: `YouTube video by ${data.author_name || 'Unknown'}. ${data.title || ''}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      author: data.author_name || '',
      source: 'youtube.com',
      publishedAt: null,
      content: `YouTube video: ${data.title}. Channel: ${data.author_name}.`,
      scraped: true,
    };
  } catch (err) {
    console.warn('[Scraper] YouTube oEmbed failed:', err.message);
    return null;
  }
};
// ───────────────────────────────────────────────────────────

const scrapeUrl = async (url) => {
  // Try YouTube-specific extraction first
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const ytResult = await scrapeYouTube(url);
    if (ytResult) return ytResult;
  }

  try {
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MemoraBot/1.0; +https://memora.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    // --- OpenGraph / Meta tags ---
    const getMeta = (property) =>
      $(`meta[property="${property}"]`).attr('content') ||
      $(`meta[name="${property}"]`).attr('content') ||
      '';

    const title =
      getMeta('og:title') ||
      getMeta('twitter:title') ||
      $('title').text().trim() ||
      '';

    const description =
      getMeta('og:description') ||
      getMeta('twitter:description') ||
      getMeta('description') ||
      '';

    const thumbnail =
      getMeta('og:image') ||
      getMeta('twitter:image') ||
      getMeta('twitter:image:src') ||
      '';

    const author =
      getMeta('author') ||
      getMeta('article:author') ||
      getMeta('og:site_name') ||
      '';

    const publishedAt =
      getMeta('article:published_time') ||
      getMeta('og:updated_time') ||
      '';

    // Extract domain as source
    const source = new URL(url).hostname.replace('www.', '');

    // --- Extract readable body text for AI tagging ---
    // Remove scripts, styles, nav, footer noise
    $('script, style, nav, footer, header, aside, .ad, .ads, [class*="sidebar"]').remove();

    const bodyText = $('article, main, .content, .post-content, .entry-content, #content')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000); // limit to 3k chars for AI context

    const fallbackText = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    return {
      title: title.slice(0, 200),
      description: stripHtml(description).slice(0, 500),
      thumbnail,
      author,
      source,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      content: bodyText || fallbackText,
      scraped: true,
    };
  } catch (err) {
    console.warn(`[Scraper] Failed to scrape ${url}:`, err.message);
    return null;
  }
};

module.exports = { scrapeUrl };
