import { Redis } from "ioredis";
import { secret } from "encore.dev/config";

// Encore secrets for Redis configuration
const redisUrl = secret("REDIS_URL"); // e.g., "redis://localhost:6379" or "redis://:password@host:port"

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = redisUrl();
    if (!url) {
      console.warn("REDIS_URL secret not configured. Redis client will not be available.");
      throw new Error("Redis not configured");
    }
    
    try {
      redisClient = new Redis(url, {
        maxRetriesPerRequest: null,
        lazyConnect: true, // Connect on first command
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        // Add TLS configuration if needed for cloud Redis
        ...(url.includes('rediss://') && {
          tls: {
            rejectUnauthorized: false
          }
        })
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        // Don't nullify client immediately to allow retry logic
      });
      
      redisClient.on('connect', () => {
        console.log('Connected to Redis server');
      });
      
      redisClient.on('ready', () => {
        console.log('Redis client ready');
      });

      redisClient.on('close', () => {
        console.log('Redis connection closed');
      });

    } catch (e) {
      console.error("Failed to initialize Redis client:", e);
      throw e;
    }
  }
  return redisClient;
}

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

// Gracefully close Redis connection
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log("Redis connection closed gracefully.");
    } catch (error) {
      console.error("Error closing Redis connection:", error);
      // Force disconnect if graceful close fails
      redisClient.disconnect();
      redisClient = null;
    }
  }
}