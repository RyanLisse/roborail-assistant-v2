// Chat-related hooks
export {
  useConversations,
  useConversation,
  useConversationMessages,
  useChatHealth,
  useRagHealth,
  useSendMessage,
  useDeleteConversation,
  usePrefetchConversation,
  chatKeys,
} from './use-chat-queries'

// Document-related hooks
export {
  useDocumentStatus,
  useDocumentSearch,
  useDocumentUpload,
  useDirectDocumentUpload,
  useDocumentStatuses,
  usePrefetchDocumentSearch,
  useDebouncedDocumentSearch,
  documentKeys,
} from './use-document-queries'

// Common patterns hooks
export {
  useOptimisticUpdate,
  useDataSync,
  useSmartPolling,
  usePaginatedData,
  useRealTimeUpdates,
  useBackgroundRefresh,
  useDataValidation,
  useCacheWarming,
  useDependentQuery,
  useMutationWithRollback,
} from './use-common-patterns'

// Re-export existing hooks
export { useArtifact } from './use-artifact'
export { useAutoResume } from './use-auto-resume'
export { useChatVisibility } from './use-chat-visibility'
export { useMessages } from './use-messages'
export { useIsMobile } from './use-mobile'
export { useScrollToBottom } from './use-scroll-to-bottom'