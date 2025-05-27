Okay, Architect! Let's move towards production readiness with configuration, monitoring, and final touches.

---
<SLICING_TEMPLATE>
# Slice 14: Production Configuration & Monitoring Setup
## What You're Building
This slice focuses on preparing the application for production by finalizing Encore service configurations (resource allocation, scaling), setting up environment-specific configurations (API keys, DB URLs via Encore secrets), and integrating basic custom monitoring metrics as outlined in the PRD.
## Tasks
### 1. Define Encore Service Configurations (`encore.app`) - Complexity: 2
- [ ] Review and update `encore.app` file.
- [ ] For each Encore service (`chat`, `upload`, `doc-processing`, `doc-mgmt`, `search`, `llm-service` if separate):
    - Define appropriate `resources` (CPU, memory). Start with reasonable estimates and plan to adjust based on load testing.
    - Define `scaling` parameters (`minInstances`, `maxInstances`, `targetCPU`).
    - Example (from PRD, adjust per service):
      ```json
      {
        "name": "doc-processing",
        "resources": { "cpu": "2", "memory": "4Gi" },
        "scaling": { "minInstances": 1, "maxInstances": 10, "targetCPU": 70 }
      }
      ```
- [ ] Ensure the global CORS configuration in `encore.app` is appropriate for production (allowing frontend origin).
- [ ] No direct coding, this is a configuration task.
- [ ] Test: Encore app should deploy with these configurations (locally or to a dev/preview environment).
### 2. Finalize Environment Configuration & Secrets - Complexity: 2
- [ ] Create/update `src/shared/config/environment.ts` as per PRD.
- [ ] This file should use `encore.dev/config`'s `secret()` function to access all external service API keys and database connection strings.
    - `NEON_DATABASE_URL`
    - `COHERE_API_KEY`
    - `GEMINI_API_KEY`
    - `UNSTRUCTURED_API_KEY`, `UNSTRUCTURED_API_URL`
    - `REDIS_URL`
    - `DEEPEVAL_API_KEY`
    - `OTEL_ENDPOINT` (for Mastra telemetry)
- [ ] Ensure all services that use these secrets import them correctly from this central config or directly use `secret()`.
- [ ] Set up these secrets in Encore Cloud for `production`, `preview`, and `development` environments (and locally via `.secrets.local.cue` or `encore secret set --type=local ...`).
- [ ] Write tests: Check that services initialize correctly, implicitly testing that secrets are loadable. (Actual secret values won't be in tests).
- [ ] Test passes locally.
### 3. Implement Custom Encore Metrics - Complexity: 3
- [ ] Create `src/shared/infrastructure/monitoring/metrics.ts` as per PRD.
- [ ] Define custom `Metric` objects using `encore.dev/metrics`:
    - `documentProcessingTime = new Metric("document_processing_time_seconds", { unit: "seconds", ... })`
    - `embeddingGenerationTime = new Metric("embedding_generation_time_ms", { unit: "milliseconds", ... })`
    - `ragRetrievalScore = new Metric("rag_retrieval_score", { unit: "float", description: "Relevance score from reranker or RAG evaluation" })` (Note: PRD had accuracy as %, score might be more direct from reranker)
    - `llmResponseTime = new Metric("llm_response_time_ms", { unit: "milliseconds", ... })`
    - `cacheHitRate = new Metric("embedding_cache_hit_rate_percent", { unit: "percentage", ...})` (This requires cache to track hits/misses).
- [ ] Integrate these metrics into relevant services:
    - `documentProcessingTime`: Record in `documentProcessorWorkflow`'s run function.
    - `embeddingGenerationTime`: Record in `CohereClient` after successful embedding calls.
    - `ragRetrievalScore`: Record in `ragAgent` with the final score of top retrieved+reranked chunk.
    - `llmResponseTime`: Record in `LLMService` after getting response from Gemini.
    - `cacheHitRate`: Update `MultiLevelEmbeddingCache` to track hits and total lookups, then periodically calculate and record rate (or emit hit/miss events to be aggregated).
- [ ] Write tests: Mock the `Metric.record()` or `increment()` methods. Verify they are called with expected values in service logic.
- [ ] Test passes locally.
    - **Subtask 3.1:** Define Metric objects. - Complexity: 1
    - **Subtask 3.2:** Integrate metrics recording into workflow and services. - Complexity: 2
    - **Subtask 3.3:** Implement logic for `cacheHitRate` calculation and recording. - Complexity: 2
### 4. Setup Basic Logging Review - Complexity: 1
- [ ] Review all services for consistent and useful structured logging using `encore.dev/log`.
- [ ] Ensure important events, errors, and decision points are logged with relevant context (e.g., `documentId`, `userId`, `query`).
- [ ] Check that API keys or sensitive data are NOT logged.
- [ ] No new code unless gaps are found. This is a review task.
## Code Example
```typescript
// encore.app (Example Snippet)
{
  "name": "rag-chat-app",
  "global_cors": { // Example, adjust to your frontend URL
    "allow_origins_with_credentials": ["http://localhost:3000", "https://your-frontend-domain.com"]
  },
  "services": [
    // ... other services
    {
      "name": "doc-processing", // The Encore service name
      "resources": { "cpu": "1", "memory": "2Gi" }, // Adjusted example based on tasks
      "scaling": { "minInstances": 1, "maxInstances": 5, "targetCPU": 70 }
    },
    {
      "name": "chat", // The Encore service name
      "resources": { "cpu": "0.5", "memory": "1Gi" },
      "scaling": { "minInstances": 2, "maxInstances": 10, "targetCPU": 60 }
    }
    // ... define for all services: upload, doc-mgmt, search etc.
  ]
}

// src/shared/config/environment.ts
import { secret } from "encore.dev/config";

// This structure is mainly for organization if you pass a config object around.
// Often, services will call `secret("SECRET_NAME")()` directly where needed.
export const config = {
  neonDbUrl: secret("NEON_DATABASE_URL"),
  cohereApiKey: secret("COHERE_API_KEY"),
  geminiApiKey: secret("GEMINI_API_KEY"),
  unstructured: {
    apiKey: secret("UNSTRUCTURED_API_KEY"),
    apiUrl: secret("UNSTRUCTURED_API_URL"), // e.g., 'https://api.unstructuredapp.io/general/v0/general'
  },
  redisUrl: secret("REDIS_URL"),
  deepEvalApiKey: secret("DEEPEVAL_API_KEY"),
  otelEndpoint: secret("OTEL_ENDPOINT"), // For Mastra, e.g. "http://localhost:4318"
  // Add other app-specific configs here if needed
};

// src/shared/infrastructure/monitoring/metrics.ts
import { Metric } from "encore.dev/metrics";
import log from "encore.dev/log";

export const documentProcessingTime = new Metric("document_processing_time_seconds", {
  unit: "seconds",
  description: "Time to process a document from queue to 'processed' or 'error' state.",
});

export const embeddingGenerationTime = new Metric("embedding_generation_time_ms", {
  unit: "milliseconds",
  description: "Time to generate embeddings for a batch/document via Cohere.",
});

export const ragRetrievalScore = new Metric("rag_retrieval_score", {
  unit: "float", // No unit for a score, but float indicates type
  description: "Relevance score of the top reranked document for a RAG query.",
});

export const llmResponseTime = new Metric("llm_response_time_ms", {
  unit: "milliseconds",
  description: "Time taken for the LLM (Gemini) to generate a response.",
});

// For cacheHitRate, it's often easier to count hits and misses separately
export const embeddingCacheHits = new Metric("embedding_cache_hits_total", {
    description: "Total number of embedding cache hits (L1 or L2)."
});
export const embeddingCacheMisses = new Metric("embedding_cache_misses_total", {
    description: "Total number of embedding cache misses (L1 and L2)."
});

// Example usage in a service (e.g., LLMService)
// import { llmResponseTime } from '../infrastructure/monitoring/metrics';
// const startTime = Date.now();
// const result = await this.model.generateContentStream(request); // or similar
// llmResponseTime.record(Date.now() - startTime);

// Example usage in MultiLevelEmbeddingCache for cache metrics
// In get():
// if (memoryHit) { embeddingCacheHits.increment(); return memoryHit.data; }
// if (redisHit) { embeddingCacheHits.increment(); /* ... */ return data; }
// embeddingCacheMisses.increment(); return null;

// To calculate hit rate for dashboards: embeddingCacheHits / (embeddingCacheHits + embeddingCacheMisses)
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (Encore app deploys with resource configs, secrets are accessible, metrics are recorded and viewable in Encore dashboard or configured telemetry).
## Quick Research (5-10 minutes)
**Official Docs:**
- Encore Application Configuration (`encore.app`): [https://encore.dev/docs/app-config](https://encore.dev/docs/app-config)
- Encore Secrets Management: [https://encore.dev/docs/primitives/secrets](https://encore.dev/docs/primitives/secrets)
- Encore Custom Metrics: [https://encore.dev/docs/primitives/metrics](https://encore.dev/docs/primitives/metrics)
- Encore Logging: [https://encore.dev/docs/primitives/logging](https://encore.dev/docs/primitives/logging)
**Examples:**
- Defining resource requests and limits for services.
- Setting up different secret values for different environments (local, dev, prod) in Encore.
- Common metrics to track for RAG applications.
## Need to Go Deeper?
**Research Prompt:** *"How can I effectively monitor the `cacheHitRate` for the `MultiLevelEmbeddingCache` using Encore metrics? Should I calculate the percentage within the application and record it, or emit raw hit/miss counts and calculate the rate in the monitoring/dashboard system (e.g., Grafana with Prometheus)?"* (Emitting raw counts is generally more flexible for backend monitoring systems).
## Questions for Senior Dev
- [ ] What are sensible initial CPU/memory allocations and scaling parameters for each microservice? (This often requires some load testing or experience with similar services).
- [ ] For metrics like `ragRetrievalAccuracy` (from PRD), which implies a known ground truth: how would this typically be measured and recorded in a production system? (Usually offline evaluation or human-in-the-loop, less so real-time metric unless specific feedback mechanism exists). Changed to `ragRetrievalScore` which is more direct.
- [ ] Beyond the PRD metrics, are there other critical metrics we should consider for a RAG application from day one? (e.g., LLM hallucination rate (hard to auto-measure), user feedback scores, document processing failure rates).
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 15: Advanced Conversation Features (Auto-Save, Follow-ups - Backend Stubs)
## What You're Building
This slice focuses on laying the backend groundwork for advanced conversation features mentioned in the PRD: auto-saving draft conversations and generating follow-up questions. Full UI implementation for these will be in later frontend slices.
## Tasks
### 1. Backend: Auto-Save Draft Conversation Endpoint - Complexity: 3
- [ ] In `chat.service.ts`:
    - Create a new Encore API endpoint: `POST /api/chat/conversations/:conversationId/draft` (or PUT).
    - Request: `{ content: string; userId: string; }` (or a more structured draft object).
    - Logic:
        - Find the conversation by `conversationId` ensuring `userId` matches.
        - Update `conversations.metadata` JSONB field with the draft content (e.g., `metadata: { ..., draft: { text: "user typing...", lastEdit: "timestamp" } }`).
        - Set `conversations.isDraft = true` if it's a significant auto-save.
        - Update `conversations.updatedAt`.
    - No extensive business logic for "pending changes" as in PRD's `AutoSaveService` for this slice, just a direct save. The PRD's interval-based flush is more frontend/client-driven for offline.
- [ ] Write tests: Test the endpoint saves draft content to `conversations.metadata`.
- [ ] Test passes locally.
### 2. Backend: Modify `sendMessage` to Clear Draft - Complexity: 1
- [ ] In `chat.service.ts`'s `sendMessage` endpoint:
    - When a message is successfully processed for a conversation:
        - Clear the draft from `conversations.metadata` (e.g., set `metadata.draft = null`).
        - Set `conversations.isDraft = false`.
- [ ] Write tests: Verify draft is cleared after a message is sent.
- [ ] Test passes locally.
### 3. Backend: Stub for Generating Follow-up Questions - Complexity: 2
- [ ] In `rag.agent.ts` (or `chat.service.ts` after agent response):
    - After generating the main answer, add a step/function to generate follow-up questions.
    - For this slice, this function can return a hardcoded list of 2-3 generic follow-up questions (e.g., "Can you tell me more about X?", "What are the implications of Y?").
    - The actual LLM call to generate dynamic follow-up questions (based on answer + context) will be a future enhancement.
    - Include these stubbed `followUpQuestions: string[]` in the `ChatResponse` and `RAGAgentOutput`.
- [ ] Write tests: Verify the agent/chat response includes the stubbed follow-up questions.
- [ ] Test passes locally.
### 4. Conversation Pruning Service (Skeleton) - Complexity: 1
- [ ] Create `src/features/chat/conversation-pruning.service.ts` as per PRD.
- [ ] Define the class `ConversationPruningService` with the `pruneConversation` method signature.
- [ ] For this slice, the implementation can be very basic: just return the last N messages or a simple token cut-off, without summarization.
- [ ] The `ragAgent` or `chat.service` can use this basic pruner for history sent to LLM.
- [ ] Actual summarization logic deferred.
- [ ] Write tests: Test the basic pruning logic.
- [ ] Test passes locally.
## Code Example
```typescript
// src/features/chat/chat.service.ts (Additions for Draft and Follow-ups)
// ... existing imports from Slice 7 ...
import { conversations, conversationMessages, CitationData } from "../../shared/infrastructure/database/schema"; // Ensure CitationData is imported if not already

// Update ChatResponse
interface ChatResponse {
  conversationId: number;
  userMessageId: number;
  assistantMessageId: number;
  answer: string;
  citations?: CitationData[];
  followUpQuestions?: string[]; // Added
  sources?: any[]; // Added in Slice 8 for RAG agent output
}

interface ConversationDraftPayload {
  // Define what a draft consists of, e.g., the current message being typed
  currentMessage?: string;
  // other draft-specific fields if any
}

interface SaveDraftRequest {
  conversationId: Path<number>;
  draftPayload: ConversationDraftPayload; // The content of the draft
}

export const saveConversationDraft = api(
  { method: "POST", path: "/api/chat/conversations/:conversationId/draft", auth: true },
  async ({ conversationId, draftPayload }: SaveDraftRequest, { auth }): Promise<{ message: string }> => {
    const userId = auth?.authData?.userID;
    if (!userId) throw APIError.unauthenticated("User ID missing.");

    const conv = await db.query.conversations.findFirst({
      where: sql`${conversations.id} = ${conversationId} AND ${conversations.userId} = ${userId}`,
    });

    if (!conv) {
      throw APIError.notFound(`Conversation ${conversationId} not found or access denied.`);
    }

    // Update metadata with draft content
    // The sql`jsonb_set` function is powerful. Ensure path '{draft}' is what you want.
    await db.update(conversations)
      .set({
        metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{draft}', ${JSON.stringify(draftPayload)}::jsonb)`,
        isDraft: true,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    log.info("Conversation draft saved", { conversationId, userId });
    return { message: "Draft saved successfully." };
  }
);

// Modify sendMessage in chat.service.ts
// Inside `sendMessage` function, after successfully storing assistant message and before returning:
// ...
// Clear draft and mark not a draft
await db.update(conversations)
  .set({
    metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{draft}', 'null'::jsonb)`, // Set draft to null
    isDraft: false,
    updatedAt: new Date(), // Already updated, but good to be explicit
  })
  .where(eq(conversations.id, conversationId!));
log.info("Conversation draft cleared", { conversationId });

// return { ... existing response fields ..., followUpQuestions: agentResponse.followUpQuestions };
// Ensure agentResponse includes followUpQuestions


// src/shared/infrastructure/mastra/agents/rag.agent.ts (Add stubbed follow-ups)
// ... existing RAGAgentOutput ...
interface RAGAgentOutput {
  answer: string;
  citations: CitationData[];
  sources: any[];
  followUpQuestions?: string[]; // Added
}
// ... inside ragAgent run method, before final return ...
const stubbedFollowUps = [
  "Can you provide more details on a specific point?",
  "What are the limitations of this approach?",
  "How does this compare to X?",
];
// return { answer: llmAnswer, citations: uniqueCitations, sources: sourcesForOutput, followUpQuestions: stubbedFollowUps };

// src/features/chat/conversation-pruning.service.ts (Skeleton)
import { ChatMessageAPI } from "./chat.service"; // Assuming Message type
import log from "encore.dev/log";

// Define Message type based on what is stored/passed around
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number; // Optional for more advanced pruning
}

export class ConversationPruningService {
  // As per PRD, though options might differ for basic version
  async pruneConversation(
    messages: Message[],
    options: {
      maxMessages?: number; // Max total messages
      maxTokens?: number;   // Max total tokens (requires token counting)
      preserveSystemMessage?: boolean;
      // summarizationThreshold?: number; // For future advanced pruning
    }
  ): Promise<Message[]> {
    let prunedMessages = [...messages];
    const { maxMessages, preserveSystemMessage = true } = options;

    let systemMessage: Message | undefined;
    if (preserveSystemMessage && prunedMessages.length > 0 && prunedMessages[0].role === 'system') {
      systemMessage = prunedMessages.shift();
    }

    if (maxMessages && prunedMessages.length > maxMessages) {
      prunedMessages = prunedMessages.slice(-maxMessages);
      log.debug("Pruned conversation by maxMessages", { originalCount: messages.length, newCount: prunedMessages.length, maxMessages });
    }

    // TODO: Implement token-based pruning if options.maxTokens is set and tokenCount is available on messages

    if (systemMessage) {
      prunedMessages.unshift(systemMessage);
    }
    return prunedMessages;
  }
}
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (drafts can be saved/cleared via API, chat response includes stubbed follow-ups, basic pruning service exists).
## Quick Research (5-10 minutes)
**Official Docs:**
- PostgreSQL JSONB functions (`jsonb_set`): [https://www.postgresql.org/docs/current/functions-json.html](https://www.postgresql.org/docs/current/functions-json.html)
- Drizzle ORM raw SQL for JSONB operations.
**Examples:**
- Strategies for generating good follow-up questions using an LLM (for future enhancement).
- Advanced conversation summarization techniques for context pruning.
## Need to Go Deeper?
**Research Prompt:** *"What are robust methods for implementing an auto-save feature for a chat input field on the frontend that debounces requests and efficiently updates a draft on the backend? Consider using Tanstack Query for optimistic updates and handling potential conflicts if multiple clients/tabs are open."* (This is more for the frontend part of auto-save).
## Questions for Senior Dev
- [ ] The PRD's `AutoSaveService` implies a more complex client-side mechanism with periodic flushing. Is the simpler backend endpoint for explicit draft saves sufficient for this slice? (Yes, client can call this on input change with debounce).
- [ ] For generating *dynamic* follow-up questions later, should this logic reside in the `ragAgent` or be a separate utility/service called by the agent? (Agent is a good place, as it has the context).
- [ ] Is the basic `ConversationPruningService` adequate for now, or should we prioritize token-based pruning earlier? (Message count is fine for now; token-based is better but adds complexity of tokenization).
</SLICING_TEMPLATE>

This covers the main backend features and a good chunk of the frontend. We're getting close to a fully-featured MVP based on the PRD! The remaining items would be:
*   Frontend implementation for auto-save and displaying follow-up questions.
*   More sophisticated document update logic (beyond delete).
*   Full integration and E2E testing of the DeepEval-based evaluation pipeline.
*   Performance load testing and tuning based on metrics.
*   Security hardening and review.
*   Documentation.
*   Allowing different frontends (this is more an architectural consideration for API design, which has been fairly standard).