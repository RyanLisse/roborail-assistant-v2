import { secret } from "encore.dev/config";

// Encore secret for Cohere API key
const cohereApiKey = secret("CohereApiKey");

// Types for semantic chunking and embedding
export interface ChunkingRequest {
  documentId: string;
  extractedText: string;
  elements: ParsedElement[];
  metadata: DocumentMetadata;
}

export interface ChunkingResponse {
  documentId: string;
  chunks: DocumentChunk[];
  totalChunks: number;
  processingTime: number;
  status: 'success' | 'error';
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  pageNumber?: number;
  tokenCount: number;
  metadata: ChunkMetadata;
  createdAt: Date;
}

export interface ChunkMetadata {
  elementTypes: string[];
  semanticCategory?: string;
  importance?: number;
  parentElement?: string;
  relationships?: string[];
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

export interface EmbeddingRequest {
  texts: string[];
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}

export interface ChunkingError {
  type: 'CHUNKING_FAILED' | 'EMBEDDING_FAILED' | 'API_ERROR' | 'INVALID_INPUT';
  message: string;
  documentId?: string;
}

// Cohere API configuration
const COHERE_API_BASE = 'https://api.cohere.ai';
const EMBED_ENDPOINT = `${COHERE_API_BASE}/v1/embed`;

// Chunking configuration
const DEFAULT_MAX_CHUNK_SIZE = 1000; // tokens
const DEFAULT_MIN_CHUNK_SIZE = 100; // tokens
const OPTIMAL_CHUNK_SIZE = 500; // tokens
const MAX_EMBEDDING_BATCH_SIZE = 96; // Cohere's limit

// Main processing function
export async function processDocumentChunking(request: ChunkingRequest): Promise<ChunkingResponse> {
  const startTime = Date.now();
  
  try {
    // Validate input
    validateChunkingRequest(request);

    // Create semantic chunks from the extracted text
    const chunks = await createSemanticChunks(request);
    
    // Generate embeddings for all chunks
    const texts = chunks.map(chunk => chunk.content);
    const embeddingResponse = await generateEmbeddings({
      texts,
      inputType: 'search_document',
    });

    // Assign embeddings to chunks
    chunks.forEach((chunk, index) => {
      chunk.embedding = embeddingResponse.embeddings[index];
    });

    const processingTime = Date.now() - startTime;

    console.log(`Processed ${chunks.length} chunks for document ${request.documentId} in ${processingTime}ms`);

    return {
      documentId: request.documentId,
      chunks,
      totalChunks: chunks.length,
      processingTime,
      status: 'success',
    };

  } catch (error) {
    console.error('Document chunking error:', error);
    
    // If already a ChunkingError, re-throw as is
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    const chunkingError: ChunkingError = {
      type: 'CHUNKING_FAILED',
      message: error instanceof Error ? error.message : 'Unknown chunking error',
      documentId: request.documentId,
    };
    throw chunkingError;
  }
}

// Validate chunking request
function validateChunkingRequest(request: ChunkingRequest): void {
  if (!request.documentId || request.documentId.trim().length === 0) {
    const error: ChunkingError = {
      type: 'INVALID_INPUT',
      message: 'Document ID is required',
    };
    throw error;
  }

  if (!request.extractedText || request.extractedText.trim().length === 0) {
    const error: ChunkingError = {
      type: 'INVALID_INPUT',
      message: 'Extracted text is required and cannot be empty',
      documentId: request.documentId,
    };
    throw error;
  }

  if (!request.elements || !Array.isArray(request.elements)) {
    const error: ChunkingError = {
      type: 'INVALID_INPUT',
      message: 'Elements array is required',
      documentId: request.documentId,
    };
    throw error;
  }
}

// Create semantic chunks from extracted text and elements
async function createSemanticChunks(request: ChunkingRequest): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  
  try {
    // Strategy 1: Use element-based chunking for structured content
    if (hasStructuredElements(request.elements)) {
      return await createElementBasedChunks(request);
    }
    
    // Strategy 2: Use sentence-based semantic chunking for plain text
    return await createSentenceBasedChunks(request);
    
  } catch (error) {
    console.error('Error creating semantic chunks:', error);
    throw error;
  }
}

// Check if document has structured elements
function hasStructuredElements(elements: ParsedElement[]): boolean {
  const structuredTypes = ['title', 'header', 'table', 'list'];
  return elements.some(el => structuredTypes.includes(el.type));
}

// Create chunks based on document elements
async function createElementBasedChunks(request: ChunkingRequest): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;
  
  // Group elements by semantic proximity
  const elementGroups = groupElementsBySemantics(request.elements);
  
  for (const group of elementGroups) {
    const content = group.map(el => el.content).join('\n\n');
    const tokenCount = estimateTokenCount(content);
    
    // If group is too large, split it further
    if (tokenCount > DEFAULT_MAX_CHUNK_SIZE) {
      const subChunks = await splitLargeContent(content, group, request.documentId, chunkIndex);
      chunks.push(...subChunks);
      chunkIndex += subChunks.length;
    } else if (tokenCount >= DEFAULT_MIN_CHUNK_SIZE) {
      // Create chunk from this group
      const chunk = createChunk(request.documentId, content, chunkIndex, group);
      chunks.push(chunk);
      chunkIndex++;
    } else {
      // Group is too small, try to merge with next group or create anyway
      const chunk = createChunk(request.documentId, content, chunkIndex, group);
      chunks.push(chunk);
      chunkIndex++;
    }
  }
  
  return chunks;
}

// Group elements by semantic similarity and proximity
function groupElementsBySemantics(elements: ParsedElement[]): ParsedElement[][] {
  const groups: ParsedElement[][] = [];
  let currentGroup: ParsedElement[] = [];
  
  for (const element of elements) {
    // Start new group for titles and headers
    if ((element.type === 'title' || element.type === 'header') && currentGroup.length > 0) {
      groups.push([...currentGroup]);
      currentGroup = [element];
    }
    // Tables and lists get their own groups
    else if (element.type === 'table' || element.type === 'list') {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
      groups.push([element]);
    }
    // Add to current group
    else {
      currentGroup.push(element);
    }
  }
  
  // Add remaining group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups.filter(group => group.length > 0);
}

// Create sentence-based chunks for plain text
async function createSentenceBasedChunks(request: ChunkingRequest): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  
  // Split text into sentences
  const sentences = splitIntoSentences(request.extractedText);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const sentence of sentences) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    const tokenCount = estimateTokenCount(potentialChunk);
    
    // If adding this sentence would exceed optimal chunk size
    if (tokenCount > OPTIMAL_CHUNK_SIZE && currentChunk.length > 0) {
      // Create chunk from current content
      const chunk = createChunk(request.documentId, currentChunk, chunkIndex, request.elements);
      chunks.push(chunk);
      currentChunk = sentence;
      chunkIndex++;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // Add remaining content as final chunk
  if (currentChunk.trim().length > 0) {
    const chunk = createChunk(request.documentId, currentChunk, chunkIndex, request.elements);
    chunks.push(chunk);
  }
  
  return chunks;
}

// Split large content into smaller chunks
async function splitLargeContent(
  content: string, 
  elements: ParsedElement[], 
  documentId: string, 
  startIndex: number
): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  const sentences = splitIntoSentences(content);
  
  let currentChunk = '';
  let chunkIndex = startIndex;
  
  for (const sentence of sentences) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    const tokenCount = estimateTokenCount(potentialChunk);
    
    if (tokenCount > DEFAULT_MAX_CHUNK_SIZE && currentChunk.length > 0) {
      const chunk = createChunk(documentId, currentChunk, chunkIndex, elements);
      chunks.push(chunk);
      currentChunk = sentence;
      chunkIndex++;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    const chunk = createChunk(documentId, currentChunk, chunkIndex, elements);
    chunks.push(chunk);
  }
  
  return chunks;
}

// Split text into sentences using multiple delimiters
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation, but preserve abbreviations
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences;
}

// Create a document chunk
function createChunk(
  documentId: string, 
  content: string, 
  index: number, 
  elements: ParsedElement[]
): DocumentChunk {
  const tokenCount = estimateTokenCount(content);
  
  // Find relevant element types for this chunk
  const relevantElements = findRelevantElements(content, elements);
  const elementTypes = [...new Set(relevantElements.map(el => el.type))];
  
  // Get page number from most relevant element
  const pageNumber = relevantElements.length > 0 
    ? relevantElements[0].page || 1 
    : 1;
  
  return {
    id: `chunk_${documentId}_${index}`,
    documentId,
    content: content.trim(),
    embedding: [], // Will be filled by embedding generation
    chunkIndex: index,
    pageNumber,
    tokenCount,
    metadata: {
      elementTypes: elementTypes.length > 0 ? elementTypes : ['text'],
      semanticCategory: inferSemanticCategory(content, elementTypes),
      importance: calculateImportance(content, elementTypes),
      parentElement: relevantElements.length > 0 ? relevantElements[0].type : undefined,
    },
    createdAt: new Date(),
  };
}

// Find elements relevant to the given content
function findRelevantElements(content: string, elements: ParsedElement[]): ParsedElement[] {
  const relevant: ParsedElement[] = [];
  
  for (const element of elements) {
    // Check if element content appears in chunk content
    const elementWords = element.content.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // If most words from element appear in content, consider it relevant
    const matchingWords = elementWords.filter(word => 
      word.length > 2 && contentLower.includes(word)
    );
    
    if (matchingWords.length >= Math.min(3, elementWords.length * 0.5)) {
      relevant.push(element);
    }
  }
  
  return relevant;
}

// Infer semantic category from content and element types
function inferSemanticCategory(content: string, elementTypes: string[]): string {
  const contentLower = content.toLowerCase();
  
  if (elementTypes.includes('title')) return 'title';
  if (elementTypes.includes('header')) return 'section_header';
  if (elementTypes.includes('table')) return 'data_table';
  if (elementTypes.includes('list')) return 'list_content';
  
  // Content-based inference
  if (contentLower.includes('introduction') || contentLower.includes('abstract')) return 'introduction';
  if (contentLower.includes('conclusion') || contentLower.includes('summary')) return 'conclusion';
  if (contentLower.includes('method') || contentLower.includes('approach')) return 'methodology';
  if (contentLower.includes('result') || contentLower.includes('finding')) return 'results';
  if (contentLower.includes('reference') || contentLower.includes('citation')) return 'references';
  
  return 'content';
}

// Calculate importance score for content
function calculateImportance(content: string, elementTypes: string[]): number {
  let importance = 0.5; // base importance
  
  // Type-based importance
  if (elementTypes.includes('title')) importance += 0.4;
  if (elementTypes.includes('header')) importance += 0.3;
  if (elementTypes.includes('table')) importance += 0.2;
  if (elementTypes.includes('list')) importance += 0.1;
  
  // Content-based importance
  const contentLower = content.toLowerCase();
  if (contentLower.includes('important') || contentLower.includes('key')) importance += 0.1;
  if (contentLower.includes('conclusion') || contentLower.includes('summary')) importance += 0.2;
  if (contentLower.includes('introduction') || contentLower.includes('abstract')) importance += 0.2;
  
  // Length-based importance (longer content might be more important)
  const words = content.split(/\s+/).length;
  if (words > 100) importance += 0.1;
  if (words > 200) importance += 0.1;
  
  return Math.min(1.0, importance);
}

// Generate embeddings using Cohere API
export async function generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
  try {
    // Validate input
    if (!request.texts || request.texts.length === 0) {
      const error: ChunkingError = {
        type: 'INVALID_INPUT',
        message: 'Texts array cannot be empty',
      };
      throw error;
    }

    // Process in batches if necessary
    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    for (let i = 0; i < request.texts.length; i += MAX_EMBEDDING_BATCH_SIZE) {
      const batch = request.texts.slice(i, i + MAX_EMBEDDING_BATCH_SIZE);
      const batchResponse = await generateEmbeddingBatch(batch, request.inputType || 'search_document');
      
      allEmbeddings.push(...batchResponse.embeddings);
      totalTokens += batchResponse.usage.totalTokens;
    }

    return {
      embeddings: allEmbeddings,
      model: 'embed-english-v4.0',
      usage: {
        totalTokens,
      },
    };

  } catch (error) {
    console.error('Embedding generation error:', error);
    
    // If already a ChunkingError, re-throw as is
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    const embeddingError: ChunkingError = {
      type: 'EMBEDDING_FAILED',
      message: error instanceof Error ? error.message : 'Unknown embedding error',
    };
    throw embeddingError;
  }
}

// Generate embeddings for a single batch
async function generateEmbeddingBatch(texts: string[], inputType: string): Promise<EmbeddingResponse> {
  try {
    const requestBody = {
      model: 'embed-english-v4.0',
      texts: texts,
      input_type: inputType,
      embedding_types: ['float'],
    };

    const response = await fetch(EMBED_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohereApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: ChunkingError = {
        type: 'API_ERROR',
        message: `Cohere API error: ${response.status} ${response.statusText} - ${errorText}`,
      };
      throw error;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      const error: ChunkingError = {
        type: 'API_ERROR',
        message: 'Invalid response format from Cohere API',
      };
      throw error;
    }

    // Calculate token usage
    const totalTokens = texts.reduce((sum, text) => sum + estimateTokenCount(text), 0);

    return {
      embeddings: data.embeddings,
      model: data.response_type || 'embed-english-v4.0',
      usage: {
        totalTokens,
      },
    };

  } catch (error) {
    console.error('Cohere API error:', error);
    
    // If already a ChunkingError, re-throw
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }

    const apiError: ChunkingError = {
      type: 'API_ERROR',
      message: error instanceof Error ? error.message : 'Failed to call Cohere API',
    };
    throw apiError;
  }
}

// Estimate token count for text (rough approximation)
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  
  // More accurate estimation considering:
  // - Average English word is ~4.5 characters
  // - Tokens are often sub-word units
  // - Punctuation and spaces affect tokenization
  
  const words = text.trim().split(/\s+/).length;
  const characters = text.length;
  
  // Use a heuristic that accounts for both word count and character count
  const wordBasedEstimate = words * 1.3; // ~1.3 tokens per word on average
  const charBasedEstimate = characters / 3.5; // ~3.5 characters per token on average
  
  // Take the average of both estimates
  return Math.ceil((wordBasedEstimate + charBasedEstimate) / 2);
}

// Helper function to clean and prepare text for embedding
export function prepareTextForEmbedding(text: string): string {
  // Remove excessive whitespace and normalize
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 8000); // Cohere has input length limits
}

// Utility function to calculate semantic similarity between chunks
export function calculateChunkSimilarity(chunk1: DocumentChunk, chunk2: DocumentChunk): number {
  if (!chunk1.embedding || !chunk2.embedding) {
    return 0;
  }
  
  // Calculate cosine similarity
  return cosineSimilarity(chunk1.embedding, chunk2.embedding);
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}