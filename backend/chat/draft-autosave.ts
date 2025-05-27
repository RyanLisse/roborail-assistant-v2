import { api } from "encore.dev/api";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Request/Response schemas
export const SaveDraftRequest = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  content: z.string().max(8000), // 8KB limit for drafts
  clientId: z.string().min(1).optional(), // For multi-client sync
  version: z.number().int().min(1).optional(),
});

export const GetDraftRequest = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
});

export const DeleteDraftRequest = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
});

export const DraftResponse = z.object({
  id: z.string(),
  conversationId: z.string(),
  userId: z.string(),
  content: z.string(),
  version: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  clientId: z.string().optional(),
  metadata: z.object({
    characterCount: z.number(),
    wordCount: z.number(),
    lastSaveType: z.enum(["auto", "manual", "blur", "periodic"]),
    isExpired: z.boolean(),
  }),
});

export const ListDraftsRequest = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(50),
  includeExpired: z.boolean().default(false),
});

export const BulkDraftOperation = z.object({
  userId: z.string().min(1),
  operation: z.enum(["cleanup_expired", "sync_offline", "compress_large"]),
  options: z.record(z.any()).optional(),
});

// In-memory storage for drafts (in production, this would be Redis or database)
const draftsStore = new Map<string, any>();
const draftsByUser = new Map<string, Set<string>>();

// Configuration
const DRAFT_CONFIG = {
  MAX_DRAFTS_PER_USER: 50,
  MAX_CONTENT_LENGTH: 8000,
  AUTO_SAVE_DELAY: 1000, // 1 second
  EXPIRY_TIME: 7 * 24 * 60 * 60 * 1000, // 7 days
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
  COMPRESSION_THRESHOLD: 1000, // Compress drafts larger than 1KB
};

/**
 * Save or update a draft
 */
export const saveDraft = api(
  { method: "POST", path: "/chat/drafts", expose: true },
  async (request: z.infer<typeof SaveDraftRequest>): Promise<z.infer<typeof DraftResponse>> => {
    try {
      const draftKey = `${request.userId}:${request.conversationId}`;
      const existingDraft = draftsStore.get(draftKey);
      
      // Version conflict check
      if (existingDraft && request.version && request.version <= existingDraft.version) {
        throw new Error(`Version conflict: client version ${request.version} <= server version ${existingDraft.version}`);
      }
      
      const now = new Date();
      const draftId = existingDraft?.id || uuidv4();
      const newVersion = existingDraft ? existingDraft.version + 1 : 1;
      
      // Calculate metadata
      const metadata = {
        characterCount: request.content.length,
        wordCount: request.content.trim().split(/\s+/).filter(word => word.length > 0).length,
        lastSaveType: "auto" as const,
        isExpired: false,
      };
      
      // Create or update draft
      const draft = {
        id: draftId,
        conversationId: request.conversationId,
        userId: request.userId,
        content: request.content,
        version: newVersion,
        createdAt: existingDraft?.createdAt || now,
        updatedAt: now,
        clientId: request.clientId,
        metadata,
      };
      
      // Store draft
      draftsStore.set(draftKey, draft);
      
      // Update user's draft set
      if (!draftsByUser.has(request.userId)) {
        draftsByUser.set(request.userId, new Set());
      }
      draftsByUser.get(request.userId)!.add(draftKey);
      
      // Enforce per-user draft limit
      await enforceUserDraftLimit(request.userId);
      
      return draft;
      
    } catch (error) {
      throw new Error(`Failed to save draft: ${error}`);
    }
  }
);

/**
 * Get a draft for a conversation
 */
export const getDraft = api(
  { method: "GET", path: "/chat/drafts/:conversationId", expose: true },
  async ({ conversationId, userId }: z.infer<typeof GetDraftRequest>): Promise<z.infer<typeof DraftResponse> | null> => {
    try {
      const draftKey = `${userId}:${conversationId}`;
      const draft = draftsStore.get(draftKey);
      
      if (!draft) {
        return null;
      }
      
      // Check if draft is expired
      const isExpired = isDraftExpired(draft);
      if (isExpired) {
        draft.metadata.isExpired = true;
      }
      
      return draft;
      
    } catch (error) {
      throw new Error(`Failed to get draft: ${error}`);
    }
  }
);

/**
 * Delete a draft
 */
export const deleteDraft = api(
  { method: "DELETE", path: "/chat/drafts/:conversationId", expose: true },
  async ({ conversationId, userId }: z.infer<typeof DeleteDraftRequest>): Promise<{ success: boolean }> => {
    try {
      const draftKey = `${userId}:${conversationId}`;
      const existed = draftsStore.delete(draftKey);
      
      if (existed && draftsByUser.has(userId)) {
        draftsByUser.get(userId)!.delete(draftKey);
      }
      
      return { success: existed };
      
    } catch (error) {
      throw new Error(`Failed to delete draft: ${error}`);
    }
  }
);

/**
 * List all drafts for a user
 */
export const listDrafts = api(
  { method: "GET", path: "/chat/drafts", expose: true },
  async ({ userId, limit, includeExpired }: z.infer<typeof ListDraftsRequest>): Promise<{ drafts: z.infer<typeof DraftResponse>[] }> => {
    try {
      const userDraftKeys = draftsByUser.get(userId) || new Set();
      const drafts: any[] = [];
      
      for (const draftKey of userDraftKeys) {
        const draft = draftsStore.get(draftKey);
        if (!draft) continue;
        
        const isExpired = isDraftExpired(draft);
        draft.metadata.isExpired = isExpired;
        
        if (!includeExpired && isExpired) {
          continue;
        }
        
        drafts.push(draft);
      }
      
      // Sort by most recently updated
      drafts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      return {
        drafts: drafts.slice(0, limit),
      };
      
    } catch (error) {
      throw new Error(`Failed to list drafts: ${error}`);
    }
  }
);

/**
 * Bulk operations on drafts
 */
export const bulkDraftOperation = api(
  { method: "POST", path: "/chat/drafts/bulk", expose: true },
  async ({ userId, operation, options }: z.infer<typeof BulkDraftOperation>): Promise<{ 
    success: boolean; 
    processed: number; 
    details: Record<string, any> 
  }> => {
    try {
      let processed = 0;
      const details: Record<string, any> = {};
      
      const userDraftKeys = draftsByUser.get(userId) || new Set();
      
      switch (operation) {
        case "cleanup_expired":
          processed = await cleanupExpiredDrafts(userId, userDraftKeys);
          details.expiredDraftsRemoved = processed;
          break;
          
        case "sync_offline":
          // In a real implementation, this would sync with offline storage
          processed = userDraftKeys.size;
          details.draftsSynced = processed;
          break;
          
        case "compress_large":
          processed = await compressLargeDrafts(userId, userDraftKeys);
          details.draftsCompressed = processed;
          break;
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      return {
        success: true,
        processed,
        details,
      };
      
    } catch (error) {
      throw new Error(`Bulk operation failed: ${error}`);
    }
  }
);

/**
 * Auto-save draft with debouncing
 */
export const autoSaveDraft = api(
  { method: "POST", path: "/chat/drafts/autosave", expose: true },
  async (request: z.infer<typeof SaveDraftRequest>): Promise<{ 
    success: boolean; 
    draftId: string; 
    debounced: boolean 
  }> => {
    try {
      // In a real implementation, this would implement debouncing logic
      // For now, we'll just save the draft directly
      const draft = await saveDraft(request);
      
      return {
        success: true,
        draftId: draft.id,
        debounced: false, // Would be true if save was delayed due to debouncing
      };
      
    } catch (error) {
      throw new Error(`Auto-save failed: ${error}`);
    }
  }
);

/**
 * Restore draft content
 */
export const restoreDraft = api(
  { method: "POST", path: "/chat/drafts/:conversationId/restore", expose: true },
  async ({ conversationId, userId }: z.infer<typeof GetDraftRequest>): Promise<{
    content: string;
    version: number;
    metadata: Record<string, any>;
  }> => {
    try {
      const draft = await getDraft({ conversationId, userId });
      
      if (!draft) {
        throw new Error("No draft found for this conversation");
      }
      
      if (draft.metadata.isExpired) {
        throw new Error("Draft has expired and cannot be restored");
      }
      
      return {
        content: draft.content,
        version: draft.version,
        metadata: {
          age: Date.now() - draft.updatedAt.getTime(),
          characterCount: draft.metadata.characterCount,
          wordCount: draft.metadata.wordCount,
        },
      };
      
    } catch (error) {
      throw new Error(`Failed to restore draft: ${error}`);
    }
  }
);

// Helper functions

/**
 * Check if a draft is expired
 */
function isDraftExpired(draft: any): boolean {
  const age = Date.now() - draft.updatedAt.getTime();
  return age > DRAFT_CONFIG.EXPIRY_TIME;
}

/**
 * Enforce per-user draft limit
 */
async function enforceUserDraftLimit(userId: string): Promise<void> {
  const userDraftKeys = draftsByUser.get(userId);
  if (!userDraftKeys || userDraftKeys.size <= DRAFT_CONFIG.MAX_DRAFTS_PER_USER) {
    return;
  }
  
  // Get all drafts for user and sort by update time
  const drafts = Array.from(userDraftKeys)
    .map(key => ({ key, draft: draftsStore.get(key) }))
    .filter(item => item.draft)
    .sort((a, b) => a.draft.updatedAt.getTime() - b.draft.updatedAt.getTime());
  
  // Remove oldest drafts
  const toRemove = drafts.length - DRAFT_CONFIG.MAX_DRAFTS_PER_USER;
  for (let i = 0; i < toRemove; i++) {
    const { key } = drafts[i];
    draftsStore.delete(key);
    userDraftKeys.delete(key);
  }
}

/**
 * Cleanup expired drafts for a user
 */
async function cleanupExpiredDrafts(userId: string, userDraftKeys: Set<string>): Promise<number> {
  let cleaned = 0;
  
  for (const draftKey of userDraftKeys) {
    const draft = draftsStore.get(draftKey);
    if (draft && isDraftExpired(draft)) {
      draftsStore.delete(draftKey);
      userDraftKeys.delete(draftKey);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Compress large drafts
 */
async function compressLargeDrafts(userId: string, userDraftKeys: Set<string>): Promise<number> {
  let compressed = 0;
  
  for (const draftKey of userDraftKeys) {
    const draft = draftsStore.get(draftKey);
    if (draft && draft.content.length > DRAFT_CONFIG.COMPRESSION_THRESHOLD) {
      // In a real implementation, this would apply compression
      draft.metadata.compressed = true;
      draft.metadata.originalSize = draft.content.length;
      compressed++;
    }
  }
  
  return compressed;
}

/**
 * Periodic cleanup task (would be run as a background job)
 */
export async function performPeriodicCleanup(): Promise<{
  expiredDraftsRemoved: number;
  usersProcessed: number;
}> {
  let totalExpiredRemoved = 0;
  let usersProcessed = 0;
  
  for (const [userId, userDraftKeys] of draftsByUser.entries()) {
    const removed = await cleanupExpiredDrafts(userId, userDraftKeys);
    totalExpiredRemoved += removed;
    usersProcessed++;
  }
  
  return {
    expiredDraftsRemoved: totalExpiredRemoved,
    usersProcessed,
  };
}

// Health check endpoint
export const health = api(
  { method: "GET", path: "/chat/drafts/health", expose: true },
  async (): Promise<{ 
    status: string; 
    timestamp: string; 
    stats: Record<string, number> 
  }> => {
    try {
      const stats = {
        totalDrafts: draftsStore.size,
        totalUsers: draftsByUser.size,
        averageDraftsPerUser: draftsByUser.size > 0 ? draftsStore.size / draftsByUser.size : 0,
        memoryUsageKB: Math.round(JSON.stringify([...draftsStore.values()]).length / 1024),
      };
      
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        stats,
      };
    } catch (error) {
      throw new Error(`Draft service unhealthy: ${error}`);
    }
  }
);