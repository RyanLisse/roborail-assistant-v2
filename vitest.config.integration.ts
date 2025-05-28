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
    // Also include shared setup for DeepEval if integration tests use it
    // If ./tests/integration/setup.ts already imports the shared one, this might be redundant
    // For now, let's add it explicitly ensuring it doesn't conflict.
    // Consider merging if ./tests/integration/setup.ts is simple or can import shared setup.
    // setupFiles: ['./tests/integration/setup.ts', './src/shared/testing/setup.ts'], 
    // To avoid potential double-execution if imported, let's assume for now that 
    // if DeepEval is needed in integration tests, the specific test files or a more specific
    // integration setup file will import what's necessary from './src/shared/testing/setup.ts'.
    // Alternatively, ensure ./tests/integration/setup.ts imports '../../src/shared/testing/setup.ts'.
    // For now, leaving as is, assuming integration tests will manage DeepEval init if needed.
    environment: 'node', // or 'jsdom' if testing browser-like env
    globals: true, // Expose test APIs globally
    testTimeout: 30000, // Increase timeout for potentially longer integration tests
  },
}); 