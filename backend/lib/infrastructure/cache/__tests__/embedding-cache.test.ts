import { beforeEach, describe, expect, test, vi } from "vitest";
import { MultiLevelEmbeddingCache } from "../embedding-cache";

// Mock Redis client
const mockRedisClient = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  ping: vi.fn().mockResolvedValue("PONG"),
};

vi.mock("../redis.client", () => ({
  getRedisClient: vi.fn(() => mockRedisClient),
}));

describe("MultiLevelEmbeddingCache", () => {
  let cache: MultiLevelEmbeddingCache;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new MultiLevelEmbeddingCache({
      memoryCacheSize: 3, // Small size for testing eviction
      defaultL1TTLSeconds: 5,
      defaultL2TTLSeconds: 10,
    });
  });

  describe("L1 Memory Cache", () => {
    test("should store and retrieve from L1 cache", async () => {
      const text = "test embedding text";
      const embeddings = [0.1, 0.2, 0.3];

      await cache.set(text, embeddings);
      const result = await cache.get(text);

      expect(result).toEqual(embeddings);
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    test("should handle L1 cache expiration", async () => {
      // Create cache with very short TTL
      const shortCache = new MultiLevelEmbeddingCache({
        memoryCacheSize: 10,
        defaultL1TTLSeconds: 0.001, // 1ms
        defaultL2TTLSeconds: 10,
      });

      const text = "test text";
      const embeddings = [0.1, 0.2, 0.3];

      await shortCache.set(text, embeddings);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not return expired data from L1
      mockRedisClient.get.mockResolvedValueOnce(null);
      const result = await shortCache.get(text);

      expect(result).toBeNull();
    });

    test("should implement LRU eviction", async () => {
      const embeddings = [0.1, 0.2, 0.3];

      // Fill cache to capacity
      await cache.set("text1", embeddings);
      await cache.set("text2", embeddings);
      await cache.set("text3", embeddings);

      // This should evict 'text1'
      await cache.set("text4", embeddings);

      // Mock Redis miss for evicted item
      mockRedisClient.get.mockResolvedValueOnce(null);
      const result1 = await cache.get("text1");
      expect(result1).toBeNull();

      // Should still have the other items in L1
      const result4 = await cache.get("text4");
      expect(result4).toEqual(embeddings);
    });
  });

  describe("L2 Redis Cache", () => {
    test("should fall back to L2 cache on L1 miss", async () => {
      const text = "test text";
      const embeddings = [0.1, 0.2, 0.3];

      // Mock L2 hit
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(embeddings));

      const result = await cache.get(text);
      expect(result).toEqual(embeddings);
      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    test("should handle Redis errors gracefully", async () => {
      const text = "test text";

      // Mock Redis error
      mockRedisClient.get.mockRejectedValueOnce(new Error("Redis error"));

      const result = await cache.get(text);
      expect(result).toBeNull();
    });

    test("should store in both L1 and L2", async () => {
      const text = "test text";
      const embeddings = [0.1, 0.2, 0.3];

      await cache.set(text, embeddings);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining("emb:"),
        10, // L2 TTL
        JSON.stringify(embeddings)
      );
    });

    test("should handle Redis set errors gracefully", async () => {
      const text = "test text";
      const embeddings = [0.1, 0.2, 0.3];

      // Mock Redis error on set
      mockRedisClient.setex.mockRejectedValueOnce(new Error("Redis set error"));

      // Should not throw error
      await expect(cache.set(text, embeddings)).resolves.not.toThrow();
    });
  });

  describe("Key Generation", () => {
    test("should generate consistent keys for same text", async () => {
      const text = "test text";
      const embeddings = [0.1, 0.2, 0.3];

      await cache.set(text, embeddings);
      await cache.set(text, embeddings); // Same text

      // Should only call setex once if L1 cache hit prevents second set
      const result = await cache.get(text);
      expect(result).toEqual(embeddings);
    });

    test("should normalize text for key generation", async () => {
      const embeddings = [0.1, 0.2, 0.3];

      // These should generate the same key
      await cache.set("  Test Text  ", embeddings);
      const result = await cache.get("test text");

      expect(result).toEqual(embeddings);
    });
  });

  describe("Cache Management", () => {
    test("should clear both L1 and L2 caches", async () => {
      mockRedisClient.keys.mockResolvedValueOnce(["emb:key1", "emb:key2"]);
      mockRedisClient.del.mockResolvedValueOnce(2);

      await cache.clear();

      expect(mockRedisClient.keys).toHaveBeenCalledWith("emb:*");
      expect(mockRedisClient.del).toHaveBeenCalledWith("emb:key1", "emb:key2");
    });

    test("should provide cache metrics", () => {
      const metrics = cache.getMetrics();

      expect(metrics).toEqual({
        l1Size: 0,
        l1MaxSize: 3,
        redisAvailable: true,
      });
    });

    test("should perform health check", async () => {
      // Reset ping mock for this test
      mockRedisClient.ping.mockResolvedValueOnce("PONG");

      const health = await cache.healthCheck();

      expect(health).toEqual({
        l1: true,
        l2: true,
        overall: true,
      });
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    test("should handle Redis health check failure", async () => {
      mockRedisClient.ping.mockRejectedValueOnce(new Error("Redis down"));

      const health = await cache.healthCheck();

      expect(health).toEqual({
        l1: true,
        l2: false,
        overall: true, // L1 is enough for overall health
      });
    });
  });

  describe("Fallback Behavior", () => {
    test("should work with L1 only when Redis is unavailable", async () => {
      // Create cache that fails Redis initialization
      vi.doMock("../redis.client", () => ({
        getRedisClient: vi.fn(() => {
          throw new Error("Redis unavailable");
        }),
      }));

      const fallbackCache = new MultiLevelEmbeddingCache();
      const text = "test text";
      const embeddings = [0.1, 0.2, 0.3];

      // Should work with L1 only
      await fallbackCache.set(text, embeddings);
      const result = await fallbackCache.get(text);

      expect(result).toEqual(embeddings);
    });
  });
});
