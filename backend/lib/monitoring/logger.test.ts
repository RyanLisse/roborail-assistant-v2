import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Mock console methods for testing
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleInfo = vi.fn();

vi.stubGlobal("console", {
  log: mockConsoleLog,
  error: mockConsoleError,
  warn: mockConsoleWarn,
  info: mockConsoleInfo,
});

describe("Structured Logger Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockReset();
    mockConsoleError.mockReset();
    mockConsoleWarn.mockReset();
    mockConsoleInfo.mockReset();
  });

  describe("Logger Creation and Configuration", () => {
    it("should create logger with default configuration", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("chat");

      expect(logger).toBeDefined();
      expect(logger.getService()).toBe("chat");
    });

    it("should create logger with custom configuration", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("search", {
        level: "debug",
        enableConsole: true,
        enableFile: false,
        includeTimestamp: true,
        includeTraceId: true,
      });

      expect(logger.getService()).toBe("search");
    });

    it("should validate service names", async () => {
      const { Logger } = await import("./logger");

      expect(() => new Logger("chat")).not.toThrow();
      expect(() => new Logger("search")).not.toThrow();
      expect(() => new Logger("invalid-service" as any)).toThrow();
    });
  });

  describe("Structured Logging", () => {
    it("should log info messages with structured format", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("chat");
      logger.info("User message received", {
        userId: "user123",
        messageLength: 50,
        conversationId: "conv456",
      });

      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleInfo.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe("info");
      expect(logData.service).toBe("chat");
      expect(logData.message).toBe("User message received");
      expect(logData.metadata.userId).toBe("user123");
      expect(logData.timestamp).toBeDefined();
    });

    it("should log error messages with stack traces", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("search");
      const testError = new Error("Database connection failed");

      logger.error(
        "Search operation failed",
        {
          query: "test query",
          userId: "user123",
        },
        testError
      );

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe("error");
      expect(logData.service).toBe("search");
      expect(logData.error.name).toBe("Error");
      expect(logData.error.message).toBe("Database connection failed");
      expect(logData.error.stack).toBeDefined();
    });

    it("should log warning messages", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("upload");
      logger.warn("Cache miss occurred", {
        cacheKey: "embedding:user123:query",
        fallbackUsed: true,
      });

      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleWarn.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe("warn");
      expect(logData.service).toBe("upload");
      expect(logData.message).toBe("Cache miss occurred");
    });

    it("should log debug messages when debug level enabled", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("llm", { level: "debug" });
      logger.debug("Processing tokens", {
        tokenCount: 150,
        model: "gemini-2.5-flash",
      });

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe("debug");
      expect(logData.service).toBe("llm");
    });

    it("should filter logs below configured level", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("llm", { level: "warn" });

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
    });
  });

  describe("Context and Correlation", () => {
    it("should include trace and request IDs", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("chat");
      logger.setContext({
        traceId: "trace-123",
        requestId: "req-456",
        userId: "user-789",
      });

      logger.info("Message with context");

      const logCall = mockConsoleInfo.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.traceId).toBe("trace-123");
      expect(logData.requestId).toBe("req-456");
      expect(logData.userId).toBe("user-789");
    });

    it("should create child loggers with inherited context", async () => {
      const { Logger } = await import("./logger");

      const parentLogger = new Logger("chat");
      parentLogger.setContext({
        traceId: "trace-123",
        userId: "user-456",
      });

      const childLogger = parentLogger.child("llm", {
        conversationId: "conv-789",
      });

      childLogger.info("Child logger message");

      const logCall = mockConsoleInfo.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.service).toBe("llm");
      expect(logData.traceId).toBe("trace-123");
      expect(logData.userId).toBe("user-456");
      expect(logData.metadata.conversationId).toBe("conv-789");
    });

    it("should support span tracking", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("search");
      const span = logger.startSpan("vector-search", {
        query: "test query",
        threshold: 0.7,
      });

      span.addEvent("Generating embeddings");
      span.addEvent("Querying database");
      span.setStatus("success");
      span.end();

      // Should log span completion
      expect(mockConsoleInfo).toHaveBeenCalled();
      const logCall = mockConsoleInfo.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.message).toContain("Span completed");
      expect(logData.metadata.operation).toBe("vector-search");
      expect(logData.metadata.status).toBe("success");
      expect(logData.metadata.duration).toBeDefined();
    });
  });

  describe("Performance Logging", () => {
    it("should log operation timing", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("upload");

      const timer = logger.startTimer("embedding-generation");
      await new Promise((resolve) => setTimeout(resolve, 10));
      timer.end({ batchSize: 5, model: "embed-v4" });

      expect(mockConsoleInfo).toHaveBeenCalled();
      const logCall = mockConsoleInfo.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.message).toContain("Operation completed");
      expect(logData.metadata.operation).toBe("embedding-generation");
      expect(logData.metadata.duration).toBeGreaterThan(0);
      expect(logData.metadata.batchSize).toBe(5);
    });

    it("should track request lifecycle", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("chat");
      const requestId = "req-123";

      logger.startRequest(requestId, "POST /chat/message", {
        userId: "user-456",
        messageLength: 100,
      });

      logger.info("Processing message", { requestId });

      logger.endRequest(requestId, {
        status: 200,
        responseTime: 1500,
        tokensUsed: 150,
      });

      expect(mockConsoleInfo).toHaveBeenCalledTimes(3); // start, processing, end
    });
  });

  describe("Error Context and Stack Traces", () => {
    it("should capture detailed error information", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("search");

      try {
        throw new Error("Vector search failed");
      } catch (error) {
        logger.error(
          "Search operation failed",
          {
            query: "test query",
            threshold: 0.7,
            attemptNumber: 2,
          },
          error as Error
        );
      }

      const logCall = mockConsoleError.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.error.name).toBe("Error");
      expect(logData.error.message).toBe("Vector search failed");
      expect(logData.error.stack).toContain("Error: Vector search failed");
      expect(logData.metadata.query).toBe("test query");
      expect(logData.metadata.attemptNumber).toBe(2);
    });

    it("should handle nested errors", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("llm");

      const rootCause = new Error("API rate limit exceeded");
      const wrappedError = new Error("LLM request failed");
      (wrappedError as any).cause = rootCause;

      logger.error(
        "Failed to generate response",
        {
          model: "gemini-2.5-flash",
          retryAttempt: 3,
        },
        wrappedError
      );

      const logCall = mockConsoleError.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.error.message).toBe("LLM request failed");
      expect(logData.error.stack).toBeDefined();
    });
  });

  describe("Log Aggregation and Search", () => {
    it("should format logs for easy parsing", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("docprocessing");
      logger.info("Document processed successfully", {
        documentId: "doc-123",
        pageCount: 15,
        chunkCount: 45,
        processingTime: 2500,
      });

      const logCall = mockConsoleInfo.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      // Should be valid JSON for log aggregation tools
      expect(() => JSON.parse(logCall)).not.toThrow();
      expect(logData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(logData.level).toBe("info");
      expect(logData.service).toBe("docprocessing");
    });

    it("should support searchable fields", async () => {
      const { Logger } = await import("./logger");

      const logger = new Logger("chat");
      logger.info("RAG query processed", {
        userId: "user-123",
        conversationId: "conv-456",
        query: "What is machine learning?",
        documentsFound: 8,
        relevanceScore: 0.87,
        responseTime: 1200,
      });

      const logCall = mockConsoleInfo.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      // All metadata should be searchable
      expect(logData.metadata.userId).toBe("user-123");
      expect(logData.metadata.documentsFound).toBe(8);
      expect(logData.metadata.relevanceScore).toBe(0.87);
    });
  });
});
