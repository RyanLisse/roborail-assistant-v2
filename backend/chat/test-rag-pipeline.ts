#!/usr/bin/env ts-node
/**
 * Simple script to test the RAG pipeline end-to-end
 * Run with: npx tsx backend/chat/test-rag-pipeline.ts
 */

import { 
  detectQueryIntent, 
  extractKeyTerms, 
  assembleContext,
  buildLLMRequest,
  parseLLMResponse,
  generateFollowUpQuestions,
  getResponseModeConfig
} from "./rag-orchestration";

async function testRAGComponents() {
  console.log("🧪 Testing RAG Pipeline Components\n");

  // Test 1: Query Intent Detection
  console.log("1️⃣ Testing Query Intent Detection");
  const queries = [
    "What does the research paper say about machine learning?",
    "Hello, how are you?",
    "Can you elaborate on that point?",
    "What do you mean by neural networks?",
  ];

  for (const query of queries) {
    const intent = detectQueryIntent(query);
    console.log(`Query: "${query}"`);
    console.log(`Intent: ${intent.type}, Requires Docs: ${intent.requiresDocuments}, Requires Context: ${intent.requiresContext}`);
    console.log(`Key Terms: ${intent.keyTerms.join(", ")}\n`);
  }

  // Test 2: Key Term Extraction
  console.log("2️⃣ Testing Key Term Extraction");
  const complexQuery = "What are the main differences between supervised and unsupervised machine learning algorithms in neural networks?";
  const keyTerms = extractKeyTerms(complexQuery);
  console.log(`Query: "${complexQuery}"`);
  console.log(`Key Terms: ${keyTerms.join(", ")}\n`);

  // Test 3: Context Assembly
  console.log("3️⃣ Testing Context Assembly");
  const mockSearchResults = [
    {
      id: "chunk-1",
      content: "Machine learning is a subset of artificial intelligence that enables systems to learn from data without explicit programming.",
      documentId: "doc-1",
      filename: "ml-guide.pdf",
      pageNumber: 1,
      relevanceScore: 0.95,
    },
    {
      id: "chunk-2", 
      content: "Supervised learning uses labeled training data to learn a mapping from inputs to outputs.",
      documentId: "doc-2",
      filename: "ml-types.pdf",
      pageNumber: 3,
      relevanceScore: 0.87,
    },
  ];

  const mockConversationHistory = [
    { role: "user", content: "Tell me about AI", createdAt: new Date() },
    { role: "assistant", content: "AI is a broad field...", createdAt: new Date() },
  ];

  const context = assembleContext({
    searchResults: mockSearchResults,
    conversationHistory: mockConversationHistory,
    maxContextLength: 4000,
    prioritizeRecent: true,
  });

  console.log("Document Context Preview:", context.documentContext.slice(0, 100) + "...");
  console.log("Conversation Context:", context.conversationContext);
  console.log(`Total Tokens: ${context.totalTokens}, Truncated: ${context.wasTruncated}`);
  console.log(`Sources: ${context.sources.length}\n`);

  // Test 4: LLM Request Building
  console.log("4️⃣ Testing LLM Request Building");
  const testIntent = { type: "document_query", requiresDocuments: true, requiresContext: false, confidence: 0.9, keyTerms: ["machine", "learning"] };
  const llmRequest = buildLLMRequest("What is machine learning?", context, testIntent, "detailed");
  
  console.log("LLM Request Structure:");
  console.log(`Messages: ${llmRequest.messages.length}`);
  console.log(`Temperature: ${llmRequest.temperature}`);
  console.log(`Max Tokens: ${llmRequest.maxTokens}`);
  console.log(`Model: ${llmRequest.model}\n`);

  // Test 5: Response Parsing
  console.log("5️⃣ Testing Response Parsing");
  const mockLLMResponse = "Based on the provided documents [1][2], machine learning is a powerful approach to artificial intelligence. The first document [1] explains that it's a subset of AI, while the second document [2] describes supervised learning specifically.";
  
  const parsedResponse = parseLLMResponse(mockLLMResponse, context.sources);
  console.log("Parsed Content:", parsedResponse.content);
  console.log("Citations Found:", parsedResponse.citations.length);
  for (const citation of parsedResponse.citations) {
    console.log(`- Citation ${citation.citationIndex}: ${citation.filename} (relevance: ${citation.relevanceScore})`);
  }

  // Test 6: Follow-up Questions
  console.log("\n6️⃣ Testing Follow-up Question Generation");
  const followUpQuestions = generateFollowUpQuestions("What is machine learning?", parsedResponse.content, testIntent);
  console.log("Generated Follow-up Questions:");
  followUpQuestions.forEach((question, index) => {
    console.log(`${index + 1}. ${question}`);
  });

  // Test 7: Response Mode Configurations
  console.log("\n7️⃣ Testing Response Mode Configurations");
  const modes = ["detailed", "concise", "technical", "conversational"];
  for (const mode of modes) {
    const config = getResponseModeConfig(mode);
    console.log(`${mode}: max tokens ${config.maxTokens}, temp ${config.temperature}`);
  }

  console.log("\n✅ RAG Pipeline Component Tests Completed Successfully!");
}

// Run the tests
if (require.main === module) {
  testRAGComponents().catch(console.error);
}

export { testRAGComponents };