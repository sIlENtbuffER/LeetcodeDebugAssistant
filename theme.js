// theme.js — shared theme utility for popup and options pages
// Loaded in <head> before first paint to prevent flash of wrong theme.

const THEME_KEY = 'theme';
const THEME_DEFAULT = 'system';

/**
 * Resolve the stored preference to an effective theme.
 * 'system' resolves via matchMedia; 'light'/'dark' pass through.
 */
function resolveEffectiveTheme(preference) {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

/** Toggle .dark class on <html> based on the effective theme. */
function applyThemeClass(effectiveTheme) {
  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
}

/** Save preference to both chrome.storage.local (persisted) and localStorage (sync cache). */
function saveThemePreference(preference) {
  localStorage.setItem(THEME_KEY, preference);
  chrome.storage.local.set({ [THEME_KEY]: preference });
}

/** Read preference synchronously from localStorage. Falls back to default. */
function readThemePreferenceSync() {
  return localStorage.getItem(THEME_KEY) || THEME_DEFAULT;
}

/**
 * Initialize theme on page load.
 * 1. Reads localStorage synchronously for zero-flash startup.
 * 2. Verifies against chrome.storage.local async — corrects stale cache.
 * 3. Listens for OS theme changes when in 'system' mode.
 * 4. Listens for chrome.storage changes to sync across pages.
 */
function initTheme() {
  var preference = readThemePreferenceSync();
  applyThemeClass(resolveEffectiveTheme(preference));

  // Async verification against canonical storage
  chrome.storage.local.get({ [THEME_KEY]: THEME_DEFAULT }, function (data) {
    var stored = data[THEME_KEY];
    if (stored !== preference) {
      localStorage.setItem(THEME_KEY, stored);
      applyThemeClass(resolveEffectiveTheme(stored));
    }
  });

  // React to OS theme changes when user chose 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    var current = readThemePreferenceSync();
    if (current === 'system') {
      applyThemeClass(resolveEffectiveTheme('system'));
    }
  });

  // Sync across popup and options pages
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && changes[THEME_KEY]) {
      var newTheme = changes[THEME_KEY].newValue;
      localStorage.setItem(THEME_KEY, newTheme);
      applyThemeClass(resolveEffectiveTheme(newTheme));
    }
  });
}

// Auto-initialize when loaded in <head>
initTheme();
