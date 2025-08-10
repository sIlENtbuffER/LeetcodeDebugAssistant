// popup.js
document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const loading = document.getElementById('loading');
    const pre = document.getElementById('answer');
    const copyBtn = document.getElementById('copyBtn');
  
    loading.style.display = 'block';
    pre.textContent = '';
    copyBtn.style.display = 'none';
  
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const data = await chrome.tabs.sendMessage(tab.id, { type: 'GET_DATA' });
  
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
  3) Return a corrected, complete solution.
  If multiple languages are possible, use the same language as the user's code.
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
  
  document.getElementById('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('answer').textContent);
  });
  