import { api } from "encore.dev/api";
import type { APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { z } from "zod";
import { db } from "../db/connection";
import { documentChunks, documents } from "../db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

// Encore secret for Cohere API key
const cohereApiKey = secret("CohereApiKey");

// Validation schemas
export const SearchRequestSchema = z.object({
  query: z.string().min(1, "Query cannot be empty").max(1000, "Query too long"),
  userID: z.string().min(1, "User ID required"),
  documentIDs: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7),
  searchType: z.enum(["vector", "fulltext", "hybrid"]).optional().default("hybrid"),
  enableReranking: z.boolean().optional().default(true),
});

export const SearchFilterSchema = z.object({
  documentTypes: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

export const ContextExpansionOptionsSchema = z.object({
  includeRelatedChunks: z.boolean().optional().default(false),
  maxRelatedChunks: z.number().int().min(1).max(10).optional().default(2),
  relatedChunkRadius: z.number().int().min(0).max(5).optional().default(1),
  includeDocumentMetadata: z.boolean().optional().default(false),
  includeChunkMetadata: z.boolean().optional().default(false),
});

export const ExpandedSearchRequestSchema = SearchRequestSchema.extend({
  filters: SearchFilterSchema.optional(),
  contextExpansion: ContextExpansionOptionsSchema.optional(),
});

// Types
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

export interface SearchResult {
  id: string;
  documentID: string;
  content: string;
  score: number;
  metadata: {
    filename: string;
    pageNumber?: number;
    chunkIndex: number;
    [key: string]: any; // Allow additional metadata
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
  try {
    if (results.length === 0) {
      console.log("No results to rerank");
      return results;
    }

    const apiKey = await cohereApiKey();
    
    // Prepare documents for reranking
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
      top_n: topN || Math.min(results.length, 20), // Limit to top 20 by default
      model: "rerank-english-v3.0",
      return_documents: true,
    };

    console.log(`Reranking ${results.length} results with query: "${query}"`);
    
    const response = await fetch("https://api.cohere.ai/v1/rerank", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cohere rerank API error (${response.status}): ${errorText}`);
    }

    const data: CohereRerankResponse = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log("No reranked results returned from Cohere API");
      return results;
    }

    // Map reranked results back to original SearchResult format
    const rerankedResults: SearchResult[] = data.results.map(rerankResult => {
      const originalIndex = rerankResult.document?.metadata?.originalIndex;
      const originalResult = results[originalIndex];
      
      if (!originalResult) {
        throw new Error(`Invalid original index ${originalIndex} in rerank results`);
      }

      return {
        ...originalResult,
        score: rerankResult.relevance_score, // Replace with Cohere relevance score
      };
    });

    console.log(`Reranking completed: ${rerankedResults.length} results reordered`);
    return rerankedResults;
    
  } catch (error) {
    console.error("Error reranking results with Cohere:", error);
    // Fall back to original results if reranking fails
    console.log("Falling back to original result ordering");
    return results;
  }
}

// Helper function to generate embeddings using Cohere
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const apiKey = await cohereApiKey();
    
    const requestBody: CohereEmbedRequest = {
      texts: [query],
      model: "embed-english-v3.0", // Using v3.0 for search queries
      input_type: "search_query"
    };

    console.log(`Generating embedding for query: "${query}"`);
    
    const response = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cohere API error (${response.status}): ${errorText}`);
    }

    const data: CohereEmbedResponse = await response.json();
    
    if (!data.embeddings || data.embeddings.length === 0) {
      throw new Error("No embeddings returned from Cohere API");
    }

    console.log(`Generated embedding with ${data.embeddings[0].length} dimensions`);
    return data.embeddings[0];
    
  } catch (error) {
    console.error("Error generating query embedding:", error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to perform full-text search
async function performFullTextSearch(
  query: string,
  userID: string,
  documentIDs?: string[],
  limit: number = 20
): Promise<SearchResult[]> {
  try {
    console.log(`Performing full-text search for: "${query}"`);
    
    // Escape special characters for tsquery
    const sanitizedQuery = query
      .replace(/[&|!()]/g, ' ') // Remove special FTS characters
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
    
    if (!sanitizedQuery) {
      console.log("Empty query after sanitization");
      return [];
    }
    
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

    // Add user access control
    baseQuery = baseQuery.where(eq(documents.userId, userID));

    // Add document ID filtering if specified
    if (documentIDs && documentIDs.length > 0) {
      baseQuery = baseQuery.where(sql`${documentChunks.documentId} = ANY(${documentIDs})`);
    }

    // Add full-text search matching and ordering
    const results = await baseQuery
      .where(sql`to_tsvector('english', ${documentChunks.content}) @@ plainto_tsquery('english', ${sanitizedQuery})`)
      .orderBy(desc(sql`ts_rank(to_tsvector('english', ${documentChunks.content}), plainto_tsquery('english', ${sanitizedQuery}))`))
      .limit(limit);

    console.log(`Full-text search returned ${results.length} results`);

    return results.map(result => ({
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
    
  } catch (error) {
    console.error("Error performing full-text search:", error);
    throw new Error(`Full-text search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to perform vector similarity search
async function performVectorSearch(
  queryEmbedding: number[],
  userID: string,
  documentIDs?: string[],
  limit: number = 20,
  threshold: number = 0.7
): Promise<SearchResult[]> {
  try {
    console.log(`Performing vector search with threshold ${threshold}, limit ${limit}`);
    
    // Build base query
    let baseQuery = db
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

    // Add user access control
    baseQuery = baseQuery.where(eq(documents.userId, userID));

    // Add document ID filtering if specified
    if (documentIDs && documentIDs.length > 0) {
      baseQuery = baseQuery.where(sql`${documentChunks.documentId} = ANY(${documentIDs})`);
    }

    // Add similarity threshold and ordering
    const results = await baseQuery
      .where(gte(sql`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`, threshold))
      .orderBy(desc(sql`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`))
      .limit(limit);

    console.log(`Vector search returned ${results.length} results`);

    return results.map(result => ({
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
    
  } catch (error) {
    console.error("Error performing vector search:", error);
    throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to combine and deduplicate search results
function combineSearchResults(
  vectorResults: SearchResult[],
  fullTextResults: SearchResult[],
  vectorWeight: number = 0.7,
  fullTextWeight: number = 0.3
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

// Hybrid search endpoint (vector + full-text)
export const hybridSearch = api(
  { expose: true, method: "POST", path: "/search/hybrid" },
  async (req: SearchRequest): Promise<SearchResponse> => {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedReq = SearchRequestSchema.parse(req);
      
      console.log(`Hybrid search request: "${validatedReq.query}" for user ${validatedReq.userID}`);
      
      // Perform both vector and full-text searches in parallel
      const [queryEmbedding, fullTextResults] = await Promise.all([
        generateQueryEmbedding(validatedReq.query),
        performFullTextSearch(
          validatedReq.query,
          validatedReq.userID,
          validatedReq.documentIDs,
          validatedReq.limit
        )
      ]);
      
      // Perform vector similarity search
      const vectorResults = await performVectorSearch(
        queryEmbedding,
        validatedReq.userID,
        validatedReq.documentIDs,
        validatedReq.limit,
        validatedReq.threshold
      );
      
      // Combine results with weighted scoring
      let combinedResults = combineSearchResults(vectorResults, fullTextResults);
      
      // Apply Cohere reranking to improve relevance if enabled
      if (validatedReq.enableReranking && combinedResults.length > 1) {
        combinedResults = await rerankWithCohere(
          validatedReq.query,
          combinedResults,
          validatedReq.limit
        );
      } else {
        // Just limit results if not reranking
        combinedResults = combinedResults.slice(0, validatedReq.limit);
      }
      
      const finalResults = combinedResults;

      const processingTime = Date.now() - startTime;
      console.log(`Hybrid search completed in ${processingTime}ms, found ${finalResults.length} results (${vectorResults.length} vector, ${fullTextResults.length} full-text)`);

      return {
        results: finalResults,
        totalFound: finalResults.length,
        query: validatedReq.query,
        processingTime,
        searchType: "hybrid",
      };
      
    } catch (error) {
      console.error("Hybrid search error:", error);
      throw new Error(`Hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Vector search endpoint
export const vectorSearch = api(
  { expose: true, method: "POST", path: "/search/vector" },
  async (req: SearchRequest): Promise<SearchResponse> => {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedReq = SearchRequestSchema.parse(req);
      
      console.log(`Vector search request: "${validatedReq.query}" for user ${validatedReq.userID}`);
      
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
        results = await rerankWithCohere(validatedReq.query, results, validatedReq.limit);
      }

      const processingTime = Date.now() - startTime;
      console.log(`Vector search completed in ${processingTime}ms, found ${results.length} results`);

      return {
        results,
        totalFound: results.length,
        query: validatedReq.query,
        processingTime,
        searchType: "vector",
      };
      
    } catch (error) {
      console.error("Vector search error:", error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Full-text search endpoint
export const fullTextSearch = api(
  { expose: true, method: "POST", path: "/search/fulltext" },
  async (req: SearchRequest): Promise<SearchResponse> => {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedReq = SearchRequestSchema.parse(req);
      
      console.log(`Full-text search request: "${validatedReq.query}" for user ${validatedReq.userID}`);
      
      // Perform full-text search using PostgreSQL FTS
      const results = await performFullTextSearch(
        validatedReq.query,
        validatedReq.userID,
        validatedReq.documentIDs,
        validatedReq.limit
      );

      const processingTime = Date.now() - startTime;
      console.log(`Full-text search completed in ${processingTime}ms, found ${results.length} results`);

      return {
        results,
        totalFound: results.length,
        query: validatedReq.query,
        processingTime,
        searchType: "fulltext",
      };
      
    } catch (error) {
      console.error("Full-text search error:", error);
      throw new Error(`Full-text search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Context expansion and filtering helper functions
async function applyFilters(results: SearchResult[], filters: SearchFilter): Promise<SearchResult[]> {
  return results.filter(result => {
    // Document type filter
    if (filters.documentTypes && filters.documentTypes.length > 0) {
      if (!result.documentType || !filters.documentTypes.includes(result.documentType)) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange) {
      if (filters.dateRange.start && result.createdAt && result.createdAt < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && result.createdAt && result.createdAt > filters.dateRange.end) {
        return false;
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(filterTag => 
        result.tags?.includes(filterTag)
      );
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
        documentID: documentChunks.documentID,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentID, documents.id))
      .where(
        and(
          eq(documentChunks.documentID, result.documentID),
          eq(documents.userID, userID),
          // Find chunks within radius, excluding the current chunk
          sql`${documentChunks.chunkIndex} BETWEEN ${result.metadata.chunkIndex - radius} AND ${result.metadata.chunkIndex + radius}`,
          sql`${documentChunks.id} != ${result.id}`
        )
      )
      .orderBy(sql`ABS(${documentChunks.chunkIndex} - ${result.metadata.chunkIndex})`)
      .limit(maxChunks);

    return chunks.map(chunk => ({
      id: chunk.id,
      documentID: chunk.documentID,
      content: chunk.content,
      score: 0.8, // Related chunks get a default relevance score
      metadata: {
        filename: result.metadata.filename,
        chunkIndex: chunk.chunkIndex,
        ...chunk.metadata as Record<string, any>,
      },
    }));

  } catch (error) {
    console.error("Error fetching related chunks:", error);
    return [];
  }
}

async function getDocumentMetadata(documentID: string, userID: string): Promise<Record<string, any> | null> {
  try {
    const doc = await db
      .select({
        title: documents.title,
        filename: documents.filename,
        uploadedAt: documents.uploadedAt,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        metadata: documents.metadata,
      })
      .from(documents)
      .where(and(eq(documents.id, documentID), eq(documents.userID, userID)))
      .limit(1);

    if (doc.length === 0) {
      return null;
    }

    return {
      title: doc[0].title,
      filename: doc[0].filename,
      uploadedAt: doc[0].uploadedAt,
      fileSize: doc[0].fileSize,
      mimeType: doc[0].mimeType,
      ...doc[0].metadata as Record<string, any>,
    };

  } catch (error) {
    console.error("Error fetching document metadata:", error);
    return null;
  }
}

// Enhanced search endpoint with filtering and context expansion
export const enhancedSearch = api(
  { expose: true, method: "POST", path: "/search/enhanced" },
  async (req: ExpandedSearchRequest): Promise<ExpandedSearchResponse> => {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedReq = ExpandedSearchRequestSchema.parse(req);
      
      console.log(`Enhanced search request: "${validatedReq.query}" for user ${validatedReq.userID}`);
      
      // Perform base search (default to hybrid)
      const searchType = validatedReq.searchType || "hybrid";
      let results: SearchResult[];

      switch (searchType) {
        case "vector":
          results = await performVectorSearch(
            validatedReq.query,
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

      console.log(`Base search found ${results.length} results`);

      // Apply reranking if enabled
      if (validatedReq.enableReranking) {
        results = await rerankWithCohere(validatedReq.query, results);
        console.log(`Reranking completed, ${results.length} results after reranking`);
      }

      // Apply filters
      if (validatedReq.filters) {
        results = await applyFilters(results, validatedReq.filters);
        console.log(`Filtering completed, ${results.length} results after filtering`);
      }

      // Apply context expansion
      let expandedResultsCount = 0;
      if (validatedReq.contextExpansion) {
        results = await expandContext(results, validatedReq.contextExpansion, validatedReq.userID);
        expandedResultsCount = results.reduce((sum, r) => sum + (r.relatedChunks?.length || 0), 0);
        console.log(`Context expansion completed, added ${expandedResultsCount} related chunks`);
      }

      const processingTime = Date.now() - startTime;
      console.log(`Enhanced search completed in ${processingTime}ms, final result count: ${results.length}`);

      return {
        results,
        totalFound: results.length,
        query: validatedReq.query,
        processingTime,
        appliedFilters: validatedReq.filters,
        expandedResults: expandedResultsCount,
      };
      
    } catch (error) {
      console.error("Enhanced search error:", error);
      throw new Error(`Enhanced search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
