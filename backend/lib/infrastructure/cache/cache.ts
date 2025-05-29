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
  get: async (key: ConversationCacheKey) => { throw new Error("Cache miss"); },
  set: async (key: ConversationCacheKey, value: any) => {},
  delete: async (key: ConversationCacheKey) => {},
  with: (options: any) => ConversationKeyspace
};

export const DocumentMetadataKeyspace = {
  get: async (key: DocumentMetadataCacheKey) => { throw new Error("Cache miss"); },
  set: async (key: DocumentMetadataCacheKey, value: any) => {},
  delete: async (key: DocumentMetadataCacheKey) => {},
  with: (options: any) => DocumentMetadataKeyspace
};

export const GenericStringKeyspace = {
  get: async (key: GenericStringCacheKey) => { throw new Error("Cache miss"); },
  set: async (key: GenericStringCacheKey, value: any) => {},
  delete: async (key: GenericStringCacheKey) => {},
  with: (options: any) => GenericStringKeyspace
};

export const CounterKeyspace = {
  get: async (key: CounterCacheKey) => { throw new Error("Cache miss"); },
  set: async (key: CounterCacheKey, value: any) => {},
  delete: async (key: CounterCacheKey) => {},
  increment: async (key: CounterCacheKey, delta: bigint) => BigInt(0),
  with: (options: any) => CounterKeyspace
};
