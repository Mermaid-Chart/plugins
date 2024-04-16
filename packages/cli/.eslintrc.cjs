module.exports = /** @type {import("eslint").Linter.Config} */ ({
  root: false, // mono-repo
  parser: '@typescript-eslint/parser',
  ignorePatterns: ['*.cjs'],
  parserOptions: {
    ecmaVersion: 2022, // support node v18 features
    allowAutomaticSingleRunInference: true,
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    parser: '@typescript-eslint/parser',
  },
  rules: {
    "no-console": ["warn"], // TODO: fix all of these
  }
});
