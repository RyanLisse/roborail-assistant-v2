import { api } from "encore.dev/api";
import { z } from "zod";
import { db } from "../db/connection";
import { 
  documentCollections, 
  collectionDocuments, 
  documentTags, 
  savedFilters,
  documents,
  type DocumentCollection,
  type NewDocumentCollection,
  type CollectionDocument,
  type DocumentTag,
  type NewSavedFilter
} from "../db/schema";
import { eq, and, desc, asc, like, ilike, count, sql, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";

// Validation schemas
export const CollectionCreateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default("#3B82F6"),
  tags: z.array(z.string().min(1).max(50)).default([]),
  metadata: z.record(z.any()).default({}),
});

export const CollectionUpdateSchema = z.object({
  collectionId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  metadata: z.record(z.any()).optional(),
});

export const CollectionFilterSchema = z.object({
  userId: z.string().min(1),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "documentCount"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const SavedFilterCreateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  filters: z.record(z.any()),
  isPublic: z.boolean().default(false),
});

// Types
export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  color: string;
  documentCount: number;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionListResponse {
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TagStats {
  tag: string;
  count: number;
  lastUsed: Date;
}

export interface OrganizationRecommendation {
  type: "create_collection" | "merge_collections" | "add_tags" | "reorganize";
  reason: string;
  suggestedName?: string;
  documentIds?: string[];
  collectionIds?: string[];
  suggestedTags?: string[];
  confidence: number;
}

export interface SavedFilterResponse {
  id: string;
  userId: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  isPublic: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagStatsListResponse {
  tags: TagStats[];
  total: number;
}

export interface SavedFiltersListResponse {
  filters: SavedFilterResponse[];
  total: number;
}

export interface OrganizationRecommendationsResponse {
  recommendations: OrganizationRecommendation[];
  total: number;
}

// Helper functions
function formatCollectionResponse(collection: DocumentCollection): Collection {
  return {
    id: collection.id,
    userId: collection.userId,
    name: collection.name,
    description: collection.description || undefined,
    isPublic: collection.isPublic,
    color: collection.color || "#3B82F6",
    documentCount: collection.documentCount,
    tags: collection.tags as string[],
    metadata: collection.metadata as Record<string, any>,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

async function verifyCollectionAccess(collectionId: string, userId: string): Promise<DocumentCollection | null> {
  const result = await db
    .select()
    .from(documentCollections)
    .where(
      and(
        eq(documentCollections.id, collectionId),
        or(
          eq(documentCollections.userId, userId),
          eq(documentCollections.isPublic, true)
        )
      )
    )
    .limit(1);
  
  return result[0] || null;
}

// Collection Management APIs
export const createCollection = api(
  { expose: true, method: "POST", path: "/collections" },
  async (request: {
    userId: string;
    name: string;
    description?: string;
    isPublic?: boolean;
    color?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<Collection> => {
    try {
      const validated = CollectionCreateSchema.parse(request);
      
      const collectionId = `collection_${nanoid()}`;
      const collectionData: NewDocumentCollection = {
        id: collectionId,
        userId: validated.userId,
        name: validated.name,
        description: validated.description,
        isPublic: validated.isPublic,
        color: validated.color,
        documentCount: 0,
        tags: validated.tags,
        metadata: validated.metadata,
      };
      
      const result = await db
        .insert(documentCollections)
        .values(collectionData)
        .returning();
      
      console.log(`Created collection ${collectionId} for user ${validated.userId}`);
      return formatCollectionResponse(result[0]);
      
    } catch (error) {
      console.error('Error creating collection:', error);
      throw new Error(`Failed to create collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const getCollections = api(
  { expose: true, method: "GET", path: "/collections" },
  async (request: {
    userId: string;
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    isPublic?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<CollectionListResponse> => {
    try {
      const validated = CollectionFilterSchema.parse(request);
      const { userId, page, limit, search, tags, isPublic, sortBy, sortOrder } = validated;
      
      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions = [
        or(
          eq(documentCollections.userId, userId),
          eq(documentCollections.isPublic, true)
        )
      ];
      
      if (isPublic !== undefined) {
        conditions.push(eq(documentCollections.isPublic, isPublic));
      }
      
      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        conditions.push(
          sql`(
            LOWER(${documentCollections.name}) LIKE ${searchTerm} OR 
            LOWER(${documentCollections.description}) LIKE ${searchTerm}
          )`
        );
      }
      
      if (tags && tags.length > 0) {
        conditions.push(
          sql`${documentCollections.tags} ?| array[${tags.map(tag => `'${tag}'`).join(',')}]`
        );
      }
      
      // Determine sort order
      const sortColumn = sortBy === "name" ? documentCollections.name :
                        sortBy === "createdAt" ? documentCollections.createdAt :
                        sortBy === "documentCount" ? documentCollections.documentCount :
                        documentCollections.updatedAt;
      const orderFn = sortOrder === "asc" ? asc : desc;
      
      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(documentCollections)
        .where(and(...conditions));
      
      const total = totalResult[0].count;
      
      // Get paginated results
      const results = await db
        .select()
        .from(documentCollections)
        .where(and(...conditions))
        .orderBy(orderFn(sortColumn))
        .limit(limit + 1)
        .offset(offset);
      
      const hasMore = results.length > limit;
      const collectionsData = hasMore ? results.slice(0, -1) : results;
      
      return {
        collections: collectionsData.map(formatCollectionResponse),
        total,
        page,
        limit,
        hasMore,
      };
      
    } catch (error) {
      console.error('Error retrieving collections:', error);
      throw new Error(`Failed to retrieve collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const getCollection = api(
  { expose: true, method: "GET", path: "/collections/:collectionId" },
  async ({ collectionId, userId }: { collectionId: string; userId: string }): Promise<Collection> => {
    try {
      const collection = await verifyCollectionAccess(collectionId, userId);
      
      if (!collection) {
        throw new Error("Collection not found or access denied");
      }
      
      return formatCollectionResponse(collection);
      
    } catch (error) {
      console.error('Error retrieving collection:', error);
      throw new Error(`Failed to retrieve collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const updateCollection = api(
  { expose: true, method: "PATCH", path: "/collections/:collectionId" },
  async ({
    collectionId,
    userId,
    name,
    description,
    isPublic,
    color,
    tags,
    metadata,
  }: {
    collectionId: string;
    userId: string;
    name?: string;
    description?: string;
    isPublic?: boolean;
    color?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<Collection> => {
    try {
      const validated = CollectionUpdateSchema.parse({
        collectionId,
        userId,
        name,
        description,
        isPublic,
        color,
        tags,
        metadata,
      });
      
      // Verify ownership (only owner can update)
      const existingCollection = await db
        .select()
        .from(documentCollections)
        .where(and(eq(documentCollections.id, collectionId), eq(documentCollections.userId, userId)))
        .limit(1);
      
      if (!existingCollection[0]) {
        throw new Error("Collection not found or access denied");
      }
      
      // Prepare update data
      const updateData: Partial<DocumentCollection> = {
        updatedAt: new Date(),
      };
      
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (color) updateData.color = color;
      if (tags) updateData.tags = tags;
      if (metadata) {
        updateData.metadata = {
          ...existingCollection[0].metadata,
          ...metadata,
        };
      }
      
      const result = await db
        .update(documentCollections)
        .set(updateData)
        .where(eq(documentCollections.id, collectionId))
        .returning();
      
      console.log(`Updated collection ${collectionId}`);
      return formatCollectionResponse(result[0]);
      
    } catch (error) {
      console.error('Error updating collection:', error);
      throw new Error(`Failed to update collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const deleteCollection = api(
  { expose: true, method: "DELETE", path: "/collections/:collectionId" },
  async ({ collectionId, userId }: { collectionId: string; userId: string }): Promise<{ success: boolean }> => {
    try {
      // Verify ownership
      const result = await db
        .delete(documentCollections)
        .where(and(eq(documentCollections.id, collectionId), eq(documentCollections.userId, userId)))
        .returning();
      
      if (!result[0]) {
        throw new Error("Collection not found or access denied");
      }
      
      console.log(`Deleted collection ${collectionId}`);
      return { success: true };
      
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw new Error(`Failed to delete collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Collection Document Management
export const addDocumentToCollection = api(
  { expose: true, method: "POST", path: "/collections/:collectionId/documents/:documentId" },
  async ({ 
    collectionId, 
    documentId, 
    userId 
  }: { 
    collectionId: string; 
    documentId: string; 
    userId: string; 
  }): Promise<{ success: boolean }> => {
    try {
      // Verify collection access
      const collection = await verifyCollectionAccess(collectionId, userId);
      if (!collection) {
        throw new Error("Collection not found or access denied");
      }
      
      // Verify document ownership
      const documentResult = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
        .limit(1);
      
      if (!documentResult[0]) {
        throw new Error("Document not found or access denied");
      }
      
      const relationId = `cd_${nanoid()}`;
      
      // Add document to collection (will fail if already exists due to unique constraint)
      await db
        .insert(collectionDocuments)
        .values({
          id: relationId,
          collectionId,
          documentId,
          addedBy: userId,
        });
      
      // Update document count
      await db
        .update(documentCollections)
        .set({
          documentCount: sql`${documentCollections.documentCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(documentCollections.id, collectionId));
      
      console.log(`Added document ${documentId} to collection ${collectionId}`);
      return { success: true };
      
    } catch (error) {
      console.error('Error adding document to collection:', error);
      throw new Error(`Failed to add document to collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const removeDocumentFromCollection = api(
  { expose: true, method: "DELETE", path: "/collections/:collectionId/documents/:documentId" },
  async ({ 
    collectionId, 
    documentId, 
    userId 
  }: { 
    collectionId: string; 
    documentId: string; 
    userId: string; 
  }): Promise<{ success: boolean }> => {
    try {
      // Verify collection ownership
      const collection = await db
        .select()
        .from(documentCollections)
        .where(and(eq(documentCollections.id, collectionId), eq(documentCollections.userId, userId)))
        .limit(1);
      
      if (!collection[0]) {
        throw new Error("Collection not found or access denied");
      }
      
      // Remove document from collection
      const result = await db
        .delete(collectionDocuments)
        .where(and(
          eq(collectionDocuments.collectionId, collectionId),
          eq(collectionDocuments.documentId, documentId)
        ))
        .returning();
      
      if (result[0]) {
        // Update document count
        await db
          .update(documentCollections)
          .set({
            documentCount: sql`GREATEST(0, ${documentCollections.documentCount} - 1)`,
            updatedAt: new Date(),
          })
          .where(eq(documentCollections.id, collectionId));
        
        console.log(`Removed document ${documentId} from collection ${collectionId}`);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Error removing document from collection:', error);
      throw new Error(`Failed to remove document from collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const getCollectionDocuments = api(
  { expose: true, method: "GET", path: "/collections/:collectionId/documents" },
  async ({
    collectionId,
    userId,
    page = 1,
    limit = 20,
  }: {
    collectionId: string;
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<{
    documents: Array<{
      id: string;
      filename: string;
      originalName: string;
      contentType: string;
      fileSize: number;
      status: string;
      uploadedAt: Date;
      addedAt: Date;
      metadata: Record<string, any>;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> => {
    try {
      // Verify collection access
      const collection = await verifyCollectionAccess(collectionId, userId);
      if (!collection) {
        throw new Error("Collection not found or access denied");
      }
      
      const offset = (page - 1) * limit;
      
      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(collectionDocuments)
        .where(eq(collectionDocuments.collectionId, collectionId));
      
      const total = totalResult[0].count;
      
      // Get documents with collection relationship info
      const results = await db
        .select({
          id: documents.id,
          filename: documents.filename,
          originalName: documents.originalName,
          contentType: documents.contentType,
          fileSize: documents.fileSize,
          status: documents.status,
          uploadedAt: documents.uploadedAt,
          metadata: documents.metadata,
          addedAt: collectionDocuments.addedAt,
        })
        .from(collectionDocuments)
        .innerJoin(documents, eq(collectionDocuments.documentId, documents.id))
        .where(eq(collectionDocuments.collectionId, collectionId))
        .orderBy(desc(collectionDocuments.addedAt))
        .limit(limit + 1)
        .offset(offset);
      
      const hasMore = results.length > limit;
      const documentsData = hasMore ? results.slice(0, -1) : results;
      
      return {
        documents: documentsData.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          originalName: doc.originalName,
          contentType: doc.contentType,
          fileSize: doc.fileSize,
          status: doc.status,
          uploadedAt: doc.uploadedAt,
          addedAt: doc.addedAt,
          metadata: doc.metadata as Record<string, any>,
        })),
        total,
        page,
        limit,
        hasMore,
      };
      
    } catch (error) {
      console.error('Error retrieving collection documents:', error);
      throw new Error(`Failed to retrieve collection documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Tag Management APIs
export const getPopularTags = api(
  { expose: true, method: "GET", path: "/tags/popular" },
  async ({
    userId,
    limit = 20,
  }: {
    userId: string;
    limit?: number;
  }): Promise<TagStatsListResponse> => {
    try {
      const results = await db
        .select({
          tag: documentTags.tag,
          count: count(),
          lastUsed: sql<Date>`MAX(${documentTags.createdAt})`,
        })
        .from(documentTags)
        .where(eq(documentTags.userId, userId))
        .groupBy(documentTags.tag)
        .orderBy(desc(count()), desc(sql`MAX(${documentTags.createdAt})`))
        .limit(limit);
      
      const tags = results.map(result => ({
        tag: result.tag,
        count: Number(result.count),
        lastUsed: result.lastUsed,
      }));
      
      return {
        tags,
        total: tags.length,
      };
      
    } catch (error) {
      console.error('Error retrieving popular tags:', error);
      throw new Error(`Failed to retrieve popular tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const addTagToDocument = api(
  { expose: true, method: "POST", path: "/documents/:documentId/tags" },
  async ({
    documentId,
    userId,
    tag,
  }: {
    documentId: string;
    userId: string;
    tag: string;
  }): Promise<{ success: boolean }> => {
    try {
      // Verify document ownership
      const documentResult = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
        .limit(1);
      
      if (!documentResult[0]) {
        throw new Error("Document not found or access denied");
      }
      
      const tagId = `tag_${nanoid()}`;
      
      // Add tag (will fail if already exists due to unique constraint)
      await db
        .insert(documentTags)
        .values({
          id: tagId,
          documentId,
          tag: tag.toLowerCase().trim(),
          userId,
        });
      
      console.log(`Added tag '${tag}' to document ${documentId}`);
      return { success: true };
      
    } catch (error) {
      console.error('Error adding tag to document:', error);
      // Don't fail if tag already exists
      if (error instanceof Error && error.message.includes('unique')) {
        return { success: true };
      }
      throw new Error(`Failed to add tag to document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const removeTagFromDocument = api(
  { expose: true, method: "DELETE", path: "/documents/:documentId/tags/:tag" },
  async ({
    documentId,
    userId,
    tag,
  }: {
    documentId: string;
    userId: string;
    tag: string;
  }): Promise<{ success: boolean }> => {
    try {
      await db
        .delete(documentTags)
        .where(and(
          eq(documentTags.documentId, documentId),
          eq(documentTags.tag, tag.toLowerCase().trim()),
          eq(documentTags.userId, userId)
        ));
      
      console.log(`Removed tag '${tag}' from document ${documentId}`);
      return { success: true };
      
    } catch (error) {
      console.error('Error removing tag from document:', error);
      throw new Error(`Failed to remove tag from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const getDocumentsByTag = api(
  { expose: true, method: "GET", path: "/tags/:tag/documents" },
  async ({
    tag,
    userId,
    page = 1,
    limit = 20,
  }: {
    tag: string;
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<{
    documents: Array<{
      id: string;
      filename: string;
      originalName: string;
      contentType: string;
      fileSize: number;
      status: string;
      uploadedAt: Date;
      taggedAt: Date;
      metadata: Record<string, any>;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> => {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(documentTags)
        .where(and(eq(documentTags.tag, tag.toLowerCase().trim()), eq(documentTags.userId, userId)));
      
      const total = totalResult[0].count;
      
      // Get documents with tag relationship info
      const results = await db
        .select({
          id: documents.id,
          filename: documents.filename,
          originalName: documents.originalName,
          contentType: documents.contentType,
          fileSize: documents.fileSize,
          status: documents.status,
          uploadedAt: documents.uploadedAt,
          metadata: documents.metadata,
          taggedAt: documentTags.createdAt,
        })
        .from(documentTags)
        .innerJoin(documents, eq(documentTags.documentId, documents.id))
        .where(and(eq(documentTags.tag, tag.toLowerCase().trim()), eq(documentTags.userId, userId)))
        .orderBy(desc(documentTags.createdAt))
        .limit(limit + 1)
        .offset(offset);
      
      const hasMore = results.length > limit;
      const documentsData = hasMore ? results.slice(0, -1) : results;
      
      return {
        documents: documentsData.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          originalName: doc.originalName,
          contentType: doc.contentType,
          fileSize: doc.fileSize,
          status: doc.status,
          uploadedAt: doc.uploadedAt,
          taggedAt: doc.taggedAt,
          metadata: doc.metadata as Record<string, any>,
        })),
        total,
        page,
        limit,
        hasMore,
      };
      
    } catch (error) {
      console.error('Error retrieving documents by tag:', error);
      throw new Error(`Failed to retrieve documents by tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Saved Filters APIs
export const createSavedFilter = api(
  { expose: true, method: "POST", path: "/filters" },
  async (request: {
    userId: string;
    name: string;
    description?: string;
    filters: Record<string, any>;
    isPublic?: boolean;
  }): Promise<SavedFilterResponse> => {
    try {
      const validated = SavedFilterCreateSchema.parse(request);
      
      const filterId = `filter_${nanoid()}`;
      const filterData: NewSavedFilter = {
        id: filterId,
        userId: validated.userId,
        name: validated.name,
        description: validated.description,
        filters: validated.filters,
        isPublic: validated.isPublic,
        useCount: 0,
      };
      
      const result = await db
        .insert(savedFilters)
        .values(filterData)
        .returning();
      
      console.log(`Created saved filter ${filterId} for user ${validated.userId}`);
      return {
        id: result[0].id,
        userId: result[0].userId,
        name: result[0].name,
        description: result[0].description || undefined,
        filters: result[0].filters as Record<string, any>,
        isPublic: result[0].isPublic,
        useCount: result[0].useCount,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
      };
      
    } catch (error) {
      console.error('Error creating saved filter:', error);
      throw new Error(`Failed to create saved filter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const getSavedFilters = api(
  { expose: true, method: "GET", path: "/filters" },
  async ({ userId }: { userId: string }): Promise<SavedFiltersListResponse> => {
    try {
      const results = await db
        .select()
        .from(savedFilters)
        .where(
          or(
            eq(savedFilters.userId, userId),
            eq(savedFilters.isPublic, true)
          )
        )
        .orderBy(desc(savedFilters.updatedAt));
      
      const filters = results.map(result => ({
        id: result.id,
        userId: result.userId,
        name: result.name,
        description: result.description || undefined,
        filters: result.filters as Record<string, any>,
        isPublic: result.isPublic,
        useCount: result.useCount,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }));
      
      return {
        filters,
        total: filters.length,
      };
      
    } catch (error) {
      console.error('Error retrieving saved filters:', error);
      throw new Error(`Failed to retrieve saved filters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const applySavedFilter = api(
  { expose: true, method: "POST", path: "/filters/:filterId/apply" },
  async ({
    filterId,
    userId,
    additionalFilters = {},
  }: {
    filterId: string;
    userId: string;
    additionalFilters?: Record<string, any>;
  }): Promise<{
    appliedFilters: Record<string, any>;
    message: string;
  }> => {
    try {
      // Get saved filter
      const filterResult = await db
        .select()
        .from(savedFilters)
        .where(
          and(
            eq(savedFilters.id, filterId),
            or(
              eq(savedFilters.userId, userId),
              eq(savedFilters.isPublic, true)
            )
          )
        )
        .limit(1);
      
      if (!filterResult[0]) {
        throw new Error("Saved filter not found or access denied");
      }
      
      const filter = filterResult[0];
      
      // Increment use count
      await db
        .update(savedFilters)
        .set({
          useCount: sql`${savedFilters.useCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(savedFilters.id, filterId));
      
      // Combine filters
      const appliedFilters = {
        ...filter.filters,
        ...additionalFilters,
      };
      
      console.log(`Applied saved filter ${filterId} for user ${userId}`);
      
      return {
        appliedFilters,
        message: `Applied filter '${filter.name}' with ${Object.keys(appliedFilters).length} criteria`,
      };
      
    } catch (error) {
      console.error('Error applying saved filter:', error);
      throw new Error(`Failed to apply saved filter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Organization Recommendations API
export const getOrganizationRecommendations = api(
  { expose: true, method: "GET", path: "/organization/recommendations" },
  async ({ userId }: { userId: string }): Promise<OrganizationRecommendationsResponse> => {
    try {
      const recommendations: OrganizationRecommendation[] = [];
      
      // Get user's documents for analysis
      const userDocuments = await db
        .select({
          id: documents.id,
          filename: documents.filename,
          metadata: documents.metadata,
          contentType: documents.contentType,
        })
        .from(documents)
        .where(eq(documents.userId, userId))
        .limit(100); // Analyze up to 100 recent documents
      
      // Group documents by patterns
      const projectGroups: Record<string, typeof userDocuments> = {};
      const typeGroups: Record<string, typeof userDocuments> = {};
      
      userDocuments.forEach(doc => {
        const metadata = doc.metadata as Record<string, any>;
        
        // Group by project
        if (metadata.project) {
          if (!projectGroups[metadata.project]) {
            projectGroups[metadata.project] = [];
          }
          projectGroups[metadata.project].push(doc);
        }
        
        // Group by content type
        if (!typeGroups[doc.contentType]) {
          typeGroups[doc.contentType] = [];
        }
        typeGroups[doc.contentType].push(doc);
      });
      
      // Recommend collections for projects with multiple documents
      Object.entries(projectGroups).forEach(([project, docs]) => {
        if (docs.length >= 3) {
          recommendations.push({
            type: "create_collection",
            reason: `Found ${docs.length} documents for project "${project}"`,
            suggestedName: project,
            documentIds: docs.map(d => d.id),
            confidence: Math.min(0.9, 0.5 + (docs.length * 0.1)),
          });
        }
      });
      
      // Recommend collections for content types with many documents
      Object.entries(typeGroups).forEach(([contentType, docs]) => {
        if (docs.length >= 10) {
          const typeName = contentType === "application/pdf" ? "PDF Documents" :
                          contentType === "text/plain" ? "Text Files" :
                          contentType.includes("word") ? "Word Documents" :
                          "Documents";
          
          recommendations.push({
            type: "create_collection",
            reason: `Found ${docs.length} ${typeName.toLowerCase()}`,
            suggestedName: typeName,
            documentIds: docs.map(d => d.id),
            confidence: Math.min(0.8, 0.3 + (docs.length * 0.05)),
          });
        }
      });
      
      // Sort by confidence and limit results
      const sortedRecommendations = recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
      
      return {
        recommendations: sortedRecommendations,
        total: sortedRecommendations.length,
      };
      
    } catch (error) {
      console.error('Error generating organization recommendations:', error);
      throw new Error(`Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);