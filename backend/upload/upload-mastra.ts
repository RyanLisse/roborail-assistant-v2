import { eq } from "drizzle-orm";
import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { nanoid } from "nanoid";
// Removed zod import - use simple TypeScript interface
import { db } from "../db/connection";
import { documents } from "../db/schema";
import { 
  type BucketDownloadRequest,
  type BucketDownloadResponse,
  type BucketError,
  type BucketUploadRequest,
  type BucketUploadResponse,
  deleteFromBucket,
  downloadFromBucket,
  fileExistsInBucket,
  generateBucketPath,
  getBucketFileMetadata,
  uploadToBucket,
} from "./storage";
import { mastraRAGService } from "../lib/mastra/rag-service";
import { parseDocument } from "./parser";

// Create a service-specific logger instance
const logger = log.with({ service: "upload-mastra-service" });

// Enhanced validation schemas for Mastra integration
export const FileUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileSize: z
    .number()
    .min(1, "File must not be empty")
    .max(50 * 1024 * 1024, "File size must not exceed 50MB"),
  contentType: z.enum(
    [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    {
      errorMap: () => ({ message: "Only PDF, DOCX, and TXT files are allowed" }),
    }
  ),
});

export const MetadataSchema = z
  .object({
    title: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    department: z.string().optional(),
    source: z.string().optional(),
    description: z.string().optional(),
  })
  .optional();

// Enhanced request and response types for Mastra integration
export interface MastraFileUploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
  fileData: string; // Base64 encoded file data
  metadata?: {
    title?: string;
    author?: string;
    tags?: string[];
    department?: string;
    source?: string;
    description?: string;
  };
  options?: {
    processWithMastra?: boolean; // Enable Mastra processing
    chunkingStrategy?: "recursive" | "character" | "token";
    chunkSize?: number;
    chunkOverlap?: number;
    generateEmbeddings?: boolean;
  };
}

export interface MastraFileUploadResponse {
  documentId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: "uploaded" | "processing" | "processed" | "error";
  uploadedAt: Date;
  bucketPath?: string;
  mastraProcessing?: {
    chunksCreated: number;
    embeddingsGenerated: number;
    processingTime: number;
    chunkIds: string[];
  };
}

export interface ProcessingStatus {
  documentId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  chunksProcessed?: number;
  totalChunks?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Helper functions (keeping existing ones and adding new ones)
export function validateFileUpload(
  request: Pick<MastraFileUploadRequest, "fileName" | "fileSize" | "contentType">
): any {
  const fileValidation = FileUploadSchema.safeParse(request);
  
  if (!fileValidation.success) {
    const firstError = fileValidation.error.issues[0];
    
    if (firstError.path[0] === "fileSize" && firstError.message.includes("50MB")) {
      return {
        type: "SIZE_EXCEEDED",
        message: firstError.message,
        maxSize: 50 * 1024 * 1024,
      };
    }
    
    if (firstError.path[0] === "contentType") {
      return {
        type: "INVALID_TYPE",
        message: firstError.message,
        allowedTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
      };
    }

    if (firstError.path[0] === "fileName") {
      return {
        type: "MISSING_FILE",
        message: firstError.message,
      };
    }
    
    if (firstError.path[0] === "fileSize" && firstError.message.includes("empty")) {
      return {
        type: "CORRUPTED_FILE",
        message: firstError.message,
      };
    }
    
    return {
      type: "CORRUPTED_FILE",
      message: firstError.message,
    };
  }
  
  return null;
}

export function generateDocumentId(): string {
  return `doc_${nanoid(12)}`;
}

export function getFileExtension(contentType: string): string {
  switch (contentType) {
    case "application/pdf":
      return ".pdf";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    case "text/plain":
      return ".txt";
    default:
      return "";
  }
}

// Enhanced database save function with Mastra processing status
export async function saveFileToDatabase(
  documentId: string,
  fileName: string,
  fileSize: number,
  contentType: string,
  bucketPath: string,
  metadata?: MastraFileUploadRequest["metadata"],
  chunkCount?: number
): Promise<void> {
  const now = new Date();
  
  await db.insert(documents).values({
    id: documentId,
    userId: "system", // Authentication removed - using system user
    filename: bucketPath,
    originalName: fileName,
    contentType,
    fileSize,
    status: "uploaded",
    uploadedAt: now,
    chunkCount: chunkCount || 0,
    metadata: metadata || {},
  });
}

// Enhanced processing function using Mastra
async function processDocumentWithMastra(
  documentId: string,
  bucketPath: string,
  contentType: string,
  options: MastraFileUploadRequest["options"] = {}
): Promise<{
  chunksCreated: number;
  embeddingsGenerated: number;
  processingTime: number;
  chunkIds: string[];
}> {
  const startTime = Date.now();
  
  try {
    logger.info("Starting Mastra document processing", {
      documentId,
      bucketPath,
      contentType,
      options
    });

    // Update status to processing
    await db.update(documents)
      .set({ 
        status: "processing",
        processedAt: new Date()
      })
      .where(eq(documents.id, documentId));

    // Download and parse the document
    const downloadRequest: BucketDownloadRequest = { bucketPath };
    const downloadResult = await downloadFromBucket(downloadRequest);
    
    // Parse document content based on type
    const parsedContent = await parseDocument(
      Buffer.from(downloadResult.fileData, 'base64'),
      contentType
    );

    // Get document metadata from database
    const docRecord = await db.query.documents.findFirst({
      where: eq(documents.id, documentId)
    });

    // Process with Mastra RAG service
    const mastraResult = await mastraRAGService.processDocument({
      content: parsedContent.text,
      filename: docRecord?.originalName || 'unknown',
      documentId,
      metadata: {
        contentType,
        pageCount: parsedContent.pageCount,
        wordCount: parsedContent.wordCount,
        ...docRecord?.metadata,
        chunkingStrategy: options.chunkingStrategy || 'recursive',
        chunkSize: options.chunkSize || 1000,
        chunkOverlap: options.chunkOverlap || 200,
      }
    });

    // Update database with processing results
    await db.update(documents)
      .set({ 
        status: "processed",
        chunkCount: mastraResult.chunksCreated,
        processedAt: new Date()
      })
      .where(eq(documents.id, documentId));

    const processingTime = Date.now() - startTime;

    logger.info("Mastra document processing completed successfully", {
      documentId,
      chunksCreated: mastraResult.chunksCreated,
      embeddingsGenerated: mastraResult.embeddings,
      processingTime: mastraResult.processingTime,
      totalTime: processingTime
    });

    return {
      chunksCreated: mastraResult.chunksCreated,
      embeddingsGenerated: mastraResult.embeddings,
      processingTime: mastraResult.processingTime,
      chunkIds: mastraResult.chunkIds
    };

  } catch (error) {
    logger.error("Mastra document processing failed", {
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Update status to error
    await db.update(documents)
      .set({ 
        status: "error",
        processedAt: new Date()
      })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

// Enhanced file upload API with Mastra integration
export const uploadFileWithMastra = api(
  { expose: true, method: "POST", path: "/upload/file-mastra" },
  async (request: MastraFileUploadRequest): Promise<MastraFileUploadResponse> => {
    try {
      // Validate file upload request
      const validationError = validateFileUpload({
        fileName: request.fileName,
        fileSize: request.fileSize,
        contentType: request.contentType,
      });
      
      if (validationError) {
        throw new Error(`${validationError.type}: ${validationError.message}`);
      }
      
      // Validate metadata if provided
      if (request.metadata) {
        const metadataValidation = MetadataSchema.safeParse(request.metadata);
        if (!metadataValidation.success) {
          throw new Error(`Invalid metadata: ${metadataValidation.error.issues[0].message}`);
        }
      }
      
      // Generate unique document ID
      const documentId = generateDocumentId();

      logger.info("Received file upload request with Mastra processing", {
        documentId,
        fileName: request.fileName,
        fileSize: request.fileSize,
        contentType: request.contentType,
        metadata: request.metadata,
        options: request.options
      });
      
      // Generate bucket path using storage utility
      const bucketPath = generateBucketPath(documentId, request.fileName);
      
      // Upload file to Encore Bucket
      const bucketUploadRequest: BucketUploadRequest = {
        documentId,
        fileName: request.fileName,
        contentType: request.contentType,
        fileData: request.fileData, // Base64 encoded string
      };
      
      let uploadResult: BucketUploadResponse;
      try {
        uploadResult = await uploadToBucket(bucketUploadRequest);
        logger.info("File successfully uploaded to bucket", {
          documentId: documentId,
          bucketPath: uploadResult.bucketPath,
          fileSize: uploadResult.fileSize,
        });
      } catch (error) {
        const bucketError = error as BucketError;
        logger.error("Bucket upload failed", {
          documentId,
          error: bucketError.message
        });
        throw new Error(`Failed to store file: ${bucketError.message}`);
      }
      
      // Save file metadata to database
      await saveFileToDatabase(
        documentId,
        request.fileName,
        uploadResult.fileSize,
        request.contentType,
        uploadResult.bucketPath,
        request.metadata
      );

      // Process with Mastra if enabled (default: true)
      let mastraProcessing;
      if (request.options?.processWithMastra !== false) {
        try {
          mastraProcessing = await processDocumentWithMastra(
            documentId,
            uploadResult.bucketPath,
            request.contentType,
            request.options
          );
          
          logger.info("Mastra processing completed successfully", {
            documentId,
            mastraProcessing
          });
        } catch (error) {
          logger.error("Mastra processing failed, but file upload succeeded", {
            documentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Don't throw here - file was uploaded successfully
          // Mastra processing can be retried later
        }
      }
      
      // Return successful upload response with Mastra processing results
      const response: MastraFileUploadResponse = {
        documentId,
        fileName: request.fileName,
        fileSize: uploadResult.fileSize,
        contentType: request.contentType,
        status: mastraProcessing ? "processed" : "uploaded",
        uploadedAt: uploadResult.uploadedAt,
        bucketPath: uploadResult.bucketPath,
        mastraProcessing
      };

      logger.info("File upload with Mastra processing completed", {
        documentId,
        fileName: response.fileName,
        status: response.status,
        mastraProcessing: !!mastraProcessing
      });
      
      return response;
    } catch (error) {
      logger.error("File upload with Mastra processing failed", {
        fileName: request.fileName,
        fileSize: request.fileSize,
        contentType: request.contentType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
);

// API to get processing status
export const getMastraProcessingStatus = api(
  { expose: true, method: "GET", path: "/upload/mastra/status/:documentId" },
  async ({ documentId }: { documentId: string }): Promise<ProcessingStatus> => {
    try {
      const docRecord = await db.query.documents.findFirst({
        where: eq(documents.id, documentId)
      });

      if (!docRecord) {
        throw new Error("Document not found");
      }

      return {
        documentId,
        status: docRecord.status as any,
        startedAt: docRecord.uploadedAt,
        completedAt: docRecord.processedAt || undefined
      };
    } catch (error) {
      logger.error("Failed to get processing status", {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
);

// Define the reprocess request interface (simplified for Encore compatibility)
interface ReprocessRequest {
  documentId: string;
  options: {
    processWithMastra?: boolean;
    chunkingStrategy?: "recursive" | "character" | "token";
    chunkSize?: number;
    chunkOverlap?: number;
    generateEmbeddings?: boolean;
  };
}

// API to reprocess document with Mastra
export const reprocessWithMastra = api(
  { expose: true, method: "POST", path: "/upload/reprocess/:documentId" },
  async ({ 
    documentId
  }: { documentId: string }): Promise<{
    documentId: string;
    processing: {
      chunksCreated: number;
      embeddingsGenerated: number;
      processingTime: number;
      chunkIds: string[];
    };
  }> => {
    try {
      const docRecord = await db.query.documents.findFirst({
        where: eq(documents.id, documentId)
      });

      if (!docRecord) {
        throw new Error("Document not found");
      }

      logger.info("Reprocessing document with Mastra", {
        documentId,
        filename: docRecord.filename
      });

      const processing = await processDocumentWithMastra(
        documentId,
        docRecord.filename,
        docRecord.contentType,
        { processWithMastra: true }
      );

      return {
        documentId,
        processing
      };
    } catch (error) {
      logger.error("Failed to reprocess document with Mastra", {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
);