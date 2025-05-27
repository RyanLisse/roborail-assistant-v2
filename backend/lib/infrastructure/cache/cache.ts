import { cache } from "encore.dev/storage";
import { OutboundCall } from "encore.dev/internal/client";
import { Duration } from "encore.dev/types/units";

// Define a shared cache cluster for the application
// This will be provisioned as a Redis instance by Encore.
export const AppCacheCluster = cache.NewCluster("app-cache", {
  // EvictionPolicy.AllKeysLRU is a good default for typical cache use cases.
  // (Assuming Encore.ts has a similar enum or string literal for policies)
  EvictionPolicy: cache.EvictionPolicy.AllKeysLRU, 
});

// --- Keyspace Definitions ---

// Example: Keyspace for caching Conversation objects from chat-service
export interface ConversationCacheKey {
  conversationId: string;
}
// Assuming ConversationObject is the type of the object being cached
// This type would be defined in the chat service, e.g., imported from "../../chat/conversation-management"
// For now, let's use a placeholder
interface PlaceholderConversationObject { id: string; title: string; messages: any[]; createdAt: Date; updatedAt: Date; userId: string; } 

export const ConversationKeyspace = cache.NewStructKeyspace<ConversationCacheKey, PlaceholderConversationObject>(
  AppCacheCluster, 
  {
    KeyPattern: "conv/:conversationId",
    DefaultExpiry: Duration.fromMinutes(60), // Cache conversations for 60 minutes
  }
);

// Example: Keyspace for caching Document metadata from docmgmt-service
export interface DocumentMetadataCacheKey {
  documentId: string;
}
// Assuming DocumentMetadataObject is the type of the object being cached
// This type would be defined in the docmgmt service, e.g., imported from "../../../docmgmt/documents"
// For now, let's use a placeholder
interface PlaceholderDocumentObject { id: string; filename: string; originalName: string; contentType: string; fileSize: number; status: string; uploadedAt: Date; metadata: any; }

export const DocumentMetadataKeyspace = cache.NewStructKeyspace<DocumentMetadataCacheKey, PlaceholderDocumentObject>(
  AppCacheCluster, 
  {
    KeyPattern: "docmeta/:documentId",
    DefaultExpiry: Duration.fromHours(24), // Cache document metadata for 24 hours
  }
);

// Example: Keyspace for simple string values (e.g., feature flags, config)
export interface GenericStringCacheKey {
  key: string;
}
export const GenericStringKeyspace = cache.NewStringKeyspace<GenericStringCacheKey>(
  AppCacheCluster,
  {
    KeyPattern: "genericStr/:key",
    DefaultExpiry: Duration.fromHours(1),
  }
);

// Example: Keyspace for integer counters (e.g., rate limiting - though Encore has specific rate limiting primitives too)
export interface CounterCacheKey {
  counterName: string;
  identifier: string; // e.g., userId or ipAddress
}
export const CounterKeyspace = cache.NewIntKeyspace<CounterCacheKey>(
  AppCacheCluster,
  {
    KeyPattern: "counter/:counterName/:identifier",
    // Counters might not need default expiry if they are frequently updated or reset
  }
);


// TODO:
// - Replace PlaceholderConversationObject and PlaceholderDocumentObject with actual imported types from respective services.
// - Add more specific keyspaces as caching needs are identified for other data types or services.
// - Review and adjust DefaultExpiry times based on data volatility and access patterns.
// - Ensure the EvictionPolicy enum/value `cache.EvictionPolicy.AllKeysLRU` matches Encore.ts syntax.
//   If not, use the string literal "allkeys-lru" or the correct TypeScript equivalent.

export const AppCacheCluster = cache.NewCluster("app-cache", {
  // EvictionPolicy.AllKeysLRU is a good default for typical cache use cases.
  // (Assuming Encore.ts has a similar enum or string literal for policies)
  EvictionPolicy: cache.EvictionPolicy.AllKeysLRU, 
}); 