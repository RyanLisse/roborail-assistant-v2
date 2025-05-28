import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./lib/testing/setup.ts"],
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "encore.gen/",
        "**/*.test.ts",
        "**/*.test.js",
        "coverage/",
        "dist/",
      ],
    },
    // Include environment variables for testing
    env: {
      NODE_ENV: "test",
    },
  },
});
