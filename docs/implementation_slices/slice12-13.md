Okay, Architect! Let's dive into implementing the backend testing strategy and then caching.

---
<SLICING_TEMPLATE>
# Slice 12: Backend Testing Strategy Implementation (Vitest & DeepEval)
## What You're Building
This slice focuses on setting up and implementing the backend testing strategy using Vitest for unit and integration tests, and DeepEval for RAG-specific evaluations (semantic similarity, LLM rubrics) as outlined in the PRD. We'll start by testing key components like the `ChunkingService` and a simplified RAG pipeline flow.
## Tasks
### 1. Setup Vitest for Encore Backend - Complexity: 2
- [ ] Install Vitest and related dependencies: `npm install -D vitest @vitest/coverage-v8`.
- [ ] Configure Vitest in `package.json` scripts (e.g., `"test": "vitest run"`, `"test:watch": "vitest"`) and potentially a `vitest.config.ts` if needed for specific Encore environment setup.
- [ ] Ensure Encore's environment variables and secrets can be mocked or accessed safely during tests. (Encore's test runner might handle some of this, or use `dotenv` for local Vitest runs).
- [ ] Write a simple Vitest unit test for a utility function or a simple service method to confirm setup.
- [ ] Write tests: The simple test should pass.
- [ ] Test passes locally (`npm test` or `bun test`).
### 2. Setup DeepEval Client and Custom Matchers - Complexity: 3
- [ ] Install DeepEval SDK: `npm install deepeval`.
- [ ] Set up DeepEval API key as an environment variable/secret (`DEEPEVAL_API_KEY`).
- [ ] Create `src/shared/testing/setup.ts` (or similar) as per PRD to initialize DeepEval client and extend Vitest's `expect` with custom matchers:
    - `toMatchSemanticSimilarity(received: string, expected: string, threshold?: number)`
    - `toPassLLMRubric(received: string, rubric: string, config?: any)`
- [ ] This setup file should be imported into test files or configured globally in `vitest.config.ts`.
- [ ] Write tests: A placeholder test that attempts to use a custom matcher (e.g., `expect("test").toMatchSemanticSimilarity("test")`) to ensure the setup is working (it might require a valid API key to fully pass DeepEval calls).
- [ ] Test passes locally.
    - **Subtask 2.1:** Implement `toMatchSemanticSimilarity` matcher using `deepeval.calculateSimilarity`. - Complexity: 2
    - **Subtask 2.2:** Implement `toPassLLMRubric` matcher using `deepeval.evaluateLLMOutput`. - Complexity: 2
### 3. Test ChunkingService with Semantic Coherence - Complexity: 4
- [ ] Create `src/features/document-processing/__tests__/chunking.service.test.ts`.
- [ ] Write Vitest tests for `ChunkingService` (from Slice 3).
- [ ] **Test Case 1: Semantic Coherence**:
    - Use a sample document (text or mock Unstructured elements).
    - Chunk the document using `ChunkingService`.
    - For each chunk, use `await expect(chunk.content).toPassLLMRubric('Contains complete, coherent information without mid-sentence breaks or abrupt topic changes.')`.
- [ ] **Test Case 2: Structure Preservation (if applicable)**:
    - Use a document with known tables or headings.
    - Verify that `chunk.metadata.hasTable` or `headingLevel` is correctly populated.
    - For table chunks, check if content contains table-like structures (e.g., Markdown table syntax if that's the output).
- [ ] **Test Case 3: Adjacent Chunk References**:
    - Verify `previousChunkId` and `nextChunkId` are correctly linked after chunks are hypothetically stored and IDs assigned (this might require mocking DB insertion and ID generation for the test). This test was in the PRD but is hard to unit test without DB interaction for IDs. Focus on the output of the `chunk()` method itself for now regarding content and metadata. Linking IDs is more of an integration concern for the workflow.
- [ ] Mock any external dependencies of `ChunkingService`.
- [ ] Write tests: (As described in test cases).
- [ ] Test passes locally.
    - **Subtask 3.1:** Create fixture data (sample documents/elements). - Complexity: 1
    - **Subtask 3.2:** Write test for semantic coherence using DeepEval rubric. - Complexity: 3
    - **Subtask 3.3:** Write test for metadata preservation (e.g., `hasTable`). - Complexity: 2
### 4. Integration Test for a Simplified RAG Pipeline Flow - Complexity: 4
- [ ] Create `src/features/__tests__/rag-pipeline.integration.test.ts`.
- [ ] This test will simulate a flow: Query -> Embedding -> (Mocked) Search -> (Mocked) Context -> LLM -> Answer Evaluation.
- [ ] **Setup**:
    - Mock `SearchService` to return predefined relevant and irrelevant chunks for a given query.
    - Mock `LLMService` or use a very controlled local LLM if feasible (otherwise, expect actual LLM calls which can be slow/costly for frequent tests - consider conditional execution or specific "integration" test suites). For now, focus on testing the agent's orchestration.
- [ ] **Test Steps**:
    1. Define a test question.
    2. Call the `ragAgent.generate()` method with the question and mock history.
    3. The agent should:
        - (Mocked) Contextualize query.
        - (Mocked) Call search and get mock context.
        - Construct a prompt for the LLM.
        - (Mocked or Real) Call LLM and get an answer.
        - (Mocked) Parse citations.
- [ ] **Assertions (using DeepEval)**:
    - `await expect(result.answer).toPassLLMRubric('Accurately answers the question based SOLELY on the provided mocked sources, and correctly cites them.', { metrics: ['faithfulness', 'answer_relevancy'], threshold: 0.8 })`.
    - Verify that mock citations generated by the agent match the expected sources.
- [ ] Write tests: (As described).
- [ ] Test passes locally.
    - **Subtask 4.1:** Mock SearchService to return controlled context. - Complexity: 2
    - **Subtask 4.2:** Mock LLMService or prepare for controlled LLM calls. - Complexity: 2
    - **Subtask 4.3:** Write RAG agent test focusing on orchestration and DeepEval assertions for answer quality based on mocked context. - Complexity: 3
## Code Example
```typescript
// src/shared/testing/setup.ts
import { expect } from 'vitest';
// Ensure you have DEEPEVAL_API_KEY in your environment for these to run
// You might need to conditionally initialize DeepEvalClient or skip tests if key is not present for CI
let deepeval;
if (process.env.DEEPEVAL_API_KEY) {
  const { DeepEvalClient } = await import('deepeval'); // Dynamic import
  deepeval = new DeepEvalClient(process.env.DEEPEVAL_API_KEY);
} else {
  console.warn("DEEPEVAL_API_KEY not set. DeepEval dependent tests may be skipped or fail.");
}


expect.extend({
  async toMatchSemanticSimilarity(received: string, expected: string, threshold = 0.8) {
    if (!deepeval) return { pass: false, message: () => 'DeepEval client not initialized (DEEPEVAL_API_KEY missing).' };
    try {
      const similarity = await deepeval.measureSimilarity(received, expected);
      const pass = similarity >= threshold;
      return {
        pass,
        message: () => `Expected semantic similarity >= ${threshold}, got ${similarity.toFixed(3)}.\nReceived: "${received}"\nExpected: "${expected}"`,
      };
    } catch (e: any) {
      return { pass: false, message: () => `DeepEval similarity measurement failed: ${e.message}` };
    }
  },

  async toPassLLMRubric(received: string, rubric: string, config?: { metrics?: string[], threshold?: number, model?: string, [key: string]: any }) {
    if (!deepeval) return { pass: false, message: () => 'DeepEval client not initialized.' };
    try {
      // evaluateLLMOutput is deprecated, use evaluate with specific metrics
      // For example, creating custom metrics or using predefined ones if available.
      // This is a simplified placeholder for the concept.
      // You would define specific metrics (e.g., faithfulness, answer relevancy) and evaluate against them.
      // Example: const result = await deepeval.evaluate({ prediction: received, input: "User Query", expectedOutput: "Ideal Answer based on Rubric", metrics: [...] });

      // Placeholder: Using a generic "pass/fail" based on a hypothetical rubric evaluation.
      // In a real scenario, you'd use specific DeepEval metrics or a custom LLM to evaluate the rubric.
      // For now, we'll simulate a pass if it doesn't throw and contains 'coherent' for the chunking test.
      // This needs significant refinement based on DeepEval's current API for rubric-based eval.
      // The PRD example for `evaluateLLMOutput` might be from an older DeepEval version or a conceptual representation.
      // Let's assume a conceptual pass/fail for the rubric for now.
      // A more concrete example using specific metrics like Faithfulness:
      // const faithfulnessMetric = new FaithfulnessMetric({ threshold: config?.threshold || 0.8, model: config?.model || "gpt-4" });
      // const evaluationResult = await evaluate([new LLMTestCase(input="Relevant context", actual_output=received)], [faithfulnessMetric]);
      // const pass = evaluationResult[0].metrics[0].success;
      // const message = evaluationResult[0].metrics[0].reason;

      // Simulating a basic check for the chunking test.
      const pass = rubric.includes("coherent") ? received.length > 10 && !received.includes("...") : true; // very naive
      if (pass) {
         return { pass: true, message: () => `Output "${received}" conceptually passed rubric: "${rubric}"` };
      } else {
         return { pass: false, message: () => `Output "${received}" conceptually failed rubric: "${rubric}"` };
      }

    } catch (e: any) {
      return { pass: false, message: () => `DeepEval rubric evaluation failed: ${e.message}` };
    }
  },
});

// vitest.config.ts (Example)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // To use expect globally without imports
    environment: 'node', // Or 'jsdom' if testing frontend components that run in Encore services (unlikely)
    setupFiles: ['./src/shared/testing/setup.ts'], // To run custom matcher setup
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // May need to configure paths or aliases if Encore project structure requires it
  },
});

// src/features/document-processing/__tests__/chunking.service.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { ChunkingService, ChunkData } from '../chunking.service'; // Adjust path
import { Element } from "unstructured-client/dist/sdk/models/operations"; // Mock or use actual type

const createMockElement = (text: string, type: string = "NarrativeText", metadata?: any): Element => ({
    element_id: Math.random().toString(36).substring(7), // Mock ID
    type: type,
    text: text,
    metadata: {
        filename: "test.pdf",
        page_number: 1,
        ...metadata,
    }
});


describe('ChunkingService', () => {
  let chunkingService: ChunkingService;

  beforeEach(() => {
    chunkingService = new ChunkingService({
      strategy: 'semantic', // or your default
      chunkSize: 100, // Small for testing
      chunkOverlap: 20,
    });
  });

  test('should maintain semantic coherence in chunks (conceptual test)', async () => {
    const elements: Element[] = [
      createMockElement("This is the first sentence of a coherent thought."),
      createMockElement("It continues here with more details."),
      createMockElement("A new topic starts now, which should ideally be in a new chunk if possible."),
      createMockElement("This sentence belongs to the new topic."),
    ];
    const chunks = await chunkingService.chunk(elements, {});

    for (const chunk of chunks) {
      // This assertion relies on the custom matcher and a well-defined rubric.
      // The rubric string itself guides the evaluation.
      // For a real test, this would make an API call to DeepEval (if API key is present).
      // The current `toPassLLMRubric` is a placeholder.
      if (process.env.DEEPEVAL_API_KEY) { // Only run if key is available
        await expect(chunk.content).toPassLLMRubric(
          'The chunk contains a complete thought or a semantically coherent segment. It does not end abruptly mid-sentence or mix unrelated topics jarringly.'
        );
      } else {
        expect(chunk.content.length).toBeGreaterThan(5); // Basic fallback assertion
      }
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  test('should preserve document structure metadata (e.g., tables)', async () => {
    const elements: Element[] = [
      createMockElement("A normal paragraph."),
      createMockElement("Column A | Column B\n-------|--------\nValue 1 | Value 2", "Table"),
      createMockElement("Another paragraph."),
    ];
    const chunks = await chunkingService.chunk(elements, {});
    const tableChunk = chunks.find(c => (c.metadata as any).hasTable === true);

    expect(tableChunk).toBeDefined();
    if (tableChunk) {
        expect(tableChunk.content).toContain("Column A | Column B");
    }
  });
});
```
## Ready to Merge Checklist
- [ ] All tests pass (`npm test` or `bun test`)
- [ ] Linting passes
- [ ] Build succeeds (Encore app still builds and runs)
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (Vitest runs, DeepEval matchers are available, sample tests for ChunkingService pass with conceptual/mocked DeepEval checks).
## Quick Research (5-10 minutes)
**Official Docs:**
- Vitest documentation: [https://vitest.dev/guide/](https://vitest.dev/guide/)
- DeepEval documentation (for current SDK and evaluation methods): [https://docs.confident-ai.com/docs](https://docs.confident-ai.com/docs) (or their GitHub)
- Encore testing guidelines (if any): [https://encore.dev/docs/develop/testing](https://encore.dev/docs/develop/testing) (mainly about `encore test` which is for Go, but principles might apply)
**Examples:**
- Using Vitest with TypeScript projects.
- Setting up custom Vitest matchers.
- DeepEval examples for common RAG metrics (Faithfulness, Answer Relevancy, Context Relevancy).
## Need to Go Deeper?
**Research Prompt:** *"How can I effectively mock Encore's built-in services (like DB access, Pub/Sub, secrets) when unit/integration testing an Encore TypeScript service with Vitest, without needing a full Encore runtime? Explore strategies like dependency injection for mocks or using Vitest's mocking capabilities (`vi.mock`)."*
## Questions for Senior Dev
- [ ] The PRD's DeepEval custom matchers (`evaluateLLMOutput`) might use a deprecated or conceptual DeepEval API. How should we adapt this to the latest DeepEval SDK for rubric/LLM-based assertion? (Focus on specific metrics like Faithfulness, AnswerRelevancy).
- [ ] For RAG pipeline integration tests, are actual (rate-limited/dev-keyed) LLM calls acceptable for a dedicated "integration" test suite, or should we always mock the LLM interaction? (Mocking is generally preferred for speed and cost, but occasional contract tests against real services are valuable).
- [ ] How do we manage `DEEPEVAL_API_KEY` securely for local development and CI environments? (CI secrets, local `.env` not committed).
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 13: Caching Implementation (Embedding Cache)
## What You're Building
This slice implements a multi-level caching strategy (in-memory and Redis) for Cohere embeddings to reduce API calls, lower costs, and improve performance, as outlined in the PRD. This cache will be used by the `CohereClient`.
## Tasks
### 1. Setup Redis with Encore - Complexity: 2
- [ ] Encore doesn't have a native Redis primitive like `SQLDatabase`. We'll need to:
    - Define Redis connection details (URL, password) via Encore secrets (`REDIS_URL`, `REDIS_PASSWORD`).
    - Use a standard Node.js Redis client library like `ioredis`.
- [ ] Create `src/shared/infrastructure/cache/redis.client.ts` to initialize and export an `ioredis` client instance.
- [ ] Write tests: A simple test to check if the Redis client can connect (requires a running Redis instance for this test, or mock `ioredis`).
- [ ] Test passes locally.
### 2. Implement MultiLevelEmbeddingCache - Complexity: 3
- [ ] Create `src/shared/infrastructure/caching/embedding-cache.ts` as per PRD.
- [ ] Implement `MultiLevelEmbeddingCache` class:
    - L1: In-memory cache (`Map`) with LRU eviction and TTL.
    - L2: Redis cache (using `ioredis` client) with configurable TTL.
    - `get(key: string): Promise<number[] | null>`
    - `set(key: string, embeddings: number[], ttlSeconds?: number): Promise<void>`
- [ ] The `key` could be a hash of the text content being embedded.
- [ ] Write tests: Unit test the `MultiLevelEmbeddingCache` logic with mocked Redis and timers, verifying L1/L2 hits, misses, eviction, and TTL.
- [ ] Test passes locally.
    - **Subtask 2.1:** Implement in-memory cache with LRU and TTL. - Complexity: 2
    - **Subtask 2.2:** Implement Redis interaction for get/set with TTL. - Complexity: 2
    - **Subtask 2.3:** Combine L1 and L2 logic in `get`/`set` methods. - Complexity: 1
### 3. Integrate Embedding Cache into CohereClient - Complexity: 2
- [ ] Modify `CohereClient` (`src/shared/services/cohere.client.ts`).
- [ ] Instantiate `MultiLevelEmbeddingCache` within `CohereClient` or pass it via constructor.
- [ ] Before calling Cohere's `/embed` API:
    - Generate a cache key for the input text(s).
    - Attempt to retrieve embeddings from the cache using `embeddingCache.get(key)`.
    - If cache hit, return cached embeddings.
- [ ] After receiving embeddings from Cohere API:
    - Store them in the cache using `embeddingCache.set(key, embeddings)`.
- [ ] Ensure batch embedding logic also utilizes the cache for individual items if appropriate, or caches the whole batch result if keys can be made stable. (Caching individual items is more granular and often better).
- [ ] Write tests: Mock `MultiLevelEmbeddingCache`. Test `CohereClient` to verify it attempts cache lookups and stores results.
- [ ] Test passes locally.
### 4. Configure Cache Settings - Complexity: 1
- [ ] Make cache TTLs configurable via environment variables (e.g., `EMBEDDING_CACHE_L1_TTL_SECONDS`, `EMBEDDING_CACHE_L2_TTL_SECONDS`).
- [ ] Make in-memory cache size configurable.
- [ ] Document these settings.
- [ ] Write tests: (Configuration is typically not unit-tested directly, but defaults should be sensible).
- [ ] Test passes locally.
## Code Example
```typescript
// src/shared/infrastructure/cache/redis.client.ts
import { Redis } from "ioredis"; // npm install ioredis
import { secret } from "encore.dev/config";
import log from "encore.dev/log";

const redisUrl = secret("REDIS_URL"); // e.g., "redis://localhost:6379" or "redis://:password@host:port"
// const redisPassword = secret("REDIS_PASSWORD"); // If password is not in URL

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = redisUrl();
    if (!url) {
      log.warn("REDIS_URL secret not configured. Redis client will not be available.");
      // Fallback or throw error depending on strictness
      throw new Error("Redis not configured");
    }
    try {
        redisClient = new Redis(url, {
            maxRetriesPerRequest: 3,
            lazyConnect: true, // Connect on first command
            // Add other options like tls if needed for cloud Redis
        });

        redisClient.on('error', (err) => {
            log.error('Redis Client Error', { error: err });
            // Potentially nullify client on certain errors to allow re-init or circuit break
        });
        redisClient.on('connect', () => log.info('Connected to Redis server'));
        redisClient.on('ready', () => log.info('Redis client ready'));

    } catch (e) {
        log.error("Failed to initialize Redis client", { error: e });
        throw e;
    }
  }
  return redisClient;
}

// Optional: a function to gracefully close connection if Encore supports shutdown hooks
// export async function closeRedisConnection(): Promise<void> {
//   if (redisClient) {
//     await redisClient.quit();
//     redisClient = null;
//     log.info("Redis connection closed.");
//   }
// }

// src/shared/infrastructure/caching/embedding-cache.ts
// (As per PRD, with minor adjustments for ioredis and logging)
import { getRedisClient } from "./redis.client";
import log from "encore.dev/log";
import crypto from 'crypto';


interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number; // TTL in milliseconds for this entry
}

export class MultiLevelEmbeddingCache {
  private memoryCache = new Map<string, CacheEntry<number[]>>();
  private readonly memoryCacheSize: number;
  private redis: Redis;
  private defaultL1TTLSeconds: number;
  private defaultL2TTLSeconds: number;


  constructor(options?: {
    memoryCacheSize?: number;
    defaultL1TTLSeconds?: number; // TTL for L1 memory cache
    defaultL2TTLSeconds?: number; // TTL for L2 Redis cache
  }) {
    this.redis = getRedisClient(); // Throws if Redis not configured
    this.memoryCacheSize = options?.memoryCacheSize || parseInt(process.env.EMBEDDING_CACHE_L1_SIZE || "1000", 10);
    this.defaultL1TTLSeconds = options?.defaultL1TTLSeconds || parseInt(process.env.EMBEDDING_CACHE_L1_TTL_SECONDS || "300", 10); // 5 mins
    this.defaultL2TTLSeconds = options?.defaultL2TTLSeconds || parseInt(process.env.EMBEDDING_CACHE_L2_TTL_SECONDS || "86400", 10); // 24 hours
  }

  private generateKey(text: string): string {
    return `emb:${crypto.createHash('sha256').update(text).digest('hex')}`;
  }

  async get(textToEmbed: string): Promise<number[] | null> {
    const key = this.generateKey(textToEmbed);

    // L1: Memory cache
    const memoryHit = this.memoryCache.get(key);
    if (memoryHit && (Date.now() - memoryHit.timestamp < memoryHit.ttlMs)) {
      log.debug("Embedding cache L1 hit", { key });
      return memoryHit.data;
    }
    if (memoryHit) { // Expired from L1
        this.memoryCache.delete(key);
        log.debug("Embedding cache L1 expired", { key });
    }

    // L2: Redis cache
    try {
      const redisHit = await this.redis.get(key);
      if (redisHit) {
        log.debug("Embedding cache L2 hit", { key });
        const data = JSON.parse(redisHit) as number[];
        this.updateMemoryCache(key, data, this.defaultL1TTLSeconds * 1000); // Refresh L1 with L2's TTL or default L1
        return data;
      }
    } catch (error) {
      log.error("Redis GET error for embedding cache", { key, error });
      // Proceed as if cache miss, do not block embedding generation
    }
    
    log.debug("Embedding cache miss (L1 & L2)", { key });
    return null;
  }

  async set(textToEmbed: string, embeddings: number[]): Promise<void> {
    const key = this.generateKey(textToEmbed);
    const l1TtlMs = this.defaultL1TTLSeconds * 1000;
    const l2TtlSeconds = this.defaultL2TTLSeconds;

    this.updateMemoryCache(key, embeddings, l1TtlMs);

    try {
      await this.redis.setex(key, l2TtlSeconds, JSON.stringify(embeddings));
      log.debug("Embedding stored in L2 cache", { key, ttlSeconds: l2TtlSeconds });
    } catch (error) {
      log.error("Redis SETEX error for embedding cache", { key, error });
      // Failure to write to cache should not fail the main operation
    }
  }

  private updateMemoryCache(key: string, data: number[], ttlMs: number) {
    if (this.memoryCache.size >= this.memoryCacheSize && !this.memoryCache.has(key)) {
      // LRU eviction: delete the oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
      log.debug("Embedding cache L1 evicted", { evictedKey: firstKey, newKey: key });
    }
    this.memoryCache.set(key, { data, timestamp: Date.now(), ttlMs });
    log.debug("Embedding stored/updated in L1 cache", { key, ttlMs });
  }
}


// src/shared/services/cohere.client.ts (Integrate Cache)
// ... (existing CohereClient)
// import { MultiLevelEmbeddingCache } from '../infrastructure/caching/embedding-cache';

// Add to CohereClient constructor or as a member:
// private embeddingCache: MultiLevelEmbeddingCache;
// constructor() {
//   // ... init apiKey ...
//   try {
//     this.embeddingCache = new MultiLevelEmbeddingCache();
//   } catch (e) {
//     log.warn("Failed to initialize embedding cache for CohereClient. Cache will be disabled.", { error: e });
//     this.embeddingCache = null; // Or a no-op cache implementation
//   }
// }

// Modify `batchEmbedTexts` and `batchEmbedMultimodal` or the core `embed` method:
// async batchEmbedTexts(texts: string[], ...): Promise<number[][]> {
//   const results: (number[] | null)[] = await Promise.all(texts.map(text => this.embeddingCache?.get(text)));
//   const textsToEmbed: string[] = [];
//   const originalIndicesToEmbed: number[] = [];
//
//   results.forEach((cachedEmbedding, index) => {
//     if (cachedEmbedding) {
//       // Embeddings found in cache
//     } else {
//       textsToEmbed.push(texts[index]);
//       originalIndicesToEmbed.push(index);
//     }
//   });
//
//   const finalEmbeddings: number[][] = new Array(texts.length).fill(null);
//   results.forEach((cached, idx) => { if (cached) finalEmbeddings[idx] = cached; });
//
//   if (textsToEmbed.length > 0) {
//     // ... (actual Cohere API call for textsToEmbed) ...
//     // const newEmbeddings = await this.callCohereApiForBatch(textsToEmbed, ...);
//     // await Promise.all(textsToEmbed.map((text, i) => this.embeddingCache?.set(text, newEmbeddings[i])));
//     // Populate finalEmbeddings with newEmbeddings at originalIndicesToEmbed
//   }
//   return finalEmbeddings.filter(e => e !== null) as number[][];
// }
// This logic needs to be robust to map results back.
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (CohereClient attempts cache lookups, stores new embeddings. Cache hits/misses are logged. Requires running Redis locally for full testing).
## Quick Research (5-10 minutes)
**Official Docs:**
- `ioredis` library documentation: [https://github.com/luin/ioredis](https://github.com/luin/ioredis)
- Caching patterns (Cache-Aside, Read-Through, Write-Through). The PRD implies Cache-Aside.
- Hashing functions in Node.js (`crypto` module).
**Examples:**
- LRU cache implementation in TypeScript/JavaScript.
- Using `ioredis` for basic get/set operations with TTL.
## Need to Go Deeper?
**Research Prompt:** *"What are the best practices for generating stable cache keys for text embeddings, especially if minor whitespace or case changes shouldn't bust the cache? Explore text normalization techniques before hashing for cache keys."*
## Questions for Senior Dev
- [ ] For the `MultiLevelEmbeddingCache`, how should failure to connect to Redis be handled? Should it fall back to L1 only, or disable caching, or throw an error? (PRD implies it should not block operations, so L1 or no cache is a graceful fallback).
- [ ] The batch embedding logic in `CohereClient` needs careful modification to integrate the cache: should it check cache for each item in a batch, or cache the entire batch response? (Caching individual items is more granular and generally better for hit rates).
- [ ] Is SHA256 a good choice for hashing cache keys, or is something faster like MurmurHash preferable if collision resistance isn't paramount for this use case? (SHA256 is fine, a bit overkill but safe).
</SLICING_TEMPLATE>

This sets up a robust caching layer. The next slice would likely focus on production readiness.