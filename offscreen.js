// offscreen.js - Minimal version for debugging

console.log('=== OFFSCREEN.JS LOADED ===');
console.log('document.readyState:', document.readyState);
console.log('chrome:', typeof chrome);

// Try to access chrome APIs immediately
try {
  console.log('chrome.runtime:', chrome.runtime);
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_PING' }, (response) => {
    console.log('PING response:', response);
  });
} catch (e) {
  console.error('chrome.runtime error:', e);
}

// Wait for DOM ready then try again
window.addEventListener('DOMContentLoaded', () => {
  console.log('=== DOM CONTENT LOADED ===');
  console.log('chrome:', typeof chrome);

  try {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_DOM_READY' }, (response) => {
      console.log('DOM READY response:', response);
    });
  } catch (e) {
    console.error('chrome.runtime error in DOMContentLoaded:', e);
  }
});

// Also try after a delay
setTimeout(() => {
  console.log('=== TIMEOUT 100ms ===');
  console.log('chrome:', typeof chrome);

  if (chrome && chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_TIMEOUT' }, (response) => {
      console.log('TIMEOUT response:', response);
    });
  }
}, 100);
