/**
 * Memora Browser Extension — popup.js
 * Reads the current tab's URL/title and POSTs to the Memora backend.
 * Auth token is read from chrome.storage.local (synced from the web app).
 */

const API_BASE = 'http://localhost:5000/api'; // change to production URL when deploying

let selectedType = 'article';
let currentTab = null;

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
  const btn = $('save-btn');
  const text = $('save-btn-text');
  btn.disabled = isLoading;
  text.textContent = isLoading ? 'Saving…' : '✦ Save to Memora';
}

// ── Type selector ────────────────────────────────────────────────────────────

document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
  });
});

// Auto-detect type from URL
function detectType(url) {
  if (!url) return 'link';
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) return 'video';
  if (/twitter\.com|x\.com/.test(url)) return 'tweet';
  if (/\.pdf(\?.*)?$/.test(url)) return 'pdf';
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/.test(url)) return 'image';
  return 'article';
}

function selectType(type) {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  selectedType = type;
}

// ── Initialise ───────────────────────────────────────────────────────────────

async function init() {
  // Get token from chrome storage
  const { memora_token: token } = await chrome.storage.local.get('memora_token');

  if (!token) {
    show('not-logged-in');
    return;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Populate preview
  $('preview-title').textContent = tab.title || 'Untitled page';
  $('preview-url').textContent = tab.url;

  // Set favicon
  if (tab.favIconUrl) {
    const img = document.createElement('img');
    img.src = tab.favIconUrl;
    $('preview-favicon').appendChild(img);
  }

  // Auto-detect content type
  selectType(detectType(tab.url));

  // Show auth user name
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      $('auth-status').textContent = `Hi, ${data.user.name.split(' ')[0]} 👋`;
    }
  } catch (_) {}

  show('save-view');
}

// ── Save handler ─────────────────────────────────────────────────────────────

$('save-btn').addEventListener('click', async () => {
  const { memora_token: token } = await chrome.storage.local.get('memora_token');
  if (!token) { showError('Not logged in.'); return; }

  setLoading(true);

  const note = $('note-input').value.trim();
  const tagsRaw = $('tags-input').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const payload = {
    url: currentTab.url,
    title: currentTab.title || '',
    description: note,
    type: selectedType,
    tags,
    source: new URL(currentTab.url).hostname.replace('www.', ''),
  };

  try {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      hide('save-view');
      show('success-view');
    } else {
      showError(data.message || 'Failed to save.');
    }
  } catch (err) {
    showError('Could not connect to Memora server.');
  } finally {
    setLoading(false);
  }
});

// ── Boot ─────────────────────────────────────────────────────────────────────
init();
