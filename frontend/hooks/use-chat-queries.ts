import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  backendClient, 
  type ChatRequest, 
  type ChatResponse,
  type ConversationResponse,
  type ConversationWithMessages,
  type MessageResponse 
} from '@/lib/api/backend-client'

// Query keys factory for consistent key generation
export const chatKeys = {
  all: ['chat'] as const,
  conversations: (userId: string) => [...chatKeys.all, 'conversations', userId] as const,
  conversation: (conversationId: string, userId: string) => 
    [...chatKeys.all, 'conversation', conversationId, userId] as const,
  messages: (conversationId: string, userId: string) => 
    [...chatKeys.all, 'messages', conversationId, userId] as const,
  health: () => [...chatKeys.all, 'health'] as const,
  ragHealth: () => [...chatKeys.all, 'rag-health'] as const,
}

// Hook for fetching conversation list
export function useConversations(
  userId: string,
  options: {
    page?: number
    pageSize?: number
    search?: string
    enabled?: boolean
  } = {}
) {
  const { page = 1, pageSize = 20, search, enabled = true } = options

  return useQuery({
    queryKey: [...chatKeys.conversations(userId), { page, pageSize, search }],
    queryFn: () => backendClient.listConversations(userId, page, pageSize, search),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for fetching a specific conversation with messages
export function useConversation(conversationId: string, userId: string, enabled = true) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId, userId),
    queryFn: () => backendClient.getConversation(conversationId, userId),
    enabled: enabled && !!conversationId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Hook for fetching conversation messages only
export function useConversationMessages(conversationId: string, userId: string, enabled = true) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId, userId),
    queryFn: () => backendClient.getConversationMessages(conversationId, userId),
    enabled: enabled && !!conversationId && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Hook for health check
export function useChatHealth() {
  return useQuery({
    queryKey: chatKeys.health(),
    queryFn: () => backendClient.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Hook for RAG health check
export function useRagHealth() {
  return useQuery({
    queryKey: chatKeys.ragHealth(),
    queryFn: () => backendClient.ragHealthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Mutation hook for sending messages
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ChatRequest) => backendClient.sendMessage(request),
    onSuccess: (data, variables) => {
      // Invalidate and refetch conversation queries
      if (variables.conversationId) {
        queryClient.invalidateQueries({
          queryKey: chatKeys.conversation(variables.conversationId, variables.userId)
        })
        queryClient.invalidateQueries({
          queryKey: chatKeys.messages(variables.conversationId, variables.userId)
        })
      }
      
      // Invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations(variables.userId)
      })
    },
  })
}

// Mutation hook for deleting conversations
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      backendClient.deleteConversation(conversationId, userId),
    onSuccess: (_, variables) => {
      // Remove the conversation from cache
      queryClient.removeQueries({
        queryKey: chatKeys.conversation(variables.conversationId, variables.userId)
      })
      queryClient.removeQueries({
        queryKey: chatKeys.messages(variables.conversationId, variables.userId)
      })
      
      // Invalidate conversations list to update UI
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations(variables.userId)
      })
    },
  })
}

// Hook to prefetch a conversation (useful for hover effects)
export function usePrefetchConversation() {
  const queryClient = useQueryClient()

  return (conversationId: string, userId: string) => {
    queryClient.prefetchQuery({
      queryKey: chatKeys.conversation(conversationId, userId),
      queryFn: () => backendClient.getConversation(conversationId, userId),
      staleTime: 2 * 60 * 1000,
    })
  }
}