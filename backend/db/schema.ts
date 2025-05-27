import { 
  pgTable, 
  text, 
  bigint, 
  timestamp, 
  integer, 
  jsonb, 
  vector,
  index
} from "drizzle-orm/pg-core";
import { z } from "zod";

// Zod schemas for validation
export const DocumentStatus = z.enum(["uploaded", "processing", "processed", "failed"]);
export const MessageRole = z.enum(["user", "assistant"]);

// Documents table - stores uploaded document metadata
export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    status: text("status").notNull().$type<z.infer<typeof DocumentStatus>>(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    chunkCount: integer("chunk_count").notNull().default(0),
    metadata: jsonb("metadata").notNull().default("{}"),
  },
  (table) => ({
    userIdIdx: index("documents_user_id_idx").on(table.userId),
    statusIdx: index("documents_status_idx").on(table.status),
    uploadedAtIdx: index("documents_uploaded_at_idx").on(table.uploadedAt),
  })
);

// Document chunks table - stores semantic chunks with vector embeddings
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // Vector embedding (1024 dimensions for Cohere embed-v4.0)
    embedding: vector("embedding", { dimensions: 1024 }),
    chunkIndex: integer("chunk_index").notNull(),
    pageNumber: integer("page_number"),
    tokenCount: integer("token_count").notNull(),
    metadata: jsonb("metadata").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdIdx: index("chunks_document_id_idx").on(table.documentId),
    chunkIndexIdx: index("chunks_chunk_index_idx").on(table.chunkIndex),
    // HNSW index for vector similarity search
    embeddingIdx: index("document_chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  })
);

// Conversations table - stores chat conversation metadata
export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("conversations_user_id_idx").on(table.userId),
    updatedAtIdx: index("conversations_updated_at_idx").on(table.updatedAt),
  })
);

// Conversation messages table - stores individual chat messages
export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<z.infer<typeof MessageRole>>(),
    content: text("content").notNull(),
    // Citations stored as JSONB array
    citations: jsonb("citations").notNull().default("[]").$type<Array<{
      documentId: string;
      filename: string;
      pageNumber?: number;
      chunkContent: string;
      relevanceScore: number;
    }>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index("messages_conversation_id_idx").on(table.conversationId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

// Type inference for TypeScript
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;

// Validation schemas using Zod
export const createDocumentSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  filename: z.string().min(1),
  originalName: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().positive(),
  status: DocumentStatus,
  metadata: z.record(z.any()).default({}),
});

export const createDocumentChunkSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  content: z.string().min(1),
  embedding: z.array(z.number()).length(1024),
  chunkIndex: z.number().int().min(0),
  pageNumber: z.number().int().positive().optional(),
  tokenCount: z.number().int().positive(),
  metadata: z.record(z.any()).default({}),
});

export const createConversationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1),
});

export const createMessageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  role: MessageRole,
  content: z.string().min(1),
  citations: z.array(z.object({
    documentId: z.string(),
    filename: z.string(),
    pageNumber: z.number().int().positive().optional(),
    chunkContent: z.string(),
    relevanceScore: z.number().min(0).max(1),
  })).default([]),
});