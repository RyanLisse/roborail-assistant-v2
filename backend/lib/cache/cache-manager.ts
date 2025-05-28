import Redis from "ioredis";
import type {
  CacheConfig,
  CacheConnectionError,
  CacheError,
  CacheHealth,
  CacheMetrics,
  CacheSerializationError,
} from "./types";

// In-memory cache implementation using Map with LRU eviction
class LRUCache<T = any> {
  private cache = new Map<
    string,
    { value: T; timestamp: number; lastAccessed: number; ttl: number }
  >();
  private readonly maxSize: number;
  private readonly defaultTtl: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.defaultTtl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL (entry.ttl is in seconds, convert to milliseconds)
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, customTTL?: number): void {
    const now = Date.now();
    const ttl = customTTL !== undefined ? customTTL : this.defaultTtl / 1000; // Convert default to seconds

    // If at capacity, remove least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      lastAccessed: now,
      ttl: ttl,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getMetrics() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Number.MAX_SAFE_INTEGER;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }
}

export class CacheManager {
  private l1Cache: LRUCache;
  private l2Cache: Redis | null = null;
  private config: CacheConfig;
  private l2Hits = 0;
  private l2Misses = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: CacheConfig) {
    this.config = config;
    this.l1Cache = new LRUCache(config.l1Cache.maxSize, config.l1Cache.ttl);

    // Initialize Redis connection
    this.initializeRedis();

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.l1Cache.cleanup();
    }, 60000); // Clean up every minute
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.l2Cache = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db,
        connectTimeout: this.config.redis.connectTimeout,
        commandTimeout: this.config.redis.commandTimeout,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });

      this.l2Cache.on("error", (error) => {
        console.error("Redis connection error:", error);
      });

      this.l2Cache.on("connect", () => {
        console.log("Redis connected successfully");
      });
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      // Continue without Redis - degrade gracefully
      this.l2Cache = null;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Try L1 cache first
      const l1Result = this.l1Cache.get(key);
      if (l1Result !== null) {
        return l1Result as T;
      }

      // Try L2 cache (Redis) if L1 miss
      if (this.l2Cache && this.l2Cache.status === "ready") {
        try {
          const l2Result = await this.l2Cache.get(this.formatKey(key));
          if (l2Result) {
            this.l2Hits++;
            const parsed = JSON.parse(l2Result) as T;
            // Populate L1 cache for next time
            this.l1Cache.set(key, parsed);
            return parsed;
          } else {
            this.l2Misses++;
          }
        } catch (redisError) {
          console.warn("Redis get error, falling back:", redisError);
          this.l2Misses++;
        }
      }

      return null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      // Test serialization first to catch circular references
      const serialized = JSON.stringify(value);

      // Set in L1 cache
      this.l1Cache.set(key, value, ttl);

      // Set in L2 cache (Redis) if available
      if (this.l2Cache && this.l2Cache.status === "ready") {
        try {
          const cacheTTL = ttl || this.config.l2Cache.ttl / 1000; // Convert to seconds
          await this.l2Cache.set(this.formatKey(key), serialized, "EX", cacheTTL);
        } catch (redisError) {
          console.warn("Redis set error:", redisError);
          // Continue - L1 cache is still available
        }
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("circular")) {
        throw new Error("Cannot cache circular references");
      }
      console.error("Cache set error:", error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // Delete from L1 cache
      this.l1Cache.delete(key);

      // Delete from L2 cache (Redis) if available
      if (this.l2Cache && this.l2Cache.status === "ready") {
        try {
          await this.l2Cache.del(this.formatKey(key));
        } catch (redisError) {
          console.warn("Redis delete error:", redisError);
        }
      }
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear L1 cache
      this.l1Cache.clear();

      // Clear L2 cache is not implemented to avoid accidental data loss
      // Individual key deletion should be used instead
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  async getMetrics(): Promise<CacheMetrics> {
    const l1Metrics = this.l1Cache.getMetrics();
    const l2Total = this.l2Hits + this.l2Misses;

    return {
      l1Cache: l1Metrics,
      l2Cache: {
        hits: this.l2Hits,
        misses: this.l2Misses,
        hitRate: l2Total > 0 ? this.l2Hits / l2Total : 0,
        size: await this.getRedisSize(),
      },
    };
  }

  async healthCheck(): Promise<CacheHealth> {
    const l1Metrics = this.l1Cache.getMetrics();

    let l2Status: "healthy" | "degraded" | "down" = "down";
    let l2Connected = false;
    let l2ResponseTime: number | undefined;

    if (this.l2Cache) {
      const startTime = Date.now();
      try {
        await this.l2Cache.ping();
        l2ResponseTime = Date.now() - startTime;
        l2Status = l2ResponseTime < 100 ? "healthy" : "degraded";
        l2Connected = true;
      } catch (error) {
        l2Status = "down";
        l2Connected = false;
      }
    }

    return {
      l1Cache: {
        status: "healthy",
        size: l1Metrics.size,
        memoryUsage: this.estimateL1MemoryUsage(),
      },
      l2Cache: {
        status: l2Status,
        connected: l2Connected,
        responseTime: l2ResponseTime,
      },
    };
  }

  async disconnect(): Promise<void> {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      if (this.l2Cache) {
        await this.l2Cache.disconnect();
        this.l2Cache = null;
      }
    } catch (error) {
      console.error("Cache disconnect error:", error);
    }
  }

  private formatKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private async getRedisSize(): Promise<number> {
    try {
      if (this.l2Cache && this.l2Cache.status === "ready") {
        const info = await this.l2Cache.info("keyspace");
        const dbMatch = info.match(/db\d+:keys=(\d+)/);
        return dbMatch ? Number.parseInt(dbMatch[1], 10) : 0;
      }
    } catch (error) {
      console.warn("Failed to get Redis size:", error);
    }
    return 0;
  }

  private estimateL1MemoryUsage(): number {
    // Very rough estimation - in a real implementation you'd want more precise measurement
    return this.l1Cache.size() * 1024; // Assume 1KB per entry on average
  }
}
