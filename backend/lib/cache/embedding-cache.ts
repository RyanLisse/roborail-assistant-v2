import crypto from "crypto";
import type { EmbeddingRequest, EmbeddingResponse } from "../../upload/embedding";
import type { CacheManager } from "./cache-manager";
import type { EmbeddingCacheKey, EmbeddingCacheStats } from "./types";

export class EmbeddingCache {
  private cacheManager: CacheManager;
  private readonly ttlConfig = {
    default: 7200, // 2 hours
    largeBatch: 14400, // 4 hours for batches > 10 texts
  };

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  async getCachedEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.cacheManager.get<EmbeddingResponse>(cacheKey);

      if (cached) {
        // Validate cached response structure
        if (this.isValidEmbeddingResponse(cached)) {
          return cached;
        } else {
          // Invalid cached data, remove it
          await this.cacheManager.delete(cacheKey);
        }
      }

      return null;
    } catch (error) {
      console.warn("Error retrieving cached embedding:", error);
      return null;
    }
  }

  async cacheEmbedding(request: EmbeddingRequest, response: EmbeddingResponse): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const ttl = this.determineTTL(request);

      // Add metadata for cache management
      const cacheData = {
        ...response,
        cached_at: new Date().toISOString(),
        cache_version: "1.0",
      };

      await this.cacheManager.set(cacheKey, cacheData, ttl);
    } catch (error) {
      console.warn("Error caching embedding:", error);
      // Don't throw - caching failures shouldn't break the main flow
    }
  }

  async invalidateEmbeddings(texts: string[]): Promise<void> {
    const inputTypes: ("search_document" | "search_query" | "classification" | "clustering")[] = ["search_document", "search_query", "classification", "clustering"];

    try {
      const invalidationPromises: Promise<void>[] = [];

      for (const text of texts) {
        for (const inputType of inputTypes) {
          const request: EmbeddingRequest = { texts: [text], inputType };
          const cacheKey = this.generateCacheKey(request);
          invalidationPromises.push(this.cacheManager.delete(cacheKey));
        }
      }

      await Promise.all(invalidationPromises);
    } catch (error) {
      console.warn("Error invalidating embeddings:", error);
    }
  }

  async getStats(): Promise<EmbeddingCacheStats> {
    try {
      const metrics = await this.cacheManager.getMetrics();

      return {
        totalHits: metrics.l1Cache.hits + metrics.l2Cache.hits,
        totalMisses: metrics.l1Cache.misses + metrics.l2Cache.misses,
        hitRate: this.calculateOverallHitRate(metrics),
        cacheSize: metrics.l1Cache.size + metrics.l2Cache.size,
        avgResponseTime: 0, // Would need to track this separately
      };
    } catch (error) {
      console.warn("Error getting embedding cache stats:", error);
      return {
        totalHits: 0,
        totalMisses: 0,
        hitRate: 0,
        cacheSize: 0,
        avgResponseTime: 0,
      };
    }
  }

  private generateCacheKey(request: EmbeddingRequest): string {
    // Create a deterministic cache key based on request parameters
    const keyData: EmbeddingCacheKey = {
      texts: request.texts.slice().sort(), // Sort for consistency
      inputType: request.inputType || "search_document",
      model: "embed-english-v4.0", // Default model
    };

    // Create hash for consistent, compact key
    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash("sha256").update(keyString).digest("hex").substring(0, 16);

    return `embedding:${hash}:${keyData.inputType}:${keyData.texts.length}`;
  }

  private determineTTL(request: EmbeddingRequest): number {
    // Longer TTL for larger batches (more expensive to recompute)
    const textCount = request.texts.length;

    if (textCount > 10) {
      return this.ttlConfig.largeBatch;
    }

    return this.ttlConfig.default;
  }

  private isValidEmbeddingResponse(response: any): response is EmbeddingResponse {
    return (
      response &&
      typeof response === "object" &&
      Array.isArray(response.embeddings) &&
      response.embeddings.length > 0 &&
      Array.isArray(response.embeddings[0]) &&
      typeof response.model === "string" &&
      response.usage &&
      typeof response.usage.totalTokens === "number"
    );
  }

  private calculateOverallHitRate(metrics: any): number {
    const totalHits = metrics.l1Cache.hits + metrics.l2Cache.hits;
    const totalRequests = totalHits + metrics.l1Cache.misses + metrics.l2Cache.misses;

    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }
}
