import { beforeEach, describe, expect, test, vi } from "vitest";
import { type ChunkingRequest, type ParsedElement, processDocumentChunking } from "../embedding";

// Mock the Cohere API and secrets
vi.mock("encore.dev/config", () => ({
  secret: vi.fn((name: string) => {
    if (name === "CohereApiKey") {
      return () => "mock-cohere-key";
    }
    if (name === "REDIS_URL") {
      return () => undefined; // No Redis in tests
    }
    return () => undefined;
  }),
}));

// Mock fetch for Cohere API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper function to create mock elements
function createMockElement(
  content: string,
  type: ParsedElement["type"] = "text",
  page = 1
): ParsedElement {
  return {
    type,
    content,
    page,
    confidence: 0.9,
    bbox: { x: 0, y: 0, width: 100, height: 20 },
  };
}

// Helper function to create mock chunking request
function createMockRequest(elements: ParsedElement[], extractedText?: string): ChunkingRequest {
  return {
    documentId: "test-doc-123",
    extractedText: extractedText || elements.map((el) => el.content).join("\n\n"),
    elements,
    metadata: {
      title: "Test Document",
      pageCount: 1,
      language: "en",
    },
  };
}

describe("Document Chunking Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful Cohere API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ], // Mock embeddings
        meta: {
          api_version: { version: "1" },
          billed_units: { input_tokens: 10 },
        },
      }),
    });
  });

  describe("Semantic Coherence Testing", () => {
    test("should maintain semantic coherence in chunks", async () => {
      // Set up environment for DeepEval testing
      process.env.DEEPEVAL_API_KEY = "mock-key";

      const elements: ParsedElement[] = [
        createMockElement(
          "This is the first sentence of a coherent thought about artificial intelligence."
        ),
        createMockElement(
          "It continues here with more details about AI applications and their benefits."
        ),
        createMockElement(
          "A new topic starts now about machine learning, which should ideally be in a new chunk if possible."
        ),
        createMockElement(
          "This sentence belongs to the machine learning topic and discusses neural networks."
        ),
      ];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");
      expect(response.chunks.length).toBeGreaterThan(0);

      for (const chunk of response.chunks) {
        // Test semantic coherence using DeepEval custom matcher
        await expect(chunk.content).toPassLLMRubric(
          "The chunk contains a complete thought or a semantically coherent segment. It does not end abruptly mid-sentence or mix unrelated topics jarringly."
        );

        // Basic coherence checks
        expect(chunk.content.length).toBeGreaterThan(10);
        expect(chunk.content.trim()).not.toBe("");
        expect(chunk.tokenCount).toBeGreaterThan(0);
      }
    });

    test("should create coherent chunks from mixed content types", async () => {
      process.env.DEEPEVAL_API_KEY = "mock-key";

      const elements: ParsedElement[] = [
        createMockElement("Introduction to Data Science", "title"),
        createMockElement(
          "Data science is an interdisciplinary field that uses scientific methods, processes, algorithms and systems to extract knowledge and insights from structured and unstructured data."
        ),
        createMockElement("Machine Learning Fundamentals", "header"),
        createMockElement(
          "Machine learning is a subset of artificial intelligence that focuses on the use of data and algorithms to imitate the way that humans learn."
        ),
      ];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");

      for (const chunk of response.chunks) {
        await expect(chunk.content).toPassLLMRubric(
          "Contains complete, coherent information without mid-sentence breaks or abrupt topic changes."
        );
      }
    });
  });

  describe("Structure Preservation", () => {
    test("should preserve document structure metadata for tables", async () => {
      const elements: ParsedElement[] = [
        createMockElement("A normal paragraph before the table."),
        createMockElement(
          "Column A | Column B | Column C\n-------|--------|--------\nValue 1 | Value 2 | Value 3\nValue 4 | Value 5 | Value 6",
          "table"
        ),
        createMockElement("Another paragraph after the table."),
      ];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");

      // Find chunk containing table content
      const tableChunk = response.chunks.find(
        (chunk) =>
          chunk.content.includes("Column A | Column B") ||
          chunk.metadata.elementTypes.includes("table")
      );

      expect(tableChunk).toBeDefined();
      if (tableChunk) {
        expect(tableChunk.content).toContain("Column A");
        expect(tableChunk.content).toContain("Value 1");
        expect(tableChunk.metadata.elementTypes).toContain("table");
      }
    });

    test("should preserve list structure", async () => {
      const elements: ParsedElement[] = [
        createMockElement("Introduction to the topic:"),
        createMockElement(
          "• First bullet point\n• Second bullet point\n• Third bullet point",
          "list"
        ),
        createMockElement("Conclusion follows the list."),
      ];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");

      const listChunk = response.chunks.find(
        (chunk) =>
          chunk.content.includes("bullet point") || chunk.metadata.elementTypes.includes("list")
      );

      expect(listChunk).toBeDefined();
      if (listChunk) {
        expect(listChunk.content).toContain("•");
        expect(listChunk.metadata.elementTypes).toContain("list");
      }
    });

    test("should handle headers and maintain hierarchy", async () => {
      const elements: ParsedElement[] = [
        createMockElement("Main Title", "title"),
        createMockElement(
          "This document covers important topics in data science and machine learning."
        ),
        createMockElement("Chapter 1: Introduction", "header"),
        createMockElement(
          "Data science combines domain expertise, programming skills, and knowledge of mathematics and statistics."
        ),
        createMockElement("Section 1.1: Overview", "header"),
        createMockElement("The field of data science has grown rapidly in recent years."),
      ];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");

      // Headers should influence chunk boundaries
      const headerChunks = response.chunks.filter(
        (chunk) =>
          chunk.metadata.elementTypes.includes("title") ||
          chunk.metadata.elementTypes.includes("header")
      );

      expect(headerChunks.length).toBeGreaterThan(0);
    });
  });

  describe("Chunk Quality and Size Management", () => {
    test("should respect token count limits", async () => {
      // Create a very long element that should be split
      const longContent = "This is a very long sentence that repeats itself. ".repeat(50);
      const elements: ParsedElement[] = [
        createMockElement(longContent),
        createMockElement("Short follow-up sentence."),
      ];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");

      // All chunks should be within reasonable token limits
      response.chunks.forEach((chunk) => {
        expect(chunk.tokenCount).toBeLessThanOrEqual(1000); // DEFAULT_MAX_CHUNK_SIZE
        expect(chunk.tokenCount).toBeGreaterThan(0);
      });
    });

    test("should assign proper metadata to chunks", async () => {
      const elements: ParsedElement[] = [
        createMockElement("Sample content for testing metadata assignment."),
      ];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");
      expect(response.chunks.length).toBeGreaterThan(0);

      response.chunks.forEach((chunk, index) => {
        expect(chunk.id).toBeDefined();
        expect(chunk.documentId).toBe("test-doc-123");
        expect(chunk.chunkIndex).toBe(index);
        expect(chunk.embedding).toBeDefined();
        expect(chunk.embedding.length).toBe(3); // Mock embedding length
        expect(chunk.metadata).toBeDefined();
        expect(chunk.metadata.elementTypes).toBeDefined();
        expect(chunk.createdAt).toBeInstanceOf(Date);
      });
    });

    test("should handle empty or minimal content gracefully", async () => {
      const elements: ParsedElement[] = [createMockElement("Short.")];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");
      expect(response.chunks.length).toBe(1);
      expect(response.chunks[0].content).toBe("Short.");
    });
  });

  describe("Error Handling", () => {
    test("should handle missing required fields", async () => {
      const invalidRequest = {
        documentId: "",
        extractedText: "",
        elements: [],
        metadata: {},
      } as ChunkingRequest;

      await expect(processDocumentChunking(invalidRequest)).rejects.toThrow();
    });

    test("should handle API failures gracefully", async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error("API Error"));

      const elements: ParsedElement[] = [
        createMockElement("Test content for API failure scenario."),
      ];

      const request = createMockRequest(elements);

      await expect(processDocumentChunking(request)).rejects.toThrow();
    });

    test("should validate input parameters", async () => {
      const requestWithoutElements = {
        documentId: "test-doc",
        extractedText: "Some text",
        elements: null,
        metadata: {},
      } as any;

      await expect(processDocumentChunking(requestWithoutElements)).rejects.toThrow();
    });
  });

  describe("Performance and Metrics", () => {
    test("should provide processing metrics", async () => {
      const elements: ParsedElement[] = [createMockElement("Content for performance testing.")];

      const request = createMockRequest(elements);
      const response = await processDocumentChunking(request);

      expect(response.status).toBe("success");
      expect(response.totalChunks).toBe(response.chunks.length);
      expect(response.processingTime).toBeGreaterThanOrEqual(0);
      expect(response.documentId).toBe("test-doc-123");
    });
  });
});
