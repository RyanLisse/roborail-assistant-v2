# Performance Testing Strategy & SLA Compliance

This document outlines the strategy for performance testing the `roborail-assistant` application to ensure it meets defined Service Level Agreements (SLAs) and can handle expected user load.

## Service Level Agreements (SLAs)

Based on Task 14 (Optimize Performance and Scalability), the target SLAs are:

*   **Chat Response Time:** < 3 seconds (p95/p99)
*   **Document Processing Time:** < 5 minutes (average/p95)
*   **Concurrency:** Support 100+ concurrent users

## Performance Test Scenarios & Metrics

### 1. Chat Response Time

*   **Objective:** Ensure chat interactions are responsive under load.
*   **Scenario:**
    *   Simulate a varying number of concurrent users (e.g., 10, 50, 100, 150+).
    *   Each simulated user sends a sequence of chat messages to the `/chat/message` API endpoint.
    *   Vary message complexity (short vs. long queries).
    *   Vary RAG involvement (some queries requiring document retrieval, others more conversational).
    *   Test with and without chat history being included in context.
*   **Key Metrics:**
    *   End-to-end response time for the `/chat/message` API (p90, p95, p99).
    *   Request throughput (requests per second).
    *   API error rate.
*   **Target:** p95 and p99 response times < 3 seconds.

### 2. Document Processing Time

*   **Objective:** Ensure timely processing of uploaded documents.
*   **Scenario:**
    *   Simulate multiple concurrent document uploads via the `/upload/file` API.
    *   Use documents of various sizes (e.g., small text files, medium PDFs, larger DOCX files up to the 50MB limit).
    *   Use documents of different types (PDF, DOCX, TXT).
*   **Key Metrics:**
    *   Time from the `uploadFile` API call successfully returning (status: 'uploaded') to the document's status becoming 'processed' in the database.
        *   This can be measured by polling the `/upload/status/:documentId` endpoint or by querying the `documents` table for `processedAt` vs. `uploadedAt` timestamps.
    *   Average processing time per document type/size.
    *   p95 processing time.
    *   Rate of processing failures.
*   **Target:** Average and p95 processing times < 5 minutes.

### 3. System Under Load (Concurrent Users)

*   **Objective:** Verify the system remains stable and responsive with 100+ concurrent users performing a mix of actions.
*   **Scenario:**
    *   Simulate 100+ concurrent users.
    *   Each user performs a realistic mix of operations:
        *   Sending chat messages (some RAG, some not).
        *   Listing conversations (`/chat/conversations`).
        *   Viewing specific conversations (`/chat/conversations/:id`).
        *   Uploading small documents (`/upload/file`).
        *   Listing documents (`/documents`).
        *   Viewing specific document metadata (`/documents/:id`).
    *   Run for a sustained period (e.g., 30-60 minutes).
*   **Key Metrics:**
    *   Response times for all key API endpoints (average, p95, p99).
    *   API error rates across all services.
    *   Throughput for each service.
    *   System resource utilization (CPU, memory, network) for services and database – This will primarily be observed via Encore's dashboard and cloud provider monitoring, as direct measurement is abstracted.
*   **Target:** System remains stable, error rates are low (<1%), and key API response times remain within acceptable thresholds (e.g., most reads <1s, chat <3s).

## Tooling for Performance Testing

*   **Load Generation:** Tools like **k6** (JavaScript-based) or **Artillery** (Node.js-based) are recommended for scripting and executing these API load test scenarios.
    *   These tools allow for defining user behavior, ramp-up/down strategies, and assertion on response times/status codes.
*   **Initial Focus:** The initial focus for this task (14.4) is the definition of this strategy and the test scenarios. Full script implementation and execution would be a subsequent effort.

## Identifying Bottlenecks & Tuning

1.  **Execution & Monitoring:** Run the defined test scenarios against a staging or performance testing environment.
2.  **Encore Observability:** Heavily utilize Encore's built-in observability features:
    *   **Distributed Tracing:** To follow requests across services and identify slow spans.
    *   **Logging:** Structured logs (as implemented in Task 13.1) will provide context for errors and slow operations.
    *   **Metrics:** Encore's Development Dashboard and cloud provider integrations offer metrics on service performance, resource usage, and database performance.
3.  **Analysis:**
    *   Analyze p95/p99 response times for SLA compliance.
    *   Investigate high error rates.
    *   Identify services or database queries that are causing bottlenecks.
4.  **Tuning (Iterative Process):**
    *   **Query Optimization:** Further refine database queries or add/modify indexes based on findings (relates to Task 14.2).
    *   **Caching Adjustments:** Tune cache TTLs, add caching for newly identified hot spots, or refine cache key strategies (relates to Task 14.1).
    *   **Service Logic:** Optimize algorithms or data handling within services if they are identified as bottlenecks.
    *   **Resource Allocation:** If using Encore Cloud, scaling of resources is largely automatic. If self-hosting, this might involve adjusting resource requests/limits for service containers or database instance sizes.

## Reporting

*   Summarize test results, including key metrics against SLAs.
*   Document identified bottlenecks and applied tuning measures.
*   Track performance improvements over iterations.

This strategy provides a framework for systematically evaluating and improving the performance and scalability of the `roborail-assistant` application. 