import { and, desc, eq, gte, sql } from "drizzle-orm";
import { api } from "encore.dev/api";
import type { APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { db } from "../db/connection";
import { documentChunks, documents } from "../db/schema";
import { CacheManager } from "../lib/cache/cache-manager";
import { EmbeddingCache } from "../lib/cache/embedding-cache";
import { MetricHelpers, recordError } from "../lib/monitoring/metrics";
import log from "encore.dev/log";
import { CohereClient } from "../../src/shared/services/cohere.client";
import { LLMService } from "../../src/shared/services/llm.service";

const logger = log.with({ service: "search-service" });

// Encore secret for Cohere API key
const cohereApiKey = secret("CohereApiKey");

// Initialize cache managers and logger
const searchCache = new CacheManager();
const cohereClient = new CohereClient();
const llmService = new LLMService();
const embeddingCache = new EmbeddingCache(searchCache);

// Validation schemas
export interface SearchRequest {
  query: string;
  userID: string;
  documentIDs?: string[]; // Optional: search within specific documents
  limit?: number;
  threshold?: number; // Similarity threshold (0-1 for cosine similarity)
  searchType?: "vector" | "fulltext" | "hybrid";
  enableReranking?: boolean; // Whether to apply Cohere reranking
}

export interface SearchFilter {
  documentTypes?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  tags?: string[];
  metadata?: Record<string, any>;
  minScore?: number;
}

export interface ContextExpansionOptions {
  includeRelatedChunks?: boolean;
  maxRelatedChunks?: number;
  relatedChunkRadius?: number;
  includeDocumentMetadata?: boolean;
  includeChunkMetadata?: boolean;
}

export interface ExpandedSearchRequest extends SearchRequest {
  filters?: SearchFilter;
  contextExpansion?: ContextExpansionOptions;
}

// Types
export interface SearchResult {
  id: string;
  documentID: string;
  content: string;
  score: number;
  metadata: {
    filename: string;
    pageNumber?: number;
    chunkIndex: number;
  };
  tags?: string[];
  documentType?: string;
  createdAt?: Date;
  relatedChunks?: SearchResult[];
  documentMetadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  totalFound: number;
  query: string;
  processingTime: number;
  searchType?: string;
}

export interface ExpandedSearchResponse extends SearchResponse {
  appliedFilters?: SearchFilter;
  expandedResults?: number; // Number of related chunks added
}

// Cohere embedding interface
interface CohereEmbedRequest {
  texts: string[];
  model: string;
  input_type: string;
}

interface CohereEmbedResponse {
  embeddings: number[][];
  id: string;
  response_type: string;
  texts: string[];
}

// Cohere reranking interface
interface CohereRerankRequest {
  query: string;
  documents: string[] | CohereDocument[];
  top_n?: number;
  model?: string;
  return_documents?: boolean;
}

interface CohereDocument {
  text: string;
  metadata?: Record<string, any>;
}

interface CohereRerankResult {
  index: number;
  relevance_score: number;
  document?: CohereDocument;
}

interface CohereRerankResponse {
  id: string;
  results: CohereRerankResult[];
  meta?: {
    api_version: {
      version: string;
    };
    billed_units?: {
      search_units: number;
    };
  };
}

// Helper function to rerank search results using Cohere
async function rerankWithCohere(
  query: string,
  results: SearchResult[],
  topN?: number
): Promise<SearchResult[]> {
  const rerankStartTime = Date.now();

  try {
    if (results.length === 0) {
      logger.info("No results to rerank", { query });
      return results;
    }

    logger.info("Starting result reranking", {
      inputResults: results.length,
      query: query.substring(0, 100),
      topN: topN || Math.min(results.length, 20),
      model: "rerank-english-v3.0",
    });

    const apiKey = await cohereApiKey();

    const documents: CohereDocument[] = results.map((result, index) => ({
      text: result.content,
      metadata: {
        originalIndex: index,
        id: result.id,
        documentID: result.documentID,
        ...result.metadata,
      },
    }));

    const requestBody: CohereRerankRequest = {
      query,
      documents,
      top_n: topN || Math.min(results.length, 20),
      model: "rerank-english-v3.0",
      return_documents: true,
    };

    const response = await fetch("https://api.cohere.ai/v1/rerank", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Cohere rerank API error (${response.status}): ${errorText}`);
      logger.error(
        error,
        "Reranking API request failed",
        {
          status: response.status,
          query: query.substring(0, 100),
          inputResults: results.length,
          duration: Date.now() - rerankStartTime,
        }
      );
      throw error;
    }

    const data = await response.json() as CohereRerankResponse;

    if (!data.results || data.results.length === 0) {
      logger.warn("Empty reranking response from Cohere API", {
        query: query.substring(0, 100),
        inputResults: results.length,
        duration: Date.now() - rerankStartTime,
      });
      return results;
    }

    const rerankedResults: SearchResult[] = data.results.map((rerankResult) => {
      const originalIndex = rerankResult.document?.metadata?.originalIndex as number;
      const originalResult = results[originalIndex];

      if (originalResult === undefined) {
        logger.warn("Invalid original index in rerank results", { 
            rerankIndex: rerankResult.index, 
            originalIndexAttempted: originalIndex, 
            totalOriginalResults: results.length 
        });
        return null;
      }

      return {
        ...originalResult,
        score: rerankResult.relevance_score, 
      };
    }).filter(result => result !== null) as SearchResult[];

    const durationRerank = Date.now() - rerankStartTime;
    logger.info("Reranking completed successfully", {
      inputResults: results.length,
      outputResults: rerankedResults.length,
      query: query.substring(0, 100),
      duration: durationRerank,
      avgRelevanceScore:
        rerankedResults.length > 0 ? rerankedResults.reduce((sum, r) => sum + r.score, 0) / rerankedResults.length : 0,
      model: "rerank-english-v3.0",
      billedUnits: data.meta?.billed_units?.search_units,
    });

    return rerankedResults;
  } catch (error) {
    const durationRerankCatch = Date.now() - rerankStartTime; 
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      "Reranking failed, falling back to original ordering",
      { 
        query: query.substring(0, 100),
        inputResults: results.length,
        duration: durationRerankCatch,
      }
    );
    return results;
  }
}

// Helper function to generate embeddings using Cohere with caching
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const queryEmbeddingStartTime = Date.now();

  try {
    logger.info("Starting query embedding generation", {
      query: query.substring(0, 100),
      model: "embed-english-v4.0",
      inputType: "search_query",
    });

    const embeddingRequest = {
      texts: [query],
      inputType: "search_query" as const,
    };

    try {
      const cachedResult = await embeddingCache.getCachedEmbedding(embeddingRequest);
      if (cachedResult && cachedResult.embeddings && cachedResult.embeddings.length > 0) {
        const durationEmbeddingCacheHit = Date.now() - queryEmbeddingStartTime;
        logger.info("Cache hit for query embedding", {
          query: query.substring(0, 100),
          duration: durationEmbeddingCacheHit,
          dimensions: cachedResult.embeddings[0].length,
        });
        MetricHelpers.trackCacheHit("search", "embedding");
        return cachedResult.embeddings[0];
      }
      if (!cachedResult) {
        logger.debug("Cache miss for query embedding", { query: query.substring(0,100) });
        MetricHelpers.trackCacheMiss("search", "embedding");
      }
    } catch (cacheError) {
      logger.warn(
        cacheError instanceof Error ? cacheError : new Error(String(cacheError)),
        "Embedding cache retrieval failed, falling back to API",
        {
          query: query.substring(0, 100),
        }
      );
      MetricHelpers.trackCacheMiss("search", "embedding");
    }

    const apiKey = await cohereApiKey();

    const requestBody: CohereEmbedRequest = {
      texts: [query],
      model: "embed-english-v4.0",
      input_type: "search_query",
    };

    const response = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Cohere API error (${response.status}): ${errorText}`);
      logger.error(
        error,
        "Query embedding API request failed",
        {
          status: response.status,
          query: query.substring(0, 100),
          duration: Date.now() - queryEmbeddingStartTime,
        }
      );
      throw error;
    }

    const data = await response.json() as CohereEmbedResponse;

    if (!data.embeddings || data.embeddings.length === 0 || !data.embeddings[0]) {
      const error = new Error("No embeddings returned from Cohere API");
      logger.error(
        error,
        "Empty embedding response from Cohere API",
        {
          query: query.substring(0, 100),
          duration: Date.now() - queryEmbeddingStartTime,
        }
      );
      throw error;
    }

    try {
      await embeddingCache.cacheEmbedding(embeddingRequest, { 
        embeddings: data.embeddings, 
        model: "embed-english-v4.0",
        usage: {
          prompt_tokens: data.meta?.billed_units?.input_tokens || 0, 
          total_tokens: (data.meta?.billed_units?.input_tokens || 0) + (data.meta?.billed_units?.output_tokens || 0),
        }
      });
      logger.debug("Successfully cached query embedding", {
        query: query.substring(0, 100),
      });
    } catch (cacheError) {
      logger.warn(
        cacheError instanceof Error ? cacheError : new Error(String(cacheError)),
        "Failed to cache query embedding",
        {
          query: query.substring(0, 100),
        }
      );
    }

    const durationEmbeddingGen = Date.now() - queryEmbeddingStartTime;
    logger.info("Query embedding generated successfully", {
      query: query.substring(0, 100),
      dimensions: data.embeddings[0].length,
      duration: durationEmbeddingGen,
      model: "embed-english-v4.0", 
    });

    return data.embeddings[0];
  } catch (error) {
    const durationEmbeddingCatch = Date.now() - queryEmbeddingStartTime;
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      "Query embedding generation failed",
      {
        query: query.substring(0, 100),
        duration: durationEmbeddingCatch,
      }
    );
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Helper function to perform full-text search
async function performFullTextSearch(
  query: string,
  userID: string,
  documentIDs?: string[],
  limit = 20
): Promise<SearchResult[]> {
  const localStartTime = Date.now();

  try {
    logger.info("Starting full-text search", {
      query: query.substring(0, 100),
      userID,
      documentIDs: documentIDs?.length || 0,
      limit,
    });

    // Escape special characters for tsquery
    const sanitizedQuery = query
      .replace(/[&|!()]/g, " ") // Remove special FTS characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    if (!sanitizedQuery) {
      logger.warn("Empty query after sanitization", {
        originalQuery: query.substring(0, 100),
        duration: Date.now() - localStartTime,
      });
      return [];
    }

    logger.debug("Query sanitized for FTS", {
      originalQuery: query.substring(0, 100),
      sanitizedQuery: sanitizedQuery.substring(0, 100),
    });

    // Build base query with full-text search
    let baseQuery = db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        content: documentChunks.content,
        chunkIndex: documentChunks.chunkIndex,
        pageNumber: documentChunks.pageNumber,
        filename: documents.filename,
        originalName: documents.originalName,
        // Calculate full-text search rank (ts_rank)
        score: sql<number>`ts_rank(to_tsvector('english', ${documentChunks.content}), plainto_tsquery('english', ${sanitizedQuery}))`,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id));

    let conditions = [sql`to_tsvector('english', ${documentChunks.content}) @@ plainto_tsquery('english', ${sanitizedQuery})`];
    if (userID) conditions.push(eq(documents.userId, userID));
    if (documentIDs && documentIDs.length > 0) conditions.push(sql`${documentChunks.documentId} = ANY(${documentIDs})`);
    // Apply other filters to `conditions` array as needed

    const results = await baseQuery
      .where(and(...conditions)) // Apply all conditions here
      .orderBy(
        desc(
          sql`ts_rank(to_tsvector('english', ${documentChunks.content}), plainto_tsquery('english', ${sanitizedQuery}))`
        )
      )
      .limit(limit);

    const searchResults = results.map((result) => ({
      id: result.id,
      documentID: result.documentId,
      content: result.content,
      score: Number(result.score),
      metadata: {
        filename: result.originalName,
        pageNumber: result.pageNumber || undefined,
        chunkIndex: result.chunkIndex,
      },
    }));

    const durationFTS = Date.now() - localStartTime;
    logger.info("Full-text search completed successfully", {
      query: query.substring(0, 100),
      sanitizedQuery: sanitizedQuery.substring(0, 100),
      resultCount: searchResults.length,
      duration: durationFTS,
      avgScore:
        searchResults.length > 0
          ? searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length
          : 0,
      maxScore: searchResults.length > 0 ? Math.max(...searchResults.map((r) => r.score)) : 0,
    });

    return searchResults;
  } catch (error) {
    const durationFTSCatch = Date.now() - localStartTime;
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      "Full-text search failed",
      {
        query: query.substring(0, 100),
        userID,
        documentIDs: documentIDs?.length || 0,
        limit,
        duration: durationFTSCatch,
      }
    );
    throw new Error(
      `Full-text search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Helper function to perform vector similarity search
async function performVectorSearch(
  queryEmbedding: number[],
  userID: string,
  documentIDs?: string[],
  limit = 20,
  threshold = 0.7
): Promise<SearchResult[]> {
  const vectorSearchStartTime = Date.now();

  try {
    logger.info("Starting vector similarity search", {
      userID,
      documentIDs: documentIDs?.length || 0,
      limit,
      threshold,
      embeddingDimensions: queryEmbedding.length,
    });

    // Build base query
    let baseQueryVec = db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        content: documentChunks.content,
        chunkIndex: documentChunks.chunkIndex,
        pageNumber: documentChunks.pageNumber,
        filename: documents.filename,
        originalName: documents.originalName,
        // Calculate cosine similarity - PGVector uses 1 - cosine_distance for similarity
        score: sql<number>`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id));

    let vecConditions = [
        gte(
          sql`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
          threshold
        )
      ];
    if (userID) vecConditions.push(eq(documents.userId, userID));
    if (documentIDs && documentIDs.length > 0) vecConditions.push(sql`${documentChunks.documentId} = ANY(${documentIDs})`);
    // Apply other filters to `vecConditions` array as needed

    const resultsVec = await baseQueryVec
      .where(and(...vecConditions)) // Apply all conditions here
      .orderBy(
        desc(sql`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`)
      )
      .limit(limit);

    const searchResults = resultsVec.map((result) => ({
      id: result.id,
      documentID: result.documentId,
      content: result.content,
      score: Number(result.score),
      metadata: {
        filename: result.originalName,
        pageNumber: result.pageNumber || undefined,
        chunkIndex: result.chunkIndex,
      },
    }));

    const durationVector = Date.now() - vectorSearchStartTime;
    logger.info("Vector search completed successfully", {
      resultCount: searchResults.length,
      duration: durationVector,
      threshold,
      avgSimilarity:
        searchResults.length > 0
          ? searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length
          : 0,
      maxSimilarity: searchResults.length > 0 ? Math.max(...searchResults.map((r) => r.score)) : 0,
      minSimilarity: searchResults.length > 0 ? Math.min(...searchResults.map((r) => r.score)) : 0,
    });

    return searchResults;
  } catch (error) {
    const durationVectorCatch = Date.now() - vectorSearchStartTime;
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      "Vector search failed",
      {
        query: query.substring(0, 100),
        userID,
        documentIDs: documentIDs?.length || 0,
        limit,
        threshold,
        duration: durationVectorCatch,
      }
    );
    throw new Error(
      `Vector search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Helper function to combine and deduplicate search results
function combineSearchResults(
  vectorResults: SearchResult[],
  fullTextResults: SearchResult[],
  vectorWeight = 0.7,
  fullTextWeight = 0.3
): SearchResult[] {
  const resultMap = new Map<string, SearchResult>();

  // Add vector results with weighted scores
  for (const result of vectorResults) {
    resultMap.set(result.id, {
      ...result,
      score: result.score * vectorWeight,
    });
  }

  // Add or merge full-text results
  for (const result of fullTextResults) {
    const existing = resultMap.get(result.id);
    if (existing) {
      // Combine scores for documents found in both searches
      existing.score += result.score * fullTextWeight;
    } else {
      // Add new full-text only result
      resultMap.set(result.id, {
        ...result,
        score: result.score * fullTextWeight,
      });
    }
  }

  // Convert back to array and sort by combined score
  return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
}

// Generate cache key for search requests
function generateSearchCacheKey(req: SearchRequest, searchType: string): string {
  const keyParts = [
    "search",
    searchType,
    req.userID,
    req.query,
    req.limit || 20,
    req.threshold || 0.7,
    req.enableReranking || true,
    req.documentIDs?.sort().join(",") || "all",
  ];
  return keyParts.join(":");
}

// Hybrid search endpoint (vector + full-text)
export const hybridSearch = api(
  { expose: true, method: "POST", path: "/search/hybrid" },
  async (req: SearchRequest): Promise<SearchResponse> => {
    const hybridStartTime = Date.now();
    const startTime = Date.now();

    try {
      // Validate request
      const validatedReq = req as SearchRequest;

      // Track search request metrics
      MetricHelpers.trackSearchRequest("hybrid", validatedReq.enableReranking || false);

      logger.info("Hybrid search request received", {
        query: validatedReq.query.substring(0, 100),
        userID: validatedReq.userID,
        documentIDs: validatedReq.documentIDs?.length || 0,
        limit: validatedReq.limit,
        threshold: validatedReq.threshold,
        enableReranking: validatedReq.enableReranking,
      });

      // Try to get cached results first
      const cacheKey = generateSearchCacheKey(validatedReq, "hybrid");
      try {
        const cachedResponse = await searchCache.get<SearchResponse>(cacheKey);
        if (cachedResponse) {
          const duration = Date.now() - startTime;
          logger.info("Cache hit for hybrid search", {
            query: validatedReq.query.substring(0, 100),
            resultCount: cachedResponse.results.length,
            duration,
          });
          MetricHelpers.trackCacheHit("search", "L1");
          return {
            ...cachedResponse,
            processingTime: Date.now() - startTime, // Update processing time
          };
        } else {
          MetricHelpers.trackCacheMiss("search", "L1");
        }
      } catch (cacheError) {
        logger.warn(
          cacheError instanceof Error ? cacheError : undefined,
          "Search cache retrieval failed, proceeding with search",
          {
            query: validatedReq.query.substring(0, 100),
          }
        );
        MetricHelpers.trackCacheMiss("search", "L1");
      }

      // Perform both vector and full-text searches in parallel
      logger.info("Starting parallel vector and full-text searches", {
        query: validatedReq.query.substring(0, 100),
      });

      const [queryEmbedding, fullTextResults] = await Promise.all([
        generateQueryEmbedding(validatedReq.query),
        performFullTextSearch(
          validatedReq.query,
          validatedReq.userID,
          validatedReq.documentIDs,
          validatedReq.limit
        ),
      ]);

      // Perform vector similarity search
      const vectorResults = await performVectorSearch(
        queryEmbedding,
        validatedReq.userID,
        validatedReq.documentIDs,
        validatedReq.limit,
        validatedReq.threshold
      );

      logger.info("Search phases completed", {
        vectorResultCount: vectorResults.length,
        fullTextResultCount: fullTextResults.length,
        query: validatedReq.query.substring(0, 100),
      });

      // Combine results with weighted scoring
      let combinedResults = combineSearchResults(vectorResults, fullTextResults);

      logger.debug("Results combined", {
        combinedResultCount: combinedResults.length,
        query: validatedReq.query.substring(0, 100),
      });

      // Apply Cohere reranking to improve relevance if enabled
      if (validatedReq.enableReranking && combinedResults.length > 1) {
        logger.info("Applying Cohere reranking", {
          inputResults: combinedResults.length,
          query: validatedReq.query.substring(0, 100),
        });
        combinedResults = await rerankWithCohere(
          validatedReq.query,
          combinedResults,
          validatedReq.limit
        );
      } else {
        // Just limit results if not reranking
        combinedResults = combinedResults.slice(0, validatedReq.limit);
        logger.debug("Skipping reranking, limiting results", {
          finalCount: combinedResults.length,
          reranking: validatedReq.enableReranking,
        });
      }

      const finalResults = combinedResults;
      const processingTime = Date.now() - startTime;
      const durationHybrid = Date.now() - hybridStartTime;

      // Track search performance metrics
      MetricHelpers.trackSearchDuration(
        processingTime,
        "hybrid",
        validatedReq.enableReranking || false
      );

      logger.info("Hybrid search completed successfully", {
        query: validatedReq.query.substring(0, 100),
        finalResultCount: finalResults.length,
        vectorResultCount: vectorResults.length,
        fullTextResultCount: fullTextResults.length,
        processingTime,
        duration: durationHybrid,
        enableReranking: validatedReq.enableReranking,
        avgScore:
          finalResults.length > 0
            ? finalResults.reduce((sum, r) => sum + r.score, 0) / finalResults.length
            : 0,
      });

      const response: SearchResponse = {
        results: finalResults,
        totalFound: finalResults.length,
        query: validatedReq.query,
        processingTime,
        searchType: "hybrid",
      };

      // Cache the response for future requests (5 minutes TTL)
      try {
        await searchCache.set(cacheKey, response, 300000);
        logger.debug("Successfully cached hybrid search results", {
          query: validatedReq.query.substring(0, 100),
          ttl: 300000,
        });
      } catch (cacheError) {
        logger.warn(
          cacheError instanceof Error ? cacheError : undefined,
          "Failed to cache hybrid search results",
          {
            query: validatedReq.query.substring(0, 100),
          }
        );
      }

      return response;
    } catch (error) {
      const durationHybridCatch = Date.now() - hybridStartTime;
      logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "Hybrid search failed",
        {
          query: req.query?.substring(0, 100),
          userID: req.userID,
          duration: durationHybridCatch,
        }
      );
      recordError(
        "search",
        "SEARCH_FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw new Error(
        `Hybrid search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Vector search endpoint
export const vectorSearch = api(
  { expose: true, method: "POST", path: "/search/vector" },
  async (req: SearchRequest): Promise<SearchResponse> => {
    const vectorSearchStartTime = Date.now();
    const startTime = Date.now();

    try {
      // Validate request
      const validatedReq = req as SearchRequest;

      MetricHelpers.trackSearchRequest("vector", validatedReq.enableReranking || false);

      logger.info("Vector search request received", {
        query: validatedReq.query.substring(0, 100),
        userID: validatedReq.userID,
        threshold: validatedReq.threshold,
        limit: validatedReq.limit,
        enableReranking: validatedReq.enableReranking,
      });

      // Generate query embedding
      const queryEmbedding = await generateQueryEmbedding(validatedReq.query);

      // Perform vector similarity search
      let results = await performVectorSearch(
        queryEmbedding,
        validatedReq.userID,
        validatedReq.documentIDs,
        validatedReq.limit,
        validatedReq.threshold
      );

      // Apply reranking if enabled
      if (validatedReq.enableReranking && results.length > 1) {
        logger.info("Applying reranking to vector search results", {
          inputResults: results.length,
          query: validatedReq.query.substring(0, 100),
        });
        results = await rerankWithCohere(validatedReq.query, results, validatedReq.limit);
      }

      const processingTime = Date.now() - startTime;
      const durationVector = Date.now() - vectorSearchStartTime;

      MetricHelpers.trackSearchDuration(
        processingTime,
        "vector",
        validatedReq.enableReranking || false
      );

      logger.info("Vector search completed successfully", {
        query: queryEmbedding.slice(0, 5).join(",") + "...",
        resultCount: results.length,
        processingTime,
        duration: durationVector,
        enableReranking: validatedReq.enableReranking,
        avgScore:
          results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0,
      });

      return {
        results,
        totalFound: results.length,
        query: validatedReq.query,
        processingTime,
        searchType: "vector",
      };
    } catch (error) {
      const durationVectorCatch = Date.now() - vectorSearchStartTime;
      logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "Vector search failed",
        {
          query: query.substring(0, 100),
          userID,
          documentIDs: documentIDs?.length || 0,
          limit,
          threshold,
          duration: durationVectorCatch,
        }
      );
      recordError(
        "search",
        "VECTOR_SEARCH_FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw new Error(
        `Vector search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Full-text search endpoint
export const fullTextSearch = api(
  { expose: true, method: "POST", path: "/search/fulltext" },
  async (req: SearchRequest): Promise<SearchResponse> => {
    const ftsStartTime = Date.now();
    const startTime = Date.now();

    try {
      // Validate request
      const validatedReq = req as SearchRequest;

      MetricHelpers.trackSearchRequest("fulltext", false);

      logger.info("Full-text search request received", {
        query: validatedReq.query.substring(0, 100),
        userID: validatedReq.userID,
        limit: validatedReq.limit,
        documentIDs: validatedReq.documentIDs?.length || 0,
      });

      // Perform full-text search using PostgreSQL FTS
      const results = await performFullTextSearch(
        validatedReq.query,
        validatedReq.userID,
        validatedReq.documentIDs,
        validatedReq.limit
      );

      const processingTime = Date.now() - startTime;
      const durationFTS = Date.now() - ftsStartTime;

      MetricHelpers.trackSearchDuration(processingTime, "fulltext", false);

      logger.info("Full-text search completed successfully", {
        query: validatedReq.query.substring(0, 100),
        resultCount: results.length,
        processingTime,
        duration: durationFTS,
        avgScore:
          results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0,
      });

      return {
        results,
        totalFound: results.length,
        query: validatedReq.query,
        processingTime,
        searchType: "fulltext",
      };
    } catch (error) {
      const durationFTSCatch = Date.now() - ftsStartTime;
      logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "Full-text search failed",
        {
          query: req.query?.substring(0, 100),
          userID: req.userID,
          duration: durationFTSCatch,
        }
      );
      recordError(
        "search",
        "FULLTEXT_SEARCH_FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw new Error(
        `Full-text search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Context expansion and filtering helper functions
async function applyFilters(
  results: SearchResult[],
  filters: SearchFilter
): Promise<SearchResult[]> {
  return results.filter((result) => {
    // Document type filter
    if (filters.documentTypes && filters.documentTypes.length > 0) {
      if (!result.documentType || !filters.documentTypes.includes(result.documentType)) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange) {
      if (
        filters.dateRange.start &&
        result.createdAt &&
        result.createdAt < filters.dateRange.start
      ) {
        return false;
      }
      if (filters.dateRange.end && result.createdAt && result.createdAt > filters.dateRange.end) {
        return false;
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((filterTag) => result.tags?.includes(filterTag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Metadata filter
    if (filters.metadata) {
      for (const [key, value] of Object.entries(filters.metadata)) {
        if (result.metadata[key] !== value) {
          return false;
        }
      }
    }

    // Score filter
    if (filters.minScore && result.score < filters.minScore) {
      return false;
    }

    return true;
  });
}

async function expandContext(
  results: SearchResult[],
  options: ContextExpansionOptions,
  userID: string
): Promise<SearchResult[]> {
  const expandedResults: SearchResult[] = [];

  for (const result of results) {
    const expanded = { ...result };

    // Add related chunks from the same document
    if (options.includeRelatedChunks) {
      const relatedChunks = await getRelatedChunks(result, options, userID);
      if (relatedChunks.length > 0) {
        expanded.relatedChunks = relatedChunks;
      }
    }

    // Add document metadata
    if (options.includeDocumentMetadata) {
      const docMetadata = await getDocumentMetadata(result.documentID, userID);
      if (docMetadata) {
        expanded.documentMetadata = docMetadata;
      }
    }

    // Add enhanced chunk metadata
    if (options.includeChunkMetadata) {
      expanded.metadata = {
        ...result.metadata,
        expandedContext: true,
        relatedChunkCount: expanded.relatedChunks?.length || 0,
        expansionOptions: options,
      };
    }

    expandedResults.push(expanded);
  }

  return expandedResults;
}

async function getRelatedChunks(
  result: SearchResult,
  options: ContextExpansionOptions,
  userID: string
): Promise<SearchResult[]> {
  const radius = options.relatedChunkRadius || 1;
  const maxChunks = options.maxRelatedChunks || 2;

  try {
    // Query for chunks from the same document within the specified radius
    const chunks = await db
      .select({
        id: documentChunks.id,
        content: documentChunks.content,
        chunkIndex: documentChunks.chunkIndex,
        metadata: documentChunks.metadata,
        documentID: documentChunks.documentId,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(
        and(
          eq(documentChunks.documentId, result.documentID),
          eq(documents.userId, userID),
          // Find chunks within radius, excluding the current chunk
          sql`${documentChunks.chunkIndex} BETWEEN ${result.metadata.chunkIndex - radius} AND ${result.metadata.chunkIndex + radius}`,
          sql`${documentChunks.id} != ${result.id}`
        )
      )
      .orderBy(sql`ABS(${documentChunks.chunkIndex} - ${result.metadata.chunkIndex})`)
      .limit(maxChunks);

    return chunks.map((chunk) => ({
      id: chunk.id,
      documentID: chunk.documentID,
      content: chunk.content,
      score: 0.8, // Related chunks get a default relevance score
      metadata: {
        filename: result.metadata.filename,
        chunkIndex: chunk.chunkIndex,
        ...(chunk.metadata as Record<string, any>),
      },
    }));
  } catch (error) {
    console.error("Error fetching related chunks:", error);
    return [];
  }
}

async function getDocumentMetadata(
  documentID: string,
  userID: string
): Promise<Record<string, any> | null> {
  try {
    const doc = await db
      .select({
        filename: documents.filename,
        originalName: documents.originalName,
        uploadedAt: documents.uploadedAt,
        fileSize: documents.fileSize,
        contentType: documents.contentType,
        status: documents.status,
        processedAt: documents.processedAt,
        chunkCount: documents.chunkCount,
        metadata: documents.metadata,
      })
      .from(documents)
      .where(and(eq(documents.id, documentID), eq(documents.userId, userID)))
      .limit(1);

    if (doc.length === 0) {
      return null;
    }

    return {
      filename: doc[0].filename,
      originalName: doc[0].originalName,
      uploadedAt: doc[0].uploadedAt,
      fileSize: doc[0].fileSize,
      contentType: doc[0].contentType,
      status: doc[0].status,
      processedAt: doc[0].processedAt,
      chunkCount: doc[0].chunkCount,
      ...(doc[0].metadata as Record<string, any>),
    };
  } catch (error) {
    console.error("Error fetching document metadata:", error);
    return null;
  }
}

// Hybrid search combining vector and full-text search
async function performHybridSearch(
  query: string,
  userID: string,
  documentIDs?: string[],
  limit = 20,
  threshold = 0.7,
  vectorWeight = 0.7,
  ftsWeight = 0.3
): Promise<SearchResult[]> {
  try {
    console.log(`Performing hybrid search: "${query}" for user ${userID}`);

    // Generate embedding for vector search
    const queryEmbedding = await generateQueryEmbedding(query);

    // Perform both searches in parallel
    const [vectorResults, ftsResults] = await Promise.all([
      performVectorSearch(queryEmbedding, userID, documentIDs, limit * 2, threshold),
      performFullTextSearch(query, userID, documentIDs, limit * 2),
    ]);

    console.log(
      `Vector search found ${vectorResults.length} results, FTS found ${ftsResults.length} results`
    );

    // Combine and deduplicate results
    const combinedResults = new Map<string, SearchResult>();

    // Add vector results with weighted scores
    for (const result of vectorResults) {
      combinedResults.set(result.id, {
        ...result,
        score: result.score * vectorWeight,
      });
    }

    // Add FTS results, combining scores for duplicates
    for (const result of ftsResults) {
      const existing = combinedResults.get(result.id);
      if (existing) {
        // Combine scores from both search types
        existing.score = existing.score + result.score * ftsWeight;
      } else {
        combinedResults.set(result.id, {
          ...result,
          score: result.score * ftsWeight,
        });
      }
    }

    // Convert to array, sort by combined score, and limit results
    const finalResults = Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`Hybrid search combined to ${finalResults.length} final results`);
    return finalResults;
  } catch (error) {
    console.error("Hybrid search error:", error);
    throw new Error(
      `Hybrid search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Enhanced search endpoint with filtering and context expansion
export const enhancedSearch = api(
  { expose: true, method: "POST", path: "/search/enhanced" },
  async (req: ExpandedSearchRequest): Promise<ExpandedSearchResponse> => {
    const advancedSearchStartTime = Date.now();
    const startTime = Date.now();

    try {
      // Validate request
      const validatedReq = req as ExpandedSearchRequest;

      MetricHelpers.trackSearchRequest("enhanced", validatedReq.enableReranking || false);

      logger.info("Enhanced search request received", {
        query: validatedReq.query.substring(0, 100),
        userID: validatedReq.userID,
        searchType: validatedReq.searchType || "hybrid",
        enableReranking: validatedReq.enableReranking,
        hasFilters: !!validatedReq.filters,
        hasContextExpansion: !!validatedReq.contextExpansion,
        limit: validatedReq.limit,
      });

      // Perform base search (default to hybrid)
      const searchType = validatedReq.searchType || "hybrid";
      let results: SearchResult[];

      logger.info("Starting base search", {
        searchType,
        query: validatedReq.query.substring(0, 100),
      });

      switch (searchType) {
        case "vector":
          // Generate embedding for the query first
          const queryEmbedding = await generateQueryEmbedding(validatedReq.query);
          results = await performVectorSearch(
            queryEmbedding,
            validatedReq.userID,
            validatedReq.documentIDs,
            validatedReq.limit,
            validatedReq.threshold
          );
          break;
        case "fulltext":
          results = await performFullTextSearch(
            validatedReq.query,
            validatedReq.userID,
            validatedReq.documentIDs,
            validatedReq.limit
          );
          break;
        case "hybrid":
        default:
          results = await performHybridSearch(
            validatedReq.query,
            validatedReq.userID,
            validatedReq.documentIDs,
            validatedReq.limit,
            validatedReq.threshold
          );
          break;
      }

      logger.info("Base search completed", {
        searchType,
        resultCount: results.length,
        query: validatedReq.query.substring(0, 100),
      });

      // Apply reranking if enabled
      if (validatedReq.enableReranking) {
        logger.info("Applying reranking to enhanced search results", {
          inputResults: results.length,
          query: validatedReq.query.substring(0, 100),
        });
        results = await rerankWithCohere(validatedReq.query, results, validatedReq.limit);
        logger.info("Reranking completed", {
          resultCount: results.length,
          query: validatedReq.query.substring(0, 100),
        });
      }

      // Apply filters
      if (validatedReq.filters) {
        const preFilterCount = results.length;
        results = await applyFilters(results, validatedReq.filters);
        logger.info("Filtering completed", {
          preFilterCount,
          postFilterCount: results.length,
          filtersApplied: Object.keys(validatedReq.filters).length,
          query: validatedReq.query.substring(0, 100),
        });
      }

      // Apply context expansion
      let expandedResultsCount = 0;
      if (validatedReq.contextExpansion) {
        logger.info("Starting context expansion", {
          inputResults: results.length,
          includeRelatedChunks: validatedReq.contextExpansion.includeRelatedChunks,
          maxRelatedChunks: validatedReq.contextExpansion.maxRelatedChunks,
          query: validatedReq.query.substring(0, 100),
        });
        results = await expandContext(results, validatedReq.contextExpansion, validatedReq.userID);
        expandedResultsCount = results.reduce((sum, r) => sum + (r.relatedChunks?.length || 0), 0);
        logger.info("Context expansion completed", {
          expandedChunks: expandedResultsCount,
          finalResults: results.length,
          query: validatedReq.query.substring(0, 100),
        });
      }

      const processingTime = Date.now() - startTime;
      const durationAdvanced = Date.now() - advancedSearchStartTime;

      MetricHelpers.trackSearchDuration(
        processingTime,
        "enhanced",
        validatedReq.enableReranking || false
      );

      logger.info("Enhanced search completed successfully", {
        query: validatedReq.query.substring(0, 100),
        searchType,
        finalResultCount: results.length,
        expandedChunks: expandedResultsCount,
        processingTime,
        duration: durationAdvanced,
        enableReranking: validatedReq.enableReranking,
        hasFilters: !!validatedReq.filters,
        hasContextExpansion: !!validatedReq.contextExpansion,
      });

      return {
        results,
        totalFound: results.length,
        query: validatedReq.query,
        processingTime,
        appliedFilters: validatedReq.filters,
        expandedResults: expandedResultsCount,
      };
    } catch (error) {
      const durationAdvancedCatch = Date.now() - advancedSearchStartTime;
      logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "Enhanced search failed",
        {
          query: req.query?.substring(0, 100),
          userID: req.userID,
          searchType: req.searchType,
          duration: durationAdvancedCatch,
        }
      );
      recordError(
        "search",
        "ENHANCED_SEARCH_FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw new Error(
        `Enhanced search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
