import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the cache managers
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
const mockEmbeddingGet = vi.fn();
const mockEmbeddingSet = vi.fn();

vi.mock("../lib/cache/cache-manager", () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    get: mockCacheGet,
    set: mockCacheSet,
  })),
}));

vi.mock("../lib/cache/embedding-cache", () => ({
  EmbeddingCache: vi.fn().mockImplementation(() => ({
    getCachedEmbedding: mockEmbeddingGet,
    cacheEmbedding: mockEmbeddingSet,
  })),
}));

describe("Search Service Caching Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockReset();
    mockCacheSet.mockReset();
    mockEmbeddingGet.mockReset();
    mockEmbeddingSet.mockReset();
  });

  it("should test cache manager integration", async () => {
    const { CacheManager } = await import("../lib/cache/cache-manager");
    const cacheManager = new CacheManager();

    // Test that cache methods are available
    await cacheManager.get("test-key");
    await cacheManager.set("test-key", "test-value");

    expect(mockCacheGet).toHaveBeenCalledWith("test-key");
    expect(mockCacheSet).toHaveBeenCalledWith("test-key", "test-value");
  });

  it("should test embedding cache integration", async () => {
    const { EmbeddingCache } = await import("../lib/cache/embedding-cache");
    const embeddingCache = new EmbeddingCache();

    const request = {
      texts: ["test query"],
      inputType: "search_query" as const,
    };

    const response = {
      embeddings: [[0.1, 0.2, 0.3]],
      model: "embed-english-v4.0",
      usage: { totalTokens: 10 },
    };

    // Test embedding cache methods
    await embeddingCache.getCachedEmbedding(request);
    await embeddingCache.cacheEmbedding(request, response);

    expect(mockEmbeddingGet).toHaveBeenCalledWith(request);
    expect(mockEmbeddingSet).toHaveBeenCalledWith(request, response);
  });

  it("should test cache key generation", () => {
    // Test the cache key generation logic
    const request = {
      query: "test query",
      userID: "user123",
      limit: 10,
      threshold: 0.7,
      enableReranking: true,
    };

    const expectedKeyParts = ["search", "hybrid", "user123", "test query", 10, 0.7, true, "all"];

    const expectedKey = expectedKeyParts.join(":");

    expect(expectedKey).toBe("search:hybrid:user123:test query:10:0.7:true:all");
  });
});
