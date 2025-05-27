import { api } from "encore.dev/api";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import log from "encore.dev/log";
import { processRAGQuery } from "./rag-orchestration";
import { 
  createConversation, 
  addMessage, 
  getConversation as getConversationDetails,
  listConversations as listUserConversations,
  deleteConversation as removeConversation,
  getConversationHistory
} from "./conversation-management";
import { deleteDraft } from "./draft-autosave";

// Create a service-specific logger instance
const logger = log.with({ service: "chat-service" });

// Enhanced types for the chat service
export const ChatRequest = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  userId: z.string().min(1),
  responseMode: z.enum(["detailed", "concise", "technical", "conversational"]).default("detailed"),
  enableReranking: z.boolean().default(true),
});

export const ChatResponse = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  content: z.string(),
  citations: z.array(z.object({
    documentId: z.string(),
    filename: z.string(),
    pageNumber: z.number().optional(),
    chunkContent: z.string(),
    relevanceScore: z.number(),
    citationIndex: z.number(),
  })),
  metadata: z.object({
    searchTime: z.number(),
    llmTime: z.number(),
    totalTime: z.number(),
    tokensUsed: z.number(),
    documentsFound: z.number(),
  }),
  followUpQuestions: z.array(z.string()).optional(),
});

export const ListConversationsRequest = z.object({
  userId: z.string().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

// Main chat endpoint - integrates with RAG orchestration
export const sendMessage = api(
  { expose: true, method: "POST", path: "/chat/message" },
  async (req: z.infer<typeof ChatRequest>): Promise<z.infer<typeof ChatResponse>> => {
    const startTime = Date.now();

    try {
      let conversationId = req.conversationId;

      // Create new conversation if none provided
      if (!conversationId) {
        const newConversation = await createConversation({
          firstMessage: req.message,
        });
        conversationId = newConversation.id;
      }

      // Store the user message first
      await addMessage({
        conversationId,
        userId: req.userId,
        role: "user",
        content: req.message,
        citations: [],
      });

      // Process the query using RAG orchestration
      const ragResponse = await processRAGQuery({
        query: req.message,
        conversationId,
        userId: req.userId,
        responseMode: req.responseMode,
        includeHistory: true,
        maxResults: 10,
        enableReranking: req.enableReranking,
      });

      // Clear any existing draft for this conversation after successful message processing
      try {
        await deleteDraft({ conversationId, userId: req.userId });
      } catch (draftError) {
        // Log but don't fail the message sending if draft clearing fails
        if (draftError instanceof Error) {
          logger.warn("Failed to clear draft after sending message", { 
            conversationId, 
            userId: req.userId, 
            errorName: draftError.name, 
            errorMessage: draftError.message, 
            errorStack: draftError.stack 
          });
        } else {
          logger.warn("Failed to clear draft after sending message due to unknown error type", { 
            conversationId, 
            userId: req.userId, 
            draftError 
          });
        }
      }

      // Note: The RAG orchestration already stores the assistant message
      // so we don't need to store it again here

      logger.info("Chat message processed successfully", {
        conversationId: conversationId,
        userId: req.userId,
        requestMessage: req.message.substring(0, 200), // Log first 200 chars of user message
        responseMessageId: ragResponse.messageId,
        tokensUsed: ragResponse.metadata.tokensUsed,
        documentsFound: ragResponse.metadata.documentsFound,
        totalTimeMs: ragResponse.metadata.totalTime,
      });

      return {
        conversationId,
        messageId: ragResponse.messageId,
        content: ragResponse.content,
        citations: ragResponse.citations,
        metadata: {
          searchTime: ragResponse.metadata.searchTime,
          llmTime: ragResponse.metadata.llmTime,
          totalTime: ragResponse.metadata.totalTime,
          tokensUsed: ragResponse.metadata.tokensUsed,
          documentsFound: ragResponse.metadata.documentsFound,
        },
        followUpQuestions: ragResponse.followUpQuestions,
      };

    } catch (error) {
      const errorMessage = "Failed to process chat message";
      if (error instanceof Error) {
        logger.error(error, errorMessage, { 
          conversationId: req.conversationId, 
          userId: req.userId, 
          requestMessage: req.message 
        });
      } else {
        logger.error(errorMessage, { 
          conversationId: req.conversationId, 
          userId: req.userId, 
          requestMessage: req.message, 
          error 
        });
      }
      throw new Error(errorMessage + (error instanceof Error ? `: ${error.message}`: ': Unknown error'));
    }
  }
);

// Get conversation with messages
export const getConversation = api(
  { expose: true, method: "GET", path: "/chat/conversation/:conversationId" },
  async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    try {
      return await getConversationDetails({ conversationId, userId });
    } catch (error) {
      const errorMessage = "Failed to get conversation";
      if (error instanceof Error) {
        logger.error(error, errorMessage, { conversationId, userId });
      } else {
        logger.error(errorMessage, { conversationId, userId, error });
      }
      throw new Error(errorMessage + (error instanceof Error ? `: ${error.message}`: ': Unknown error'));
    }
  }
);

// List user conversations
export const listConversations = api(
  { expose: true, method: "GET", path: "/chat/conversations" },
  async (req: z.infer<typeof ListConversationsRequest>) => {
    try {
      return await listUserConversations(req);
    } catch (error) {
      const errorMessage = "Failed to list conversations";
      if (error instanceof Error) {
        logger.error(error, errorMessage, { userId: req.userId, page: req.page, pageSize: req.pageSize, search: req.search });
      } else {
        logger.error(errorMessage, { userId: req.userId, page: req.page, pageSize: req.pageSize, search: req.search, error });
      }
      throw new Error(errorMessage + (error instanceof Error ? `: ${error.message}`: ': Unknown error'));
    }
  }
);

// Delete conversation
export const deleteConversation = api(
  { expose: true, method: "DELETE", path: "/chat/conversation/:conversationId" },
  async ({ conversationId, userId }: { conversationId: string; userId: string }): Promise<{ success: boolean }> => {
    try {
      return await removeConversation({ conversationId, userId });
    } catch (error) {
      const errorMessage = "Failed to delete conversation";
      if (error instanceof Error) {
        logger.error(error, errorMessage, { conversationId, userId });
      } else {
        logger.error(errorMessage, { conversationId, userId, error });
      }
      throw new Error(errorMessage + (error instanceof Error ? `: ${error.message}`: ': Unknown error'));
    }
  }
);

// Get conversation messages only
export const getMessages = api(
  { expose: true, method: "GET", path: "/chat/conversation/:conversationId/messages" },
  async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    try {
      return await getConversationHistory({ conversationId, userId });
    } catch (error) {
      const errorMessage = "Failed to get conversation messages";
      if (error instanceof Error) {
        logger.error(error, errorMessage, { conversationId, userId });
      } else {
        logger.error(errorMessage, { conversationId, userId, error });
      }
      throw new Error(errorMessage + (error instanceof Error ? `: ${error.message}`: ': Unknown error'));
    }
  }
);

// Stream chat responses (for real-time chat experience)
export const streamMessage = api(
  { expose: true, method: "POST", path: "/chat/stream" },
  async (req: z.infer<typeof ChatRequest>): Promise<{ conversationId: string; messageId: string; status: string }> => {
    // This would be implemented for streaming responses in a real-time chat
    // For now, we'll return a status that the client can poll
    try {
      const response = await sendMessage(req);
      return {
        conversationId: response.conversationId,
        messageId: response.messageId,
        status: "completed",
      };
    } catch (error) {
      const errorMessage = "Failed to stream message";
      if (error instanceof Error) {
        logger.error(error, errorMessage, { requestBody: req });
      } else {
        logger.error(errorMessage, { requestBody: req, error });
      }
      throw new Error(errorMessage + (error instanceof Error ? `: ${error.message}`: ': Unknown error'));
    }
  }
);

// Health check endpoint
export const health = api(
  { expose: true, method: "GET", path: "/chat/health" },
  async (): Promise<{ status: string; timestamp: string; services: Record<string, boolean> }> => {
    try {
      // Import the RAG health check
      const { health: ragHealth } = await import("./rag-orchestration");
      const ragStatus = await ragHealth();
      
      const isHealthy = ragStatus.status === "healthy";
      logger.info("Chat service health check processed", { 
        overallStatus: isHealthy ? "healthy" : "degraded",
        ragStatus: ragStatus.status,
        conversationService: ragStatus.services.conversation,
        searchService: ragStatus.services.search,
        llmService: ragStatus.services.llm,
      });

      return {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
          rag: ragStatus.status === "healthy",
          conversation: ragStatus.services.conversation,
          search: ragStatus.services.search,
          llm: ragStatus.services.llm,
        },
      };
    } catch (error) {
      const errorMessage = "Chat service health check failed";
      if (error instanceof Error) {
        logger.error(error, errorMessage);
      } else {
        logger.error(errorMessage, { error });
      }
      throw new Error(errorMessage + (error instanceof Error ? `: ${error.message}`: ': Unknown error'));
    }
  }
);
