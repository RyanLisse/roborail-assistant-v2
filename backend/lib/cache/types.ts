import { z } from "zod";

// Configuration schemas
export const CacheConfigSchema = z.object({
  redis: z.object({
    host: z.string().default("localhost"),
    port: z.number().int().min(1).max(65535).default(6379),
    password: z.string().optional(),
    db: z.number().int().min(0).default(0),
    connectTimeout: z.number().int().min(1000).default(10000),
    commandTimeout: z.number().int().min(1000).default(5000),
  }),
  l1Cache: z.object({
    maxSize: z.number().int().min(1).default(1000),
    ttl: z.number().int().min(1000).default(300000), // 5 minutes
  }),
  l2Cache: z.object({
    ttl: z.number().int().min(1000).default(3600000), // 1 hour
  }),
  keyPrefix: z.string().default("rag:cache:"),
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

// Cache metrics and monitoring
export interface CacheLayerMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

export interface CacheMetrics {
  l1Cache: CacheLayerMetrics;
  l2Cache: CacheLayerMetrics;
}

export interface CacheHealth {
  l1Cache: {
    status: "healthy" | "degraded" | "down";
    size: number;
    memoryUsage?: number;
  };
  l2Cache: {
    status: "healthy" | "degraded" | "down";
    connected: boolean;
    responseTime?: number;
  };
}

// Cache key types for better organization
export type CacheKeyType = "embedding" | "search" | "document" | "chunk" | "metadata";

export interface CacheKeyOptions {
  type: CacheKeyType;
  identifier: string;
  version?: string;
  userScope?: string;
}

// TTL configuration for different content types
export interface TTLConfig {
  embeddings: {
    default: number;
    large_batch: number; // For batch operations
  };
  search: {
    default: number;
    complex_query: number;
  };
  documents: {
    metadata: number;
    content: number;
  };
  chunks: {
    default: number;
  };
}

// Cache invalidation patterns
export type InvalidationPattern =
  | "exact" // Exact key match
  | "prefix" // All keys with prefix
  | "pattern" // Pattern matching with wildcards
  | "tag"; // Tagged invalidation

export interface InvalidationRequest {
  pattern: InvalidationPattern;
  keys: string[];
  tags?: string[];
}

// Embedding-specific cache types
export interface EmbeddingCacheKey {
  texts: string[];
  inputType: string;
  model?: string;
}

export interface EmbeddingCacheStats {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  cacheSize: number;
  avgResponseTime: number;
}

// Search result cache types
export interface SearchCacheKey {
  query: string;
  userID: string;
  filters?: Record<string, any>;
  searchType?: string;
  limit?: number;
}

export interface SearchCacheStats {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  avgQueryTime: number;
  cacheSize: number;
}

// Document metadata cache types
export interface DocumentCacheKey {
  documentId: string;
  version?: string;
}

// Error types
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly layer: "l1" | "l2" | "both",
    public readonly operation: string
  ) {
    super(message);
    this.name = "CacheError";
  }
}

export class CacheConnectionError extends CacheError {
  constructor(message: string, layer: "l1" | "l2") {
    super(message, "CONNECTION_ERROR", layer, "connect");
  }
}

export class CacheSerializationError extends CacheError {
  constructor(message: string, operation: string) {
    super(message, "SERIALIZATION_ERROR", "both", operation);
  }
}
