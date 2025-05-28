import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CacheManager } from "./cache-manager";
import type { CacheConfig } from "./types";

describe("CacheManager", () => {
  let cacheManager: CacheManager;
  let mockConfig: CacheConfig;

  beforeEach(() => {
    mockConfig = {
      redis: {
        host: "localhost",
        port: 6379,
        password: undefined,
        db: 0,
        connectTimeout: 1000,
        commandTimeout: 1000,
      },
      l1Cache: {
        maxSize: 100,
        ttl: 5000, // 5 seconds for testing
      },
      l2Cache: {
        ttl: 10000, // 10 seconds for testing
      },
      keyPrefix: "test:",
    };

    cacheManager = new CacheManager(mockConfig);
  });

  afterEach(async () => {
    await cacheManager.disconnect();
  });

  describe("L1 Cache functionality", () => {
    it("should store and retrieve values from L1 cache", async () => {
      const key = "test-key";
      const value = { data: "test-value", number: 42 };

      await cacheManager.set(key, value, 10);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it("should return null for non-existent key", async () => {
      const result = await cacheManager.get("non-existent");
      expect(result).toBeNull();
    });

    it("should handle different data types", async () => {
      const testCases = [
        { key: "string", value: "hello world" },
        { key: "number", value: 12345 },
        { key: "array", value: [1, 2, 3, "test"] },
        { key: "object", value: { nested: { prop: "value" }, array: [1, 2] } },
        { key: "boolean", value: true },
      ];

      for (const testCase of testCases) {
        await cacheManager.set(testCase.key, testCase.value, 10);
        const result = await cacheManager.get(testCase.key);
        expect(result).toEqual(testCase.value);
      }
    });

    it("should delete values from cache", async () => {
      const key = "test-delete";
      const value = { data: "to-be-deleted" };

      await cacheManager.set(key, value, 10);
      expect(await cacheManager.get(key)).toEqual(value);

      await cacheManager.delete(key);
      expect(await cacheManager.get(key)).toBeNull();
    });

    it("should clear all values from L1 cache", async () => {
      await cacheManager.set("key1", "value1", 10);
      await cacheManager.set("key2", "value2", 10);

      expect(await cacheManager.get("key1")).toBe("value1");
      expect(await cacheManager.get("key2")).toBe("value2");

      await cacheManager.clear();

      expect(await cacheManager.get("key1")).toBeNull();
      expect(await cacheManager.get("key2")).toBeNull();
    });

    it("should respect LRU eviction when cache is full", async () => {
      // Fill cache to capacity
      for (let i = 0; i < mockConfig.l1Cache.maxSize; i++) {
        await cacheManager.set(`key${i}`, `value${i}`, 600); // Longer TTL to avoid expiration
      }

      // Access the first few keys to make them recently used
      await cacheManager.get("key0");
      await cacheManager.get("key1");

      // Add one more item to trigger eviction
      await cacheManager.set("newKey", "newValue", 600);

      // Some recently used keys should still be there
      expect(await cacheManager.get("key0")).toBe("value0");
      expect(await cacheManager.get("newKey")).toBe("newValue");

      // At least some keys should have been evicted (cache size should be at max)
      const metrics = await cacheManager.getMetrics();
      expect(metrics.l1Cache.size).toBeLessThanOrEqual(mockConfig.l1Cache.maxSize);
    });

    it("should handle TTL expiration", async () => {
      const key = "expiring-key";
      const value = { data: "expires-soon" };

      await cacheManager.set(key, value, 1); // 1 second TTL
      expect(await cacheManager.get(key)).toEqual(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(await cacheManager.get(key)).toBeNull();
    });
  });

  describe("metrics and monitoring", () => {
    it("should track cache hits and misses", async () => {
      // Generate some hits and misses
      await cacheManager.set("hit-key", "hit-value", 60);

      await cacheManager.get("hit-key"); // hit
      await cacheManager.get("hit-key"); // hit
      await cacheManager.get("miss-key"); // miss
      await cacheManager.get("miss-key"); // miss

      const metrics = await cacheManager.getMetrics();

      expect(metrics.l1Cache.hits).toBeGreaterThan(0);
      expect(metrics.l1Cache.misses).toBeGreaterThan(0);
      expect(metrics.l1Cache.hitRate).toBeGreaterThan(0);
      expect(metrics.l1Cache.hitRate).toBeLessThanOrEqual(1);
    });

    it("should provide health check information", async () => {
      const health = await cacheManager.healthCheck();

      expect(health).toHaveProperty("l1Cache");
      expect(health).toHaveProperty("l2Cache");
      expect(health.l1Cache.status).toBe("healthy");
      expect(typeof health.l1Cache.size).toBe("number");
      expect(typeof health.l1Cache.memoryUsage).toBe("number");
    });
  });

  describe("error handling", () => {
    it("should handle circular reference serialization errors", async () => {
      const circular: any = { prop: "value" };
      circular.self = circular; // Create circular reference

      await expect(cacheManager.set("circular", circular, 60)).rejects.toThrow();
    });

    it("should gracefully handle Redis connection failures", async () => {
      // Since Redis might not be available in test environment,
      // the cache manager should still work with L1 cache only
      const key = "redis-test";
      const value = { data: "redis-test-value" };

      await cacheManager.set(key, value, 60);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });
  });
});
