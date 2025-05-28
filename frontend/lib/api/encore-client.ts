// Encore.ts Frontend Request Client
// This provides type-safe API calls to the Encore backend with proper error handling

import { QueryClient } from '@tanstack/react-query';

// Base configuration for Encore API calls
const ENCORE_API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Encore API Error types
export interface EncoreAPIError {
  code: string;
  message: string;
  details?: any;
}

// Enhanced fetch wrapper with Encore error handling
async function encoreRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${ENCORE_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: EncoreAPIError;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        code: 'unknown',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    const error = new Error(errorData.message) as Error & { code: string; details?: any };
    error.code = errorData.code;
    error.details = errorData.details;
    throw error;
  }

  return response.json();
}

// Type-safe API client based on Encore backend services
export class EncoreAPIClient {
  // Chat service endpoints
  chat = {
    sendMessage: (request: {
      message: string;
      conversationId?: string;
      userId: string;
      responseMode?: "detailed" | "concise" | "technical" | "conversational";
      enableReranking?: boolean;
    }) => encoreRequest('/chat/message', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

    getConversation: (conversationId: string, userId: string) =>
      encoreRequest(`/chat/conversation/${conversationId}?userId=${userId}`),

    listConversations: (params: {
      userId: string;
      page?: number;
      pageSize?: number;
      search?: string;
    }) => {
      const searchParams = new URLSearchParams({
        userId: params.userId,
        page: (params.page || 1).toString(),
        pageSize: (params.pageSize || 20).toString(),
      });
      
      if (params.search) {
        searchParams.append('search', params.search);
      }

      return encoreRequest(`/chat/conversations?${searchParams.toString()}`);
    },

    deleteConversation: (conversationId: string, userId: string) =>
      encoreRequest(`/chat/conversation/${conversationId}?userId=${userId}`, {
        method: 'DELETE',
      }),

    getMessages: (conversationId: string, userId: string) =>
      encoreRequest(`/chat/conversation/${conversationId}/messages?userId=${userId}`),

    healthCheck: () => encoreRequest('/chat/health'),
    ragHealthCheck: () => encoreRequest('/chat/rag/health'),
  };

  // Upload service endpoints
  upload = {
    uploadFile: (request: {
      fileName: string;
      fileSize: number;
      contentType: string;
      fileData: string; // base64 encoded
    }) => encoreRequest('/upload/file', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

    getStatus: (documentId: string) =>
      encoreRequest(`/upload/status/${documentId}`),
  };

  // Search service endpoints
  search = {
    hybridSearch: (request: {
      query: string;
      userID: string;
      limit?: number;
      enableReranking?: boolean;
      threshold?: number;
    }) => encoreRequest('/search/hybrid', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
  };

  // Document management endpoints
  documents = {
    list: (params: {
      userId?: string;
      page?: number;
      pageSize?: number;
      search?: string;
    } = {}) => {
      const searchParams = new URLSearchParams();
      
      if (params.userId) searchParams.append('userId', params.userId);
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
      if (params.search) searchParams.append('search', params.search);

      const queryString = searchParams.toString();
      return encoreRequest(`/documents${queryString ? `?${queryString}` : ''}`);
    },
  };
}

// Default client instance
export const encoreClient = new EncoreAPIClient();

// React Query integration helpers
export const createEncoreQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.code && ['invalid_argument', 'not_found', 'permission_denied', 'unauthenticated'].includes(error.code)) {
            return false;
          }
          return failureCount < 3;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Helper functions for file upload
export async function uploadFileToEncore(file: File, userId: string) {
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');

  return encoreClient.upload.uploadFile({
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
    fileData: base64Data,
  });
}

// Helper for search with default options
export async function searchKnowledgeBase(
  query: string,
  userId: string,
  options: {
    limit?: number;
    enableReranking?: boolean;
    threshold?: number;
  } = {}
) {
  return encoreClient.search.hybridSearch({
    query,
    userID: userId,
    limit: options.limit || 10,
    enableReranking: options.enableReranking ?? true,
    threshold: options.threshold || 0.5,
  });
}
