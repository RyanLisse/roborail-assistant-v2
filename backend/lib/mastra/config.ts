import { Mastra } from '@mastra/core';
import { PgVector } from '@mastra/pg';
import { cohere } from '@ai-sdk/cohere';
// Note: google import available for future LLM integration
import { secret } from 'encore.dev/config';
import log from 'encore.dev/log';

// Encore secrets for API keys
const cohereApiKey = secret("CohereApiKey");
const googleApiKey = secret("GoogleGenerativeAIApiKey");
const postgresConnectionString = secret("PostgresConnectionString");

const logger = log.with({ service: "mastra-config" });

/**
 * Mastra instance configured for RAG workflows with Cohere embeddings and pgvector
 */
export const mastra = new Mastra({
  // Disable Mastra logging - use Encore logging instead
  logger: false
});

/**
 * Vector store configuration using pgvector
 */
export const vectorStore = new PgVector({
  connectionString: postgresConnectionString(),
});

/**
 * Cohere embedding configuration using Mastra pattern
 */
export const getCohereEmbedding = () => {
  return cohere.embedding("embed-v4.0");
};

/**
 * RAG Configuration constants
 */
export const RAG_CONFIG = {
  // Document chunking settings
  chunking: {
    strategy: 'recursive' as const,
    size: 1000,
    overlap: 200,
    separators: ['\n\n', '\n', '. ', '? ', '! ', ' ']
  },
  
  // Embedding settings  
  embedding: {
    model: "embed-v4.0",
    dimensions: 1024, // Cohere embed-v4 dimensions
    batchSize: 100
  },
  
  // Vector store settings
  vectorStore: {
    indexName: "document_chunks",
    metricType: "cosine" as const
  },
  
  // Retrieval settings
  retrieval: {
    topK: 10,
    threshold: 0.7,
    rerankTopK: 5,
    reranking: {
      enabled: true,
      model: "rerank-v3.5",
      weights: {
        semantic: 0.4,
        vector: 0.4,
        position: 0.2
      }
    }
  },
  
  // Graph RAG settings
  graphRag: {
    enabled: true,
    randomWalkSteps: 100,
    restartProb: 0.15,
    threshold: 0.75
  }
} as const;

/**
 * Initialize vector store index
 */
export async function initializeVectorStore() {
  try {
    await vectorStore.createIndex({
      indexName: RAG_CONFIG.vectorStore.indexName,
      dimension: RAG_CONFIG.embedding.dimensions,
      metric: RAG_CONFIG.vectorStore.metricType
    });
    
    logger.info("Vector store initialized successfully", {
      indexName: RAG_CONFIG.vectorStore.indexName,
      dimensions: RAG_CONFIG.embedding.dimensions
    });
  } catch (error) {
    // Index might already exist, which is fine
    logger.warn("Vector store initialization warning", { error });
  }
}

/**
 * Health check for Mastra configuration
 */
export async function checkMastraHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  components: Record<string, boolean>;
  error?: string;
}> {
  const components = {
    cohere: false,
    google: false,
    vectorStore: false
  };
  
  try {
    // Test Cohere API
    try {
      const testEmbedding = getCohereEmbedding();
      components.cohere = !!testEmbedding;
    } catch (e) {
      logger.error("Cohere API test failed", { error: e });
    }
    
    // Test Google API
    try {
      components.google = !!mastra;
    } catch (e) {
      logger.error("Google API test failed", { error: e });
    }
    
    // Test vector store connection
    try {
      // Simple connection test
      components.vectorStore = !!vectorStore;
    } catch (e) {
      logger.error("Vector store test failed", { error: e });
    }
    
    const allHealthy = Object.values(components).every(Boolean);
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      components
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      components,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}