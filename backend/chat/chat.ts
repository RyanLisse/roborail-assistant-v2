import { api } from "encore.dev/api";
import type { APIError } from "encore.dev/api";

// Types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
}

export interface Citation {
  documentID: string;
  filename: string;
  pageNumber?: number;
  chunkContent: string;
  relevanceScore: number;
}

export interface ChatRequest {
  message: string;
  conversationID?: string;
  userID: string;
  documentContext?: string[]; // Optional: limit to specific documents
}

export interface ChatResponse {
  conversationID: string;
  message: ChatMessage;
  sources: Citation[];
  processingTime: number;
}

export interface Conversation {
  id: string;
  userID: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// Send chat message
export const sendMessage = api(
  { expose: true, method: "POST", path: "/chat/message" },
  async (req: ChatRequest): Promise<ChatResponse> => {
    const startTime = Date.now();

    // TODO: Implement RAG chat pipeline
    // - Search for relevant document chunks
    // - Assemble context from search results
    // - Generate response using Gemini
    // - Save conversation and message to database
    // - Return response with citations

    const conversationID = req.conversationID || `conv_${Date.now()}`;
    const messageID = `msg_${Date.now()}`;

    const mockResponse: ChatMessage = {
      id: messageID,
      role: "assistant",
      content:
        "I understand your question. Based on the documents in your knowledge base, here's what I found...",
      timestamp: new Date().toISOString(),
      citations: [],
    };

    return {
      conversationID,
      message: mockResponse,
      sources: [],
      processingTime: Date.now() - startTime,
    };
  }
);

// Get conversation history
export const getConversation = api(
  { expose: true, method: "GET", path: "/chat/conversation/:conversationID" },
  async ({ conversationID }: { conversationID: string }): Promise<{ messages: ChatMessage[] }> => {
    // TODO: Retrieve conversation messages from database
    return {
      messages: [],
    };
  }
);

// List user conversations
export const listConversations = api(
  { expose: true, method: "GET", path: "/chat/conversations" },
  async ({ userID }: { userID: string }): Promise<{ conversations: Conversation[] }> => {
    // TODO: Retrieve user conversations from database
    return {
      conversations: [],
    };
  }
);

// Delete conversation
export const deleteConversation = api(
  { expose: true, method: "DELETE", path: "/chat/conversation/:conversationID" },
  async ({ conversationID }: { conversationID: string }): Promise<{ success: boolean }> => {
    // TODO: Delete conversation and messages from database
    return {
      success: true,
    };
  }
);
