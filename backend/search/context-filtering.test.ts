import { describe, it, expect, beforeEach } from 'vitest';

// Mock types for testing
interface SearchFilter {
  documentTypes?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  tags?: string[];
  metadata?: Record<string, any>;
  minScore?: number;
}

interface ContextExpansionOptions {
  includeRelatedChunks?: boolean;
  maxRelatedChunks?: number;
  relatedChunkRadius?: number;
  includeDocumentMetadata?: boolean;
  includeChunkMetadata?: boolean;
}

interface SearchResult {
  id: string;
  content: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  score: number;
  metadata?: Record<string, any>;
  tags?: string[];
  documentType?: string;
  createdAt: Date;
  relatedChunks?: SearchResult[];
  documentMetadata?: Record<string, any>;
}

interface ExpandedSearchRequest {
  query: string;
  userID: string;
  limit?: number;
  filters?: SearchFilter;
  contextExpansion?: ContextExpansionOptions;
  enableReranking?: boolean;
}

interface ExpandedSearchResponse {
  results: SearchResult[];
  totalFound: number;
  processingTime: number;
  appliedFilters?: SearchFilter;
  expandedResults?: number;
}

// Mock service implementation for testing
class MockExpandedSearchService {
  private mockDocuments: SearchResult[] = [
    {
      id: "chunk1",
      content: "Machine learning algorithms are fundamental to AI development. They enable computers to learn patterns.",
      documentId: "doc1",
      documentTitle: "Introduction to Machine Learning",
      chunkIndex: 0,
      score: 0.95,
      metadata: { category: "technical", difficulty: "beginner" },
      tags: ["ai", "machine-learning"],
      documentType: "tutorial",
      createdAt: new Date('2024-01-15'),
      documentMetadata: { author: "Dr. Smith", pages: 50 }
    },
    {
      id: "chunk2",
      content: "Deep learning is a subset of machine learning that uses neural networks with multiple layers.",
      documentId: "doc1",
      documentTitle: "Introduction to Machine Learning",
      chunkIndex: 1,
      score: 0.88,
      metadata: { category: "technical", difficulty: "intermediate" },
      tags: ["ai", "deep-learning", "neural-networks"],
      documentType: "tutorial",
      createdAt: new Date('2024-01-15'),
      documentMetadata: { author: "Dr. Smith", pages: 50 }
    },
    {
      id: "chunk3",
      content: "Data visualization helps in understanding complex datasets and presenting insights clearly.",
      documentId: "doc2",
      documentTitle: "Data Visualization Guide",
      chunkIndex: 0,
      score: 0.75,
      metadata: { category: "practical", difficulty: "beginner" },
      tags: ["visualization", "data-science"],
      documentType: "guide",
      createdAt: new Date('2024-02-01'),
      documentMetadata: { author: "Jane Doe", pages: 30 }
    },
    {
      id: "chunk4",
      content: "Python libraries like matplotlib and seaborn are excellent for creating visualizations.",
      documentId: "doc2",
      documentTitle: "Data Visualization Guide",
      chunkIndex: 1,
      score: 0.70,
      metadata: { category: "practical", difficulty: "intermediate" },
      tags: ["python", "visualization", "libraries"],
      documentType: "guide",
      createdAt: new Date('2024-02-01'),
      documentMetadata: { author: "Jane Doe", pages: 30 }
    },
    {
      id: "chunk5",
      content: "Natural language processing enables computers to understand and generate human language.",
      documentId: "doc3",
      documentTitle: "NLP Fundamentals",
      chunkIndex: 0,
      score: 0.85,
      metadata: { category: "technical", difficulty: "advanced" },
      tags: ["nlp", "ai", "language"],
      documentType: "research",
      createdAt: new Date('2024-03-10'),
      documentMetadata: { author: "Prof. Johnson", pages: 75 }
    }
  ];

  async searchWithFiltersAndExpansion(request: ExpandedSearchRequest): Promise<ExpandedSearchResponse> {
    const startTime = Date.now();
    
    // Apply basic search (simplified for testing)
    let results = this.mockDocuments.filter(doc => 
      doc.content.toLowerCase().includes(request.query.toLowerCase()) ||
      doc.tags?.some(tag => tag.includes(request.query.toLowerCase()))
    );

    // Apply filters
    if (request.filters) {
      results = this.applyFilters(results, request.filters);
    }

    // Apply context expansion
    if (request.contextExpansion) {
      results = await this.expandContext(results, request.contextExpansion);
    }

    // Apply limit
    const totalFound = results.length;
    if (request.limit) {
      results = results.slice(0, request.limit);
    }

    const processingTime = Date.now() - startTime;
    
    return {
      results,
      totalFound,
      processingTime,
      appliedFilters: request.filters,
      expandedResults: request.contextExpansion ? results.reduce((sum, r) => sum + (r.relatedChunks?.length || 0), 0) : 0
    };
  }

  private applyFilters(results: SearchResult[], filters: SearchFilter): SearchResult[] {
    return results.filter(result => {
      // Document type filter
      if (filters.documentTypes && !filters.documentTypes.includes(result.documentType || '')) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        if (filters.dateRange.start && result.createdAt < filters.dateRange.start) {
          return false;
        }
        if (filters.dateRange.end && result.createdAt > filters.dateRange.end) {
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
          if (result.metadata?.[key] !== value) {
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

  private async expandContext(results: SearchResult[], options: ContextExpansionOptions): Promise<SearchResult[]> {
    return results.map(result => {
      const expanded = { ...result };

      // Add related chunks from the same document
      if (options.includeRelatedChunks) {
        const relatedChunks = this.getRelatedChunks(result, options);
        if (relatedChunks.length > 0) {
          expanded.relatedChunks = relatedChunks;
        }
      }

      // Add document metadata
      if (options.includeDocumentMetadata && result.documentMetadata) {
        expanded.documentMetadata = result.documentMetadata;
      }

      // Add enhanced chunk metadata
      if (options.includeChunkMetadata) {
        expanded.metadata = {
          ...result.metadata,
          expandedContext: true,
          relatedChunkCount: expanded.relatedChunks?.length || 0
        };
      }

      return expanded;
    });
  }

  private getRelatedChunks(result: SearchResult, options: ContextExpansionOptions): SearchResult[] {
    const radius = options.relatedChunkRadius || 1;
    const maxChunks = options.maxRelatedChunks || 2;

    // Find chunks from the same document within the specified radius
    const relatedChunks = this.mockDocuments.filter(chunk => 
      chunk.documentId === result.documentId &&
      chunk.id !== result.id &&
      Math.abs(chunk.chunkIndex - result.chunkIndex) <= radius
    );

    // Sort by proximity and limit
    return relatedChunks
      .sort((a, b) => Math.abs(a.chunkIndex - result.chunkIndex) - Math.abs(b.chunkIndex - result.chunkIndex))
      .slice(0, maxChunks);
  }
}

describe('Context Expansion and Filtering', () => {
  let mockService: MockExpandedSearchService;

  beforeEach(() => {
    mockService = new MockExpandedSearchService();
  });

  describe('Advanced Filtering', () => {
    it('should filter results by document type', async () => {
      const request: ExpandedSearchRequest = {
        query: "machine learning",
        userID: "user1",
        filters: {
          documentTypes: ["tutorial"]
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results).toHaveLength(2);
      expect(response.results.every(r => r.documentType === "tutorial")).toBe(true);
    });

    it('should filter results by date range', async () => {
      const request: ExpandedSearchRequest = {
        query: "data",
        userID: "user1",
        filters: {
          dateRange: {
            start: new Date('2024-02-01'),
            end: new Date('2024-02-28')
          }
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results).toHaveLength(1);
      expect(response.results.every(r => r.documentId === "doc2")).toBe(true);
    });

    it('should filter results by tags', async () => {
      const request: ExpandedSearchRequest = {
        query: "",
        userID: "user1",
        filters: {
          tags: ["visualization"]
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results).toHaveLength(2);
      expect(response.results.every(r => r.tags?.includes("visualization"))).toBe(true);
    });

    it('should filter results by metadata attributes', async () => {
      const request: ExpandedSearchRequest = {
        query: "",
        userID: "user1",
        filters: {
          metadata: {
            category: "technical",
            difficulty: "beginner"
          }
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results).toHaveLength(1);
      expect(response.results[0].metadata?.category).toBe("technical");
      expect(response.results[0].metadata?.difficulty).toBe("beginner");
    });

    it('should filter results by minimum score', async () => {
      const request: ExpandedSearchRequest = {
        query: "machine learning",
        userID: "user1",
        filters: {
          minScore: 0.90
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results).toHaveLength(1);
      expect(response.results[0].score).toBeGreaterThanOrEqual(0.90);
    });

    it('should combine multiple filters effectively', async () => {
      const request: ExpandedSearchRequest = {
        query: "",
        userID: "user1",
        filters: {
          documentTypes: ["tutorial", "guide"],
          tags: ["ai"],
          metadata: {
            category: "technical"
          }
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results).toHaveLength(2);
      expect(response.results.every(r => 
        ["tutorial", "guide"].includes(r.documentType || '') &&
        r.tags?.includes("ai") &&
        r.metadata?.category === "technical"
      )).toBe(true);
    });
  });

  describe('Context Expansion', () => {
    it('should include related chunks from the same document', async () => {
      const request: ExpandedSearchRequest = {
        query: "machine learning algorithms",
        userID: "user1",
        contextExpansion: {
          includeRelatedChunks: true,
          maxRelatedChunks: 2,
          relatedChunkRadius: 1
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results).toHaveLength(1);
      expect(response.results[0].relatedChunks).toBeDefined();
      expect(response.results[0].relatedChunks?.length).toBeGreaterThan(0);
      expect(response.expandedResults).toBeGreaterThan(0);
    });

    it('should include document metadata when requested', async () => {
      const request: ExpandedSearchRequest = {
        query: "machine learning",
        userID: "user1",
        contextExpansion: {
          includeDocumentMetadata: true
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results[0].documentMetadata).toBeDefined();
      expect(response.results[0].documentMetadata?.author).toBeDefined();
      expect(response.results[0].documentMetadata?.pages).toBeDefined();
    });

    it('should enhance chunk metadata when requested', async () => {
      const request: ExpandedSearchRequest = {
        query: "machine learning",
        userID: "user1",
        contextExpansion: {
          includeChunkMetadata: true,
          includeRelatedChunks: true
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results[0].metadata?.expandedContext).toBe(true);
      expect(response.results[0].metadata?.relatedChunkCount).toBeDefined();
    });

    it('should respect related chunk radius settings', async () => {
      const request: ExpandedSearchRequest = {
        query: "machine learning algorithms",
        userID: "user1",
        contextExpansion: {
          includeRelatedChunks: true,
          relatedChunkRadius: 0, // Only exact adjacent chunks
          maxRelatedChunks: 5
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      // Should find chunk at index 0, related chunk should be at index 1 (within radius 0 means direct adjacency)
      expect(response.results[0].relatedChunks).toBeDefined();
      if (response.results[0].relatedChunks) {
        const mainChunkIndex = response.results[0].chunkIndex;
        response.results[0].relatedChunks.forEach(chunk => {
          expect(Math.abs(chunk.chunkIndex - mainChunkIndex)).toBeLessThanOrEqual(1);
        });
      }
    });

    it('should limit related chunks according to maxRelatedChunks', async () => {
      const request: ExpandedSearchRequest = {
        query: "machine learning algorithms",
        userID: "user1",
        contextExpansion: {
          includeRelatedChunks: true,
          maxRelatedChunks: 1,
          relatedChunkRadius: 5
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results[0].relatedChunks).toBeDefined();
      expect(response.results[0].relatedChunks?.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Combined Filtering and Expansion', () => {
    it('should apply both filtering and context expansion', async () => {
      const request: ExpandedSearchRequest = {
        query: "learning",
        userID: "user1",
        filters: {
          documentTypes: ["tutorial"],
          tags: ["ai"]
        },
        contextExpansion: {
          includeRelatedChunks: true,
          includeDocumentMetadata: true,
          includeChunkMetadata: true
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.every(r => r.documentType === "tutorial")).toBe(true);
      expect(response.results.every(r => r.tags?.includes("ai"))).toBe(true);
      expect(response.results[0].documentMetadata).toBeDefined();
      expect(response.results[0].metadata?.expandedContext).toBe(true);
      expect(response.appliedFilters).toEqual(request.filters);
    });

    it('should handle empty results gracefully with filters and expansion', async () => {
      const request: ExpandedSearchRequest = {
        query: "nonexistent topic",
        userID: "user1",
        filters: {
          documentTypes: ["nonexistent"]
        },
        contextExpansion: {
          includeRelatedChunks: true
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response.results).toHaveLength(0);
      expect(response.totalFound).toBe(0);
      expect(response.expandedResults).toBe(0);
      expect(response.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should complete filtering and expansion within reasonable time', async () => {
      const request: ExpandedSearchRequest = {
        query: "",
        userID: "user1",
        filters: {
          metadata: { category: "technical" }
        },
        contextExpansion: {
          includeRelatedChunks: true,
          includeDocumentMetadata: true,
          includeChunkMetadata: true
        }
      };

      const startTime = Date.now();
      const response = await mockService.searchWithFiltersAndExpansion(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(response.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle complex filter combinations without errors', async () => {
      const request: ExpandedSearchRequest = {
        query: "data",
        userID: "user1",
        filters: {
          documentTypes: ["tutorial", "guide", "research"],
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31')
          },
          tags: ["ai", "visualization", "python"],
          metadata: { category: "technical" },
          minScore: 0.5
        },
        contextExpansion: {
          includeRelatedChunks: true,
          maxRelatedChunks: 3,
          relatedChunkRadius: 2,
          includeDocumentMetadata: true,
          includeChunkMetadata: true
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      expect(response).toBeDefined();
      expect(response.results).toBeDefined();
      expect(response.totalFound).toBeGreaterThanOrEqual(0);
      expect(response.appliedFilters).toEqual(request.filters);
    });

    it('should preserve search result ordering after expansion', async () => {
      const request: ExpandedSearchRequest = {
        query: "machine learning",
        userID: "user1",
        contextExpansion: {
          includeRelatedChunks: true
        }
      };

      const response = await mockService.searchWithFiltersAndExpansion(request);

      // Results should maintain their relative score ordering
      for (let i = 1; i < response.results.length; i++) {
        expect(response.results[i - 1].score).toBeGreaterThanOrEqual(response.results[i].score);
      }
    });
  });
});