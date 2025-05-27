import { api } from "encore.dev/api";
import { z } from "zod";
import { db } from "../db/connection";
import { documents, documentChunks, type Document as DBDocument, type DocumentChunk } from "../db/schema";
import { eq, and, desc, asc, like, ilike, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// Validation schemas
export const DocumentFilterSchema = z.object({
  userId: z.string().min(1),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(["uploaded", "processing", "processed", "failed"]).optional(),
  contentType: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["uploadedAt", "filename", "fileSize"]).default("uploadedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const DocumentUpdateSchema = z.object({
  documentId: z.string().min(1),
  userId: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  filename: z.string().min(1).optional(),
});

export const ProcessingStatusUpdateSchema = z.object({
  documentId: z.string().min(1),
  status: z.enum(["uploaded", "processing", "processed", "failed"]),
  chunkCount: z.number().int().min(0).optional(),
  errorMessage: z.string().optional(),
});

// Types
export interface Document {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  contentType: string;
  fileSize: number;
  status: "uploaded" | "processing" | "processed" | "failed";
  uploadedAt: Date;
  processedAt?: Date;
  chunkCount: number;
  metadata: Record<string, any>;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DocumentChunkResponse {
  chunks: Array<{
    id: string;
    content: string;
    chunkIndex: number;
    pageNumber?: number;
    tokenCount: number;
    metadata: Record<string, any>;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DocumentStats {
  totalChunks: number;
  totalTokens: number;
  averageChunkSize: number;
  processingDuration?: number;
}

// Helper functions
function formatDocumentResponse(doc: DBDocument): Document {
  return {
    id: doc.id,
    userId: doc.userId,
    filename: doc.filename,
    originalName: doc.originalName,
    contentType: doc.contentType,
    fileSize: doc.fileSize,
    status: doc.status as "uploaded" | "processing" | "processed" | "failed",
    uploadedAt: doc.uploadedAt,
    processedAt: doc.processedAt || undefined,
    chunkCount: doc.chunkCount,
    metadata: doc.metadata as Record<string, any>,
  };
}

async function verifyDocumentAccess(documentId: string, userId: string): Promise<DBDocument | null> {
  const result = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  
  return result[0] || null;
}

// Get user documents
export const getDocuments = api(
  { expose: true, method: "GET", path: "/documents" },
  async (request: {
    userId: string;
    page?: number;
    limit?: number;
    status?: string;
    contentType?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<DocumentListResponse> => {
    try {
      // Validate and parse request
      const validated = DocumentFilterSchema.parse(request);
      const { userId, page, limit, status, contentType, search, sortBy, sortOrder } = validated;
      
      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions = [eq(documents.userId, userId)];
      
      if (status) {
        conditions.push(eq(documents.status, status));
      }
      
      if (contentType) {
        conditions.push(eq(documents.contentType, contentType));
      }
      
      // Add search functionality
      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        conditions.push(
          sql`(
            LOWER(${documents.filename}) LIKE ${searchTerm} OR 
            LOWER(${documents.originalName}) LIKE ${searchTerm} OR
            LOWER(CAST(${documents.metadata} ->> 'title' AS TEXT)) LIKE ${searchTerm}
          )`
        );
      }
      
      // Determine sort order
      const sortColumn = sortBy === "filename" ? documents.filename : 
                        sortBy === "fileSize" ? documents.fileSize : 
                        documents.uploadedAt;
      const orderFn = sortOrder === "asc" ? asc : desc;
      
      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(documents)
        .where(and(...conditions));
      
      const total = totalResult[0].count;
      
      // Get paginated results
      const results = await db
        .select()
        .from(documents)
        .where(and(...conditions))
        .orderBy(orderFn(sortColumn))
        .limit(limit + 1) // Get one extra to check if there are more
        .offset(offset);
      
      // Check if there are more results
      const hasMore = results.length > limit;
      const documentsData = hasMore ? results.slice(0, -1) : results;
      
      return {
        documents: documentsData.map(formatDocumentResponse),
        total,
        page,
        limit,
        hasMore,
      };
      
    } catch (error) {
      console.error('Error retrieving documents:', error);
      throw new Error(`Failed to retrieve documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Get specific document
export const getDocument = api(
  { expose: true, method: "GET", path: "/documents/:documentId" },
  async ({ documentId, userId }: { documentId: string; userId: string }): Promise<Document> => {
    try {
      const doc = await verifyDocumentAccess(documentId, userId);
      
      if (!doc) {
        throw new Error("Document not found or access denied");
      }
      
      return formatDocumentResponse(doc);
      
    } catch (error) {
      console.error('Error retrieving document:', error);
      throw new Error(`Failed to retrieve document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Update document metadata
export const updateDocument = api(
  { expose: true, method: "PATCH", path: "/documents/:documentId" },
  async ({
    documentId,
    userId,
    metadata,
    filename,
  }: {
    documentId: string;
    userId: string;
    metadata?: Record<string, any>;
    filename?: string;
  }): Promise<Document> => {
    try {
      // Validate request
      const validated = DocumentUpdateSchema.parse({
        documentId,
        userId,
        metadata,
        filename,
      });
      
      // Verify document access
      const existingDoc = await verifyDocumentAccess(documentId, userId);
      if (!existingDoc) {
        throw new Error("Document not found or access denied");
      }
      
      // Prepare update data
      const updateData: Partial<DBDocument> = {
        updatedAt: new Date(),
      };
      
      if (metadata) {
        // Merge with existing metadata
        updateData.metadata = {
          ...existingDoc.metadata,
          ...metadata,
        };
      }
      
      if (filename) {
        updateData.filename = filename;
      }
      
      // Update document in database
      const result = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, documentId))
        .returning();
      
      if (!result[0]) {
        throw new Error("Failed to update document");
      }
      
      console.log(`Updated document ${documentId} metadata`);
      return formatDocumentResponse(result[0]);
      
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Delete document
export const deleteDocument = api(
  { expose: true, method: "DELETE", path: "/documents/:documentID" },
  async ({ documentID }: { documentID: string }): Promise<{ success: boolean }> => {
    // TODO: Implement document deletion
    // - Delete document record
    // - Delete associated chunks and embeddings
    // - Delete physical file
    // TODO: Verify user access permissions

    return {
      success: true,
    };
  }
);

// Get document chunks
export const getDocumentChunks = api(
  { expose: true, method: "GET", path: "/documents/:documentID/chunks" },
  async ({
    documentID,
    page = 1,
    limit = 50,
  }: {
    documentID: string;
    page?: number;
    limit?: number;
  }): Promise<{
    chunks: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
    }>;
    total: number;
  }> => {
    // TODO: Implement chunk retrieval for document
    return {
      chunks: [],
      total: 0,
    };
  }
);
