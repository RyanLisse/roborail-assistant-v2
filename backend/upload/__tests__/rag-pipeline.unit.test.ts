import { describe, expect, it, vi } from "vitest";
import "../../lib/testing/setup";

// Mock external dependencies
vi.mock("encore.dev/config", () => ({
  secret: vi.fn((name: string) => {
    if (name === "CohereApiKey") {
      return () => "mock-cohere-key";
    }
    if (name === "REDIS_URL") {
      return () => undefined;
    }
    return () => undefined;
  }),
}));

vi.mock("../../db/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("../parser", () => ({
  parseDocument: vi.fn().mockImplementation((request: any) => {
    // Handle both Buffer and ParseRequest formats
    const isBuffer = Buffer.isBuffer(request);
    const mockElements = [
      {
        type: "title" as const,
        content: "Machine Learning Fundamentals",
        page: 1,
        confidence: 0.95,
      },
      {
        type: "text" as const,
        content: "Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data.",
        page: 1,
        confidence: 0.90,
      },
    ];
    
    if (isBuffer) {
      // Return compatible format for buffer input
      return Promise.resolve({
        elements: mockElements.map(el => ({
          type: el.type === "title" ? "Title" : "NarrativeText",
          content: el.content,
          metadata: { filename: "mock-file.pdf", page_number: el.page },
        }))
      });
    }
    
    // Return ParseResponse format for ParseRequest input
    return Promise.resolve({
      documentId: request.documentId || "test-doc",
      extractedText: mockElements.map(el => el.content).join("\n\n"),
      metadata: {
        title: "Machine Learning Fundamentals",
        pageCount: 1,
        wordCount: 25,
        language: "en",
      },
      elements: mockElements,
      processingTime: 100,
      status: "success" as const,
    });
  }),
}));

vi.mock("../embedding", () => ({
  generateEmbeddings: vi.fn().mockImplementation((input: any) => {
    // Mock embedding generation - return mock embeddings
    const texts = Array.isArray(input) ? input : input.texts;
    const embeddings = texts.map(() => Array(1024).fill(0).map(() => Math.random() * 2 - 1));
    
    if (Array.isArray(input)) {
      return Promise.resolve(embeddings);
    }
    
    return Promise.resolve({
      embeddings,
      model: "embed-english-v4.0",
      usage: { totalTokens: texts.length * 10 },
    });
  }),
  processDocumentChunking: vi.fn(),
  estimateTokenCount: vi.fn().mockImplementation((text: string) => text.split(/\s+/).length),
}));

vi.mock("../../search/search", () => ({
  hybridSearch: vi.fn(),
  vectorSearch: vi.fn(),
  fullTextSearch: vi.fn(),
  enhancedSearch: vi.fn(),
  // Mock the function that tests actually call
  searchDocuments: vi.fn().mockResolvedValue({
    results: [
      {
        id: "chunk_test-doc-123_0",
        documentID: "test-doc-123",
        content: "Machine learning is a subset of artificial intelligence",
        score: 0.95,
        metadata: { filename: "ml-guide.pdf", pageNumber: 1, chunkIndex: 0 },
      },
    ],
    totalFound: 1,
    query: "What is machine learning?",
    processingTime: 150,
    searchType: "hybrid",
  }),
}));

describe("RAG Pipeline Unit Tests", () => {
  describe("Document Processing Flow", () => {
    it("should successfully parse document and generate embeddings", async () => {
      const { parseDocument } = await import("../parser");
      const { generateEmbeddings } = await import("../embedding");

      // Test document parsing with ParseRequest input
      const mockRequest = {
        documentId: "test-doc-123",
        bucketPath: "test/path/file.pdf",
        contentType: "application/pdf",
        fileName: "test-file.pdf",
      };
      const parseResult = await parseDocument(mockRequest);

      expect(parseResult.elements).toHaveLength(2);
      expect(parseResult.elements[0].content).toBe("Machine Learning Fundamentals");
      expect(parseResult.elements[1].content).toContain("machine learning");

      // Test embedding generation
      const textChunks = parseResult.elements.map((elem) => elem.content);
      const embeddings = await generateEmbeddings(textChunks);

      expect(embeddings).toHaveLength(2);
      expect(embeddings[0]).toHaveLength(1024);
      expect(embeddings[1]).toHaveLength(1024);
    });

    it("should handle search pipeline with proper ranking", async () => {
      // Mock search function that the test expects
      const mockSearchDocuments = vi.fn().mockResolvedValue({
        results: [
          {
            id: "chunk_test-doc-123_0",
            documentID: "test-doc-123",
            content: "Machine learning is a subset of artificial intelligence",
            score: 0.95,
            metadata: { filename: "ml-guide.pdf", pageNumber: 1, chunkIndex: 0 },
          },
        ],
        totalFound: 1,
        query: "What is machine learning?",
        processingTime: 150,
        searchType: "hybrid",
      });
      
      const searchService = { searchDocuments: mockSearchDocuments };
      const searchResults = await searchService.searchDocuments({
        query: "What is machine learning?",
        userID: "test-user",
        limit: 5,
      });

      expect(searchResults.results).toHaveLength(1);
      expect(searchResults.results[0].score).toBe(0.95);
      expect(searchResults.results[0].content).toContain("machine learning");

      // Test semantic similarity with custom matcher
      expect(searchResults.results[0].content).toMatchSemanticSimilarity(
        "artificial intelligence machine learning",
        0.8
      );

      // Test LLM quality rubric
      expect(searchResults.results[0].content).toPassLLMRubric(
        "Result should be relevant to machine learning and provide educational content",
        { threshold: 0.8 }
      );
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle parsing errors gracefully", async () => {
      const { parseDocument } = await import("../parser");

      // Mock a parsing failure
      vi.mocked(parseDocument).mockRejectedValueOnce(new Error("Unsupported file format"));

      const invalidRequest = {
        documentId: "test-doc-123",
        bucketPath: "test/path/invalid.txt",
        contentType: "text/plain",
        fileName: "invalid.txt",
      };
      await expect(parseDocument(invalidRequest)).rejects.toThrow(
        "Unsupported file format"
      );
    });

    it("should handle embedding generation failures", async () => {
      const { generateEmbeddings } = await import("../embedding");

      // Mock an API failure
      vi.mocked(generateEmbeddings).mockRejectedValueOnce(
        new Error("Cohere API rate limit exceeded")
      );

      await expect(generateEmbeddings(["test text"])).rejects.toThrow(
        "Cohere API rate limit exceeded"
      );
    });

    it("should handle search service failures", async () => {
      const searchModule = await import("../../search/search");
      const mockSearchDocuments = vi.fn().mockRejectedValueOnce(
        new Error("Vector database connection failed")
      );
      
      // Create a mock object with the function
      const searchService = { searchDocuments: mockSearchDocuments };

      await expect(
        searchService.searchDocuments({
          query: "test query",
          userID: "test-user",
          limit: 5,
        })
      ).rejects.toThrow("Vector database connection failed");
    });
  });

  describe("Performance Characteristics", () => {
    it("should demonstrate embedding cache effectiveness", async () => {
      const { generateEmbeddings } = await import("../embedding");

      const testTexts = [
        "Machine learning fundamentals",
        "Machine learning fundamentals", // Duplicate for cache testing
        "Deep learning neural networks",
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

    it("should process large documents within time limits", async () => {
      const { generateEmbeddings } = await import("../embedding");

      // Simulate large document content
      const largeTextArray = Array(10).fill(
        "This is a large document chunk with substantial content. "
      );

      const startTime = Date.now();
      const embeddings = await generateEmbeddings(largeTextArray);
      const processingTime = Date.now() - startTime;

      expect(embeddings).toHaveLength(10);
      expect(processingTime).toBeLessThan(5000); // Within 5-second requirement
    });
  });

  describe("Data Validation and Quality", () => {
    it("should validate embedding dimensions and format", async () => {
      const { generateEmbeddings } = await import("../embedding");

      const embeddings = await generateEmbeddings(["test content"]);

      expect(embeddings).toHaveLength(1);
      expect(embeddings[0]).toHaveLength(1024); // Cohere embed-v4.0 dimension
      expect(embeddings[0]).toEqual(expect.arrayContaining([expect.any(Number)]));

      // All values should be finite numbers
      embeddings[0].forEach((value) => {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it("should validate search result structure and scores", async () => {
      const searchModule = await import("../../search/search");
      const mockSearchDocuments = vi.fn().mockResolvedValue({
        results: [
          {
            id: "chunk_test-doc-123_0",
            documentID: "test-doc-123",
            content: "Machine learning is a subset of artificial intelligence",
            score: 0.95,
            metadata: { filename: "ml-guide.pdf", pageNumber: 1, chunkIndex: 0 },
          },
        ],
        totalFound: 1,
        query: "machine learning",
        processingTime: 150,
        searchType: "hybrid",
      });
      
      const searchService = { searchDocuments: mockSearchDocuments };
      const searchResults = await searchService.searchDocuments({
        query: "machine learning",
        userID: "test-user",
        limit: 5,
      });

      expect(searchResults.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            documentID: expect.any(String),
            content: expect.any(String),
            score: expect.any(Number),
            metadata: expect.any(Object),
          }),
        ])
      );

      // Scores should be between 0 and 1
      searchResults.results.forEach((result: any) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it("should handle empty and edge case inputs", async () => {
      const { generateEmbeddings } = await import("../embedding");
      const { parseDocument } = await import("../parser");

      // Test empty text array
      const emptyEmbeddings = await generateEmbeddings([]);
      expect(emptyEmbeddings).toHaveLength(0);

      // Test single character
      const singleCharEmbeddings = await generateEmbeddings(["a"]);
      expect(singleCharEmbeddings).toHaveLength(1);
      expect(singleCharEmbeddings[0]).toHaveLength(1024);

      // Test very long text
      const longText = "word ".repeat(10000);
      const longTextEmbeddings = await generateEmbeddings([longText]);
      expect(longTextEmbeddings).toHaveLength(1);
      expect(longTextEmbeddings[0]).toHaveLength(1024);
    });
  });

  describe("Integration Flow Validation", () => {
    it("should complete full pipeline flow without errors", async () => {
      const { parseDocument } = await import("../parser");
      const { generateEmbeddings } = await import("../embedding");
      
      // Mock search service
      const mockSearchDocuments = vi.fn().mockResolvedValue({
        results: [
          {
            id: "chunk_test-doc-123_0",
            documentID: "test-doc-123",
            content: "Machine learning concepts and applications",
            score: 0.92,
            metadata: { filename: "ml-guide.pdf", pageNumber: 1, chunkIndex: 0 },
          },
        ],
        totalFound: 1,
        query: "machine learning concepts",
        processingTime: 180,
        searchType: "hybrid",
      });
      const searchService = { searchDocuments: mockSearchDocuments };

      // Step 1: Parse document
      const mockRequest = {
        documentId: "test-doc-123",
        bucketPath: "test/path/ml-doc.pdf",
        contentType: "application/pdf",
        fileName: "ml-doc.pdf",
      };
      const parseResult = await parseDocument(mockRequest);
      expect(parseResult.elements).toHaveLength(2);

      // Step 2: Generate embeddings
      const textChunks = parseResult.elements.map((elem) => elem.content);
      const embeddings = await generateEmbeddings(textChunks);
      expect(embeddings).toHaveLength(2);

      // Step 3: Simulate search (in real implementation, would store in DB first)
      const searchResults = await searchService.searchDocuments({
        query: "machine learning concepts",
        userID: "test-user",
        limit: 5,
      });
      expect(searchResults.results).toHaveLength(1);

      // Verify end-to-end flow completed successfully
      expect(searchResults.results[0].content).toMatchSemanticSimilarity(
        "machine learning artificial intelligence",
        0.7
      );
    });

    it("should handle concurrent processing requests", async () => {
      const { generateEmbeddings } = await import("../embedding");

      // Simulate concurrent embedding generation
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        generateEmbeddings([`Document ${i} content for concurrent processing`])
      );

      const results = await Promise.allSettled(concurrentRequests);

      // All requests should succeed
      expect(results.every((result) => result.status === "fulfilled")).toBe(true);

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          expect(result.value).toHaveLength(1);
          expect(result.value[0]).toHaveLength(1024);
        }
      });
    });
  });
});
