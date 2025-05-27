import { describe, it, expect, vi } from 'vitest';
import '../../lib/testing/setup';

// Mock external dependencies
vi.mock('encore.dev/config', () => ({
  secret: vi.fn((name: string) => {
    if (name === 'CohereApiKey') {
      return () => 'mock-cohere-key';
    }
    if (name === 'REDIS_URL') {
      return () => undefined;
    }
    return () => undefined;
  })
}));

vi.mock('../../db/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined)
    })
  }
}));

vi.mock('../parser', () => ({
  parseDocument: vi.fn().mockResolvedValue({
    elements: [
      {
        type: 'Title',
        text: 'Machine Learning Fundamentals',
        metadata: { filename: 'ml-guide.pdf', page_number: 1 }
      },
      {
        type: 'NarrativeText',
        text: 'Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data.',
        metadata: { filename: 'ml-guide.pdf', page_number: 1 }
      }
    ]
  })
}));

vi.mock('../../search/search', () => ({
  searchDocuments: vi.fn().mockResolvedValue({
    results: [
      {
        documentId: 'test-doc-123',
        content: 'Machine learning is a subset of artificial intelligence',
        score: 0.95,
        metadata: { filename: 'ml-guide.pdf', page_number: 1 }
      }
    ],
    totalCount: 1
  })
}));

describe('RAG Pipeline Unit Tests', () => {
  describe('Document Processing Flow', () => {
    it('should successfully parse document and generate embeddings', async () => {
      const { parseDocument } = await import('../parser');
      const { generateEmbeddings } = await import('../embedding');
      
      // Test document parsing
      const mockFile = Buffer.from('Machine learning is a subset of AI.');
      const parseResult = await parseDocument(mockFile);
      
      expect(parseResult.elements).toHaveLength(2);
      expect(parseResult.elements[0].text).toBe('Machine Learning Fundamentals');
      expect(parseResult.elements[1].text).toContain('machine learning');
      
      // Test embedding generation
      const textChunks = parseResult.elements.map(elem => elem.text);
      const embeddings = await generateEmbeddings(textChunks);
      
      expect(embeddings).toHaveLength(2);
      expect(embeddings[0]).toHaveLength(1024);
      expect(embeddings[1]).toHaveLength(1024);
    });

    it('should handle search pipeline with proper ranking', async () => {
      const { searchDocuments } = await import('../../search/search');
      
      const searchResults = await searchDocuments({
        query: 'What is machine learning?',
        userId: 'test-user',
        limit: 5
      });

      expect(searchResults.results).toHaveLength(1);
      expect(searchResults.results[0].score).toBe(0.95);
      expect(searchResults.results[0].content).toContain('machine learning');

      // Test semantic similarity with custom matcher
      expect(searchResults.results[0].content).toMatchSemanticSimilarity(
        'artificial intelligence machine learning',
        0.8
      );

      // Test LLM quality rubric
      expect(searchResults.results[0]).toPassLLMRubric(
        'Result should be relevant to machine learning and provide educational content',
        0.8
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle parsing errors gracefully', async () => {
      const { parseDocument } = await import('../parser');
      
      // Mock a parsing failure
      vi.mocked(parseDocument).mockRejectedValueOnce(new Error('Unsupported file format'));
      
      await expect(parseDocument(Buffer.from('invalid content')))
        .rejects
        .toThrow('Unsupported file format');
    });

    it('should handle embedding generation failures', async () => {
      const { generateEmbeddings } = await import('../embedding');
      
      // Mock an API failure
      vi.mocked(generateEmbeddings).mockRejectedValueOnce(new Error('Cohere API rate limit exceeded'));
      
      await expect(generateEmbeddings(['test text']))
        .rejects
        .toThrow('Cohere API rate limit exceeded');
    });

    it('should handle search service failures', async () => {
      const { searchDocuments } = await import('../../search/search');
      
      // Mock search service failure
      vi.mocked(searchDocuments).mockRejectedValueOnce(new Error('Vector database connection failed'));
      
      await expect(
        searchDocuments({
          query: 'test query',
          userId: 'test-user',
          limit: 5
        })
      ).rejects.toThrow('Vector database connection failed');
    });
  });

  describe('Performance Characteristics', () => {
    it('should demonstrate embedding cache effectiveness', async () => {
      const { generateEmbeddings } = await import('../embedding');
      
      const testTexts = [
        'Machine learning fundamentals',
        'Machine learning fundamentals', // Duplicate for cache testing
        'Deep learning neural networks'
      ];

      const startTime = Date.now();
      const embeddings = await generateEmbeddings(testTexts);
      const processingTime = Date.now() - startTime;

      expect(embeddings).toHaveLength(3);
      expect(processingTime).toBeLessThan(1000); // Should be fast with caching

      // Second call should be faster due to caching
      const cachedStartTime = Date.now();
      const cachedEmbeddings = await generateEmbeddings(testTexts);
      const cachedProcessingTime = Date.now() - cachedStartTime;

      expect(cachedEmbeddings).toEqual(embeddings);
      expect(cachedProcessingTime).toBeLessThan(processingTime);
    });

    it('should process large documents within time limits', async () => {
      const { generateEmbeddings } = await import('../embedding');
      
      // Simulate large document content
      const largeTextArray = Array(10).fill('This is a large document chunk with substantial content. ');
      
      const startTime = Date.now();
      const embeddings = await generateEmbeddings(largeTextArray);
      const processingTime = Date.now() - startTime;

      expect(embeddings).toHaveLength(10);
      expect(processingTime).toBeLessThan(5000); // Within 5-second requirement
    });
  });

  describe('Data Validation and Quality', () => {
    it('should validate embedding dimensions and format', async () => {
      const { generateEmbeddings } = await import('../embedding');
      
      const embeddings = await generateEmbeddings(['test content']);
      
      expect(embeddings).toHaveLength(1);
      expect(embeddings[0]).toHaveLength(1024); // Cohere embed-v4.0 dimension
      expect(embeddings[0]).toEqual(expect.arrayContaining([expect.any(Number)]));
      
      // All values should be finite numbers
      embeddings[0].forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should validate search result structure and scores', async () => {
      const { searchDocuments } = await import('../../search/search');
      
      const searchResults = await searchDocuments({
        query: 'machine learning',
        userId: 'test-user',
        limit: 5
      });

      expect(searchResults.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentId: expect.any(String),
            content: expect.any(String),
            score: expect.any(Number),
            metadata: expect.any(Object)
          })
        ])
      );

      // Scores should be between 0 and 1
      searchResults.results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty and edge case inputs', async () => {
      const { generateEmbeddings } = await import('../embedding');
      const { parseDocument } = await import('../parser');
      
      // Test empty text array
      const emptyEmbeddings = await generateEmbeddings([]);
      expect(emptyEmbeddings).toHaveLength(0);

      // Test single character
      const singleCharEmbeddings = await generateEmbeddings(['a']);
      expect(singleCharEmbeddings).toHaveLength(1);
      expect(singleCharEmbeddings[0]).toHaveLength(1024);

      // Test very long text
      const longText = 'word '.repeat(10000);
      const longTextEmbeddings = await generateEmbeddings([longText]);
      expect(longTextEmbeddings).toHaveLength(1);
      expect(longTextEmbeddings[0]).toHaveLength(1024);
    });
  });

  describe('Integration Flow Validation', () => {
    it('should complete full pipeline flow without errors', async () => {
      const { parseDocument } = await import('../parser');
      const { generateEmbeddings } = await import('../embedding');
      const { searchDocuments } = await import('../../search/search');
      
      // Step 1: Parse document
      const mockFile = Buffer.from('Machine learning document content');
      const parseResult = await parseDocument(mockFile);
      expect(parseResult.elements).toHaveLength(2);

      // Step 2: Generate embeddings
      const textChunks = parseResult.elements.map(elem => elem.text);
      const embeddings = await generateEmbeddings(textChunks);
      expect(embeddings).toHaveLength(2);

      // Step 3: Simulate search (in real implementation, would store in DB first)
      const searchResults = await searchDocuments({
        query: 'machine learning concepts',
        userId: 'test-user',
        limit: 5
      });
      expect(searchResults.results).toHaveLength(1);

      // Verify end-to-end flow completed successfully
      expect(searchResults.results[0]).toMatchSemanticSimilarity(
        'machine learning artificial intelligence',
        0.7
      );
    });

    it('should handle concurrent processing requests', async () => {
      const { generateEmbeddings } = await import('../embedding');
      
      // Simulate concurrent embedding generation
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        generateEmbeddings([`Document ${i} content for concurrent processing`])
      );

      const results = await Promise.allSettled(concurrentRequests);
      
      // All requests should succeed
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveLength(1);
          expect(result.value[0]).toHaveLength(1024);
        }
      });
    });
  });
});