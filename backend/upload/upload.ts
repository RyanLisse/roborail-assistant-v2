import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/connection";
import { documents } from "../db/schema";
import { eq } from "drizzle-orm";

// Import database connection and types
const databaseUrl = secret("DATABASE_URL");

// Validation schemas
export const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File must not be empty').max(50 * 1024 * 1024, 'File size must not exceed 50MB'),
  contentType: z.enum(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'], {
    errorMap: () => ({ message: 'Only PDF, DOCX, and TXT files are allowed' })
  }),
});

export const MetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  department: z.string().optional(),
}).optional();

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
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  uploadedAt: Date;
  bucketPath?: string;
}

export interface FileValidationError {
  type: 'SIZE_EXCEEDED' | 'INVALID_TYPE' | 'CORRUPTED_FILE' | 'MISSING_FILE';
  message: string;
  maxSize?: number;
  allowedTypes?: string[];
}

// Helper function to validate file upload
export function validateFileUpload(request: Pick<FileUploadRequest, 'fileName' | 'fileSize' | 'contentType'>): FileValidationError | null {
  const fileValidation = FileUploadSchema.safeParse(request);
  
  if (!fileValidation.success) {
    const firstError = fileValidation.error.issues[0];
    
    if (firstError.path[0] === 'fileSize' && firstError.message.includes('50MB')) {
      return {
        type: 'SIZE_EXCEEDED',
        message: firstError.message,
        maxSize: 50 * 1024 * 1024,
      };
    }
    
    if (firstError.path[0] === 'contentType') {
      return {
        type: 'INVALID_TYPE',
        message: firstError.message,
        allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      };
    }
    
    if (firstError.path[0] === 'fileName') {
      return {
        type: 'MISSING_FILE',
        message: firstError.message,
      };
    }
    
    if (firstError.path[0] === 'fileSize' && firstError.message.includes('empty')) {
      return {
        type: 'CORRUPTED_FILE',
        message: firstError.message,
      };
    }
    
    return {
      type: 'CORRUPTED_FILE',
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
    case 'application/pdf':
      return '.pdf';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '.docx';
    case 'text/plain':
      return '.txt';
    default:
      return '';
  }
}

// Helper function to save file to database
export async function saveFileToDatabase(
  documentId: string,
  fileName: string,
  fileSize: number,
  contentType: string,
  bucketPath: string,
  metadata?: FileUploadRequest['metadata']
): Promise<void> {
  const now = new Date();
  
  await db.insert(documents).values({
    id: documentId,
    userId: 'system', // TODO: Get from authentication when implemented
    title: metadata?.title || fileName,
    fileName,
    contentType,
    fileSize,
    bucketPath,
    status: 'uploaded',
    uploadedAt: now,
    updatedAt: now,
    chunkCount: 0,
    metadata: metadata ? JSON.stringify(metadata) : null,
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
      
      // Generate bucket path (for now, we'll simulate bucket storage)
      const fileExtension = getFileExtension(request.contentType);
      const bucketPath = `uploads/${documentId}${fileExtension}`;
      
      // TODO: Save file to Encore Bucket (next subtask)
      // For now, we'll just simulate successful upload
      console.log(`Would save file to bucket: ${bucketPath}`);
      console.log(`File data length: ${request.fileData.length} bytes`);
      
      // Save file metadata to database
      await saveFileToDatabase(
        documentId,
        request.fileName,
        request.fileSize,
        request.contentType,
        bucketPath,
        request.metadata
      );
      
      // Return successful upload response
      const response: FileUploadResponse = {
        documentId,
        fileName: request.fileName,
        fileSize: request.fileSize,
        contentType: request.contentType,
        status: 'uploaded',
        uploadedAt: new Date(),
        bucketPath,
      };
      
      return response;
      
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// API endpoint to get upload status
export const getUploadStatus = api(
  { expose: true, method: "GET", path: "/upload/status/:documentId" },
  async ({ documentId }: { documentId: string }): Promise<{ status: string; documentId: string }> => {
    try {
      // Query database for document status
      const result = await db.select({
        status: documents.status,
      }).from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      if (result.length === 0) {
        throw new Error('Document not found');
      }
      
      return {
        documentId,
        status: result[0].status,
      };
      
    } catch (error) {
      console.error('Status check error:', error);
      throw new Error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Export types for use in other modules
export type { FileUploadRequest, FileUploadResponse, FileValidationError };
