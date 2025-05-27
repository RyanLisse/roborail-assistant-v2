Okay, Architect! Let's proceed with the chat functionality and LLM integration.

---
<SLICING_TEMPLATE>
# Slice 7: Basic Chat Service, Mastra Agent & LLM Integration (Stubbed RAG)
## What You're Building
This slice introduces the `chat` Encore service with an API endpoint for handling chat messages. It will set up a basic Mastra RAG Agent (`ragAgent`), integrate with Google Gemini 2.5 Flash (via an `LLMService`) for generating responses (initially with stubbed/minimal context), and manage conversation history (create, load, append messages).
## Tasks
### 1. Create Chat Encore Service & API Endpoint - Complexity: 2
- [ ] Create `src/features/chat/chat.service.ts` and define `chatService = new Service("chat")`.
- [ ] Define an Encore API endpoint `POST /api/chat/message`.
- [ ] Request interface: `ChatRequest { conversationId?: number; userId: string; message: string; }`. (User ID from auth if available, or passed explicitly).
- [ ] Response interface: `ChatResponse { conversationId: number; messageId: number; answer: string; citations?: any[]; followUpQuestions?: string[]; sources?: any[]; }`.
- [ ] Implement logic to either create a new conversation or load an existing one based on `conversationId`.
- [ ] Store user message in `conversationMessages` table.
- [ ] Write tests: Basic endpoint reachability and conversation creation/loading logic (mocking DB).
- [ ] Test passes locally.
### 2. Setup Basic Mastra RAG Agent - Complexity: 2
- [ ] Define `ragAgent` in `src/shared/infrastructure/mastra/agents/rag.agent.ts` and register it in `mastra/config.ts`.
- [ ] Inputs to agent: `messages: Array<{role: 'user'|'assistant', content: string}>`, `threadId?: string | number`.
- [ ] Output from agent: `{ answer: string; citations: any[]; sources: any[]; }`.
- [ ] For this slice, the agent's `generate` method will be very simple:
    - It will call the `LLMService` (to be created) with the latest user message and a placeholder context.
    - It will not yet perform actual RAG retrieval.
- [ ] Write tests: Unit test the agent's basic flow, mocking the `LLMService`.
- [ ] Test passes locally.
### 3. Create LLMService for Gemini - Complexity: 3
- [ ] Create `src/shared/services/llm.service.ts`.
- [ ] Implement `LLMService` class with a method like `generateResponse(prompt: string, history?: Array<{role: 'user'|'assistant', content: string}>): Promise<string>`.
- [ ] Use `GEMINI_API_KEY` from Encore secrets.
- [ ] Use Google AI SDK (`@google/generative-ai`) to interact with Gemini 2.5 Flash.
- [ ] Construct a simple prompt for Gemini (e.g., "User asks: [user_message]. Respond helpfully.").
- [ ] Handle API errors from Gemini.
- [ ] Write tests: Unit test `LLMService`, mocking the Google AI SDK client, to verify correct prompt construction and API call.
- [ ] Test passes locally.
    - **Subtask 3.1:** Setup Google AI SDK and API key. - Complexity: 1
    - **Subtask 3.2:** Implement `generateResponse` method calling Gemini. - Complexity: 2
### 4. Integrate Agent & LLM into Chat Handler - Complexity: 2
- [ ] In the `chat.service.ts` handler:
    - After storing user message, get `mastra.getAgent("ragAgent")`.
    - Prepare `messages` array (current user message + pruned history).
    - Call `agent.generate({ messages, threadId: conversation.id })`.
    - Store the agent's `answer` as an assistant message in `conversationMessages`.
    - Return the agent's response in the API.
- [ ] Implement basic conversation history loading and pruning (e.g., keep last N messages or tokens, simple version first).
- [ ] Write tests: Integration test for the chat handler, mocking Mastra agent and DB.
- [ ] Test passes locally.
### 5. Conversation Management (Create, Load, Append) - Complexity: 3
- [ ] **Create Conversation**: If `conversationId` is not provided in `ChatRequest` or doesn't exist for the `userId`, create a new record in `conversations` table. Auto-generate a title from the first user message (e.g., first 5 words).
- [ ] **Load Conversation**: If `conversationId` is provided, fetch the conversation and its messages from `conversations` and `conversationMessages` tables, ensuring `userId` matches.
- [ ] **Append Messages**: Store user messages and assistant responses in `conversationMessages`, linked to the `conversationId`. Include `role`, `content`.
- [ ] `conversations.updatedAt` should be updated on new messages.
- [ ] Write tests: Unit test conversation creation, loading, and message appending logic with Drizzle.
- [ ] Test passes locally.
## Code Example
```typescript
// src/shared/services/llm.service.ts
import { GenerativeModel, GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";

const geminiApiKey = secret("GEMINI_API_KEY");

interface ChatMessage {
  role: "user" | "assistant" | "model"; // Gemini uses 'model' for assistant
  parts: Array<{ text: string }>;
}

export class LLMService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(modelName: string = "gemini-1.5-flash-latest") { // PRD said 2.5 flash, use latest available gemini-1.5-flash-latest
    const apiKey = geminiApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY secret is not set.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
        model: modelName,
        // generationConfig: { // As per PRD
        //     maxOutputTokens: 4096,
        //     temperature: 0.7,
        // }
    });
  }

  async generateResponse(
    userMessage: string,
    history: ChatMessage[] = [], // Gemini format
    // For RAG later: contextSnippets?: string[]
  ): Promise<string> {
    const promptParts = [];
    // if (contextSnippets && contextSnippets.length > 0) {
    //   promptParts.push("Based on the following context:\n");
    //   contextSnippets.forEach((snippet, i) => promptParts.push(`[Snippet ${i+1}]: ${snippet}\n`));
    //   promptParts.push("\nAnswer the user's question.\n");
    // }
    promptParts.push(userMessage); // For now, just the user message directly

    const currentMessage: ChatMessage = { role: "user", parts: [{ text: promptParts.join("") }] };
    const chatHistory = [...history, currentMessage];

    try {
      const chat = this.model.startChat({
        history: history, // Pass previous messages directly
        generationConfig: {
             maxOutputTokens: 4096, // from PRD
             temperature: 0.7, // from PRD
        },
        safetySettings: [ // Default safety settings
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ]
      });
      // Send only the latest user message string to chat.sendMessage
      const result = await chat.sendMessage(userMessage);
      const response = result.response;
      const text = response.text();
      log.info("LLM response received", { textLength: text.length });
      return text;
    } catch (error: any) {
      log.error("Gemini API error", { error: error.message, details: error.stack });
      throw new Error(`Gemini API request failed: ${error.message}`);
    }
  }
}

// src/shared/infrastructure/mastra/agents/rag.agent.ts
import { createAgent } from "@mastra/core";
import { LLMService } from "../../../services/llm.service";
import log from "encore.dev/log";

interface RAGAgentInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>; // Internal representation
  threadId?: string | number;
  // In future: SearchService instance for retrieval
}

interface RAGAgentOutput {
  answer: string;
  citations: any[]; // Will be populated in Slice 8
  sources: any[];   // Will be populated in Slice 8
}

const llmService = new LLMService(); // Instantiate globally or pass via DI if Mastra supports

export const ragAgent = createAgent<RAGAgentInput, RAGAgentOutput>({
  name: "ragAgent",
  configSchema: {}, // No specific config for now
  run: async (input, { agent }) => {
    log.info("RAG Agent run started", { agentName: agent.name, threadId: input.threadId });
    const { messages, threadId } = input;

    const userMessage = messages.find(m => m.role === 'user')?.content; // Assuming last message is user
    if (!userMessage) {
      log.warn("No user message found in RAG agent input");
      return { answer: "I'm sorry, I didn't understand your message.", citations: [], sources: [] };
    }

    // Convert history to Gemini format (role: 'model' for assistant)
    const historyForLLM = messages
        .filter(m => m !== messages[messages.length -1]) // Exclude current user message from history here
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })) as Array<{role: "user" | "model", parts: [{ text: string }]}>;


    // TODO Slice 8: Perform RAG retrieval using SearchService
    // const retrievedContext = await searchService.search(contextualizedQuery);
    // For now, no context
    const contextSnippets: string[] = [];

    log.info("Calling LLMService", { userMessageLength: userMessage.length, historyLength: historyForLLM.length });
    const answer = await llmService.generateResponse(userMessage, historyForLLM /*, contextSnippets */);

    // TODO Slice 8: Extract citations from answer or based on context used

    return {
      answer,
      citations: [], // Placeholder
      sources: [],   // Placeholder
    };
  },
});

// src/features/chat/chat.service.ts
import { Service } from "encore.dev/service";
import { api, APIError, ErrCode } from "encore.dev/api";
import { db } from "../../shared/infrastructure/database/db";
import { conversations, conversationMessages, CitationData } from "../../shared/infrastructure/database/schema";
import { mastra } from "../../shared/infrastructure/mastra/config";
import { sql, eq, desc, asc } from "drizzle-orm";
import log from "encore.dev/log";

export default new Service("chat");

interface ChatMessageAPI { // For API request/response
  role: "user" | "assistant";
  content: string;
  citations?: CitationData[];
}
interface ChatRequest {
  conversationId?: number;
  userId: string; // Needs to come from auth context in a real app
  message: string;
}

interface ChatResponse {
  conversationId: number;
  userMessageId: number;
  assistantMessageId: number;
  answer: string;
  citations?: CitationData[];
  // followUpQuestions?: string[]; // Add later
  // sources?: any[]; // Add later
}

const ragAgentInstance = mastra.getAgent("ragAgent");

const MAX_HISTORY_MESSAGES = 10; // Simple pruning

export const sendMessage = api(
  { method: "POST", path: "/api/chat/message", auth: true }, // Ensure auth handler is set up for userId
  async (req: ChatRequest, { auth }): Promise<ChatResponse> => {
    const userId = auth?.authData?.userID; // Assuming authData contains userID
    if (!userId) {
        throw APIError.unauthenticated("User ID is missing from auth context.");
    }

    const { conversationId: reqConversationId, message: userMessageContent } = req;
    let conversationId = reqConversationId;
    let currentConversation;

    // 1. Load or Create Conversation
    if (conversationId) {
      currentConversation = await db.query.conversations.findFirst({
        where: sql`${conversations.id} = ${conversationId} AND ${conversations.userId} = ${userId}`,
      });
      if (!currentConversation) {
        throw APIError.notFound(`Conversation ${conversationId} not found or access denied.`);
      }
    } else {
      const title = userMessageContent.split(" ").slice(0, 5).join(" ") + (userMessageContent.length > 30 ? "..." : "");
      const newConvResult = await db.insert(conversations).values({
        userId: userId,
        title: title,
        isDraft: false, // Mark as not draft once first message is sent
      }).returning();
      currentConversation = newConvResult[0];
      conversationId = currentConversation.id;
      log.info("New conversation created", { conversationId, userId, title });
    }

    // 2. Store User Message
    const userMsgResult = await db.insert(conversationMessages).values({
      conversationId: conversationId!,
      role: 'user',
      content: userMessageContent,
    }).returning();
    const userMessageDbId = userMsgResult[0].id;
    log.info("User message stored", { conversationId, userMessageDbId });

    // 3. Load Conversation History for Agent
    const historyDbMessages = await db.query.conversationMessages.findMany({
      where: eq(conversationMessages.conversationId, conversationId!),
      orderBy: [asc(conversationMessages.createdAt)], // Get all for now, agent/LLM will handle context window
      // limit: MAX_HISTORY_MESSAGES * 2 // A bit more to ensure we have enough pairs
    });

    const agentMessages = historyDbMessages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    // Simple pruning: ensure current user message is the last one if history was full
    // A more sophisticated pruning would be in the agent or a dedicated service.
    // This ensures the very latest user message is included, even if history is long.
    // The Mastra agent's `messages` input expects the full relevant history including the latest user query.

    // 4. Call RAG Agent
    log.info("Calling RAG agent", { conversationId, messageCount: agentMessages.length });
    const agentResponse = await ragAgentInstance.generate({
      messages: agentMessages, // Pass the history ending with the current user message
      threadId: conversationId,
    });

    // 5. Store Assistant Message
    const assistantMsgResult = await db.insert(conversationMessages).values({
      conversationId: conversationId!,
      role: 'assistant',
      content: agentResponse.answer,
      citations: agentResponse.citations as CitationData[] | undefined, // Ensure types match
    }).returning();
    const assistantMessageDbId = assistantMsgResult[0].id;
    log.info("Assistant message stored", { conversationId, assistantMessageDbId });

    // Update conversation's updatedAt timestamp
    await db.update(conversations)
      .set({ updatedAt: new Date(), isDraft: false })
      .where(eq(conversations.id, conversationId!));

    return {
      conversationId: conversationId!,
      userMessageId: userMessageDbId,
      assistantMessageId: assistantMessageDbId,
      answer: agentResponse.answer,
      citations: agentResponse.citations as CitationData[] | undefined,
    };
  }
);
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (chat endpoint receives message, creates/loads conversation, calls agent (mocked LLM), stores messages, returns response).
## Quick Research (5-10 minutes)
**Official Docs:**
- Google AI SDK for Node.js (Gemini): [https://ai.google.dev/tutorials/node_quickstart](https://ai.google.dev/tutorials/node_quickstart)
- Mastra Agents: [https://mastra.ai/en/docs/agents](https://mastra.ai/en/docs/agents)
- Drizzle ORM querying (`findFirst`, `findMany`, `insert`, `update`).
**Examples:**
- Structuring chat history for different LLM APIs (OpenAI vs Gemini vs Anthropic).
- Basic conversation pruning techniques.
## Need to Go Deeper?
**Research Prompt:** *"What are the best practices for managing conversation history and context windows when interacting with LLMs like Gemini 2.5 Flash via its Node.js SDK? Consider token counting, summarization strategies for older parts of the conversation, and how to format history for optimal few-shot prompting or instruction following."*
## Questions for Senior Dev
- [ ] For the `LLMService`, should we instantiate `GoogleGenerativeAI` and `GenerativeModel` on each call, or keep them as class members initialized in the constructor? (Constructor approach is better for reuse).
- [ ] How should `userId` be obtained in the Encore API? Is there a standard auth middleware pattern in Encore that would inject `AuthData` into the handler's context? (Yes, `auth: true` and an `authHandler` would do this).
- [ ] The PRD's `ChatHandler` had `pruneConversationHistory` and `contextualizeQuery`. For this slice, simple history loading is done. When should these more advanced features be integrated? (Likely in the RAG agent or just before calling it in Slice 8).
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 8: Full RAG Pipeline in Chat Agent
## What You're Building
This slice fully implements the RAG (Retrieval Augmented Generation) pipeline within the `ragAgent`. It will use the `SearchService` (from Slice 6) to retrieve relevant document chunks based on the user's query and conversation history, then pass this context along with the query and history to the `LLMService` to generate a cited answer.
## Tasks
### 1. Enhance RAG Agent for Retrieval - Complexity: 3
- [ ] Modify `ragAgent` in `src/shared/infrastructure/mastra/agents/rag.agent.ts`.
- [ ] Add dependency/instance of `SearchService` (e.g., by importing its API client `import { hybridSearch } from "~encore/clients/search";`).
- [ ] **Contextualize Query**: Before searching, preprocess the user's query. If history is present, use a simple LLM call (or a specific prompt) to rephrase the latest user query to be a standalone query if it's ambiguous (e.g., "what about that one?" -> "what about [previous topic]?"). For now, can start by just using the latest user message.
- [ ] Call `hybridSearch` with the (contextualized) query and relevant filters (if any from chat context).
- [ ] Input: `messages`, `threadId`.
- [ ] Write tests: Unit test the query contextualization logic (mock LLM) and the call to search service (mock search service).
- [ ] Test passes locally.
    - **Subtask 1.1:** Implement basic query contextualization (e.g. combine last user message with last assistant message if simple). For full LLM-based, defer or make optional. - Complexity: 2
    - **Subtask 1.2:** Integrate `hybridSearch` call into the agent. - Complexity: 2
### 2. Construct Prompt with Context for LLM - Complexity: 3
- [ ] In `ragAgent`, after retrieving relevant document chunks from `hybridSearch`:
    - Format the retrieved chunks into a string to be included in the LLM prompt.
    - Example format: `"[Source N (doc_id:X, chunk_id:Y)]: Chunk content..."`
    - Construct the final prompt for `LLMService` including:
        - System message/instructions (e.g., "Answer based *solely* on provided sources. Cite sources using [Source N] format...").
        - Formatted conversation history.
        - Formatted retrieved context (sources).
        - The user's current query.
- [ ] Pass this comprehensive prompt to `llmService.generateResponse()`.
- [ ] Write tests: Unit test prompt construction logic with various inputs (history, context, query).
- [ ] Test passes locally.
### 3. Implement Citation Parsing and Source Mapping - Complexity: 3
- [ ] After receiving the LLM's answer:
    - Parse the answer string to find citations (e.g., `[Source 1]`, `[Source 2, Source 3]`).
    - Map these citation numbers back to the actual document chunks that were provided as context.
        - The `hybridSearch` results should include enough info (chunkId, documentTitle, documentSource, etc.) to build the `CitationData` objects.
    - Store the parsed `citations` (Array of `CitationData`) in the agent's output.
    - Also populate the `sources` field in the agent output with details of the unique documents/chunks used, for hover cards.
- [ ] Write tests: Unit test citation parsing logic with sample LLM responses and context.
- [ ] Test passes locally.
    - **Subtask 3.1:** Implement regex or string parsing for `[Source N]` style citations. - Complexity: 2
    - **Subtask 3.2:** Map parsed citation numbers back to the actual source chunk data. - Complexity: 2
### 4. Intelligent Conversation Pruning (Basic) - Complexity: 2
- [ ] Before sending history to LLM (or even to search query contextualization):
    - Implement a basic pruning strategy in `ragAgent` or `chat.service.ts`.
    - E.g., keep the N most recent user/assistant turns, or limit total tokens in history.
    - The PRD mentions a `ConversationPruningService` for more advanced logic (like summarization), but start simple here.
- [ ] Write tests: Unit test the pruning logic.
- [ ] Test passes locally.
## Code Example
```typescript
// src/shared/infrastructure/mastra/agents/rag.agent.ts
import { createAgent } from "@mastra/core";
import { LLMService } from "../../../services/llm.service";
import { hybridSearch as callHybridSearch } from "../../../../features/search/search.client"; // Assuming Encore client generation: import { search } from "~encore/clients"; const callHybridSearch = search.hybridSearch;
import { SearchResultItem, SearchRequest as HybridSearchApiRequest } from "../../../../features/search/search.service"; // Use types from service
import { CitationData } from "../../../infrastructure/database/schema";
import log from "encore.dev/log";

// ... (RAGAgentInput, RAGAgentOutput interfaces from Slice 7) ...
// LLMService instance from Slice 7

const MAX_CONTEXT_CHUNKS = 5;
const MAX_HISTORY_TURNS_FOR_LLM = 5; // Each turn is a user + assistant message

// Helper to format chat history for LLM
function formatHistoryForLLM(messages: Array<{ role: "user" | "assistant"; content: string }>, maxTurns: number): Array<{ role: "user" | "model"; parts: [{ text: string }] }> {
    const recentMessages = messages.slice(-maxTurns * 2); // Get last N turns
    return recentMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));
}

// Helper to contextualize query (very basic for now)
async function contextualizeQuery(
    currentQuery: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    llm: LLMService // Optional LLM for more advanced contextualization
): Promise<string> {
    if (history.length === 0) return currentQuery;

    // Simple: if query is short and history exists, prepend last assistant response content + last user query content
    // This is a placeholder. A proper implementation would use an LLM call for better contextualization.
    const lastUserMsg = history.filter(m => m.role === 'user').pop();
    const lastAssistantMsg = history.filter(m => m.role === 'assistant').pop();

    if (currentQuery.length < 30 && (currentQuery.toLowerCase().startsWith("what about") || currentQuery.toLowerCase().startsWith("tell me more"))) {
        let contextPrefix = "";
        if (lastAssistantMsg) contextPrefix += `Assistant said: "${lastAssistantMsg.content}". `;
        if (lastUserMsg && lastUserMsg.content !== currentQuery) contextPrefix += `User asked: "${lastUserMsg.content}". `;
        return contextPrefix + `Now user asks: "${currentQuery}" Clarify and make this a standalone question.`;
        // An LLM call would be:
        // return llm.generateResponse(`Based on this history:\n${history.map(m=>`${m.role}: ${m.content}`).join('\n')}\nAnd current query: "${currentQuery}"\nRewrite the current query to be a standalone question. Standalone Question:`);
    }
    return currentQuery;
}


export const ragAgent = createAgent<RAGAgentInput, RAGAgentOutput>({
  name: "ragAgent",
  configSchema: {},
  run: async (input, { agent }) => {
    const { messages, threadId } = input;
    const llmService = new LLMService(); // Or get from context if Mastra supports DI for services

    const currentUserMessageContent = messages[messages.length - 1].content;
    const conversationHistory = messages.slice(0, -1); // History excluding current message

    // 1. Contextualize Query (basic version)
    const standaloneQuery = await contextualizeQuery(currentUserMessageContent, conversationHistory, llmService);
    log.info("Contextualized query", { original: currentUserMessageContent, standalone: standaloneQuery, threadId });

    // 2. Retrieve Relevant Chunks
    const searchApiRequest: HybridSearchApiRequest = { query: standaloneQuery, limit: MAX_CONTEXT_CHUNKS /*, filters: {} */ };
    const searchClient = await import("~encore/clients/search"); // Dynamic import for Encore client
    const searchResults = await searchClient.search.hybridSearch(searchApiRequest); // Assuming client is 'search' and endpoint 'hybridSearch'
    
    log.info("Retrieved documents from search", { count: searchResults.results.length, threadId });

    // 3. Construct Prompt with Context
    const contextForPrompt: string[] = [];
    const sourcesForOutput: SearchResultItem[] = []; // To build RAGAgentOutput.sources

    searchResults.results.forEach((chunk, index) => {
      contextForPrompt.push(`[Source ${index + 1} (doc_id:${chunk.documentId}, chunk_id:${chunk.chunkId})]: ${chunk.content} ${chunk.previousChunkContent || ''} ${chunk.nextChunkContent || ''}`);
      sourcesForOutput.push(chunk);
    });

    const systemPrompt = `You are a helpful AI assistant. Answer the user's question based *solely* on the provided sources.
Cite the sources you use in your answer using the format [Source N], where N is the number corresponding to the source in the list.
Ensure that every piece of information directly taken or paraphrased from a source is cited.
If the provided sources do not contain the answer, state that you cannot answer based on the given information. Do not make up information.`;

    const llmHistory = formatHistoryForLLM(conversationHistory, MAX_HISTORY_TURNS_FOR_LLM);
    const fullPromptForLLM = `${systemPrompt}\n\nConversation History:\n${llmHistory.map(m=>`${m.role}: ${m.parts[0].text}`).join('\n')}\n\nSources:\n${contextForPrompt.join("\n\n")}\n\nUser Question: ${currentUserMessageContent}\n\nAnswer (with citations):`;

    log.info("Generating LLM response with context", { promptLength: fullPromptForLLM.length, contextChunkCount: contextForPrompt.length, threadId });
    // The llmService.generateResponse needs to be adapted to take the full prompt, or we construct history + user message here
    // For Gemini, the history and current message are distinct.
    const llmAnswer = await llmService.generateResponse(
        `User Question: ${currentUserMessageContent}\n\nSources:\n${contextForPrompt.join("\n\n")}\n\nAnswer (with citations):`, // This is the "user" part of the prompt for the current turn
        [
            { role: 'user', parts: [{ text: systemPrompt }] }, // System prompt as first user message in history
            ...llmHistory // Formatted past conversation
        ]
    );

    // 4. Parse Citations
    const citations: CitationData[] = [];
    const citationRegex = /\[Source\s*(\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(llmAnswer)) !== null) {
      const sourceNum = parseInt(match[1], 10);
      if (sourceNum > 0 && sourceNum <= sourcesForOutput.length) {
        const sourceDoc = sourcesForOutput[sourceNum - 1];
        citations.push({
          sourceId: String(sourceDoc.chunkId), // chunkId as string
          documentId: sourceDoc.documentId,
          documentTitle: sourceDoc.documentTitle || "Unknown Title",
          documentSource: sourceDoc.documentSource || "Unknown Source", // Original filename or URL
          quote: sourceDoc.content.substring(0, 100) + "...", // Placeholder quote, ideally LLM would give specific quote or we extract it
          pageNumber: (sourceDoc.chunkMetadata as any)?.pageNumber,
          // confidence: sourceDoc.score, // score from reranker
        });
      }
    }
    // Deduplicate citations based on sourceId
    const uniqueCitations = Array.from(new Map(citations.map(c => [c.sourceId, c])).values());
    log.info("Citations parsed", { count: uniqueCitations.length, threadId });

    return {
      answer: llmAnswer,
      citations: uniqueCitations,
      sources: sourcesForOutput.map(s => ({ // For hover cards etc.
          id: s.chunkId,
          title: s.documentTitle,
          documentSource: s.documentSource,
          snippet: s.content.substring(0, 200) + "...", // A snippet of the chunk
          score: s.score,
          pageNumber: (s.chunkMetadata as any)?.pageNumber,
      })),
    };
  },
});
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (agent retrieves context from search, builds prompt, calls LLM, parses citations, returns structured response).
## Quick Research (5-10 minutes)
**Official Docs:**
- Prompt engineering techniques for RAG with LLMs (e.g., system prompts, few-shot examples, context formatting).
- Encore service client generation and usage (`~encore/clients/...`).
**Examples:**
- Citation parsing regex patterns.
- Structuring context from multiple documents for an LLM prompt.
- Query contextualization strategies.
## Need to Go Deeper?
**Research Prompt:** *"How can I improve the accuracy and robustness of citation parsing from LLM responses? Explore techniques beyond simple regex, such as prompting the LLM to output citations in a structured format (e.g., JSON), or using NLP techniques to align claims in the answer with specific source sentences."*
## Questions for Senior Dev
- [ ] The current query contextualization is very basic. What's a good iterative step towards more robust LLM-based contextualization without overcomplicating this slice?
- [ ] How should the `LLMService.generateResponse` be adapted to better handle the complex prompt (system message, history, context, query) for Gemini? Should it take structured input? (Yes, Gemini's `startChat` takes history and current message separately).
- [ ] The `quote` in `CitationData` is currently a placeholder. What's a practical way to get a more relevant quote? (Could be a follow-up LLM call to extract the specific sentence, or a simpler string match, or advanced NLP). For now, a snippet is fine.
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 9: Frontend - Basic Chat UI (Next.js & Shadcn)
## What You're Building
This slice focuses on creating the initial Next.js frontend for the chat interface using Shadcn UI and Tailwind CSS. It will allow users to send messages to the backend chat API (from Slice 7 & 8) and display the streaming or complete responses, including basic citation rendering. It will use Tanstack Query for managing API state.
## Tasks
### 1. Setup Next.js Project with Shadcn UI & Tailwind - Complexity: 2
- [ ] Create a new Next.js project: `npx create-next-app@latest rag-frontend --typescript --tailwind --eslint`.
- [ ] Initialize Shadcn UI: `npx shadcn-ui@latest init`.
- [ ] Install necessary Shadcn components: `button`, `input`, `card`, `scroll-area`, `avatar`, `hover-card`.
- [ ] Install Tanstack Query: `npm install @tanstack/react-query`.
- [ ] Configure Tailwind CSS according to Shadcn UI docs.
- [ ] Create a basic page structure (e.g., `app/page.tsx` or `app/chat/page.tsx`).
- [ ] Write tests: Ensure Next.js app builds and runs, basic Shadcn component renders.
- [ ] Test passes locally.
### 2. Implement Chat Input and Message Display Area - Complexity: 3
- [ ] Create components: `ChatInput.tsx`, `MessageList.tsx`, `ChatMessage.tsx`.
- [ ] `ChatInput`: An input field and a send button. On submit, it calls a mutation function (from Tanstack Query) to send the message.
- [ ] `MessageList`: Renders an array of `ChatMessage` components within a `ScrollArea`.
- [ ] `ChatMessage`: Displays message content, role (user/assistant), avatar, timestamp (optional).
    - For assistant messages with citations, render citations like ``, ``.
- [ ] Use `useState` for managing the input field and `useQuery` / `useMutation` for messages.
- [ ] Write tests: Component tests for `ChatInput`, `MessageList`, `ChatMessage` with mock data.
- [ ] Test passes locally.
    - **Subtask 2.1:** Create `ChatInput` component with state and submit handler. - Complexity: 2
    - **Subtask 2.2:** Create `ChatMessage` and `MessageList` components for display. - Complexity: 2
### 3. Integrate Tanstack Query for API Calls - Complexity: 3
- [ ] Setup `QueryClientProvider` in `app/layout.tsx` or `app/providers.tsx`.
- [ ] Create API functions (e.g., in `lib/api.ts`) to call the backend `/api/chat/message` endpoint.
- [ ] Use `useMutation` from Tanstack Query in the chat page/component to send new messages.
    - On success, append user message and assistant response to a local state holding the conversation messages.
    - Handle loading and error states.
- [ ] If implementing conversation history loading: Use `useQuery` to fetch messages for a `conversationId` (requires a new backend endpoint or enhancing existing). For now, focus on new messages in a session.
- [ ] Write tests: Mock `fetch`. Test `useMutation` hook for sending messages and updating state.
- [ ] Test passes locally.
### 4. Basic Citation Rendering & Hover Cards - Complexity: 3
- [ ] In `ChatMessage.tsx`, when rendering assistant messages:
    - Parse the message content to find `[Source N]` patterns (similar to backend, or assume backend provides structured citations separately).
    - For each citation, render it as a clickable element (e.g., a `span`).
    - Use Shadcn's `HoverCard` component.
    - `HoverCardTrigger` is the `[N]` span.
    - `HoverCardContent` should display details from the `citations` and `sources` array in the API response (e.g., document title, snippet, source filename).
    - This requires the backend `/api/chat/message` response to include structured `citations` and `sources` data as designed in Slice 8.
- [ ] Write tests: Component test for `ChatMessage` with mock citation data, verify hover card functionality.
- [ ] Test passes locally.
    - **Subtask 4.1:** Adapt `ChatMessage` to identify and render citation markers. - Complexity: 2
    - **Subtask 4.2:** Implement `HoverCard` for displaying source details. - Complexity: 2
## Code Example
```tsx
// app/chat/page.tsx (Simplified)
"use client";
import { useState, FormEvent, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// Define types for messages and citations based on backend response
interface CitationSource {
  id: number | string; // chunkId
  title?: string | null;
  documentSource?: string | null; // Original filename or URL
  snippet?: string;
  score?: number;
  pageNumber?: number;
}
interface Citation {
  sourceId: string;
  documentId: number;
  documentTitle: string;
  documentSource: string;
  quote: string;
  pageNumber?: number;
}
interface Message {
  id: string | number; // Could be userMessageId or assistantMessageId from backend or a local UUID
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  sources?: CitationSource[]; // The detailed sources linked by citations
  createdAt?: Date;
}

// API call function (e.g., in lib/api.ts)
async function postChatMessage(payload: { userId: string; message: string; conversationId?: number }): Promise<any> {
  const response = await fetch('/api/chat/message', { // Adjust if your Encore app is hosted elsewhere during dev
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to send message');
  }
  return response.json();
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  const chatMutation = useMutation({
    mutationFn: postChatMessage,
    onSuccess: (data) => { // data is the response from /api/chat/message
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: data.assistantMessageId, // Use actual ID from backend
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
          sources: data.sources, // Assuming backend sends this based on Slice 8
          createdAt: new Date(),
        },
      ]);
      if (!conversationId) {
        setConversationId(data.conversationId);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now(), role: 'assistant', content: `Error: ${error.message}`, createdAt: new Date() },
      ]);
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(), // Temporary client-side ID
      role: 'user',
      content: input,
      createdAt: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');

    // Replace "temp-user-id" with actual user ID from auth system
    chatMutation.mutate({ userId: "temp-user-id", message: input, conversationId });
  };

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Function to render message content with inline citations
  const renderMessageContent = (message: Message) => {
    if (message.role === 'user' || !message.citations || message.citations.length === 0 || !message.sources) {
      return <p className="whitespace-pre-wrap">{message.content}</p>;
    }

    // Naive citation parsing and replacement - can be improved significantly
    let contentWithCitations = message.content;
    const citationMap = new Map<number, CitationSource>(); // Map source index (1-based) to actual source detail
    
    // Build a map from the [Source N] in text to the source detail
    // This requires the LLM to consistently use [Source N] where N maps to the order of `sourcesForOutput` in the agent.
    message.citations.forEach(citation => {
        // Find the source detail using citation.sourceId (chunkId) from the message.sources list
        const sourceDetail = message.sources?.find(s => String(s.id) === citation.sourceId);
        if (sourceDetail) {
            // This is tricky: the [Source N] in text is an ordinal. We need to map it.
            // For now, let's assume message.citations are ordered as they appear, and N maps to their index + 1
        }
    });


    // A simpler way: Backend should provide which source_index maps to which detailed source.
    // Or, for now, just find any [Source N] and link it to the Nth citation object if order is preserved.
    return message.content.split(/(\[Source\s*\d+\])/g).map((part, index) => {
      const match = /\[Source\s*(\d+)\]/.exec(part);
      if (match) {
        const sourceNum = parseInt(match[1], 10);
        const citationDetail = message.citations?.[sourceNum - 1]; // Assumes 1-based indexing in text maps to 0-based array
        const sourceDetail = message.sources?.find(s => citationDetail && String(s.id) === citationDetail.sourceId);

        if (citationDetail && sourceDetail) {
          return (
            <HoverCard key={`${message.id}-cite-${index}`} openDelay={200}>
              <HoverCardTrigger asChild>
                <span className="citation-link cursor-pointer text-blue-600 hover:text-blue-800 font-semibold">
                  {part}
                </span>
              </HoverCardTrigger>
              <HoverCardContent className="w-96">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">{sourceDetail.title || 'Source Document'}</h4>
                  <p className="text-xs text-gray-500">File: {sourceDetail.documentSource || 'N/A'}{sourceDetail.pageNumber ? `, Page: ${sourceDetail.pageNumber}` : ''}</p>
                  <blockquote className="text-sm text-muted-foreground italic border-l-2 pl-2">
                    {citationDetail.quote.substring(0,150)}...
                  </blockquote>
                  {/* <div className="text-xs text-gray-500">Confidence: {sourceDetail.score?.toFixed(2)}</div> */}
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        }
      }
      return <span key={`${message.id}-part-${index}`}>{part}</span>;
    });
  };


  return (
    <div className="flex justify-center items-center h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-2xl h-[calc(100vh-4rem)] flex flex-col">
        <CardHeader>
          <CardTitle>RAG Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full pr-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}`}>
                    <div className="font-semibold mb-1 capitalize">{msg.role}</div>
                    {renderMessageContent(msg)}
                    <div className="text-xs mt-1 opacity-70">
                      {msg.createdAt?.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                 <div className="flex justify-start">
                    <div className="max-w-[70%] p-3 rounded-lg bg-gray-200 text-gray-900 animate-pulse">Typing...</div>
                 </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chatMutation.isPending}
            />
            <Button type="submit" disabled={chatMutation.isPending || !input.trim()}>
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
```
## Ready to Merge Checklist
- [ ] All tests pass (Jest/RTL for components, Playwright/Cypress for E2E if set up)
- [ ] Linting passes
- [ ] Build succeeds (`npm run build`)
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (can send message, see user message, see assistant response, basic citations are rendered with hover cards).
## Quick Research (5-10 minutes)
**Official Docs:**
- Shadcn UI Components (Input, Button, ScrollArea, Card, HoverCard): [https://ui.shadcn.com/docs/components/...](https://ui.shadcn.com/docs/components/...)
- Tanstack Query `useMutation`: [https://tanstack.com/query/latest/docs/react/guides/mutations](https://tanstack.com/query/latest/docs/react/guides/mutations)
- Next.js App Router for page structure.
**Examples:**
- Vercel AI Chatbot example: [https://github.com/vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) for UI patterns.
- Tanstack Query examples for chat applications.
## Need to Go Deeper?
**Research Prompt:** *"How can I implement robust inline citation rendering in React where citations like `[Source N]` in an LLM's text response need to be replaced with interactive components (like HoverCards) that link to specific source details? Consider challenges with overlapping citations, proper HTML parsing/sanitization if the LLM response contains Markdown, and maintaining React state for hover interactions."*
## Questions for Senior Dev
- [ ] What's a good strategy for managing `conversationId` on the frontend? Should it be a URL param, or managed in local state/Tanstack Query cache? (Local state is fine for this slice).
- [ ] The citation rendering logic in the example is basic. What are common pitfalls or better approaches for parsing and rendering these reliably, especially if the LLM output isn't perfectly clean?
- [ ] For authentication, how will the `userId` be passed to `postChatMessage`? (Typically via an auth context/hook that provides the user session). For now, "temp-user-id" is a placeholder.
</SLICING_TEMPLATE>

This concludes the core RAG chat functionality. The next steps would involve:
*   **Slice 10: Frontend - Document Upload UI**: UI for the upload endpoint from Slice 2.
*   **Slice 11: Document Management UI (Read, Delete)**: UI to list documents, view status, and delete them.
*   **Slice 12: Advanced Conversation Features**: Auto-save drafts, intelligent pruning UI, follow-up questions UI.
*   **Slice 13: Testing Strategy Implementation**: Setting up DeepEval and Vitest for backend TDD as per PRD.
*   **Slice 14: Caching Implementation**: Implementing multi-level caching for embeddings.
*   **Slice 15: Production Configuration & Monitoring Setup**: Finalizing Encore service configs, metrics.

Let me know how you'd like to proceed!