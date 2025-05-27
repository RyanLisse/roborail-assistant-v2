import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { chatKeys } from './use-chat-queries'
import { documentKeys } from './use-document-queries'

// Common pattern: Optimistic updates
export function useOptimisticUpdate() {
  const queryClient = useQueryClient()

  const optimisticUpdate = useCallback(
    <T>(queryKey: any[], updaterFn: (oldData: T) => T) => {
      const previousData = queryClient.getQueryData<T>(queryKey)
      
      if (previousData) {
        queryClient.setQueryData<T>(queryKey, updaterFn(previousData))
      }
      
      return () => {
        if (previousData) {
          queryClient.setQueryData<T>(queryKey, previousData)
        }
      }
    },
    [queryClient]
  )

  return optimisticUpdate
}

// Common pattern: Data synchronization between related queries
export function useDataSync() {
  const queryClient = useQueryClient()

  const syncConversationData = useCallback(
    (conversationId: string, userId: string, newData: any) => {
      // Update the conversation in the conversations list
      queryClient.setQueryData(
        chatKeys.conversations(userId),
        (oldData: any) => {
          if (!oldData) return oldData
          
          const updatedConversations = oldData.conversations.map((conv: any) =>
            conv.id === conversationId ? { ...conv, ...newData } : conv
          )
          
          return {
            ...oldData,
            conversations: updatedConversations
          }
        }
      )

      // Update the individual conversation data
      queryClient.setQueryData(
        chatKeys.conversation(conversationId, userId),
        (oldData: any) => oldData ? { ...oldData, ...newData } : oldData
      )
    },
    [queryClient]
  )

  return { syncConversationData }
}

// Common pattern: Polling with smart intervals
export function useSmartPolling(
  queryKey: any[],
  queryFn: () => Promise<any>,
  shouldPoll: (data: any) => boolean,
  interval = 2000
) {
  return useQuery({
    queryKey,
    queryFn,
    refetchInterval: (data) => shouldPoll(data) ? interval : false,
    staleTime: 0,
  })
}

// Common pattern: Infinite scrolling/pagination
export function usePaginatedData<T>(
  queryKeyBase: any[],
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>,
  pageSize = 20
) {
  const [pages, setPages] = useState<T[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const queryKey = useMemo(
    () => [...queryKeyBase, 'paginated', currentPage, pageSize],
    [queryKeyBase, currentPage, pageSize]
  )

  const { data, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchFn(currentPage, pageSize),
    enabled: hasMore,
  })

  useEffect(() => {
    if (data) {
      setPages(prev => currentPage === 1 ? data.data : [...prev, ...data.data])
      setHasMore(data.hasMore)
    }
  }, [data, currentPage])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasMore, isLoading])

  const reset = useCallback(() => {
    setPages([])
    setCurrentPage(1)
    setHasMore(true)
  }, [])

  return {
    data: pages,
    hasMore,
    isLoading: isLoading,
    isError,
    error,
    loadMore,
    reset,
  }
}

// Common pattern: Real-time data updates
export function useRealTimeUpdates(
  queryKey: any[],
  shouldUpdate: boolean = true
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!shouldUpdate) return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey })
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [queryClient, queryKey, shouldUpdate])
}

// Common pattern: Background refresh
export function useBackgroundRefresh(
  queryKeys: any[][],
  intervalMs = 5 * 60 * 1000 // 5 minutes
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const interval = setInterval(() => {
      queryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [queryClient, queryKeys, intervalMs])
}

// Common pattern: Data validation and error boundaries
export function useDataValidation<T>(
  data: T | undefined,
  validator: (data: any) => data is T,
  fallback: T
): T {
  return useMemo(() => {
    if (!data) return fallback
    return validator(data) ? data : fallback
  }, [data, validator, fallback])
}

// Common pattern: Cache warming
export function useCacheWarming() {
  const queryClient = useQueryClient()

  const warmCache = useCallback(
    (queries: Array<{ queryKey: any[]; queryFn: () => Promise<any> }>) => {
      queries.forEach(({ queryKey, queryFn }) => {
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: 5 * 60 * 1000,
        })
      })
    },
    [queryClient]
  )

  return warmCache
}

// Common pattern: Dependent queries with error handling
export function useDependentQuery<T, U>(
  primaryQueryKey: any[],
  primaryQueryFn: () => Promise<T>,
  dependentQueryKey: (data: T) => any[],
  dependentQueryFn: (data: T) => Promise<U>,
  enabled = true
) {
  const primaryQuery = useQuery({
    queryKey: primaryQueryKey,
    queryFn: primaryQueryFn,
    enabled,
  })

  const dependentQuery = useQuery({
    queryKey: primaryQuery.data ? dependentQueryKey(primaryQuery.data) : ['dependent-disabled'],
    queryFn: () => primaryQuery.data ? dependentQueryFn(primaryQuery.data) : Promise.reject('No primary data'),
    enabled: enabled && !!primaryQuery.data && !primaryQuery.isError,
  })

  return {
    primary: primaryQuery,
    dependent: dependentQuery,
    isLoading: primaryQuery.isLoading || (primaryQuery.isSuccess && dependentQuery.isLoading),
    error: primaryQuery.error || dependentQuery.error,
    data: dependentQuery.data,
  }
}

// Common pattern: Mutation with rollback
export function useMutationWithRollback<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  optimisticUpdate: (variables: TVariables) => () => void
) {
  const [rollbackFn, setRollbackFn] = useState<(() => void) | null>(null)

  const mutation = useMutation({
    mutationFn,
    onMutate: (variables) => {
      const rollback = optimisticUpdate(variables)
      setRollbackFn(() => rollback)
      return { rollback }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.rollback) {
        context.rollback()
      }
      setRollbackFn(null)
    },
    onSuccess: () => {
      setRollbackFn(null)
    },
  })

  return {
    ...mutation,
    rollback: rollbackFn,
  }
}