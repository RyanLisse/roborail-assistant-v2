import { api } from "encore.dev/api";
import log from "encore.dev/log";
import { nanoid } from "nanoid";
import {
  addMessage,
  createConversation,
  getConversation as getConversationDetails,
  getConversationHistory,
  listConversations as listUserConversations,
  deleteConversation as removeConversation,
} from "./conversation-management";
import { deleteDraft } from "./draft-autosave";
import { mastraRAGService } from "../lib/mastra/rag-service";
import { getCohereEmbedding } from "../lib/mastra/config";
import { MetricHelpers, recordError } from "../lib/monitoring/metrics";

// Create a service-specific logger instance
const logger = log.with({ service: "chat-mastra-service" });

// Enhanced interfaces for Mastra integration
export interface MastraChatRequest {
  message: string;
  conversationId?: string;
  userId: string;
  responseMode: "detailed" | "concise" | "technical" | "conversational";
  enableReranking?: boolean;
  options?: {
    useGraphRAG?: boolean;
    maxResults?: number;
    threshold?: number;
    includeContext?: boolean;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    documentFilters?: {
      documentTypes?: string[];
      dateRange?: {
        start?: Date;
        end?: Date;
      };
      tags?: string[];
      metadata?: Record<string, any>;
    };
  };
}

export interface MastraChatResponse {
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
    chunkId?: string;
    metadata?: Record<string, any>;
  }>;
  metadata: {
    searchTime: number;
    llmTime: number;
    totalTime: number;
    tokensUsed?: number;
    documentsFound: number;
    chunksRetrieved: number;
    ragType: "vector" | "graph" | "hybrid";
    cacheHit?: boolean;
    graphWalkSteps?: number;
  };
  followUpQuestions?: string[];
  context?: {
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>;
    documentsUsed: string[];
  };
}

export interface ListConversationsRequest {
  userId: string;
  page: number;
  pageSize: number;
}

export interface MastraListConversationsResponse {
  conversations: Array<{
    id: string;
    title: string;
    lastMessage: string;
    lastMessageAt: Date;
    messageCount: number;
  }>;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

// Helper function to get system prompt based on response mode
function getSystemPromptForMode(
  mode: MastraChatRequest["responseMode"],
  customPrompt?: string
): string {
  if (customPrompt) {
    return customPrompt;
  }

  const basePrompt = "You are a helpful AI assistant with access to a knowledge base. Use the provided context to answer questions accurately and cite your sources.";

  switch (mode) {
    case "detailed":
      return `${basePrompt} Provide comprehensive, detailed answers with thorough explanations. Include relevant background information and context.`;
    
    case "concise":
      return `${basePrompt} Provide brief, direct answers. Be succinct while maintaining accuracy.`;
    
    case "technical":
      return `${basePrompt} Focus on technical details, specifications, and precise information. Use technical terminology appropriately.`;
    
    case "conversational":
      return `${basePrompt} Respond in a friendly, conversational tone. Make complex information accessible and engaging.`;
    
    default:
      return basePrompt;
  }
}

// Helper function to generate follow-up questions
function generateFollowUpQuestions(
  query: string,
  response: string,
  citations: any[]
): string[] {
  // Simple heuristic-based follow-up generation
  // In a production system, you might use an LLM for this
  const questions: string[] = [];
  
  if (citations.length > 0) {
    questions.push("Can you provide more details about this topic?");
    
    if (citations.some(c => c.pageNumber)) {
      questions.push("What other information is available in these documents?");
    }
    
    if (query.toLowerCase().includes("how")) {
      questions.push("Are there any alternatives to this approach?");
    }
    
    if (query.toLowerCase().includes("what")) {
      questions.push("How does this relate to other topics?");
    }
  }
  
  return questions.slice(0, 3); // Limit to 3 follow-ups
}

// Helper function to build filters for Mastra search
function buildSearchFilters(
  userId: string,
  documentFilters?: {
    documentTypes?: string[];
    dateRange?: { start?: Date; end?: Date; };
    tags?: string[];
    metadata?: Record<string, any>;
  }
): Record<string, any> {
  const filters: Record<string, any> = {};
  
  if (documentFilters) {
    if (documentFilters.documentTypes?.length) {
      filters.contentType = { $in: documentFilters.documentTypes };
    }
    
    if (documentFilters.dateRange) {
      const dateFilter: any = {};
      if (documentFilters.dateRange.start) {
        dateFilter.$gte = documentFilters.dateRange.start.toISOString();
      }
      if (documentFilters.dateRange.end) {
        dateFilter.$lte = documentFilters.dateRange.end.toISOString();
      }
      if (Object.keys(dateFilter).length > 0) {
        filters.timestamp = dateFilter;
      }
    }

    if (documentFilters.tags?.length) {
      filters.tags = { $in: documentFilters.tags };
    }

    if (documentFilters.metadata) {
      Object.assign(filters, documentFilters.metadata);
    }
  }
  
  return filters;
}

/**
 * Enhanced chat endpoint using Mastra RAG
 */
export const mastraChat = api(
  { expose: true, method: "POST", path: "/chat/mastra" },
  async (req: MastraChatRequest): Promise<MastraChatResponse> => {
    const startTime = Date.now();
    let searchTime = 0;
    let llmTime = 0;

    try {
      logger.info("Mastra chat request received", {
        message: req.message.substring(0, 100),
        userId: req.userId,
        conversationId: req.conversationId,
        responseMode: req.responseMode,
        useGraphRAG: req.options?.useGraphRAG,
      });

      // Create or get conversation
      let conversationId = req.conversationId;
      if (!conversationId) {
        const newConversation = await createConversation({
          title: req.message.substring(0, 50) + (req.message.length > 50 ? "..." : ""),
        });
        conversationId = newConversation.id;
        
        logger.info("Created new conversation", { 
          conversationId, 
          userId: req.userId 
        });
      }

      // Add user message to conversation
      const userMessageId = nanoid();
      await addMessage({
        conversationId,
        content: req.message,
        role: "user",
        userId: req.userId,
        citations: []
      });

      // Get conversation history for context (if needed)
      let conversationContext: any[] = [];
      if (req.options?.includeContext) {
        const history = await getConversationHistory({ 
          conversationId,
          userId: req.userId
        });
        
        conversationContext = history.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt
        }));
      }

      // Build search filters
      const searchFilters = buildSearchFilters(req.userId, req.options?.documentFilters);

      // Step 1: Retrieve relevant chunks using Mastra
      const searchStart = Date.now();
      const retrievalResult = await mastraRAGService.retrieveChunks(req.message, {
        topK: req.options?.maxResults || 10,
        threshold: req.options?.threshold || 0.7,
        filters: searchFilters,
        useGraphRAG: req.options?.useGraphRAG || false
      });
      searchTime = Date.now() - searchStart;

      logger.info("Mastra retrieval completed", {
        conversationId,
        chunksFound: retrievalResult.chunks.length,
        searchTime,
        ragType: retrievalResult.retrievalType
      });

      if (retrievalResult.chunks.length === 0) {
        // No relevant documents found
        const assistantMessageId = nanoid();
        const noDocsResponse = "I couldn't find any relevant information in the knowledge base to answer your question. Could you try rephrasing your question or ask about a different topic?";

        await addMessage({
          conversationId,
          content: noDocsResponse,
          role: "assistant",
          userId: req.userId,
          citations: []
        });

        return {
          conversationId,
          messageId: assistantMessageId,
          content: noDocsResponse,
          citations: [],
          metadata: {
            searchTime,
            llmTime: 0,
            totalTime: Date.now() - startTime,
            documentsFound: 0,
            chunksRetrieved: 0,
            ragType: retrievalResult.retrievalType
          },
          followUpQuestions: [
            "What topics are available in the knowledge base?",
            "Can you try asking a different question?",
            "Would you like me to search for related information?"
          ]
        };
      }

      // Step 2: Generate response using Mastra
      const generationStart = Date.now();
      const systemPrompt = getSystemPromptForMode(req.responseMode, req.options?.systemPrompt);
      
      // Add conversation context to the query if available
      let enhancedQuery = req.message;
      if (conversationContext.length > 0) {
        const contextSummary = conversationContext
          .slice(-3) // Last 3 messages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        enhancedQuery = `Context from conversation:\n${contextSummary}\n\nCurrent question: ${req.message}`;
      }

      const generationResult = await mastraRAGService.generateResponse(
        enhancedQuery,
        retrievalResult.chunks,
        {
          systemPrompt,
          maxTokens: req.options?.maxTokens || 1000,
          temperature: req.options?.temperature || 0.1
        }
      );
      llmTime = Date.now() - generationStart;

      // Step 3: Create citations from retrieved chunks
      const citations = retrievalResult.chunks.map((chunk, index) => ({
        documentId: chunk.metadata.documentId,
        filename: chunk.metadata.filename,
        pageNumber: chunk.metadata.pageNumber,
        chunkContent: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? "..." : ""),
        relevanceScore: retrievalResult.scores[index] || 0,
        citationIndex: index + 1,
        chunkId: chunk.id,
        metadata: chunk.metadata
      }));

      // Generate follow-up questions
      const followUpQuestions = generateFollowUpQuestions(
        req.message,
        generationResult.response,
        citations
      );

      // Add assistant message to conversation
      const assistantMessageId = nanoid();
      await addMessage({
        conversationId,
        content: generationResult.response,
        role: "assistant",
        userId: req.userId,
        citations
      });

      const totalTime = Date.now() - startTime;

      // Track metrics
      const ragType = retrievalResult.retrievalType === "graph" ? "hybrid" : retrievalResult.retrievalType;
      MetricHelpers.trackSearchRequest(
        ragType as "vector" | "fulltext" | "hybrid", 
        req.enableReranking || false
      );
      MetricHelpers.trackSearchDuration(
        totalTime, 
        ragType as "vector" | "fulltext" | "hybrid", 
        req.enableReranking || false
      );

      logger.info("Mastra chat completed successfully", {
        conversationId,
        messageId: assistantMessageId,
        chunksUsed: generationResult.chunksUsed,
        responseLength: generationResult.response.length,
        searchTime,
        llmTime,
        totalTime,
        ragType: retrievalResult.retrievalType
      });

      return {
        conversationId,
        messageId: assistantMessageId,
        content: generationResult.response,
        citations,
        metadata: {
          searchTime,
          llmTime,
          totalTime,
          tokensUsed: generationResult.tokensUsed,
          documentsFound: retrievalResult.chunks.length,
          chunksRetrieved: retrievalResult.chunks.length,
          ragType: retrievalResult.retrievalType,
          graphWalkSteps: req.options?.useGraphRAG ? 100 : undefined // Placeholder
        },
        followUpQuestions,
        context: req.options?.includeContext ? {
          conversationHistory: conversationContext,
          documentsUsed: [...new Set(citations.map(c => c.documentId))]
        } : undefined
      };

    } catch (error) {
      logger.error("Mastra chat failed", {
        message: req.message.substring(0, 100),
        userId: req.userId,
        conversationId: req.conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      recordError(
        "chat",
        "MASTRA_CHAT_FAILED",
        error instanceof Error ? error.message : "Unknown error"
      );

      throw new Error(
        `Mastra chat failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Quick RAG query without conversation context
 */
export const mastraQuickRAG = api(
  { expose: true, method: "POST", path: "/chat/mastra/quick" },
  async (req: {
    query: string;
    userId: string;
    options?: {
      useGraphRAG?: boolean;
      maxResults?: number;
      threshold?: number;
      responseMode?: "detailed" | "concise" | "technical" | "conversational";
      documentFilters?: {
        documentTypes?: string[];
        tags?: string[];
        metadata?: Record<string, any>;
      };
    };
  }): Promise<{
    content: string;
    citations: Array<{
      documentId: string;
      filename: string;
      chunkContent: string;
      relevanceScore: number;
    }>;
    metadata: {
      searchTime: number;
      llmTime: number;
      totalTime: number;
      documentsFound: number;
      ragType: string;
    };
  }> => {
    const startTime = Date.now();

    try {
      logger.info("Mastra quick RAG request received", {
        query: req.query.substring(0, 100),
        userId: req.userId,
        useGraphRAG: req.options?.useGraphRAG
      });

      // Build search filters
      const searchFilters = buildSearchFilters(req.userId, req.options?.documentFilters);

      // Retrieve relevant chunks
      const searchStart = Date.now();
      const retrievalResult = await mastraRAGService.retrieveChunks(req.query, {
        topK: req.options?.maxResults || 5,
        threshold: req.options?.threshold || 0.7,
        filters: searchFilters,
        useGraphRAG: req.options?.useGraphRAG || false
      });
      const searchTime = Date.now() - searchStart;

      if (retrievalResult.chunks.length === 0) {
        return {
          content: "I couldn't find any relevant information to answer your question.",
          citations: [],
          metadata: {
            searchTime,
            llmTime: 0,
            totalTime: Date.now() - startTime,
            documentsFound: 0,
            ragType: retrievalResult.retrievalType
          }
        };
      }

      // Generate response
      const generationStart = Date.now();
      const systemPrompt = getSystemPromptForMode(
        req.options?.responseMode || "conversational"
      );

      const generationResult = await mastraRAGService.generateResponse(
        req.query,
        retrievalResult.chunks,
        {
          systemPrompt,
          maxTokens: 500, // Shorter for quick responses
          temperature: 0.1
        }
      );
      const llmTime = Date.now() - generationStart;

      // Create simplified citations
      const citations = retrievalResult.chunks.map((chunk, index) => ({
        documentId: chunk.metadata.documentId,
        filename: chunk.metadata.filename,
        chunkContent: chunk.text.substring(0, 150) + (chunk.text.length > 150 ? "..." : ""),
        relevanceScore: retrievalResult.scores[index] || 0
      }));

      const totalTime = Date.now() - startTime;

      logger.info("Mastra quick RAG completed", {
        query: req.query.substring(0, 100),
        documentsFound: retrievalResult.chunks.length,
        responseLength: generationResult.response.length,
        totalTime
      });

      return {
        content: generationResult.response,
        citations,
        metadata: {
          searchTime,
          llmTime,
          totalTime,
          documentsFound: retrievalResult.chunks.length,
          ragType: retrievalResult.retrievalType
        }
      };

    } catch (error) {
      logger.error("Mastra quick RAG failed", {
        query: req.query.substring(0, 100),
        userId: req.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(
        `Mastra quick RAG failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Re-export existing conversation management endpoints with Mastra enhancements
export const listMastraConversations = api(
  { expose: true, method: "GET", path: "/chat/mastra/conversations" },
  async (req: ListConversationsRequest): Promise<MastraListConversationsResponse> => {
    try {
      const result = await listUserConversations(req);
      const conversations = result.conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        lastMessage: "", // TODO: Get last message
        lastMessageAt: conv.updatedAt,
        messageCount: conv.messageCount || 0
      }));
      return {
        conversations,
        totalCount: result.pagination.total,
        currentPage: result.pagination.page,
        totalPages: result.pagination.totalPages
      };
    } catch (error) {
      logger.error("Failed to list conversations", {
        userId: req.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
);

export const getMastraConversation = api(
  { expose: true, method: "GET", path: "/chat/mastra/conversations/:conversationId" },
  async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    try {
      const result = await getConversationDetails({ conversationId, userId });
      return result;
    } catch (error) {
      logger.error("Failed to get conversation", {
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
);

export const deleteMastraConversation = api(
  { expose: true, method: "DELETE", path: "/chat/mastra/conversations/:conversationId" },
  async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    try {
      await removeConversation({ conversationId, userId });
      
      // Also clean up any drafts
      await deleteDraft({ conversationId, userId });
      
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete conversation", {
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
);