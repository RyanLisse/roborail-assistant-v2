Okay, Architect! Let's focus on the final steps for bringing this RAG chat application to a production-ready state, emphasizing comprehensive testing, performance, and deployment.

---
<SLICING_TEMPLATE>
# Slice 18: Comprehensive E2E Testing & Evaluation Pipeline Setup
## What You're Building
This slice focuses on establishing an end-to-end (E2E) testing strategy, including setting up a more formal RAG evaluation pipeline using DeepEval. This goes beyond unit/integration tests and aims to assess the quality of the entire RAG system from user query to final answer.
## Tasks
### 1. Plan E2E Test Scenarios - Complexity: 2 (Planning)
- [ ] Define key user flows for E2E testing:
    - User uploads a new document -> document is processed -> user can search and get results from this document.
    - User starts a chat -> asks a question answerable by uploaded docs -> receives a relevant, cited answer.
    - User asks a question NOT answerable by docs -> receives a "cannot answer" response.
    - User deletes a document -> document is no longer searchable.
- [ ] For each scenario, define expected outcomes and assertions.
- [ ] This is primarily a planning and documentation task.
### 2. Setup E2E Testing Framework (e.g., Playwright or Cypress) - Complexity: 3
- [ ] Choose an E2E testing framework (Playwright is generally good for Next.js and complex interactions).
- [ ] Install and configure the chosen framework in the frontend project (`rag-frontend`).
- [ ] Write a simple E2E test: Navigates to the chat page, types a message, and verifies a response appears (even if mocked backend for this initial E2E setup).
- [ ] Ensure E2E tests can run against a locally running instance of the frontend and backend (Encore).
- [ ] Write tests: The simple E2E navigation test.
- [ ] Test passes locally.
### 3. Create a "Golden Dataset" for RAG Evaluation - Complexity: 3
- [ ] Curate a small set of documents (e.g., 5-10 representative PDFs/docs).
- [ ] For these documents, create a list of question-answer pairs:
    - `question`: A question a user might ask.
    - `ideal_answer`: The perfect, concise answer based *only* on the documents.
    - `expected_sources`: List of document names/chunk IDs that should be cited.
    - `contextual_precision_ground_truth` (optional, for DeepEval): Specific sentences/chunks that are relevant.
- [ ] This dataset will be used by DeepEval for automated evaluation. Store it in a structured format (e.g., JSON, CSV).
- [ ] This is a data curation and manual effort task.
### 4. Implement RAG Evaluation Script using DeepEval - Complexity: 4
- [ ] Create a new script (e.g., `scripts/evaluate-rag.ts`) outside the main application source, possibly in a `tests/evaluation` directory.
- [ ] This script will:
    1.  Load the "golden dataset".
    2.  For each question in the dataset:
        a.  Programmatically call your RAG chat API endpoint (e.g., `/api/chat/message`) with the question (and potentially a clean conversation state).
        b.  Receive the `answer`, `citations`, and `sources` from your RAG app.
        c.  Use DeepEval to evaluate the response against the golden dataset:
            - `FaithfulnessMetric`: Does the answer stay true to the *retrieved context* (mocked or real)?
            - `AnswerRelevancyMetric`: Is the answer relevant to the question?
            - `ContextualPrecisionMetric` & `ContextualRecallMetric`: How good was the retrieval step (if you can feed DeepEval the retrieved chunks and the ground truth relevant chunks)?
            - Use `toMatchSemanticSimilarity` (from Slice 12 setup) to compare the generated answer with the `ideal_answer`.
            - Custom checks for citation correctness based on `expected_sources`.
    3.  Aggregate and report evaluation results (e.g., average scores, pass/fail rates).
- [ ] This script will require the RAG application (Encore backend + frontend if interacting via UI) to be running.
- [ ] Write tests: The script itself is the test. Ensure it runs, calls the API, and produces DeepEval outputs.
- [ ] Test passes locally.
    - **Subtask 4.1:** Script structure to load dataset and iterate. - Complexity: 1
    - **Subtask 4.2:** Programmatic API call to the chat endpoint. - Complexity: 2
    - **Subtask 4.3:** Integrate DeepEval metrics (Faithfulness, AnswerRelevancy, SemanticSimilarity). - Complexity: 3
    - **Subtask 4.4:** Implement custom citation correctness check. - Complexity: 2
### 5. Integrate E2E and Evaluation into CI/CD (Optional for Slice) - Complexity: 2
- [ ] Plan how these E2E tests and the RAG evaluation script will run in a CI/CD pipeline (e.g., GitHub Actions).
- [ ] This might involve spinning up the Encore application and a test database in the CI environment.
- [ ] For this slice, focus on local execution. CI integration is a follow-up.
## Code Example```typescript
// scripts/evaluate-rag.ts (Conceptual - requires DEEPEVAL_API_KEY and running app)
import { DeepEvalClient, LLMTestCase, assertExactMatch } from 'deepeval';
import { FaithfulnessMetric, AnswerRelevancyMetric, ContextualPrecisionMetric, ContextualRecallMetric } from 'deepeval.metrics'; // Actual imports might vary
import fetch from 'node-fetch'; // Or use client from Encore if running script within Encore context
import * as fs from 'fs';
import * as path from 'path';

// Define your Golden Dataset structure
interface GoldenSample {
  id: string;
  question: string;
  ideal_answer: string;
  expected_source_keywords: string[]; // Keywords expected in the cited source titles/content
  // For DeepEval context metrics:
  // retrieval_context?: string[]; // The actual chunks retrieved by RAG for this question
  // ground_truth_retrieval_context?: string[]; // The ideal chunks that *should* have been retrieved
}

const RAG_APP_CHAT_URL = process.env.RAG_APP_CHAT_URL || 'http://localhost:4000/api/chat/message'; // Adjust if your Encore URL is different
const DEEPEVAL_API_KEY = process.env.DEEPEVAL_API_KEY;

if (!DEEPEVAL_API_KEY) {
  console.error("DEEPEVAL_API_KEY is not set. Evaluation cannot proceed.");
  process.exit(1);
}
const deepevalClient = new DeepEvalClient(DEEPEVAL_API_KEY);


async function loadGoldenDataset(filePath: string): Promise<GoldenSample[]> {
  const data = fs.readFileSync(path.resolve(filePath), 'utf-8');
  return JSON.parse(data);
}

async function callRagApi(question: string, conversationId?: string): Promise<any> {
  const response = await fetch(RAG_APP_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer temp-auth-token-for-eval` /* Add auth if needed */ },
    body: JSON.stringify({ userId: "eval-user", message: question, conversationId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`RAG API Error (${response.status}): ${error.message || 'Failed to get response'}`);
  }
  return response.json();
}

async function main() {
  const dataset = await loadGoldenDataset('./tests/evaluation/golden-dataset.json'); // Path to your dataset
  const evaluationResults = [];

  for (const sample of dataset) {
    console.log(`\nEvaluating Question ID: ${sample.id} - "${sample.question}"`);
    try {
      const apiResponse = await callRagApi(sample.question);
      const actualAnswer = apiResponse.answer;
      const retrievedSources = apiResponse.sources || []; // Array of {id, title, snippet, ...}

      // 1. Semantic Similarity with Ideal Answer
      let semanticSimilarityScore = 0;
      try {
        // Note: measureSimilarity is for text-to-text. We need a custom matcher equivalent here.
        // For now, let's conceptualize this. DeepEval's core `evaluate` is preferred.
        // const similarity = await deepeval.measureSimilarity(actualAnswer, sample.ideal_answer);
        // semanticSimilarityScore = similarity;
        // console.log(`Semantic Similarity with Ideal: ${similarity.toFixed(3)}`);
        // Using evaluate for a more structured approach
        const similarityTestCase = new LLMTestCase({
            input: sample.question,
            actualOutput: actualAnswer,
            expectedOutput: sample.ideal_answer // For metrics that need expected output
        });
        // This is where you'd use specific metrics like BertScoreMetric or custom ones via `evaluate`
      } catch (e: any) { console.error("Error in semantic similarity:", e.message); }


      // 2. DeepEval Metrics (Faithfulness, Answer Relevancy)
      // These require the retrieved context to be passed if evaluating faithfulness *to the context*.
      // If evaluating faithfulness to the *golden documents*, that's a different setup.
      // Let's assume we evaluate faithfulness to the retrieved context.
      const retrievedContextForEval = retrievedSources.map((s: any) => s.snippet || s.content).slice(0, 5); // Top 5 snippets

      const testCase = new LLMTestCase({
        input: sample.question,
        actualOutput: actualAnswer,
        expectedOutput: sample.ideal_answer, // For AnswerRelevancy if it uses it
        context: retrievedContextForEval,    // For Faithfulness, Contextual Precision/Recall
        // retrievalContext: retrievedContextForEval, // For Contextual...Metrics
        // groundTruthRetrievalContext: sample.ground_truth_retrieval_context, // If available
      });
      
      const faithfulnessMetric = new FaithfulnessMetric({ threshold: 0.7, model: "gpt-4" }); // Or other LLM
      const answerRelevancyMetric = new AnswerRelevancyMetric({ threshold: 0.7, model: "gpt-4" });
      // const contextPrecisionMetric = new ContextualPrecisionMetric({threshold: 0.7});
      // const contextRecallMetric = new ContextualRecallMetric({threshold: 0.7});

      await deepevalClient.evaluate([testCase], [faithfulnessMetric, answerRelevancyMetric]); //, contextPrecisionMetric, contextRecallMetric]);
      
      const faithfulnessScore = testCase.metrics.find(m => m.name === faithfulnessMetric.name)?.score || 0;
      const answerRelevancyScore = testCase.metrics.find(m => m.name === answerRelevancyMetric.name)?.score || 0;
      // const contextPrecisionScore = testCase.metrics.find(m => m.name === contextPrecisionMetric.name)?.score || 0;
      // const contextRecallScore = testCase.metrics.find(m => m.name === contextRecallMetric.name)?.score || 0;


      console.log(`Faithfulness: ${faithfulnessScore.toFixed(3)} (Pass: ${testCase.metrics.find(m=>m.name === faithfulnessMetric.name)?.success})`);
      console.log(`Answer Relevancy: ${answerRelevancyScore.toFixed(3)} (Pass: ${testCase.metrics.find(m=>m.name === answerRelevancyMetric.name)?.success})`);
      // console.log(`Context Precision: ${contextPrecisionScore.toFixed(3)}`);
      // console.log(`Context Recall: ${contextRecallScore.toFixed(3)}`);

      // 3. Citation Correctness (Custom Check)
      let citedSourcesMatchExpected = false;
      if (sample.expected_source_keywords.length > 0 && retrievedSources.length > 0) {
        const retrievedTitlesAndSnippets = retrievedSources.map((s: any) => `${s.title} ${s.snippet}`).join(' ').toLowerCase();
        citedSourcesMatchExpected = sample.expected_source_keywords.every(keyword => retrievedTitlesAndSnippets.includes(keyword.toLowerCase()));
      } else if (sample.expected_source_keywords.length === 0 && retrievedSources.length === 0) {
        citedSourcesMatchExpected = true; // Correctly cited nothing
      }
      console.log(`Citation Correctness (keywords check): ${citedSourcesMatchExpected}`);

      evaluationResults.push({
        id: sample.id,
        question: sample.question,
        actual_answer: actualAnswer,
        // semantic_similarity: semanticSimilarityScore,
        faithfulness: faithfulnessScore,
        answer_relevancy: answerRelevancyScore,
        // context_precision: contextPrecisionScore,
        // context_recall: contextRecallScore,
        citation_correctness: citedSourcesMatchExpected,
      });

    } catch (error: any) {
      console.error(`Error evaluating sample ID ${sample.id}:`, error.message);
      evaluationResults.push({ id: sample.id, question: sample.question, error: error.message });
    }
  }

  console.log("\n--- Evaluation Summary ---");
  // TODO: Calculate and print average scores, pass rates, etc.
  fs.writeFileSync('./tests/evaluation/evaluation-results.json', JSON.stringify(evaluationResults, null, 2));
  console.log("Detailed results saved to ./tests/evaluation/evaluation-results.json");

  // Example: deepeval.assertPass(testCase) or check overall pass rate
  const overallScore = evaluationResults.reduce((sum, r) => sum + (r.faithfulness || 0) + (r.answer_relevancy || 0), 0) / (evaluationResults.length * 2);
  console.log(`Overall Average Score (Faithfulness + Answer Relevancy): ${overallScore.toFixed(3)}`);

  // To make this script fail CI if below a threshold:
  // if (overallScore < 0.7) {
  //   console.error("Overall RAG quality score below threshold!");
  //   process.exit(1);
  // }
}

main().catch(err => {
  console.error("Unhandled error in evaluation script:", err);
  process.exit(1);
});
```
## Ready to Merge Checklist
- [ ] All tests pass (E2E tests, evaluation script runs and produces output)
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (E2E tests cover key flows, RAG evaluation script provides quality metrics on golden dataset).
## Quick Research (5-10 minutes)
**Official Docs:**
- Playwright or Cypress documentation for setup and writing tests.
- DeepEval documentation for `LLMTestCase`, available metrics (`FaithfulnessMetric`, `AnswerRelevancyMetric`, etc.), and `evaluate` method.
- Storing and loading test data (JSON/CSV) in Node.js.
**Examples:**
- RAG evaluation pipelines using DeepEval or similar tools.
- Structuring E2E tests for web applications.
## Need to Go Deeper?
**Research Prompt:** *"How can I create a robust 'golden dataset' for RAG evaluation that covers diverse question types (e.g., factual, comparative, summarization), varying document relevance, and edge cases (e.g., no answer in docs, ambiguous questions)? What are best practices for maintaining and versioning this dataset?"*
## Questions for Senior Dev
- [ ] For the RAG evaluation script, should it interact with the RAG app via its HTTP API or by importing and calling service/agent functions directly (if the script runs in a compatible Node.js environment)? (API is better for true E2E).
- [ ] How deeply should we mock dependencies for E2E tests run by Playwright/Cypress? Should they hit a live (dev/test) backend, or can parts of the backend be mocked at the network layer? (Live test backend is more realistic for E2E).
- [ ] What are key thresholds for DeepEval metrics (Faithfulness, Answer Relevancy) that we should aim for to consider the RAG pipeline "good enough" for an initial production release? (e.g., >0.7 or >0.8).
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 19: Performance Load Testing & Tuning Stubs
## What You're Building
This slice focuses on preparing for performance load testing. While full load testing execution might be a separate activity, this slice involves identifying key performance indicators (KPIs), choosing load testing tools, and stubbing out test scripts for critical API endpoints.
## Tasks
### 1. Identify Key Performance Indicators (KPIs) & Targets - Complexity: 1 (Planning)
- [ ] Define critical APIs for load testing:
    - `/api/chat/message` (RAG response time)
    - `/api/documents/upload` (upload throughput, initial processing trigger time)
    - `/api/hybrid-search` (search latency)
    - Document processing workflow (end-to-end time from upload to 'processed') - harder to load test directly, monitor via metrics.
- [ ] Define target KPIs:
    - P95/P99 latency for API responses (e.g., chat < 3s, search < 1s).
    - Max requests per second (RPS) services can handle.
    - Document processing throughput (docs/hour).
    - Error rates under load (< 0.1%).
- [ ] This is a planning and documentation task.
### 2. Choose Load Testing Tool & Setup - Complexity: 2
- [ ] Select a load testing tool (e.g., k6, Artillery, JMeter). k6 is often good for JS/TS ecosystems.
- [ ] Install and configure the chosen tool locally.
- [ ] Prepare authentication mechanism for load test scripts if APIs are protected (e.g., generate test API tokens).
- [ ] Write a very simple load test script for one endpoint (e.g., a health check or simple GET if available, or the chat endpoint with a fixed query) to verify tool setup.
- [ ] Write tests: The simple load test script runs and generates a report.
- [ ] Test passes locally.
### 3. Stub Load Test Scripts for Critical Endpoints - Complexity: 3
- [ ] Create stubbed load test scripts for:
    - Chat endpoint (`/api/chat/message`): Simulate varying query lengths, concurrent users.
    - Document upload (`/api/documents/upload`): Simulate concurrent uploads of small/medium files.
    - Search endpoint (`/api/hybrid-search`): Simulate concurrent search queries.
- [ ] These scripts should define:
    - Target virtual users (VUs).
    - Test duration.
    - Stages (ramp-up, sustained load, ramp-down).
    - Checks/thresholds for success (e.g., response time < X ms, status code 200).
- [ ] These stubs might not run extensive load yet but set up the structure.
- [ ] Write tests: The scripts should be executable by the load testing tool.
- [ ] Test passes locally (small scale run).
### 4. Review Existing Metrics for Performance Analysis - Complexity: 1 (Planning)
- [ ] Revisit custom Encore metrics defined in Slice 14 (`documentProcessingTime`, `embeddingGenerationTime`, `llmResponseTime`, etc.).
- [ ] Ensure these metrics will provide necessary insights during load testing to identify bottlenecks (e.g., which part of RAG pipeline is slow, is DB overloaded, is Cohere/Gemini API throttling).
- [ ] This is a review and planning task.
## Code Example
```javascript
// Example k6 load test script stub for chat endpoint (e.g., scripts/load-tests/chat.test.js)
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom Metrics
const chatResponseTime = new Trend('chat_response_time');
const chatErrorRate = new Rate('chat_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 VUs over 30s
    { duration: '1m', target: 10 },  // Stay at 10 VUs for 1m
    { duration: '10s', target: 0 },  // Ramp down
  ],
  thresholds: {
    'http_req_failed': ['rate<0.01'], // http errors should be less than 1%
    'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2000ms
    'chat_response_time': ['p(95)<1800'], // Custom metric for specific endpoint part
  },
  ext: { // For cloud execution or reporting
    loadimpact: {
      projectID: 3000000, // Replace with your k6 Cloud project ID if used
      name: "RAG Chat Endpoint Load Test"
    }
  }
};

// Setup function: runs once per VU when it starts
export function setup() {
  // Prepare data or tokens if needed
  // For example, log in once and get an auth token if APIs are protected.
  // const loginRes = http.post(`${__ENV.BASE_URL}/auth/login`, { username: 'testuser', password: 'password' });
  // const authToken = loginRes.json('token');
  // return { token: authToken };
  return { base_url: __ENV.BASE_URL || 'http://localhost:4000' }; // Ensure Encore app URL is configurable
}

export default function (data) {
  const CHAT_API_URL = `${data.base_url}/api/chat/message`;
  // const AUTH_TOKEN = data.token; // Use if auth is implemented

  const payload = JSON.stringify({
    userId: `user_${__VU}_${__ITER}`, // Unique user ID per VU and iteration
    message: "Tell me about the latest advancements in AI.",
    // conversationId: null, // Optional: simulate ongoing conversations
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  group("RAG Chat Flow", function () {
    const response = http.post(CHAT_API_URL, payload, params);

    const checkRes = check(response, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response body is not empty': (r) => r.body && r.body.length > 0,
      'response has answer': (r) => {
        try {
          return r.json('answer') !== undefined;
        } catch (e) { return false; }
      }
    });

    if (!checkRes) {
      chatErrorRate.add(1); // Record an error
    } else {
      chatErrorRate.add(0); // Record a success
    }

    chatResponseTime.add(response.timings.duration);
  });

  sleep(1); // Think time between requests (1 second)
}
```
## Ready to Merge Checklist
- [ ] All tests pass (stub load test scripts are syntactically correct and runnable on a small scale)
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (KPIs documented, tool chosen, stub scripts created, metrics reviewed).
## Quick Research (5-10 minutes)
**Official Docs:**
- k6 documentation (or chosen tool): [https://k6.io/docs/](https://k6.io/docs/)
- Encore monitoring capabilities (how to view custom metrics, logs, traces during load tests).
**Examples:**
- Load test scripts for chat applications or APIs with authentication.
- Interpreting load test results (P95/P99 latencies, RPS, error rates).
## Need to Go Deeper?
**Research Prompt:** *"What are common bottlenecks in RAG applications under load, and how can they be identified through load testing and Encore's monitoring? Consider database connections, vector search performance, LLM API rate limits/latency, and embedding model throughput."*
## Questions for Senior Dev
- [ ] Which specific load testing tool (k6, Artillery, etc.) is preferred or best suited for our stack and team expertise? (k6 is a good default for its JS scripting).
- [ ] How should we simulate realistic user behavior and data variability in load test scripts (e.g., different query types, document sizes for upload)?
- [ ] What's the strategy for running load tests against production-like environments without impacting real users or incurring excessive costs for external API calls? (Dedicated test/staging environment, API call mocking/sampling for some tests).
</SLICING_TEMPLATE>

This provides a solid foundation for identifying performance issues before a full production launch. The final slice would be about deployment and post-launch activities.