// options.js

// PROVIDER_META loaded via <script src="../shared/providers.js"> in options.html

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
  const provider = PROVIDER_META[providerId];
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
  const provider = PROVIDER_META[currentProvider];
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

// Test connection — passes config directly to background (no storage mutation)
els.testBtn.addEventListener('click', async () => {
  const provider = PROVIDER_META[currentProvider];
  const savedData = allProvidersData[currentProvider] || {};
  const testKey = els.apiKey.value === '********' ? savedData.apiKey : els.apiKey.value.trim();

  if (!testKey) {
    els.status.textContent = 'Please enter an API key first.';
    return;
  }

  // Show loading state
  els.testBtn.disabled = true;
  els.testBtn.textContent = 'Testing...';
  els.status.textContent = '';

  try {
    const testConfig = {
      endpoint: provider.needsEndpoint ? (els.endpoint.value.trim() || provider.defaultEndpoint) : provider.defaultEndpoint,
      model: els.model.value.trim() || provider.defaultModel,
      temperature: Number(els.temperature.value) || 0.2,
      apiKey: testKey
    };

    const response = await chrome.runtime.sendMessage({
      type: 'TEST_CONNECTION',
      providerId: currentProvider,
      config: testConfig
    });

    if (response.ok) {
      els.status.textContent = `Connection successful! Model: ${response.model || testConfig.model}`;
    } else {
      els.status.textContent = `Failed: ${response.error}`;
    }
  } catch (err) {
    els.status.textContent = `Error: ${err.message}`;
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
