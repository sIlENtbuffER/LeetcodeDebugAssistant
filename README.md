# LeetCode Debug Assistant

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-install-green)](https://chromewebstore.google.com/detail/leetcode-debug-assistant/mmmgmbbdbaikhbikcnokhijnkcckddpe)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A Chrome extension that uses AI to help debug failed LeetCode solutions. Get intelligent suggestions and explanations when your code doesn't pass all test cases.

## Features

- **Three response modes**: Choose between **Debug** (root cause + fix), **Hint** (progressive 5-level reveal, default), and **Interview** (FAANG-style coaching)
- **Progressive hint system**: Hint mode reveals one clue at a time — from a subtle nudge to the full solution — with "Show next hint" buttons and progress dots
- **Multiple AI providers**: Support for OpenAI, Anthropic (Claude), Google Gemini, and custom OpenAI-compatible endpoints
- **Syntax highlighting**: Code blocks in AI responses are highlighted with highlight.js
- **LaTeX math rendering**: Formulas like `O(n log n)` render beautifully via KaTeX
- **One-click copy**: Copy buttons appear on hover for every code block in responses
- **Dark mode**: System/light/dark theme toggle that syncs across popup and settings
- **Smart extraction**: Automatically extracts your code, problem title, and test results from the page
- **Answer persistence**: Close the popup during generation — answers are saved per-mode and restored when you reopen
- **Test Connection**: Verify your API credentials from the settings page before saving
- **Local-first**: API keys stored locally on your device, no third-party tracking

## Installation for Users

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/leetcode-debug-assistant/mmmgmbbdbaikhbikcnokhijnkcckddpe)

## Contributing

We welcome contributions! Here are some ways you can help:

- **Bug reports**: Submit issues for any bugs you find
- **Feature requests**: Suggest new features or AI providers
- **Code contributions**: Fix bugs, add features, or improve documentation
- **Testing**: Test the extension across different LeetCode problems and browsers

See [Development](#development) below to get started.

---

## Development

### Prerequisites

- Node.js and npm (for Tailwind CSS build)
- Chrome or Chromium-based browser

### Getting Started

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/LeetcodeDebugAssistant.git
   cd LeetcodeDebugAssistant
   npm install
   ```

2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the project directory

### Making Changes

1. **JavaScript/HTML changes**: Edit files directly and refresh the extension in `chrome://extensions/`

2. **Style changes**: The popup uses Tailwind CSS. Rebuild styles after modifying HTML:
   ```bash
   npx tailwindcss -i ./popup/tw.css -o ./popup/popup.css --minify
   ```

3. **Testing your changes**:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension card
   - Test on a LeetCode problem page

### Code Style

- Use 2 spaces for indentation
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions focused and modular

### Submitting Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes and commit with a clear message
3. Push to your fork: `git push origin feature/your-feature-name`
4. Open a pull request with a description of your changes

### Project Structure

```
LeetcodeDebugAssistant/
├── manifest.json       # Chrome extension manifest (MV3)
├── background.js       # Service worker for AI API calls
├── content.js          # Content script for data extraction
├── theme.js            # Shared theme utility (dark mode toggle)
├── tailwind.config.js  # Tailwind CSS configuration
├── popup/
│   ├── popup.html      # Popup UI
│   ├── popup.js        # Popup logic (3 response modes, hint reveal)
│   ├── popup.css       # Compiled Tailwind styles
│   ├── tw.css          # Tailwind source
│   ├── marked.min.js   # Markdown renderer (vendored)
│   ├── highlight.min.js       # Syntax highlighter (vendored)
│   ├── highlight-js/
│   │   └── github-dark.min.css # highlight.js theme (vendored)
│   ├── katex.min.js           # LaTeX math renderer (vendored)
│   ├── auto-render.min.js     # KaTeX auto-render (vendored)
│   └── katex/
│       └── katex.min.css      # KaTeX styles
├── options/
│   ├── options.html    # Settings page
│   └── options.js      # Settings logic
├── shared/
│   ├── providers.js    # Single-source provider metadata (names, endpoints, defaults)
│   └── selectors.js    # Single-source LeetCode DOM selectors
├── icon/               # Extension icons (16/48/128px)
├── PRIVACY.md          # Privacy policy
└── README.md           # This file
```

### Architecture Overview

```
popup.js ──GET_DATA──> content.js ──{title, code, result}──> popup.js
                                                              │
                                                              ▼
popup.js ──GET_ADVICE (prompt, mode)──> background.js ──{ok, processing: true}
                                                              │
                                              background.js writes to chrome.storage
                                                              │
popup.js <──chrome.storage.onChanged───lastAnswer_${mode}─────┘
```

The architecture is asynchronous: the background service worker returns immediately, then writes results to `chrome.storage.local` with per-mode keys. The popup listens for storage changes to render results — this allows the popup to be closed and reopened while generation is in progress.

## Roadmap

Potential future improvements:

- [ ] Support for more AI providers
- [ ] Conversational chat mode (follow-up questions within a session)
- [ ] Keyboard shortcuts for common actions
- [ ] Support for more coding platforms (Codeforces, AtCoder, etc.)
- [x] ~~Dark mode for the popup~~ — implemented with system/light/dark toggle

## Usage for Users

1. Navigate to any LeetCode problem (leetcode.com or leetcode.cn)
2. Write and run your solution (use the "Run" button to get test results)
3. Click the LeetCode Debug Assistant extension icon
4. Choose a response mode using the tab selector at the top:
   - **Hint** (default): Progressive clues revealed one at a time. Click "Show next hint" to advance from a subtle nudge through the full solution.
   - **Debug**: Identifies the root cause, shows a minimal fix, and provides corrected code.
   - **Interview**: FAANG-style coaching with problem classification, brute-force analysis, optimized approach, trade-off discussion, and follow-up questions.
5. Click the action button to generate a response

Answers are saved per-mode — switch between modes without losing previous results.

### Setting Up Your AI Provider

1. Click the extension icon, then click **Settings**
2. Choose your preferred AI provider from the dropdown:
   - **OpenAI**: Requires API key from [platform.openai.com](https://platform.openai.com)
   - **Anthropic**: Requires API key from [console.anthropic.com](https://console.anthropic.com)
   - **Google**: Requires API key from [makersuite.google.com](https://makersuite.google.com)
   - **Custom**: Use any OpenAI-compatible endpoint

3. Enter your API key and configure optional settings:
   - **Endpoint**: API endpoint URL (pre-filled for default providers)
   - **Model**: Model name (e.g., `gpt-4o-mini`, `claude-3-5-sonnet-20241022`)
   - **Temperature**: Controls response randomness (0.0 - 2.0)

4. Click **Test Connection** to verify your credentials work before saving
5. Click **Save**

## Privacy

Your data stays on your device. API keys are stored locally using Chrome storage. Code and test results are only shared with your chosen AI provider. See [PRIVACY.md](PRIVACY.md) for details.

## License

MIT License - feel free to use and modify for your own needs.

## Support

For questions or issues:
- Open an issue on GitHub
- Email: huangxiyan2311@gmail.com
