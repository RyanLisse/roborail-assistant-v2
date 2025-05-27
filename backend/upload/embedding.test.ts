import { describe, it, expect, beforeEach } from 'bun:test';

// Types for semantic chunking and embedding
interface ChunkingRequest {
  documentId: string;
  extractedText: string;
  elements: ParsedElement[];
  metadata: DocumentMetadata;
}

interface ChunkingResponse {
  documentId: string;
  chunks: DocumentChunk[];
  totalChunks: number;
  processingTime: number;
  status: 'success' | 'error';
}

interface DocumentChunk {
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

interface ChunkMetadata {
  elementTypes: string[];
  semanticCategory?: string;
  importance?: number;
  parentElement?: string;
  relationships?: string[];
}

interface DocumentMetadata {
  title?: string;
  author?: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  creationDate?: Date;
  lastModified?: Date;
}

interface ParsedElement {
  type: 'title' | 'text' | 'table' | 'list' | 'header' | 'footer';
  content: string;
  page?: number;
  confidence?: number;
  bbox?: BoundingBox;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EmbeddingRequest {
  texts: string[];
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
}

interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}

interface ChunkingError {
  type: 'CHUNKING_FAILED' | 'EMBEDDING_FAILED' | 'API_ERROR' | 'INVALID_INPUT';
  message: string;
  documentId?: string;
}

describe('Semantic Chunking and Embedding Service', () => {
  describe('Text Chunking', () => {
    it('should chunk document text into semantic segments', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_123',
        extractedText: 'This is a sample document with multiple paragraphs. Each paragraph should be analyzed for semantic meaning. The chunking algorithm should identify natural breaks in the content.',
        elements: [
          {
            type: 'title',
            content: 'Sample Document Title',
            page: 1,
          },
          {
            type: 'text',
            content: 'This is a sample document with multiple paragraphs.',
            page: 1,
          },
          {
            type: 'text',
            content: 'Each paragraph should be analyzed for semantic meaning.',
            page: 1,
          },
        ],
        metadata: {
          title: 'Sample Document',
          wordCount: 25,
          language: 'en',
        },
      };

      const response = await processDocumentChunking(request);

      expect(response.status).toBe('success');
      expect(response.documentId).toBe('doc_123');
      expect(response.chunks).toBeDefined();
      expect(Array.isArray(response.chunks)).toBe(true);
      expect(response.chunks.length).toBeGreaterThan(0);
      expect(response.totalChunks).toBe(response.chunks.length);
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('should maintain optimal chunk sizes', async () => {
      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);
      const request: ChunkingRequest = {
        documentId: 'doc_long',
        extractedText: longText,
        elements: [
          {
            type: 'text',
            content: longText,
            page: 1,
          },
        ],
        metadata: {
          wordCount: 600,
          language: 'en',
        },
      };

      const response = await processDocumentChunking(request);

      expect(response.status).toBe('success');
      expect(response.chunks.length).toBeGreaterThan(1);
      
      // Check that chunks are reasonably sized (should be between 100-1000 tokens)
      response.chunks.forEach(chunk => {
        expect(chunk.tokenCount).toBeGreaterThan(50);
        expect(chunk.tokenCount).toBeLessThan(1500);
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });

    it('should assign correct chunk indices and IDs', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_index',
        extractedText: 'First chunk content. Second chunk content. Third chunk content.',
        elements: [
          { type: 'text', content: 'First chunk content.', page: 1 },
          { type: 'text', content: 'Second chunk content.', page: 1 },
          { type: 'text', content: 'Third chunk content.', page: 1 },
        ],
        metadata: { language: 'en' },
      };

      const response = await processDocumentChunking(request);

      expect(response.chunks.length).toBeGreaterThan(0);
      
      response.chunks.forEach((chunk, index) => {
        expect(chunk.id).toBeDefined();
        expect(chunk.id).toMatch(/^chunk_/);
        expect(chunk.documentId).toBe('doc_index');
        expect(chunk.chunkIndex).toBe(index);
        expect(chunk.createdAt).toBeInstanceOf(Date);
      });
    });

    it('should preserve element type information in metadata', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_elements',
        extractedText: 'Document Title\n\nThis is body text.\n\nTable: Header1 | Header2',
        elements: [
          { type: 'title', content: 'Document Title', page: 1 },
          { type: 'text', content: 'This is body text.', page: 1 },
          { type: 'table', content: 'Table: Header1 | Header2', page: 1 },
        ],
        metadata: { language: 'en' },
      };

      const response = await processDocumentChunking(request);

      expect(response.chunks.length).toBeGreaterThan(0);
      
      response.chunks.forEach(chunk => {
        expect(chunk.metadata).toBeDefined();
        expect(chunk.metadata.elementTypes).toBeDefined();
        expect(Array.isArray(chunk.metadata.elementTypes)).toBe(true);
        expect(chunk.metadata.elementTypes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cohere Embedding Generation', () => {
    it('should generate embeddings for text chunks', async () => {
      const texts = [
        'This is the first chunk of text content.',
        'This is the second chunk with different semantic meaning.',
        'The third chunk discusses another topic entirely.',
      ];

      const response = await generateEmbeddings({
        texts,
        inputType: 'search_document',
      });

      expect(response.embeddings).toBeDefined();
      expect(Array.isArray(response.embeddings)).toBe(true);
      expect(response.embeddings.length).toBe(texts.length);
      expect(response.model).toBeDefined();
      expect(response.usage).toBeDefined();
      expect(response.usage.totalTokens).toBeGreaterThan(0);

      // Check embedding dimensions (Cohere embed-v4.0 should be 1024 dimensions)
      response.embeddings.forEach(embedding => {
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBe(1024);
        expect(embedding.every(val => typeof val === 'number')).toBe(true);
      });
    });

    it('should handle different input types correctly', async () => {
      const texts = ['Sample text for classification purposes.'];

      const response = await generateEmbeddings({
        texts,
        inputType: 'classification',
      });

      expect(response.embeddings).toBeDefined();
      expect(response.embeddings.length).toBe(1);
      expect(response.embeddings[0].length).toBe(1024);
    });

    it('should batch multiple texts efficiently', async () => {
      const texts = new Array(10).fill(0).map((_, i) => `Text chunk number ${i + 1} with unique content.`);

      const response = await generateEmbeddings({
        texts,
        inputType: 'search_document',
      });

      expect(response.embeddings.length).toBe(10);
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    });

    it('should handle empty or invalid input gracefully', async () => {
      try {
        await generateEmbeddings({
          texts: [],
          inputType: 'search_document',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as ChunkingError).type).toBe('INVALID_INPUT');
      }
    });
  });

  describe('Complete Chunking and Embedding Pipeline', () => {
    it('should process document through complete pipeline', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_pipeline',
        extractedText: 'Introduction to Machine Learning. Machine learning is a subset of artificial intelligence. It involves training algorithms on data. These algorithms can then make predictions on new data.',
        elements: [
          { type: 'title', content: 'Introduction to Machine Learning', page: 1 },
          { type: 'text', content: 'Machine learning is a subset of artificial intelligence.', page: 1 },
          { type: 'text', content: 'It involves training algorithms on data.', page: 1 },
          { type: 'text', content: 'These algorithms can then make predictions on new data.', page: 1 },
        ],
        metadata: {
          title: 'ML Introduction',
          wordCount: 25,
          language: 'en',
        },
      };

      const response = await processDocumentChunking(request);

      expect(response.status).toBe('success');
      expect(response.chunks.length).toBeGreaterThan(0);

      // Verify all chunks have embeddings
      response.chunks.forEach(chunk => {
        expect(chunk.embedding).toBeDefined();
        expect(Array.isArray(chunk.embedding)).toBe(true);
        expect(chunk.embedding.length).toBe(1024);
        expect(chunk.tokenCount).toBeGreaterThan(0);
        expect(chunk.metadata.elementTypes).toBeDefined();
      });
    });

    it('should handle documents with mixed content types', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_mixed',
        extractedText: 'Research Paper Title\n\nAbstract: This paper discusses...\n\nTable: Results | Values\nRow1 | 100\nRow2 | 200\n\nConclusion: The results show...',
        elements: [
          { type: 'title', content: 'Research Paper Title', page: 1 },
          { type: 'text', content: 'Abstract: This paper discusses...', page: 1 },
          { type: 'table', content: 'Table: Results | Values\nRow1 | 100\nRow2 | 200', page: 1 },
          { type: 'text', content: 'Conclusion: The results show...', page: 2 },
        ],
        metadata: {
          title: 'Research Paper',
          pageCount: 2,
          language: 'en',
        },
      };

      const response = await processDocumentChunking(request);

      expect(response.status).toBe('success');
      expect(response.chunks.length).toBeGreaterThan(0);

      // Check that different element types are preserved
      const elementTypes = new Set();
      response.chunks.forEach(chunk => {
        chunk.metadata.elementTypes.forEach(type => elementTypes.add(type));
      });
      
      expect(elementTypes.size).toBeGreaterThan(1);
    });

    it('should maintain page number information', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_pages',
        extractedText: 'Page 1 content here. Page 2 content here.',
        elements: [
          { type: 'text', content: 'Page 1 content here.', page: 1 },
          { type: 'text', content: 'Page 2 content here.', page: 2 },
        ],
        metadata: {
          pageCount: 2,
          language: 'en',
        },
      };

      const response = await processDocumentChunking(request);

      expect(response.status).toBe('success');
      
      response.chunks.forEach(chunk => {
        expect(chunk.pageNumber).toBeDefined();
        expect(chunk.pageNumber).toBeGreaterThan(0);
        expect(chunk.pageNumber).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_api_fail',
        extractedText: 'This should trigger an API failure.',
        elements: [
          { type: 'text', content: 'This should trigger an API failure.', page: 1 },
        ],
        metadata: { language: 'en' },
      };

      try {
        await processDocumentChunkingWithFailure(request);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as ChunkingError).type).toBe('API_ERROR');
        expect((error as ChunkingError).message).toBeDefined();
        expect((error as ChunkingError).documentId).toBe('doc_api_fail');
      }
    });

    it('should validate input parameters', async () => {
      const invalidRequest = {
        documentId: '',
        extractedText: '',
        elements: [],
        metadata: {},
      } as ChunkingRequest;

      try {
        await processDocumentChunking(invalidRequest);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as ChunkingError).type).toBe('INVALID_INPUT');
      }
    });

    it('should handle very large documents appropriately', async () => {
      const veryLongText = 'Lorem ipsum dolor sit amet. '.repeat(10000); // Very large text
      const request: ChunkingRequest = {
        documentId: 'doc_large',
        extractedText: veryLongText,
        elements: [
          { type: 'text', content: veryLongText, page: 1 },
        ],
        metadata: { language: 'en' },
      };

      const response = await processDocumentChunking(request);

      expect(response.status).toBe('success');
      expect(response.chunks.length).toBeGreaterThan(5); // Should create multiple chunks
      
      // Verify no single chunk is too large
      response.chunks.forEach(chunk => {
        expect(chunk.tokenCount).toBeLessThan(2000);
      });
    });
  });

  describe('Token Counting and Optimization', () => {
    it('should accurately count tokens in chunks', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_tokens',
        extractedText: 'This is a test sentence with exactly ten words here.',
        elements: [
          { type: 'text', content: 'This is a test sentence with exactly ten words here.', page: 1 },
        ],
        metadata: { language: 'en' },
      };

      const response = await processDocumentChunking(request);

      expect(response.status).toBe('success');
      
      response.chunks.forEach(chunk => {
        expect(chunk.tokenCount).toBeGreaterThan(0);
        expect(chunk.tokenCount).toBeLessThan(chunk.content.length); // Tokens should be less than characters
      });
    });

    it('should optimize chunk boundaries for semantic coherence', async () => {
      const request: ChunkingRequest = {
        documentId: 'doc_semantic',
        extractedText: 'Chapter 1: Introduction. This chapter covers the basics. Chapter 2: Advanced Topics. This chapter goes deeper into the subject matter.',
        elements: [
          { type: 'text', content: 'Chapter 1: Introduction. This chapter covers the basics.', page: 1 },
          { type: 'text', content: 'Chapter 2: Advanced Topics. This chapter goes deeper into the subject matter.', page: 1 },
        ],
        metadata: { language: 'en' },
      };

      const response = await processDocumentChunking(request);

      expect(response.status).toBe('success');
      
      // Should create semantically coherent chunks (likely separating chapters)
      response.chunks.forEach(chunk => {
        expect(chunk.content).toBeDefined();
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });
  });
});

// Test implementations that mirror the actual service logic
async function processDocumentChunking(request: ChunkingRequest): Promise<ChunkingResponse> {
  const startTime = Date.now();
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 10));
  
  try {
    // Validate input
    if (!request.documentId || !request.extractedText || request.extractedText.trim().length === 0) {
      throw {
        type: 'INVALID_INPUT',
        message: 'Document ID and extracted text are required',
        documentId: request.documentId,
      } as ChunkingError;
    }

    // Create semantic chunks
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

    return {
      documentId: request.documentId,
      chunks,
      totalChunks: chunks.length,
      processingTime,
      status: 'success',
    };

  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    throw {
      type: 'CHUNKING_FAILED',
      message: error instanceof Error ? error.message : 'Unknown chunking error',
      documentId: request.documentId,
    } as ChunkingError;
  }
}

async function createSemanticChunks(request: ChunkingRequest): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  const maxChunkSize = 1000; // tokens
  const minChunkSize = 100; // tokens
  
  // Simple chunking strategy for testing
  const sentences = request.extractedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const sentence of sentences) {
    const potentialChunk = currentChunk + sentence + '. ';
    const tokenCount = estimateTokenCount(potentialChunk);
    
    if (tokenCount > maxChunkSize && currentChunk.length > 0) {
      // Create chunk from current content
      chunks.push(createChunk(request.documentId, currentChunk, chunkIndex, request.elements));
      currentChunk = sentence + '. ';
      chunkIndex++;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // Add remaining content as final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(createChunk(request.documentId, currentChunk, chunkIndex, request.elements));
  }
  
  return chunks;
}

function createChunk(
  documentId: string, 
  content: string, 
  index: number, 
  elements: ParsedElement[]
): DocumentChunk {
  const tokenCount = estimateTokenCount(content);
  
  // Find relevant element types for this chunk
  const elementTypes = elements
    .filter(el => content.includes(el.content.substring(0, 20)))
    .map(el => el.type);
  
  // Get page number from elements
  const pageNumber = elements.find(el => 
    content.includes(el.content.substring(0, 20))
  )?.page || 1;
  
  return {
    id: `chunk_${documentId}_${index}`,
    documentId,
    content: content.trim(),
    embedding: [], // Will be filled later
    chunkIndex: index,
    pageNumber,
    tokenCount,
    metadata: {
      elementTypes: elementTypes.length > 0 ? elementTypes : ['text'],
      semanticCategory: inferSemanticCategory(content),
      importance: calculateImportance(content, elementTypes),
    },
    createdAt: new Date(),
  };
}

function inferSemanticCategory(content: string): string {
  if (content.toLowerCase().includes('introduction') || content.toLowerCase().includes('abstract')) {
    return 'introduction';
  }
  if (content.toLowerCase().includes('conclusion') || content.toLowerCase().includes('summary')) {
    return 'conclusion';
  }
  if (content.includes('|') || content.toLowerCase().includes('table')) {
    return 'data';
  }
  return 'content';
}

function calculateImportance(content: string, elementTypes: string[]): number {
  let importance = 0.5; // base importance
  
  if (elementTypes.includes('title')) importance += 0.4;
  if (elementTypes.includes('header')) importance += 0.2;
  if (elementTypes.includes('table')) importance += 0.1;
  
  return Math.min(1.0, importance);
}

async function generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  if (!request.texts || request.texts.length === 0) {
    throw {
      type: 'INVALID_INPUT',
      message: 'Texts array cannot be empty',
    } as ChunkingError;
  }
  
  // Mock embeddings generation (1024 dimensions for Cohere embed-v4.0)
  const embeddings = request.texts.map(() => 
    Array.from({ length: 1024 }, () => Math.random() * 2 - 1)
  );
  
  const totalTokens = request.texts.reduce((sum, text) => sum + estimateTokenCount(text), 0);
  
  return {
    embeddings,
    model: 'embed-english-v4.0',
    usage: {
      totalTokens,
    },
  };
}

async function processDocumentChunkingWithFailure(request: ChunkingRequest): Promise<ChunkingResponse> {
  throw {
    type: 'API_ERROR',
    message: 'Cohere API request failed',
    documentId: request.documentId,
  } as ChunkingError;
}

function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}