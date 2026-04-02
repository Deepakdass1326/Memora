/**
 * Memora Background Service Worker
 * Handles keyboard shortcut (Alt+Shift+S) to open the extension popup.
 * Also syncs the auth token from the web app's localStorage into chrome.storage.local
 * so the popup can authenticate without the user having to log in again.
 */

// When the extension icon is clicked or shortcut fired, chrome opens the popup automatically.
// This background script listens for messages from the web app page to sync the auth token.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MEMORA_SET_TOKEN') {
    chrome.storage.local.set({ memora_token: message.token }, () => {
      sendResponse({ success: true });
    });
    return true; // keep channel open for async response
  }

  if (message.type === 'MEMORA_CLEAR_TOKEN') {
    chrome.storage.local.remove('memora_token', () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
