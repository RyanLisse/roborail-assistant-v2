export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.PLAYWRIGHT || process.env.CI_PLAYWRIGHT
);

// Backend API configuration
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Feature flags for RAG integration
export const USE_BACKEND_RAG = process.env.NEXT_PUBLIC_USE_BACKEND_RAG === "true" || !isProductionEnvironment;
export const USE_BACKEND_UPLOAD = process.env.NEXT_PUBLIC_USE_BACKEND_UPLOAD === "true" || !isProductionEnvironment;
