// shared/providers.js
// Single source of truth for provider metadata.
// Loaded as <script> in popup/options, via importScripts() in background.
// Provider-specific logic (formatRequest) stays in background.js.

const PROVIDER_META = {
  openai: {
    name: 'OpenAI',
    displayName: 'OpenAI',
    desc: 'ChatGPT and GPT models',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsEndpoint: true,
    modelHint: 'e.g., gpt-4o-mini, gpt-4o, o1'
  },
  anthropic: {
    name: 'Anthropic',
    displayName: 'Claude',
    desc: 'Claude models',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    needsEndpoint: false,
    modelHint: 'e.g., claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022'
  },
  google: {
    name: 'Google Gemini',
    displayName: 'Gemini',
    desc: 'Gemini models',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash-exp',
    needsEndpoint: true,
    modelHint: 'e.g., gemini-2.0-flash-exp, gemini-1.5-pro'
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    displayName: 'Custom',
    desc: 'OpenAI-compatible API',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsEndpoint: true,
    modelHint: 'Any chat-completions model'
  }
};
