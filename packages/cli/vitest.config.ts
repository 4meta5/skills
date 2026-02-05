import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: [
      './src/test/setup.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**'
    ],
    // Run tests sequentially to avoid race conditions with shared config file
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});
