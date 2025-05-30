import log from "encore.dev/log";
import type {
  ConversationCacheKey,
  CounterCacheKey,
  DocumentMetadataCacheKey,
  GenericStringCacheKey,
} from "../infrastructure/cache/cache";
import {
  ConversationKeyspace,
  CounterKeyspace,
  DocumentMetadataKeyspace,
  GenericStringKeyspace,
} from "../infrastructure/cache/cache";

// Cache error types for compatibility
class CacheMiss extends Error {
  static is(error: any): boolean {
    return error?.message === "Cache miss";
  }
}

// Duration type for compatibility
type Duration = number;

const logger = log.with({ service: "cache-service" });

// Cache object types for conversation and document metadata
export interface PlaceholderConversationObject {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
export interface PlaceholderDocumentObject {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  contentType: string;
  fileSize: number;
  status: string;
  uploadedAt: Date;
  metadata: any;
}

export class CacheService {
  /**
   * Retrieves an item from a specified StructKeyspace.
   * @param keyspace The Encore StructKeyspace to use.
   * @param key The key object for the item.
   * @returns The cached item or null if not found or error.
   */
  static async getStruct<K, V>(keyspace: any, key: K): Promise<V | null> {
    try {
      const value = await keyspace.get(key);
      logger.debug("Cache hit", { key });
      return value;
    } catch (error) {
      if (CacheMiss.is(error)) {
        logger.debug("Cache miss", { key });
      } else {
        logger.error(error as Error, "Error getting item from cache", { key });
      }
      return null;
    }
  }

  /**
   * Sets an item in a specified StructKeyspace.
   * @param keyspace The Encore StructKeyspace to use.
   * @param key The key object for the item.
   * @param value The value to cache.
   * @param ttl Optional TTL for this specific item, overriding keyspace default.
   */
  static async setStruct<K, V>(
    keyspace: any,
    key: K,
    value: V,
    ttl?: Duration
  ): Promise<void> {
    try {
      if (ttl) {
        await keyspace.with({ defaultExpiry: ttl }).set(key, value);
      } else {
        await keyspace.set(key, value);
      }
      logger.debug("Item set in cache", { key, ttl });
    } catch (error) {
      logger.error(error as Error, "Error setting item in cache", { key });
    }
  }

  /**
   * Deletes an item from a specified StructKeyspace.
   * @param keyspace The Encore StructKeyspace to use.
   * @param key The key object for the item.
   */
  static async deleteStruct<K>(keyspace: any, key: K): Promise<void> {
    try {
      await keyspace.delete(key);
      logger.debug("Item deleted from cache", { key });
    } catch (error) {
      logger.error(error as Error, "Error deleting item from cache", { key });
    }
  }

  // --- String Keyspace Methods ---
  static async getString(key: GenericStringCacheKey): Promise<string | null> {
    try {
      const value = await GenericStringKeyspace.get(key);
      logger.debug("Cache hit (string)", { key });
      return value;
    } catch (error) {
      if (CacheMiss.is(error)) {
        logger.debug("Cache miss (string)", { key });
      } else {
        logger.error(error as Error, "Error getting string from cache", { key });
      }
      return null;
    }
  }

  static async setString(key: GenericStringCacheKey, value: string, ttl?: Duration): Promise<void> {
    try {
      if (ttl) {
        await GenericStringKeyspace.with({ defaultExpiry: ttl }).set(key, value);
      } else {
        await GenericStringKeyspace.set(key, value);
      }
      logger.debug("String set in cache", { key, ttl });
    } catch (error) {
      logger.error(error as Error, "Error setting string in cache", { key });
    }
  }

  static async deleteString(key: GenericStringCacheKey): Promise<void> {
    try {
      await GenericStringKeyspace.delete(key);
      logger.debug("String deleted from cache", { key });
    } catch (error) {
      logger.error(error as Error, "Error deleting string from cache", { key });
    }
  }

  // --- Counter (Int) Keyspace Methods ---
  static async getCounter(key: CounterCacheKey): Promise<number | null> {
    try {
      const value = await CounterKeyspace.get(key);
      logger.debug("Cache hit (counter)", { key });
      return Number(value);
    } catch (error) {
      if (CacheMiss.is(error)) {
        logger.debug("Cache miss (counter)", { key });
      } else {
        logger.error(error as Error, "Error getting counter from cache", { key });
      }
      return null;
    }
  }

  static async incrementCounter(key: CounterCacheKey, delta: number = 1): Promise<number | null> {
    try {
      const newValue = await CounterKeyspace.increment(key, BigInt(delta));
      logger.debug("Counter incremented in cache", { key, delta, newValue: Number(newValue) });
      return Number(newValue);
    } catch (error) {
      logger.error(error as Error, "Error incrementing counter in cache", { key, delta });
      return null;
    }
  }

  static async setCounter(key: CounterCacheKey, value: number, ttl?: Duration): Promise<void> {
    try {
      if (ttl) {
        await CounterKeyspace.with({ defaultExpiry: ttl }).set(key, BigInt(value));
      } else {
        await CounterKeyspace.set(key, BigInt(value));
      }
      logger.debug("Counter set in cache", { key, value, ttl });
    } catch (error) {
      logger.error(error as Error, "Error setting counter in cache", { key, value });
    }
  }

  static async deleteCounter(key: CounterCacheKey): Promise<void> {
    try {
      await CounterKeyspace.delete(key);
      logger.debug("Counter deleted from cache", { key });
    } catch (error) {
      logger.error(error as Error, "Error deleting counter from cache", { key });
    }
  }

  // Specific methods for defined keyspaces as examples
  static async getCachedConversation(
    key: ConversationCacheKey
  ): Promise<PlaceholderConversationObject | null> {
    return this.getStruct(ConversationKeyspace, key);
  }

  static async setCachedConversation(
    key: ConversationCacheKey,
    value: PlaceholderConversationObject,
    ttl?: Duration
  ): Promise<void> {
    return this.setStruct(ConversationKeyspace, key, value, ttl);
  }

  static async deleteCachedConversation(key: ConversationCacheKey): Promise<void> {
    return this.deleteStruct(ConversationKeyspace, key);
  }

  static async getCachedDocumentMetadata(
    key: DocumentMetadataCacheKey
  ): Promise<PlaceholderDocumentObject | null> {
    return this.getStruct(DocumentMetadataKeyspace, key);
  }

  static async setCachedDocumentMetadata(
    key: DocumentMetadataCacheKey,
    value: PlaceholderDocumentObject,
    ttl?: Duration
  ): Promise<void> {
    return this.setStruct(DocumentMetadataKeyspace, key, value, ttl);
  }

  static async deleteCachedDocumentMetadata(key: DocumentMetadataCacheKey): Promise<void> {
    return this.deleteStruct(DocumentMetadataKeyspace, key);
  }
}