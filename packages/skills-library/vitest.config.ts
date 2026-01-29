import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default: run unit tests only (exclude property tests)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.property.test.ts'
    ]
  }
});
