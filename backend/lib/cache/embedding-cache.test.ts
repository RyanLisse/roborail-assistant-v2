import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmbeddingRequest, EmbeddingResponse } from "../../upload/embedding";
import type { CacheManager } from "./cache-manager";
import { EmbeddingCache } from "./embedding-cache";

// Mock CacheManager
const mockCacheManager = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  getMetrics: vi.fn(),
  healthCheck: vi.fn(),
  disconnect: vi.fn(),
} as any as CacheManager;

describe("EmbeddingCache", () => {
  let embeddingCache: EmbeddingCache;

  beforeEach(() => {
    embeddingCache = new EmbeddingCache(mockCacheManager);
    vi.clearAllMocks();
  });

  describe("getCachedEmbedding", () => {
    it("should return cached embedding when available", async () => {
      const request: EmbeddingRequest = {
        texts: ["test text"],
        inputType: "search_document",
      };

      const cachedResponse: EmbeddingResponse = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: "embed-english-v4.0",
        usage: { totalTokens: 5 },
      };

      mockCacheManager.get.mockResolvedValue(cachedResponse);

      const result = await embeddingCache.getCachedEmbedding(request);
      expect(result).toEqual(cachedResponse);
      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining("embedding:"));
    });

    it("should return null for cache miss", async () => {
      const request: EmbeddingRequest = {
        texts: ["uncached text"],
        inputType: "search_document",
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await embeddingCache.getCachedEmbedding(request);
      expect(result).toBeNull();
    });

    it("should generate consistent cache keys for same input", async () => {
      const request1: EmbeddingRequest = {
        texts: ["same text"],
        inputType: "search_document",
      };

      const request2: EmbeddingRequest = {
        texts: ["same text"],
        inputType: "search_document",
      };

      mockCacheManager.get.mockResolvedValue(null);

      await embeddingCache.getCachedEmbedding(request1);
      await embeddingCache.getCachedEmbedding(request2);

      expect(mockCacheManager.get).toHaveBeenCalledTimes(2);
      const calls = mockCacheManager.get.mock.calls;
      expect(calls[0][0]).toBe(calls[1][0]); // Same cache key
    });

    it("should generate different cache keys for different input types", async () => {
      const request1: EmbeddingRequest = {
        texts: ["same text"],
        inputType: "search_document",
      };

      const request2: EmbeddingRequest = {
        texts: ["same text"],
        inputType: "search_query",
      };

      mockCacheManager.get.mockResolvedValue(null);

      await embeddingCache.getCachedEmbedding(request1);
      await embeddingCache.getCachedEmbedding(request2);

      const calls = mockCacheManager.get.mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]); // Different cache keys
    });
  });

  describe("cacheEmbedding", () => {
    it("should cache embedding response with correct TTL", async () => {
      const request: EmbeddingRequest = {
        texts: ["test text for caching"],
        inputType: "search_document",
      };

      const response: EmbeddingResponse = {
        embeddings: [[0.4, 0.5, 0.6]],
        model: "embed-english-v4.0",
        usage: { totalTokens: 10 },
      };

      await embeddingCache.cacheEmbedding(request, response);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining("embedding:"),
        response,
        expect.any(Number) // TTL
      );
    });

    it("should use longer TTL for larger batches", async () => {
      const smallRequest: EmbeddingRequest = {
        texts: ["single text"],
        inputType: "search_document",
      };

      const largeRequest: EmbeddingRequest = {
        texts: Array(50).fill("text"),
        inputType: "search_document",
      };

      const response: EmbeddingResponse = {
        embeddings: [[0.1, 0.2]],
        model: "embed-english-v4.0",
        usage: { totalTokens: 100 },
      };

      await embeddingCache.cacheEmbedding(smallRequest, response);
      await embeddingCache.cacheEmbedding(largeRequest, response);

      const calls = mockCacheManager.set.mock.calls;
      expect(calls[1][2]).toBeGreaterThan(calls[0][2]); // Larger batch has longer TTL
    });
  });

  describe("invalidateEmbeddings", () => {
    it("should delete cached embeddings for given texts", async () => {
      const texts = ["text1", "text2"];

      await embeddingCache.invalidateEmbeddings(texts);

      expect(mockCacheManager.delete).toHaveBeenCalledTimes(4); // 2 texts × 2 input types
    });
  });

  describe("getStats", () => {
    it("should return embedding cache statistics", async () => {
      mockCacheManager.getMetrics.mockResolvedValue({
        l1Cache: { hits: 10, misses: 5, hitRate: 0.67, size: 100 },
        l2Cache: { hits: 15, misses: 8, hitRate: 0.65, size: 500 },
      });

      const stats = await embeddingCache.getStats();

      expect(stats).toHaveProperty("totalHits");
      expect(stats).toHaveProperty("totalMisses");
      expect(stats).toHaveProperty("hitRate");
      expect(stats).toHaveProperty("cacheSize");
      expect(stats.totalHits).toBe(25);
      expect(stats.totalMisses).toBe(13);
    });
  });
});
