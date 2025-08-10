// background.js

async function callChatCompletion({ prompt }) {
    const { apiKey, endpoint, model, temperature } = await chrome.storage.local.get({
      apiKey: '',
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      temperature: 0.2
    });
  
    if (!apiKey) {
      throw new Error('No API key set. Go to the extension Options and add your key.');
    }
  
    const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;
  
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature
      })
    });
  
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Upstream error: ${resp.status} ${resp.statusText}\n${text}`);
    }
  
    const json = await resp.json();
    const answer = json?.choices?.[0]?.message?.content || '(no answer)';
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