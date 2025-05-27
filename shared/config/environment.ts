import { secret } from "encore.dev/config";

/**
 * Centralized environment configuration for the RAG Chat Application
 * 
 * This module provides access to all external service API keys and configuration
 * using Encore's secret management system. All secrets should be set using:
 * 
 * Local: encore secret set --type=local SECRET_NAME
 * Dev: encore secret set --type=dev SECRET_NAME  
 * Prod: encore secret set --type=prod SECRET_NAME
 */

export const config = {
  // Database Configuration
  database: {
    neonDbUrl: secret("NEON_DATABASE_URL"),
  },

  // AI Services
  ai: {
    cohereApiKey: secret("COHERE_API_KEY"), 
    geminiApiKey: secret("GEMINI_API_KEY"),
    deepEvalApiKey: secret("DEEPEVAL_API_KEY"),
  },

  // Document Processing
  unstructured: {
    apiKey: secret("UNSTRUCTURED_API_KEY"),
    apiUrl: secret("UNSTRUCTURED_API_URL"), // e.g., 'https://api.unstructuredapp.io/general/v0/general'
  },

  // Cache and Storage
  cache: {
    redisUrl: secret("REDIS_URL"),
  },

  // Monitoring and Observability
  monitoring: {
    otelEndpoint: secret("OTEL_ENDPOINT"), // For Mastra telemetry, e.g. "http://localhost:4318"
  },

  // Application Settings
  app: {
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  }
};

/**
 * Type-safe access to configuration values
 * Usage: const apiKey = await getConfig().ai.cohereApiKey();
 */
export function getConfig() {
  return config;
}

/**
 * Utility to safely get secret values with error handling
 */
export async function getSecretValue(secretFn: () => string, secretName: string): Promise<string> {
  try {
    return secretFn();
  } catch (error) {
    throw new Error(`Failed to retrieve secret '${secretName}': ${error}`);
  }
}

/**
 * Validate that all required secrets are available
 * Call this during service initialization to fail fast
 */
export async function validateRequiredSecrets(): Promise<void> {
  const requiredSecrets = [
    { name: 'NEON_DATABASE_URL', fn: config.database.neonDbUrl },
    { name: 'COHERE_API_KEY', fn: config.ai.cohereApiKey },
    { name: 'GEMINI_API_KEY', fn: config.ai.geminiApiKey },
  ];

  const errors: string[] = [];

  for (const { name, fn } of requiredSecrets) {
    try {
      await getSecretValue(fn, name);
    } catch (error) {
      errors.push(`Missing required secret: ${name}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const env = config.app.environment;
  
  return {
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isTesting: env === 'test',
    
    // Environment-specific defaults
    defaults: {
      cacheTimeout: env === 'production' ? 3600000 : 60000, // 1 hour prod, 1 min dev
      maxRetries: env === 'production' ? 3 : 1,
      logLevel: env === 'production' ? 'warn' : 'debug',
    }
  };
}

export default config;