import { Metric } from "encore.dev/metrics";
import log from "encore.dev/log";

/**
 * Custom metrics for the RAG Chat Application
 * 
 * These metrics track key performance indicators and system health
 * as outlined in the PRD requirements.
 */

// Document Processing Metrics
export const documentProcessingTime = new Metric("document_processing_time_seconds", {
  unit: "seconds",
  description: "Time to process a document from queue to 'processed' or 'error' state.",
});

export const documentProcessingStatus = new Metric("document_processing_status_total", {
  description: "Count of document processing results by status (success, error, timeout).",
});

// Embedding Generation Metrics
export const embeddingGenerationTime = new Metric("embedding_generation_time_ms", {
  unit: "milliseconds", 
  description: "Time to generate embeddings for a batch/document via Cohere.",
});

export const embeddingBatchSize = new Metric("embedding_batch_size_count", {
  description: "Number of text chunks processed in embedding generation batches.",
});

// RAG Retrieval Metrics
export const ragRetrievalScore = new Metric("rag_retrieval_score", {
  unit: "float",
  description: "Relevance score of the top reranked document for a RAG query.",
});

export const ragRetrievalCount = new Metric("rag_retrieval_count_total", {
  description: "Total number of RAG retrieval requests processed.",
});

export const ragContextLength = new Metric("rag_context_length_tokens", {
  unit: "tokens",
  description: "Number of tokens in assembled RAG context sent to LLM.",
});

// LLM Response Metrics
export const llmResponseTime = new Metric("llm_response_time_ms", {
  unit: "milliseconds",
  description: "Time taken for the LLM (Gemini) to generate a response.",
});

export const llmTokenUsage = new Metric("llm_token_usage_total", {
  unit: "tokens", 
  description: "Total tokens consumed by LLM requests (input + output).",
});

// Cache Performance Metrics
export const embeddingCacheHits = new Metric("embedding_cache_hits_total", {
  description: "Total number of embedding cache hits (L1 or L2).",
});

export const embeddingCacheMisses = new Metric("embedding_cache_misses_total", {
  description: "Total number of embedding cache misses (L1 and L2).",
});

export const embeddingCacheEvictions = new Metric("embedding_cache_evictions_total", {
  description: "Total number of cache evictions from L1 cache due to size limits.",
});

// Search Performance Metrics  
export const searchLatency = new Metric("search_latency_ms", {
  unit: "milliseconds",
  description: "Time taken to perform vector + fulltext hybrid search.",
});

export const searchResultCount = new Metric("search_result_count", {
  description: "Number of results returned by search queries.",
});

// Error Tracking Metrics
export const apiErrors = new Metric("api_errors_total", {
  description: "Total number of API errors by service and error type.",
});

export const retryAttempts = new Metric("retry_attempts_total", {
  description: "Total number of retry attempts for failed operations.",
});

/**
 * Helper class for recording metrics with consistent labels and error handling
 */
export class MetricsRecorder {
  /**
   * Record document processing time and status
   */
  static recordDocumentProcessing(durationMs: number, status: 'success' | 'error' | 'timeout', documentId: string) {
    try {
      documentProcessingTime.record(durationMs / 1000, { documentId, status });
      documentProcessingStatus.increment({ status });
      log.info("Document processing metrics recorded", { 
        documentId, 
        durationMs, 
        status 
      });
    } catch (error) {
      log.error("Failed to record document processing metrics", { error, documentId });
    }
  }

  /**
   * Record embedding generation performance
   */
  static recordEmbeddingGeneration(durationMs: number, batchSize: number, model: string) {
    try {
      embeddingGenerationTime.record(durationMs, { model });
      embeddingBatchSize.record(batchSize, { model });
      log.debug("Embedding generation metrics recorded", { 
        durationMs, 
        batchSize, 
        model 
      });
    } catch (error) {
      log.error("Failed to record embedding generation metrics", { error, model });
    }
  }

  /**
   * Record RAG retrieval performance and quality
   */
  static recordRagRetrieval(score: number, contextTokens: number, query: string, resultCount: number) {
    try {
      ragRetrievalScore.record(score);
      ragRetrievalCount.increment();
      ragContextLength.record(contextTokens);
      searchResultCount.record(resultCount);
      log.debug("RAG retrieval metrics recorded", { 
        score, 
        contextTokens, 
        resultCount,
        queryLength: query.length
      });
    } catch (error) {
      log.error("Failed to record RAG retrieval metrics", { error });
    }
  }

  /**
   * Record LLM response performance
   */
  static recordLlmResponse(durationMs: number, inputTokens: number, outputTokens: number, model: string) {
    try {
      llmResponseTime.record(durationMs, { model });
      llmTokenUsage.record(inputTokens + outputTokens, { model, type: 'total' });
      llmTokenUsage.record(inputTokens, { model, type: 'input' });
      llmTokenUsage.record(outputTokens, { model, type: 'output' });
      log.debug("LLM response metrics recorded", { 
        durationMs, 
        inputTokens, 
        outputTokens, 
        model 
      });
    } catch (error) {
      log.error("Failed to record LLM response metrics", { error, model });
    }
  }

  /**
   * Record cache performance
   */
  static recordCacheHit(cacheLevel: 'L1' | 'L2', key: string) {
    try {
      embeddingCacheHits.increment({ level: cacheLevel });
      log.debug("Cache hit recorded", { cacheLevel, key: key.substring(0, 20) + '...' });
    } catch (error) {
      log.error("Failed to record cache hit metrics", { error, cacheLevel });
    }
  }

  static recordCacheMiss(key: string) {
    try {
      embeddingCacheMisses.increment();
      log.debug("Cache miss recorded", { key: key.substring(0, 20) + '...' });
    } catch (error) {
      log.error("Failed to record cache miss metrics", { error });
    }
  }

  static recordCacheEviction(evictedKey: string, reason: string) {
    try {
      embeddingCacheEvictions.increment({ reason });
      log.debug("Cache eviction recorded", { 
        evictedKey: evictedKey.substring(0, 20) + '...', 
        reason 
      });
    } catch (error) {
      log.error("Failed to record cache eviction metrics", { error, reason });
    }
  }

  /**
   * Record search performance
   */
  static recordSearch(durationMs: number, resultCount: number, searchType: 'vector' | 'fulltext' | 'hybrid') {
    try {
      searchLatency.record(durationMs, { type: searchType });
      searchResultCount.record(resultCount, { type: searchType });
      log.debug("Search metrics recorded", { 
        durationMs, 
        resultCount, 
        searchType 
      });
    } catch (error) {
      log.error("Failed to record search metrics", { error, searchType });
    }
  }

  /**
   * Record API errors for monitoring and alerting
   */
  static recordApiError(service: string, errorType: string, operation: string) {
    try {
      apiErrors.increment({ service, errorType, operation });
      log.warn("API error recorded", { service, errorType, operation });
    } catch (error) {
      log.error("Failed to record API error metrics", { error, service, errorType });
    }
  }

  /**
   * Record retry attempts
   */
  static recordRetryAttempt(service: string, operation: string, attempt: number) {
    try {
      retryAttempts.increment({ service, operation, attempt: attempt.toString() });
      log.debug("Retry attempt recorded", { service, operation, attempt });
    } catch (error) {
      log.error("Failed to record retry attempt metrics", { error, service, operation });
    }
  }
}

/**
 * Calculate and record cache hit rate periodically
 * This should be called by a background task or scheduled job
 */
export function calculateCacheHitRate(): number {
  // Note: In a real implementation, you'd query the metrics backend
  // For now, this is a placeholder that could be called periodically
  // The actual hit rate calculation would be done in monitoring dashboards
  return 0.0; // Placeholder
}

/**
 * Health check function to verify metrics are being recorded
 */
export function recordHealthCheckMetrics() {
  try {
    // Record a test metric to verify the system is working
    const testMetric = new Metric("system_health_check", {
      description: "Health check metric to verify metrics system is functioning",
    });
    testMetric.record(1);
    log.info("Health check metrics recorded successfully");
    return true;
  } catch (error) {
    log.error("Health check metrics failed", { error });
    return false;
  }
}

export default MetricsRecorder;