import { api } from "encore.dev/api";
import { db } from "../db/client";
import { 
  conversations, 
  conversationMessages, 
  NewConversation, 
  NewConversationMessage,
  Conversation,
  ConversationMessage
} from "../db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { 
  pruneConversationHistory,
  manageRAGContext,
  analyzeConversationPatterns,
  ContextOptions,
  type ContextOptionsType
} from "./context-management";
import { CacheService } from "../lib/cache/cache.service";
import { ConversationKeyspace, type ConversationCacheKey } from "../lib/infrastructure/cache/cache";
import type { PlaceholderConversationObject } from "../lib/cache/cache.service"; // Corrected import

// Request/Response schemas
export const CreateConversationRequest = z.object({
  title: z.string().min(1).max(200).optional(),
  firstMessage: z.string().min(1).optional(),
});

export const GetConversationRequest = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
});

export const ListConversationsRequest = z.object({
  userId: z.string().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const AddMessageRequest = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  citations: z.array(z.object({
    documentId: z.string(),
    filename: z.string(),
    pageNumber: z.number().int().positive().optional(),
    chunkContent: z.string(),
    relevanceScore: z.number().min(0).max(1),
  })).default([]),
});

export const UpdateConversationTitleRequest = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
});

export const GetPrunedHistoryRequest = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  contextOptions: ContextOptions.partial().optional(),
});

export const AnalyzeConversationRequest = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
});

export const ConversationResponse = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  messageCount: z.number().optional(),
});

export const ConversationWithMessagesResponse = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    citations: z.array(z.object({
      documentId: z.string(),
      filename: z.string(),
      pageNumber: z.number().optional(),
      chunkContent: z.string(),
      relevanceScore: z.number(),
    })),
    createdAt: z.date(),
  })),
});

export const ListConversationsResponse = z.object({
  conversations: z.array(ConversationResponse),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

export const MessageResponse = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  citations: z.array(z.object({
    documentId: z.string(),
    filename: z.string(),
    pageNumber: z.number().optional(),
    chunkContent: z.string(),
    relevanceScore: z.number(),
  })),
  createdAt: z.date(),
});

export const PrunedHistoryResponse = z.object({
  messages: z.array(MessageResponse),
  contextSummary: z.string(),
  totalTokens: z.number(),
  originalMessageCount: z.number(),
  prunedMessageCount: z.number(),
});

export const ConversationAnalysisResponse = z.object({
  topicClusters: z.array(z.string()),
  keyEntities: z.array(z.string()),
  conversationTrends: z.array(z.string()),
  messageCount: z.number(),
  averageMessageLength: z.number(),
  totalCharacters: z.number(),
});

// Helper function to generate conversation title from first message
function generateConversationTitle(firstMessage: string): string {
  // Extract key terms and create a concise title
  const words = firstMessage.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !isCommonWord(word));
  
  const keywords = words.slice(0, 3);
  let title = keywords.join(' ');
  
  if (title.length === 0) {
    title = "New Conversation";
  } else if (title.length > 50) {
    title = title.substring(0, 47) + "...";
  } else {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  return title;
}

function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
    'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 
    'did', 'why', 'let', 'put', 'say', 'she', 'too', 'use', 'what', 'when',
    'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want',
    'been', 'good', 'much', 'some', 'time', 'very', 'come', 'here', 'just'
  ]);
  return commonWords.has(word);
}

// API Endpoints

// Create a new conversation
export const createConversation = api(
  { method: "POST", path: "/chat/conversations", expose: true },
  async ({ title, firstMessage }: z.infer<typeof CreateConversationRequest>): Promise<z.infer<typeof ConversationResponse>> => {
    const conversationId = uuidv4();
    
    // Auto-generate title from first message if not provided
    const conversationTitle = title || (firstMessage ? generateConversationTitle(firstMessage) : "New Conversation");
    
    const newConversation: NewConversation = {
      id: conversationId,
      userId: "system", // TODO: Get from authentication context
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
  async ({ conversationId, userId }: z.infer<typeof GetConversationRequest>): Promise<z.infer<typeof ConversationWithMessagesResponse>> => {
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
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
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
        messages: messages.map((msg: any) => ({ // Or decide if messages are part of this cache item
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
  async ({ userId, page, pageSize, search }: z.infer<typeof ListConversationsRequest>): Promise<z.infer<typeof ListConversationsResponse>> => {
    try {
      const offset = (page - 1) * pageSize;
      
      // Build where conditions
      const baseCondition = eq(conversations.userId, userId);
      const whereCondition = search 
        ? and(baseCondition, sql`${conversations.title} ILIKE ${'%' + search + '%'}`)
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
  async ({ conversationId, userId, role, content, citations }: z.infer<typeof AddMessageRequest>): Promise<z.infer<typeof MessageResponse>> => {
    try {
      // Verify conversation exists and user has access
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
        .limit(1);

      if (conversation.length === 0) {
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

      // Update conversation timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

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

// Update conversation title
export const updateConversationTitle = api(
  { method: "PUT", path: "/chat/conversations/:conversationId/title", expose: true },
  async ({ conversationId, userId, title }: z.infer<typeof UpdateConversationTitleRequest>): Promise<z.infer<typeof ConversationResponse>> => {
    try {
      const [updated] = await db
        .update(conversations)
        .set({ 
          title, 
          updatedAt: new Date() 
        })
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
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
  async ({ conversationId, userId }: z.infer<typeof GetConversationRequest>): Promise<{ success: boolean }> => {
    try {
      // Verify ownership before deletion
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found or access denied");
      }

      // Delete messages first (cascade should handle this, but being explicit)
      await db
        .delete(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId));

      // Delete conversation
      await db
        .delete(conversations)
        .where(eq(conversations.id, conversationId));

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
  async ({ conversationId, userId }: z.infer<typeof GetConversationRequest>): Promise<{ messages: z.infer<typeof MessageResponse>[] }> => {
    try {
      // Verify user has access to conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
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
  async ({ conversationId, userId, contextOptions }: z.infer<typeof GetPrunedHistoryRequest>): Promise<z.infer<typeof PrunedHistoryResponse>> => {
    try {
      // Verify user has access to conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
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
      const totalTokens = prunedMessages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
      
      const contextSummary = prunedMessages.length === allMessages.length 
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
  async ({ conversationId, userId }: z.infer<typeof AnalyzeConversationRequest>): Promise<z.infer<typeof ConversationAnalysisResponse>> => {
    try {
      // Verify user has access to conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
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
    contextOptions 
  }: {
    conversationId: string;
    userId: string;
    documentContext: string;
    contextOptions?: Partial<ContextOptionsType>;
  }): Promise<{
    prunedMessages: z.infer<typeof MessageResponse>[];
    contextSummary: string;
    totalTokens: number;
    availableTokensForResponse: number;
  }> => {
    try {
      // Verify user has access to conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
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

// Health check endpoint
export const health = api(
  { method: "GET", path: "/chat/health", expose: true },
  async (): Promise<{ status: string; timestamp: string }> => {
    try {
      // Test database connection
      await db.select().from(conversations).limit(1);
      
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Chat service unhealthy: ${error}`);
    }
  }
);