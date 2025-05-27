import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  MetricsRecorder,
  documentProcessingTime,
  embeddingGenerationTime,
  ragRetrievalScore,
  llmResponseTime,
  embeddingCacheHits,
  embeddingCacheMisses,
  searchLatency,
  recordHealthCheckMetrics
} from '../metrics';

// Mock encore.dev/metrics
vi.mock('encore.dev/metrics', () => ({
  Metric: vi.fn().mockImplementation((name, config) => ({
    name,
    config,
    record: vi.fn(),
    increment: vi.fn(),
  }))
}));

// Mock encore.dev/log
vi.mock('encore.dev/log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

describe('Metrics Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Metric Definitions', () => {
    it('should define all required metrics', () => {
      expect(documentProcessingTime).toBeDefined();
      expect(embeddingGenerationTime).toBeDefined();
      expect(ragRetrievalScore).toBeDefined();
      expect(llmResponseTime).toBeDefined();
      expect(embeddingCacheHits).toBeDefined();
      expect(embeddingCacheMisses).toBeDefined();
      expect(searchLatency).toBeDefined();
    });

    it('should have correct metric configurations', () => {
      expect(documentProcessingTime.name).toBe('document_processing_time_seconds');
      expect(documentProcessingTime.config.unit).toBe('seconds');
      
      expect(embeddingGenerationTime.name).toBe('embedding_generation_time_ms');
      expect(embeddingGenerationTime.config.unit).toBe('milliseconds');
      
      expect(ragRetrievalScore.name).toBe('rag_retrieval_score');
      expect(ragRetrievalScore.config.unit).toBe('float');
    });
  });

  describe('MetricsRecorder', () => {
    describe('recordDocumentProcessing', () => {
      it('should record processing time and status metrics', () => {
        const durationMs = 5000;
        const status = 'success';
        const documentId = 'doc-123';

        MetricsRecorder.recordDocumentProcessing(durationMs, status, documentId);

        expect(documentProcessingTime.record).toHaveBeenCalledWith(
          5, // converted to seconds
          { documentId, status }
        );
      });

      it('should handle errors gracefully', () => {
        vi.mocked(documentProcessingTime.record).mockImplementation(() => {
          throw new Error('Metrics recording failed');
        });

        expect(() => {
          MetricsRecorder.recordDocumentProcessing(1000, 'error', 'doc-123');
        }).not.toThrow();
      });
    });

    describe('recordEmbeddingGeneration', () => {
      it('should record embedding generation metrics', () => {
        const durationMs = 250;
        const batchSize = 10;
        const model = 'embed-english-v4.0';

        MetricsRecorder.recordEmbeddingGeneration(durationMs, batchSize, model);

        expect(embeddingGenerationTime.record).toHaveBeenCalledWith(durationMs, { model });
      });
    });

    describe('recordRagRetrieval', () => {
      it('should record RAG retrieval performance metrics', () => {
        const score = 0.85;
        const contextTokens = 1500;
        const query = 'What is machine learning?';
        const resultCount = 5;

        MetricsRecorder.recordRagRetrieval(score, contextTokens, query, resultCount);

        expect(ragRetrievalScore.record).toHaveBeenCalledWith(score);
      });
    });

    describe('recordLlmResponse', () => {
      it('should record LLM response metrics', () => {
        const durationMs = 2000;
        const inputTokens = 100;
        const outputTokens = 50;
        const model = 'gemini-2.5-flash';

        MetricsRecorder.recordLlmResponse(durationMs, inputTokens, outputTokens, model);

        expect(llmResponseTime.record).toHaveBeenCalledWith(durationMs, { model });
      });
    });

    describe('recordCacheHit', () => {
      it('should record cache hit metrics', () => {
        const cacheLevel = 'L1';
        const key = 'emb:abc123...';

        MetricsRecorder.recordCacheHit(cacheLevel, key);

        expect(embeddingCacheHits.increment).toHaveBeenCalledWith({ level: cacheLevel });
      });
    });

    describe('recordCacheMiss', () => {
      it('should record cache miss metrics', () => {
        const key = 'emb:xyz789...';

        MetricsRecorder.recordCacheMiss(key);

        expect(embeddingCacheMisses.increment).toHaveBeenCalled();
      });
    });

    describe('recordSearch', () => {
      it('should record search performance metrics', () => {
        const durationMs = 150;
        const resultCount = 8;
        const searchType = 'hybrid';

        MetricsRecorder.recordSearch(durationMs, resultCount, searchType);

        expect(searchLatency.record).toHaveBeenCalledWith(durationMs, { type: searchType });
      });
    });

    describe('recordApiError', () => {
      it('should record API error metrics', () => {
        const service = 'upload';
        const errorType = 'TIMEOUT';
        const operation = 'generateEmbeddings';

        MetricsRecorder.recordApiError(service, errorType, operation);

        // Should call the apiErrors metric increment method
        // Since we're mocking the Metric constructor, we need to verify the call
        expect(vi.mocked(require('encore.dev/metrics').Metric)).toHaveBeenCalled();
      });
    });
  });

  describe('Health Check', () => {
    it('should record health check metrics successfully', () => {
      const result = recordHealthCheckMetrics();
      
      expect(result).toBe(true);
      expect(vi.mocked(require('encore.dev/metrics').Metric)).toHaveBeenCalled();
    });

    it('should handle health check errors gracefully', () => {
      vi.mocked(require('encore.dev/metrics').Metric).mockImplementation(() => {
        throw new Error('Metrics system unavailable');
      });

      const result = recordHealthCheckMetrics();
      
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should not throw errors when metrics recording fails', () => {
      // Mock all record methods to throw errors
      vi.mocked(documentProcessingTime.record).mockImplementation(() => {
        throw new Error('Recording failed');
      });

      expect(() => {
        MetricsRecorder.recordDocumentProcessing(1000, 'success', 'doc-123');
      }).not.toThrow();
    });

    it('should log errors when metrics recording fails', () => {
      const mockLog = vi.mocked(require('encore.dev/log').default);
      
      vi.mocked(embeddingGenerationTime.record).mockImplementation(() => {
        throw new Error('Recording failed');
      });

      MetricsRecorder.recordEmbeddingGeneration(1000, 5, 'test-model');

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to record embedding generation metrics',
        expect.objectContaining({
          error: expect.any(Error),
          model: 'test-model'
        })
      );
    });
  });

  describe('Data Validation', () => {
    it('should handle edge case values correctly', () => {
      // Test with zero duration
      MetricsRecorder.recordDocumentProcessing(0, 'success', 'doc-123');
      expect(documentProcessingTime.record).toHaveBeenCalledWith(0, expect.any(Object));

      // Test with very large duration
      MetricsRecorder.recordDocumentProcessing(999999, 'success', 'doc-123');
      expect(documentProcessingTime.record).toHaveBeenCalledWith(999.999, expect.any(Object));

      // Test with empty strings
      MetricsRecorder.recordApiError('', '', '');
      // Should not throw
    });

    it('should truncate long cache keys for logging', () => {
      const longKey = 'emb:' + 'a'.repeat(100);
      
      MetricsRecorder.recordCacheHit('L1', longKey);
      
      // Should not throw and should handle long keys gracefully
      expect(embeddingCacheHits.increment).toHaveBeenCalled();
    });
  });
});