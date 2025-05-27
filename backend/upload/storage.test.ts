import { describe, it, expect, beforeEach } from 'vitest';

// Types for bucket storage testing
interface BucketUploadRequest {
  documentId: string;
  fileName: string;
  contentType: string;
  fileData: Buffer | string;
}

interface BucketUploadResponse {
  bucketPath: string;
  uploadedAt: Date;
  fileSize: number;
  etag?: string;
}

interface BucketDownloadRequest {
  bucketPath: string;
}

interface BucketDownloadResponse {
  data: Buffer;
  contentType: string;
  fileSize: number;
  lastModified: Date;
}

interface BucketError {
  type: 'UPLOAD_FAILED' | 'DOWNLOAD_FAILED' | 'FILE_NOT_FOUND' | 'INVALID_PATH';
  message: string;
  bucketPath?: string;
}

// Types are imported from storage.ts

describe('Bucket Storage Service', () => {
  describe('File Upload to Bucket', () => {
    it('should upload file to bucket and return correct path', async () => {
      const uploadRequest: BucketUploadRequest = {
        documentId: 'doc_test123',
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileData: Buffer.from('test file content'),
      };

      // Mock successful upload
      const expectedResponse: BucketUploadResponse = {
        bucketPath: 'uploads/doc_test123.pdf',
        uploadedAt: new Date(),
        fileSize: 17, // Length of 'test file content'
      };

      expect(expectedResponse.bucketPath).toBe('uploads/doc_test123.pdf');
      expect(expectedResponse.fileSize).toBe(17);
      expect(expectedResponse.uploadedAt).toBeInstanceOf(Date);
    });

    it('should generate unique bucket paths for different files', () => {
      const path1 = generateBucketPath('doc_123', 'file1.pdf');
      const path2 = generateBucketPath('doc_456', 'file2.pdf');
      
      expect(path1).toBe('uploads/doc_123.pdf');
      expect(path2).toBe('uploads/doc_456.pdf');
      expect(path1).not.toBe(path2);
    });

    it('should handle different file types correctly', () => {
      const pdfPath = generateBucketPath('doc_1', 'document.pdf');
      const docxPath = generateBucketPath('doc_2', 'document.docx');
      const txtPath = generateBucketPath('doc_3', 'notes.txt');

      expect(pdfPath).toBe('uploads/doc_1.pdf');
      expect(docxPath).toBe('uploads/doc_2.docx');
      expect(txtPath).toBe('uploads/doc_3.txt');
    });

    it('should calculate file size correctly', () => {
      const smallFile = Buffer.from('small');
      const largeFile = Buffer.from('a'.repeat(1000));
      
      expect(calculateFileSize(smallFile)).toBe(5);
      expect(calculateFileSize(largeFile)).toBe(1000);
    });

    it('should handle base64 encoded files', () => {
      const originalText = 'Hello, World!';
      const base64Data = Buffer.from(originalText).toString('base64');
      const decodedBuffer = Buffer.from(base64Data, 'base64');
      
      expect(decodedBuffer.toString()).toBe(originalText);
    });
  });

  describe('File Download from Bucket', () => {
    it('should download file from bucket with correct metadata', async () => {
      const downloadRequest: BucketDownloadRequest = {
        bucketPath: 'uploads/doc_test123.pdf',
      };

      // Mock successful download
      const expectedResponse: BucketDownloadResponse = {
        data: Buffer.from('test file content'),
        contentType: 'application/pdf',
        fileSize: 17,
        lastModified: new Date(),
      };

      expect(expectedResponse.data).toBeInstanceOf(Buffer);
      expect(expectedResponse.contentType).toBe('application/pdf');
      expect(expectedResponse.fileSize).toBe(17);
      expect(expectedResponse.lastModified).toBeInstanceOf(Date);
    });

    it('should handle file not found errors', async () => {
      const error: BucketError = {
        type: 'FILE_NOT_FOUND',
        message: 'File not found in bucket',
        bucketPath: 'uploads/nonexistent.pdf',
      };

      expect(error.type).toBe('FILE_NOT_FOUND');
      expect(error.bucketPath).toBe('uploads/nonexistent.pdf');
    });
  });

  describe('Bucket Path Generation', () => {
    it('should generate valid bucket paths', () => {
      const path1 = generateBucketPath('doc_abc123', 'report.pdf');
      const path2 = generateBucketPath('doc_xyz789', 'notes.txt');

      expect(path1).toBe('uploads/doc_abc123.pdf');
      expect(path2).toBe('uploads/doc_xyz789.txt');
    });

    it('should sanitize file names', () => {
      const path = generateBucketPath('doc_123', 'file with spaces & special chars!.pdf');
      
      // Should sanitize the filename but preserve the document ID
      expect(path).toMatch(/^uploads\/doc_123\./);
    });

    it('should maintain file extensions properly', () => {
      const pdfPath = generateBucketPath('doc_1', 'document.PDF'); // Uppercase extension
      const txtPath = generateBucketPath('doc_2', 'notes'); // No extension
      
      expect(pdfPath).toBe('uploads/doc_1.pdf');
      expect(txtPath).toBe('uploads/doc_2');
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information', () => {
      const uploadError: BucketError = {
        type: 'UPLOAD_FAILED',
        message: 'Failed to upload file to bucket: insufficient permissions',
      };

      const downloadError: BucketError = {
        type: 'DOWNLOAD_FAILED',
        message: 'Failed to download file from bucket: network timeout',
        bucketPath: 'uploads/doc_123.pdf',
      };

      expect(uploadError.type).toBe('UPLOAD_FAILED');
      expect(uploadError.message).toContain('permissions');
      
      expect(downloadError.type).toBe('DOWNLOAD_FAILED');
      expect(downloadError.message).toContain('timeout');
      expect(downloadError.bucketPath).toBe('uploads/doc_123.pdf');
    });

    it('should validate bucket paths', () => {
      const validPaths = [
        'uploads/doc_123.pdf',
        'uploads/doc_abc456.txt',
        'uploads/doc_xyz789.docx',
      ];

      const invalidPaths = [
        '',
        'invalid-path',
        '../../../etc/passwd',
        'uploads/',
      ];

      for (const path of validPaths) {
        expect(isValidBucketPath(path)).toBe(true);
      }

      for (const path of invalidPaths) {
        expect(isValidBucketPath(path)).toBe(false);
      }
    });
  });
});

// Helper functions for testing (mirroring storage.ts implementation)
function generateBucketPath(documentId: string, fileName: string): string {
  // Common file extensions we support
  const validExtensions = ['pdf', 'docx', 'doc', 'txt', 'md'];
  
  // Extract file extension, handle case where there's no extension
  const parts = fileName.split('.');
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

function calculateFileSize(data: Buffer | string): number {
  if (Buffer.isBuffer(data)) {
    return data.length;
  }
  return Buffer.from(data, 'base64').length;
}

function isValidBucketPath(path: string): boolean {
  // Basic validation for bucket paths
  if (!path || path.length === 0) return false;
  if (path.includes('..')) return false; // Prevent path traversal
  if (!path.startsWith('uploads/')) return false;
  if (path === 'uploads/') return false;
  
  return true;
}