// The content script runs directly inside the web pages specified in manifest.json (localhost:5173).
// It has access to the page's localStorage!

// When the user opens the Memora web app, automatically sync the token to the extension:
const token = window.localStorage.getItem('memora_token');
if (token) {
  chrome.runtime.sendMessage({ type: 'MEMORA_SET_TOKEN', token });
} else {
  chrome.runtime.sendMessage({ type: 'MEMORA_CLEAR_TOKEN' });
}

// Also listen for real-time login/logout events from the React app
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== 'memora_web') return;

  if (event.data.type === 'MEMORA_SYNC_TOKEN') {
    chrome.runtime.sendMessage({ type: 'MEMORA_SET_TOKEN', token: event.data.token });
  } else if (event.data.type === 'MEMORA_CLEAR_TOKEN') {
    chrome.runtime.sendMessage({ type: 'MEMORA_CLEAR_TOKEN' });
  }
});
