import { and, count, desc, eq, sql } from "drizzle-orm";
import { api } from "encore.dev/api";
import log from "encore.dev/log"; // Assuming log is not already imported or use existing one
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import {
  type NewConversation,
  type NewConversationMessage,
  conversationMessages,
  conversations,
} from "../db/schema";
import { CacheService } from "../lib/cache/cache.service";
import type { PlaceholderConversationObject } from "../lib/cache/cache.service"; // Corrected import
import type { ConversationCacheKey } from "../lib/infrastructure/cache/cache";
import {
  type ContextOptionsType,
  analyzeConversationPatterns,
  manageRAGContext,
  pruneConversationHistory,
} from "./context-management";

// Define explicit interfaces for CreateConversationRequest, ConversationResponse, etc.
// Replace all usages of z.infer<typeof ...> in API signatures with these interfaces.
// If runtime validation is needed, use zod inside the function body, not in the signature.

// Request/Response schemas
export interface CreateConversationRequest {
  title?: string;
  firstMessage?: string;
}

export interface GetConversationRequest {
  conversationId: string;
  userId: string;
}

export interface ListConversationsRequest {
  userId: string;
  page: number;
  pageSize: number;
  search?: string;
}

export interface AddMessageRequest {
  conversationId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  citations: {
    documentId: string;
    filename: string;
    pageNumber?: number;
    chunkContent: string;
    relevanceScore: number;
  }[];
}

export interface UpdateConversationTitleRequest {
  conversationId: string;
  userId: string;
  title: string;
}

export interface SaveConversationDraftRequest {
  conversationId: string;
  userId: string;
  draftPayload: {
    currentMessage?: string;
    // other draft-specific fields if any
  };
}

export interface GetPrunedHistoryRequest {
  conversationId: string;
  userId: string;
  contextOptions?: Partial<ContextOptionsType>;
}

export interface AnalyzeConversationRequest {
  conversationId: string;
  userId: string;
}

export interface ConversationResponse {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

export interface ConversationWithMessagesResponse {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations: {
      documentId: string;
      filename: string;
      pageNumber?: number;
      chunkContent: string;
      relevanceScore: number;
    }[];
    createdAt: Date;
  }[];
}

export interface ListConversationsResponse {
  conversations: ConversationResponse[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: {
    documentId: string;
    filename: string;
    pageNumber?: number;
    chunkContent: string;
    relevanceScore: number;
  }[];
  createdAt: Date;
}

export interface PrunedHistoryResponse {
  messages: MessageResponse[];
  contextSummary: string;
  totalTokens: number;
  originalMessageCount: number;
  prunedMessageCount: number;
}

export interface ConversationAnalysisResponse {
  topicClusters: string[];
  keyEntities: string[];
  conversationTrends: string[];
  messageCount: number;
  averageMessageLength: number;
  totalCharacters: number;
}

// Helper function to generate conversation title from first message
function generateConversationTitle(firstMessage: string): string {
  // Extract key terms and create a concise title
  const words = firstMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !isCommonWord(word));

  const keywords = words.slice(0, 3);
  let title = keywords.join(" ");

  if (title.length === 0) {
    title = "New Conversation";
  } else if (title.length > 50) {
    title = `${title.substring(0, 47)}...`;
  } else {
    title = `${title.charAt(0).toUpperCase()}${title.slice(1)}`;
  }

  return title;
}

function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    "the",
    "and",
    "for",
    "are",
    "but",
    "not",
    "you",
    "all",
    "can",
    "had",
    "her",
    "was",
    "one",
    "our",
    "out",
    "day",
    "get",
    "has",
    "him",
    "his",
    "how",
    "its",
    "may",
    "new",
    "now",
    "old",
    "see",
    "two",
    "who",
    "boy",
    "did",
    "why",
    "let",
    "put",
    "say",
    "she",
    "too",
    "use",
    "what",
    "when",
    "with",
    "have",
    "this",
    "will",
    "your",
    "from",
    "they",
    "know",
    "want",
    "been",
    "good",
    "much",
    "some",
    "time",
    "very",
    "come",
    "here",
    "just",
  ]);
  return commonWords.has(word);
}

// API Endpoints

// Create a new conversation
export const createConversation = api(
  { method: "POST", path: "/chat/conversations", expose: true },
  async ({ title, firstMessage }: CreateConversationRequest): Promise<ConversationResponse> => {
    const conversationId = uuidv4();

    // Auto-generate title from first message if not provided
    const conversationTitle =
      title || (firstMessage ? generateConversationTitle(firstMessage) : "New Conversation");

    const newConversation: NewConversation = {
      id: conversationId,
      userId: "system", // Authentication removed - using system user
      title: conversationTitle,
    };

    try {
      const [created] = await db.insert(conversations).values(newConversation).returning();

      return {
        id: created.id,
        userId: created.userId,
        title: created.title,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        messageCount: 0,
      };
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error}`);
    }
  }
);

// Get a specific conversation with messages
export const getConversation = api(
  { method: "GET", path: "/chat/conversations/:conversationId", expose: true },
  async ({
    conversationId,
    userId,
  }: GetConversationRequest): Promise<ConversationWithMessagesResponse> => {
    try {
      const cacheKey: ConversationCacheKey = { conversationId };
      const cachedConversation = await CacheService.getCachedConversation(cacheKey);

      if (cachedConversation) {
        // TODO: This placeholder doesn't include messages.
        // Need to decide if messages are part of the cached ConversationObject
        // or if they are fetched separately. For now, assume messages are not in this specific cache object.
        // If they were, we'd need to map them here.
        // Also, update conversation access timestamp in DB if returning from cache?
        // For simplicity, this example returns the cached object as is, assuming it matches the response structure.
        // A more complete implementation would fetch messages if not in cache or if a shallow cache is used.

        // This is a simplified return, as PlaceholderConversationObject may not match ConversationWithMessagesResponse exactly
        // In a real scenario, you'd fetch messages separately or ensure the cached object includes them.
        // For now, we'll reconstruct a partial response and assume messages need fetching or are not part of this primary cache item.
        return {
          id: cachedConversation.id,
          userId: cachedConversation.userId,
          title: cachedConversation.title,
          createdAt: new Date(cachedConversation.createdAt), // Ensure Date objects are correctly handled
          updatedAt: new Date(cachedConversation.updatedAt),
          messages: [], // Placeholder: messages would typically be fetched unless also cached
        };
      }

      // Get conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found or access denied");
      }

      // Get messages
      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);

      // Construct the object to cache - should match PlaceholderConversationObject or a defined cacheable type
      const conversationToCache: PlaceholderConversationObject = {
        id: conversation[0].id,
        userId: conversation[0].userId,
        title: conversation[0].title,
        createdAt: conversation[0].createdAt,
        updatedAt: new Date(), // Use current time as it's just been accessed/updated
        messages: messages.map((msg: any) => ({
          // Or decide if messages are part of this cache item
          id: msg.id,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          createdAt: msg.createdAt,
        })),
      };
      await CacheService.setCachedConversation(cacheKey, conversationToCache);

      // Update conversation access timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      return {
        id: conversation[0].id,
        userId: conversation[0].userId,
        title: conversation[0].title,
        createdAt: conversation[0].createdAt,
        updatedAt: conversation[0].updatedAt,
        messages: messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          createdAt: msg.createdAt,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error}`);
    }
  }
);

// List conversations for a user
export const listConversations = api(
  { method: "GET", path: "/chat/conversations", expose: true },
  async ({
    userId,
    page,
    pageSize,
    search,
  }: ListConversationsRequest): Promise<ListConversationsResponse> => {
    try {
      const offset = (page - 1) * pageSize;

      // Build where conditions
      const baseCondition = eq(conversations.userId, userId);
      const whereCondition = search
        ? and(baseCondition, sql`${conversations.title} ILIKE ${`%${search}%`}`)
        : baseCondition;

      // Get total count
      const [totalCount] = await db
        .select({ count: count() })
        .from(conversations)
        .where(whereCondition);

      // Get conversations with message counts
      const conversationList = await db
        .select({
          id: conversations.id,
          userId: conversations.userId,
          title: conversations.title,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          messageCount: count(conversationMessages.id),
        })
        .from(conversations)
        .leftJoin(conversationMessages, eq(conversations.id, conversationMessages.conversationId))
        .where(whereCondition)
        .groupBy(
          conversations.id,
          conversations.userId,
          conversations.title,
          conversations.createdAt,
          conversations.updatedAt
        )
        .orderBy(desc(conversations.updatedAt))
        .limit(pageSize)
        .offset(offset);

      const totalPages = Math.ceil(totalCount.count / pageSize);

      return {
        conversations: conversationList.map((conv: any) => ({
          id: conv.id,
          userId: conv.userId,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messageCount: conv.messageCount,
        })),
        pagination: {
          total: totalCount.count,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      throw new Error(`Failed to list conversations: ${error}`);
    }
  }
);

// Add a message to a conversation
export const addMessage = api(
  { method: "POST", path: "/chat/conversations/:conversationId/messages", expose: true },
  async ({
    conversationId,
    userId,
    role,
    content,
    citations,
  }: AddMessageRequest): Promise<MessageResponse> => {
    try {
      // Verify conversation exists and user has access
      const conversationRecord = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);

      if (conversationRecord.length === 0) {
        throw new Error("Conversation not found or access denied");
      }

      const messageId = uuidv4();
      const newMessage: NewConversationMessage = {
        id: messageId,
        conversationId,
        role,
        content,
        citations,
      };

      const [created] = await db.insert(conversationMessages).values(newMessage).returning();

      // Update conversation timestamp & clear draft
      await db
        .update(conversations)
        .set({
          updatedAt: new Date(),
          isDraft: false, // Mark as not draft
          metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{draft}', 'null'::jsonb)`, // Clear draft
        })
        .where(eq(conversations.id, conversationId));
      log.info("Cleared draft and updated conversation timestamp", { conversationId });

      // Invalidate cache for this conversation
      const cacheKey: ConversationCacheKey = { conversationId };
      await CacheService.deleteCachedConversation(cacheKey);

      return {
        id: created.id,
        conversationId: created.conversationId,
        role: created.role,
        content: created.content,
        citations: created.citations,
        createdAt: created.createdAt,
      };
    } catch (error) {
      throw new Error(`Failed to add message: ${error}`);
    }
  }
);

// Save conversation draft
export const saveConversationDraft = api(
  { method: "POST", path: "/chat/conversations/:conversationId/draft", expose: true },
  async ({
    conversationId,
    userId,
    draftPayload,
  }: SaveConversationDraftRequest): Promise<{ message: string }> => {
    try {
      // Verify conversation exists and user has access
      const conversation = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, userId) // Ensure user owns the conversation
          )
        )
        .limit(1);

      if (conversation.length === 0) {
        // Consider if a draft should create a conversation if one doesn't exist, or fail.
        // For now, assume conversation must exist to save a draft to it.
        log.warn("Attempted to save draft for non-existent or unauthorized conversation", {
          conversationId,
          userId,
        });
        throw new Error("Conversation not found or access denied");
      }

      await db
        .update(conversations)
        .set({
          metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{draft}', ${JSON.stringify(draftPayload)}::jsonb)`,
          isDraft: true, // Mark that it has a draft
          updatedAt: new Date(), // Update timestamp to reflect draft activity
        })
        .where(eq(conversations.id, conversationId));

      log.info("Conversation draft saved", { conversationId, userId });
      return { message: "Draft saved successfully." };
    } catch (error) {
      log.error("Failed to save conversation draft", { conversationId, userId, error });
      throw new Error(`Failed to save draft: ${error}`);
    }
  }
);

// Update conversation title
export const updateConversationTitle = api(
  { method: "PUT", path: "/chat/conversations/:conversationId/title", expose: true },
  async ({
    conversationId,
    userId,
    title,
  }: UpdateConversationTitleRequest): Promise<ConversationResponse> => {
    try {
      const [updated] = await db
        .update(conversations)
        .set({
          title,
          updatedAt: new Date(),
        })
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .returning();

      if (!updated) {
        throw new Error("Conversation not found or access denied");
      }

      return {
        id: updated.id,
        userId: updated.userId,
        title: updated.title,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      throw new Error(`Failed to update conversation title: ${error}`);
    }
  }
);

// Delete a conversation
export const deleteConversation = api(
  { method: "DELETE", path: "/chat/conversations/:conversationId", expose: true },
  async ({ conversationId, userId }: GetConversationRequest): Promise<{ success: boolean }> => {
    try {
      // Verify ownership before deletion
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found or access denied");
      }

      // Delete messages first (cascade should handle this, but being explicit)
      await db
        .delete(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId));

      // Delete conversation
      await db.delete(conversations).where(eq(conversations.id, conversationId));

      // Invalidate cache for this conversation
      const cacheKey: ConversationCacheKey = { conversationId };
      await CacheService.deleteCachedConversation(cacheKey);

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete conversation: ${error}`);
    }
  }
);

// Get conversation history (messages only)
export const getConversationHistory = api(
  { method: "GET", path: "/chat/conversations/:conversationId/messages", expose: true },
  async ({
    conversationId,
    userId,
  }: GetConversationRequest): Promise<{ messages: MessageResponse[] }> => {
    try {
      // Verify user has access to conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found or access denied");
      }

      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);

      return {
        messages: messages.map((msg: any) => ({
          id: msg.id,
          conversationId: msg.conversationId,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          createdAt: msg.createdAt,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get conversation history: ${error}`);
    }
  }
);

// Get pruned conversation history with context management
export const getPrunedHistory = api(
  { method: "POST", path: "/chat/conversations/:conversationId/pruned-history", expose: true },
  async ({
    conversationId,
    userId,
    contextOptions,
  }: GetPrunedHistoryRequest): Promise<PrunedHistoryResponse> => {
    try {
      // Verify user has access to conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found or access denied");
      }

      // Get all messages
      const allMessages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);

      // Apply context management
      const prunedMessages = pruneConversationHistory(allMessages, contextOptions || {});
      const totalTokens = prunedMessages.reduce(
        (sum, msg) => sum + Math.ceil(msg.content.length / 4),
        0
      );

      const contextSummary =
        prunedMessages.length === allMessages.length
          ? `Full conversation history included (${prunedMessages.length} messages, ~${totalTokens} tokens)`
          : `Context pruned: ${prunedMessages.length} of ${allMessages.length} messages included (~${totalTokens} tokens)`;

      return {
        messages: prunedMessages.map((msg: any) => ({
          id: msg.id,
          conversationId: msg.conversationId,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          createdAt: msg.createdAt,
        })),
        contextSummary,
        totalTokens,
        originalMessageCount: allMessages.length,
        prunedMessageCount: prunedMessages.length,
      };
    } catch (error) {
      throw new Error(`Failed to get pruned history: ${error}`);
    }
  }
);

// Analyze conversation patterns and topics
export const analyzeConversation = api(
  { method: "GET", path: "/chat/conversations/:conversationId/analysis", expose: true },
  async ({
    conversationId,
    userId,
  }: AnalyzeConversationRequest): Promise<ConversationAnalysisResponse> => {
    try {
      // Verify user has access to conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found or access denied");
      }

      // Get all messages
      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);

      if (messages.length === 0) {
        return {
          topicClusters: [],
          keyEntities: [],
          conversationTrends: [],
          messageCount: 0,
          averageMessageLength: 0,
          totalCharacters: 0,
        };
      }

      // Analyze patterns
      const patterns = analyzeConversationPatterns(messages);

      // Calculate statistics
      const totalCharacters = messages.reduce((sum, msg) => sum + msg.content.length, 0);
      const averageMessageLength = totalCharacters / messages.length;

      return {
        topicClusters: patterns.topicClusters,
        keyEntities: patterns.keyEntities,
        conversationTrends: patterns.conversationTrends,
        messageCount: messages.length,
        averageMessageLength: Math.round(averageMessageLength),
        totalCharacters,
      };
    } catch (error) {
      throw new Error(`Failed to analyze conversation: ${error}`);
    }
  }
);

// Manage RAG context for a conversation with document context
export const manageConversationRAGContext = api(
  { method: "POST", path: "/chat/conversations/:conversationId/rag-context", expose: true },
  async ({
    conversationId,
    userId,
    documentContext,
    contextOptions,
  }: {
    conversationId: string;
    userId: string;
    documentContext: string;
    contextOptions?: Partial<ContextOptionsType>;
  }): Promise<{
    prunedMessages: MessageResponse[];
    contextSummary: string;
    totalTokens: number;
    availableTokensForResponse: number;
  }> => {
    try {
      // Verify user has access to conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found or access denied");
      }

      // Get all messages
      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);

      // Apply RAG context management
      const managedContext = manageRAGContext(messages, documentContext, contextOptions);

      return {
        prunedMessages: managedContext.prunedMessages.map((msg: any) => ({
          id: msg.id,
          conversationId: msg.conversationId,
          role: msg.role,
          content: msg.content,
          citations: msg.citations,
          createdAt: msg.createdAt,
        })),
        contextSummary: managedContext.contextSummary,
        totalTokens: managedContext.totalTokens,
        availableTokensForResponse: managedContext.availableTokensForResponse,
      };
    } catch (error) {
      throw new Error(`Failed to manage RAG context: ${error}`);
    }
  }
);

// Health check is handled by the main chat service
