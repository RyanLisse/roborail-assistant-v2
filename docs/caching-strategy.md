# Caching Strategy

This document outlines the caching strategy for the `roborail-assistant` project, aimed at improving performance and reducing database load.

## Caching Technology

We leverage **Encore's built-in caching capabilities** (`encore.dev/storage/cache` or its TypeScript equivalent). Encore manages the underlying cache infrastructure (typically Redis), providing a declarative way to define and use distributed caches.

## Cache Infrastructure (`backend/lib/infrastructure/cache/cache.ts`)

1.  **Cache Cluster:**
    *   A single, shared cache cluster named `app-cache` is defined: `export const AppCacheCluster = cache.NewCluster("app-cache", { EvictionPolicy: cache.EvictionPolicy.AllKeysLRU });`
    *   The `AllKeysLRU` (Least Recently Used) eviction policy is used as a general default.

2.  **Keyspaces:**
    *   Type-safe keyspaces are defined for different data types to ensure key uniqueness and clarity.
    *   **`ConversationKeyspace`**: For caching `PlaceholderConversationObject` objects.
        *   `KeyPattern: "conv/:conversationId"`
        *   `DefaultExpiry: Duration.fromMinutes(60)` (1 hour)
    *   **`DocumentMetadataKeyspace`**: For caching `PlaceholderDocumentObject` (document metadata).
        *   `KeyPattern: "docmeta/:documentId"`
        *   `DefaultExpiry: Duration.fromHours(24)` (24 hours)
    *   **`GenericStringKeyspace`**: For caching generic string values.
        *   `KeyPattern: "genericStr/:key"`
        *   `DefaultExpiry: Duration.fromHours(1)`
    *   **`CounterKeyspace`**: For integer counters.
        *   `KeyPattern: "counter/:counterName/:identifier"`
        *   No default expiry (typically managed by increment/decrement logic or specific TTLs).

## Cache Service Utility (`backend/lib/cache/cache.service.ts`)

A `CacheService` class provides a wrapper around the Encore keyspaces, offering methods like:
*   `getStruct<K, V>(keyspace, key)`
*   `setStruct<K, V>(keyspace, key, value, ttl?)`
*   `deleteStruct<K>(keyspace, key)`
*   Similar methods for string and counter keyspaces.
*   Specific helper methods like `getCachedConversation`, `setCachedConversation`, `getCachedDocumentMetadata`, etc.

This service centralizes cache interaction logic and error handling.

## Cached Entities and Invalidation Strategy

1.  **Conversations (`chat/conversation-management.ts`):**
    *   **Cached Data:** `PlaceholderConversationObject` (includes conversation details and potentially messages, though current implementation caches messages as part of the object, which might be refined for very long conversations).
    *   **Retrieval:** `getConversation` attempts to fetch from `ConversationKeyspace` before DB query.
    *   **Storage:** After fetching from DB, the conversation object is stored in the cache.
    *   **Invalidation:**
        *   On `addMessage`: Cache for the respective `conversationId` is deleted.
        *   On `deleteConversation`: Cache for the `conversationId` is deleted.
        *   TTL: 60 minutes.

2.  **Document Metadata (`docmgmt/documents.ts`):**
    *   **Cached Data:** `PlaceholderDocumentObject` (includes document metadata like filename, status, size, etc.).
    *   **Retrieval:** `getDocument` attempts to fetch from `DocumentMetadataKeyspace` before DB query.
    *   **Storage:** After fetching from DB, document metadata is stored in the cache.
    *   **Invalidation:**
        *   On `updateDocument`: Cache for the respective `documentId` is deleted.
        *   On `deleteDocument`: Cache for the `documentId` is deleted.
        *   TTL: 24 hours.

## Cache Key Conventions

Cache keys are structured using Encore's `KeyPattern` feature within each keyspace (e.g., `conv/:conversationId`, `docmeta/:documentId`). This ensures uniqueness and provides a clear naming convention.

## Future Considerations

*   **Refine Placeholder Objects:** Replace `PlaceholderConversationObject` and `PlaceholderDocumentObject` in `cache.ts` and `cache.service.ts` with actual imported types from the respective services once those types are finalized and stable.
*   **Granular Message Caching:** For conversations with many messages, consider caching messages separately or paginated within the cache to avoid storing very large objects in `ConversationKeyspace`.
*   **Advanced Invalidation:** Explore event-driven cache invalidation if more complex scenarios arise (e.g., using Encore Pub/Sub).
*   **Monitoring:** Utilize Encore's observability features to monitor cache hit/miss rates and performance.
*   **Error Handling:** The `CacheService` includes basic error logging for cache operations. Cache misses are logged at debug level and do not propagate as errors to the calling service, allowing a fallback to DB fetch.

This caching strategy provides a foundation for improving application performance. It will be reviewed and adapted as the application evolves and performance characteristics become clearer. 