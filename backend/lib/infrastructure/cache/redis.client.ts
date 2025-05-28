import type { Redis } from "ioredis";
// TODO: Redis secrets can only be used within services, not shared lib code
// import { secret } from "encore.dev/config";

// Temporarily disabled - Redis functionality needs to be moved to a service
// const redisUrl = secret("REDIS_URL"); // e.g., "redis://localhost:6379" or "redis://:password@host:port"

const redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  // TODO: Redis functionality temporarily disabled - needs to be moved to a service
  throw new Error(
    "Redis functionality temporarily disabled - secrets can only be used within services"
  );
}

// Test Redis connection - temporarily disabled
export async function testRedisConnection(): Promise<boolean> {
  console.warn("Redis functionality temporarily disabled");
  return false;
}

// Gracefully close Redis connection - temporarily disabled
export async function closeRedisConnection(): Promise<void> {
  console.warn("Redis functionality temporarily disabled");
}
