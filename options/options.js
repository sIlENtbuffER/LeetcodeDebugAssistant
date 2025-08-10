// options.js
const els = {
    endpoint: document.getElementById('endpoint'),
    model: document.getElementById('model'),
    temperature: document.getElementById('temperature'),
    apiKey: document.getElementById('apiKey'),
    saveBtn: document.getElementById('saveBtn'),
    status: document.getElementById('status')
  };
  
  async function load() {
    const { endpoint, model, temperature, apiKey } = await chrome.storage.local.get({
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      apiKey: ''
    });
    els.endpoint.value = endpoint;
    els.model.value = model;
    els.temperature.value = temperature;
    els.apiKey.value = apiKey ? '********' : '';
  }
  
  els.saveBtn.addEventListener('click', async () => {
    const prev = await chrome.storage.local.get(['apiKey']);
    const newKey = els.apiKey.value === '********' ? prev.apiKey : els.apiKey.value.trim();
  
    await chrome.storage.local.set({
      endpoint: els.endpoint.value.trim() || 'https://api.openai.com/v1',
      model: els.model.value.trim() || 'gpt-4o-mini',
      temperature: Number(els.temperature.value) || 0.2,
      apiKey: newKey || ''
    });
  
    els.status.textContent = 'Saved!';
    setTimeout(() => (els.status.textContent = ''), 1200);
  });
  
  load();
  