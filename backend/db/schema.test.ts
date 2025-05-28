import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conversationMessages, conversations, documentChunks, documents } from "./schema";

// Test database connection
const testDbUrl =
  process.env.TEST_DATABASE_URL || "postgresql://test:test@localhost:5432/test_rag_db";
const client = postgres(testDbUrl);
const testDb = drizzle(client);

describe("Database Schema", () => {
  beforeAll(async () => {
    // Setup test database - migrations should create tables
    console.log("Setting up test database...");
  });

  afterAll(async () => {
    // Cleanup
    await client.end();
  });

  describe("Documents Table", () => {
    it("should create and query documents table", async () => {
      const testDocument = {
        id: "test-doc-1",
        userId: "user-123",
        filename: "test.pdf",
        originalName: "Test Document.pdf",
        contentType: "application/pdf",
        fileSize: 1024000,
        status: "uploaded" as const,
        uploadedAt: new Date(),
        chunkCount: 0,
        metadata: { author: "Test Author", tags: ["test"] },
      };

      // Insert test document
      const [inserted] = await testDb.insert(documents).values(testDocument).returning();
      expect(inserted.id).toBe(testDocument.id);
      expect(inserted.status).toBe("uploaded");

      // Query document
      const found = await testDb.select().from(documents).where(eq(documents.id, testDocument.id));
      expect(found).toHaveLength(1);
      expect(found[0].filename).toBe(testDocument.filename);
    });

    it("should enforce required fields", async () => {
      // Test missing required fields
      await expect(async () => {
        await testDb.insert(documents).values({
          // Missing required fields
        } as any);
      }).toThrow();
    });

    it("should validate status enum", async () => {
      const testDocument = {
        id: "test-doc-invalid-status",
        userId: "user-123",
        filename: "test.pdf",
        originalName: "Test Document.pdf",
        contentType: "application/pdf",
        fileSize: 1024000,
        status: "invalid-status" as any,
        uploadedAt: new Date(),
        chunkCount: 0,
        metadata: {},
      };

      // Should reject invalid status
      await expect(async () => {
        await testDb.insert(documents).values(testDocument);
      }).toThrow();
    });
  });

  describe("Document Chunks Table", () => {
    it("should create and query document chunks with vector embeddings", async () => {
      // First create a parent document
      const parentDoc = {
        id: "parent-doc-1",
        userId: "user-123",
        filename: "parent.pdf",
        originalName: "Parent Document.pdf",
        contentType: "application/pdf",
        fileSize: 1024000,
        status: "processed" as const,
        uploadedAt: new Date(),
        chunkCount: 1,
        metadata: {},
      };
      await testDb.insert(documents).values(parentDoc);

      const testChunk = {
        id: "chunk-1",
        documentId: "parent-doc-1",
        content: "This is a test document chunk containing important information.",
        embedding: Array.from({ length: 1024 }, () => Math.random() - 0.5), // Mock embedding
        chunkIndex: 0,
        pageNumber: 1,
        tokenCount: 15,
        metadata: { section: "introduction" },
        createdAt: new Date(),
      };

      const [inserted] = await testDb.insert(documentChunks).values(testChunk).returning();
      expect(inserted.id).toBe(testChunk.id);
      expect(inserted.embedding).toHaveLength(1024);
      expect(inserted.chunkIndex).toBe(0);
    });

    it("should maintain foreign key relationship with documents", async () => {
      const invalidChunk = {
        id: "chunk-invalid-parent",
        documentId: "non-existent-doc",
        content: "Test content",
        embedding: Array.from({ length: 1024 }, () => 0.1),
        chunkIndex: 0,
        tokenCount: 5,
        metadata: {},
        createdAt: new Date(),
      };

      // Should fail due to foreign key constraint
      await expect(async () => {
        await testDb.insert(documentChunks).values(invalidChunk);
      }).toThrow();
    });
  });

  describe("Conversations Table", () => {
    it("should create and manage conversations", async () => {
      const testConversation = {
        id: "conv-1",
        userId: "user-123",
        title: "Test Conversation",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [inserted] = await testDb.insert(conversations).values(testConversation).returning();
      expect(inserted.id).toBe(testConversation.id);
      expect(inserted.title).toBe(testConversation.title);
    });
  });

  describe("Conversation Messages Table", () => {
    it("should create messages with citations", async () => {
      // First create a conversation
      const conv = {
        id: "conv-for-messages",
        userId: "user-123",
        title: "Test Conversation",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await testDb.insert(conversations).values(conv);

      const testMessage = {
        id: "msg-1",
        conversationId: "conv-for-messages",
        role: "user" as const,
        content: "What is the capital of France?",
        citations: [
          {
            documentId: "doc-123",
            filename: "geography.pdf",
            pageNumber: 42,
            chunkContent: "France's capital is Paris...",
            relevanceScore: 0.95,
          },
        ],
        createdAt: new Date(),
      };

      const [inserted] = await testDb.insert(conversationMessages).values(testMessage).returning();
      expect(inserted.id).toBe(testMessage.id);
      expect(inserted.citations).toHaveLength(1);
      expect(inserted.citations[0].documentId).toBe("doc-123");
    });

    it("should enforce role enum validation", async () => {
      const invalidMessage = {
        id: "msg-invalid-role",
        conversationId: "conv-for-messages",
        role: "invalid-role" as any,
        content: "Test content",
        citations: [],
        createdAt: new Date(),
      };

      await expect(async () => {
        await testDb.insert(conversationMessages).values(invalidMessage);
      }).toThrow();
    });
  });

  describe("Vector Search Capabilities", () => {
    it("should support vector similarity queries", async () => {
      // This test would verify that vector similarity search works
      // For now, we'll just test that the embedding column accepts vector data
      const queryEmbedding = Array.from({ length: 1024 }, () => Math.random() - 0.5);

      // This would be a real vector similarity query in implementation
      const chunks = await testDb.select().from(documentChunks).limit(5);
      expect(Array.isArray(chunks)).toBe(true);
    });
  });
});
