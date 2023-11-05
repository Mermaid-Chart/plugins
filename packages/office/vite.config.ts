import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import { configDefaults } from 'vitest/config';

const config: UserConfig = {
  plugins: [sveltekit()],
  define: {
    // Eliminate in-source test code
    'import.meta.vitest': 'undefined'
  },
  server: {
    port: 3000,
    strictPort: false
  },
  preview: {
    port: 3000,
    strictPort: false
  },
  resolve: { 
    alias: { 
      buffer: "buffer/" 
    } 
  },
  test: {
    // jest like globals
    globals: true,
    environment: 'jsdom',
    // in-source testing
    includeSource: ['src/**/*.{js,ts,svelte}'],
    include: ['**/*.spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Add @testing-library/jest-dom matchers
    setupFiles: ['./setupTest.ts'],
    // Exclude files in c8
    coverage: {
      exclude: ['setupTest.ts', 'src/mocks']
    },
    deps: {
      // Put Svelte component here, e.g., inline: [/svelte-multiselect/]
      // inline: []
    },
    // Exclude playwright tests folder
    exclude: [...configDefaults.exclude, 'tests']
  }
};

export default config;
