Okay, Architect! Let's continue with the next set of slices.

---
<SLICING_TEMPLATE>
# Slice 4: Embedding Generation & Storage in Workflow
## What You're Building
This slice extends the `documentProcessorWorkflow` (from Slice 3) to generate multimodal embeddings for the processed chunks using Cohere embed-v4.0. It then stores these chunks, along with their embeddings and other metadata, into the `document_chunks` table in NeonDB. Finally, it updates the parent document's status to 'processed'.
## Tasks
### 1. Integrate Cohere Client for Embeddings - Complexity: 3
- [ ] Create `src/shared/services/cohere.client.ts`.
- [ ] Implement a method to call Cohere's `/embed` endpoint.
- [ ] Use `COHERE_API_KEY` from Encore secrets.
- [ ] Handle batching of chunks for embedding generation (Cohere's API has limits, e.g., 96 texts for `embed-v4.0`).
- [ ] Support multimodal embeddings: structure input to include text and (if `chunk.metadata.hasImage` and `chunk.imageData` is available from Unstructured) image data.
- [ ] Parameterize `model ("embed-v4.0")`, `input_type ("search_document")`, and `embedding_type ("float")`.
- [ ] Write tests: Unit test the Cohere client, mocking the `fetch` call, to verify correct request formation and response parsing, including batching logic.
- [ ] Test passes locally.
    - **Subtask 1.1:** Define Cohere client class and method signature. - Complexity: 1
    - **Subtask 1.2:** Implement API call logic with `fetch` and API key. - Complexity: 2
    - **Subtask 1.3:** Implement batching logic for embedding requests. - Complexity: 2
    - **Subtask 1.4:** Add support for multimodal input if images are present in chunks. - Complexity: 2
### 2. Extend Mastra Workflow: Generate & Store Embeddings - Complexity: 3
- [ ] Modify `documentProcessorWorkflow` from Slice 3.
- [ ] **Step 4: Generate Embeddings**
    - Input: `processedChunks` (from previous step), `documentId`.
    - Action: Instantiate `CohereClient`.
    - Action: Iterate through `processedChunks` (in batches), call Cohere client to get embeddings.
    - Action: Correlate embeddings back to their respective chunks.
- [ ] **Step 5: Store Chunks and Embeddings in DB**
    - Action: For each chunk and its embedding:
        - Prepare data for `document_chunks` table (content, contextualContent, chunkIndex, embedding vector, metadata, documentId, tokenCount if available).
        - Use Drizzle `db.insert(documentChunks).values(...)` in a batch if possible, or one by one.
        - Ensure `previousChunkId` and `nextChunkId` are populated (this might require a second pass or careful ordering).
    - Output: List of inserted chunk IDs.
- [ ] Write tests: Mock Cohere client and DB inserts. Verify workflow correctly calls embedding generation and prepares data for DB.
- [ ] Test passes locally.
    - **Subtask 2.1:** Add embedding generation step to workflow using Cohere client. - Complexity: 2
    - **Subtask 2.2:** Implement logic to insert chunks and embeddings into `document_chunks` table using Drizzle. - Complexity: 2
    - **Subtask 2.3:** Implement logic to link `previousChunkId` and `nextChunkId` for the stored chunks. - Complexity: 2
### 3. Update Document Status to 'Processed' - Complexity: 1
- [ ] After successfully storing all chunks and embeddings for a document:
    - Update the corresponding record in the `documents` table to `status: 'processed'`.
    - Clear any `processingError` metadata if it was set previously.
- [ ] If embedding generation or DB storage fails critically:
    - Update document status to `error` with a relevant message.
- [ ] Write tests: Verify document status is updated correctly based on mocked outcomes.
- [ ] Test passes locally.
## Code Example
```typescript
// src/shared/services/cohere.client.ts
import log from "encore.dev/log";
import { secret } from "encore.dev/config";

const cohereApiKey = secret("COHERE_API_KEY");

interface CohereEmbedInput {
  text: string;
  image?: string; // Base64 encoded image data
}

interface CohereEmbedRequest {
  texts?: string[]; // For text-only or when images are not directly supported by chosen text-first input type
  inputs?: Array<{ content: Array<{ type: "text" | "image"; text?: string; image?: string }> }>; // For multimodal with distinct content types
  model: string;
  input_type: "search_document" | "search_query" | "classification" | "clustering";
  embedding_types?: ("float" | "binary" | "ubinary" | "int8")[]; // embed-v4 specific
  truncate?: "NONE" | "START" | "END";
}

interface CohereEmbedResponse {
  id: string;
  embeddings: number[][]; // Assuming float embeddings
  texts: string[];
  meta?: {
    api_version: { version: string };
    billed_units?: { input_tokens?: number; output_tokens?: number };
  };
  // Add other fields if present in actual Cohere response
}


export class CohereClient {
  private apiKey: string;
  private baseUrl: string = "https://api.cohere.ai/v1";

  constructor() {
    const key = cohereApiKey();
    if (!key) {
      throw new Error("COHERE_API_KEY secret is not set.");
    }
    this.apiKey = key;
  }

  async embed(request: CohereEmbedRequest): Promise<CohereEmbedResponse> {
    const response = await fetch(`${this.baseUrl}/embed`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Request-Source": "typescript-sdk-rag-app", // Optional: for Cohere to track usage
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      log.error("Cohere API embedding error", { status: response.status, body: errorBody, request });
      throw new Error(`Cohere API request failed with status ${response.status}: ${errorBody}`);
    }
    return response.json() as Promise<CohereEmbedResponse>;
  }

  async batchEmbedTexts(
    texts: string[],
    inputType: "search_document" | "search_query",
    model: string = "embed-v4.0", // embed-english-v3.0 or embed-multilingual-v3.0 for older, or embed-v4.0
    batchSize: number = 96 // Max batch size for embed-v4.0 is 96
  ): Promise<number[][]> {
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.embed({
        texts: batch,
        model: model,
        input_type: inputType,
        embedding_types: ["float"], // For embed-v4
      });
      if (response.embeddings) {
        allEmbeddings.push(...response.embeddings);
      } else {
        // Handle cases where embeddings might not be directly in response.embeddings (older models)
        // This example assumes response.embeddings exists and is an array of arrays.
        log.warn("Embeddings not found in expected structure in Cohere response", { responseId: response.id });
      }
    }
    return allEmbeddings;
  }

  // Simplified for this example - PRD mentions embed-v4 which is multimodal-first.
  // A more robust implementation would handle the complex `inputs` structure for embed-v4 properly.
  async batchEmbedMultimodal(
    inputs: Array<{text: string, image?: string}>, // image is base64 string
    inputType: "search_document" | "search_query",
    model: string = "embed-v4.0",
    batchSize: number = 96
  ): Promise<number[][]> {
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      const cohereInputs = batch.map(input => {
        const content: Array<{ type: "text" | "image"; text?: string; image?: string }> = [{ type: "text", text: input.text }];
        if (input.image) {
          content.push({ type: "image", image: input.image }); // `data:image/jpeg;base64,${input.image}` if not already prefixed
        }
        return { content };
      });

      const response = await this.embed({
        inputs: cohereInputs,
        model: model,
        input_type: inputType,
        embedding_types: ["float"],
      });
      if (response.embeddings) {
        allEmbeddings.push(...response.embeddings);
      }
    }
    return allEmbeddings;
  }
}

// In documentProcessorWorkflow:
// ... after chunkingService.chunk ...
// const cohereClient = new CohereClient();
// const chunkContentsForEmbedding = processedChunks.map(c => c.contextualContent || c.content);
// const embeddings = await cohereClient.batchEmbedTexts(chunkContentsForEmbedding, "search_document");
//
// for (let i = 0; i < processedChunks.length; i++) {
//   const chunk = processedChunks[i];
//   const embedding = embeddings[i];
//   await db.insert(documentChunks).values({
//     documentId: documentId,
//     content: chunk.content,
//     contextualContent: chunk.contextualContent,
//     chunkIndex: chunk.chunkIndex,
//     embedding: embedding, // Drizzle will handle array -> vector
//     metadata: chunk.metadata,
//     // tokenCount: calculate if needed
//   });
// }
//
// Link previous/next chunk IDs (requires IDs from DB insert, so a second pass or more complex insert logic)
// Example for linking:
// const insertedChunks = await db.query.documentChunks.findMany({ where: eq(documentChunks.documentId, documentId), orderBy: [asc(documentChunks.chunkIndex)] });
// for (let i = 0; i < insertedChunks.length; i++) {
//   const updateData: Partial<typeof documentChunks.$inferInsert> = {};
//   if (i > 0) updateData.previousChunkId = insertedChunks[i-1].id;
//   if (i < insertedChunks.length - 1) updateData.nextChunkId = insertedChunks[i+1].id;
//   if (Object.keys(updateData).length > 0) {
//     await db.update(documentChunks).set(updateData).where(eq(documentChunks.id, insertedChunks[i].id));
//   }
// }
//
// await db.update(documents).set({ status: 'processed' }).where(eq(documents.id, documentId));
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (workflow retrieves chunks, calls Cohere (mocked), stores chunks with embeddings (mocked) in DB, updates document status to 'processed').
## Quick Research (5-10 minutes)
**Official Docs:**
- Cohere Embed API Documentation (v3 & v4): [https://docs.cohere.com/reference/embed](https://docs.cohere.com/reference/embed)
- Drizzle ORM `insert` and batch operations.
- PGVector HNSW index performance considerations.
- Mastra Workflow error handling and retry mechanisms.
**Examples:**
- Batching requests to external APIs in Node.js.
- Storing vector embeddings with Drizzle into PGVector.
## Need to Go Deeper?
**Research Prompt:** *"What's the most efficient way to batch insert `document_chunks` with Drizzle and link `previousChunkId`/`nextChunkId` in PostgreSQL, minimizing round trips and ensuring data integrity within the Mastra workflow context? Consider using CTEs or window functions if applicable with Drizzle."*
## Questions for Senior Dev
- [ ] Should `tokenCount` be calculated and stored for chunks? If so, using what tokenizer (Cohere's or a standard one like tiktoken)? (PRD has `tokenCount` in `documentChunks`).
- [ ] How to handle image data extraction from Unstructured elements and passing it to Cohere for multimodal embeddings effectively? (e.g., store base64 images temporarily or stream?)
- [ ] For linking `previousChunkId`/`nextChunkId`, is a second pass update loop acceptable, or should we aim for a single, more complex SQL statement if Drizzle supports it easily?
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 5: Basic Search Service & Vector Search Endpoint
## What You're Building
This slice introduces a new Encore `search` service with an API endpoint (`POST /api/search`). It will take a query string, generate an embedding for the query using Cohere, and perform a basic vector similarity search against the `document_chunks` in NeonDB (PGVector). Reranking and FTS will be added in the next slice.
## Tasks
### 1. Create Search Encore Service & API Endpoint - Complexity: 2
- [ ] Create `src/features/search/search.service.ts` and define `searchService = new Service("search")`.
- [ ] Define an Encore API endpoint `POST /api/search`.
- [ ] Request interface: `{ query: string; limit?: number; filters?: Record<string, any> }`.
- [ ] Response interface: `{ results: Array<{ id: number; documentId: number; content: string; score: number; documentTitle?: string; documentSource?: string; metadata?: any }> }`.
- [ ] Write tests: A simple test to check if the endpoint is reachable and returns a placeholder response.
- [ ] Test passes locally.
### 2. Implement Query Embedding - Complexity: 2
- [ ] Reuse or adapt the `CohereClient` from Slice 4.
- [ ] In the search handler, take the input `query` string.
- [ ] Call Cohere client's `embed` method (or a new `embedQuery` method) with `input_type: "search_query"` and the query text.
- [ ] Model: `embed-v4.0`.
- [ ] Write tests: Unit test this part, mocking Cohere client, ensuring correct parameters are passed for query embedding.
- [ ] Test passes locally.
### 3. Implement Basic Vector Search in NeonDB - Complexity: 3
- [ ] Use the Drizzle client (`db`) from Slice 1.
- [ ] In the search handler, after getting the `queryEmbedding`:
    - Construct a SQL query using Drizzle to perform a vector similarity search.
    - Use the cosine distance operator (`<=>`) with `document_chunks.embedding`.
    - `ORDER BY` the distance and `LIMIT` the results (default to 10, use input `limit`).
    - Select relevant fields: `id`, `documentId`, `content`, `metadata`, and the distance as `score`.
    - Optionally join with `documents` table to get `documentTitle` and `documentSource`.
    - *Initial Filter Handling*: If `filters` are provided (e.g., `{ "metadata.author": "John Doe" }`), add a basic `WHERE` clause for metadata filtering (e.g., `metadata @> '{"author": "John Doe"}'::jsonb`). This will be expanded later.
- [ ] Write tests: Mock DB query execution. Provide a mock query embedding and verify the Drizzle query construction. Test with sample data in a test DB if feasible.
- [ ] Test passes locally.
    - **Subtask 3.1:** Define Drizzle query for vector similarity search (`<=>`). - Complexity: 2
    - **Subtask 3.2:** Add `ORDER BY` distance and `LIMIT`. - Complexity: 1
    - **Subtask 3.3:** Implement basic metadata filtering using `jsonb @>` operator. - Complexity: 2
## Code Example
```typescript
// src/features/search/search.service.ts
import { Service } from "encore.dev/service";
import { api } from "encore.dev/api";
import { db } from "../../shared/infrastructure/database/db";
import { documentChunks, documents } from "../../shared/infrastructure/database/schema";
import { CohereClient } from "../../shared/services/cohere.client"; // Assuming it's suitably generic
import { SQL, sql, desc, asc } from "drizzle-orm";
import log from "encore.dev/log";

export default new Service("search");

interface SearchRequest {
  query: string;
  limit?: number;
  // Basic filters for now, can be expanded
  filters?: {
    documentId?: number;
    tags?: string[]; // Example: search chunks where metadata.tags contains all these tags
    // Add more specific filter fields as needed e.g. from document.metadata
  };
}

interface SearchResultItem {
  chunkId: number;
  documentId: number;
  content: string;
  score: number; // Higher is better for similarity if we invert distance, or lower is better for distance
  documentTitle?: string | null;
  documentSource?: string | null;
  chunkMetadata?: any;
  documentMetadata?: any;
}

interface SearchResponse {
  results: SearchResultItem[];
  query: string;
  limit: number;
}

const cohereClient = new CohereClient(); // Instantiate once

export const search = api(
  { method: "POST", path: "/api/search", auth: true }, // Assuming auth later
  async (req: SearchRequest): Promise<SearchResponse> => {
    const { query, limit = 10, filters = {} } = req;
    log.info("Search request received", { query, limit, filters });

    // 1. Generate Query Embedding
    const queryEmbeddings = await cohereClient.batchEmbedTexts(
      [query],
      "search_query", // Correct input_type for search queries
      "embed-v4.0"
    );
    if (!queryEmbeddings || queryEmbeddings.length === 0 || !queryEmbeddings[0]) {
      log.error("Failed to generate query embedding", { query });
      throw new Error("Failed to generate query embedding.");
    }
    const queryEmbedding = queryEmbeddings[0];
    log.info("Query embedding generated");

    // 2. Basic Vector Search
    // The <=> operator in pgvector gives distance (lower is better).
    // To make score "higher is better" for similarity: 1 - distance (for cosine distance, already 0-2 range)
    // Or 1 / (1 + distance)
    // For now, let's use raw distance.
    const vectorDistance = sql<number>`${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}`;

    let queryBuilder = db
      .select({
        chunkId: documentChunks.id,
        documentId: documentChunks.documentId,
        content: documentChunks.content,
        score: vectorDistance, // Raw distance
        documentTitle: documents.title,
        documentSource: documents.source,
        chunkMetadata: documentChunks.metadata,
        documentMetadata: documents.metadata,
      })
      .from(documentChunks)
      .leftJoin(documents, sql`${documentChunks.documentId} = ${documents.id}`)
      .orderBy(asc(vectorDistance)) // Lower distance is better
      .limit(limit);

    // Apply filters
    const conditions: SQL[] = [];
    if (filters.documentId) {
      conditions.push(sql`${documentChunks.documentId} = ${filters.documentId}`);
    }
    if (filters.tags && filters.tags.length > 0) {
      // Example: chunk metadata must contain all specified tags in a 'tags' array
      // This requires tags to be stored like: metadata: {"tags": ["tag1", "tag2"]}
      conditions.push(sql`${documentChunks.metadata} @> ${JSON.stringify({ tags: filters.tags })}::jsonb`);
    }
    // Add more specific document-level filters if needed, e.g., from documents.metadata
    // if (filters.author) {
    //   conditions.push(sql`${documents.metadata}->>'author' = ${filters.author}`);
    // }


    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(sql.join(conditions, sql.raw(" AND "))) as any; // Re-cast if .where changes type
    }

    const searchResults = await queryBuilder;
    log.info("Search results from DB", { count: searchResults.length });

    return {
      query,
      limit,
      results: searchResults.map(r => ({
          ...r,
          // If you want score to be higher is better for cosine:
          // score: 1 - r.score (assuming score is cosine distance which is 1 - cosine_similarity)
          // For now, raw distance is fine. Client can be aware lower is better.
      })),
    };
  }
);
```## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (API endpoint receives query, generates embedding (mocked), performs vector search (mocked or on test DB), returns formatted results).
## Quick Research (5-10 minutes)
**Official Docs:**
- PGVector operators (`<=>`, `<->`, `<#>`): [https://github.com/pgvector/pgvector#getting-started](https://github.com/pgvector/pgvector#getting-started)
- Drizzle ORM `sql` template tag for raw SQL snippets: [https://orm.drizzle.team/docs/sql](https://orm.drizzle.team/docs/sql)
- Cohere API for query embeddings (`input_type: "search_query"`).
**Examples:**
- Building dynamic queries with Drizzle based on filter conditions.
- Using `jsonb` operators like `@>` or `->>` with Drizzle for metadata filtering.
## Need to Go Deeper?
**Research Prompt:** *"How can I construct complex, dynamic filtering conditions with Drizzle ORM for PGVector search, combining vector similarity with multiple metadata criteria (e.g., `tags IN (...)`, `author = '...'`, `date_range`) on both `document_chunks.metadata` and joined `documents.metadata` efficiently?"*
## Questions for Senior Dev
- [ ] For the `score` in `SearchResultItem`, should we return raw distance (lower is better) or convert it to a similarity score (higher is better, e.g., `1 - distance`)? (PRD doesn't specify, consistency is key).
- [ ] How robust should the initial `filters` be? Just `documentId` or a few key metadata fields to start? (The example added basic `tags` and `documentId`).
- [ ] Is `LEFT JOIN` appropriate here, or `INNER JOIN` if we only want chunks from existing documents? (`LEFT JOIN` is safer if `documents` table might have stale entries or race conditions, but `INNER JOIN` is fine if `document_chunks.documentId` is a strict FK).
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 6: Hybrid Search (FTS + Vector) & Cohere Rerank
## What You're Building
This slice enhances the `search` service by implementing hybrid search (combining full-text search with vector search using Reciprocal Rank Fusion - RRF) and then reranking the combined results using Cohere Rerank.
## Tasks
### 1. Implement Full-Text Search (FTS) Query - Complexity: 3
- [ ] In the `search` service handler:
    - Create a Drizzle query for FTS on `document_chunks.searchVector`.
    - Use `plainto_tsquery('english', query)` or `websearch_to_tsquery('english', query)`.
    - Use `ts_rank_cd(document_chunks.searchVector, query)` for ranking.
    - Select similar fields as the vector search part. Limit initial FTS results (e.g., to 50).
    - Apply metadata filters similar to the vector search part.
- [ ] Write tests: Unit test FTS query construction with Drizzle.
- [ ] Test passes locally.
### 2. Combine FTS and Vector Search Results with RRF - Complexity: 4
- [ ] Execute both FTS and vector search queries (potentially in parallel `Promise.all`).
- [ ] Implement Reciprocal Rank Fusion (RRF) logic:
    - For each result in FTS list, `score_fts = 1 / (k + rank_fts)`. (k is typically 60).
    - For each result in vector list, `score_vec = 1 / (k + rank_vec)`.
    - For documents appearing in both lists, `combined_score = (alpha * score_vec) + ((1 - alpha) * score_fts)`.
    - `alpha` is a weighting factor (e.g., 0.5 to 0.7, from PRD it's 0.7 for vector).
    - If a document is only in one list, its score from that list is used (weighted appropriately if we consider the other score 0, or just use its RRF score part). The PRD SQL uses `FULL OUTER JOIN` which is more robust.
- [ ] Merge and sort the results based on the `combined_score` (descending).
- [ ] Return a larger set of candidates for reranking (e.g., top 20-50 from RRF).
- [ ] The PRD has a good SQL example for RRF using CTEs. Adapt this logic if doing it in TypeScript, or try to implement it as a single complex SQL query if Drizzle allows cleanly. *For simplicity, doing RRF in TypeScript after fetching two lists might be easier initially.*
- [ ] Write tests: Unit test the RRF calculation logic with sample ranked lists.
- [ ] Test passes locally.
    - **Subtask 2.1:** Fetch FTS results. - Complexity: 1
    - **Subtask 2.2:** Fetch Vector results. - Complexity: 1
    - **Subtask 2.3:** Implement RRF scoring and merging logic in TypeScript. - Complexity: 3
### 3. Integrate Cohere Rerank Client - Complexity: 2
- [ ] Add a method to `CohereClient` for the `/rerank` endpoint.
- [ ] Model: `rerank-english-v3.0` or `rerank-multilingual-v3.0` (PRD mentioned `rerank-v3.5` which might be a typo or newer, use latest documented).
- [ ] API Key from Encore secrets.
- [ ] Request takes `query` and an array of `documents` (which are the `content` strings of the RRF-ranked chunks).
- [ ] Response gives a re-ordered list of results with relevance scores.
- [ ] Write tests: Unit test the Cohere Rerank client method.
- [ ] Test passes locally.
### 4. Apply Reranking and Fetch Adjacent Chunks - Complexity: 3
- [ ] In the `search` service handler, after RRF:
    - Take the top N (e.g., 20) RRF results.
    - Pass their `content` and the original `query` to the Cohere Rerank client.
    - Get back reranked results. These results will usually include an `index` field pointing back to the original list of documents you sent.
    - Map reranked results back to your original chunk objects.
    - **Fetch Adjacent Chunks**: For each of the final top K (e.g., 5-10) reranked chunks, fetch their `previousChunkId` and `nextChunkId` content from `document_chunks` to provide more context. This may require another DB query. Append this to the result item.
- [ ] The final response should be the top K reranked and context-enriched results.
- [ ] Write tests: Mock Cohere Rerank client and DB calls for adjacent chunks. Verify the flow and data transformation.
- [ ] Test passes locally.
    - **Subtask 4.1:** Call Cohere Rerank with RRF results. - Complexity: 1
    - **Subtask 4.2:** Map reranked results back to original chunk data. - Complexity: 1
    - **Subtask 4.3:** Implement fetching and attaching content of adjacent chunks. - Complexity: 2
## Code Example
```typescript
// src/shared/services/cohere.client.ts (add rerank method)
// ... existing CohereClient ...
interface CohereRerankRequest {
  query: string;
  documents: (string | { text: string })[]; // Array of document texts or objects
  model: string;
  top_n?: number;
  return_documents?: boolean; // If false, only scores and indices are returned
}

interface RerankResultItem {
  index: number;
  relevance_score: number;
  document?: { text: string }; // If return_documents is true
}

interface CohereRerankResponse {
  id: string;
  results: RerankResultItem[];
  meta?: { api_version: { version: string }; billed_units?: { search_units?: number } };
}

// Inside CohereClient class:
async rerank(request: CohereRerankRequest): Promise<CohereRerankResponse> {
  const response = await fetch(`${this.baseUrl}/rerank`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Request-Source": "typescript-sdk-rag-app",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    log.error("Cohere API rerank error", { status: response.status, body: errorBody, request });
    throw new Error(`Cohere API rerank request failed with status ${response.status}: ${errorBody}`);
  }
  return response.json() as Promise<CohereRerankResponse>;
}

// src/features/search/search.service.ts
// ... (imports, interfaces from Slice 5) ...
// Add these to SearchResultItem if fetching adjacent chunks:
//  previousChunkContent?: string | null;
//  nextChunkContent?: string | null;

// New type for RRF candidate
interface RrfCandidate extends SearchResultItem {
  originalRank?: number; // Rank from its source list (vector or FTS)
  sourceType?: 'vector' | 'fts';
  rrfScore?: number;
}


export const hybridSearch = api( // Renamed from 'search' for clarity if keeping old one
  { method: "POST", path: "/api/hybrid-search", auth: true },
  async (req: SearchRequest): Promise<SearchResponse> => {
    const { query, limit = 10, filters = {} } = req; // This limit is the FINAL limit after reranking
    const ftsLimit = 50;
    const vectorLimit = 50;
    const rrfCandidateLimit = 20; // How many candidates to send to reranker
    const rrfK = 60;
    const rrfAlpha = 0.7; // Weight for vector search in RRF

    log.info("Hybrid search request", { query, finalLimit: limit, filters });

    const queryEmbeddings = await cohereClient.batchEmbedTexts([query], "search_query");
    const queryEmbedding = queryEmbeddings[0];
    if (!queryEmbedding) throw new Error("Failed to generate query embedding.");

    // 1. Vector Search
    const vectorDistance = sql<number>`${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}`;
    let vecQueryBuilder = db
      .select({ /* ... select fields ... */ chunkId: documentChunks.id, documentId: documentChunks.documentId, content: documentChunks.content, score: vectorDistance, documentTitle: documents.title, documentSource: documents.source, chunkMetadata: documentChunks.metadata, documentMetadata: documents.metadata, previousChunkId: documentChunks.previousChunkId, nextChunkId: documentChunks.nextChunkId })
      .from(documentChunks)
      .leftJoin(documents, sql`${documentChunks.documentId} = ${documents.id}`)
      .orderBy(asc(vectorDistance))
      .limit(vectorLimit);
    // Apply filters to vecQueryBuilder (as in Slice 5)
    // const vectorResultsRaw = await vecQueryBuilder;

    // 2. Full-Text Search
    const tsQuery = sql`plainto_tsquery('english', ${query})`; // or websearch_to_tsquery
    const ftsRank = sql`ts_rank_cd(${documentChunks.searchVector}, ${tsQuery})`;
    let ftsQueryBuilder = db
      .select({ /* ... select fields ... */ chunkId: documentChunks.id, documentId: documentChunks.documentId, content: documentChunks.content, score: ftsRank, documentTitle: documents.title, documentSource: documents.source, chunkMetadata: documentChunks.metadata, documentMetadata: documents.metadata, previousChunkId: documentChunks.previousChunkId, nextChunkId: documentChunks.nextChunkId })
      .from(documentChunks)
      .leftJoin(documents, sql`${documentChunks.documentId} = ${documents.id}`)
      .where(sql`${documentChunks.searchVector} @@ ${tsQuery}`)
      .orderBy(desc(ftsRank))
      .limit(ftsLimit);
    // Apply filters to ftsQueryBuilder (as in Slice 5)
    // const ftsResultsRaw = await ftsQueryBuilder;

    const [vectorResultsRaw, ftsResultsRaw] = await Promise.all([
        vecQueryBuilder, // Add filter application here
        ftsQueryBuilder  // Add filter application here
    ]);


    // 3. RRF
    const rrfCandidatesMap = new Map<number, RrfCandidate>(); // chunkId -> RrfCandidate

    vectorResultsRaw.forEach((item, idx) => {
      const rank = idx + 1;
      const score = (1 / (rrfK + rank));
      const existing = rrfCandidatesMap.get(item.chunkId);
      if (existing) {
        existing.rrfScore = (existing.rrfScore || 0) + (score * rrfAlpha);
      } else {
        rrfCandidatesMap.set(item.chunkId, { ...item, originalRank: rank, sourceType: 'vector', rrfScore: score * rrfAlpha });
      }
    });

    ftsResultsRaw.forEach((item, idx) => {
      const rank = idx + 1;
      const score = (1 / (rrfK + rank));
      const existing = rrfCandidatesMap.get(item.chunkId);
      if (existing) {
        existing.rrfScore = (existing.rrfScore || 0) + (score * (1 - rrfAlpha));
      } else {
        // FTS score is already higher is better, vector distance is lower is better.
        // RRF needs consistent rank interpretation.
        // This simple RRF assumes ranks from two lists.
        // The PRD's SQL version is more direct. This TS version needs care.
        // For FTS, `item.score` is rank_cd. For Vector, `item.score` is distance.
        // The RRF formula uses ranks, not raw scores directly usually.
        rrfCandidatesMap.set(item.chunkId, { ...item, originalRank: rank, sourceType: 'fts', rrfScore: score * (1-rrfAlpha) });
      }
    });

    const sortedRrfCandidates = Array.from(rrfCandidatesMap.values())
      .sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0))
      .slice(0, rrfCandidateLimit);

    log.info("RRF candidates prepared", { count: sortedRrfCandidates.length });

    // 4. Cohere Rerank
    if (sortedRrfCandidates.length === 0) {
      return { query, limit, results: [] };
    }
    const docsToRerank = sortedRrfCandidates.map(c => c.content); // Or c.contextualContent
    const rerankResponse = await cohereClient.rerank({
      query,
      documents: docsToRerank,
      model: "rerank-english-v3.0", // Use model from PRD or latest
      top_n: limit,
      return_documents: false,
    });

    let rerankedResults: SearchResultItem[] = rerankResponse.results.map(rerankItem => {
      const originalCandidate = sortedRrfCandidates[rerankItem.index];
      return {
        ...originalCandidate,
        score: rerankItem.relevance_score, // Now using Cohere's relevance score
      };
    });

    // 5. Fetch Adjacent Chunks for top reranked results
    const chunkIdsToFetchContextFor = rerankedResults.map(r => r.chunkId);
    // This is a simplified adjacent fetch. A more optimized one might do it in fewer queries.
    for (let i = 0; i < rerankedResults.length; i++) {
        const result = rerankedResults[i];
        const originalCandidate = sortedRrfCandidates.find(c => c.chunkId === result.chunkId); // To get prev/next IDs

        if (originalCandidate?.previousChunkId) {
            const prevChunk = await db.query.documentChunks.findFirst({ where: sql`${documentChunks.id} = ${originalCandidate.previousChunkId}` });
            (result as any).previousChunkContent = prevChunk?.content || null;
        }
        if (originalCandidate?.nextChunkId) {
            const nextChunk = await db.query.documentChunks.findFirst({ where: sql`${documentChunks.id} = ${originalCandidate.nextChunkId}` });
            (result as any).nextChunkContent = nextChunk?.content || null;
        }
    }
    log.info("Adjacent chunks fetched", { count: rerankedResults.length });

    return {
      query,
      limit,
      results: rerankedResults,
    };
  }
);
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (FTS + Vector results combined by RRF, then reranked by Cohere, adjacent chunks fetched).
## Quick Research (5-10 minutes)
**Official Docs:**
- Cohere Rerank API: [https://docs.cohere.com/reference/rerank](https://docs.cohere.com/reference/rerank)
- PostgreSQL Full-Text Search functions (`plainto_tsquery`, `ts_rank_cd`): [https://www.postgresql.org/docs/current/textsearch-controls.html](https://www.postgresql.org/docs/current/textsearch-controls.html)
- Reciprocal Rank Fusion (RRF) explanation and common `k` values.
**Examples:**
- Implementing RRF in code.
- Efficiently fetching related data (adjacent chunks) in a loop vs. batch.
## Need to Go Deeper?
**Research Prompt:** *"Compare implementing Reciprocal Rank Fusion (RRF) directly in a PostgreSQL query using CTEs (as hinted in PRD) versus implementing it in TypeScript application code after fetching two separate lists (FTS and vector). What are the pros/cons regarding performance, complexity with Drizzle, and maintainability for our hybrid search?"*
## Questions for Senior Dev
- [ ] The PRD SQL for RRF uses `FULL OUTER JOIN`. Is the TypeScript map-based RRF approach shown above a good simplification, or should we strive for something closer to the SQL's robustness for handling items only in one list?
- [ ] For fetching adjacent chunks, the current loop is N+1. What's a more efficient way to fetch all necessary previous/next chunks in fewer queries using Drizzle? (e.g., gather all `previousChunkId`s and `nextChunkId`s, then `IN` query).
- [ ] Which Cohere rerank model is preferred (`rerank-english-v3.0`, `rerank-multilingual-v3.0`, or if `rerank-v3.5` is available)?
</SLICING_TEMPLATE>

I'll stop here for now. The next slices would logically be:
*   **Slice 7: Basic Chat Endpoint & LLM Integration**
*   **Slice 8: Full RAG Pipeline in Chat**
*   **Slice 9: Frontend - Chat UI**
*   And so on.

Let me know when you're ready for more!