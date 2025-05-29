import { api } from "encore.dev/api";
import log from "encore.dev/log";
import { checkMastraHealth, RAG_CONFIG } from './config';
import { mastraRAGService } from './rag-service';

const logger = log.with({ service: "mastra-test" });

/**
 * Test endpoint to verify Mastra integration is working
 */
export const testMastraIntegration = api(
  { expose: true, method: "GET", path: "/mastra/test" },
  async (): Promise<{
    status: string;
    health: any;
    config: any;
    timestamp: string;
  }> => {
    try {
      logger.info("Testing Mastra integration");

      // Test health check
      const healthCheck = await checkMastraHealth();
      
      // Test configuration
      const config = {
        embedding: RAG_CONFIG.embedding,
        vectorStore: RAG_CONFIG.vectorStore,
        chunking: RAG_CONFIG.chunking
      };

      logger.info("Mastra integration test completed", {
        healthStatus: healthCheck.status,
        components: healthCheck.components
      });

      return {
        status: "success",
        health: healthCheck,
        config,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error("Mastra integration test failed", {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        status: "error",
        health: { status: 'unhealthy', components: {}, error: error instanceof Error ? error.message : 'Unknown error' },
        config: {},
        timestamp: new Date().toISOString()
      };
    }
  }
);

/**
 * Test document processing with a simple text
 */
export const testDocumentProcessing = api(
  { expose: true, method: "POST", path: "/mastra/test/document" },
  async (req: {
    text: string;
    filename?: string;
  }): Promise<{
    success: boolean;
    documentId?: string;
    chunks?: number;
    embeddings?: number;
    error?: string;
  }> => {
    try {
      const documentId = `test_${Date.now()}`;
      const filename = req.filename || 'test-document.txt';

      logger.info("Testing document processing", {
        documentId,
        filename,
        textLength: req.text.length
      });

      const result = await mastraRAGService.processDocument({
        content: req.text,
        filename,
        documentId,
        metadata: {
          source: 'test',
          type: 'text',
          createdAt: new Date().toISOString()
        }
      });

      logger.info("Document processing test completed", {
        documentId,
        chunksCreated: result.chunksCreated,
        embeddings: result.embeddings
      });

      return {
        success: true,
        documentId,
        chunks: result.chunksCreated,
        embeddings: result.embeddings
      };

    } catch (error) {
      logger.error("Document processing test failed", {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);

/**
 * Test vector search functionality
 */
export const testVectorSearch = api(
  { expose: true, method: "POST", path: "/mastra/test/search" },
  async (req: {
    query: string;
    topK?: number;
  }): Promise<{
    success: boolean;
    results?: number;
    chunks?: any[];
    processingTime?: number;
    error?: string;
  }> => {
    try {
      logger.info("Testing vector search", {
        query: req.query.substring(0, 100),
        topK: req.topK
      });

      const result = await mastraRAGService.retrieveChunks(req.query, {
        topK: req.topK || 5,
        threshold: 0.5, // Lower threshold for testing
        filters: {},
        useGraphRAG: false
      });

      logger.info("Vector search test completed", {
        query: req.query.substring(0, 100),
        chunksFound: result.chunks.length,
        processingTime: result.processingTime
      });

      return {
        success: true,
        results: result.chunks.length,
        chunks: result.chunks.map(chunk => ({
          id: chunk.id,
          text: chunk.text.substring(0, 200),
          score: result.scores[result.chunks.indexOf(chunk)] || 0,
          metadata: chunk.metadata
        })),
        processingTime: result.processingTime
      };

    } catch (error) {
      logger.error("Vector search test failed", {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);

/**
 * Test complete RAG workflow
 */
export const testRAGWorkflow = api(
  { expose: true, method: "POST", path: "/mastra/test/rag" },
  async (req: {
    query: string;
    topK?: number;
  }): Promise<{
    success: boolean;
    response?: string;
    sources?: number;
    processingTime?: number;
    error?: string;
  }> => {
    try {
      logger.info("Testing RAG workflow", {
        query: req.query.substring(0, 100),
        topK: req.topK
      });

      const startTime = Date.now();

      // Step 1: Retrieve chunks
      const retrievalResult = await mastraRAGService.retrieveChunks(req.query, {
        topK: req.topK || 3,
        threshold: 0.5,
        filters: {},
        useGraphRAG: false
      });

      if (retrievalResult.chunks.length === 0) {
        return {
          success: true,
          response: "No relevant information found for the query.",
          sources: 0,
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Generate response
      const generationResult = await mastraRAGService.generateResponse(
        req.query,
        retrievalResult.chunks,
        {
          systemPrompt: "You are a helpful assistant. Use the provided context to answer the question accurately.",
          maxTokens: 300,
          temperature: 0.1
        }
      );

      const processingTime = Date.now() - startTime;

      logger.info("RAG workflow test completed", {
        query: req.query.substring(0, 100),
        sourcesUsed: generationResult.chunksUsed,
        responseLength: generationResult.response.length,
        processingTime
      });

      return {
        success: true,
        response: generationResult.response,
        sources: generationResult.chunksUsed,
        processingTime
      };

    } catch (error) {
      logger.error("RAG workflow test failed", {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);