// Backend API client for frontend to communicate with Encore services
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Types that match the backend API schemas
export interface ChatRequest {
  message: string;
  conversationId?: string;
  userId: string;
  responseMode?: "detailed" | "concise" | "technical" | "conversational";
  enableReranking?: boolean;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  citations: Citation[];
  metadata: {
    searchTime: number;
    llmTime: number;
    totalTime: number;
    tokensUsed: number;
    documentsFound: number;
  };
  followUpQuestions?: string[];
}

export interface Citation {
  documentId: string;
  filename: string;
  pageNumber?: number;
  chunkContent: string;
  relevanceScore: number;
  citationIndex: number;
}

export interface ConversationResponse {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

export interface ConversationWithMessages extends ConversationResponse {
  messages: MessageResponse[];
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  createdAt: Date;
}

export interface DocumentUploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
  fileData: string; // base64 encoded
}

export interface DocumentUploadResponse {
  documentId: string;
  status: string;
  message: string;
  fileName: string;
}

export interface DocumentSearchRequest {
  query: string;
  userID: string;
  limit?: number;
  enableReranking?: boolean;
  threshold?: number;
}

export interface DocumentSearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
}

export interface SearchResult {
  id: string;
  content: string;
  documentID: string;
  score: number;
  metadata: {
    filename: string;
    pageNumber?: number;
    chunkIndex: number;
  };
}

// API client class
export class BackendAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Chat API methods
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat/message', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getConversation(conversationId: string, userId: string): Promise<ConversationWithMessages> {
    return this.request<ConversationWithMessages>(
      `/chat/conversation/${conversationId}?userId=${userId}`
    );
  }

  async listConversations(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string
  ): Promise<{ conversations: ConversationResponse[]; pagination: any }> {
    const params = new URLSearchParams({
      userId,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    return this.request<{ conversations: ConversationResponse[]; pagination: any }>(
      `/chat/conversations?${params.toString()}`
    );
  }

  async deleteConversation(conversationId: string, userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/chat/conversation/${conversationId}?userId=${userId}`,
      { method: 'DELETE' }
    );
  }

  async getConversationMessages(conversationId: string, userId: string): Promise<{ messages: MessageResponse[] }> {
    return this.request<{ messages: MessageResponse[] }>(
      `/chat/conversation/${conversationId}/messages?userId=${userId}`
    );
  }

  // Document API methods
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    return this.request<DocumentUploadResponse>('/upload/file', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async searchDocuments(request: DocumentSearchRequest): Promise<DocumentSearchResponse> {
    return this.request<DocumentSearchResponse>('/search/hybrid', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getDocumentStatus(documentId: string): Promise<{ status: string; progress?: number }> {
    return this.request<{ status: string; progress?: number }>(
      `/upload/status/${documentId}`
    );
  }

  // Health check methods
  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    return this.request<{ status: string; services: Record<string, boolean> }>('/chat/health');
  }

  async ragHealthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    return this.request<{ status: string; services: Record<string, boolean> }>('/chat/rag/health');
  }
}

// Default client instance
export const backendClient = new BackendAPIClient();

// Helper functions for converting between frontend and backend formats
export function convertToBackendMessage(frontendMessage: any): ChatRequest {
  return {
    message: frontendMessage.content,
    conversationId: frontendMessage.chatId,
    userId: frontendMessage.userId || "anonymous",
    responseMode: "detailed",
    enableReranking: true,
  };
}

export function convertFromBackendMessage(backendMessage: MessageResponse): any {
  return {
    id: backendMessage.id,
    role: backendMessage.role,
    content: backendMessage.content,
    createdAt: backendMessage.createdAt,
    citations: backendMessage.citations,
  };
}

export function convertFromBackendChat(backendConversation: ConversationResponse): any {
  return {
    id: backendConversation.id,
    title: backendConversation.title,
    createdAt: backendConversation.createdAt,
    visibility: "private", // Default for backend conversations
  };
}

// File upload helper
export async function uploadFile(file: File, userId: string): Promise<DocumentUploadResponse> {
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');

  const request: DocumentUploadRequest = {
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
    fileData: base64Data,
  };

  return backendClient.uploadDocument(request);
}

// Search documents helper
export async function searchKnowledgeBase(
  query: string,
  userId: string,
  options: {
    limit?: number;
    enableReranking?: boolean;
    threshold?: number;
  } = {}
): Promise<DocumentSearchResponse> {
  const request: DocumentSearchRequest = {
    query,
    userID: userId,
    limit: options.limit || 10,
    enableReranking: options.enableReranking ?? true,
    threshold: options.threshold || 0.5,
  };

  return backendClient.searchDocuments(request);
}