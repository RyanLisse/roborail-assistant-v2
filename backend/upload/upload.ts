import { eq } from "drizzle-orm";
import { api, Path, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { nanoid } from "nanoid";
import { z } from "zod";
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

// Create a service-specific logger instance
const logger = log.with({ service: "upload-service" });

// Database connection (secret is handled by db/connection.ts)

// Validation schemas
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
  })
  .optional();

// Request and Response types
export interface FileUploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
  fileData: string; // Base64 encoded file data
  metadata?: {
    title?: string;
    author?: string;
    tags?: string[];
    department?: string;
  };
}

export interface FileUploadResponse {
  documentId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: "uploaded" | "processing" | "processed" | "error";
  uploadedAt: Date;
  bucketPath?: string;
}

export interface FileValidationError {
  type: "SIZE_EXCEEDED" | "INVALID_TYPE" | "CORRUPTED_FILE" | "MISSING_FILE";
  message: string;
  maxSize?: number;
  allowedTypes?: string[];
}

// Helper function to validate file upload
export function validateFileUpload(
  request: Pick<FileUploadRequest, "fileName" | "fileSize" | "contentType">
): FileValidationError | null {
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

// Helper function to generate unique document ID
export function generateDocumentId(): string {
  return `doc_${nanoid(12)}`;
}

// Helper function to determine file extension from content type
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

// Helper function to save file to database
export async function saveFileToDatabase(
  documentId: string,
  fileName: string,
  fileSize: number,
  contentType: string,
  bucketPath: string,
  metadata?: FileUploadRequest["metadata"]
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
    chunkCount: 0,
    metadata: metadata || {},
  });
}

// API endpoint for file upload
export const uploadFile = api(
  { expose: true, method: "POST", path: "/upload/file" },
  async (request: FileUploadRequest): Promise<FileUploadResponse> => {
    try {
      // Validate file upload request
      const validationError = validateFileUpload({
        fileName: request.fileName,
        fileSize: request.fileSize,
        contentType: request.contentType,
      });
      
      if (validationError) {
        throw APIError.invalidArgument(`${validationError.type}: ${validationError.message}`);
      }
      
      // Validate metadata if provided
      if (request.metadata) {
        const metadataValidation = MetadataSchema.safeParse(request.metadata);
        if (!metadataValidation.success) {
          throw APIError.invalidArgument(`Invalid metadata: ${metadataValidation.error.issues[0].message}`);
        }
      }
      
      // Generate unique document ID
      const documentId = generateDocumentId();

      logger.info("Received file upload request", {
        fileName: request.fileName,
        fileSize: request.fileSize,
        contentType: request.contentType,
        // userId: request.userId, // Authentication removed - using system user
        metadata: request.metadata,
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
        console.log(`Successfully uploaded file to bucket: ${uploadResult.bucketPath}`);
        logger.info("File successfully uploaded to bucket", {
          documentId: documentId,
          bucketPath: uploadResult.bucketPath,
          fileSize: uploadResult.fileSize,
        });
      } catch (error) {
        const bucketError = error as BucketError;
        console.error(`Bucket upload failed: ${bucketError.message}`);
        throw APIError.internal(`Failed to store file: ${bucketError.message}`);
      }
      
      // Save file metadata to database with actual bucket path and upload info
      await saveFileToDatabase(
        documentId,
        request.fileName,
        uploadResult.fileSize, // Use actual file size from upload
        request.contentType,
        uploadResult.bucketPath, // Use actual bucket path from upload
        request.metadata
      );

      logger.info("File metadata successfully saved to database", {
        documentId: documentId,
        bucketPath: uploadResult.bucketPath,
        userId: "system", // Authentication removed - using system user
      });
      
      // Trigger document processing asynchronously
      triggerDocumentProcessing(documentId, uploadResult.bucketPath, request.contentType).catch(
        (error) => {
          console.error(`Failed to trigger processing for document ${documentId}:`, error);
        }
      );
      
      // Return successful upload response
      const response: FileUploadResponse = {
        documentId,
        fileName: request.fileName,
        fileSize: uploadResult.fileSize,
        contentType: request.contentType,
        status: "uploaded",
        uploadedAt: uploadResult.uploadedAt,
        bucketPath: uploadResult.bucketPath,
      };

      logger.info("File upload process completed successfully", {
        documentId: documentId,
        fileName: response.fileName,
        status: response.status,
      });
      
      return response;
    } catch (error) {
      console.error("File upload error:", error);
      const errorMessage = "File upload failed";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          fileName: request.fileName,
          fileSize: request.fileSize,
          contentType: request.contentType,
        });
      } else {
        logger.error(errorMessage, {
          fileName: request.fileName,
          fileSize: request.fileSize,
          contentType: request.contentType,
          error: error,
        });
      }
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
);

// API endpoint to get upload status
export const getUploadStatus = api(
  { expose: true, method: "GET", path: "/upload/status/:documentId" },
  async ({ documentId }: { documentId: Path<string> }): Promise<{ status: string; documentId: string }> => {
    try {
      logger.info("Received request to get upload status", {
        documentId: documentId,
      });

      // Query database for document status
      const result = await db
        .select({
        status: documents.status,
        })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      if (result.length === 0) {
        throw APIError.notFound("Document not found");
      }
      
      return {
        documentId,
        status: result[0].status,
      };
      
      logger.info("Successfully retrieved upload status", {
        documentId: documentId,
        status: result[0].status,
      });
    } catch (error) {
      // Re-throw APIErrors as-is (like notFound)
      if (error instanceof APIError) {
        throw error;
      }
      
      console.error("Status check error:", error);
      const errorMessage = "Failed to get upload status";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          documentId: documentId,
        });
        throw APIError.internal(errorMessage, error);
      } else {
        logger.error(errorMessage, {
          documentId: documentId,
          error: error,
        });
        throw APIError.internal(errorMessage);
      }
    }
  }
);

// API endpoint for file download
export const downloadFile = api(
  { expose: true, method: "GET", path: "/upload/download/:documentId" },
  async ({ documentId }: { documentId: Path<string> }): Promise<{
    data: string; // Base64 encoded
    fileName: string;
    contentType: string;
    fileSize: number;
  }> => {
    try {
      logger.info("Received request to download file", {
        documentId: documentId,
      });

      // Get document metadata from database
      const result = await db
        .select({
        filename: documents.filename,
        originalName: documents.originalName,
        contentType: documents.contentType,
        })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      if (result.length === 0) {
        throw APIError.notFound("Document not found");
      }
      
      const document = result[0];

      logger.info("Successfully retrieved document metadata from database for download", {
        documentId: documentId,
        bucketPath: document.filename,
      });
      
      // Download file from bucket
      const downloadRequest: BucketDownloadRequest = {
        bucketPath: document.filename, // filename stores bucket path
      };
      
      const downloadResult = await downloadFromBucket(downloadRequest);

      logger.info("Successfully downloaded file from bucket", {
        documentId: documentId,
        bucketPath: document.filename,
        fileSize: downloadResult.fileSize,
      });
      
      // Convert buffer to base64 for API response
      const base64Data = downloadResult.data.toString("base64");

      logger.info("File download process completed successfully", {
        documentId: documentId,
        fileName: document.originalName,
      });
      
      return {
        data: base64Data,
        fileName: document.originalName,
        contentType: document.contentType,
        fileSize: downloadResult.fileSize,
      };
    } catch (error) {
      console.error("File download error:", error);
      const errorMessage = "File download failed";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          documentId: documentId,
        });
      } else {
        logger.error(errorMessage, {
          documentId: documentId,
          error: error,
        });
      }
      throw new Error(
        `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// API endpoint to delete a file
export const deleteFile = api(
  { expose: true, method: "DELETE", path: "/upload/file/:documentId" },
  async ({ documentId }: { documentId: Path<string> }): Promise<{ success: boolean }> => {
    try {
      logger.info("Received request to delete file", {
        documentId: documentId,
      });

      // Get document metadata from database
      const result = await db
        .select({
        filename: documents.filename, // bucket path
        })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      if (result.length === 0) {
        throw APIError.notFound("Document not found");
      }
      
      const document = result[0];
      
      // Delete file from bucket
      await deleteFromBucket(document.filename);
      
      // Delete document record from database
      await db.delete(documents).where(eq(documents.id, documentId));
      
      console.log(`Successfully deleted document ${documentId} and file ${document.filename}`);

      logger.info("File and document record successfully deleted", {
        documentId: documentId,
        bucketPath: document.filename,
      });
      
      return { success: true };
    } catch (error) {
      console.error("File deletion error:", error);
      const errorMessage = "File deletion failed";
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          documentId: documentId,
        });
      } else {
        logger.error(errorMessage, {
          documentId: documentId,
          error: error,
        });
      }
      throw new Error(
        `Deletion failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// API endpoint to check if file exists
export const fileExists = api(
  { expose: true, method: "GET", path: "/upload/exists/:documentId" },
  async ({ documentId }: { documentId: Path<string> }): Promise<{
    exists: boolean;
    inDatabase: boolean;
    inBucket: boolean;
    bucketPath?: string;
  }> => {
    try {
      // Check if document exists in database
      const dbResult = await db
        .select({
        filename: documents.filename,
        })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      const inDatabase = dbResult.length > 0;
      let inBucket = false;
      let bucketPath: string | undefined;
      
      if (inDatabase) {
        bucketPath = dbResult[0].filename;
        inBucket = await fileExistsInBucket(bucketPath);
      }
      
      return {
        exists: inDatabase && inBucket,
        inDatabase,
        inBucket,
        bucketPath,
      };
    } catch (error) {
      console.error("File existence check error:", error);
      throw new Error(
        `Existence check failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// API endpoint to get file metadata
export const getFileMetadata = api(
  { expose: true, method: "GET", path: "/upload/metadata/:documentId" },
  async ({ documentId }: { documentId: Path<string> }): Promise<{
    fileName: string;
    originalName: string;
    contentType: string;
    fileSize: number;
    uploadedAt: Date;
    bucketPath: string;
    bucketMetadata?: {
      lastModified: Date;
      etag?: string;
    };
  }> => {
    try {
      // Get document metadata from database
      const result = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
      
      if (result.length === 0) {
        throw APIError.notFound("Document not found");
      }
      
      const document = result[0];
      
      // Get bucket metadata
      let bucketMetadata;
      try {
        const bucketInfo = await getBucketFileMetadata(document.filename);
        bucketMetadata = {
          lastModified: bucketInfo.lastModified,
          etag: bucketInfo.etag,
        };
      } catch (error) {
        console.warn(`Could not get bucket metadata for ${document.filename}:`, error);
      }
      
      return {
        fileName: document.filename,
        originalName: document.originalName,
        contentType: document.contentType,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt,
        bucketPath: document.filename,
        bucketMetadata,
      };
    } catch (error) {
      console.error("File metadata error:", error);
      throw new Error(
        `Metadata retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// Helper function to trigger document processing
async function triggerDocumentProcessing(
  documentId: string, 
  bucketPath: string, 
  contentType: string
): Promise<void> {
  try {
    // Import here to avoid circular dependencies
    const { processDocument } = await import("../docprocessing/processing");
    
    const processingRequest = {
      documentID: documentId,
      filePath: bucketPath,
      contentType: contentType,
    };
    
    // Process document asynchronously
    await processDocument(processingRequest);
  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);
    
    // Update document status to failed
    await db.update(documents).set({ status: "failed" }).where(eq(documents.id, documentId));
    
    throw error;
  }
}

// Re-export types and functions for use in other modules
export { 
  uploadToBucket, 
  downloadFromBucket, 
  deleteFromBucket, 
  fileExistsInBucket,
  getBucketFileMetadata,
  generateBucketPath,
} from "./storage";
