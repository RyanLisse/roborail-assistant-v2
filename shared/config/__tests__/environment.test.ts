import { describe, it, expect, vi, beforeEach } from 'vitest';
import { config, getConfig, getSecretValue, validateRequiredSecrets, getEnvironmentConfig } from '../environment';

// Mock encore.dev/config
vi.mock('encore.dev/config', () => ({
  secret: vi.fn((name: string) => {
    return vi.fn(() => {
      switch (name) {
        case 'NEON_DATABASE_URL':
          return 'postgresql://mock-neon-url';
        case 'COHERE_API_KEY':
          return 'mock-cohere-key';
        case 'GEMINI_API_KEY':
          return 'mock-gemini-key';
        case 'DEEPEVAL_API_KEY':
          return 'mock-deepeval-key';
        case 'UNSTRUCTURED_API_KEY':
          return 'mock-unstructured-key';
        case 'UNSTRUCTURED_API_URL':
          return 'https://api.unstructuredapp.io/general/v0/general';
        case 'REDIS_URL':
          return 'redis://localhost:6379';
        case 'OTEL_ENDPOINT':
          return 'http://localhost:4318';
        default:
          throw new Error(`Secret ${name} not found`);
      }
    });
  })
}));

describe('Environment Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset NODE_ENV for each test
    delete process.env.NODE_ENV;
  });

  describe('Config Structure', () => {
    it('should have all required configuration sections', () => {
      const cfg = getConfig();
      
      expect(cfg.database).toBeDefined();
      expect(cfg.ai).toBeDefined();
      expect(cfg.unstructured).toBeDefined();
      expect(cfg.cache).toBeDefined();
      expect(cfg.monitoring).toBeDefined();
      expect(cfg.app).toBeDefined();
    });

    it('should have all AI service configurations', () => {
      expect(config.ai.cohereApiKey).toBeDefined();
      expect(config.ai.geminiApiKey).toBeDefined();
      expect(config.ai.deepEvalApiKey).toBeDefined();
    });

    it('should have unstructured service configuration', () => {
      expect(config.unstructured.apiKey).toBeDefined();
      expect(config.unstructured.apiUrl).toBeDefined();
    });
  });

  describe('getSecretValue', () => {
    it('should return secret value when secret exists', async () => {
      const mockSecretFn = vi.fn(() => 'test-secret-value');
      
      const value = await getSecretValue(mockSecretFn, 'TEST_SECRET');
      
      expect(value).toBe('test-secret-value');
      expect(mockSecretFn).toHaveBeenCalledOnce();
    });

    it('should throw error with secret name when secret fails', async () => {
      const mockSecretFn = vi.fn(() => {
        throw new Error('Secret not found');
      });
      
      await expect(getSecretValue(mockSecretFn, 'MISSING_SECRET'))
        .rejects
        .toThrow("Failed to retrieve secret 'MISSING_SECRET': Error: Secret not found");
    });
  });

  describe('validateRequiredSecrets', () => {
    it('should pass validation when all required secrets are available', async () => {
      await expect(validateRequiredSecrets()).resolves.not.toThrow();
    });

    it('should throw error when required secrets are missing', async () => {
      // Mock one secret to fail
      vi.mocked(config.database.neonDbUrl).mockImplementation(() => {
        throw new Error('Secret not found');
      });
      
      await expect(validateRequiredSecrets())
        .rejects
        .toThrow('Configuration validation failed:\nMissing required secret: NEON_DATABASE_URL');
    });
  });

  describe('getEnvironmentConfig', () => {
    it('should return development config when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      
      const envConfig = getEnvironmentConfig();
      
      expect(envConfig.isDevelopment).toBe(true);
      expect(envConfig.isProduction).toBe(false);
      expect(envConfig.isTesting).toBe(false);
      expect(envConfig.defaults.cacheTimeout).toBe(60000); // 1 minute
      expect(envConfig.defaults.maxRetries).toBe(1);
    });

    it('should return production config when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      
      const envConfig = getEnvironmentConfig();
      
      expect(envConfig.isDevelopment).toBe(false);
      expect(envConfig.isProduction).toBe(true);
      expect(envConfig.isTesting).toBe(false);
      expect(envConfig.defaults.cacheTimeout).toBe(3600000); // 1 hour
      expect(envConfig.defaults.maxRetries).toBe(3);
    });

    it('should return test config when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      
      const envConfig = getEnvironmentConfig();
      
      expect(envConfig.isDevelopment).toBe(false);
      expect(envConfig.isProduction).toBe(false);
      expect(envConfig.isTesting).toBe(true);
    });

    it('should default to development when NODE_ENV is not set', () => {
      const envConfig = getEnvironmentConfig();
      
      expect(envConfig.isDevelopment).toBe(true);
      expect(envConfig.defaults.cacheTimeout).toBe(60000);
    });
  });

  describe('Application Settings', () => {
    it('should have correct default values', () => {
      expect(config.app.environment).toBe('development');
      expect(config.app.logLevel).toBe('info');
    });

    it('should use environment variables when available', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'warn';
      
      // Re-import to get updated values
      delete require.cache[require.resolve('../environment')];
      const { config: updatedConfig } = require('../environment');
      
      expect(updatedConfig.app.environment).toBe('production');
      expect(updatedConfig.app.logLevel).toBe('warn');
    });
  });
});