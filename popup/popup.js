// popup.js
const isLeetCode = url => /^https?:\/\/(leetcode\.com|leetcode\.cn)\//.test(url || '');

const sendToContent = (tabId, msg) =>
  new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (res) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(res);
    });
  });

async function grabViaInjection(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      function grabData() {
        const title = document.querySelector('[data-cy="question-title"]')?.innerText
          || document.querySelector('.question-title h3')?.innerText
          || document.title || 'unknown question';
        const monaco = document.querySelector('.monaco-editor');
        let code = '';
        if (monaco) code = monaco.querySelector('.view-lines')?.innerText || '';
        const resultArea = document.querySelector('[data-cy="run-result-fail"]')
          || document.querySelector('[data-cy="run-result-success"]');
        const result = resultArea?.innerText || '';
        return { title, code, result };
      }
      return grabData();
    }
  });
  return result;
}

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const loading = document.getElementById('loading');
  const pre = document.getElementById('answer');
  const copyBtn = document.getElementById('copyBtn');

  loading.style.display = 'block';
  pre.textContent = '';
  copyBtn.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !isLeetCode(tab.url)) throw new Error('Open a LeetCode problem page first.');

    // 1) try talking to content script
    let data;
    try {
      data = await sendToContent(tab.id, { type: 'GET_DATA' });
    } catch (e) {
    // 2) content script not there → inject a one-off grabber
      data = await grabViaInjection(tab.id);
    }

    const prompt = `
You're a senior LeetCode debugger.
Problem: ${data.title}

User code:
${data.code}

Run result / error:
${data.result}

Tasks:
1) Identify root causes clearly (logic/edge cases/complexity/DS misuse).
2) Provide step-by-step fixes.
3) Return a corrected, complete solution in the same language as the user's code.
`;

    const { ok, answer, error } = await chrome.runtime.sendMessage({
      type: 'GET_ADVICE',
      prompt
    });
    if (!ok) throw new Error(error);

    pre.textContent = answer;
    copyBtn.style.display = 'inline-block';
  } catch (e) {
    pre.textContent = `Error: ${e.message || e}`;
  } finally {
    loading.style.display = 'none';
  }
});