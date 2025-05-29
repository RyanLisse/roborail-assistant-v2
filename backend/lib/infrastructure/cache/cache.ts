// Cache interface definitions for compatibility
// Note: Encore cache storage module not available in current version
// This provides type definitions for future cache implementation

export interface ConversationCacheKey {
  conversationId: string;
}

export interface DocumentMetadataCacheKey {
  documentId: string;
}

export interface GenericStringCacheKey {
  key: string;
}

export interface CounterCacheKey {
  counterName: string;
  identifier: string; 
}

// Placeholder cache implementations (in-memory fallback)
// TODO: Replace with actual Encore cache when storage module is available
export const ConversationKeyspace = {
  get: async (_key: ConversationCacheKey) => { throw new Error("Cache miss"); },
  set: async (_key: ConversationCacheKey, _value: any) => {},
  delete: async (_key: ConversationCacheKey) => {},
  with: (_options: any) => ConversationKeyspace
};

export const DocumentMetadataKeyspace = {
  get: async (_key: DocumentMetadataCacheKey) => { throw new Error("Cache miss"); },
  set: async (_key: DocumentMetadataCacheKey, _value: any) => {},
  delete: async (_key: DocumentMetadataCacheKey) => {},
  with: (_options: any) => DocumentMetadataKeyspace
};

export const GenericStringKeyspace = {
  get: async (_key: GenericStringCacheKey) => { throw new Error("Cache miss"); },
  set: async (_key: GenericStringCacheKey, _value: any) => {},
  delete: async (_key: GenericStringCacheKey) => {},
  with: (_options: any) => GenericStringKeyspace
};

export const CounterKeyspace = {
  get: async (_key: CounterCacheKey) => { throw new Error("Cache miss"); },
  set: async (_key: CounterCacheKey, _value: any) => {},
  delete: async (_key: CounterCacheKey) => {},
  increment: async (_key: CounterCacheKey, _delta: bigint) => BigInt(0),
  with: (_options: any) => CounterKeyspace
};
