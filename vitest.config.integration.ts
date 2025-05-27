import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Configure glob patterns for integration test files
    include: ['**/*.integration.test.ts'],
    // Exclude unit test files and other irrelevant files
    exclude: ['**/*.test.ts', '**/node_modules/**', '**/dist/**'],
    // Integration test specific configurations
    // e.g., setup files that initialize a test database or external services
    setupFiles: ['./tests/integration/setup.ts'], // Example setup file path
    environment: 'node', // or 'jsdom' if testing browser-like env
    globals: true, // Expose test APIs globally
    testTimeout: 30000, // Increase timeout for potentially longer integration tests
  },
}); 