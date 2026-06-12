// shared/selectors.js
// Single source of truth for LeetCode DOM selectors.
// Loaded as <script> in popup, added to manifest content_scripts before content.js.

const LC_SELECTORS = {
  title: [
    '[data-cy="question-title"]',
    '.question-title h3'
  ],
  code: '.view-lines',
  codeEditor: '.monaco-editor',
  result: [
    '[data-cy="run-result-fail"]',
    '[data-cy="run-result-success"]',
    '.success__3Ai7, .error__2a1B'
  ]
};
