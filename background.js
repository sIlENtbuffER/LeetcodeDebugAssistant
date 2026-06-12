// background.js

// Load shared provider metadata (PROVIDER_META global)
importScripts('shared/providers.js');

// Provider-specific API request formatters (unique to background)
const FORMAT_REQUEST = {
  openai: ({ apiKey, endpoint, model, temperature, prompt }) => ({
    url: `${endpoint.replace(/\/+$/, '')}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature
    },
    extractAnswer: (json) => json?.choices?.[0]?.message?.content
  }),
  anthropic: ({ apiKey, model, temperature, prompt }) => ({
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: {
      model,
      max_tokens: 4096,
      system: 'You are a senior LeetCode debugger.',
      messages: [{ role: 'user', content: prompt }],
      temperature
    },
    extractAnswer: (json) => json?.content?.[0]?.text
  }),
  google: ({ apiKey, endpoint, model, temperature, prompt }) => {
    const baseUrl = endpoint.replace(/\/+$/, '');
    return {
      url: `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature }
      },
      extractAnswer: (json) => json?.candidates?.[0]?.content?.parts?.[0]?.text
    };
  },
  custom: ({ apiKey, endpoint, model, temperature, prompt }) => ({
    url: `${endpoint.replace(/\/+$/, '')}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature
    },
    extractAnswer: (json) => json?.choices?.[0]?.message?.content
  })
};

// Merge metadata + formatters into full PROVIDERS object
const PROVIDERS = Object.fromEntries(
  Object.keys(PROVIDER_META).map(id => [
    id,
    { ...PROVIDER_META[id], formatRequest: FORMAT_REQUEST[id] }
  ])
);

async function getProviderConfig() {
  const data = await chrome.storage.local.get({
    activeProvider: 'openai',
    providers: {}
  });

  const providerId = data.activeProvider || 'openai';
  const providerConfig = PROVIDERS[providerId];
  const savedConfig = data.providers[providerId] || {};

  return {
    providerId,
    providerConfig,
    apiKey: savedConfig.apiKey || '',
    endpoint: savedConfig.endpoint || providerConfig.defaultEndpoint,
    model: savedConfig.model || providerConfig.defaultModel,
    temperature: savedConfig.temperature ?? 0.2
  };
}

async function callChatCompletion({ prompt, configOverride }) {
  const { providerConfig, apiKey, endpoint, model, temperature } =
    configOverride || (await getProviderConfig());

  if (!apiKey) {
    throw new Error(`No API key set for ${providerConfig.name}. Go to the extension Options and add your key.`);
  }

  const { url, headers, body, extractAnswer } = providerConfig.formatRequest({
    apiKey,
    endpoint,
    model,
    temperature,
    prompt
  });

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`API error: ${resp.status} ${resp.statusText}\n${text}`);
  }

  const json = await resp.json();
  const answer = extractAnswer?.(json) || '(no answer)';
  return answer;
}

// Process a request in background and save result to storage (mode-specific)
async function processRequestInBackground(prompt, mode = 'hint') {
  const storageKey = `lastAnswer_${mode}`;
  const statusKey = `processingStatus_${mode}`;

  try {
    await chrome.storage.local.set({ [statusKey]: 'loading' });
    const answer = await callChatCompletion({ prompt });
    await chrome.storage.local.set({
      [storageKey]: answer,
      lastAnswerTime: Date.now(),
      [statusKey]: 'complete'
    });
    console.log(`[${mode}] Request completed, answer length:`, answer?.length);
  } catch (err) {
    console.error(`[${mode}] Request error:`, err);
    await chrome.storage.local.set({
      [storageKey]: `Error: ${err.message || err}`,
      lastAnswerTime: Date.now(),
      [statusKey]: 'error'
    });
  }
}

// Message broker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'TEST_CONNECTION') {
    (async () => {
      try {
        const configOverride = msg.config
          ? {
              providerConfig: PROVIDERS[msg.providerId || 'openai'],
              apiKey: msg.config.apiKey,
              endpoint: msg.config.endpoint,
              model: msg.config.model,
              temperature: msg.config.temperature
            }
          : null;

        await callChatCompletion({
          prompt: 'Reply with just "OK" if you receive this.',
          configOverride
        });
        const config = configOverride || (await getProviderConfig());
        sendResponse({ ok: true, model: config.model });
      } catch (err) {
        sendResponse({ ok: false, error: String(err.message || err) });
      }
    })();
    return true;
  }

  if (msg?.type === 'GET_ADVICE') {
    console.log('[Background] Received GET_ADVICE, mode:', msg.mode);
    processRequestInBackground(msg.prompt, msg.mode);
    sendResponse({ ok: true, processing: true });
    return;
  }
});

console.log('[Background] Service worker loaded');
