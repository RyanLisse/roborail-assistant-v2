import { describe, expect, it } from "vitest";
import {
  DocumentStatus,
  MessageRole,
  createConversationSchema,
  createDocumentChunkSchema,
  createDocumentSchema,
  createMessageSchema,
} from "./schema";

describe("Database Schema Validation", () => {
  describe("Document Schema", () => {
    it("should validate correct document data", () => {
      const validDocument = {
        id: "doc-123",
        userId: "user-456",
        filename: "test.pdf",
        originalName: "Test Document.pdf",
        contentType: "application/pdf",
        fileSize: 1024000,
        status: "uploaded" as const,
        metadata: { author: "John Doe", tags: ["important"] },
      };

      const result = createDocumentSchema.safeParse(validDocument);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("doc-123");
        expect(result.data.metadata).toEqual({ author: "John Doe", tags: ["important"] });
      }
    });

    it("should reject invalid document data", () => {
      const invalidDocument = {
        id: "", // Empty ID should fail
        userId: "user-456",
        filename: "test.pdf",
        originalName: "Test Document.pdf",
        contentType: "application/pdf",
        fileSize: -100, // Negative file size should fail
        status: "invalid-status", // Invalid status should fail
      };

      const result = createDocumentSchema.safeParse(invalidDocument);
      expect(result.success).toBe(false);
    });

    it("should validate document status enum", () => {
      const validStatuses = ["uploaded", "processing", "processed", "failed"];
      const invalidStatuses = ["pending", "invalid", ""];

      validStatuses.forEach((status) => {
        const result = DocumentStatus.safeParse(status);
        expect(result.success).toBe(true);
      });

      invalidStatuses.forEach((status) => {
        const result = DocumentStatus.safeParse(status);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Document Chunk Schema", () => {
    it("should validate correct chunk data", () => {
      const validChunk = {
        id: "chunk-123",
        documentId: "doc-456",
        content: "This is a test chunk with some meaningful content.",
        embedding: Array.from({ length: 1024 }, (_, i) => Math.sin(i) * 0.5), // Valid 1024-dim vector
        chunkIndex: 0,
        pageNumber: 1,
        tokenCount: 15,
        metadata: { section: "introduction", confidence: 0.95 },
      };

      const result = createDocumentChunkSchema.safeParse(validChunk);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.embedding).toHaveLength(1024);
        expect(result.data.chunkIndex).toBe(0);
      }
    });

    it("should reject invalid chunk data", () => {
      const invalidChunk = {
        id: "chunk-123",
        documentId: "doc-456",
        content: "", // Empty content should fail
        embedding: Array.from({ length: 512 }, () => 0.1), // Wrong embedding dimension
        chunkIndex: -1, // Negative index should fail
        tokenCount: 0, // Zero token count should fail
      };

      const result = createDocumentChunkSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });

    it("should require exactly 1024 dimensions for embeddings", () => {
      const correctEmbedding = Array.from({ length: 1024 }, () => 0.1);
      const wrongEmbedding = Array.from({ length: 512 }, () => 0.1);

      const chunkWithCorrectEmbedding = {
        id: "chunk-123",
        documentId: "doc-456",
        content: "Test content",
        embedding: correctEmbedding,
        chunkIndex: 0,
        tokenCount: 5,
      };

      const chunkWithWrongEmbedding = {
        ...chunkWithCorrectEmbedding,
        embedding: wrongEmbedding,
      };

      expect(createDocumentChunkSchema.safeParse(chunkWithCorrectEmbedding).success).toBe(true);
      expect(createDocumentChunkSchema.safeParse(chunkWithWrongEmbedding).success).toBe(false);
    });
  });

  describe("Conversation Schema", () => {
    it("should validate correct conversation data", () => {
      const validConversation = {
        id: "conv-123",
        userId: "user-456",
        title: "My Chat About Documents",
      };

      const result = createConversationSchema.safeParse(validConversation);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Chat About Documents");
      }
    });

    it("should reject conversation with empty fields", () => {
      const invalidConversation = {
        id: "",
        userId: "",
        title: "",
      };

      const result = createConversationSchema.safeParse(invalidConversation);
      expect(result.success).toBe(false);
    });
  });

  describe("Message Schema", () => {
    it("should validate correct message data", () => {
      const validMessage = {
        id: "msg-123",
        conversationId: "conv-456",
        role: "user" as const,
        content: "What is the capital of France?",
        citations: [
          {
            documentId: "doc-789",
            filename: "geography.pdf",
            pageNumber: 42,
            chunkContent: "France is a country in Europe...",
            relevanceScore: 0.95,
          },
        ],
      };

      const result = createMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.citations).toHaveLength(1);
        expect(result.data.citations[0].relevanceScore).toBe(0.95);
      }
    });

    it("should validate message roles", () => {
      const validRoles = ["user", "assistant"];
      const invalidRoles = ["system", "admin", ""];

      validRoles.forEach((role) => {
        const result = MessageRole.safeParse(role);
        expect(result.success).toBe(true);
      });

      invalidRoles.forEach((role) => {
        const result = MessageRole.safeParse(role);
        expect(result.success).toBe(false);
      });
    });

    it("should validate citation relevance scores", () => {
      const messageWithValidCitation = {
        id: "msg-123",
        conversationId: "conv-456",
        role: "assistant" as const,
        content: "The answer is...",
        citations: [
          {
            documentId: "doc-123",
            filename: "test.pdf",
            chunkContent: "Relevant content",
            relevanceScore: 0.85, // Valid score between 0 and 1
          },
        ],
      };

      const messageWithInvalidCitation = {
        ...messageWithValidCitation,
        citations: [
          {
            ...messageWithValidCitation.citations[0],
            relevanceScore: 1.5, // Invalid score > 1
          },
        ],
      };

      expect(createMessageSchema.safeParse(messageWithValidCitation).success).toBe(true);
      expect(createMessageSchema.safeParse(messageWithInvalidCitation).success).toBe(false);
    });

    it("should allow empty citations array", () => {
      const messageWithoutCitations = {
        id: "msg-123",
        conversationId: "conv-456",
        role: "user" as const,
        content: "Hello there!",
        citations: [],
      };

      const result = createMessageSchema.safeParse(messageWithoutCitations);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.citations).toHaveLength(0);
      }
    });
  });

  describe("Type Safety", () => {
    it("should provide proper TypeScript types", () => {
      // This test ensures our types are properly inferred
      const docData = createDocumentSchema.parse({
        id: "doc-123",
        userId: "user-456",
        filename: "test.pdf",
        originalName: "Test.pdf",
        contentType: "application/pdf",
        fileSize: 1000,
        status: "uploaded" as const,
      });

      // TypeScript should infer these types correctly
      const id: string = docData.id;
      const status: "uploaded" | "processing" | "processed" | "failed" = docData.status;
      const metadata: Record<string, any> = docData.metadata;

      expect(typeof id).toBe("string");
      expect(status).toBe("uploaded");
      expect(typeof metadata).toBe("object");
    });
  });
});
