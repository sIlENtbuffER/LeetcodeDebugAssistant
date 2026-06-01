// options.js

// Provider definitions (must match background.js)
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    desc: 'ChatGPT and GPT models',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsEndpoint: true,
    modelHint: 'e.g., gpt-4o-mini, gpt-4o, o1'
  },
  anthropic: {
    name: 'Anthropic',
    desc: 'Claude models',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    needsEndpoint: false,
    modelHint: 'e.g., claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022'
  },
  google: {
    name: 'Google',
    desc: 'Gemini models',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash-exp',
    needsEndpoint: true,
    modelHint: 'e.g., gemini-2.0-flash-exp, gemini-1.5-pro'
  },
  custom: {
    name: 'Custom',
    desc: 'OpenAI-compatible API',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsEndpoint: true,
    modelHint: 'Any chat-completions model'
  }
};

const els = {
  providerSelect: document.getElementById('providerSelect'),
  providerName: document.getElementById('providerName'),
  providerDesc: document.getElementById('providerDesc'),
  endpointLabel: document.getElementById('endpointLabel'),
  endpoint: document.getElementById('endpoint'),
  endpointHint: document.getElementById('endpointHint'),
  model: document.getElementById('model'),
  modelHint: document.getElementById('modelHint'),
  temperature: document.getElementById('temperature'),
  apiKey: document.getElementById('apiKey'),
  testBtn: document.getElementById('testBtn'),
  saveBtn: document.getElementById('saveBtn'),
  status: document.getElementById('status')
};

let currentProvider = 'openai';
let allProvidersData = {};

// Update UI based on selected provider
function updateProviderUI(providerId) {
  const provider = PROVIDERS[providerId];
  currentProvider = providerId;

  els.providerName.textContent = provider.name;
  els.providerDesc.textContent = provider.desc;
  els.modelHint.textContent = provider.modelHint;

  // Show/hide endpoint field
  if (provider.needsEndpoint) {
    els.endpointLabel.classList.remove('hidden');
    els.endpoint.placeholder = provider.defaultEndpoint;
    els.endpointHint.textContent = providerId === 'google'
      ? 'Base URL (e.g., https://generativelanguage.googleapis.com/v1beta)'
      : 'API base URL';
  } else {
    els.endpointLabel.classList.add('hidden');
  }

  // Load saved values for this provider
  const saved = allProvidersData[providerId] || {};
  els.endpoint.value = saved.endpoint || provider.defaultEndpoint;
  els.model.value = saved.model || provider.defaultModel;
  els.temperature.value = saved.temperature ?? 0.2;
  els.apiKey.value = saved.apiKey ? '********' : '';
}

async function load() {
  const data = await chrome.storage.local.get({
    activeProvider: 'openai',
    providers: {}
  });

  allProvidersData = data.providers || {};
  currentProvider = data.activeProvider || 'openai';

  els.providerSelect.value = currentProvider;
  updateProviderUI(currentProvider);
}

els.providerSelect.addEventListener('change', () => {
  updateProviderUI(els.providerSelect.value);
});

els.saveBtn.addEventListener('click', async () => {
  const provider = PROVIDERS[currentProvider];
  const savedData = allProvidersData[currentProvider] || {};

  // Handle API key masking
  const newKey = els.apiKey.value === '********' ? savedData.apiKey : els.apiKey.value.trim();

  // Update current provider's config
  allProvidersData[currentProvider] = {
    endpoint: provider.needsEndpoint ? (els.endpoint.value.trim() || provider.defaultEndpoint) : provider.defaultEndpoint,
    model: els.model.value.trim() || provider.defaultModel,
    temperature: Number(els.temperature.value) || 0.2,
    apiKey: newKey || ''
  };

  await chrome.storage.local.set({
    activeProvider: currentProvider,
    providers: allProvidersData
  });

  els.status.textContent = `Saved for ${provider.name}!`;
  setTimeout(() => (els.status.textContent = ''), 2000);
});

// Test connection button
els.testBtn.addEventListener('click', async () => {
  const provider = PROVIDERS[currentProvider];
  const savedData = allProvidersData[currentProvider] || {};
  const testKey = els.apiKey.value === '********' ? savedData.apiKey : els.apiKey.value.trim();

  if (!testKey) {
    els.status.innerHTML = '<span class="error">Please enter an API key first.</span>';
    return;
  }

  // Show loading state
  els.testBtn.disabled = true;
  els.testBtn.innerHTML = '<span class="spinner"></span> Testing...';
  els.status.innerHTML = '';

  try {
    // Temporarily save test config to storage for background to use
    const testConfig = {
      endpoint: provider.needsEndpoint ? (els.endpoint.value.trim() || provider.defaultEndpoint) : provider.defaultEndpoint,
      model: els.model.value.trim() || provider.defaultModel,
      temperature: Number(els.temperature.value) || 0.2,
      apiKey: testKey
    };

    const data = await chrome.storage.local.get({ providers: {} });
    const originalConfig = data.providers[currentProvider];

    await chrome.storage.local.set({
      activeProvider: currentProvider,
      providers: { ...data.providers, [currentProvider]: testConfig }
    });

    // Send test request to background
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_CONNECTION',
      providerId: currentProvider
    });

    // Restore original config
    if (originalConfig) {
      const restored = await chrome.storage.local.get({ providers: {} });
      await chrome.storage.local.set({
        providers: { ...restored.providers, [currentProvider]: originalConfig }
      });
    }

    if (response.ok) {
      els.status.innerHTML = `<span class="success">✓ Connection successful! Model: ${response.model || testConfig.model}</span>`;
    } else {
      els.status.innerHTML = `<span class="error">✗ Failed: ${response.error}</span>`;
    }
  } catch (err) {
    els.status.innerHTML = `<span class="error">✗ Error: ${err.message}</span>`;
  } finally {
    els.testBtn.disabled = false;
    els.testBtn.textContent = 'Test Connection';
  }
});

// Theme selector
function initThemeSelector() {
  const selector = document.getElementById('themeSelector');
  if (!selector) return;

  const options = selector.querySelectorAll('.theme-option');
  const current = readThemePreferenceSync();
  options.forEach(function (opt) {
    opt.classList.toggle('active', opt.dataset.theme === current);
  });

  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      const theme = opt.dataset.theme;
      saveThemePreference(theme);
      applyThemeClass(resolveEffectiveTheme(theme));
      options.forEach(function (o) { o.classList.remove('active'); });
      opt.classList.add('active');
    });
  });
}

initThemeSelector();
load();
