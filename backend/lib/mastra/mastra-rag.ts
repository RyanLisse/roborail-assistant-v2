import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { 
  mastraRAGService, 
  ProcessDocumentRequest, 
  ProcessDocumentResponse,
  RetrievalResult
} from './rag-service';

// Simplified DocumentChunk for API (without index signatures)
export interface APIDocumentChunk {
  id: string;
  text: string;
  metadata: {
    documentId: string;
    filename: string;
    chunkIndex: number;
    pageNumber?: number;
    source?: string;
    timestamp: string;
  };
}
import { checkMastraHealth } from './config';

const logger = log.with({ service: "mastra-rag-api" });

// Request/Response interfaces for API endpoints
export interface ProcessDocumentAPIRequest {
  content: string;
  filename: string;
  documentId: string;
}

export interface ProcessDocumentAPIResponse {
  success: boolean;
  data?: ProcessDocumentResponse;
  error?: string;
}

export interface SearchChunksRequest {
  query: string;
  topK?: number;
  threshold?: number;
  useGraphRAG?: boolean;
}

export interface SearchChunksResponse {
  success: boolean;
  chunks?: APIDocumentChunk[];
  scores?: number[];
  query?: string;
  totalFound?: number;
  retrievalType?: string;
  processingTime?: number;
  error?: string;
}

export interface GenerateRAGResponseRequest {
  query: string;
  chunks: APIDocumentChunk[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateRAGResponseResponse {
  success: boolean;
  data?: {
    response: string;
    chunksUsed: number;
    tokensUsed?: number;
  };
  error?: string;
}

export interface DeleteDocumentRequest {
  documentId: string;
}

export interface DeleteDocumentResponse {
  success: boolean;
  data?: { deletedCount: number };
  error?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  components: Record<string, boolean>;
  error?: string;
  timestamp: string;
}

/**
 * Process a document using Mastra RAG pipeline
 * Chunks the document, generates embeddings, and stores in vector database
 */
export const processDocument = api(
  { method: "POST", path: "/mastra/process-document", auth: false },
  async (req: ProcessDocumentAPIRequest): Promise<ProcessDocumentAPIResponse> => {
    try {
      logger.info("Processing document via Mastra API", {
        documentId: req.documentId,
        filename: req.filename,
        contentLength: req.content.length
      });

      const result = await mastraRAGService.processDocument(req);

      logger.info("Document processed successfully via Mastra API", {
        documentId: req.documentId,
        chunksCreated: result.chunksCreated,
        processingTime: result.processingTime
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error("Document processing failed via Mastra API", {
        documentId: req.documentId,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
);

/**
 * Search for relevant document chunks using vector similarity
 */
export const searchChunks = api(
  { method: "POST", path: "/mastra/search", auth: false },
  async (req: SearchChunksRequest): Promise<SearchChunksResponse> => {
    try {
      logger.info("Searching chunks via Mastra API", {
        query: req.query.substring(0, 100),
        topK: req.topK,
        useGraphRAG: req.useGraphRAG
      });

      const result = await mastraRAGService.retrieveChunks(req.query, {
        topK: req.topK,
        threshold: req.threshold,
        useGraphRAG: req.useGraphRAG
      });

      logger.info("Chunks retrieved successfully via Mastra API", {
        totalFound: result.totalFound,
        retrievalType: result.retrievalType,
        processingTime: result.processingTime
      });

      // Convert to API-safe format
      const apiChunks: APIDocumentChunk[] = result.chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        metadata: {
          documentId: chunk.metadata.documentId,
          filename: chunk.metadata.filename,
          chunkIndex: chunk.metadata.chunkIndex,
          pageNumber: chunk.metadata.pageNumber,
          source: chunk.metadata.source,
          timestamp: chunk.metadata.timestamp
        }
      }));

      return {
        success: true,
        chunks: apiChunks,
        scores: result.scores,
        query: result.query,
        totalFound: result.totalFound,
        retrievalType: result.retrievalType,
        processingTime: result.processingTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error("Chunk search failed via Mastra API", {
        query: req.query.substring(0, 100),
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
);

/**
 * Generate a response using RAG (Retrieval Augmented Generation)
 */
export const generateResponse = api(
  { method: "POST", path: "/mastra/generate", auth: false },
  async (req: GenerateRAGResponseRequest): Promise<GenerateRAGResponseResponse> => {
    try {
      logger.info("Generating RAG response via Mastra API", {
        query: req.query.substring(0, 100),
        chunksProvided: req.chunks.length,
        maxTokens: req.maxTokens
      });

      const result = await mastraRAGService.generateResponse(req.query, req.chunks, {
        systemPrompt: req.systemPrompt,
        maxTokens: req.maxTokens,
        temperature: req.temperature
      });

      logger.info("RAG response generated successfully via Mastra API", {
        chunksUsed: result.chunksUsed,
        responseLength: result.response.length,
        tokensUsed: result.tokensUsed
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error("RAG response generation failed via Mastra API", {
        query: req.query.substring(0, 100),
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
);

/**
 * Delete a document and all its chunks from the vector database
 */
export const deleteDocument = api(
  { method: "DELETE", path: "/mastra/document/:documentId", auth: false },
  async ({ documentId }: { documentId: string }): Promise<DeleteDocumentResponse> => {
    try {
      logger.info("Deleting document via Mastra API", { documentId });

      const result = await mastraRAGService.deleteDocument(documentId);

      logger.info("Document deleted successfully via Mastra API", {
        documentId,
        deletedCount: result.deletedCount
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error("Document deletion failed via Mastra API", {
        documentId,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
);

/**
 * Health check endpoint for Mastra RAG system
 */
export const healthCheck = api(
  { method: "GET", path: "/mastra/health", auth: false },
  async (): Promise<HealthCheckResponse> => {
    try {
      logger.debug("Performing Mastra health check");

      const health = await checkMastraHealth();

      return {
        ...health,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error("Mastra health check failed", { error: errorMessage });

      return {
        status: 'unhealthy',
        components: {},
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }
);

/**
 * Complete RAG workflow - combines search and generation
 */
export const ragWorkflow = api(
  { method: "POST", path: "/mastra/rag", auth: false },
  async (req: {
    query: string;
    topK?: number;
    threshold?: number;
    filters?: Record<string, any>;
    useGraphRAG?: boolean;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    success: boolean;
    data?: {
      response: string;
      sources: APIDocumentChunk[];
      retrievalTime: number;
      generationTime: number;
      totalTime: number;
    };
    error?: string;
  }> => {
    const startTime = Date.now();
    
    try {
      logger.info("Starting complete RAG workflow via Mastra API", {
        query: req.query.substring(0, 100),
        topK: req.topK,
        useGraphRAG: req.useGraphRAG
      });

      // Step 1: Retrieve relevant chunks
      const retrievalStart = Date.now();
      const retrievalResult = await mastraRAGService.retrieveChunks(req.query, {
        topK: req.topK,
        threshold: req.threshold,
        filters: req.filters,
        useGraphRAG: req.useGraphRAG
      });
      const retrievalTime = Date.now() - retrievalStart;

      if (retrievalResult.chunks.length === 0) {
        return {
          success: false,
          error: "No relevant documents found for the query"
        };
      }

      // Step 2: Generate response using retrieved chunks
      const generationStart = Date.now();
      const generationResult = await mastraRAGService.generateResponse(
        req.query, 
        retrievalResult.chunks,
        {
          systemPrompt: req.systemPrompt,
          maxTokens: req.maxTokens,
          temperature: req.temperature
        }
      );
      const generationTime = Date.now() - generationStart;

      const totalTime = Date.now() - startTime;

      logger.info("RAG workflow completed successfully via Mastra API", {
        query: req.query.substring(0, 100),
        chunksUsed: generationResult.chunksUsed,
        retrievalTime,
        generationTime,
        totalTime
      });

      // Convert to API-safe format
      const apiSources: APIDocumentChunk[] = retrievalResult.chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        metadata: {
          documentId: chunk.metadata.documentId,
          filename: chunk.metadata.filename,
          chunkIndex: chunk.metadata.chunkIndex,
          pageNumber: chunk.metadata.pageNumber,
          source: chunk.metadata.source,
          timestamp: chunk.metadata.timestamp
        }
      }));

      return {
        success: true,
        data: {
          response: generationResult.response,
          sources: apiSources,
          retrievalTime,
          generationTime,
          totalTime
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error("RAG workflow failed via Mastra API", {
        query: req.query.substring(0, 100),
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
);