/**
 * Memora Browser Extension — popup.js
 * Reads the current tab's URL/title and POSTs to the Memora backend.
 * Auth token is read from chrome.storage.local (synced from the web app).
 * v1.1.0 — Added product/wishlist scraping for shopping sites.
 */

const API_BASE = 'http://localhost:5000/api'; // change to production URL when deploying

let selectedType = 'article';
let currentTab   = null;
let productData  = null; // holds { price, currency } if on a shopping site

// ── Helpers ──────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove('hidden');
const hide = (id) => $(id).classList.add('hidden');

function showError(msg) {
  const el = $('error-toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function setLoading(isLoading) {
  const btn  = $('save-btn');
  const text = $('save-btn-text');
  btn.disabled    = isLoading;
  text.textContent = isLoading ? 'Saving…' : '✦ Save to Memora';
}

// ── Shopping site detection ───────────────────────────────────────────────────

const SHOPPING_SITES = [
  'amazon.in', 'amazon.com',
  'flipkart.com', 'myntra.com',
  'meesho.com', 'ajio.com',
  'nykaa.com', 'snapdeal.com',
  'ebay.com', 'etsy.com',
];

function isShoppingSite(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return SHOPPING_SITES.some(s => hostname.includes(s));
  } catch { return false; }
}

// ── Price scraper — runs inside the page via scripting.executeScript ──────────
function extractProductDataFromPage() {
  // Helper: first non-null result from a list of selectors
  const first = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return null;
  };

  // 1. Try OpenGraph / meta tags (works on most modern sites)
  const metaPrice = document.querySelector('meta[property="product:price:amount"]')?.content
    || document.querySelector('meta[property="og:price:amount"]')?.content
    || document.querySelector('meta[name="twitter:data1"]')?.content;

  const metaCurrency = document.querySelector('meta[property="product:price:currency"]')?.content
    || document.querySelector('meta[property="og:price:currency"]')?.content;

  // 2. Site-specific selectors (fallback)
  const sitePrice = first([
    // Amazon India / Global
    '#priceblock_ourprice', '#priceblock_dealprice',
    '.a-price .a-offscreen', '.a-price-whole', '#apex_desktop .a-price .a-offscreen',
    // Flipkart
    '._30jeq3', '._16Jk6d',
    // Myntra
    '.pdp-price strong', '.pdp-mrp',
    // Meesho
    '.NewPrice__price', 'p.price',
    // Generic
    '[itemprop="price"]', '.product-price', '.price',
  ]);

  const rawPrice = metaPrice || sitePrice || null;

  // Detect currency from symbol in price string or meta
  let currency = metaCurrency || null;
  if (!currency && rawPrice) {
    if (rawPrice.includes('₹') || rawPrice.includes('INR')) currency = '₹';
    else if (rawPrice.includes('$')) currency = '$';
    else if (rawPrice.includes('£')) currency = '£';
    else if (rawPrice.includes('€')) currency = '€';
  }

  // Clean price: keep digits, commas, periods, and the currency symbol
  const price = rawPrice ? rawPrice.replace(/\s+/g, '').replace(/[^\d₹$£€,.]/g, '').trim() : null;

  return { price, currency };
}

// ── Type selector ─────────────────────────────────────────────────────────────

document.querySelectorAll('.type-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
    // Show/hide price preview when manually toggling type
    if (selectedType === 'product' && productData?.price) {
      show('price-preview');
    } else {
      hide('price-preview');
    }
  });
});

function detectType(url) {
  if (!url) return 'link';
  if (isShoppingSite(url)) return 'product';       // 🛒 shopping sites → product
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) return 'video';
  if (/twitter\.com|x\.com/.test(url)) return 'tweet';
  if (/\.pdf(\?.*)?$/.test(url)) return 'pdf';
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/.test(url)) return 'image';
  return 'article';
}

function selectType(type) {
  document.querySelectorAll('.type-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  selectedType = type;
}

// ── Initialise ────────────────────────────────────────────────────────────────

async function init() {
  // Get token from chrome storage
  const { memora_token: token } = await chrome.storage.local.get('memora_token');
  if (!token) { show('not-logged-in'); return; }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Populate preview
  $('preview-title').textContent = tab.title || 'Untitled page';
  $('preview-url').textContent   = tab.url;

  // Set favicon
  if (tab.favIconUrl) {
    const img = document.createElement('img');
    img.src = tab.favIconUrl;
    $('preview-favicon').appendChild(img);
  }

  // Auto-detect type
  const detectedType = detectType(tab.url);
  selectType(detectedType);

  // If shopping site → scrape price
  if (detectedType === 'product') {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func:   extractProductDataFromPage,
      });
      productData = results?.[0]?.result || null;
      if (productData?.price) {
        $('price-display').textContent = `${productData.currency || ''}${productData.price}`;
        show('price-preview');
      }
    } catch (e) {
      console.warn('[Memora] Price scrape failed:', e.message);
    }
  }

  // Show auth user name
  try {
    const res  = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) $('auth-status').textContent = `Hi, ${data.user.name.split(' ')[0]} 👋`;
  } catch (_) {}

  show('save-view');
}

// ── Save handler ──────────────────────────────────────────────────────────────

$('save-btn').addEventListener('click', async () => {
  const { memora_token: token } = await chrome.storage.local.get('memora_token');
  if (!token) { showError('Not logged in.'); return; }

  setLoading(true);

  const note    = $('note-input').value.trim();
  const tagsRaw = $('tags-input').value.trim();
  const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const payload = {
    url:         currentTab.url,
    title:       currentTab.title || '',
    description: note,
    type:        selectedType,
    tags,
    source:      new URL(currentTab.url).hostname.replace('www.', ''),
    // Include price/currency for product type
    ...(selectedType === 'product' && productData?.price && {
      price:    productData.price,
      currency: productData.currency || '',
    }),
  };

  try {
    const res  = await fetch(`${API_BASE}/items`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) { hide('save-view'); show('success-view'); }
    else showError(data.message || 'Failed to save.');
  } catch (err) {
    showError('Could not connect to Memora server.');
  } finally {
    setLoading(false);
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
