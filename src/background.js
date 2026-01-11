// Background Service Worker
// Handles installation and potentially background tasks

chrome.runtime.onInstalled.addListener(() => {
  console.log('Obsidian Web Clipper Installed');
});

// Listener for messages if we need to proxy requests (e.g. for CORS)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Placeholder for future logic
    return true;
});
