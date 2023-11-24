import { configDefaults, defineConfig } from 'vitest/config'

/** only run unit tests, no e2e tests */
export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      "**/*.e2e.test.ts",
    ],
  },
});
