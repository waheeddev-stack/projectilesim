import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globalSetup: ['./tests/global-setup.js'],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
