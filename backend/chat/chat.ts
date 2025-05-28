import { api } from "encore.dev/api";
import log from "encore.dev/log";
import {
  addMessage,
  createConversation,
  getConversation as getConversationDetails,
  getConversationHistory,
  listConversations as listUserConversations,
  deleteConversation as removeConversation,
} from "./conversation-management";
import { deleteDraft } from "./draft-autosave";
import { processRAGQuery } from "./rag-orchestration";

// Create a service-specific logger instance
const logger = log.with({ service: "chat-service" });

// Define explicit interfaces for ChatRequest, ChatResponse, ListConversationsRequest
export interface ChatRequest {
  message: string;
  conversationId?: string;
  userId: string;
  responseMode: "detailed" | "concise" | "technical" | "conversational";
  enableReranking: boolean;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  citations: Array<{
    documentId: string;
    filename: string;
    pageNumber?: number;
    chunkContent: string;
    relevanceScore: number;
    citationIndex: number;
  }>;
  metadata: {
    searchTime: number;
    llmTime: number;
    totalTime: number;
    tokensUsed: number;
    documentsFound: number;
  };
  followUpQuestions?: string[];
}

export interface ListConversationsRequest {
  userId: string;
  page: number;
  pageSize: number;
  search?: string;
}

// Main chat endpoint - integrates with RAG orchestration
export const sendMessage = api(
  { expose: true, method: "POST", path: "/chat/message" },
  async (req: ChatRequest): Promise<ChatResponse> => {
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
            errorStack: draftError.stack,
          });
        } else {
          logger.warn("Failed to clear draft after sending message due to unknown error type", {
            conversationId,
            userId: req.userId,
            draftError,
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
          requestMessage: req.message,
        });
      } else {
        logger.error(errorMessage, {
          conversationId: req.conversationId,
          userId: req.userId,
          requestMessage: req.message,
          error,
        });
      }
      throw new Error(
        `${errorMessage}${error instanceof Error ? `: ${error.message}` : ": Unknown error"}`
      );
    }
  }
);

// Get conversation with messages
export const getConversationBasic = api(
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
      throw new Error(
        `${errorMessage}${error instanceof Error ? `: ${error.message}` : ": Unknown error"}`
      );
    }
  }
);

// List user conversations
export const listConversationsBasic = api(
  { expose: true, method: "GET", path: "/chat/conversations-basic" },
  async (req: ListConversationsRequest) => {
    try {
      return await listUserConversations(req);
    } catch (error) {
      const errorMessage = "Failed to list conversations";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          userId: req.userId,
          page: req.page,
          pageSize: req.pageSize,
          search: req.search,
        });
      } else {
        logger.error(errorMessage, {
          userId: req.userId,
          page: req.page,
          pageSize: req.pageSize,
          search: req.search,
          error,
        });
      }
      throw new Error(
        `${errorMessage}${error instanceof Error ? `: ${error.message}` : ": Unknown error"}`
      );
    }
  }
);

// Delete conversation
export const deleteConversationBasic = api(
  { expose: true, method: "DELETE", path: "/chat/conversation/:conversationId" },
  async ({
    conversationId,
    userId,
  }: { conversationId: string; userId: string }): Promise<{ success: boolean }> => {
    try {
      return await removeConversation({ conversationId, userId });
    } catch (error) {
      const errorMessage = "Failed to delete conversation";
      if (error instanceof Error) {
        logger.error(error, errorMessage, { conversationId, userId });
      } else {
        logger.error(errorMessage, { conversationId, userId, error });
      }
      throw new Error(
        `${errorMessage}${error instanceof Error ? `: ${error.message}` : ": Unknown error"}`
      );
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
      throw new Error(
        `${errorMessage}${error instanceof Error ? `: ${error.message}` : ": Unknown error"}`
      );
    }
  }
);

// Stream chat responses (for real-time chat experience)
export const streamMessage = api(
  { expose: true, method: "POST", path: "/chat/stream" },
  async (
    req: ChatRequest
  ): Promise<{ conversationId: string; messageId: string; status: string }> => {
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
      throw new Error(
        `${errorMessage}${error instanceof Error ? `: ${error.message}` : ": Unknown error"}`
      );
    }
  }
);

// Health check endpoint
export const health = api(
  { expose: true, method: "GET", path: "/chat/health" },
  async (): Promise<{ status: string; timestamp: string; services: Record<string, boolean> }> => {
    try {
      // Import the RAG health check
      const { ragHealth: actualRagHealthCheck } = await import("./rag-orchestration");
      const ragStatus = await actualRagHealthCheck();
      
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
      throw new Error(
        `${errorMessage}${error instanceof Error ? `: ${error.message}` : ": Unknown error"}`
      );
    }
  }
);
