import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { nanoid } from "nanoid";
import { db } from "../db/connection";
import { documents, documentChunks, documentProcessingStatus } from "../db/schema";
import { eq } from "drizzle-orm";
import { downloadFromBucket } from "../upload/storage";
import { 
  processDocumentChunking, 
  type ChunkingRequest, 
  type DocumentMetadata,
  type ParsedElement 
} from "../upload/embedding";
import log from "encore.dev/log";

// Create a service-specific logger instance
const logger = log.with({ service: "docprocessing-service" });

// Encore secret for Unstructured.io API key
const unstructuredApiKey = secret("UnstructuredApiKey");

// Types
export interface ProcessingRequest {
  documentID: string;
  filePath: string;
  contentType: string;
}

export interface ProcessingResponse {
  documentID: string;
  status: "processing" | "completed" | "failed";
  chunksCreated?: number;
  error?: string;
  processingStage?: string;
  progressPercentage?: number;
}

export interface DocumentChunk {
  id: string;
  documentID: string;
  content: string;
  embedding: number[];
  metadata: {
    pageNumber?: number;
    chunkIndex: number;
    tokenCount: number;
  };
}

export interface UnstructuredResponse {
  elements: Array<{
    type: string;
    text: string;
    metadata: {
      page_number?: number;
      filename?: string;
      coordinates?: any;
    };
  }>;
}

export interface ProcessingError {
  type: 'PARSING_FAILED' | 'CHUNKING_FAILED' | 'STORAGE_FAILED' | 'DOCUMENT_NOT_FOUND';
  message: string;
  documentId?: string;
}

// Main document processing endpoint
export const processDocument = api(
  { expose: true, method: "POST", path: "/process" },
  async (req: ProcessingRequest): Promise<ProcessingResponse> => {
    try {
      logger.info("Starting processing for document", {
        documentID: req.documentID,
        filePath: req.filePath,
        contentType: req.contentType,
      });
      console.log(`Starting processing for document ${req.documentID}`);
      
      // Initialize processing status
      await initializeProcessingStatus(req.documentID);
      
      // Download document from bucket
      await updateProcessingStage(req.documentID, "parsing", "in_progress");
      const fileBuffer = await downloadDocumentFromBucket(req.filePath);
      logger.info("Document downloaded successfully from bucket", {
        documentID: req.documentID,
        filePath: req.filePath,
      });
      
      // Parse document using Unstructured.io
      const parseResult = await parseDocument(fileBuffer, req.contentType);
      logger.info("Document parsed successfully", {
        documentID: req.documentID,
        contentType: req.contentType,
        elementsCount: parseResult.elements.length,
      });
      
      // Create chunks and generate embeddings
      await updateProcessingStage(req.documentID, "chunking", "in_progress");
      const chunkingRequest: ChunkingRequest = {
        documentId: req.documentID,
        extractedText: extractTextFromElements(parseResult.elements),
        elements: convertToInternalElements(parseResult.elements),
        metadata: extractDocumentMetadata(parseResult.elements),
      };
      
      const chunkingResult = await processDocumentChunking(chunkingRequest);
      logger.info("Document chunking and embedding successful", {
        documentID: req.documentID,
        chunksCreated: chunkingResult.chunks.length,
      });
      
      // Store chunks in database
      await updateProcessingStage(req.documentID, "indexing", "in_progress");
      await storeChunksInDatabase(chunkingResult.chunks);
      logger.info("Document chunks stored successfully in database", {
        documentID: req.documentID,
        chunksStored: chunkingResult.chunks.length,
      });
      
      // Update document status and chunk count
      await db.update(documents)
        .set({ 
          status: 'processed',
          processedAt: new Date(),
          chunkCount: chunkingResult.chunks.length
        })
        .where(eq(documents.id, req.documentID));
      
      // Complete processing
      await updateProcessingStage(req.documentID, "indexing", "completed");
      await updateOverallStatus(req.documentID, "completed", 100);
      
      console.log(`Successfully processed document ${req.documentID} with ${chunkingResult.chunks.length} chunks`);
      
      logger.info("Document processing completed successfully", {
        documentID: req.documentID,
        chunksCreated: chunkingResult.chunks.length,
      });
      
      return {
        documentID: req.documentID,
        status: "completed",
        chunksCreated: chunkingResult.chunks.length,
        processingStage: "indexing",
        progressPercentage: 100,
      };
      
    } catch (error) {
      const errorMessage = `Document processing failed for ${req.documentID}`;
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          documentID: req.documentID,
          filePath: req.filePath,
          contentType: req.contentType,
        });
      } else {
        logger.error(errorMessage, {
          documentID: req.documentID,
          filePath: req.filePath,
          contentType: req.contentType,
          error: error,
        });
      }
      console.error(`Document processing failed for ${req.documentID}:`, error);
      
      // Update status to failed
      await updateDocumentStatusOnError(req.documentID, error);
      
      return {
        documentID: req.documentID,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown processing error",
      };
    }
  }
);

// Get processing status
export const getProcessingStatus = api(
  { expose: true, method: "GET", path: "/process/:documentID/status" },
  async ({ documentID }: { documentID: string }): Promise<ProcessingResponse> => {
    try {
      // Get processing status from database
      const statusResult = await db.select()
        .from(documentProcessingStatus)
        .where(eq(documentProcessingStatus.documentId, documentID))
        .limit(1);
      
      if (statusResult.length === 0) {
        // Check if document exists
        const docResult = await db.select({ status: documents.status, chunkCount: documents.chunkCount })
          .from(documents)
          .where(eq(documents.id, documentID))
          .limit(1);
        
        if (docResult.length === 0) {
          throw new Error('Document not found');
        }
        
        const doc = docResult[0];
        return {
          documentID,
          status: doc.status === 'processed' ? 'completed' : 
                 doc.status === 'failed' ? 'failed' : 'processing',
          chunksCreated: doc.chunkCount,
        };
      }
      
      const status = statusResult[0];
      return {
        documentID,
        status: status.overallStatus === 'completed' ? 'completed' :
               status.overallStatus === 'failed' ? 'failed' : 'processing',
        chunksCreated: status.metadata.chunkCount,
        processingStage: status.currentStage,
        progressPercentage: status.progressPercentage,
      };
      
    } catch (error) {
      console.error('Status check error:', error);
      throw new Error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Reprocess document
export const reprocessDocument = api(
  { expose: true, method: "POST", path: "/process/:documentID/reprocess" },
  async ({ documentID }: { documentID: string }): Promise<ProcessingResponse> => {
    try {
      logger.info("Received request to reprocess document", {
        documentID: documentID,
      });

      // Get document information
      const docResult = await db.select({
        filename: documents.filename,
        contentType: documents.contentType
      })
        .from(documents)
        .where(eq(documents.id, documentID))
        .limit(1);
      
      if (docResult.length === 0) {
        throw new Error('Document not found');
      }
      
      const document = docResult[0];
      
      // Delete existing chunks
      await db.delete(documentChunks).where(eq(documentChunks.documentId, documentID));
      logger.info("Existing chunks deleted for reprocessing", {
        documentID: documentID,
      });
      
      // Reset document status
      await db.update(documents)
        .set({ 
          status: 'processing',
          processedAt: null,
          chunkCount: 0
        })
        .where(eq(documents.id, documentID));

      logger.info("Document status reset for reprocessing", {
        documentID: documentID,
      });

      // Start reprocessing
      const processingRequest: ProcessingRequest = {
        documentID,
        filePath: document.filename,
        contentType: document.contentType,
      };
      
      return await processDocument(processingRequest);
      
    } catch (error) {
      console.error('Reprocessing error:', error);
      const errorMessage = `Document reprocessing failed for ${documentID}`;
      if (error instanceof Error) {
        logger.error(error, errorMessage, {
          documentID: documentID,
        });
      } else {
        logger.error(errorMessage, {
          documentID: documentID,
          error: error,
        });
      }
      throw new Error(`Reprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Helper function to initialize processing status
async function initializeProcessingStatus(documentId: string): Promise<void> {
  const statusId = `status_${nanoid(12)}`;
  const userId = 'system'; // TODO: Get from authentication when implemented
  
  const stages = {
    upload: { status: 'completed' as const, completedAt: new Date().toISOString() },
    parsing: { status: 'pending' as const },
    chunking: { status: 'pending' as const },
    embedding: { status: 'pending' as const },
    indexing: { status: 'pending' as const },
  };
  
  await db.insert(documentProcessingStatus).values({
    id: statusId,
    documentId,
    userId,
    currentStage: 'parsing',
    overallStatus: 'in_progress',
    stages,
    metadata: {},
    progressPercentage: 0,
  });
}

// Helper function to update processing stage
async function updateProcessingStage(
  documentId: string, 
  stage: string, 
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
): Promise<void> {
  const now = new Date().toISOString();
  
  // Calculate progress percentage
  const stageProgressMap = {
    parsing: 25,
    chunking: 50,
    embedding: 75,
    indexing: 100,
  };
  
  const progressPercentage = status === 'completed' ? stageProgressMap[stage as keyof typeof stageProgressMap] || 0 : 
                            status === 'in_progress' ? (stageProgressMap[stage as keyof typeof stageProgressMap] || 0) - 10 : 0;
  
  // Get current stages to preserve existing data
  const currentRecord = await db.select({ stages: documentProcessingStatus.stages })
    .from(documentProcessingStatus)
    .where(eq(documentProcessingStatus.documentId, documentId))
    .limit(1);
  
  let updatedStages = currentRecord.length > 0 ? currentRecord[0].stages : {};
  
  // Update the specific stage
  updatedStages[stage] = {
    status,
    startedAt: status === 'in_progress' ? now : updatedStages[stage]?.startedAt,
    completedAt: status === 'completed' ? now : undefined,
  };
  
  // Update the record
  await db.update(documentProcessingStatus)
    .set({
      currentStage: stage,
      progressPercentage,
      updatedAt: new Date(),
      stages: updatedStages,
    })
    .where(eq(documentProcessingStatus.documentId, documentId));
}

// Helper function to update overall status
async function updateOverallStatus(
  documentId: string, 
  status: 'completed' | 'failed', 
  progressPercentage: number
): Promise<void> {
  const updates: any = {
    overallStatus: status,
    progressPercentage,
    updatedAt: new Date(),
  };
  
  if (status === 'completed') {
    updates.completedAt = new Date();
  }
  
  await db.update(documentProcessingStatus)
    .set(updates)
    .where(eq(documentProcessingStatus.documentId, documentId));
}

// Helper function to download document from bucket
async function downloadDocumentFromBucket(bucketPath: string): Promise<Buffer> {
  try {
    const downloadResult = await downloadFromBucket({ bucketPath });
    return downloadResult.data;
  } catch (error) {
    const processingError: ProcessingError = {
      type: 'DOCUMENT_NOT_FOUND',
      message: `Failed to download document from bucket: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    throw processingError;
  }
}

// Helper function to parse document using Unstructured.io
async function parseDocument(fileBuffer: Buffer, contentType: string): Promise<UnstructuredResponse> {
  try {
    const formData = new FormData();
    formData.append('files', new Blob([fileBuffer], { type: contentType }), 'document');
    formData.append('strategy', 'auto');
    formData.append('extract_image_block_types', JSON.stringify(['Image', 'Table']));
    formData.append('coordinates', 'true');
    formData.append('output_format', 'application/json');
    
    const response = await fetch('https://api.unstructured.io/general/v0/general', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${unstructuredApiKey()}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unstructured.io API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result || !Array.isArray(result)) {
      throw new Error('Invalid response format from Unstructured.io API');
    }
    
    return { elements: result };
    
  } catch (error) {
    console.error('Document parsing error:', error);
    const processingError: ProcessingError = {
      type: 'PARSING_FAILED',
      message: error instanceof Error ? error.message : 'Failed to parse document',
    };
    throw processingError;
  }
}

// Helper function to extract text from elements
function extractTextFromElements(elements: any[]): string {
  return elements
    .filter(el => el.text && el.text.trim().length > 0)
    .map(el => el.text.trim())
    .join('\n\n');
}

// Helper function to convert Unstructured.io elements to internal format
function convertToInternalElements(elements: any[]): ParsedElement[] {
  return elements
    .filter(el => el.text && el.text.trim().length > 0)
    .map(el => ({
      type: mapElementType(el.type),
      content: el.text.trim(),
      page: el.metadata?.page_number,
      confidence: 1.0, // Unstructured.io doesn't provide confidence scores
      bbox: el.metadata?.coordinates ? {
        x: el.metadata.coordinates.points?.[0]?.[0] || 0,
        y: el.metadata.coordinates.points?.[0]?.[1] || 0,
        width: 0, // Would need to calculate from coordinates
        height: 0,
      } : undefined,
    }));
}

// Helper function to map Unstructured.io element types to internal types
function mapElementType(type: string): 'title' | 'text' | 'table' | 'list' | 'header' | 'footer' {
  switch (type?.toLowerCase()) {
    case 'title':
    case 'headline':
      return 'title';
    case 'header':
      return 'header';
    case 'footer':
      return 'footer';
    case 'table':
      return 'table';
    case 'list':
    case 'list-item':
    case 'bulletedlist':
    case 'numberedlist':
      return 'list';
    default:
      return 'text';
  }
}

// Helper function to extract document metadata
function extractDocumentMetadata(elements: any[]): DocumentMetadata {
  const pageNumbers = elements
    .map(el => el.metadata?.page_number)
    .filter(page => typeof page === 'number');
  
  const maxPage = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
  const wordCount = elements.reduce((count, el) => {
    if (el.text) {
      return count + el.text.split(/\s+/).length;
    }
    return count;
  }, 0);
  
  return {
    pageCount: maxPage,
    wordCount,
    language: 'en', // Default to English, could be detected
    creationDate: new Date(),
    lastModified: new Date(),
  };
}

// Helper function to store chunks in database
async function storeChunksInDatabase(chunks: any[]): Promise<void> {
  try {
    const chunkInserts = chunks.map(chunk => ({
      id: chunk.id,
      documentId: chunk.documentId,
      content: chunk.content,
      embedding: chunk.embedding,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      tokenCount: chunk.tokenCount,
      metadata: chunk.metadata,
      createdAt: chunk.createdAt,
    }));
    
    // Insert chunks in batches to avoid memory issues
    const batchSize = 50;
    for (let i = 0; i < chunkInserts.length; i += batchSize) {
      const batch = chunkInserts.slice(i, i + batchSize);
      await db.insert(documentChunks).values(batch);
    }
    
  } catch (error) {
    console.error('Database storage error:', error);
    const processingError: ProcessingError = {
      type: 'STORAGE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to store chunks in database',
    };
    throw processingError;
  }
}

// Helper function to update document status on error
async function updateDocumentStatusOnError(documentId: string, error: any): Promise<void> {
  try {
    // Update document status
    await db.update(documents)
      .set({ status: 'failed' })
      .where(eq(documents.id, documentId));
    
    // Update processing status if exists
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    await db.update(documentProcessingStatus)
      .set({
        overallStatus: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(documentProcessingStatus.documentId, documentId));
      
  } catch (updateError) {
    console.error('Failed to update error status:', updateError);
  }
}
