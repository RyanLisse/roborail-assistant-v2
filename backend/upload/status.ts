import { api } from "encore.dev/api";
import { db } from "../db/connection";
import { 
  documentProcessingStatus, 
  type DocumentProcessingStatus,
  type NewDocumentProcessingStatus
} from "../db/schema";
import { eq, and, desc, lt, gte, lte, inArray } from "drizzle-orm";

// Type aliases for cleaner usage
export type ProcessingStageType = "upload" | "parsing" | "chunking" | "embedding" | "indexing";
export type ProcessingStatusType = "pending" | "in_progress" | "completed" | "failed" | "cancelled";

// Extended interface for API responses
export interface ProcessingStatus {
  documentId: string;
  userId: string;
  currentStage: ProcessingStageType;
  overallStatus: ProcessingStatusType;
  stages: Record<string, StageStatus>;
  metadata: ProcessingMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: ProcessingError;
  progressPercentage: number;
  retryCount: number;
  maxRetries: number;
}

export interface StageStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount?: number;
  estimatedDuration?: number;
  actualDuration?: number;
}

export interface ProcessingMetadata {
  totalSize?: number;
  estimatedDuration?: number;
  chunkCount?: number;
  embeddingDimensions?: number;
  indexingMethod?: string;
}

export interface ProcessingError {
  code: string;
  message: string;
  stage: ProcessingStageType;
  timestamp: Date;
  retryable: boolean;
  details?: Record<string, any>;
  stackTrace?: string;
}

export interface StatusUpdateRequest {
  documentId: string;
  stage: ProcessingStageType;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  details?: string;
  error?: Partial<ProcessingError>;
}

export interface StatusQueryRequest {
  documentId?: string;
  userId?: string;
  status?: ProcessingStatusType;
  stage?: ProcessingStageType;
  limit?: number;
  offset?: number;
}

export interface ProcessingStatusResponse {
  statuses: ProcessingStatus[];
  total: number;
  hasMore: boolean;
}

export interface RetryRequest {
  documentId: string;
  fromStage?: ProcessingStageType;
  maxRetries?: number;
}

export interface RetryResponse {
  documentId: string;
  retryAttempt: number;
  newStatus: ProcessingStatus;
  success: boolean;
}

export interface ProcessingMetrics {
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  averageProcessingTime: number;
  stagePerformance: StagePerformance[];
}

export interface StagePerformance {
  stage: ProcessingStageType;
  averageTime: number;
  successRate: number;
  queueSize: number;
}

// Stage progression order
const STAGE_ORDER: ProcessingStageType[] = ['upload', 'parsing', 'chunking', 'embedding', 'indexing'];

// Processing duration estimates (in milliseconds)
const BASE_PROCESSING_TIMES: Record<ProcessingStageType, number> = {
  upload: 2000,      // 2 seconds
  parsing: 5000,     // 5 seconds base
  chunking: 3000,    // 3 seconds
  embedding: 8000,   // 8 seconds base
  indexing: 1500,    // 1.5 seconds
};

// Create initial processing status for a new document
export const createProcessingStatus = api(
  { expose: true, method: "POST", path: "/upload/processing-status" },
  async (request: {
    documentId: string;
    userId: string;
    metadata: ProcessingMetadata;
  }): Promise<ProcessingStatus> => {
    try {
      const now = new Date();
      
      // Calculate estimated durations based on file size
      const fileSize = request.metadata.totalSize || 1024 * 1024; // Default 1MB
      const sizeMultiplier = Math.max(1, fileSize / (1024 * 1024)); // Scale by MB
      const estimatedDurations = {
        upload: BASE_PROCESSING_TIMES.upload,
        parsing: BASE_PROCESSING_TIMES.parsing * sizeMultiplier,
        chunking: BASE_PROCESSING_TIMES.chunking,
        embedding: BASE_PROCESSING_TIMES.embedding * sizeMultiplier,
        indexing: BASE_PROCESSING_TIMES.indexing,
      };

      const statusId = `status_${request.documentId}_${Date.now()}`;
      
      // Create processing status record
      const statusData: NewDocumentProcessingStatus = {
        id: statusId,
        documentId: request.documentId,
        userId: request.userId,
        currentStage: 'upload',
        overallStatus: 'pending',
        stages: {
          upload: { 
            status: 'pending',
            estimatedDuration: estimatedDurations.upload,
          },
          parsing: { 
            status: 'pending',
            estimatedDuration: estimatedDurations.parsing,
          },
          chunking: { 
            status: 'pending',
            estimatedDuration: estimatedDurations.chunking,
          },
          embedding: { 
            status: 'pending',
            estimatedDuration: estimatedDurations.embedding,
          },
          indexing: { 
            status: 'pending',
            estimatedDuration: estimatedDurations.indexing,
          },
        },
        metadata: request.metadata,
        retryCount: 0,
        maxRetries: 3,
        progressPercentage: 0,
      };

      // Insert into database
      await db.insert(documentProcessingStatus).values(statusData);

      console.log(`Created processing status for document ${request.documentId}`);

      // Return formatted response
      return {
        documentId: request.documentId,
        userId: request.userId,
        currentStage: 'upload',
        overallStatus: 'pending',
        stages: statusData.stages,
        metadata: statusData.metadata,
        createdAt: now,
        updatedAt: now,
        progressPercentage: 0,
        retryCount: 0,
        maxRetries: 3,
      };

    } catch (error) {
      console.error('Error creating processing status:', error);
      throw new Error(`Failed to create processing status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Update processing status for a specific stage
export const updateProcessingStatus = api(
  { expose: true, method: "PUT", path: "/upload/processing-status/:documentId" },
  async (request: StatusUpdateRequest): Promise<ProcessingStatus> => {
    try {
      const now = new Date();

      // Get current status
      const currentStatus = await getProcessingStatusFromDB(request.documentId);
      if (!currentStatus) {
        throw new Error(`Processing status not found for document ${request.documentId}`);
      }

      // Parse current stages
      const stages = currentStatus.stages as Record<string, StageStatus>;
      const metadata = currentStatus.metadata as ProcessingMetadata;

      // Update the specific stage
      const updatedStage: StageStatus = {
        ...stages[request.stage],
        status: request.status,
        progress: request.progress,
        details: request.details,
        updatedAt: now,
      };

      // Set timestamps based on status
      if (request.status === 'in_progress' && !updatedStage.startedAt) {
        updatedStage.startedAt = now.toISOString();
      }
      if (request.status === 'completed') {
        updatedStage.completedAt = now.toISOString();
        if (updatedStage.startedAt) {
          updatedStage.actualDuration = new Date(now).getTime() - new Date(updatedStage.startedAt).getTime();
        }
      }

      // Handle errors
      if (request.status === 'failed' && request.error) {
        updatedStage.errorMessage = request.error.message || 'Processing failed';
        updatedStage.retryCount = (updatedStage.retryCount || 0) + 1;
      }

      stages[request.stage] = updatedStage;

      // Determine new current stage and overall status
      let newCurrentStage = request.stage;
      let newOverallStatus = currentStatus.overallStatus;
      let completedAt = currentStatus.completedAt;

      if (request.status === 'completed') {
        // Move to next stage if current stage is completed
        const currentStageIndex = STAGE_ORDER.indexOf(request.stage);
        const nextStageIndex = currentStageIndex + 1;
        
        if (nextStageIndex < STAGE_ORDER.length) {
          newCurrentStage = STAGE_ORDER[nextStageIndex];
          newOverallStatus = 'processing';
        } else {
          // All stages completed
          newOverallStatus = 'completed';
          completedAt = now;
        }
      } else if (request.status === 'failed') {
        newOverallStatus = 'failed';
      } else if (request.status === 'in_progress') {
        newOverallStatus = 'in_progress';
      }

      // Update database
      const updateData = {
        currentStage: newCurrentStage,
        overallStatus: newOverallStatus,
        stages: stages,
        updatedAt: now,
        completedAt,
        errorMessage: request.status === 'failed' && updatedStage.errorMessage ? updatedStage.errorMessage : currentStatus.errorMessage,
        retryCount: updatedStage.retryCount || currentStatus.retryCount,
      };

      await db
        .update(documentProcessingStatus)
        .set(updateData)
        .where(eq(documentProcessingStatus.documentId, request.documentId));

      console.log(`Updated processing status for document ${request.documentId}, stage ${request.stage} to ${request.status}`);

      // Return updated status
      return {
        documentId: request.documentId,
        userId: currentStatus.userId,
        currentStage: newCurrentStage,
        overallStatus: newOverallStatus,
        stages,
        metadata,
        createdAt: currentStatus.createdAt,
        updatedAt: now,
        completedAt,
        progressPercentage: request.status === 'completed' ? 100 : (request.progress || currentStatus.progressPercentage),
        retryCount: updatedStage.retryCount || currentStatus.retryCount,
        maxRetries: currentStatus.maxRetries,
      };

    } catch (error) {
      console.error('Error updating processing status:', error);
      throw new Error(`Failed to update processing status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Get processing status by document ID
export const getProcessingStatus = api(
  { expose: true, method: "GET", path: "/upload/processing-status/:documentId" },
  async ({ documentId }: { documentId: string }): Promise<ProcessingStatus> => {
    try {
      const status = await getProcessingStatusFromDB(documentId);
      if (!status) {
        throw new Error(`Processing status not found for document ${documentId}`);
      }

      return {
        documentId: status.documentId,
        userId: status.userId,
        currentStage: status.currentStage as ProcessingStageType,
        overallStatus: status.overallStatus as ProcessingStatusType,
        stages: status.stages as Record<string, StageStatus>,
        metadata: status.metadata as ProcessingMetadata,
        createdAt: status.createdAt,
        updatedAt: status.updatedAt,
        completedAt: status.completedAt || undefined,
        error: status.errorMessage ? {
          code: 'PROCESSING_ERROR',
          message: status.errorMessage,
          stage: status.currentStage as ProcessingStageType,
          timestamp: status.updatedAt,
          retryable: status.retryCount < status.maxRetries,
        } : undefined,
        progressPercentage: status.progressPercentage,
        retryCount: status.retryCount,
        maxRetries: status.maxRetries,
      };

    } catch (error) {
      console.error('Error getting processing status:', error);
      throw new Error(`Failed to get processing status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Query processing statuses with filters
export const queryProcessingStatuses = api(
  { expose: true, method: "GET", path: "/upload/processing-statuses" },
  async (query: StatusQueryRequest): Promise<ProcessingStatusResponse> => {
    try {
      const limit = Math.min(query.limit || 20, 100); // Max 100 items
      const offset = query.offset || 0;

      // Build where conditions
      const conditions = [];
      
      if (query.documentId) {
        conditions.push(eq(documentProcessingStatus.documentId, query.documentId));
      }
      if (query.userId) {
        conditions.push(eq(documentProcessingStatus.userId, query.userId));
      }
      if (query.status) {
        conditions.push(eq(documentProcessingStatus.overallStatus, query.status));
      }
      if (query.stage) {
        conditions.push(eq(documentProcessingStatus.currentStage, query.stage));
      }

      // Query with pagination
      const statuses = await db
        .select()
        .from(documentProcessingStatus)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(documentProcessingStatus.updatedAt))
        .limit(limit + 1) // Get one extra to check if there are more
        .offset(offset);

      // Check if there are more results
      const hasMore = statuses.length > limit;
      const resultStatuses = hasMore ? statuses.slice(0, -1) : statuses;

      // Format results
      const formattedStatuses: ProcessingStatus[] = resultStatuses.map(status => ({
        documentId: status.documentId,
        userId: status.userId,
        currentStage: status.currentStage as ProcessingStageType,
        overallStatus: status.overallStatus as ProcessingStatusType,
        stages: status.stages as Record<string, StageStatus>,
        metadata: status.metadata as ProcessingMetadata,
        createdAt: status.createdAt,
        updatedAt: status.updatedAt,
        completedAt: status.completedAt || undefined,
        error: status.errorMessage ? {
          code: 'PROCESSING_ERROR',
          message: status.errorMessage,
          stage: status.currentStage as ProcessingStageType,
          timestamp: status.updatedAt,
          retryable: status.retryCount < status.maxRetries,
        } : undefined,
        progressPercentage: status.progressPercentage,
        retryCount: status.retryCount,
        maxRetries: status.maxRetries,
      }));

      return {
        statuses: formattedStatuses,
        total: formattedStatuses.length,
        hasMore,
      };

    } catch (error) {
      console.error('Error querying processing statuses:', error);
      throw new Error(`Failed to query processing statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Helper function to get status from database
async function getProcessingStatusFromDB(documentId: string) {
  const result = await db
    .select()
    .from(documentProcessingStatus)
    .where(eq(documentProcessingStatus.documentId, documentId))
    .limit(1);

  return result[0] || null;
}

// Retry processing from a specific stage
export const retryProcessingFromStage = api(
  { expose: true, method: "POST", path: "/upload/processing-status/:documentId/retry" },
  async (request: RetryRequest): Promise<RetryResponse> => {
    try {
      const currentStatus = await getProcessingStatusFromDB(request.documentId);
      if (!currentStatus) {
        throw new Error(`Processing status not found for document ${request.documentId}`);
      }

      const stages = currentStatus.stages as Record<string, StageStatus>;
      const fromStage = request.fromStage || currentStatus.currentStage;
      const maxRetries = request.maxRetries || 3;

      // Check current retry count
      const stageStatus = stages[fromStage];
      const currentRetryCount = stageStatus.retryCount || 0;

      if (currentRetryCount >= maxRetries) {
        throw new Error(`Maximum retry attempts (${maxRetries}) exceeded for stage ${fromStage}`);
      }

      // Reset stage status for retry
      stages[fromStage] = {
        ...stageStatus,
        status: 'pending',
        errorMessage: undefined,
        retryCount: currentRetryCount + 1,
        startedAt: undefined,
        completedAt: undefined,
      };

      // Update database
      const now = new Date();
      await db
        .update(documentProcessingStatus)
        .set({
          currentStage: fromStage,
          overallStatus: 'pending',
          stages: stages,
          updatedAt: now,
          errorMessage: null,
          retryCount: currentRetryCount + 1,
        })
        .where(eq(documentProcessingStatus.documentId, request.documentId));

      console.log(`Retrying processing for document ${request.documentId} from stage ${fromStage} (attempt ${currentRetryCount + 1})`);

      const newStatus = await getProcessingStatus(request.documentId);

      return {
        documentId: request.documentId,
        retryAttempt: currentRetryCount + 1,
        newStatus,
        success: true,
      };

    } catch (error) {
      console.error('Error retrying processing:', error);
      throw new Error(`Failed to retry processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Cancel processing for a document
export const cancelProcessing = api(
  { expose: true, method: "POST", path: "/upload/processing-status/:documentId/cancel" },
  async (request: { documentId: string; reason?: string }): Promise<ProcessingStatus> => {
    try {
      const now = new Date();
      const reason = request.reason || 'Processing cancelled by user';

      // Update status to cancelled
      await db
        .update(documentProcessingStatus)
        .set({
          overallStatus: 'cancelled',
          updatedAt: now,
          errorMessage: reason,
        })
        .where(eq(documentProcessingStatus.documentId, request.documentId));

      console.log(`Cancelled processing for document ${request.documentId}: ${reason}`);

      return await getProcessingStatus(request.documentId);

    } catch (error) {
      console.error('Error cancelling processing:', error);
      throw new Error(`Failed to cancel processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Get processing metrics and performance data
export const getProcessingMetrics = api(
  { expose: true, method: "GET", path: "/upload/processing-metrics" },
  async (query: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }): Promise<ProcessingMetrics> => {
    try {
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      // Build where conditions
      const conditions = [
        gte(documentProcessingStatus.createdAt, startDate),
        lte(documentProcessingStatus.createdAt, endDate),
      ];

      if (query.userId) {
        conditions.push(eq(documentProcessingStatus.userId, query.userId));
      }

      // Get all statuses in date range
      const statuses = await db
        .select()
        .from(documentProcessingStatus)
        .where(and(...conditions));

      // Calculate metrics
      const totalDocuments = statuses.length;
      const completedDocuments = statuses.filter(s => s.overallStatus === 'completed').length;
      const failedDocuments = statuses.filter(s => s.overallStatus === 'failed').length;

      // Calculate average processing time for completed documents
      const completedStatuses = statuses.filter(s => s.overallStatus === 'completed' && s.completedAt);
      const averageProcessingTime = completedStatuses.length > 0
        ? completedStatuses.reduce((sum, s) => sum + (s.completedAt!.getTime() - s.createdAt.getTime()), 0) / completedStatuses.length
        : 0;

      // Calculate stage performance (simplified for now)
      const stagePerformance: StagePerformance[] = STAGE_ORDER.map(stage => ({
        stage,
        averageTime: BASE_PROCESSING_TIMES[stage] || 5000,
        successRate: 0.95, // Mock success rate
        queueSize: Math.floor(Math.random() * 10), // Mock queue size
      }));

      return {
        totalDocuments,
        completedDocuments,
        failedDocuments,
        averageProcessingTime,
        stagePerformance,
      };

    } catch (error) {
      console.error('Error getting processing metrics:', error);
      throw new Error(`Failed to get processing metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Cleanup old processing statuses
export async function cleanupOldProcessingStatuses(beforeDate: Date): Promise<number> {
  try {
    const result = await db
      .delete(documentProcessingStatus)
      .where(
        and(
          lte(documentProcessingStatus.createdAt, beforeDate),
          inArray(documentProcessingStatus.overallStatus, ['completed', 'failed', 'cancelled'])
        )
      );

    console.log(`Cleaned up old processing statuses before ${beforeDate.toISOString()}`);
    return result.rowsAffected || 0;

  } catch (error) {
    console.error('Error cleaning up processing statuses:', error);
    throw new Error(`Failed to cleanup processing statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to estimate processing time based on file characteristics
export function estimateProcessingTime(fileSize: number, contentType: string, processingMode: string = 'standard'): number {
  const baseTime = 10000; // 10 seconds base
  const sizeMultiplier = Math.max(1, fileSize / (1024 * 1024)); // Scale by MB
  
  let complexityMultiplier = 1;
  if (contentType === 'application/pdf') {
    complexityMultiplier = 1.5; // PDFs are more complex
  } else if (contentType.includes('word')) {
    complexityMultiplier = 1.2; // DOCX files
  }

  let modeMultiplier = 1;
  if (processingMode === 'detailed') {
    modeMultiplier = 2;
  } else if (processingMode === 'fast') {
    modeMultiplier = 0.5;
  }

  return Math.round(baseTime * sizeMultiplier * complexityMultiplier * modeMultiplier);
}