import { describe, it, expect, beforeEach } from "vitest";
import { 
  estimateTokenCount,
  calculateMessagePriority,
  prepareMessagesWithMetadata,
  truncateMessage,
  pruneConversationHistory,
  manageRAGContext,
  analyzeConversationPatterns,
  CONTEXT_LIMITS,
} from "./context-management";
import { ConversationMessage } from "../db/schema";

describe("Context Management", () => {
  describe("Token Estimation", () => {
    it("should estimate tokens correctly", () => {
      expect(estimateTokenCount("hello world")).toBe(3);
      expect(estimateTokenCount("")).toBe(0);
      expect(estimateTokenCount("a".repeat(100))).toBe(25);
    });
  });

  describe("Message Priority Calculation", () => {
    const createTestMessage = (content: string, role: "user" | "assistant", index: number): any => ({
      id: `msg-${index}`,
      role,
      content,
      citations: [],
      createdAt: new Date(Date.now() + index * 1000),
      charCount: content.length,
      estimatedTokens: Math.ceil(content.length / 4),
      priority: 0,
    });

    it("should prioritize recent messages", () => {
      const messages = [
        createTestMessage("old message", "user", 0),
        createTestMessage("newer message", "user", 1),
        createTestMessage("newest message", "user", 2),
      ];

      // Priority calculation uses (index + 1) for recency
      // So index 0 gets recency = 1, index 2 gets recency = 3
      // Recent messages (higher index) should have higher priority
      const priority0 = calculateMessagePriority(messages[0], messages, 0); // recency = 1
      const priority2 = calculateMessagePriority(messages[2], messages, 2); // recency = 3

      expect(priority2).toBeGreaterThan(priority0);
    });

    it("should prioritize user messages over assistant messages", () => {
      const messages = [
        createTestMessage("user message", "user", 0),
        createTestMessage("assistant message", "assistant", 0),
      ];

      const userPriority = calculateMessagePriority(messages[0], messages, 0);
      const assistantPriority = calculateMessagePriority(messages[1], messages, 0);

      expect(userPriority).toBeGreaterThan(assistantPriority);
    });

    it("should prioritize messages with citations", () => {
      const messageWithCitations = createTestMessage("message with citations", "user", 0);
      messageWithCitations.citations = [{ documentId: "doc1", filename: "file1.pdf" }];

      const messageWithoutCitations = createTestMessage("message without citations", "user", 0);

      const withCitationsPriority = calculateMessagePriority(messageWithCitations, [messageWithCitations], 0);
      const withoutCitationsPriority = calculateMessagePriority(messageWithoutCitations, [messageWithoutCitations], 0);

      expect(withCitationsPriority).toBeGreaterThan(withoutCitationsPriority);
    });
  });

  describe("Message Truncation", () => {
    it("should not truncate short messages", () => {
      const message = "Short message";
      expect(truncateMessage(message, 100)).toBe(message);
    });

    it("should truncate at sentence boundaries", () => {
      const message = "First sentence. Second sentence. Third sentence.";
      const truncated = truncateMessage(message, 30);
      expect(truncated).toContain("First sentence.");
      expect(truncated).not.toContain("Third sentence.");
      expect(truncated.endsWith("...")).toBe(true);
    });

    it("should handle word boundaries if no sentence fits", () => {
      const message = "verylongwordthatwontfitinasentence another word";
      const truncated = truncateMessage(message, 15);
      expect(truncated.length).toBeLessThanOrEqual(15);
      expect(truncated.endsWith("...")).toBe(true);
    });
  });

  describe("Conversation History Pruning", () => {
    const createConversationMessage = (content: string, role: "user" | "assistant", index: number): ConversationMessage => ({
      id: `msg-${index}`,
      conversationId: "test-conv",
      role,
      content,
      citations: [],
      createdAt: new Date(Date.now() + index * 1000),
    });

    it("should return all messages when under limits", () => {
      const messages = [
        createConversationMessage("Message 1", "user", 0),
        createConversationMessage("Message 2", "assistant", 1),
        createConversationMessage("Message 3", "user", 2),
      ];

      const pruned = pruneConversationHistory(messages, {
        maxMessages: 10,
        maxContextChars: 10000,
        maxContextTokens: 2000,
      });

      expect(pruned).toHaveLength(3);
      expect(pruned.map(m => m.content)).toEqual(["Message 1", "Message 2", "Message 3"]);
    });

    it("should respect maxMessages limit", () => {
      const messages = Array.from({ length: 10 }, (_, i) => 
        createConversationMessage(`Message ${i + 1}`, "user", i)
      );

      const pruned = pruneConversationHistory(messages, {
        maxMessages: 5,
        maxContextChars: 10000,
        maxContextTokens: 2000,
        minRecentMessages: 2,
      });

      expect(pruned).toHaveLength(5);
      // Should include the most recent messages
      expect(pruned[pruned.length - 1].content).toBe("Message 10");
      expect(pruned[pruned.length - 2].content).toBe("Message 9");
    });

    it("should respect character limits", () => {
      const messages = [
        createConversationMessage("a".repeat(1000), "user", 0),
        createConversationMessage("b".repeat(1000), "assistant", 1),
        createConversationMessage("c".repeat(1000), "user", 2),
        createConversationMessage("d".repeat(500), "assistant", 3),
      ];

      const pruned = pruneConversationHistory(messages, {
        maxMessages: 10,
        maxContextChars: 2000,
        maxContextTokens: 10000,
        minRecentMessages: 2,
      });

      const totalChars = pruned.reduce((sum, msg) => sum + msg.content.length, 0);
      expect(totalChars).toBeLessThanOrEqual(2000);
      
      // Should always include minimum recent messages
      expect(pruned.length).toBeGreaterThanOrEqual(2);
    });

    it("should maintain chronological order", () => {
      const messages = [
        createConversationMessage("First", "user", 0),
        createConversationMessage("Second", "assistant", 1),
        createConversationMessage("Third", "user", 2),
        createConversationMessage("Fourth", "assistant", 3),
      ];

      const pruned = pruneConversationHistory(messages);
      const contents = pruned.map(m => m.content);
      
      // Check if the order matches the original chronological order
      expect(contents.indexOf("First")).toBeLessThan(contents.indexOf("Second"));
      expect(contents.indexOf("Second")).toBeLessThan(contents.indexOf("Third"));
    });
  });

  describe("RAG Context Management", () => {
    const createConversationMessage = (content: string, role: "user" | "assistant", index: number): ConversationMessage => ({
      id: `msg-${index}`,
      conversationId: "test-conv",
      role,
      content,
      citations: [],
      createdAt: new Date(Date.now() + index * 1000),
    });

    it("should balance conversation history and document context", () => {
      const messages = Array.from({ length: 20 }, (_, i) => 
        createConversationMessage(`Message ${i + 1} with content`, "user", i)
      );

      const documentContext = "This is a large document context that takes up significant space and tokens";

      const result = manageRAGContext(messages, documentContext, {
        maxContextTokens: 200,
      });

      expect(result.prunedMessages.length).toBeLessThan(messages.length);
      expect(result.totalTokens).toBeLessThanOrEqual(200);
      expect(result.availableTokensForResponse).toBeGreaterThan(0);
      expect(result.contextSummary).toContain("message");
    });

    it("should reserve space for response generation", () => {
      const messages = [
        createConversationMessage("Short message", "user", 0),
      ];

      const documentContext = "Small document context";

      const result = manageRAGContext(messages, documentContext, {
        maxContextTokens: 100,
      });

      expect(result.availableTokensForResponse).toBeGreaterThanOrEqual(500); // Minimum reserved
    });
  });

  describe("Conversation Pattern Analysis", () => {
    const createConversationMessage = (content: string, role: "user" | "assistant", index: number): ConversationMessage => ({
      id: `msg-${index}`,
      conversationId: "test-conv",
      role,
      content,
      citations: [],
      createdAt: new Date(Date.now() + index * 1000),
    });

    it("should identify topic clusters from frequent words", () => {
      const messages = [
        createConversationMessage("Tell me about machine learning algorithms", "user", 0),
        createConversationMessage("Machine learning involves training algorithms", "assistant", 1),
        createConversationMessage("What algorithms are best for classification?", "user", 2),
        createConversationMessage("Classification algorithms include neural networks", "assistant", 3),
      ];

      const analysis = analyzeConversationPatterns(messages);

      expect(analysis.topicClusters).toContain("algorithms");
      expect(analysis.topicClusters).toContain("machine");
      expect(analysis.topicClusters).toContain("learning");
    });

    it("should identify key entities from capitalized words", () => {
      const messages = [
        createConversationMessage("Tell me about Python programming", "user", 0),
        createConversationMessage("Python is great for TensorFlow development", "assistant", 1),
        createConversationMessage("How does TensorFlow compare to PyTorch?", "user", 2),
      ];

      const analysis = analyzeConversationPatterns(messages);

      expect(analysis.keyEntities).toContain("Python");
      expect(analysis.keyEntities).toContain("TensorFlow");
    });

    it("should identify conversation trends", () => {
      // Test extended conversation
      const manyMessages = Array.from({ length: 15 }, (_, i) => 
        createConversationMessage(`Message ${i + 1}`, "user", i)
      );

      const analysis = analyzeConversationPatterns(manyMessages);
      expect(analysis.conversationTrends).toContain("Extended conversation");

      // Test document-heavy discussion
      const messagesWithCitations = [
        createConversationMessage("Tell me about this document", "user", 0),
        {
          ...createConversationMessage("Based on the document...", "assistant", 1),
          citations: [{ 
            documentId: "doc1", 
            filename: "file.pdf",
            chunkContent: "sample content",
            relevanceScore: 0.9
          }],
        },
      ];

      const analysisWithCitations = analyzeConversationPatterns(messagesWithCitations);
      expect(analysisWithCitations.conversationTrends).toContain("Document-heavy discussion");

      // Test question-heavy session
      const questionMessages = [
        createConversationMessage("What is this?", "user", 0),
        createConversationMessage("This is a response", "assistant", 1),
        createConversationMessage("How does it work?", "user", 2),
        createConversationMessage("Why is it important?", "user", 3),
      ];

      const questionAnalysis = analyzeConversationPatterns(questionMessages);
      expect(questionAnalysis.conversationTrends).toContain("Question-heavy session");
    });
  });

  describe("Configuration Limits", () => {
    it("should have sensible default limits", () => {
      expect(CONTEXT_LIMITS.MAX_MESSAGES).toBeGreaterThan(0);
      expect(CONTEXT_LIMITS.MAX_CONTEXT_CHARS).toBeGreaterThan(1000);
      expect(CONTEXT_LIMITS.MAX_CONTEXT_TOKENS).toBeGreaterThan(100);
      expect(CONTEXT_LIMITS.MIN_RECENT_MESSAGES).toBeGreaterThan(0);
      expect(CONTEXT_LIMITS.MAX_MESSAGE_CHARS).toBeGreaterThan(100);
    });

    it("should have consistent token/character ratio", () => {
      const ratio = CONTEXT_LIMITS.MAX_CONTEXT_CHARS / CONTEXT_LIMITS.MAX_CONTEXT_TOKENS;
      expect(ratio).toBeCloseTo(4, 1); // ~4 characters per token
    });
  });
});