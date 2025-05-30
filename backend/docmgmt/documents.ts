import { and, asc, count, desc, eq, ilike, like, sql } from "drizzle-orm";
import { api } from "encore.dev/api";
import log from "encore.dev/log";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/connection";
import {
  type Document as DBDocument,
  type DocumentChunk,
  documentChunks,
  documents,
} from "../db/schema";
import { CacheService } from "../lib/cache/cache.service";
import type { PlaceholderDocumentObject } from "../lib/cache/cache.service";
import type { DocumentMetadataCacheKey } from "../lib/infrastructure/cache/cache";

// Create a service-specific logger instance
const logger = log.with({ service: "docmgmt-service" });

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

async function verifyDocumentAccess(
  documentId: string,
  userId: string
): Promise<DBDocument | null> {
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
      logger.info("Received request to get user documents", {
        userId: request.userId,
        page: request.page,
        limit: request.limit,
        status: request.status,
        search: request.search,
      });

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
      const sortColumn =
        sortBy === "filename"
          ? documents.filename
          : sortBy === "fileSize"
            ? documents.fileSize
            : documents.uploadedAt;
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
      console.error("Error retrieving documents:", error);
      const errorMessage = "Failed to retrieve documents";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          userId: request.userId,
          page: request.page,
          limit: request.limit,
        });
      } else {
        logger.error(errorMessage, {
          userId: request.userId,
          page: request.page,
          limit: request.limit,
          error: error,
        });
      }
      throw new Error(
        `Failed to retrieve documents: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Get specific document
export const getDocument = api(
  { expose: true, method: "GET", path: "/documents/:documentId" },
  async ({ documentId, userId }: { documentId: string; userId: string }): Promise<Document> => {
    try {
      logger.info("Received request to get document", {
        documentId: documentId,
        userId: userId,
      });

      const cacheKey: DocumentMetadataCacheKey = { documentId };
      const cachedDoc = await CacheService.getCachedDocumentMetadata(cacheKey);

      if (cachedDoc) {
        logger.info("Successfully retrieved document from cache", {
          documentId: documentId,
          userId: userId,
        });
        // Format the cached data to match the expected Document response type
        // This assumes PlaceholderDocumentObject is compatible or can be mapped to DBDocument for formatDocumentResponse
        // If PlaceholderDocumentObject directly matches Document, you can return it (after ensuring Date types)
        return formatDocumentResponse(cachedDoc as unknown as DBDocument); // Casting needed if types don't align perfectly
      }

      const doc = await verifyDocumentAccess(documentId, userId);

      if (!doc) {
        throw new Error("Document not found or access denied");
      }

      logger.info("Successfully retrieved document from DB", {
        documentId: documentId,
        userId: userId,
      });

      // Cache the document metadata after fetching from DB
      // Ensure the object structure matches PlaceholderDocumentObject
      const docToCache: PlaceholderDocumentObject = {
        id: doc.id,
        userId: doc.userId, // Ensure userId is part of your DBDocument if caching it
        filename: doc.filename,
        originalName: doc.originalName,
        contentType: doc.contentType,
        fileSize: doc.fileSize,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        // processedAt: doc.processedAt, // Add if in PlaceholderDocumentObject
        // chunkCount: doc.chunkCount, // Add if in PlaceholderDocumentObject
        metadata: doc.metadata,
      };
      await CacheService.setCachedDocumentMetadata(cacheKey, docToCache);

      return formatDocumentResponse(doc);
    } catch (error) {
      console.error("Error retrieving document:", error);
      const errorMessage = "Failed to retrieve document";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          documentId: documentId,
          userId: userId,
        });
      } else {
        logger.error(errorMessage, {
          documentId: documentId,
          userId: userId,
          error: error,
        });
      }
      throw new Error(
        `Failed to retrieve document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
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
      logger.info("Received request to update document", {
        documentId: documentId,
        userId: userId,
        metadata: metadata,
        filename: filename,
      });

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
      logger.info("Successfully updated document", {
        documentId: documentId,
        userId: userId,
        updatedFields: Object.keys(updateData),
      });

      // Invalidate cache for this document
      const cacheKey: DocumentMetadataCacheKey = { documentId };
      await CacheService.deleteCachedDocumentMetadata(cacheKey);

      return formatDocumentResponse(result[0]);
    } catch (error) {
      console.error("Error updating document:", error);
      const errorMessage = "Failed to update document";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          documentId: documentId,
          userId: userId,
          updatePayload: { metadata, filename },
        });
      } else {
        logger.error(errorMessage, {
          documentId: documentId,
          userId: userId,
          updatePayload: { metadata, filename },
          error: error,
        });
      }
      throw new Error(
        `Failed to update document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Delete document
export const deleteDocument = api(
  { expose: true, method: "DELETE", path: "/documents/:documentId" },
  async ({
    documentId,
    userId,
  }: { documentId: string; userId: string }): Promise<{ success: boolean }> => {
    try {
      logger.info("Received request to delete document", {
        documentId: documentId,
        userId: userId,
      });

      // Verify document access
      const existingDoc = await verifyDocumentAccess(documentId, userId);
      if (!existingDoc) {
        throw new Error("Document not found or access denied");
      }

      // Start transaction - delete document and all related data
      // Note: Due to foreign key constraints, chunks will be deleted automatically
      const result = await db
        .delete(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
        .returning();

      if (!result[0]) {
        throw new Error("Failed to delete document");
      }

      console.log(`Deleted document ${documentId} and all associated data`);
      logger.info("Successfully deleted document", {
        documentId: documentId,
        userId: userId,
      });

      // Invalidate cache for this document
      const cacheKey: DocumentMetadataCacheKey = { documentId };
      await CacheService.deleteCachedDocumentMetadata(cacheKey);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error deleting document:", error);
      const errorMessage = "Failed to delete document";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          documentId: documentId,
          userId: userId,
        });
      } else {
        logger.error(errorMessage, {
          documentId: documentId,
          userId: userId,
          error: error,
        });
      }
      throw new Error(
        `Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Get document chunks
export const getDocumentChunks = api(
  { expose: true, method: "GET", path: "/documents/:documentId/chunks" },
  async ({
    documentId,
    userId,
    page = 1,
    limit = 50,
  }: {
    documentId: string;
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<DocumentChunkResponse> => {
    try {
      // Verify document access
      const doc = await verifyDocumentAccess(documentId, userId);
      if (!doc) {
        throw new Error("Document not found or access denied");
      }

      const offset = (page - 1) * limit;

      // Get total count of chunks
      const totalResult = await db
        .select({ count: count() })
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId));

      const total = totalResult[0].count;

      // Get paginated chunks
      const results = await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId))
        .orderBy(asc(documentChunks.chunkIndex))
        .limit(limit + 1)
        .offset(offset);

      // Check if there are more results
      const hasMore = results.length > limit;
      const chunksData = hasMore ? results.slice(0, -1) : results;

      return {
        chunks: chunksData.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber || undefined,
          tokenCount: chunk.tokenCount,
          metadata: chunk.metadata as Record<string, any>,
          createdAt: chunk.createdAt,
        })),
        total,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      console.error("Error retrieving document chunks:", error);
      throw new Error(
        `Failed to retrieve document chunks: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Get document statistics
export const getDocumentStats = api(
  { expose: true, method: "GET", path: "/documents/:documentId/stats" },
  async ({
    documentId,
    userId,
  }: {
    documentId: string;
    userId: string;
  }): Promise<DocumentStats> => {
    try {
      // Verify document access
      const doc = await verifyDocumentAccess(documentId, userId);
      if (!doc) {
        throw new Error("Document not found or access denied");
      }

      // Get chunk statistics
      const chunkStats = await db
        .select({
          totalChunks: count(),
          totalTokens: sql<number>`SUM(${documentChunks.tokenCount})`,
          averageChunkSize: sql<number>`AVG(LENGTH(${documentChunks.content}))`,
        })
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId));

      const stats = chunkStats[0];

      // Calculate processing duration if available
      const processingDuration =
        doc.processedAt && doc.uploadedAt
          ? doc.processedAt.getTime() - doc.uploadedAt.getTime()
          : undefined;

      return {
        totalChunks: Number(stats.totalChunks) || 0,
        totalTokens: Number(stats.totalTokens) || 0,
        averageChunkSize: Number(stats.averageChunkSize) || 0,
        processingDuration,
      };
    } catch (error) {
      console.error("Error retrieving document stats:", error);
      throw new Error(
        `Failed to retrieve document stats: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Update document processing status (internal API for processing pipeline)
export const updateProcessingStatus = api(
  { expose: false, method: "POST", path: "/documents/:documentId/status" },
  async ({
    documentId,
    status,
    chunkCount,
    errorMessage,
  }: {
    documentId: string;
    status: "uploaded" | "processing" | "processed" | "failed";
    chunkCount?: number;
    errorMessage?: string;
  }): Promise<Document> => {
    try {
      // Validate request
      const validated = ProcessingStatusUpdateSchema.parse({
        documentId,
        status,
        chunkCount,
        errorMessage,
      });

      // Prepare update data
      const updateData: Partial<DBDocument> = {
        status: validated.status,
        updatedAt: new Date(),
      };

      if (status === "processed") {
        updateData.processedAt = new Date();
      }

      if (chunkCount !== undefined) {
        updateData.chunkCount = chunkCount;
      }

      // Update document status
      const result = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, documentId))
        .returning();

      if (!result[0]) {
        throw new Error("Document not found");
      }

      console.log(`Updated document ${documentId} status to ${status}`);
      return formatDocumentResponse(result[0]);
    } catch (error) {
      console.error("Error updating document processing status:", error);
      throw new Error(
        `Failed to update processing status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
