import log from "encore.dev/log";
import { pruneConversationHistory, ContextOptionsType } from "./context-management";

// Define Message type based on what is stored/passed around
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number; // Optional for more advanced pruning
  createdAt?: Date;
  id?: string;
  conversationId?: string;
  citations?: any[];
}

interface PruningOptions {
  maxMessages?: number; // Max total messages
  maxTokens?: number;   // Max total tokens (requires token counting)
  preserveSystemMessage?: boolean;
  maxContextChars?: number;
  maxContextTokens?: number;
  minRecentMessages?: number;
  prioritizeRecent?: boolean;
}

/**
 * Conversation Pruning Service
 * 
 * Provides conversation history pruning functionality to manage context windows
 * for LLM interactions. This is a wrapper around the existing context management
 * functionality to provide the interface specified in the PRD.
 */
export class ConversationPruningService {
  /**
   * Prune conversation messages to fit within specified limits
   * 
   * @param messages Array of conversation messages to prune
   * @param options Pruning configuration options
   * @returns Pruned array of messages
   */
  async pruneConversation(
    messages: Message[],
    options: PruningOptions = {}
  ): Promise<Message[]> {
    try {
      const {
        maxMessages = 20,
        maxTokens,
        preserveSystemMessage = true,
        maxContextChars = 6000,
        maxContextTokens = 2000,
        minRecentMessages = 3,
        prioritizeRecent = true,
      } = options;

      if (messages.length === 0) {
        return [];
      }

      // Convert to the format expected by the existing pruning function
      const conversationMessages = messages.map(msg => ({
        id: msg.id || `temp-${Date.now()}`,
        conversationId: msg.conversationId || 'temp-conversation',
        role: msg.role,
        content: msg.content,
        citations: msg.citations || [],
        createdAt: msg.createdAt || new Date(),
      }));

      // Use the existing sophisticated pruning logic
      const contextOptions: Partial<ContextOptionsType> = {
        maxMessages,
        maxContextChars,
        maxContextTokens: maxTokens || maxContextTokens,
        minRecentMessages,
        prioritizeRecent,
      };

      const prunedMessages = pruneConversationHistory(conversationMessages, contextOptions);

      // Convert back to the Message format
      const result = prunedMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        tokenCount: Math.ceil(msg.content.length / 4), // Rough token estimation
        createdAt: msg.createdAt,
        id: msg.id,
        conversationId: msg.conversationId,
        citations: msg.citations,
      }));

      log.debug("Conversation pruned", { 
        originalCount: messages.length, 
        prunedCount: result.length,
        maxMessages,
        maxTokens: maxTokens || maxContextTokens,
      });

      return result;

    } catch (error) {
      log.error("Failed to prune conversation", { error, messageCount: messages.length });
      
      // Fallback: simple pruning by message count
      let prunedMessages = [...messages];
      const { maxMessages = 20, preserveSystemMessage = true } = options;

      let systemMessage: Message | undefined;
      if (preserveSystemMessage && prunedMessages.length > 0 && prunedMessages[0].role === 'system') {
        systemMessage = prunedMessages.shift();
      }

      if (maxMessages && prunedMessages.length > maxMessages) {
        prunedMessages = prunedMessages.slice(-maxMessages);
        log.debug("Applied fallback pruning by maxMessages", { 
          originalCount: messages.length, 
          newCount: prunedMessages.length, 
          maxMessages 
        });
      }

      if (systemMessage) {
        prunedMessages.unshift(systemMessage);
      }

      return prunedMessages;
    }
  }

  /**
   * Estimate the total token count for a set of messages
   */
  estimateTokenCount(messages: Message[]): number {
    return messages.reduce((total, msg) => {
      return total + Math.ceil(msg.content.length / 4); // Rough estimation: 4 chars per token
    }, 0);
  }

  /**
   * Check if messages exceed the specified limits
   */
  exceedsLimits(messages: Message[], options: PruningOptions): boolean {
    const { maxMessages, maxTokens } = options;
    
    if (maxMessages && messages.length > maxMessages) {
      return true;
    }
    
    if (maxTokens && this.estimateTokenCount(messages) > maxTokens) {
      return true;
    }
    
    return false;
  }
} 