import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        // Service worker globals
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        // Node.js CJS globals (used in UMD guard in scoring.js)
        module: 'readonly',
        // Future scoring.js exports used in app.js
        analyzePrompt: 'readonly',
        labelForScore: 'readonly',
        summaryForScore: 'readonly',
        SCORING_CONFIG: 'readonly'
      }
    },
    rules: {
      'no-var': 'off',
      'prefer-const': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  }
];
