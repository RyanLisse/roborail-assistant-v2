import { getRedisClient } from "./redis.client";
import { getCacheConfig, validateCacheConfig, type CacheConfig } from "./config";
import { MetricsRecorder } from "../../monitoring/metrics";
import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number; // TTL in milliseconds for this entry
}

export class MultiLevelEmbeddingCache {
  private memoryCache = new Map<string, CacheEntry<number[]>>();
  private readonly config: CacheConfig;
  private redis: any; // Redis client or null if not available

  constructor(config?: Partial<CacheConfig>) {
    // Get default config and merge with provided options
    this.config = { ...getCacheConfig(), ...config };
    
    // Validate configuration
    validateCacheConfig(this.config);

    // Initialize Redis client with error handling
    try {
      this.redis = getRedisClient();
    } catch (error) {
      console.warn("Failed to initialize Redis for embedding cache. Falling back to L1 only:", error);
      this.redis = null;
    }
  }

  private generateKey(text: string): string {
    return `emb:${crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex')}`;
  }

  async get(textToEmbed: string): Promise<number[] | null> {
    const key = this.generateKey(textToEmbed);

    // L1: Memory cache
    const memoryHit = this.memoryCache.get(key);
    if (memoryHit && (Date.now() - memoryHit.timestamp < memoryHit.ttlMs)) {
      console.log("Embedding cache L1 hit", { key: key.substring(0, 20) + '...' });
      MetricsRecorder.recordCacheHit('L1', key);
      return memoryHit.data;
    }
    
    if (memoryHit) { // Expired from L1
      this.memoryCache.delete(key);
      console.log("Embedding cache L1 expired", { key: key.substring(0, 20) + '...' });
    }

    // L2: Redis cache (if available)
    if (this.redis) {
      try {
        const redisHit = await this.redis.get(key);
        if (redisHit) {
          console.log("Embedding cache L2 hit", { key: key.substring(0, 20) + '...' });
          MetricsRecorder.recordCacheHit('L2', key);
          const data = JSON.parse(redisHit) as number[];
          
          // Refresh L1 cache with data from L2
          this.updateMemoryCache(key, data, this.config.l1TtlSeconds * 1000);
          return data;
        }
      } catch (error) {
        console.error("Redis GET error for embedding cache", { key: key.substring(0, 20) + '...', error });
        // Proceed as if cache miss, do not block embedding generation
      }
    }
    
    console.log("Embedding cache miss (L1 & L2)", { key: key.substring(0, 20) + '...' });
    MetricsRecorder.recordCacheMiss(key);
    return null;
  }

  async set(textToEmbed: string, embeddings: number[]): Promise<void> {
    const key = this.generateKey(textToEmbed);
    const l1TtlMs = this.config.l1TtlSeconds * 1000;
    const l2TtlSeconds = this.config.l2TtlSeconds;

    // Update L1 cache
    this.updateMemoryCache(key, embeddings, l1TtlMs);

    // Update L2 cache (if available)
    if (this.redis) {
      try {
        await this.redis.setex(key, l2TtlSeconds, JSON.stringify(embeddings));
        console.log("Embedding stored in L2 cache", { 
          key: key.substring(0, 20) + '...', 
          ttlSeconds: l2TtlSeconds 
        });
      } catch (error) {
        console.error("Redis SETEX error for embedding cache", { 
          key: key.substring(0, 20) + '...', 
          error 
        });
        // Failure to write to cache should not fail the main operation
      }
    }
  }

  private updateMemoryCache(key: string, data: number[], ttlMs: number): void {
    // LRU eviction: if cache is full and this is a new key
    if (this.memoryCache.size >= this.config.l1CacheSize && !this.memoryCache.has(key)) {
      // Delete the oldest entry (first in iteration order)
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
        console.log("Embedding cache L1 evicted", { 
          evictedKey: firstKey.substring(0, 20) + '...', 
          newKey: key.substring(0, 20) + '...' 
        });
        MetricsRecorder.recordCacheEviction(firstKey, 'LRU_eviction');
      }
    }
    
    this.memoryCache.set(key, { data, timestamp: Date.now(), ttlMs });
    console.log("Embedding stored/updated in L1 cache", { 
      key: key.substring(0, 20) + '...', 
      ttlMs 
    });
  }

  // Cache management methods
  async clear(): Promise<void> {
    // Clear L1 cache
    this.memoryCache.clear();
    
    // Clear L2 cache (embedding keys only)
    if (this.redis) {
      try {
        const keys = await this.redis.keys('emb:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        console.log(`Cleared ${keys.length} embedding keys from L2 cache`);
      } catch (error) {
        console.error("Error clearing L2 cache:", error);
      }
    }
    
    console.log("Embedding cache cleared");
  }

  getMetrics(): {
    l1Size: number;
    l1MaxSize: number;
    l1HitRate?: number;
    redisAvailable: boolean;
    config: CacheConfig;
  } {
    return {
      l1Size: this.memoryCache.size,
      l1MaxSize: this.config.l1CacheSize,
      redisAvailable: this.redis !== null,
      config: this.config
    };
  }

  // Health check for the cache
  async healthCheck(): Promise<{
    l1: boolean;
    l2: boolean;
    overall: boolean;
  }> {
    const l1Healthy = true; // Memory cache is always available
    let l2Healthy = false;

    if (this.redis) {
      try {
        const pong = await this.redis.ping();
        l2Healthy = pong === 'PONG';
      } catch (error) {
        console.error("Redis health check failed:", error);
      }
    }

    return {
      l1: l1Healthy,
      l2: l2Healthy,
      overall: l1Healthy // Overall health depends on L1, L2 is optional
    };
  }
}