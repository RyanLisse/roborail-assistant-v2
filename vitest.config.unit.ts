import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Configure glob patterns for unit test files
    include: ['**/*.test.ts'],
    // Exclude integration test files
    exclude: ['**/*.integration.test.ts', '**/node_modules/**', '**/dist/**'],
    // Other unit test specific configurations can go here
    // e.g., environment, setup files that are NOT needed for integration tests
    environment: 'node',
    globals: true, // Expose test APIs globally
  },
}); 