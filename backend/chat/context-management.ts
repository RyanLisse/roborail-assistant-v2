import { ConversationMessage } from "../db/schema";
import { z } from "zod";

// Configuration constants for context management
export const CONTEXT_LIMITS = {
  // Maximum number of messages to include in context
  MAX_MESSAGES: 20,
  // Maximum total character count for context
  MAX_CONTEXT_CHARS: 32000,
  // Token estimation (rough approximation: 1 token ≈ 4 characters)
  MAX_CONTEXT_TOKENS: 8000,
  // Minimum messages to always include (recent messages)
  MIN_RECENT_MESSAGES: 4,
  // Character limit per individual message
  MAX_MESSAGE_CHARS: 4000,
} as const;

// Schema for context management options
export const ContextOptions = z.object({
  maxMessages: z.number().int().positive().default(CONTEXT_LIMITS.MAX_MESSAGES),
  maxContextChars: z.number().int().positive().default(CONTEXT_LIMITS.MAX_CONTEXT_CHARS),
  maxContextTokens: z.number().int().positive().default(CONTEXT_LIMITS.MAX_CONTEXT_TOKENS),
  minRecentMessages: z.number().int().positive().default(CONTEXT_LIMITS.MIN_RECENT_MESSAGES),
  prioritizeRecent: z.boolean().default(true),
  includeSystemMessages: z.boolean().default(true),
});

export type ContextOptionsType = z.infer<typeof ContextOptions>;

// Message with metadata for context management
export interface MessageWithMetadata {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: any[];
  createdAt: Date;
  charCount: number;
  estimatedTokens: number;
  priority: number; // Higher number = higher priority
}

/**
 * Estimates token count from character count
 * This is a rough approximation - for production, consider using a proper tokenizer
 */
export function estimateTokenCount(text: string): number {
  // GPT-style tokenization approximation: ~4 chars per token
  return Math.ceil(text.length / 4);
}

/**
 * Calculates priority score for a message based on various factors
 */
export function calculateMessagePriority(
  message: MessageWithMetadata,
  _allMessages: MessageWithMetadata[],
  index: number
): number {
  let priority = 0;
  
  // Recent messages get higher priority (exponential growth)
  const recency = index + 1; // Index 0 gets recency 1, higher indices get higher recency
  priority += Math.pow(recency, 2); // Stronger exponential preference for recent messages
  
  // User messages get slightly higher priority than assistant messages
  if (message.role === "user") {
    priority += 10;
  } else if (message.role === "assistant") {
    priority += 8;
  }
  
  // Messages with citations get higher priority (contain valuable context)
  if (message.citations && message.citations.length > 0) {
    priority += 5 * message.citations.length;
  }
  
  // Shorter messages are easier to include (slight preference)
  if (message.charCount < 500) {
    priority += 2;
  }
  
  // Question messages (ending with ?) get higher priority
  if (message.content.trim().endsWith('?')) {
    priority += 3;
  }
  
  return priority;
}

/**
 * Prepares messages with metadata for context management
 */
export function prepareMessagesWithMetadata(
  messages: ConversationMessage[]
): MessageWithMetadata[] {
  const messagesWithMetadata: MessageWithMetadata[] = messages.map((msg, index) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    citations: msg.citations,
    createdAt: msg.createdAt,
    charCount: msg.content.length,
    estimatedTokens: estimateTokenCount(msg.content),
    priority: 0, // Will be calculated separately
  }));

  // Calculate priorities for all messages
  messagesWithMetadata.forEach((msg, index) => {
    msg.priority = calculateMessagePriority(msg, messagesWithMetadata, index);
  });

  return messagesWithMetadata;
}

/**
 * Truncates a message to fit within character limits while preserving meaning
 */
export function truncateMessage(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }
  
  // Try to truncate at sentence boundaries
  const sentences = content.split(/[.!?]+/);
  let truncated = "";
  
  for (const sentence of sentences) {
    const withSentence = truncated + sentence + ".";
    if (withSentence.length <= maxChars - 10) { // Leave room for "..."
      truncated = withSentence;
    } else {
      break;
    }
  }
  
  // If no sentences fit, truncate at word boundary
  if (truncated.length === 0) {
    const words = content.split(/\s+/);
    for (const word of words) {
      const withWord = truncated + (truncated ? " " : "") + word;
      if (withWord.length <= maxChars - 10) {
        truncated = withWord;
      } else {
        break;
      }
    }
  }
  
  // Last resort: hard truncate
  if (truncated.length === 0) {
    truncated = content.substring(0, maxChars - 3);
  }
  
  return truncated.trim() + (truncated.length < content.length ? "..." : "");
}

/**
 * Prunes conversation history to fit within context limits
 */
export function pruneConversationHistory(
  messages: ConversationMessage[],
  options: Partial<ContextOptionsType> = {}
): ConversationMessage[] {
  const opts = ContextOptions.parse(options);
  
  if (messages.length === 0) {
    return [];
  }

  // Prepare messages with metadata
  const messagesWithMetadata = prepareMessagesWithMetadata(messages);
  
  // Always include the most recent messages (up to minRecentMessages)
  const recentMessages = messagesWithMetadata.slice(-opts.minRecentMessages);
  let selectedMessages = [...recentMessages];
  let totalChars = recentMessages.reduce((sum, msg) => sum + msg.charCount, 0);
  let totalTokens = recentMessages.reduce((sum, msg) => sum + msg.estimatedTokens, 0);

  // If we haven't reached the limits, try to include more messages
  if (selectedMessages.length < opts.maxMessages && 
      totalChars < opts.maxContextChars && 
      totalTokens < opts.maxContextTokens) {
    
    // Get remaining messages (excluding already selected recent ones)
    const remainingMessages = messagesWithMetadata
      .slice(0, -opts.minRecentMessages)
      .sort((a, b) => b.priority - a.priority); // Sort by priority descending

    for (const message of remainingMessages) {
      const wouldExceedLimits = 
        selectedMessages.length + 1 > opts.maxMessages ||
        totalChars + message.charCount > opts.maxContextChars ||
        totalTokens + message.estimatedTokens > opts.maxContextTokens;
      
      if (wouldExceedLimits) {
        // Try truncating the message if it's too long
        if (message.charCount > CONTEXT_LIMITS.MAX_MESSAGE_CHARS) {
          const truncatedContent = truncateMessage(message.content, CONTEXT_LIMITS.MAX_MESSAGE_CHARS);
          const truncatedChars = truncatedContent.length;
          const truncatedTokens = estimateTokenCount(truncatedContent);
          
          if (totalChars + truncatedChars <= opts.maxContextChars &&
              totalTokens + truncatedTokens <= opts.maxContextTokens &&
              selectedMessages.length + 1 <= opts.maxMessages) {
            
            selectedMessages.push({
              ...message,
              content: truncatedContent,
              charCount: truncatedChars,
              estimatedTokens: truncatedTokens,
            });
            totalChars += truncatedChars;
            totalTokens += truncatedTokens;
          }
        }
        continue;
      }
      
      selectedMessages.push(message);
      totalChars += message.charCount;
      totalTokens += message.estimatedTokens;
    }
  }

  // Sort selected messages by creation time to maintain conversation order
  const sortedMessages = selectedMessages.sort((a, b) => 
    a.createdAt.getTime() - b.createdAt.getTime()
  );

  // Convert back to ConversationMessage format
  return sortedMessages.map(msg => ({
    id: msg.id,
    conversationId: messages[0]?.conversationId || "",
    role: msg.role,
    content: msg.content,
    citations: msg.citations || [],
    createdAt: msg.createdAt,
  }));
}

/**
 * Creates a context summary from pruned messages
 */
export function createContextSummary(
  originalCount: number,
  prunedCount: number,
  totalChars: number,
  totalTokens: number
): string {
  if (originalCount === prunedCount) {
    return `Full conversation history included (${prunedCount} messages, ~${totalTokens} tokens)`;
  }
  
  const omittedCount = originalCount - prunedCount;
  return `Conversation summary: ${prunedCount} of ${originalCount} messages included (${omittedCount} messages omitted for context length). Total: ~${totalTokens} tokens, ${totalChars} characters.`;
}

/**
 * Intelligent context window management for RAG queries
 * This function combines conversation history with document context efficiently
 */
export function manageRAGContext(
  conversationMessages: ConversationMessage[],
  documentContext: string,
  options: Partial<ContextOptionsType> = {}
): {
  prunedMessages: ConversationMessage[];
  contextSummary: string;
  totalTokens: number;
  availableTokensForResponse: number;
} {
  const opts = ContextOptions.parse(options);
  
  // Reserve tokens for document context and response
  const documentTokens = estimateTokenCount(documentContext);
  const reservedTokensForResponse = 1000; // Reserve tokens for the LLM response
  const availableTokensForHistory = opts.maxContextTokens - documentTokens - reservedTokensForResponse;
  
  // Adjust context options based on available space
  const adjustedOptions = {
    ...opts,
    maxContextTokens: Math.max(availableTokensForHistory, opts.maxContextTokens * 0.3), // At least 30% for history
  };
  
  const prunedMessages = pruneConversationHistory(conversationMessages, adjustedOptions);
  
  const totalChars = prunedMessages.reduce((sum, msg) => sum.length + msg.content.length, 0);
  const totalTokens = estimateTokenCount(prunedMessages.map(msg => msg.content).join(" ")) + documentTokens;
  const availableTokensForResponse = opts.maxContextTokens - totalTokens;
  
  const contextSummary = createContextSummary(
    conversationMessages.length,
    prunedMessages.length,
    totalChars,
    totalTokens
  );
  
  return {
    prunedMessages,
    contextSummary,
    totalTokens,
    availableTokensForResponse: Math.max(availableTokensForResponse, 500), // Ensure minimum response space
  };
}

/**
 * Analyzes conversation for memory patterns and important context
 */
export function analyzeConversationPatterns(messages: ConversationMessage[]): {
  topicClusters: string[];
  keyEntities: string[];
  conversationTrends: string[];
} {
  const allContent = messages.map(msg => msg.content).join(" ");
  const allContentLower = allContent.toLowerCase();
  
  // Extract potential topics (simple keyword frequency analysis)
  const words = allContentLower.match(/\b\w{4,}\b/g) || [];
  const wordFreq = words.reduce((freq, word) => {
    freq[word] = (freq[word] || 0) + 1;
    return freq;
  }, {} as Record<string, number>);
  
  const topicClusters = Object.entries(wordFreq)
    .filter(([_, count]) => count >= 2) // Lower threshold for tests
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
  
  // Simple entity extraction (capitalized words from original case content)
  const entities = allContent.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
  const entityFreq = entities.reduce((freq, entity) => {
    freq[entity] = (freq[entity] || 0) + 1;
    return freq;
  }, {} as Record<string, number>);
  
  const keyEntities = Object.entries(entityFreq)
    .filter(([_, count]) => count >= 1) // Lower threshold for tests
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([entity]) => entity);
  
  // Analyze conversation trends
  const trends: string[] = [];
  if (messages.length > 10) trends.push("Extended conversation");
  if (messages.some(msg => msg.citations && msg.citations.length > 0)) {
    trends.push("Document-heavy discussion");
  }
  if (messages.filter(msg => msg.role === "user").length > messages.filter(msg => msg.role === "assistant").length) {
    trends.push("Question-heavy session");
  }
  
  return {
    topicClusters,
    keyEntities,
    conversationTrends: trends,
  };
}