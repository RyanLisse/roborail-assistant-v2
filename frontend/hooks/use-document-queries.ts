import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  backendClient,
  uploadFile,
  searchKnowledgeBase,
  type DocumentUploadRequest, 
  type DocumentUploadResponse,
  type DocumentSearchRequest,
  type DocumentSearchResponse 
} from '@/lib/api/backend-client'

// Query keys factory for documents
export const documentKeys = {
  all: ['documents'] as const,
  uploads: () => [...documentKeys.all, 'uploads'] as const,
  upload: (documentId: string) => [...documentKeys.all, 'upload', documentId] as const,
  status: (documentId: string) => [...documentKeys.all, 'status', documentId] as const,
  search: (query: string, userId: string, options?: any) => 
    [...documentKeys.all, 'search', query, userId, options] as const,
}

// Hook for document upload status
export function useDocumentStatus(documentId: string, enabled = true) {
  return useQuery({
    queryKey: documentKeys.status(documentId),
    queryFn: () => backendClient.getDocumentStatus(documentId),
    enabled: enabled && !!documentId,
    refetchInterval: (query) => {
      // Stop polling if processing is complete
      if (query.state.data?.status === 'completed' || query.state.data?.status === 'failed') {
        return false
      }
      return 2000 // Poll every 2 seconds while processing
    },
    staleTime: 0, // Always fetch fresh status
  })
}

// Hook for searching documents/knowledge base
export function useDocumentSearch(
  query: string,
  userId: string,
  options: {
    limit?: number
    enableReranking?: boolean
    threshold?: number
    enabled?: boolean
  } = {}
) {
  const { limit = 10, enableReranking = true, threshold = 0.5, enabled = true } = options

  return useQuery({
    queryKey: documentKeys.search(query, userId, { limit, enableReranking, threshold }),
    queryFn: () => searchKnowledgeBase(query, userId, { limit, enableReranking, threshold }),
    enabled: enabled && !!query && !!userId && query.length > 2, // Only search if query is meaningful
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

// Mutation hook for document upload
export function useDocumentUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) => 
      uploadFile(file, userId),
    onSuccess: (data) => {
      // Invalidate upload-related queries
      queryClient.invalidateQueries({
        queryKey: documentKeys.uploads()
      })
      
      // Start polling the document status
      queryClient.invalidateQueries({
        queryKey: documentKeys.status(data.documentId)
      })
    },
  })
}

// Mutation hook for direct API document upload (if needed)
export function useDirectDocumentUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: DocumentUploadRequest) => 
      backendClient.uploadDocument(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.uploads()
      })
      queryClient.invalidateQueries({
        queryKey: documentKeys.status(data.documentId)
      })
    },
  })
}

// Hook to get multiple document statuses (useful for upload queue)
export function useDocumentStatuses(documentIds: string[]) {
  return useQuery({
    queryKey: [...documentKeys.all, 'statuses', documentIds],
    queryFn: async () => {
      const statuses = await Promise.all(
        documentIds.map(async (id) => ({
          documentId: id,
          ...(await backendClient.getDocumentStatus(id))
        }))
      )
      return statuses
    },
    enabled: documentIds.length > 0,
    refetchInterval: (query) => {
      // Stop polling if all documents are processed
      const allProcessed = query.state.data?.every(
        (status) => status.status === 'completed' || status.status === 'failed'
      )
      return allProcessed ? false : 3000 // Poll every 3 seconds
    },
    staleTime: 0,
  })
}

// Hook for prefetching search results (useful for search suggestions)
export function usePrefetchDocumentSearch() {
  const queryClient = useQueryClient()

  return (query: string, userId: string, options: {
    limit?: number
    enableReranking?: boolean
    threshold?: number
  } = {}) => {
    if (query.length > 2) {
      queryClient.prefetchQuery({
        queryKey: documentKeys.search(query, userId, options),
        queryFn: () => searchKnowledgeBase(query, userId, options),
        staleTime: 5 * 60 * 1000,
      })
    }
  }
}

// Custom hook for debounced search
export function useDebouncedDocumentSearch(
  query: string,
  userId: string,
  debounceMs = 300,
  options: {
    limit?: number
    enableReranking?: boolean
    threshold?: number
  } = {}
) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  return useDocumentSearch(debouncedQuery, userId, {
    ...options,
    enabled: debouncedQuery.length > 2
  })
}

// We need to import useState and useEffect for the debounced hook
import { useState, useEffect } from 'react'