import { desc, eq } from "drizzle-orm";
import { api } from "encore.dev/api";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/connection";
import { conversationMessages, conversations } from "../db/schema";
import { generateRAG } from "../llm/llm";
import { hybridSearch } from "../search/search";
import { type ContextOptionsType, manageRAGContext } from "./context-management";

// Define explicit interfaces for RAGQueryRequest, RAGQueryResponse, etc.
// Replace all usages of z.infer<typeof ...> in API signatures with these interfaces.
// If runtime validation is needed, use zod inside the function body, not in the signature.

// Request/Response schemas
export interface RAGQueryRequest {
  query: string;
  conversationId: string;
  userId: string;
  responseMode: string;
  includeHistory: boolean;
  maxResults: number;
  enableReranking: boolean;
}

export interface RAGQueryResponse {
  messageId: string;
  content: string;
  citations: {
    documentId: string;
    filename: string;
    pageNumber?: number;
    chunkContent: string;
    relevanceScore: number;
    citationIndex: number;
  }[];
  metadata: {
    searchTime: number;
    llmTime: number;
    totalTime: number;
    tokensUsed: number;
    documentsFound: number;
    cacheHits: number;
    intent: string;
  };
  followUpQuestions?: string[];
}

export interface QueryIntent {
  type: string;
  requiresDocuments: boolean;
  requiresContext: boolean;
  confidence: number;
  keyTerms: string[];
}

export interface ContextWindow {
  documentContext: string;
  conversationContext: string;
  totalTokens: number;
  wasTruncated: boolean;
  sources: {
    documentId: string;
    filename: string;
    relevanceScore: number;
  }[];
}

// Core orchestration logic

/**
 * Detect the intent of a user query
 */
function detectQueryIntent(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase();

  // Keywords that suggest document-based queries
  const documentKeywords = [
    "document",
    "paper",
    "report",
    "file",
    "uploaded",
    "says",
    "according to",
    "in the document",
    "research shows",
    "study indicates",
    "based on",
    "what does",
    "summarize",
    "extract",
    "find information",
  ];

  // Keywords that suggest follow-up questions
  const followUpKeywords = [
    "elaborate",
    "more",
    "continue",
    "explain further",
    "what about",
    "how does this relate",
    "can you expand",
    "tell me more",
    "what's the second",
    "next point",
    "previously mentioned",
  ];

  // Keywords that suggest clarification requests
  const clarificationKeywords = [
    "what do you mean",
    "clarify",
    "explain what",
    "i don't understand",
    "can you rephrase",
    "what exactly",
    "be more specific",
  ];

  let type = "general_query";
  let requiresDocuments = false;
  let requiresContext = false;
  let confidence = 0.7;

  // Check for clarification intent
  if (clarificationKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    type = "clarification";
    requiresContext = true;
    confidence = 0.9;
  }
  // Check for follow-up intent
  else if (followUpKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    type = "follow_up";
    requiresContext = true;
    confidence = 0.85;
  }
  // Check for document query intent
  else if (documentKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    type = "document_query";
    requiresDocuments = true;
    confidence = 0.8;
  }

  // Extract key terms
  const keyTerms = extractKeyTerms(query);

  return {
    type,
    requiresDocuments,
    requiresContext,
    confidence,
    keyTerms,
  };
}

/**
 * Extract key terms from a query for search
 */
function extractKeyTerms(query: string): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "what",
    "how",
    "is",
    "are",
    "does",
    "do",
    "can",
    "will",
    "would",
    "should",
    "this",
    "that",
    "these",
    "those",
    "a",
    "an",
    "as",
    "it",
    "its",
    "be",
    "been",
    "have",
    "has",
    "had",
    "was",
    "were",
    "am",
    "you",
    "your",
    "we",
    "our",
    "they",
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !stopWords.has(term))
    .slice(0, 8); // Limit to 8 key terms
}

/**
 * Build context from search results and conversation history
 */
function assembleContext(options: {
  searchResults: any[];
  conversationHistory: any[];
  maxContextLength: number;
  prioritizeRecent: boolean;
}): ContextWindow {
  const { searchResults, conversationHistory, maxContextLength, prioritizeRecent } = options;

  // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  let totalTokens = 0;
  let wasTruncated = false;
  const maxDocumentTokens = Math.floor(maxContextLength * 0.7); // 70% for documents
  const maxConversationTokens = Math.floor(maxContextLength * 0.3); // 30% for conversation

  // Build document context
  const relevantChunks = searchResults
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .filter((result) => result.relevanceScore > 0.5); // Filter low-relevance results

  let documentContext = "";
  const sources: any[] = [];

  for (let i = 0; i < relevantChunks.length; i++) {
    const chunk = relevantChunks[i];
    const chunkText = `[${i + 1}] ${chunk.filename} (Page ${chunk.pageNumber || "N/A"}): ${chunk.content}`;
    const chunkTokens = estimateTokens(chunkText);

    if (totalTokens + chunkTokens > maxDocumentTokens) {
      wasTruncated = true;
      break;
    }

    documentContext += (documentContext ? "\n\n" : "") + chunkText;
    totalTokens += chunkTokens;

    sources.push({
      documentId: chunk.documentId,
      filename: chunk.filename,
      relevanceScore: chunk.relevanceScore,
    });
  }

  // Build conversation context
  let conversationContext = "";
  const recentHistory = prioritizeRecent
    ? conversationHistory.slice(-6) // Last 6 messages
    : conversationHistory;

  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const message = recentHistory[i];
    const messageText = `${message.role}: ${message.content}`;
    const messageTokens = estimateTokens(messageText);

    if (totalTokens + messageTokens > maxContextLength) {
      wasTruncated = true;
      break;
    }

    conversationContext = messageText + (conversationContext ? "\n" : "") + conversationContext;
    totalTokens += messageTokens;
  }

  return {
    documentContext,
    conversationContext,
    totalTokens,
    wasTruncated,
    sources,
  };
}

/**
 * Generate LLM request with proper prompt formatting
 */
function buildLLMRequest(
  query: string,
  context: ContextWindow,
  intent: QueryIntent,
  responseMode: string
) {
  const modeConfig = getResponseModeConfig(responseMode);

  const systemPrompt = modeConfig.promptTemplate;

  // Build the complete prompt
  const messages: Array<{ role: "system" | "user" | "model"; content: string }> = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
  ];

  // Add conversation history if available
  if (context.conversationContext) {
    messages.push({
      role: "user" as const,
      content: `Previous conversation:\n${context.conversationContext}`,
    });
  }

  // Add document context if available
  let userMessage = "";
  if (context.documentContext) {
    userMessage += `Relevant documents:\n${context.documentContext}\n\n`;
  }

  userMessage += `Query: ${query}`;

  if (intent.type === "follow_up") {
    userMessage +=
      "\n\nNote: This appears to be a follow-up question. Please reference the previous conversation context.";
  }

  messages.push({
    role: "user" as const,
    content: userMessage,
  });

  return {
    messages,
    temperature: modeConfig.temperature,
    maxTokens: modeConfig.maxTokens,
    model: "gemini-2.5-flash", // Using Google Gemini
  };
}

/**
 * Get response mode configuration
 */
function getResponseModeConfig(mode: string) {
  const configs = {
    detailed: {
      maxTokens: 1500,
      temperature: 0.7,
      promptTemplate: `You are a knowledgeable AI assistant. Provide detailed, comprehensive responses with proper citations. When referencing documents, use numbered citations like [1], [2], etc. Explain concepts thoroughly and provide context when possible.`,
    },
    concise: {
      maxTokens: 500,
      temperature: 0.5,
      promptTemplate: `You are a helpful AI assistant. Provide concise, direct answers. Use numbered citations [1], [2] when referencing documents. Be brief but accurate.`,
    },
    technical: {
      maxTokens: 1200,
      temperature: 0.3,
      promptTemplate: `You are a technical AI assistant. Provide precise, technical responses with specific details and citations [1], [2]. Focus on accuracy and technical depth. Include relevant technical terms and concepts.`,
    },
    conversational: {
      maxTokens: 800,
      temperature: 0.8,
      promptTemplate: `You are a friendly AI assistant. Provide conversational, easy-to-understand responses. Use numbered citations [1], [2] when referencing documents. Explain complex topics in simple terms.`,
    },
  };

  return configs[mode as keyof typeof configs] || configs.detailed;
}

/**
 * Parse LLM response and extract citations
 */
function parseLLMResponse(response: string, sources: any[]) {
  const citationRegex = /\[(\d+)\]/g;
  const matches = [...response.matchAll(citationRegex)];

  const citations = matches
    .map((match) => {
      const index = Number.parseInt(match[1]) - 1; // Convert to 0-based index
      const source = sources[index];

      if (!source) return null;

      return {
        documentId: source.documentId,
        filename: source.filename,
        pageNumber: source.pageNumber,
        chunkContent: source.content || "",
        relevanceScore: source.relevanceScore,
        citationIndex: index + 1,
      };
    })
    .filter((citation) => citation !== null);

  return {
    content: response,
    citations,
  };
}

/**
 * Generate follow-up questions based on the response
 */
function generateFollowUpQuestions(query: string, response: string, intent: QueryIntent): string[] {
  const followUps: string[] = [];

  if (intent.type === "document_query") {
    followUps.push(
      "Can you provide more details about this topic?",
      "What are the key takeaways from these documents?",
      "Are there any related topics I should explore?"
    );
  } else if (intent.type === "general_query") {
    followUps.push(
      "Can you elaborate on this topic?",
      "What are some practical applications?",
      "How does this relate to current trends?"
    );
  }

  return followUps.slice(0, 3); // Limit to 3 follow-up questions
}

// Main RAG orchestration endpoint
export const processRAGQuery = api(
  { method: "POST", path: "/chat/rag/query", expose: true },
  async (request: RAGQueryRequest): Promise<RAGQueryResponse> => {
    const startTime = Date.now();
    let searchTime = 0;
    let llmTime = 0;
    let documentsFound = 0;
    const cacheHits = 0;

    try {
      // Step 1: Detect query intent
      const intent = detectQueryIntent(request.query);

      // Step 2: Retrieve documents if needed
      let searchResults: any[] = [];
      if (intent.requiresDocuments || intent.type === "document_query") {
        const searchStart = Date.now();

        // Call actual search service
        const searchResponse = await hybridSearch({
          query: request.query,
          userID: request.userId,
          limit: request.maxResults,
          enableReranking: request.enableReranking,
          threshold: 0.5, // Lower threshold to get more potentially relevant results
        });

        searchResults = searchResponse.results.map((result) => ({
          id: result.id,
          content: result.content,
          documentId: result.documentID,
          filename: result.metadata.filename,
          pageNumber: result.metadata.pageNumber,
          relevanceScore: result.score,
        }));

        searchTime = Date.now() - searchStart;
        documentsFound = searchResults.length;

        console.log(`Search completed: found ${documentsFound} documents in ${searchTime}ms`);
      }

      // Step 3: Get conversation history with intelligent context management
      let conversationHistory: any[] = [];
      let contextSummary = "";
      if (request.includeHistory && (intent.requiresContext || intent.type === "follow_up")) {
        // Get all conversation messages for intelligent pruning
        const allMessages = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, request.conversationId))
          .orderBy(conversationMessages.createdAt);

        if (allMessages.length > 0) {
          // Estimate document context size to reserve appropriate space
          const documentContext = searchResults
            .map((result) => result.content)
            .join("\n\n")
            .substring(0, 4000); // Approximate context length

          // Apply intelligent context management
          const managedContext = manageRAGContext(allMessages, documentContext, {
            maxMessages: 20,
            maxContextChars: 6000,
            maxContextTokens: 1500, // Reserve most tokens for documents and response
            minRecentMessages: 3,
            prioritizeRecent: true,
          });

          conversationHistory = managedContext.prunedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt,
          }));

          contextSummary = managedContext.contextSummary;
          console.log(`Context management: ${contextSummary}`);
        }
      }

      // Step 4: Assemble context
      const context = assembleContext({
        searchResults,
        conversationHistory,
        maxContextLength: 4000,
        prioritizeRecent: true,
      });

      // Step 5: Generate LLM request
      const llmRequest = buildLLMRequest(request.query, context, intent, request.responseMode);

      // Step 6: Call LLM service
      const llmStart = Date.now();
      const llmResponse = await generateRAG({
        query: request.query,
        context: context.documentContext ? [context.documentContext] : [],
        temperature: llmRequest.temperature,
        maxTokens: llmRequest.maxTokens,
      });
      llmTime = Date.now() - llmStart;

      // Step 7: Parse response and extract citations
      const parsedResponse = parseLLMResponse(llmResponse.content, context.sources);

      // Step 8: Generate follow-up questions
      const followUpQuestions = generateFollowUpQuestions(
        request.query,
        parsedResponse.content,
        intent
      );

      // Step 9: Create and store message
      const messageId = uuidv4();
      await db.insert(conversationMessages).values({
        id: messageId,
        conversationId: request.conversationId,
        role: "assistant",
        content: parsedResponse.content,
        citations: parsedResponse.citations,
        createdAt: new Date(),
      });

      console.log(`Message stored with ID: ${messageId}`);

      const totalTime = Date.now() - startTime;

      return {
        messageId,
        content: parsedResponse.content,
        citations: parsedResponse.citations,
        metadata: {
          searchTime,
          llmTime,
          totalTime,
          tokensUsed: llmResponse.usage.totalTokens,
          documentsFound,
          cacheHits,
          intent: intent.type,
        },
        followUpQuestions,
      };
    } catch (error) {
      console.error(`RAG orchestration error for query "${request.query}":`, error);

      // Log detailed error information for debugging
      const errorDetails = {
        query: request.query,
        userId: request.userId,
        conversationId: request.conversationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      };
      console.error("RAG Error Details:", JSON.stringify(errorDetails, null, 2));

      // Generate appropriate fallback response
      const fallbackResponse = generateFallbackResponse(request.query, String(error));
      const messageId = uuidv4();

      // Still try to store the error response for debugging
      try {
        await db.insert(conversationMessages).values({
          id: messageId,
          conversationId: request.conversationId,
          role: "assistant",
          content: fallbackResponse.content,
          citations: [],
          createdAt: new Date(),
        });
      } catch (dbError) {
        console.error("Failed to store error response:", dbError);
      }

      return {
        messageId,
        content: fallbackResponse.content,
        citations: [],
        metadata: {
          searchTime: 0,
          llmTime: 0,
          totalTime: Date.now() - startTime,
          tokensUsed: 0,
          documentsFound: 0,
          cacheHits: 0,
          intent: "error",
        },
        followUpQuestions: fallbackResponse.suggestions,
      };
    }
  }
);

// Health check endpoint
export const ragHealth = api(
  { method: "GET", path: "/chat/rag/health", expose: true },
  async (): Promise<{ status: string; timestamp: string; services: Record<string, boolean> }> => {
    try {
      // Check dependent services
      const searchHealthy = await checkSearchService();
      const llmHealthy = await checkLLMService();
      const conversationHealthy = await checkConversationService();

      const allHealthy = searchHealthy && llmHealthy && conversationHealthy;

      return {
        status: allHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
          search: searchHealthy,
          llm: llmHealthy,
          conversation: conversationHealthy,
        },
      };
    } catch (error) {
      throw new Error(`RAG orchestration service unhealthy: ${error}`);
    }
  }
);

// Service integration functions

async function checkSearchService(): Promise<boolean> {
  try {
    // Test a simple search query
    const testResponse = await hybridSearch({
      query: "test",
      userID: "health-check",
      limit: 1,
      threshold: 0.9, // High threshold to minimize results
    });
    return true; // If no error thrown, service is healthy
  } catch (error) {
    console.error("Search service health check failed:", error);
    return false;
  }
}

async function checkLLMService(): Promise<boolean> {
  try {
    // Test a simple LLM call
    const testResponse = await generateRAG({
      query: "Hello",
      context: ["This is a test context."],
      temperature: 0.1,
      maxTokens: 10,
    });
    return testResponse.content.length > 0;
  } catch (error) {
    console.error("LLM service health check failed:", error);
    return false;
  }
}

async function checkConversationService(): Promise<boolean> {
  try {
    // Test database connection by attempting to query conversations
    const testQuery = await db.select().from(conversations).limit(1);
    return true; // If query succeeds, service is healthy
  } catch (error) {
    console.error("Conversation service health check failed:", error);
    return false;
  }
}

function generateFallbackResponse(query: string, error: string) {
  // Analyze the error type to provide more specific guidance
  const errorLower = error.toLowerCase();
  let content = "I apologize, but I'm experiencing some technical difficulties right now.";
  let suggestions = ["Try rephrasing your question", "Please try again in a few moments"];

  if (errorLower.includes("search") || errorLower.includes("document")) {
    content += " I'm having trouble accessing your documents at the moment.";
    suggestions = [
      "Check if your documents are properly uploaded and processed",
      "Try a different search term",
      "Try again in a few moments",
    ];
  } else if (errorLower.includes("api") || errorLower.includes("network")) {
    content += " I'm experiencing connectivity issues with external services.";
    suggestions = [
      "Please try again in a few moments",
      "Check your internet connection",
      "Contact support if the issue persists",
    ];
  } else if (errorLower.includes("conversation") || errorLower.includes("database")) {
    content += " I'm having trouble accessing conversation history.";
    suggestions = [
      "Try starting a new conversation",
      "Try again in a few moments",
      "Contact support if the issue persists",
    ];
  } else {
    content +=
      " I can still provide general information, but may not be able to access your specific documents.";
    suggestions = [
      "Try asking a general question",
      "Try rephrasing your question",
      "Contact support if the issue persists",
    ];
  }

  // For document-related queries, try to provide general knowledge
  const queryLower = query.toLowerCase();
  if (
    queryLower.includes("machine learning") ||
    queryLower.includes("ai") ||
    queryLower.includes("neural")
  ) {
    content +=
      "\n\nHowever, I can share some general information about machine learning and AI if that would be helpful.";
  }

  return {
    content,
    suggestions,
  };
}

// Export core functions for testing and internal use
export {
  detectQueryIntent,
  extractKeyTerms,
  assembleContext,
  buildLLMRequest,
  parseLLMResponse,
  generateFollowUpQuestions,
  getResponseModeConfig,
};
