import { beforeEach, describe, expect, it, vi } from "vitest";
import { type EmbeddingRequest, EmbeddingResponse } from "./embedding";

// Mock the Cohere API secret
vi.mock("encore.dev/config", () => ({
  secret: vi.fn(() => () => "test-api-key"),
}));

// Mock the embedding cache
vi.mock("../lib/cache/embedding-cache", () => ({
  EmbeddingCache: vi.fn().mockImplementation(() => ({
    getCachedEmbedding: vi.fn(),
    cacheEmbedding: vi.fn(),
  })),
}));

// Mock fetch for Cohere API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Embedding Integration with Caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should integrate caching with embedding generation", async () => {
    // Import here to ensure mocks are applied
    const { generateEmbeddings } = await import("./embedding");

    const request: EmbeddingRequest = {
      texts: ["test text"],
      inputType: "search_document",
    };

    // Mock successful API response for cache miss scenario
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [[0.1, 0.2, 0.3]],
        response_type: "embed-english-v4.0",
      }),
    });

    const result = await generateEmbeddings(request);

    expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
    expect(result.model).toBe("embed-english-v4.0");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should handle batch requests correctly", async () => {
    const { generateEmbeddings } = await import("./embedding");

    const request: EmbeddingRequest = {
      texts: ["text 1", "text 2", "text 3"],
      inputType: "search_document",
    };

    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
          [0.7, 0.8, 0.9],
        ],
        response_type: "embed-english-v4.0",
      }),
    });

    const result = await generateEmbeddings(request);

    expect(result.embeddings).toHaveLength(3);
    expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
    expect(result.embeddings[2]).toEqual([0.7, 0.8, 0.9]);
  });

  it("should handle API errors gracefully", async () => {
    const { generateEmbeddings } = await import("./embedding");

    const request: EmbeddingRequest = {
      texts: ["test text"],
      inputType: "search_document",
    };

    // Mock API error
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "API Error",
    });

    await expect(generateEmbeddings(request)).rejects.toThrow();
  });
});
