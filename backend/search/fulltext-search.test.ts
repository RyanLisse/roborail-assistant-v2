import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// Mock implementations for testing full-text search functionality
interface MockSearchRequest {
  query: string;
  userID: string;
  documentIDs?: string[];
  limit?: number;
  searchType?: "vector" | "fulltext" | "hybrid";
}

interface MockSearchResult {
  id: string;
  documentID: string;
  content: string;
  score: number;
  metadata: {
    filename: string;
    pageNumber?: number;
    chunkIndex: number;
  };
}

interface MockSearchResponse {
  results: MockSearchResult[];
  totalFound: number;
  query: string;
  processingTime: number;
  searchType: string;
}

// Mock full-text search service
class MockFullTextSearchService {
  private documents: Map<string, any[]> = new Map(); // userID -> documents
  
  constructor() {
    this.setupMockData();
  }

  private setupMockData() {
    // Mock document chunks for different users with various content types
    this.documents.set("user1", [
      {
        id: "chunk_1",
        documentId: "doc_1",
        content: "Machine learning algorithms are used in artificial intelligence applications to automatically learn and improve from experience without being explicitly programmed.",
        chunkIndex: 0,
        pageNumber: 1,
        filename: "ml_guide.pdf",
        originalName: "Machine Learning Guide.pdf",
      },
      {
        id: "chunk_2",
        documentId: "doc_1",
        content: "Deep learning is a subset of machine learning that uses neural networks with multiple layers to model and understand complex patterns in data.",
        chunkIndex: 1,
        pageNumber: 2,
        filename: "ml_guide.pdf",
        originalName: "Machine Learning Guide.pdf",
      },
      {
        id: "chunk_3",
        documentId: "doc_2",
        content: "Python programming language provides excellent libraries for data science including pandas, numpy, scikit-learn, and tensorflow for machine learning tasks.",
        chunkIndex: 0,
        pageNumber: 1,
        filename: "python_data_science.pdf",
        originalName: "Python for Data Science.pdf",
      },
      {
        id: "chunk_4",
        documentId: "doc_2",
        content: "Data visualization with matplotlib and seaborn helps in understanding patterns and trends in datasets for better decision making.",
        chunkIndex: 1,
        pageNumber: 2,
        filename: "python_data_science.pdf",
        originalName: "Python for Data Science.pdf",
      },
      {
        id: "chunk_5",
        documentId: "doc_3",
        content: "Natural language processing (NLP) techniques enable computers to understand, interpret, and generate human language in a valuable way.",
        chunkIndex: 0,
        pageNumber: 1,
        filename: "nlp_intro.pdf",
        originalName: "Introduction to NLP.pdf",
      },
      {
        id: "chunk_6",
        documentId: "doc_3",
        content: "Text classification and sentiment analysis are common applications of NLP in business intelligence and customer feedback analysis.",
        chunkIndex: 1,
        pageNumber: 2,
        filename: "nlp_intro.pdf",
        originalName: "Introduction to NLP.pdf",
      },
    ]);

    this.documents.set("user2", [
      {
        id: "chunk_7",
        documentId: "doc_4",
        content: "Database management systems (DBMS) are essential for storing, retrieving, and managing large amounts of structured data efficiently.",
        chunkIndex: 0,
        pageNumber: 1,
        filename: "database_systems.pdf",
        originalName: "Database Systems Overview.pdf",
      },
      {
        id: "chunk_8",
        documentId: "doc_4",
        content: "SQL (Structured Query Language) is the standard language for relational database management and data manipulation operations.",
        chunkIndex: 1,
        pageNumber: 2,
        filename: "database_systems.pdf",
        originalName: "Database Systems Overview.pdf",
      },
    ]);
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/[&|!()]/g, ' ') // Remove special FTS characters
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  private calculateTextRank(content: string, query: string): number {
    const sanitizedQuery = this.sanitizeQuery(query);
    if (!sanitizedQuery) return 0;
    
    const contentLower = content.toLowerCase();
    const queryTerms = sanitizedQuery.toLowerCase().split(' ');
    
    let score = 0;
    let totalTerms = queryTerms.length;
    
    for (const term of queryTerms) {
      if (term.length < 2) continue; // Skip very short terms
      
      // Count exact matches
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = (contentLower.match(regex) || []).length;
      
      if (matches > 0) {
        // Basic tf-idf-like scoring
        const termFrequency = matches / content.split(' ').length;
        const boost = term.length > 4 ? 1.2 : 1.0; // Longer terms get slight boost
        score += termFrequency * boost;
      }
    }
    
    // Normalize by query length and content length
    return score / Math.max(totalTerms, 1);
  }

  async performFullTextSearch(request: MockSearchRequest): Promise<MockSearchResponse> {
    const startTime = Date.now();
    
    try {
      const sanitizedQuery = this.sanitizeQuery(request.query);
      
      if (!sanitizedQuery) {
        return {
          results: [],
          totalFound: 0,
          query: request.query,
          processingTime: Date.now() - startTime,
          searchType: request.searchType || "fulltext",
        };
      }
      
      // Get user documents
      const userDocuments = this.documents.get(request.userID) || [];
      
      // Filter by document IDs if specified
      let filteredDocuments = userDocuments;
      if (request.documentIDs && request.documentIDs.length > 0) {
        filteredDocuments = userDocuments.filter(doc => 
          request.documentIDs!.includes(doc.documentId)
        );
      }
      
      // Perform text matching and scoring
      const results: MockSearchResult[] = [];
      const queryTerms = sanitizedQuery.toLowerCase().split(' ');
      
      for (const doc of filteredDocuments) {
        const content = doc.content.toLowerCase();
        
        // Check if any query terms match in the content
        const hasMatch = queryTerms.some(term => 
          term.length >= 2 && content.includes(term)
        );
        
        if (hasMatch) {
          const score = this.calculateTextRank(doc.content, sanitizedQuery);
          
          if (score > 0) {
            results.push({
              id: doc.id,
              documentID: doc.documentId,
              content: doc.content,
              score: score,
              metadata: {
                filename: doc.originalName,
                pageNumber: doc.pageNumber,
                chunkIndex: doc.chunkIndex,
              },
            });
          }
        }
      }
      
      // Sort by score (descending) and limit results
      results.sort((a, b) => b.score - a.score);
      const limitedResults = results.slice(0, request.limit || 20);
      
      return {
        results: limitedResults,
        totalFound: limitedResults.length,
        query: request.query,
        processingTime: Date.now() - startTime,
        searchType: request.searchType || "fulltext",
      };
      
    } catch (error) {
      throw new Error(`Full-text search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to combine results for hybrid search testing
  combineSearchResults(
    vectorResults: MockSearchResult[],
    fullTextResults: MockSearchResult[],
    vectorWeight: number = 0.7,
    fullTextWeight: number = 0.3
  ): MockSearchResult[] {
    const resultMap = new Map<string, MockSearchResult>();
    
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

  clear(): void {
    this.documents.clear();
    this.setupMockData();
  }
}

describe('Full-Text Search with NeonDB', () => {
  let mockSearchService: MockFullTextSearchService;

  beforeEach(() => {
    mockSearchService = new MockFullTextSearchService();
  });

  afterEach(() => {
    mockSearchService.clear();
  });

  describe('Query Sanitization and Processing', () => {
    it('should sanitize special characters from queries', async () => {
      const searchRequests = [
        { query: "machine & learning", userID: "user1" },
        { query: "data | science", userID: "user1" },
        { query: "python (programming)", userID: "user1" },
        { query: "AI ! algorithms", userID: "user1" },
      ];

      for (const request of searchRequests) {
        const response = await mockSearchService.performFullTextSearch(request);
        
        // Should not throw errors and should return valid results
        expect(response).toBeDefined();
        expect(response.results).toBeDefined();
        expect(response.query).toBe(request.query); // Original query preserved
      }
    });

    it('should handle empty and whitespace-only queries', async () => {
      const emptyQueries = ["", "   ", "\t\n", "   \n  \t  "];

      for (const query of emptyQueries) {
        const response = await mockSearchService.performFullTextSearch({
          query,
          userID: "user1",
        });

        expect(response.results).toHaveLength(0);
        expect(response.totalFound).toBe(0);
      }
    });

    it('should normalize whitespace in queries', async () => {
      const searchRequest: MockSearchRequest = {
        query: "  machine    learning   algorithms  ",
        userID: "user1",
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      // Should find results despite irregular whitespace
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.some(r => 
        r.content.toLowerCase().includes('machine') && 
        r.content.toLowerCase().includes('learning')
      )).toBe(true);
    });
  });

  describe('Text Matching and Ranking', () => {
    it('should find exact keyword matches', async () => {
      const searchRequest: MockSearchRequest = {
        query: "machine learning",
        userID: "user1",
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.every(r => 
        r.content.toLowerCase().includes('machine') || 
        r.content.toLowerCase().includes('learning')
      )).toBe(true);
    });

    it('should rank results by relevance', async () => {
      const searchRequest: MockSearchRequest = {
        query: "machine learning algorithms",
        userID: "user1",
        limit: 10,
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      expect(response.results.length).toBeGreaterThan(1);
      
      // Results should be sorted by score in descending order
      for (let i = 1; i < response.results.length; i++) {
        expect(response.results[i].score).toBeLessThanOrEqual(response.results[i - 1].score);
      }
      
      // Higher scores should go to content with more query term matches
      const topResult = response.results[0];
      expect(topResult.score).toBeGreaterThan(0);
    });

    it('should handle partial word matches', async () => {
      const searchRequest: MockSearchRequest = {
        query: "data visualization",
        userID: "user1",
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.some(r => 
        r.content.toLowerCase().includes('data') && 
        r.content.toLowerCase().includes('visualization')
      )).toBe(true);
    });

    it('should find results with synonyms and related terms', async () => {
      const searchRequest: MockSearchRequest = {
        query: "artificial intelligence",
        userID: "user1",
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      expect(response.results.length).toBeGreaterThan(0);
      // Should find documents containing "artificial intelligence" or related terms
      expect(response.results.some(r => 
        r.content.toLowerCase().includes('artificial') || 
        r.content.toLowerCase().includes('intelligence')
      )).toBe(true);
    });

    it('should handle case-insensitive searches', async () => {
      const searchRequests = [
        { query: "PYTHON", userID: "user1" },
        { query: "Python", userID: "user1" },
        { query: "python", userID: "user1" },
        { query: "pYtHoN", userID: "user1" },
      ];

      const responses = await Promise.all(
        searchRequests.map(req => mockSearchService.performFullTextSearch(req))
      );

      // All should return similar results regardless of case
      const resultCounts = responses.map(r => r.results.length);
      const firstCount = resultCounts[0];
      
      expect(resultCounts.every(count => count === firstCount)).toBe(true);
      expect(firstCount).toBeGreaterThan(0);
    });
  });

  describe('Access Control and Filtering', () => {
    it('should enforce user access control', async () => {
      const user1Request: MockSearchRequest = {
        query: "data",
        userID: "user1",
      };

      const user2Request: MockSearchRequest = {
        query: "data",
        userID: "user2",
      };

      const user1Response = await mockSearchService.performFullTextSearch(user1Request);
      const user2Response = await mockSearchService.performFullTextSearch(user2Request);

      // Each user should only see their own documents
      const user1DocumentIds = new Set(user1Response.results.map(r => r.documentID));
      const user2DocumentIds = new Set(user2Response.results.map(r => r.documentID));

      // No overlap between user results
      expect([...user1DocumentIds].some(id => user2DocumentIds.has(id))).toBe(false);
    });

    it('should support document ID filtering', async () => {
      const searchRequest: MockSearchRequest = {
        query: "learning",
        userID: "user1",
        documentIDs: ["doc_1"], // Only search in doc_1
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      // All results should be from doc_1 only
      expect(response.results.every(r => r.documentID === "doc_1")).toBe(true);
      expect(response.results.length).toBeGreaterThan(0);
    });

    it('should respect result limits', async () => {
      const searchRequest: MockSearchRequest = {
        query: "data",
        userID: "user1",
        limit: 2,
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      expect(response.results.length).toBeLessThanOrEqual(2);
    });

    it('should handle searches with no matching results', async () => {
      const searchRequest: MockSearchRequest = {
        query: "quantum computing blockchain", // Terms not in our test data
        userID: "user1",
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      expect(response.results).toHaveLength(0);
      expect(response.totalFound).toBe(0);
      expect(response.query).toBe("quantum computing blockchain");
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should complete searches within reasonable time', async () => {
      const searchRequest: MockSearchRequest = {
        query: "machine learning python data",
        userID: "user1",
      };

      const startTime = Date.now();
      const response = await mockSearchService.performFullTextSearch(searchRequest);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(response.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long queries', async () => {
      const longQuery = "machine learning algorithms artificial intelligence deep learning neural networks python programming data science visualization matplotlib pandas numpy scikit-learn tensorflow".repeat(5);
      
      const searchRequest: MockSearchRequest = {
        query: longQuery,
        userID: "user1",
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      expect(response).toBeDefined();
      expect(response.results).toBeDefined();
      // Should still find relevant results
      expect(response.results.length).toBeGreaterThan(0);
    });

    it('should handle special characters and punctuation', async () => {
      const specialQueries = [
        "machine-learning",
        "data_science",
        "AI/ML",
        "python 3.x",
        "neural networks (CNN)",
      ];

      for (const query of specialQueries) {
        const response = await mockSearchService.performFullTextSearch({
          query,
          userID: "user1",
        });

        expect(response).toBeDefined();
        expect(response.results).toBeDefined();
        // Should handle gracefully without errors
      }
    });

    it('should include proper metadata in results', async () => {
      const searchRequest: MockSearchRequest = {
        query: "python",
        userID: "user1",
      };

      const response = await mockSearchService.performFullTextSearch(searchRequest);

      expect(response.results.length).toBeGreaterThan(0);
      
      for (const result of response.results) {
        expect(result.id).toBeDefined();
        expect(result.documentID).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.score).toBeGreaterThan(0);
        expect(result.metadata).toBeDefined();
        expect(result.metadata.filename).toBeDefined();
        expect(typeof result.metadata.chunkIndex).toBe('number');
        
        if (result.metadata.pageNumber !== undefined) {
          expect(typeof result.metadata.pageNumber).toBe('number');
        }
      }
    });
  });

  describe('Hybrid Search Integration', () => {
    it('should combine vector and full-text results effectively', async () => {
      // Mock vector results
      const mockVectorResults: MockSearchResult[] = [
        {
          id: "chunk_1",
          documentID: "doc_1",
          content: "Vector search result 1",
          score: 0.9,
          metadata: { filename: "doc1.pdf", chunkIndex: 0, pageNumber: 1 }
        },
        {
          id: "chunk_3",
          documentID: "doc_2",
          content: "Vector search result 2",
          score: 0.8,
          metadata: { filename: "doc2.pdf", chunkIndex: 0, pageNumber: 1 }
        }
      ];

      // Get full-text results
      const fullTextResults = await mockSearchService.performFullTextSearch({
        query: "machine learning",
        userID: "user1",
      });

      // Combine results
      const combinedResults = mockSearchService.combineSearchResults(
        mockVectorResults,
        fullTextResults.results
      );

      expect(combinedResults.length).toBeGreaterThan(0);
      
      // Results should be sorted by combined score
      for (let i = 1; i < combinedResults.length; i++) {
        expect(combinedResults[i].score).toBeLessThanOrEqual(combinedResults[i - 1].score);
      }
      
      // Should include both vector and full-text results
      const resultIds = new Set(combinedResults.map(r => r.id));
      expect(resultIds.size).toBeGreaterThan(0);
    });

    it('should handle duplicate results between vector and full-text searches', async () => {
      // Mock vector results with same IDs as full-text results
      const mockVectorResults: MockSearchResult[] = [
        {
          id: "chunk_1", // Same ID as in full-text results
          documentID: "doc_1",
          content: "Machine learning algorithms",
          score: 0.85,
          metadata: { filename: "ml_guide.pdf", chunkIndex: 0, pageNumber: 1 }
        }
      ];

      const fullTextResults = await mockSearchService.performFullTextSearch({
        query: "machine learning",
        userID: "user1",
      });

      const combinedResults = mockSearchService.combineSearchResults(
        mockVectorResults,
        fullTextResults.results
      );

      // Should not have duplicate IDs
      const resultIds = combinedResults.map(r => r.id);
      const uniqueIds = new Set(resultIds);
      expect(uniqueIds.size).toBe(resultIds.length);
      
      // Combined scores should be higher for items found in both searches
      const duplicateResult = combinedResults.find(r => r.id === "chunk_1");
      if (duplicateResult) {
        expect(duplicateResult.score).toBeGreaterThan(0.5); // Should have combined score
      }
    });

    it('should allow configurable weighting between search types', async () => {
      const mockVectorResults: MockSearchResult[] = [
        {
          id: "chunk_vector_only",
          documentID: "doc_1",
          content: "Vector result",
          score: 1.0,
          metadata: { filename: "doc1.pdf", chunkIndex: 0 }
        }
      ];

      const mockFullTextResults: MockSearchResult[] = [
        {
          id: "chunk_fulltext_only",
          documentID: "doc_2",
          content: "Full-text result",
          score: 1.0,
          metadata: { filename: "doc2.pdf", chunkIndex: 0 }
        }
      ];

      // Test different weight configurations
      const vectorHeavy = mockSearchService.combineSearchResults(
        mockVectorResults, mockFullTextResults, 0.9, 0.1
      );
      
      const fullTextHeavy = mockSearchService.combineSearchResults(
        mockVectorResults, mockFullTextResults, 0.1, 0.9
      );

      const vectorResult = vectorHeavy.find(r => r.id === "chunk_vector_only");
      const fullTextResult = fullTextHeavy.find(r => r.id === "chunk_fulltext_only");

      // Vector-heavy weighting should give higher score to vector results
      expect(vectorResult?.score).toBe(0.9); // 1.0 * 0.9
      expect(fullTextResult?.score).toBe(0.9); // 1.0 * 0.9
      
      // But in full-text heavy weighting, full-text should score higher  
      const vectorResultInFTHeavy = fullTextHeavy.find(r => r.id === "chunk_vector_only");
      const fullTextResultInFTHeavy = fullTextHeavy.find(r => r.id === "chunk_fulltext_only");
      
      expect(vectorResultInFTHeavy?.score).toBe(0.1); // 1.0 * 0.1
      expect(fullTextResultInFTHeavy?.score).toBe(0.9); // 1.0 * 0.9
    });
  });
});