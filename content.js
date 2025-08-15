// content.js
function grabData() {
    // question name
    const title = document.querySelector('[data-cy="question-title"]')?.innerText
               || document.querySelector('.question-title h3')?.innerText
               || document.title
               || 'unknown question';
  
    // code
    const monaco = document.querySelector('.monaco-editor');
    let code = '';
    if (monaco) {
      code = monaco.querySelector('.view-lines')?.innerText || '';
    }
  
    // running result
    const resultArea = document.querySelector('[data-cy="run-result-fail"]')
                     || document.querySelector('[data-cy="run-result-success"]')
                     || document.querySelector('.success__3Ai7, .error__2a1B');
    const result = resultArea?.innerText || '';
  
    return { title, code, result };
  }
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_DATA') {
      sendResponse(grabData());
    }
  });
  