// Cache configuration settings for the embedding cache system

export interface CacheConfig {
  // L1 Memory Cache Settings
  l1CacheSize: number;           // Maximum number of entries in memory cache
  l1TtlSeconds: number;          // TTL for memory cache entries (seconds)
  
  // L2 Redis Cache Settings  
  l2TtlSeconds: number;          // TTL for Redis cache entries (seconds)
  
  // Redis Connection Settings
  redisUrl?: string;             // Redis connection URL (from secrets)
  redisMaxRetries: number;       // Maximum retry attempts for Redis operations
  redisRetryDelay: number;       // Delay between retry attempts (ms)
}

// Default cache configuration
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  // L1 Memory Cache (5 minutes, 1000 entries = ~10MB assuming 10KB per embedding)
  l1CacheSize: parseInt(process.env.EMBEDDING_CACHE_L1_SIZE || "1000", 10),
  l1TtlSeconds: parseInt(process.env.EMBEDDING_CACHE_L1_TTL_SECONDS || "300", 10),
  
  // L2 Redis Cache (24 hours)
  l2TtlSeconds: parseInt(process.env.EMBEDDING_CACHE_L2_TTL_SECONDS || "86400", 10),
  
  // Redis Connection
  redisMaxRetries: parseInt(process.env.REDIS_MAX_RETRIES || "3", 10),
  redisRetryDelay: parseInt(process.env.REDIS_RETRY_DELAY || "100", 10),
};

// Environment-specific configurations
export const CACHE_CONFIGS = {
  development: {
    ...DEFAULT_CACHE_CONFIG,
    l1CacheSize: 100,              // Smaller cache for dev
    l1TtlSeconds: 60,              // Shorter TTL for dev (1 minute)
    l2TtlSeconds: 3600,            // 1 hour in dev
  },
  
  test: {
    ...DEFAULT_CACHE_CONFIG,
    l1CacheSize: 10,               // Very small cache for tests
    l1TtlSeconds: 5,               // Very short TTL for tests
    l2TtlSeconds: 10,              // Very short TTL for tests
  },
  
  production: {
    ...DEFAULT_CACHE_CONFIG,
    l1CacheSize: 2000,             // Larger cache for production
    l1TtlSeconds: 600,             // 10 minutes in production
    l2TtlSeconds: 86400 * 7,       // 1 week in production
  },
};

// Get configuration based on environment
export function getCacheConfig(): CacheConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'test':
      return CACHE_CONFIGS.test;
    case 'production':
      return CACHE_CONFIGS.production;
    case 'development':
    default:
      return CACHE_CONFIGS.development;
  }
}

// Validate cache configuration
export function validateCacheConfig(config: CacheConfig): void {
  if (config.l1CacheSize < 1) {
    throw new Error('L1 cache size must be at least 1');
  }
  
  if (config.l1TtlSeconds < 1) {
    throw new Error('L1 TTL must be at least 1 second');
  }
  
  if (config.l2TtlSeconds < 1) {
    throw new Error('L2 TTL must be at least 1 second');
  }
  
  if (config.redisMaxRetries < 0) {
    throw new Error('Redis max retries cannot be negative');
  }
  
  if (config.redisRetryDelay < 0) {
    throw new Error('Redis retry delay cannot be negative');
  }
}

// Cache performance metrics thresholds
export const CACHE_METRICS = {
  // Cache hit rate thresholds
  GOOD_HIT_RATE: 0.8,           // 80% hit rate is good
  ACCEPTABLE_HIT_RATE: 0.6,     // 60% hit rate is acceptable
  
  // Cache size warning thresholds  
  L1_SIZE_WARNING: 0.9,         // Warn when L1 cache is 90% full
  L1_SIZE_CRITICAL: 0.95,       // Critical when L1 cache is 95% full
  
  // Response time thresholds (milliseconds)
  L1_RESPONSE_TIME_WARNING: 5,  // Warn if L1 cache takes > 5ms
  L2_RESPONSE_TIME_WARNING: 100, // Warn if L2 cache takes > 100ms
};

// Documentation for environment variables
export const ENV_VAR_DOCS = {
  EMBEDDING_CACHE_L1_SIZE: {
    description: "Maximum number of embeddings to store in L1 memory cache",
    default: "1000",
    example: "2000",
  },
  EMBEDDING_CACHE_L1_TTL_SECONDS: {
    description: "Time-to-live for L1 memory cache entries in seconds",
    default: "300",
    example: "600",
  },
  EMBEDDING_CACHE_L2_TTL_SECONDS: {
    description: "Time-to-live for L2 Redis cache entries in seconds", 
    default: "86400",
    example: "604800",
  },
  REDIS_URL: {
    description: "Redis connection URL (required for L2 cache)",
    default: "none",
    example: "redis://localhost:6379",
    required: false,
  },
  REDIS_MAX_RETRIES: {
    description: "Maximum retry attempts for Redis operations",
    default: "3",
    example: "5",
  },
  REDIS_RETRY_DELAY: {
    description: "Delay between Redis retry attempts in milliseconds",
    default: "100", 
    example: "200",
  },
};