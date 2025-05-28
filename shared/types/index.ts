// Shared types for the RoboRail Assistant application
export * from '../config/environment';

// Common types used across frontend and backend
export interface BaseDocument {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  contentType: string;
  fileSize: number;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  uploadedAt: Date;
  processedAt?: Date | null;
  chunkCount: number;
  metadata: Record<string, any>;
  updatedAt: Date;
}

export interface BaseChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  pageNumber?: number;
  tokenCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface BaseConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search and RAG types
export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  documentId: string;
  chunkIndex: number;
}

export interface RAGResponse {
  answer: string;
  citations: SearchResult[];
  followUpQuestions?: string[];
  metadata: Record<string, any>;
}