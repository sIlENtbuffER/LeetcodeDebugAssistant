// popup.js

// Provider names for display
const PROVIDER_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Claude',
  google: 'Gemini',
  custom: 'Custom'
};

// Response modes
const MODES = ['debug', 'hint', 'interview'];
const DEFAULT_MODE = 'hint';

// Get current mode from storage, return default if not set
async function getMode() {
  const data = await chrome.storage.local.get({ responseMode: DEFAULT_MODE });
  return data.responseMode;
}

// Save mode to storage
async function setMode(mode) {
  await chrome.storage.local.set({ responseMode: mode });
}

// Build prompt based on mode
function buildPrompt(mode, data) {
  const { title, code, result } = data;

  // Common format instructions
  const formatInstructions = `
Format your response with markdown:
- Use ### for section headings (no blank line after heading, content immediately follows)
- Use **bold** for key terms
- Use numbered lists for steps
- Use code blocks with language hint (e.g., \`\`\`javascript)
- Use LaTeX format for math: $O(n^2)$ for inline, $$O(n^2)$$ for display mode
- IMPORTANT: No blank lines after ### headings. Content starts on the next line.
- Keep output compact - minimize blank lines throughout.`;

  switch (mode) {
    case 'debug':
      return `You are a senior LeetCode debugging assistant.

Problem: ${title}

User code:
\`\`\`
${code}
\`\`\`

Run result / error:
${result}

Tasks:
1. Identify root cause of failure.
2. Show minimal fix preserving user's logic when possible.
3. Provide corrected full solution in same language.

Return your response in markdown with exactly these sections:
### Diagnosis
### Minimal Fix
### Corrected Code

Be concise and practical.
${formatInstructions}

Example format:
### Diagnosis
The issue is...
### Minimal Fix
Change line X to...
### Corrected Code
\`\`\`javascript
// code here
\`\`\``;

    case 'interview':
      return `You are a FAANG-level interview coach.

Problem: ${title}

User code:
\`\`\`
${code}
\`\`\`

Run result / error:
${result}

Provide a structured interview preparation. Return your response in markdown with exactly these sections:

### Problem Classification
What type of problem is this?

### Brute Force Approach
Explain naive solution with time and space complexity.

### Optimized Approach
Explain optimal algorithm with time and space complexity.

### Tradeoffs
Compare brute force vs optimized (time vs space vs simplicity).

### Complexity Analysis
Use LaTeX notation like $O(n)$, $O(n \\log n)$, etc.

### Follow-up Interview Questions
Provide 3-5 realistic interviewer follow-up questions.

Be structured and concise.
${formatInstructions}

Example format:
### Problem Classification
This is a...
### Brute Force Approach
Try all...`;

    case 'hint':
    default:
      return `You are a senior algorithms tutor.

Your task is to help the user discover the solution gradually.

Problem:
${title}

User code:
\`\`\`
${code}
\`\`\`

Run result / error:
${result}

Generate progressive hints.

Rules:

Do NOT reveal the full solution immediately.

Each hint should reveal slightly more information.

Each hint should build on the user's current approach when possible.

Return markdown with EXACT sections:

### Hint Level 1
Provide a subtle directional hint.
Do not mention specific algorithm names.

### Hint Level 2
Reveal the algorithm category or problem pattern.

Examples:
DFS
DP
Binary Search
Sliding Window
Graph traversal
Heap

Brief explanation only.

### Hint Level 3
Explain the structure of the solution.
Mention data structures and main steps.

Do NOT write full code.

### Hint Level 4
Explain the key insight that makes the solution correct.

### Solution
Provide complete corrected code in the same language.

Include time and space complexity in LaTeX.

Be concise.

Avoid giving away too much too early.
${formatInstructions}`;

    case 'learn':
      return `You are a senior algorithm tutor and debugging assistant.

Problem: ${title}

User code:
\`\`\`
${code}
\`\`\`

Run result / error:
${result}

Help the user learn from this failure. Return your response in markdown with exactly these sections:

### Diagnosis
What's wrong? Classify the issue: logic bug, edge case, complexity issue, data structure misuse, or incorrect algorithm choice.

### Pattern Recognition
What algorithmic pattern/category does this problem belong to?

### Recommended Solution
Explain the intuition, outline the steps, then provide clean code with time and space complexity (use LaTeX like $O(n)$).

### Alternative Approaches
Mention other valid approaches only if they provide different tradeoffs.

### Edge Cases to Watch
List the edge cases that commonly fail for this problem.

### Takeaway
2-4 bullets to help recognize this pattern in future problems.

Be concise but educational.
${formatInstructions}

Example format:
### Diagnosis
The code fails because...
### Pattern Recognition
This is a classic...`;
  }
}

// Load and display current provider
chrome.storage.local.get({ activeProvider: 'openai' }, ({ activeProvider }) => {
  const badge = document.getElementById('providerBadge');
  if (badge) {
    badge.textContent = PROVIDER_NAMES[activeProvider] || 'Unknown';
  }
});

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

// Render markdown to the answer div
async function renderAnswer(text, mode = null) {
  // Use current mode if not specified
  if (!mode) {
    mode = await getMode();
  }

  // Use hint renderer for hint mode
  if (mode === 'hint') {
    await renderHintAnswer(text);
    document.getElementById('buttonRow').style.display = 'none';
    console.log('renderHintAnswer called, answer length:', text?.length);
    return;
  }

  const answerDiv = document.getElementById('answer');
  if (typeof marked !== 'undefined') {
    answerDiv.innerHTML = marked.parse(text);

    // Render LaTeX math with KaTeX after markdown is parsed
    if (typeof renderMathInElement !== 'undefined') {
      renderMathInElement(answerDiv, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\(', right: '\\)', display: false},
          {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false
      });
    }

    // Add copy buttons to code blocks
    addCopyButtons();
  } else {
    // Fallback if marked isn't loaded
    answerDiv.textContent = text;
  }
  document.getElementById('buttonRow').style.display = 'none'; // Hide the old copy button row
  console.log('renderAnswer called, answer length:', text?.length);
}

// Add copy buttons to each code block
function addCopyButtons() {
  const codeBlocks = document.querySelectorAll('#answer pre code');
  codeBlocks.forEach((codeBlock) => {
    // Skip if already has a copy button
    if (codeBlock.parentElement.querySelector('.copy-btn')) return;

    const pre = codeBlock.parentElement;

    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '📋';
    copyBtn.title = 'Copy code';
    copyBtn.textContent = 'Copy';

    // Add click handler
    copyBtn.addEventListener('click', async () => {
      const code = codeBlock.textContent;
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = '✓';
        copyBtn.style.background = '#22c55e';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.style.background = '';
        }, 1500);
      } catch (err) {
        copyBtn.textContent = '✗';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.style.background = '';
        }, 1500);
      }
    });

    // Style the pre element to position the button
    pre.style.position = 'relative';
    pre.style.paddingRight = '40px'; // Make room for the button

    // Style the button
    Object.assign(copyBtn.style, {
      position: 'absolute',
      top: '4px',
      right: '4px',
      background: '#4b5563',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '2px 6px',
      fontSize: '11px',
      cursor: 'pointer',
      zIndex: '1',
      opacity: '0',
      transition: 'opacity 0.2s'
    });

    // Show button on hover
    pre.addEventListener('mouseenter', () => {
      copyBtn.style.opacity = '1';
    });
    pre.addEventListener('mouseleave', () => {
      copyBtn.style.opacity = '0';
    });

    pre.appendChild(copyBtn);
  });
}

// Parse hint response and create collapsible sections
function parseHintSections(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(.+)$/);
    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections.push({
          title: currentSection,
          content: currentContent.join('\n').trim()
        });
      }
      // Start new section
      currentSection = headingMatch[1];
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections.push({
      title: currentSection,
      content: currentContent.join('\n').trim()
    });
  }

  return sections;
}

// Render hint answer with collapsible sections
async function renderHintAnswer(markdown) {
  const answerDiv = document.getElementById('answer');
  const sections = parseHintSections(markdown);

  // Create container for hint sections
  const container = document.createElement('div');
  container.className = 'hint-container';

  sections.forEach((section, index) => {
    const isSolution = section.title.toLowerCase().includes('solution');
    const isLevel1 = section.title.toLowerCase().includes('hint level 1');

    // Create section wrapper
    const sectionDiv = document.createElement('div');
    sectionDiv.className = `hint-section ${isSolution ? 'hint-solution' : ''}`;

    // Create header
    const header = document.createElement('div');
    header.className = 'hint-header';
    header.innerHTML = `<span class="hint-title">${section.title}</span>`;

    // Create content area
    const content = document.createElement('div');
    content.className = 'hint-content';

    // Level 1 is always expanded, others collapsed
    if (isLevel1) {
      content.classList.add('expanded');
      sectionDiv.classList.add('expanded');
    } else {
      content.classList.add('collapsed');
      sectionDiv.classList.add('collapsed');
    }

    // Parse markdown content for this section
    if (typeof marked !== 'undefined') {
      content.innerHTML = marked.parse(section.content);
    } else {
      content.textContent = section.content;
    }

    // Add "Show next hint" button (only for non-last sections before solution)
    if (index < sections.length - 1) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'hint-next-btn';
      nextBtn.textContent = 'Show next hint';
      nextBtn.addEventListener('click', () => {
        // Find next collapsed section and expand it
        const nextCollapsed = container.querySelectorAll('.hint-section.collapsed');
        if (nextCollapsed.length > 0) {
          const next = nextCollapsed[0];
          next.classList.remove('collapsed');
          next.classList.add('expanded');
          next.querySelector('.hint-content').classList.remove('collapsed');
          next.querySelector('.hint-content').classList.add('expanded');

          // Hide this button after clicking
          nextBtn.style.display = 'none';

          // Render LaTeX in newly revealed content
          if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(next.querySelector('.hint-content'), {
              delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
              ],
              throwOnError: false
            });
          }

          // Add copy buttons to new code blocks
          addCopyButtons();
        }
      });
      header.appendChild(nextBtn);
    }

    sectionDiv.appendChild(header);
    sectionDiv.appendChild(content);
    container.appendChild(sectionDiv);
  });

  answerDiv.innerHTML = '';
  answerDiv.appendChild(container);

  // Render LaTeX for initially visible content
  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(container, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
        {left: '\\[', right: '\\]', display: true}
      ],
      throwOnError: false
    });
  }

  // Add copy buttons to code blocks
  addCopyButtons();
}

// Save answer to storage for persistence (mode-specific)
async function saveAnswer(text, mode) {
  const storageKey = `lastAnswer_${mode}`;
  await chrome.storage.local.set({
    [storageKey]: text,
    lastAnswerTime: Date.now()
  });
}

// Load saved answer on popup open (mode-specific)
async function loadSavedAnswer() {
  const currentMode = await getMode();
  const storageKey = `lastAnswer_${currentMode}`;
  const statusKey = `processingStatus_${currentMode}`;
  console.log('=== loadSavedAnswer START ===');
  console.log('currentMode:', currentMode);

  // First, get ALL processing statuses to debug
  const allData = await chrome.storage.local.get(null);
  console.log('All storage data:', allData);

  // Restore loadingModes from storage for all modes
  for (const mode of MODES) {
    const modeStatusKey = `processingStatus_${mode}`;
    if (allData[modeStatusKey] === 'loading') {
      loadingModes.add(mode);
      console.log('✓ Restored loading state for mode:', mode);
    }
  }
  console.log('loadingModes after restore:', Array.from(loadingModes));

  const data = await chrome.storage.local.get({ [storageKey]: null, [statusKey]: null });
  console.log('Current mode data:', { [storageKey]: data[storageKey]?.substring?.(0, 50), [statusKey]: data[statusKey] });

  if (data[statusKey] === 'loading') {
    // Request still processing for this mode, show loading state
    const loading = document.getElementById('loading');
    loading.textContent = `Generating (${currentMode})... (you can close this popup)`;
    loading.style.display = 'block';
    document.getElementById('answer').innerHTML = '';
    document.getElementById('buttonRow').style.display = 'none';
    console.log('✓ Showing loading UI for mode:', currentMode);
  } else if (data[storageKey]) {
    console.log('✓ Rendering saved answer');
    renderAnswer(data[storageKey], currentMode);
  } else {
    console.log('✓ No saved answer for this mode');
  }

  // Update mode selector indicators after restoring state
  await updateModeUI(currentMode);
  console.log('=== loadSavedAnswer END ===');
}

// Watch for storage changes (result completed while popup was closed)
chrome.storage.onChanged.addListener((changes, area) => {
  console.log('Storage changed:', area, Object.keys(changes));
  if (area === 'local') {
    // Check for completion or error status for any mode
    for (const mode of MODES) {
      const statusKey = `processingStatus_${mode}`;
      if (changes[statusKey]) {
        const statusValue = changes[statusKey].newValue;
        console.log(`Processing status changed for ${mode}:`, statusValue);

        // If status was removed (undefined), it means cancelled - clean up
        if (statusValue === undefined) {
          loadingModes.delete(mode);
          getMode().then(currentMode => {
            updateModeUI(currentMode);
            if (currentMode === mode) {
              document.getElementById('loading').style.display = 'none';
            }
          });
          continue;
        }

        // Always update mode selector indicators
        getMode().then(currentMode => {
          updateModeUI(currentMode);
        });

        // Only update main UI if this is the currently selected mode
        getMode().then(currentMode => {
          if (currentMode !== mode) {
            console.log(`Skipping main UI update - current mode is ${currentMode}, status change is for ${mode}`);
            return;
          }

          const loading = document.getElementById('loading');

          if (changes[statusKey].newValue === 'complete') {
            console.log(`Status: complete for ${mode} - fetching answer`);
            loadingModes.delete(mode); // Remove from loading set
            loading.style.display = 'none';
            const storageKey = `lastAnswer_${mode}`;
            chrome.storage.local.get([storageKey], (answerData) => {
              console.log(`Got answer from storage, mode: ${mode}, length:`, answerData[storageKey]?.length);
              if (answerData[storageKey]) {
                renderAnswer(answerData[storageKey], mode);
              }
            });
          } else if (changes[statusKey].newValue === 'error') {
            console.log(`Status: error for ${mode}`);
            loadingModes.delete(mode); // Remove from loading set on error
            loading.style.display = 'none';
            const storageKey = `lastAnswer_${mode}`;
            chrome.storage.local.get([storageKey], (answerData) => {
              const errorMsg = answerData[storageKey] || 'Error occurred';
              document.getElementById('answer').innerHTML = `<span style="color: #dc2626;">${errorMsg}</span>`;
            });
          } else if (changes[statusKey].newValue === 'loading') {
            // This mode started loading - show loading if this is current mode
            loading.textContent = `Generating (${mode})... (you can close this popup)`;
            loading.style.display = 'block';
            document.getElementById('answer').innerHTML = '';
            document.getElementById('buttonRow').style.display = 'none';
          }
        });
      }
    }

    // If a mode-specific answer changed directly (not through status change), update if current mode
    for (const mode of MODES) {
      const key = `lastAnswer_${mode}`;
      if (changes[key]?.newValue) {
        getMode().then(currentMode => {
          if (currentMode === mode) {
            // Check if this mode is not currently loading
            const statusKey = `processingStatus_${mode}`;
            chrome.storage.local.get([statusKey], (statusData) => {
              if (statusData[statusKey] !== 'loading') {
                renderAnswer(changes[key].newValue, mode);
              }
            });
          }
        });
      }
    }
  }
});

// Track which modes are currently loading (supports parallel generation)
// Must be declared before any functions that use it
const loadingModes = new Set();

// === Mode Selector ===
const modeSelector = document.getElementById('modeSelector');
const modeOptions = modeSelector?.querySelectorAll('.mode-option');

// Load and set active mode from storage
async function initModeSelector() {
  const currentMode = await getMode();
  updateModeUI(currentMode);
}

// Load saved answer when popup opens
console.log('Libraries loaded:', { marked: typeof marked, katex: typeof katex, renderMathInElement: typeof renderMathInElement });
loadSavedAnswer();

// Update UI to reflect current mode and loading states
async function updateModeUI(mode) {
  modeOptions.forEach(opt => {
    const optMode = opt.dataset.mode;
    // Update active state
    if (optMode === mode) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }

    // Remove existing loading indicator
    const existingIndicator = opt.querySelector('.loading-dot');
    if (existingIndicator) existingIndicator.remove();

    // Add loading indicator if this mode is loading (from local state or storage)
    const isLocallyLoading = loadingModes.has(optMode);
    if (isLocallyLoading) {
      const dot = document.createElement('span');
      dot.className = 'loading-dot';
      dot.textContent = ' ⏳';
      dot.style.fontSize = '10px';
      opt.appendChild(dot);
    } else {
      // Also check storage for loading state (syncs across popup opens)
      const statusKey = `processingStatus_${optMode}`;
      chrome.storage.local.get([statusKey], (data) => {
        if (data[statusKey] === 'loading' && !loadingModes.has(optMode)) {
          loadingModes.add(optMode); // Sync local state with storage
          const dot = document.createElement('span');
          dot.className = 'loading-dot';
          dot.textContent = ' ⏳';
          dot.style.fontSize = '10px';
          opt.appendChild(dot);
        }
      });
    }
  });
}

// Handle mode selection - also load saved answer or loading state for that mode
modeOptions?.forEach(opt => {
  opt.addEventListener('click', async () => {
    const selectedMode = opt.dataset.mode;
    await setMode(selectedMode);
    await updateModeUI(selectedMode);

    const loading = document.getElementById('loading');
    const answerDiv = document.getElementById('answer');
    const buttonRow = document.getElementById('buttonRow');

    const storageKey = `lastAnswer_${selectedMode}`;
    const statusKey = `processingStatus_${selectedMode}`;

    // Check if this mode is currently loading (from local state)
    const isThisModeLoading = loadingModes.has(selectedMode);

    // If we're switching back to a loading mode, show loading immediately
    if (isThisModeLoading) {
      loading.style.display = 'block';
      loading.textContent = `Generating (${selectedMode})... (you can close this popup)`;
      answerDiv.innerHTML = '';
      buttonRow.style.display = 'none';
      return; // Don't check storage - we know it's loading
    }

    // Hide loading if the current mode is not loading
    loading.style.display = 'none';

    // Check storage for saved answer or loading state
    chrome.storage.local.get([storageKey, statusKey], (data) => {
      if (data[statusKey] === 'loading') {
        // This mode is currently generating (from storage, update local state too)
        loadingModes.add(selectedMode);
        loading.style.display = 'block';
        loading.textContent = `Generating (${selectedMode})... (you can close this popup)`;
        answerDiv.innerHTML = '';
        buttonRow.style.display = 'none';
      } else if (data[storageKey]) {
        // Show saved answer for this mode
        renderAnswer(data[storageKey], selectedMode);
      } else {
        // No saved answer for this mode, clear display
        answerDiv.innerHTML = '';
        buttonRow.style.display = 'none';
      }
    });
  });
});

// Initialize mode selector
initModeSelector();

// Clear button handler - clears current mode's answer
document.getElementById('clearBtn').addEventListener('click', async () => {
  const currentMode = await getMode();
  const storageKey = `lastAnswer_${currentMode}`;
  const statusKey = `processingStatus_${currentMode}`;

  // Remove from local loading state
  loadingModes.delete(currentMode);

  // Update UI immediately
  document.getElementById('answer').innerHTML = '';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('loading').textContent = 'Loading...';
  document.getElementById('buttonRow').style.display = 'none';

  // Clear storage for this mode
  await chrome.storage.local.remove([storageKey, statusKey, 'lastAnswerTime', 'pendingMode']);

  // Update mode selector
  updateModeUI(currentMode);
});

// Copy button handler - copies current mode's answer
document.getElementById('copyBtn').addEventListener('click', async () => {
  const currentMode = await getMode();
  const storageKey = `lastAnswer_${currentMode}`;
  const data = await chrome.storage.local.get({ [storageKey]: '' });
  if (data[storageKey]) {
    await navigator.clipboard.writeText(data[storageKey]);
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
  }
});

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const loading = document.getElementById('loading');
  const answerDiv = document.getElementById('answer');
  const buttonRow = document.getElementById('buttonRow');

  const currentMode = await getMode();
  loadingModes.add(currentMode); // Track that this mode is now loading

  loading.style.display = 'block';
  loading.textContent = 'Loading...';
  answerDiv.innerHTML = '';
  buttonRow.style.display = 'none';

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

    // Build prompt for current mode
    const prompt = buildPrompt(currentMode, data);
    console.log('Current mode:', currentMode, 'Prompt length:', prompt.length);

    const response = await chrome.runtime.sendMessage({
      type: 'GET_ADVICE',
      prompt,
      mode: currentMode
    });

    if (!response.ok) throw new Error(response.error || 'Failed to start processing');

    // Response says "processing: true" - background will save result to storage
    // The storage listener will render the answer when it's ready
    // Keep loading visible until result arrives
    loading.textContent = `Generating (${currentMode})... (you can close this popup)`;
  } catch (e) {
    console.error('Error:', e);
    answerDiv.innerHTML = `<span style="color: #dc2626;">Error: ${e.message || e}</span>`;
    loading.style.display = 'none';
    loadingModes.delete(currentMode); // Clear loading state on error
  }
});
