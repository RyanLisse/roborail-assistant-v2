import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./connection";
import {
  type Conversation,
  type ConversationMessage,
  type Document,
  type DocumentChunk,
  conversationMessages,
  conversations,
  createConversationSchema,
  createDocumentChunkSchema,
  createDocumentSchema,
  createMessageSchema,
  documentChunks,
  documents,
} from "./schema";

// Document operations
export const documentUtils = {
  async create(data: Parameters<typeof createDocumentSchema.parse>[0]) {
    const validated = createDocumentSchema.parse(data);
    const [document] = await db
      .insert(documents)
      .values({
        ...validated,
        uploadedAt: new Date(),
      })
      .returning();
    return document;
  },

  async findById(id: string) {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  },

  async findByUserId(userId: string, limit = 20, offset = 0) {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.uploadedAt))
      .limit(limit)
      .offset(offset);
  },

  async updateStatus(id: string, status: Document["status"], processedAt?: Date) {
    const updateData: any = { status };
    if (processedAt) updateData.processedAt = processedAt;

    const [updated] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning();
    return updated;
  },

  async delete(id: string) {
    await db.delete(documents).where(eq(documents.id, id));
  },
};

// Document chunk operations
export const chunkUtils = {
  async create(data: Parameters<typeof createDocumentChunkSchema.parse>[0]) {
    const validated = createDocumentChunkSchema.parse(data);
    const [chunk] = await db
      .insert(documentChunks)
      .values({
        ...validated,
        createdAt: new Date(),
      })
      .returning();
    return chunk;
  },

  async findByDocumentId(documentId: string, limit = 50, offset = 0) {
    return await db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId))
      .orderBy(asc(documentChunks.chunkIndex))
      .limit(limit)
      .offset(offset);
  },

  async vectorSearch(queryEmbedding: number[], limit = 10, threshold = 0.7) {
    // Vector similarity search using cosine distance
    return await db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        content: documentChunks.content,
        chunkIndex: documentChunks.chunkIndex,
        pageNumber: documentChunks.pageNumber,
        metadata: documentChunks.metadata,
        similarity: sql<number>`1 - (${documentChunks.embedding} <=> ${queryEmbedding})`,
      })
      .from(documentChunks)
      .where(sql`1 - (${documentChunks.embedding} <=> ${queryEmbedding}) > ${threshold}`)
      .orderBy(sql`${documentChunks.embedding} <=> ${queryEmbedding}`)
      .limit(limit);
  },

  async deleteByDocumentId(documentId: string) {
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
  },
};

// Conversation operations
export const conversationUtils = {
  async create(data: Parameters<typeof createConversationSchema.parse>[0]) {
    const validated = createConversationSchema.parse(data);
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...validated,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return conversation;
  },

  async findById(id: string) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async findByUserId(userId: string, limit = 20, offset = 0) {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);
  },

  async updateTitle(id: string, title: string) {
    const [updated] = await db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  },

  async delete(id: string) {
    await db.delete(conversations).where(eq(conversations.id, id));
  },
};

// Message operations
export const messageUtils = {
  async create(data: Parameters<typeof createMessageSchema.parse>[0]) {
    const validated = createMessageSchema.parse(data);
    const [message] = await db
      .insert(conversationMessages)
      .values({
        ...validated,
        createdAt: new Date(),
      })
      .returning();

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, validated.conversationId));

    return message;
  },

  async findByConversationId(conversationId: string, limit = 50, offset = 0) {
    return await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(asc(conversationMessages.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async deleteByConversationId(conversationId: string) {
    await db
      .delete(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId));
  },
};

// Health check utilities
export const healthUtils = {
  async checkConnection() {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: "healthy", timestamp: new Date() };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  },

  async getStats() {
    const [documentsCount] = await db.execute(sql`SELECT COUNT(*) as count FROM documents`);
    const [chunksCount] = await db.execute(sql`SELECT COUNT(*) as count FROM document_chunks`);
    const [conversationsCount] = await db.execute(sql`SELECT COUNT(*) as count FROM conversations`);
    const [messagesCount] = await db.execute(
      sql`SELECT COUNT(*) as count FROM conversation_messages`
    );

    return {
      documents: Number(documentsCount.count),
      chunks: Number(chunksCount.count),
      conversations: Number(conversationsCount.count),
      messages: Number(messagesCount.count),
    };
  },
};
