import { and, desc, eq, gte, sql } from "drizzle-orm";
import { api } from "encore.dev/api";
import type { APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { db } from "../db/connection";
import { documentChunks, documents } from "../db/schema";
import { CacheManager } from "../lib/cache/cache-manager";
import { EmbeddingCache } from "../lib/cache/embedding-cache";
import { MetricHelpers, recordError } from "../lib/monitoring/metrics";
import { mastraRAGService, type DocumentChunk } from "../lib/mastra/rag-service";

const logger = log.with({ service: "search-mastra-service" });

// Initialize cache managers
const searchCache = new CacheManager();
const embeddingCache = new EmbeddingCache(searchCache);

// Enhanced request and response interfaces for Mastra integration
export interface MastraSearchRequest {
  query: string;
  userID: string;
  documentIDs?: string[]; // Optional: search within specific documents
  limit?: number;
  threshold?: number; // Similarity threshold (0-1 for cosine similarity)
  searchType?: "vector" | "fulltext" | "hybrid" | "graph"; // Added graph for Mastra Graph RAG
  enableReranking?: boolean; // Whether to apply Cohere reranking
  filters?: {
    documentTypes?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    tags?: string[];
    metadata?: Record<string, any>;
    minScore?: number;
  };
  options?: {
    useGraphRAG?: boolean; // Enable Mastra Graph RAG
    includeContext?: boolean; // Include surrounding context
    maxContextChunks?: number;
    temperature?: number; // For response generation
    systemPrompt?: string;
  };
}

export interface MastraSearchResult {
  id: string;
  content: string;
  score: number;
  documentId: string;
  chunkIndex: number;
  metadata: Record<string, any>;
  contextChunks?: MastraSearchResult[]; // Related chunks for context
}

export interface MastraSearchResponse {
  results: MastraSearchResult[];
  totalFound: number;
  query: string;
  processingTime: number;
  searchType: "vector" | "fulltext" | "hybrid" | "graph";
  retrievalDetails?: {
    retrievalTime: number;
    rerankingTime?: number;
    graphWalkSteps?: number;
    cacheHit?: boolean;
  };
  generatedResponse?: {
    text: string;
    sources: MastraSearchResult[];
    generationTime: number;
    tokensUsed?: number;
  };
}

// Helper function to convert Mastra DocumentChunk to MastraSearchResult
function convertMastraChunkToSearchResult(
  chunk: DocumentChunk, 
  score: number
): MastraSearchResult {
  return {
    id: chunk.id,
    content: chunk.text,
    score,
    documentId: chunk.metadata.documentId,
    chunkIndex: chunk.metadata.chunkIndex,
    metadata: {
      ...chunk.metadata,
      pageNumber: chunk.metadata.pageNumber,
      source: chunk.metadata.source
    }
  };
}

// Helper function to build filters for Mastra
function buildMastraFilters(
  userID: string,
  documentIDs?: string[],
  additionalFilters?: MastraSearchRequest["filters"]
): Record<string, any> {
  const filters: Record<string, any> = {
    // Always filter by user (could be expanded for multi-tenancy)
    // For now, we'll skip user filtering as the current system uses "system"
  };

  if (documentIDs && documentIDs.length > 0) {
    filters.documentId = { $in: documentIDs };
  }

  if (additionalFilters) {
    if (additionalFilters.documentTypes?.length) {
      filters.contentType = { $in: additionalFilters.documentTypes };
    }
    
    if (additionalFilters.dateRange) {
      const dateFilter: any = {};
      if (additionalFilters.dateRange.start) {
        dateFilter.$gte = additionalFilters.dateRange.start.toISOString();
      }
      if (additionalFilters.dateRange.end) {
        dateFilter.$lte = additionalFilters.dateRange.end.toISOString();
      }
      if (Object.keys(dateFilter).length > 0) {
        filters.timestamp = dateFilter;
      }
    }

    if (additionalFilters.tags?.length) {
      filters.tags = { $in: additionalFilters.tags };
    }

    if (additionalFilters.metadata) {
      Object.assign(filters, additionalFilters.metadata);
    }
  }

  return filters;
}

/**
 * Enhanced search using Mastra's vector similarity with optional Graph RAG
 */
export const mastraVectorSearch = api(
  { expose: true, method: "POST", path: "/search/mastra/vector" },
  async (req: MastraSearchRequest): Promise<MastraSearchResponse> => {
    const startTime = Date.now();
    
    try {
      logger.info("Mastra vector search request received", {
        query: req.query.substring(0, 100),
        userID: req.userID,
        limit: req.limit,
        threshold: req.threshold,
        useGraphRAG: req.options?.useGraphRAG,
        documentIDs: req.documentIDs?.length || 0,
      });

      MetricHelpers.trackSearchRequest("vector", req.enableReranking || false);

      // Build filters for Mastra
      const filters = buildMastraFilters(req.userID, req.documentIDs, req.filters);

      // Check cache first
      const cacheKey = `mastra_vector_${JSON.stringify({
        query: req.query,
        limit: req.limit,
        threshold: req.threshold,
        filters,
        useGraphRAG: req.options?.useGraphRAG
      })}`;

      let cacheHit = false;
      let cachedResult = null;

      try {
        cachedResult = await searchCache.get(cacheKey);
        if (cachedResult) {
          cacheHit = true;
          logger.info("Mastra search cache hit", { cacheKey: cacheKey.substring(0, 50) });
        }
      } catch (error) {
        logger.warn("Cache retrieval failed, proceeding with fresh search", { error });
      }

      let results: MastraSearchResult[] = [];
      let retrievalTime = 0;

      if (cachedResult) {
        results = cachedResult.results;
        retrievalTime = cachedResult.retrievalTime;
      } else {
        // Perform Mastra vector search
        const retrievalStart = Date.now();
        const mastraResult = await mastraRAGService.retrieveChunks(req.query, {
          topK: req.limit || 10,
          threshold: req.threshold || 0.7,
          filters,
          useGraphRAG: req.options?.useGraphRAG || false,
          enableReranking: req.enableReranking || false
        });
        retrievalTime = Date.now() - retrievalStart;

        // Convert Mastra results to search results format
        results = mastraResult.chunks.map((chunk, index) =>
          convertMastraChunkToSearchResult(chunk, mastraResult.scores[index] || 0)
        );

        // Cache the results
        try {
          await searchCache.set(cacheKey, { results, retrievalTime }, 300); // 5 min cache
        } catch (error) {
          logger.warn("Failed to cache search results", { error });
        }
      }

      const processingTime = Date.now() - startTime;

      MetricHelpers.trackSearchDuration(processingTime, "vector", req.enableReranking || false);

      logger.info("Mastra vector search completed successfully", {
        query: req.query.substring(0, 100),
        resultCount: results.length,
        processingTime,
        retrievalTime,
        cacheHit,
        useGraphRAG: req.options?.useGraphRAG,
        avgScore: results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0,
      });

      return {
        results,
        totalFound: results.length,
        query: req.query,
        processingTime,
        searchType: req.options?.useGraphRAG ? "graph" : "vector",
        retrievalDetails: {
          retrievalTime,
          cacheHit
        }
      };

    } catch (error) {
      logger.error("Mastra vector search failed", {
        query: req.query.substring(0, 100),
        userID: req.userID,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      recordError(
        "search",
        "MASTRA_VECTOR_SEARCH_FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );

      throw new Error(
        `Mastra vector search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Complete RAG workflow using Mastra - search + generate response
 */
export const mastraRAGSearch = api(
  { expose: true, method: "POST", path: "/search/mastra/rag" },
  async (req: MastraSearchRequest): Promise<MastraSearchResponse> => {
    const startTime = Date.now();
    
    try {
      logger.info("Mastra RAG search request received", {
        query: req.query.substring(0, 100),
        userID: req.userID,
        limit: req.limit,
        useGraphRAG: req.options?.useGraphRAG,
        documentIDs: req.documentIDs?.length || 0,
      });

      MetricHelpers.trackSearchRequest("hybrid", true); // RAG combines search + generation

      // Build filters for Mastra
      const filters = buildMastraFilters(req.userID, req.documentIDs, req.filters);

      // Step 1: Retrieve relevant chunks using Mastra
      const retrievalStart = Date.now();
      const mastraResult = await mastraRAGService.retrieveChunks(req.query, {
        topK: req.limit || 10,
        threshold: req.threshold || 0.7,
        filters,
        useGraphRAG: req.options?.useGraphRAG || false,
        enableReranking: req.enableReranking || false
      });
      const retrievalTime = Date.now() - retrievalStart;

      if (mastraResult.chunks.length === 0) {
        logger.info("No relevant chunks found for RAG query", {
          query: req.query.substring(0, 100)
        });

        return {
          results: [],
          totalFound: 0,
          query: req.query,
          processingTime: Date.now() - startTime,
          searchType: req.options?.useGraphRAG ? "graph" : "vector",
          retrievalDetails: {
            retrievalTime,
            cacheHit: false
          },
          generatedResponse: {
            text: "I couldn't find any relevant information to answer your question.",
            sources: [],
            generationTime: 0
          }
        };
      }

      // Step 2: Generate response using Mastra
      const generationStart = Date.now();
      const generationResult = await mastraRAGService.generateResponse(
        req.query,
        mastraResult.chunks,
        {
          systemPrompt: req.options?.systemPrompt,
          temperature: req.options?.temperature,
          maxTokens: 1000
        }
      );
      const generationTime = Date.now() - generationStart;

      // Convert results to search format
      const results = mastraResult.chunks.map((chunk, index) =>
        convertMastraChunkToSearchResult(chunk, mastraResult.scores[index] || 0)
      );

      const processingTime = Date.now() - startTime;

      MetricHelpers.trackSearchDuration(processingTime, "hybrid", true);

      logger.info("Mastra RAG search completed successfully", {
        query: req.query.substring(0, 100),
        resultCount: results.length,
        processingTime,
        retrievalTime,
        generationTime,
        useGraphRAG: req.options?.useGraphRAG,
        responseLength: generationResult.response.length
      });

      return {
        results,
        totalFound: results.length,
        query: req.query,
        processingTime,
        searchType: req.options?.useGraphRAG ? "graph" : "vector",
        retrievalDetails: {
          retrievalTime,
          cacheHit: false
        },
        generatedResponse: {
          text: generationResult.response,
          sources: results,
          generationTime,
          tokensUsed: generationResult.tokensUsed
        }
      };

    } catch (error) {
      logger.error("Mastra RAG search failed", {
        query: req.query.substring(0, 100),
        userID: req.userID,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      recordError(
        "search",
        "MASTRA_RAG_SEARCH_FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );

      throw new Error(
        `Mastra RAG search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Hybrid search combining Mastra vector search with traditional full-text search
 */
export const mastraHybridSearch = api(
  { expose: true, method: "POST", path: "/search/mastra/hybrid" },
  async (req: MastraSearchRequest): Promise<MastraSearchResponse> => {
    const startTime = Date.now();
    
    try {
      logger.info("Mastra hybrid search request received", {
        query: req.query.substring(0, 100),
        userID: req.userID,
        limit: req.limit,
        threshold: req.threshold,
        documentIDs: req.documentIDs?.length || 0,
      });

      MetricHelpers.trackSearchRequest("hybrid", req.enableReranking || false);

      // Build filters for Mastra
      const filters = buildMastraFilters(req.userID, req.documentIDs, req.filters);

      const retrievalStart = Date.now();

      // Perform Mastra vector search
      const vectorResults = await mastraRAGService.retrieveChunks(req.query, {
        topK: Math.ceil((req.limit || 10) * 0.7), // 70% from vector search
        threshold: req.threshold || 0.7,
        filters,
        useGraphRAG: false, // Keep hybrid search simple
        enableReranking: req.enableReranking || false
      });

      // Perform traditional full-text search for remaining results
      const remainingLimit = (req.limit || 10) - vectorResults.chunks.length;
      let fullTextResults: MastraSearchResult[] = [];

      if (remainingLimit > 0) {
        // Build SQL query for full-text search
        let query = db
          .select({
            id: documentChunks.id,
            content: documentChunks.content,
            documentId: documentChunks.documentId,
            chunkIndex: documentChunks.chunkIndex,
            metadata: documentChunks.metadata,
            score: sql<number>`ts_rank(to_tsvector('english', ${documentChunks.content}), plainto_tsquery('english', ${req.query}))`,
          })
          .from(documentChunks)
          .where(
            and(
              sql`to_tsvector('english', ${documentChunks.content}) @@ plainto_tsquery('english', ${req.query})`,
              req.documentIDs && req.documentIDs.length > 0
                ? sql`${documentChunks.documentId} = ANY(${req.documentIDs})`
                : undefined
            )
          )
          .orderBy(desc(sql`ts_rank(to_tsvector('english', ${documentChunks.content}), plainto_tsquery('english', ${req.query}))`))
          .limit(remainingLimit);

        const ftsResults = await query;

        fullTextResults = ftsResults.map(row => ({
          id: row.id,
          content: row.content,
          score: row.score,
          documentId: row.documentId,
          chunkIndex: row.chunkIndex,
          metadata: {
            filename: (row.metadata as any)?.filename || 'unknown',
            pageNumber: (row.metadata as any)?.pageNumber,
            source: (row.metadata as any)?.source,
            timestamp: (row.metadata as any)?.timestamp || new Date().toISOString(),
            ...(row.metadata as any)
          }
        }));
      }

      const retrievalTime = Date.now() - retrievalStart;

      // Combine and deduplicate results
      const vectorSearchResults = vectorResults.chunks.map((chunk, index) =>
        convertMastraChunkToSearchResult(chunk, vectorResults.scores[index] || 0)
      );

      const combinedResults = [...vectorSearchResults];
      const existingIds = new Set(vectorSearchResults.map(r => r.id));

      // Add full-text results that aren't already included
      for (const ftsResult of fullTextResults) {
        if (!existingIds.has(ftsResult.id)) {
          combinedResults.push(ftsResult);
        }
      }

      // Sort by score and limit results
      const finalResults = combinedResults
        .sort((a, b) => b.score - a.score)
        .slice(0, req.limit || 10);

      const processingTime = Date.now() - startTime;

      MetricHelpers.trackSearchDuration(processingTime, "hybrid", req.enableReranking || false);

      logger.info("Mastra hybrid search completed successfully", {
        query: req.query.substring(0, 100),
        resultCount: finalResults.length,
        vectorResults: vectorSearchResults.length,
        fullTextResults: fullTextResults.length,
        processingTime,
        retrievalTime,
        avgScore: finalResults.length > 0 ? finalResults.reduce((sum, r) => sum + r.score, 0) / finalResults.length : 0,
      });

      return {
        results: finalResults,
        totalFound: finalResults.length,
        query: req.query,
        processingTime,
        searchType: "hybrid",
        retrievalDetails: {
          retrievalTime,
          cacheHit: false
        }
      };

    } catch (error) {
      logger.error("Mastra hybrid search failed", {
        query: req.query.substring(0, 100),
        userID: req.userID,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      recordError(
        "search",
        "MASTRA_HYBRID_SEARCH_FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );

      throw new Error(
        `Mastra hybrid search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Get search suggestions based on query using Mastra
 */
export const mastraSearchSuggestions = api(
  { expose: true, method: "POST", path: "/search/mastra/suggestions" },
  async (req: { 
    query: string; 
    userID: string; 
    limit?: number; 
    documentIDs?: string[];
  }): Promise<{
    suggestions: string[];
    processingTime: number;
  }> => {
    const startTime = Date.now();
    
    try {
      logger.info("Mastra search suggestions request received", {
        query: req.query.substring(0, 100),
        userID: req.userID,
        limit: req.limit
      });

      // Get similar chunks to generate suggestions
      const filters = buildMastraFilters(req.userID, req.documentIDs);
      
      const mastraResult = await mastraRAGService.retrieveChunks(req.query, {
        topK: 20, // Get more results for better suggestions
        threshold: 0.5, // Lower threshold for suggestions
        filters
      });

      // Extract key phrases and topics from results for suggestions
      const suggestions: string[] = [];
      const seenSuggestions = new Set<string>();

      for (const chunk of mastraResult.chunks.slice(0, req.limit || 5)) {
        // Extract potential search terms from chunk content
        const words = chunk.text
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3);

        // Simple extraction of meaningful phrases
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = `${words[i]} ${words[i + 1]}`;
          if (!seenSuggestions.has(phrase) && phrase.includes(req.query.toLowerCase().split(' ')[0])) {
            suggestions.push(phrase);
            seenSuggestions.add(phrase);
            if (suggestions.length >= (req.limit || 5)) break;
          }
        }
        if (suggestions.length >= (req.limit || 5)) break;
      }

      const processingTime = Date.now() - startTime;

      logger.info("Mastra search suggestions completed", {
        query: req.query.substring(0, 100),
        suggestionsCount: suggestions.length,
        processingTime
      });

      return {
        suggestions,
        processingTime
      };

    } catch (error) {
      logger.error("Mastra search suggestions failed", {
        query: req.query.substring(0, 100),
        userID: req.userID,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        suggestions: [],
        processingTime: Date.now() - startTime
      };
    }
  }
);