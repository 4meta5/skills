import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Property tests only
    include: ['**/*.property.test.ts'],
    // Longer timeout for property tests
    testTimeout: 30000,
    // Fewer concurrent tests to avoid resource contention
    maxConcurrency: 2
  }
});
