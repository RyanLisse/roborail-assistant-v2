import { api } from "encore.dev/api";
import type { APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { z } from "zod";

// Encore secret for Gemini API key
const geminiApiKey = secret("GeminiApiKey");

// Validation schemas
export const LLMRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1, "Message content cannot be empty"),
  })).min(1, "At least one message is required"),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().min(1).max(4096).optional().default(1000),
  topP: z.number().min(0).max(1).optional().default(0.95),
  stopSequences: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
});

export const RAGRequestSchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  context: z.array(z.string()).min(1, "At least one context chunk is required"),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.3),
  maxTokens: z.number().int().min(1).max(4096).optional().default(1000),
});

// Types
export interface LLMRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

export interface RAGRequest {
  query: string;
  context: string[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  created: number;
}

// Gemini API interfaces
interface GeminiMessage {
  role: string;
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    candidateCount?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
    blockReason?: string;
  };
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// Safety settings for Gemini
const SAFETY_SETTINGS = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  }
];

// Convert our message format to Gemini format
function convertMessagesToGemini(messages: LLMRequest['messages']): GeminiMessage[] {
  return messages
    .filter(msg => msg.role !== 'system') // System messages handled separately
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
}

// Build RAG prompt with context
function buildRAGPrompt(query: string, context: string[], systemPrompt?: string): string {
  const defaultSystemPrompt = `You are a helpful AI assistant. Use the provided context to answer the user's question accurately and comprehensively. If the context doesn't contain enough information to answer the question, say so clearly. Always cite specific parts of the context when making claims.`;
  
  const prompt = systemPrompt || defaultSystemPrompt;
  
  let ragPrompt = `${prompt}\n\nContext:\n`;
  
  context.forEach((chunk, index) => {
    ragPrompt += `[${index + 1}] ${chunk}\n\n`;
  });
  
  ragPrompt += `Question: ${query}\n\nAnswer:`;
  
  return ragPrompt;
}

// Call Gemini API
async function callGeminiAPI(request: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = await geminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  console.log(`Making Gemini API request with ${request.contents.length} messages`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as GeminiResponse;

  // Check for safety blocks
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Request blocked by safety filters: ${data.promptFeedback.blockReason}`);
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response candidates returned from Gemini API');
  }

  return data;
}

// Core function to generate LLM response
async function generateResponse(request: LLMRequest): Promise<LLMResponse> {
  const startTime = Date.now();

  try {
    // Extract system message if present
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    const systemPrompt = systemMessage?.content || request.systemPrompt;

    // Convert messages to Gemini format
    const geminiMessages = convertMessagesToGemini(request.messages);

    // Build Gemini request
    const geminiRequest: GeminiRequest = {
      contents: geminiMessages,
      generationConfig: {
        temperature: request.temperature,
        topP: request.topP,
        maxOutputTokens: request.maxTokens,
        candidateCount: 1,
        stopSequences: request.stopSequences,
      },
      safetySettings: SAFETY_SETTINGS,
    };

    // Add system instruction if present
    if (systemPrompt) {
      geminiRequest.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    // Call Gemini API
    const geminiResponse = await callGeminiAPI(geminiRequest);

    // Extract response content
    const candidate = geminiResponse.candidates[0];
    const content = candidate.content.parts.map(part => part.text).join('');

    console.log(`Gemini response generated in ${Date.now() - startTime}ms`);

    return {
      content,
      finishReason: candidate.finishReason,
      usage: {
        promptTokens: geminiResponse.usageMetadata.promptTokenCount,
        completionTokens: geminiResponse.usageMetadata.candidatesTokenCount,
        totalTokens: geminiResponse.usageMetadata.totalTokenCount,
      },
      model: 'gemini-1.5-flash',
      created: startTime,
    };

  } catch (error) {
    console.error('LLM generation error:', error);
    throw new Error(`LLM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Core function to generate RAG response
async function generateRAGResponse(request: RAGRequest): Promise<LLMResponse> {
  try {
    console.log(`Generating RAG response for query: "${request.query}" with ${request.context.length} context chunks`);

    // Build RAG prompt
    const ragPrompt = buildRAGPrompt(request.query, request.context, request.systemPrompt);

    // Generate response using the RAG prompt
    const llmRequest: LLMRequest = {
      messages: [{ role: 'user', content: ragPrompt }],
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    };

    return await generateResponse(llmRequest);

  } catch (error) {
    console.error('RAG generation error:', error);
    throw new Error(`RAG generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Validate API connection
async function validateConnection(): Promise<boolean> {
  try {
    const testRequest: LLMRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      maxTokens: 10,
      temperature: 0.1,
    };

    const response = await generateResponse(testRequest);
    return response.content.length > 0;

  } catch (error) {
    console.error('Gemini API validation failed:', error);
    return false;
  }
}

// API Endpoints

// Basic LLM generation endpoint
export const generate = api(
  { expose: true, method: "POST", path: "/llm/generate" },
  async (req: LLMRequest): Promise<LLMResponse> => {
    try {
      // Validate request
      const validatedReq = LLMRequestSchema.parse(req);
      
      console.log(`LLM generation request with ${validatedReq.messages.length} messages`);
      
      return await generateResponse(validatedReq);
      
    } catch (error) {
      console.error("LLM generation endpoint error:", error);
      throw new Error(`LLM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// RAG-specific generation endpoint
export const generateRAG = api(
  { expose: true, method: "POST", path: "/llm/generate-rag" },
  async (req: RAGRequest): Promise<LLMResponse> => {
    try {
      // Validate request
      const validatedReq = RAGRequestSchema.parse(req);
      
      console.log(`RAG generation request: "${validatedReq.query}" with ${validatedReq.context.length} context chunks`);
      
      return await generateRAGResponse(validatedReq);
      
    } catch (error) {
      console.error("RAG generation endpoint error:", error);
      throw new Error(`RAG generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Health check endpoint
export const health = api(
  { expose: true, method: "GET", path: "/llm/health" },
  async (): Promise<{ status: string; connected: boolean; timestamp: number }> => {
    try {
      const connected = await validateConnection();
      
      return {
        status: connected ? 'healthy' : 'degraded',
        connected,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      console.error("LLM health check error:", error);
      return {
        status: 'unhealthy',
        connected: false,
        timestamp: Date.now(),
      };
    }
  }
);

// Export core functions for internal use
export {
  generateResponse,
  generateRAGResponse,
  validateConnection,
  buildRAGPrompt,
};