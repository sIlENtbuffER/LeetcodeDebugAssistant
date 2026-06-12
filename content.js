// content.js
// LC_SELECTORS loaded via manifest content_scripts (shared/selectors.js runs first)

function grabData() {
  const title = LC_SELECTORS.title.reduce(
    (found, sel) => found || document.querySelector(sel)?.innerText, null
  ) || document.title || 'unknown question';

  const monaco = document.querySelector(LC_SELECTORS.codeEditor);
  const code = monaco ? (monaco.querySelector(LC_SELECTORS.code)?.innerText || '') : '';

  const resultArea = LC_SELECTORS.result.reduce(
    (found, sel) => found || document.querySelector(sel), null
  );
  const result = resultArea?.innerText || '';

  return { title, code, result };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_DATA') {
    sendResponse(grabData());
  }
});
