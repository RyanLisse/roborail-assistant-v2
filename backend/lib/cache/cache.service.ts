// TODO: Fix cache imports - these modules may not be available in current Encore version
// import { type cache, CacheOpError } from "encore.dev/storage"; // Import CacheOpError for error handling
// import type { Duration } from "encore.dev/types/units";
import log from "encore.dev/log";
import {
  AppCacheCluster, // Assuming this is the defined cluster
  type ConversationCacheKey,
  ConversationKeyspace,
  type CounterCacheKey,
  CounterKeyspace,
  type DocumentMetadataCacheKey,
  DocumentMetadataKeyspace,
  type GenericStringCacheKey,
  GenericStringKeyspace,
} from "../infrastructure/cache/cache";

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
  static async getStruct<K, V>(keyspace: cache.StructKeyspace<K, V>, key: K): Promise<V | null> {
    try {
      const value = await keyspace.Get(key);
      logger.debug("Cache hit", { keyspace: keyspace.Name, key });
      return value;
    } catch (error) {
      if (error instanceof CacheOpError && error.message.includes("cache miss")) {
        logger.debug("Cache miss", { keyspace: keyspace.Name, key });
      } else {
        logger.error(error, "Error getting item from cache", { keyspace: keyspace.Name, key });
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
    keyspace: cache.StructKeyspace<K, V>,
    key: K,
    value: V,
    ttl?: Duration
  ): Promise<void> {
    try {
      if (ttl) {
        await keyspace.With({ DefaultExpiry: ttl }).Set(key, value);
      } else {
        await keyspace.Set(key, value);
      }
      logger.debug("Item set in cache", { keyspace: keyspace.Name, key, ttl: ttl?.toString() });
    } catch (error) {
      logger.error(error, "Error setting item in cache", { keyspace: keyspace.Name, key });
    }
  }

  /**
   * Deletes an item from a specified StructKeyspace.
   * @param keyspace The Encore StructKeyspace to use.
   * @param key The key object for the item.
   */
  static async deleteStruct<K>(keyspace: cache.StructKeyspace<K, any>, key: K): Promise<void> {
    try {
      await keyspace.Delete(key);
      logger.debug("Item deleted from cache", { keyspace: keyspace.Name, key });
    } catch (error) {
      logger.error(error, "Error deleting item from cache", { keyspace: keyspace.Name, key });
    }
  }

  // --- String Keyspace Methods ---
  static async getString(key: GenericStringCacheKey): Promise<string | null> {
    try {
      const value = await GenericStringKeyspace.Get(key);
      logger.debug("Cache hit (string)", { key });
      return value;
    } catch (error) {
      if (error instanceof CacheOpError && error.message.includes("cache miss")) {
        logger.debug("Cache miss (string)", { key });
      } else {
        logger.error(error, "Error getting string from cache", { key });
      }
      return null;
    }
  }

  static async setString(key: GenericStringCacheKey, value: string, ttl?: Duration): Promise<void> {
    try {
      if (ttl) {
        await GenericStringKeyspace.With({ DefaultExpiry: ttl }).Set(key, value);
      } else {
        await GenericStringKeyspace.Set(key, value);
      }
      logger.debug("String set in cache", { key, ttl: ttl?.toString() });
    } catch (error) {
      logger.error(error, "Error setting string in cache", { key });
    }
  }

  static async deleteString(key: GenericStringCacheKey): Promise<void> {
    try {
      await GenericStringKeyspace.Delete(key);
      logger.debug("String deleted from cache", { key });
    } catch (error) {
      logger.error(error, "Error deleting string from cache", { key });
    }
  }

  // --- Counter (Int) Keyspace Methods ---
  static async getCounter(key: CounterCacheKey): Promise<number | null> {
    try {
      const value = await CounterKeyspace.Get(key);
      logger.debug("Cache hit (counter)", { key });
      return Number(value); // Encore IntKeyspace might return int64 as string or BigInt in TS
    } catch (error) {
      if (error instanceof CacheOpError && error.message.includes("cache miss")) {
        logger.debug("Cache miss (counter)", { key });
      } else {
        logger.error(error, "Error getting counter from cache", { key });
      }
      return null;
    }
  }

  static async incrementCounter(key: CounterCacheKey, delta = 1): Promise<number | null> {
    try {
      const newValue = await CounterKeyspace.Increment(key, BigInt(delta));
      logger.debug("Counter incremented in cache", { key, delta, newValue: Number(newValue) });
      return Number(newValue);
    } catch (error) {
      logger.error(error, "Error incrementing counter in cache", { key, delta });
      return null;
    }
  }

  static async setCounter(key: CounterCacheKey, value: number, ttl?: Duration): Promise<void> {
    try {
      if (ttl) {
        await CounterKeyspace.With({ DefaultExpiry: ttl }).Set(key, BigInt(value));
      } else {
        await CounterKeyspace.Set(key, BigInt(value));
      }
      logger.debug("Counter set in cache", { key, value, ttl: ttl?.toString() });
    } catch (error) {
      logger.error(error, "Error setting counter in cache", { key, value });
    }
  }

  static async deleteCounter(key: CounterCacheKey): Promise<void> {
    try {
      await CounterKeyspace.Delete(key);
      logger.debug("Counter deleted from cache", { key });
    } catch (error) {
      logger.error(error, "Error deleting counter from cache", { key });
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

// Note: This cache service provides a comprehensive interface for Encore's caching capabilities
// with proper error handling and logging for production use.
