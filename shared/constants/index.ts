// Shared constants for the RoboRail Assistant application

// API endpoints
export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  DOCUMENTS: '/api/documents',
  UPLOAD: '/api/files/upload',
  SEARCH: '/api/search',
  CONVERSATIONS: '/api/conversations',
} as const;

// Document processing statuses
export const DOCUMENT_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing', 
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const;

// File type restrictions
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

// Size limits
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_CHUNK_SIZE: 8192, // 8KB
  MAX_CHUNKS_PER_DOCUMENT: 1000,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// Search configuration
export const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 500,
} as const;

// Chat configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 4000,
  MAX_CONVERSATION_HISTORY: 100,
  DEFAULT_FOLLOW_UP_QUESTIONS: 3,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  EMBEDDING_TTL: 7 * 24 * 60 * 60, // 7 days in seconds
  SEARCH_TTL: 60 * 60, // 1 hour in seconds
  DOCUMENT_TTL: 24 * 60 * 60, // 24 hours in seconds
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
} as const;