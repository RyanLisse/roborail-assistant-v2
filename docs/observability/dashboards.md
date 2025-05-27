# Monitoring Dashboards & Alerting Strategy

This document outlines the strategy for monitoring the RAG chat application using Encore's observability features and conceptual designs for dashboards that would be built in a production environment.

## 1. Encore's Observability in Development

During local development, Encore provides a **Development Dashboard** (`encore dev-dashboard`) which is invaluable for:

*   **Distributed Tracing**: Viewing traces for API requests across different services. Each trace includes structured logs emitted by `encore.dev/log`, allowing developers to see the sequence of operations, timings, and contextual log messages (including `serviceName`, `severity`, `traceId`, and any custom fields).
*   **Service Map**: Visualizing the architecture of the application, showing how services connect and depend on each other.
*   **API Inspector**: Examining requests and responses for each API endpoint.
*   **Live Log Streaming**: While not part of the dashboard itself, `encore logs --env=<environment>` allows live tailing of logs.

This local dashboard is the primary tool for debugging and understanding application behavior during the development phase.

## 2. Encore in Production Observability

In a deployed production or staging environment, Encore is designed to integrate with standard observability platforms. It achieves this by:

*   **Exporting OpenTelemetry Metrics**: Metrics instrumented in the application (e.g., using Encore's future metrics primitives or custom OpenTelemetry instrumentation) are exported in the OpenTelemetry format. This allows them to be ingested by backends like Prometheus, Datadog, Grafana Mimir, etc.
*   **Forwarding Logs**: Structured logs (from `encore.dev/log`) are collected and can be forwarded to log management systems like Loki, Elasticsearch (ELK Stack), Datadog Logs, etc.
*   **Forwarding Traces**: Distributed traces are also exported in OpenTelemetry format for ingestion by systems like Jaeger, Zipkin, Datadog APM, etc.

The conceptual dashboards and alerts described below assume such a production setup where Encore telemetry data is available in a comprehensive observability platform (e.g., Grafana stack, Datadog).

## 3. Key Metrics for Dashboarding

These metrics should be collected and visualized to provide insights into application performance and health.

### Chat Service:
*   `chat_message_processing_time_seconds`: (Histogram/Percentiles) Overall time to process a user message and generate a response.
*   `rag_query_time_seconds`: (Histogram/Percentiles) Duration of the RAG pipeline execution (search, retrieval, ranking).
*   `llm_response_time_seconds`: (Histogram/Percentiles) Time taken by the LLM to generate a response.
*   `documents_found_count`: (Gauge/Counter) Number of documents retrieved by RAG per query.
*   `citations_generated_count`: (Gauge/Counter) Number of citations included in responses.
*   `api_request_rate_per_minute`: (Counter) Requests per minute to chat API endpoints.
*   `error_rate_percentage`: (Gauge) Percentage of chat API requests resulting in errors.
*   `token_usage_count`: (Counter) Number of tokens used by the LLM per interaction/request.
*   `active_conversations_gauge`: (Gauge) Number of currently active or recent conversations.

### Document Processing Service (or Upload Flow):
*   `document_upload_time_seconds`: (Histogram/Percentiles) Time to fully process an uploaded document (upload, parse, chunk, embed, store).
*   `document_parsing_time_seconds`: (Histogram/Percentiles) Duration of document parsing stage.
*   `document_chunking_time_seconds`: (Histogram/Percentiles) Duration of document chunking stage.
*   `embedding_generation_time_seconds`: (Histogram/Percentiles) Duration of embedding generation.
*   `documents_processed_count`: (Counter) Total number of documents successfully processed.
*   `document_processing_errors_count`: (Counter) Number of errors during document processing.

### General System & Backend Metrics:
*   `cpu_utilization_percentage`: (Gauge) CPU usage per service/instance.
*   `memory_utilization_percentage`: (Gauge) Memory usage per service/instance.
*   `database_query_latency_seconds`: (Histogram/Percentiles) Latency for database operations.
*   `database_connection_pool_active_connections`: (Gauge) Active DB connections.
*   `database_connection_pool_idle_connections`: (Gauge) Idle DB connections.
*   `cache_hit_rate_percentage`: (Gauge) Cache hit ratio for relevant caches (e.g., embedding cache).
*   `cache_miss_rate_percentage`: (Gauge) Cache miss ratio.
*   `pubsub_message_processing_latency_seconds`: (Histogram/Percentiles) Latency for processing Pub/Sub messages.
*   `pubsub_dlq_size_gauge`: (Gauge) Number of messages in the Dead Letter Queue for Pub/Sub topics.

## 4. Key Log Queries for Analysis & Dashboards

Structured logs provide the ability to perform powerful queries.

*   **Errors by Service/Severity**: `service: "chat-service" AND severity: "ERROR"` (or `CRITICAL`)
*   **Specific Warnings**: `service: "chat-service" AND severity: "WARN" AND message: "Failed to clear draft*"`
*   **High Latency Operations**: 
    *   `service: "chat-service" AND llm_response_time_ms > 5000` (if `llm_response_time_ms` is logged as a field)
    *   Or analyze traces where specific spans exceed thresholds.
*   **RAG Performance Issues**: 
    *   `service: "chat-service" AND documentsFound: 0`
    *   Logs containing specific RAG pipeline error messages.
*   **User-Specific Activity/Errors**: `userId: "<USER_ID>" AND severity: "ERROR"`
*   **Authentication/Authorization Issues**: Logs from auth middleware or services indicating failed attempts.
*   **Performance Bottlenecks**: Analyzing logs correlated with traces that show high latency in specific components.

## 5. Conceptual Dashboard Designs

These dashboards would be built using a tool like Grafana, leveraging data from Prometheus (metrics) and Loki/Elasticsearch (logs).

### Dashboard 1: Chat Service - Overview
*   **Purpose**: Monitor overall health, performance, and usage of the main chat service.
*   **Key Visualizations**:
    *   **KPIs (Single Stats)**: Avg Message Processing Time (P95), Total Messages (last hour/day), Error Rate (%), Active Users/Conversations.
    *   **Time Series Graphs**:
        *   Message Processing Time (P50, P90, P99) over time.
        *   RAG Query Time (P50, P90, P99) vs. LLM Response Time (P50, P90, P99) - stacked or separate lines.
        *   API Request Rate (per endpoint) & Error Rate (%) over time.
        *   LLM Token Usage (sum over time).
        *   Documents Found per Query & Citations Generated per Response (avg over time).
    *   **Logs Panel**: Live tail or recent ERROR & CRITICAL logs for `chat-service`, filterable by `traceId`.

### Dashboard 2: RAG Pipeline - Performance Deep Dive
*   **Purpose**: Detailed monitoring of the RAG pipeline's performance and effectiveness.
*   **Key Visualizations**:
    *   **KPIs**: Avg RAG Query Time, Avg Documents Retrieved, Avg Relevance Score (if available), Reranker Effectiveness (if applicable).
    *   **Time Series Graphs**:
        *   Breakdown of RAG pipeline stage latencies (e.g., query expansion, vector search, reranking) - if metrics are fine-grained enough.
        *   Distribution of relevance scores from vector search (histogram over time).
        *   Number of queries resulting in zero documents found.
    *   **Tables**: Top N slowest RAG queries with `traceId` for drill-down.
    *   **Logs Panel**: Filtered logs for RAG processing, especially warnings (e.g., "vector search timeout", "reranker failure") or errors.

### Dashboard 3: Document Ingestion & Processing
*   **Purpose**: Monitor the health and performance of the document upload and processing workflow.
*   **Key Visualizations**:
    *   **KPIs**: Avg Document Processing Time, Documents Processed per Hour/Day, Processing Error Rate (%).
    *   **Time Series Graphs**:
        *   Document Processing Time (P50, P90, P99) - overall and per stage (parsing, chunking, embedding).
        *   Queue lengths for processing stages (if using Pub/Sub).
        *   Rate of documents successfully processed vs. errors.
    *   **Logs Panel**: Errors and warnings from document processing services/workflows, filterable by `documentId`.

### Dashboard 4: System Health & Errors - Global View
*   **Purpose**: High-level overview of the entire system's health and critical errors.
*   **Key Visualizations**:
    *   **Service Health Status**: Per-service status indicators (Up/Down/Degraded) based on error rates or synthetic checks.
    *   **Resource Utilization**: CPU & Memory usage per service (lines or stacked area charts).
    *   **Database Performance**: Query latency (P95), active connections, error rates.
    *   **Cache Performance**: Hit/Miss rates.
    *   **Global Error Rate**: Aggregated error rate across all services.
    *   **Tables**: Top N most frequent errors (by message/type) across all services.
    *   **Logs Panel**: Centralized, filterable view of all CRITICAL and ERROR logs from all services.

## 6. Alerting Strategy

Alerts should be configured in the production monitoring system (e.g., Grafana Alerting, Prometheus Alertmanager, Datadog Monitors).

### High Priority Alerts (Require Immediate Attention)
*   **Chat Service Down/High Error Rate**: API error rate > 5% over a 5-minute window.
*   **Critical Chat Functionality Failure**: P99 message processing time > 15 seconds for 5+ minutes.
*   **LLM Provider Issues**: Significant increase in LLM API errors or P99 latency > 10 seconds.
*   **Database Unreachable/High Error Rate**: Critical database errors or unavailability.
*   **Document Processing Stalled**: No documents processed for > 1 hour despite new uploads (if applicable).
*   **Security Alerts**: Detection of potential security threats (e.g., SQL injection attempts, auth failures if auth was present).

### Medium Priority Alerts (Require Investigation)
*   **Elevated Chat Latency**: P95 message processing time > 8 seconds for 10+ minutes.
*   **Increased RAG Zero Results**: >20% of RAG queries returning zero documents over a 15-minute window.
*   **High Resource Utilization**: CPU or Memory utilization > 80% for 15+ minutes on any critical service.
*   **Elevated Warning Log Volume**: Significant spike in warning logs for any service.
*   **Cache Performance Degradation**: Cache hit rate < 70% for an extended period.
*   **Pub/Sub DLQ Growth**: Messages accumulating in Dead Letter Queues.

### Low Priority Alerts (For Review / Optimization)
*   **Gradual Performance Degradation**: Slight upward trend in P50/P90 latencies over days.
*   **Increase in specific non-critical errors**.
*   **Suboptimal RAG performance metrics** (e.g., consistently low document relevance scores).

This document provides a foundation for building out comprehensive monitoring and dashboarding. Actual implementation will depend on the chosen production observability stack and evolving application needs. 