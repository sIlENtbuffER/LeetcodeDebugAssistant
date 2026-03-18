// background.js

// Provider configurations with their API formats
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsEndpoint: true,
    // OpenAI-compatible API format
    formatRequest: ({ apiKey, endpoint, model, temperature, prompt }) => ({
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
  },
  anthropic: {
    name: 'Anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    needsEndpoint: false,
    formatRequest: ({ apiKey, model, temperature, prompt }) => ({
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: {
        model,
        max_tokens: 4096,
        system: 'You are a senior LeetCode debugger. Help users identify and fix bugs in their code.',
        messages: [{ role: 'user', content: prompt }],
        temperature
      },
      extractAnswer: (json) => json?.content?.[0]?.text
    })
  },
  google: {
    name: 'Google Gemini',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash-exp',
    needsEndpoint: true,
    formatRequest: ({ apiKey, endpoint, model, temperature, prompt }) => {
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
    }
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsEndpoint: true,
    // Same as OpenAI format
    formatRequest: ({ apiKey, endpoint, model, temperature, prompt }) => ({
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
  }
};

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

async function callChatCompletion({ prompt }) {
  const { providerId, providerConfig, apiKey, endpoint, model, temperature } = await getProviderConfig();

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
    throw new Error(`Upstream error: ${resp.status} ${resp.statusText}\n${text}`);
  }

  const json = await resp.json();
  const answer = extractAnswer?.(json) || '(no answer)';
  return answer;
}

// Message broker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'GET_ADVICE') {
    (async () => {
      try {
        const answer = await callChatCompletion({ prompt: msg.prompt });
        sendResponse({ ok: true, answer });
      } catch (err) {
        sendResponse({ ok: false, error: String(err.message || err) });
      }
    })();
    return true; // keep the message channel open for async response
  }
});
