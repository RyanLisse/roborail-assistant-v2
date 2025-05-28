import { Bucket } from "encore.dev/storage/objects";

// Initialize Encore bucket for file storage
export const documentBucket = new Bucket("documents", {
  versioned: true, // Enable versioning for file updates
});

// Types for bucket storage
export interface BucketUploadRequest {
  documentId: string;
  fileName: string;
  contentType: string;
  fileData: Buffer | string; // Buffer for binary data, string for base64
}

export interface BucketUploadResponse {
  bucketPath: string;
  uploadedAt: Date;
  fileSize: number;
  etag?: string; // Entity tag for versioning
}

export interface BucketDownloadRequest {
  bucketPath: string;
}

export interface BucketDownloadResponse {
  data: Buffer;
  contentType: string;
  fileSize: number;
  lastModified: Date;
}

export interface BucketError {
  type: "UPLOAD_FAILED" | "DOWNLOAD_FAILED" | "FILE_NOT_FOUND" | "INVALID_PATH";
  message: string;
  bucketPath?: string;
}

// Helper function to generate bucket path
export function generateBucketPath(documentId: string, fileName: string): string {
  // Common file extensions we support
  const validExtensions = ["pdf", "docx", "doc", "txt", "md"];

  // Extract file extension, handle case where there's no extension
  const parts = fileName.split(".");
  if (parts.length === 1) {
    // No extension
    return `uploads/${documentId}`;
  }

  const lastPart = parts[parts.length - 1].toLowerCase();

  // Check if the last part is a valid file extension
  if (validExtensions.includes(lastPart)) {
    return `uploads/${documentId}.${lastPart}`;
  }

  // If not a valid extension, treat as filename without extension
  return `uploads/${documentId}`;
}

// Helper function to calculate file size
export function calculateFileSize(data: Buffer | string): number {
  if (Buffer.isBuffer(data)) {
    return data.length;
  }
  return Buffer.from(data, "base64").length;
}

// Helper function to validate bucket paths
export function isValidBucketPath(path: string): boolean {
  // Basic validation for bucket paths
  if (!path || path.length === 0) return false;
  if (path.includes("..")) return false; // Prevent path traversal
  if (!path.startsWith("uploads/")) return false;
  if (path === "uploads/") return false;

  return true;
}

// Helper function to convert base64 to buffer if needed
function prepareFileData(fileData: Buffer | string): Buffer {
  if (Buffer.isBuffer(fileData)) {
    return fileData;
  }
  // Assume string is base64 encoded
  return Buffer.from(fileData, "base64");
}

// Upload file to bucket
export async function uploadToBucket(request: BucketUploadRequest): Promise<BucketUploadResponse> {
  try {
    // Generate bucket path
    const bucketPath = generateBucketPath(request.documentId, request.fileName);

    // Validate bucket path
    if (!isValidBucketPath(bucketPath)) {
      throw new Error(`Invalid bucket path: ${bucketPath}`);
    }

    // Prepare file data
    const fileBuffer = prepareFileData(request.fileData);
    const fileSize = fileBuffer.length;

    // Upload to Encore bucket
    const uploadResult = await documentBucket.upload(bucketPath, fileBuffer, {
      contentType: request.contentType,
    });

    // Return successful upload response
    return {
      bucketPath,
      uploadedAt: new Date(),
      fileSize,
      etag: uploadResult.etag,
    };
  } catch (error) {
    console.error("Bucket upload error:", error);
    const bucketError: BucketError = {
      type: "UPLOAD_FAILED",
      message: error instanceof Error ? error.message : "Unknown upload error",
    };
    throw bucketError;
  }
}

// Download file from bucket
export async function downloadFromBucket(
  request: BucketDownloadRequest
): Promise<BucketDownloadResponse> {
  try {
    // Validate bucket path
    if (!isValidBucketPath(request.bucketPath)) {
      const bucketError: BucketError = {
        type: "INVALID_PATH",
        message: `Invalid bucket path: ${request.bucketPath}`,
        bucketPath: request.bucketPath,
      };
      throw bucketError;
    }

    // Download from Encore bucket
    const downloadResult = await documentBucket.download(request.bucketPath);

    if (!downloadResult) {
      const bucketError: BucketError = {
        type: "FILE_NOT_FOUND",
        message: "File not found in bucket",
        bucketPath: request.bucketPath,
      };
      throw bucketError;
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResult.stream) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    // Return successful download response
    return {
      data,
      contentType: downloadResult.contentType || "application/octet-stream",
      fileSize: data.length,
      lastModified: downloadResult.lastModified || new Date(),
    };
  } catch (error) {
    console.error("Bucket download error:", error);

    // If already a BucketError, re-throw as is
    if (error && typeof error === "object" && "type" in error) {
      throw error;
    }

    const bucketError: BucketError = {
      type: "DOWNLOAD_FAILED",
      message: error instanceof Error ? error.message : "Unknown download error",
      bucketPath: request.bucketPath,
    };
    throw bucketError;
  }
}

// Check if file exists in bucket
export async function fileExistsInBucket(bucketPath: string): Promise<boolean> {
  try {
    if (!isValidBucketPath(bucketPath)) {
      return false;
    }

    const result = await documentBucket.download(bucketPath);
    return result !== null;
  } catch {
    return false;
  }
}

// Delete file from bucket
export async function deleteFromBucket(bucketPath: string): Promise<void> {
  try {
    if (!isValidBucketPath(bucketPath)) {
      const bucketError: BucketError = {
        type: "INVALID_PATH",
        message: `Invalid bucket path: ${bucketPath}`,
        bucketPath,
      };
      throw bucketError;
    }

    await documentBucket.remove(bucketPath);
  } catch (error) {
    console.error("Bucket delete error:", error);

    // If already a BucketError, re-throw as is
    if (error && typeof error === "object" && "type" in error) {
      throw error;
    }

    const bucketError: BucketError = {
      type: "DOWNLOAD_FAILED", // Reusing for delete operations
      message: error instanceof Error ? error.message : "Unknown delete error",
      bucketPath,
    };
    throw bucketError;
  }
}

// Get file metadata from bucket without downloading content
export async function getBucketFileMetadata(bucketPath: string): Promise<{
  contentType: string;
  lastModified: Date;
  etag?: string;
}> {
  try {
    if (!isValidBucketPath(bucketPath)) {
      const bucketError: BucketError = {
        type: "INVALID_PATH",
        message: `Invalid bucket path: ${bucketPath}`,
        bucketPath,
      };
      throw bucketError;
    }

    // Note: Encore buckets might not have a separate metadata-only API
    // For now, we'll use the download method and close the stream immediately
    const downloadResult = await documentBucket.download(bucketPath);

    if (!downloadResult) {
      const bucketError: BucketError = {
        type: "FILE_NOT_FOUND",
        message: "File not found in bucket",
        bucketPath,
      };
      throw bucketError;
    }

    // Close the stream immediately since we only want metadata
    downloadResult.stream.destroy();

    return {
      contentType: downloadResult.contentType || "application/octet-stream",
      lastModified: downloadResult.lastModified || new Date(),
      etag: downloadResult.etag,
    };
  } catch (error) {
    console.error("Bucket metadata error:", error);

    // If already a BucketError, re-throw as is
    if (error && typeof error === "object" && "type" in error) {
      throw error;
    }

    const bucketError: BucketError = {
      type: "DOWNLOAD_FAILED",
      message: error instanceof Error ? error.message : "Unknown metadata error",
      bucketPath,
    };
    throw bucketError;
  }
}
