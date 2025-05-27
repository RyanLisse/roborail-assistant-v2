import { secret } from "encore.dev/config";
import { downloadFromBucket } from "./storage";

// Encore secret for Unstructured.io API key
const unstructuredApiKey = secret("UnstructuredApiKey");

// Types for document parsing
export interface ParseRequest {
  documentId: string;
  bucketPath: string;
  contentType: string;
  fileName: string;
}

export interface ParseResponse {
  documentId: string;
  extractedText: string;
  metadata: DocumentMetadata;
  elements: ParsedElement[];
  processingTime: number;
  status: 'success' | 'error';
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  creationDate?: Date;
  lastModified?: Date;
}

export interface ParsedElement {
  type: 'title' | 'text' | 'table' | 'list' | 'header' | 'footer';
  content: string;
  page?: number;
  confidence?: number;
  bbox?: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParseError {
  type: 'UNSUPPORTED_FORMAT' | 'API_ERROR' | 'INVALID_DOCUMENT' | 'PROCESSING_FAILED';
  message: string;
  documentId?: string;
}

// Supported content types for parsing
const SUPPORTED_CONTENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
];

// Unstructured.io API endpoints
const UNSTRUCTURED_API_BASE = 'https://api.unstructured.io';
const PARTITION_ENDPOINT = `${UNSTRUCTURED_API_BASE}/general/v0/general`;

// Main parsing function
export async function parseDocument(request: ParseRequest): Promise<ParseResponse> {
  const startTime = Date.now();
  
  try {
    // Validate content type
    if (!isValidContentType(request.contentType)) {
      const error: ParseError = {
        type: 'UNSUPPORTED_FORMAT',
        message: `Unsupported file format: ${request.contentType}. Supported formats: ${SUPPORTED_CONTENT_TYPES.join(', ')}`,
        documentId: request.documentId,
      };
      throw error;
    }

    // Download file from bucket
    const fileData = await downloadFromBucket({ bucketPath: request.bucketPath });
    
    // Process document based on content type
    let parsedData;
    if (request.contentType === 'text/plain') {
      // Handle plain text files directly
      parsedData = await processPlainTextDocument(fileData.data, request);
    } else {
      // Use Unstructured.io for PDF, DOCX, etc.
      parsedData = await processWithUnstructured(fileData.data, request);
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Extract metadata from parsed data
    const metadata = extractMetadata(parsedData, fileData);

    // Extract structured elements
    const elements = extractElements(parsedData);

    // Combine all extracted text
    const extractedText = combineExtractedText(elements);

    const response: ParseResponse = {
      documentId: request.documentId,
      extractedText,
      metadata,
      elements,
      processingTime,
      status: 'success',
    };

    return response;

  } catch (error) {
    console.error('Document parsing error:', error);
    
    // If already a ParseError, re-throw as is
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }

    // Create a generic parsing error
    const parseError: ParseError = {
      type: 'PROCESSING_FAILED',
      message: error instanceof Error ? error.message : 'Unknown parsing error',
      documentId: request.documentId,
    };
    throw parseError;
  }
}

// Validate content type support
export function isValidContentType(contentType: string): boolean {
  return SUPPORTED_CONTENT_TYPES.includes(contentType);
}

// Process plain text documents
async function processPlainTextDocument(fileData: Buffer, request: ParseRequest) {
  const textContent = fileData.toString('utf-8');
  
  // Create simple structure for plain text
  return {
    elements: [
      {
        type: 'text',
        text: textContent,
        metadata: {
          filename: request.fileName,
        },
      },
    ],
  };
}

// Process documents using Unstructured.io API
async function processWithUnstructured(fileData: Buffer, request: ParseRequest) {
  try {
    // Prepare form data for Unstructured.io API
    const formData = new FormData();
    
    // Add the file as a blob
    const blob = new Blob([fileData], { type: request.contentType });
    formData.append('files', blob, request.fileName);
    
    // Add strategy parameter for better parsing
    formData.append('strategy', 'hi_res');
    
    // Add other parameters
    formData.append('extract_image_block_types', '["Image", "Table"]');
    formData.append('infer_table_structure', 'true');

    // Make API request to Unstructured.io
    const response = await fetch(PARTITION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${unstructuredApiKey()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: ParseError = {
        type: 'API_ERROR',
        message: `Unstructured.io API error: ${response.status} ${response.statusText} - ${errorText}`,
        documentId: request.documentId,
      };
      throw error;
    }

    const parsedData = await response.json();
    return parsedData;

  } catch (error) {
    console.error('Unstructured.io API error:', error);
    
    // If already a ParseError, re-throw
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }

    const parseError: ParseError = {
      type: 'API_ERROR',
      message: error instanceof Error ? error.message : 'Failed to call Unstructured.io API',
      documentId: request.documentId,
    };
    throw parseError;
  }
}

// Extract document metadata
function extractMetadata(parsedData: any, fileData: any): DocumentMetadata {
  const metadata: DocumentMetadata = {};

  // Extract word count from text
  const allText = combineExtractedText(extractElements(parsedData));
  metadata.wordCount = extractWordCount(allText);

  // Try to extract title from first title element
  if (parsedData.elements) {
    const titleElement = parsedData.elements.find((el: any) => 
      el.type === 'Title' || el.category === 'Title'
    );
    if (titleElement && titleElement.text) {
      metadata.title = titleElement.text;
    }
  }

  // Extract page count if available
  if (parsedData.elements) {
    const pages = new Set(
      parsedData.elements
        .map((el: any) => el.metadata?.page_number)
        .filter((page: any) => page !== undefined)
    );
    if (pages.size > 0) {
      metadata.pageCount = pages.size;
    }
  }

  // Set language (default to English for now)
  metadata.language = 'en';

  // Set last modified from file data if available
  if (fileData.lastModified) {
    metadata.lastModified = fileData.lastModified;
  }

  return metadata;
}

// Extract structured elements from parsed data
function extractElements(parsedData: any): ParsedElement[] {
  const elements: ParsedElement[] = [];

  if (parsedData.elements && Array.isArray(parsedData.elements)) {
    for (const element of parsedData.elements) {
      const parsedElement: ParsedElement = {
        type: mapElementType(element.type || element.category),
        content: element.text || element.content || '',
      };

      // Add page number if available
      if (element.metadata?.page_number) {
        parsedElement.page = element.metadata.page_number;
      }

      // Add confidence if available
      if (element.metadata?.detection_class_prob) {
        parsedElement.confidence = element.metadata.detection_class_prob;
      }

      // Add bounding box if available
      if (element.metadata?.coordinates) {
        const coords = element.metadata.coordinates;
        parsedElement.bbox = {
          x: coords.layout_width || 0,
          y: coords.layout_height || 0,
          width: coords.layout_width || 0,
          height: coords.layout_height || 0,
        };
      }

      elements.push(parsedElement);
    }
  }

  return elements;
}

// Map Unstructured.io element types to our types
function mapElementType(unstructuredType: string): ParsedElement['type'] {
  const typeMap: Record<string, ParsedElement['type']> = {
    'Title': 'title',
    'NarrativeText': 'text',
    'Text': 'text',
    'Table': 'table',
    'ListItem': 'list',
    'Header': 'header',
    'Footer': 'footer',
  };

  return typeMap[unstructuredType] || 'text';
}

// Combine all extracted text from elements
function combineExtractedText(elements: ParsedElement[]): string {
  return elements
    .map(element => element.content)
    .filter(content => content && content.trim().length > 0)
    .join('\n\n');
}

// Extract word count from text
export function extractWordCount(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// Helper function to determine if document needs OCR
function needsOCR(contentType: string): boolean {
  // For now, we'll let Unstructured.io decide based on content
  return contentType === 'application/pdf';
}

// Helper function to validate parsed response
function validateParseResponse(data: any): boolean {
  return data && (data.elements || data.text || data.content);
}