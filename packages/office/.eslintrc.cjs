module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:json/recommended',
    'plugin:@cspell/recommended',
    'plugin:unicorn/recommended',
    'plugin:markdown/recommended',
    'plugin:svelte/recommended',
    'plugin:svelte/prettier',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'no-only-tests', 'html', 'jest', 'json', '@cspell', 'unicorn'],
  ignorePatterns: ['*.cjs'],
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 2020,
    allowAutomaticSingleRunInference: true,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
    extraFileExtensions: ['.svelte'],
    parser: '@typescript-eslint/parser'
  },
  settings: {
    'svelte3/typescript': () => require('typescript')
  },
  rules: {
    curly: 'error',
    'no-console': 'error',
    'no-var': 'error',
    'unicorn/filename-case': [
      'error',
      {
        case: 'camelCase'
      }
    ],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': 'allow-with-description',
        'ts-nocheck': 'allow-with-description',
        'ts-check': 'allow-with-description',
        minimumDescriptionLength: 10
      }
    ],
    'json/*': ['error', 'allowComments'],
    '@cspell/spellchecker': [
      'error',
      {
        checkIdentifiers: false,
        checkStrings: false,
        checkStringTemplates: false
      }
    ],
    'no-empty': [
      'error',
      {
        allowEmptyCatch: true
      }
    ],
    'unicorn/template-indent': 'off',
    'unicorn/no-typeof-undefined': 'error',
    'unicorn/prefer-top-level-await': 'off',
    'unicorn/prevent-abbreviations': [
      'off',
      {
        allowList: {
          err: true,
          req: true,
          ctx: true,
          res: true,
          env: true,
          refs: true,
          doc: true,
          db: true,
          Refs: true,
          ImportMetaEnv: true
        }
      }
    ],
    'unicorn/filename-case': 'off'
  },
  env: {
    browser: true,
    es2017: true,
    node: true
  }
};
