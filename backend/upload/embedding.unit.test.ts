import { describe, it, expect } from 'vitest';

// Test utility functions without Encore dependencies
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

describe('Embedding Service Unit Tests', () => {
  describe('Token Estimation', () => {
    it('should estimate token count accurately for simple text', () => {
      const text = 'Hello world';
      const count = estimateTokenCount(text);
      
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10); // Should be around 2-3 tokens
    });

    it('should handle empty text', () => {
      expect(estimateTokenCount('')).toBe(0);
      expect(estimateTokenCount('   ')).toBe(0);
    });

    it('should scale appropriately with text length', () => {
      const shortText = 'Hello';
      const longText = 'Hello world this is a much longer sentence with more words';
      
      const shortCount = estimateTokenCount(shortText);
      const longCount = estimateTokenCount(longText);
      
      expect(longCount).toBeGreaterThan(shortCount);
    });

    it('should handle complex text with punctuation', () => {
      const complexText = 'Hello, world! How are you today? I hope you\'re doing well.';
      const count = estimateTokenCount(complexText);
      
      expect(count).toBeGreaterThan(5);
      expect(count).toBeLessThan(25);
    });
  });

  describe('Text Preparation', () => {
    it('should normalize whitespace', () => {
      const text = 'Hello    world\n\nThis   has   extra   spaces';
      const prepared = prepareTextForEmbedding(text);
      
      expect(prepared).toBe('Hello world This has extra spaces');
    });

    it('should trim leading and trailing whitespace', () => {
      const text = '   Hello world   ';
      const prepared = prepareTextForEmbedding(text);
      
      expect(prepared).toBe('Hello world');
    });

    it('should truncate very long text', () => {
      const longText = 'Hello world '.repeat(1000);
      const prepared = prepareTextForEmbedding(longText);
      
      expect(prepared.length).toBeLessThanOrEqual(8000);
    });

    it('should handle empty text', () => {
      expect(prepareTextForEmbedding('')).toBe('');
      expect(prepareTextForEmbedding('   ')).toBe('');
    });
  });

  describe('Chunk Similarity', () => {
    it('should calculate similarity between chunks with embeddings', () => {
      const chunk1: DocumentChunk = {
        id: 'chunk_1',
        documentId: 'doc_1',
        content: 'First chunk content',
        embedding: [1, 0, 0, 0], // Simple 4D vector for testing
        chunkIndex: 0,
        tokenCount: 10,
        metadata: { elementTypes: ['text'] },
        createdAt: new Date(),
      };

      const chunk2: DocumentChunk = {
        id: 'chunk_2',
        documentId: 'doc_1',
        content: 'Second chunk content',
        embedding: [0.7071, 0.7071, 0, 0], // 45-degree rotation
        chunkIndex: 1,
        tokenCount: 12,
        metadata: { elementTypes: ['text'] },
        createdAt: new Date(),
      };

      const similarity = calculateChunkSimilarity(chunk1, chunk2);
      
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
      expect(typeof similarity).toBe('number');
    });

    it('should return 0 for chunks without embeddings', () => {
      const chunk1: DocumentChunk = {
        id: 'chunk_1',
        documentId: 'doc_1',
        content: 'First chunk content',
        embedding: [],
        chunkIndex: 0,
        tokenCount: 10,
        metadata: { elementTypes: ['text'] },
        createdAt: new Date(),
      };

      const chunk2: DocumentChunk = {
        id: 'chunk_2',
        documentId: 'doc_1',
        content: 'Second chunk content',
        embedding: [1, 0, 0, 0],
        chunkIndex: 1,
        tokenCount: 12,
        metadata: { elementTypes: ['text'] },
        createdAt: new Date(),
      };

      const similarity = calculateChunkSimilarity(chunk1, chunk2);
      expect(similarity).toBe(0);
    });

    it('should handle identical embeddings', () => {
      const embedding = [0.5, 0.5, 0.5, 0.5];
      
      const chunk1: DocumentChunk = {
        id: 'chunk_1',
        documentId: 'doc_1',
        content: 'Same content',
        embedding: [...embedding],
        chunkIndex: 0,
        tokenCount: 10,
        metadata: { elementTypes: ['text'] },
        createdAt: new Date(),
      };

      const chunk2: DocumentChunk = {
        id: 'chunk_2',
        documentId: 'doc_1',
        content: 'Same content',
        embedding: [...embedding],
        chunkIndex: 1,
        tokenCount: 10,
        metadata: { elementTypes: ['text'] },
        createdAt: new Date(),
      };

      const similarity = calculateChunkSimilarity(chunk1, chunk2);
      expect(similarity).toBeCloseTo(1.0, 6);
    });

    it('should handle orthogonal embeddings', () => {
      const chunk1: DocumentChunk = {
        id: 'chunk_1',
        documentId: 'doc_1',
        content: 'First content',
        embedding: [1, 0, 0, 0],
        chunkIndex: 0,
        tokenCount: 10,
        metadata: { elementTypes: ['text'] },
        createdAt: new Date(),
      };

      const chunk2: DocumentChunk = {
        id: 'chunk_2',
        documentId: 'doc_1',
        content: 'Second content',
        embedding: [0, 1, 0, 0],
        chunkIndex: 1,
        tokenCount: 10,
        metadata: { elementTypes: ['text'] },
        createdAt: new Date(),
      };

      const similarity = calculateChunkSimilarity(chunk1, chunk2);
      expect(similarity).toBeCloseTo(0, 6);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => estimateTokenCount(null as any)).not.toThrow();
      expect(() => estimateTokenCount(undefined as any)).not.toThrow();
      expect(() => prepareTextForEmbedding(null as any)).not.toThrow();
      expect(() => prepareTextForEmbedding(undefined as any)).not.toThrow();
    });

    it('should handle special characters and unicode', () => {
      const unicodeText = 'Hello 🌍 世界 café naïve résumé';
      const count = estimateTokenCount(unicodeText);
      const prepared = prepareTextForEmbedding(unicodeText);
      
      expect(count).toBeGreaterThan(0);
      expect(prepared).toBeDefined();
      expect(prepared.length).toBeGreaterThan(0);
    });

    it('should handle very long single words', () => {
      const longWord = 'supercalifragilisticexpialidocious'.repeat(10);
      const count = estimateTokenCount(longWord);
      const prepared = prepareTextForEmbedding(longWord);
      
      expect(count).toBeGreaterThan(10);
      expect(prepared.length).toBeLessThanOrEqual(8000);
    });
  });
});

// Test implementations of utility functions (copied from embedding.ts logic)
function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  
  const words = text.trim().split(/\s+/).length;
  const characters = text.length;
  
  const wordBasedEstimate = words * 1.3;
  const charBasedEstimate = characters / 3.5;
  
  return Math.ceil((wordBasedEstimate + charBasedEstimate) / 2);
}

function prepareTextForEmbedding(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 8000);
}

function calculateChunkSimilarity(chunk1: DocumentChunk, chunk2: DocumentChunk): number {
  if (!chunk1.embedding || !chunk2.embedding || chunk1.embedding.length === 0 || chunk2.embedding.length === 0) {
    return 0;
  }
  
  return cosineSimilarity(chunk1.embedding, chunk2.embedding);
}

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