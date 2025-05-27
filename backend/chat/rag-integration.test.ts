import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { processRAGQuery } from "./rag-orchestration";
import { db } from "../db/connection";
import { conversations, conversationMessages, documents, documentChunks } from "../db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

describe("RAG Pipeline Integration Tests", () => {
  const testUserId = "test-rag-user";
  const testConversationId = uuidv4();
  const testDocumentId = uuidv4();

  beforeAll(async () => {
    // Set up test data
    await db.insert(conversations).values({
      id: testConversationId,
      userId: testUserId,
      title: "RAG Test Conversation",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert a test document with some sample content
    await db.insert(documents).values({
      id: testDocumentId,
      userId: testUserId,
      filename: "test-ml-guide.pdf",
      originalName: "Machine Learning Guide.pdf",
      contentType: "application/pdf",
      fileSize: 1024000,
      status: "completed",
      uploadedAt: new Date(),
      processedAt: new Date(),
      chunkCount: 2,
      metadata: {
        title: "Machine Learning Guide",
        pages: 10,
      },
    });

    // Insert test document chunks with embeddings
    const sampleEmbedding = Array.from({ length: 1024 }, () => Math.random() - 0.5);
    
    await db.insert(documentChunks).values([
      {
        id: uuidv4(),
        documentId: testDocumentId,
        content: "Machine learning is a subset of artificial intelligence that enables systems to automatically learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can identify patterns in data and make predictions or decisions.",
        embedding: sampleEmbedding,
        chunkIndex: 0,
        pageNumber: 1,
        metadata: {
          elementTypes: ["text"],
          semanticCategory: "introduction",
          importance: 0.9,
        },
        createdAt: new Date(),
      },
      {
        id: uuidv4(),
        documentId: testDocumentId,
        content: "Neural networks are a class of machine learning algorithms inspired by biological neural networks. They consist of interconnected nodes (neurons) organized in layers that process information through weighted connections.",
        embedding: sampleEmbedding.map(x => x + 0.1), // Slightly different embedding
        chunkIndex: 1,
        pageNumber: 2,
        metadata: {
          elementTypes: ["text"],
          semanticCategory: "technical",
          importance: 0.8,
        },
        createdAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, testConversationId));
    await db.delete(conversations).where(eq(conversations.id, testConversationId));
    await db.delete(documentChunks).where(eq(documentChunks.documentId, testDocumentId));
    await db.delete(documents).where(eq(documents.id, testDocumentId));
  });

  it("should process a document query successfully", async () => {
    const request = {
      query: "What is machine learning according to the uploaded documents?",
      conversationId: testConversationId,
      userId: testUserId,
      responseMode: "detailed" as const,
      includeHistory: false,
      maxResults: 5,
      enableReranking: false, // Disable to avoid external API calls in tests
    };

    try {
      const response = await processRAGQuery(request);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.messageId).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.citations).toBeDefined();
      expect(Array.isArray(response.citations)).toBe(true);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.intent).toBe("document_query");
      expect(response.metadata.totalTime).toBeGreaterThan(0);

      // Verify citations are properly extracted
      if (response.citations.length > 0) {
        const citation = response.citations[0];
        expect(citation.documentId).toBeDefined();
        expect(citation.filename).toBeDefined();
        expect(citation.relevanceScore).toBeGreaterThan(0);
      }

      console.log("RAG Response:", response.content);
      console.log("Citations:", response.citations.length);
      console.log("Processing Time:", response.metadata.totalTime, "ms");

    } catch (error) {
      console.error("RAG Pipeline Test Error:", error);
      // Re-throw to fail the test
      throw error;
    }
  }, 30000); // 30 second timeout for integration test

  it("should handle general queries without document search", async () => {
    const request = {
      query: "Hello, how are you doing today?",
      conversationId: testConversationId,
      userId: testUserId,
      responseMode: "conversational" as const,
      includeHistory: false,
      maxResults: 5,
      enableReranking: false,
    };

    const response = await processRAGQuery(request);

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.metadata.intent).toBe("general_query");
    expect(response.metadata.documentsFound).toBe(0);
    expect(response.citations).toHaveLength(0);
  }, 15000);

  it("should include conversation history for follow-up queries", async () => {
    // First, add a message to conversation history
    await db.insert(conversationMessages).values({
      id: uuidv4(),
      conversationId: testConversationId,
      role: "user",
      content: "Tell me about artificial intelligence",
      citations: [],
      createdAt: new Date(Date.now() - 60000), // 1 minute ago
    });

    await db.insert(conversationMessages).values({
      id: uuidv4(),
      conversationId: testConversationId,
      role: "assistant", 
      content: "Artificial intelligence is a broad field of computer science...",
      citations: [],
      createdAt: new Date(Date.now() - 30000), // 30 seconds ago
    });

    const request = {
      query: "Can you tell me more about machine learning specifically?",
      conversationId: testConversationId,
      userId: testUserId,
      responseMode: "detailed" as const,
      includeHistory: true,
      maxResults: 5,
      enableReranking: false,
    };

    const response = await processRAGQuery(request);

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.metadata.intent).toBe("follow_up");
    // Should include context from conversation history
    expect(response.metadata.totalTime).toBeGreaterThan(0);
  }, 20000);

  it("should generate appropriate follow-up questions", async () => {
    const request = {
      query: "What are neural networks and how do they work?",
      conversationId: testConversationId,
      userId: testUserId,
      responseMode: "technical" as const,
      includeHistory: false,
      maxResults: 5,
      enableReranking: false,
    };

    const response = await processRAGQuery(request);

    expect(response).toBeDefined();
    expect(response.followUpQuestions).toBeDefined();
    expect(Array.isArray(response.followUpQuestions)).toBe(true);
    expect(response.followUpQuestions.length).toBeGreaterThan(0);
    expect(response.followUpQuestions.length).toBeLessThanOrEqual(3);

    // Verify follow-up questions are meaningful
    for (const question of response.followUpQuestions) {
      expect(typeof question).toBe("string");
      expect(question.length).toBeGreaterThan(10);
      expect(question.endsWith("?")).toBe(true);
    }
  }, 20000);

  it("should handle errors gracefully", async () => {
    const request = {
      query: "What is machine learning?",
      conversationId: "invalid-conversation-id",
      userId: testUserId,
      responseMode: "detailed" as const,
      includeHistory: true,
      maxResults: 5,
      enableReranking: false,
    };

    // This should not throw an error, but should provide a fallback response
    const response = await processRAGQuery(request);

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.messageId).toBeDefined();
    // Error responses should still have proper structure
    expect(response.metadata).toBeDefined();
  }, 15000);
});