# Monitoring and Alerting Strategy

This document outlines the monitoring and alerting strategy for the `roborail-assistant` project to ensure production readiness, maintain Service Level Agreements (SLAs), and enable rapid response to incidents.

## Leveraging Encore Observability

The project heavily relies on Encore's built-in observability features, which provide a strong foundation for monitoring:

*   **Structured Logging:** Comprehensive structured logs (as detailed in `docs/observability/logging.md`) are generated by all services. These logs are essential for debugging and can be integrated with log analysis tools to derive metrics and trigger alerts.
*   **Distributed Tracing:** Encore automatically traces requests across microservices, allowing for easy identification of latency bottlenecks and error propagation paths.
*   **Metrics & Dashboards (Encore Cloud):** When deployed via Encore Cloud, key system-level and some application-level metrics are automatically collected and available on built-in dashboards. This includes service health, API latencies, error rates, and resource utilization.
*   **Service Catalog & Architecture View:** Encore provides an up-to-date view of the system architecture and service dependencies, aiding in understanding impact during incidents.

## Key Metrics to Monitor

Metrics are categorized into system-level (often provided by Encore/Cloud Provider) and application-specific (may require custom derivation from logs/traces or explicit metric emission).

### 1. System-Level Metrics

*   **Service Instances:**
    *   CPU Utilization
    *   Memory Utilization
    *   Instance count (for auto-scaled services)
    *   Restart/Crash rates
*   **API Gateway / Load Balancers (if applicable outside Encore's direct service exposure):**
    *   Request Count
    *   Latency (p50, p90, p95, p99)
    *   Error Rates (4xx, 5xx)
*   **Database (e.g., PostgreSQL managed by Encore Cloud):**
    *   CPU Utilization
    *   Memory Utilization
    *   Storage Utilization & IOPS
    *   Active Connections
    *   Query Latency (for slow query logs)
    *   Replication Lag (if read replicas are used)
*   **Cache (e.g., Redis managed by Encore Cloud):**
    *   Hit/Miss Rate
    *   Memory Utilization
    *   Latency
    *   Evictions

### 2. Application-Specific Metrics

*   **Chat Service (`/chat/message` API & related operations):**
    *   **Chat Response Time:** End-to-end latency (p90, p95, p99). *SLA Target: < 3 seconds.*
    *   **RAG Processing Time:** Duration of the RAG-specific parts of a chat request (search, LLM call).
    *   **Error Rate:** Percentage of failed chat message processing requests.
    *   **Token Usage:** LLM input/output tokens per request (for cost monitoring and context window management).
*   **Document Processing Service (`/process` API & background processing):**
    *   **Processing Throughput:** Documents processed per unit of time (e.g., docs/hour).
    *   **Average Processing Time:** Average time from upload completion to "processed" status. *SLA Target: < 5 minutes.*
    *   **P95 Processing Time:** 95th percentile for document processing time.
    *   **Processing Failure Rate:** Percentage of documents that fail processing.
    *   **Queue Length/Delay (if asynchronous processing involves explicit queues visible to app):** Monitor backlog.
*   **Upload Service (`/upload/file` API):**
    *   **Upload Success Rate:** Percentage of successful file uploads.
    *   **Upload Failure Rate:** Percentage of failed file uploads (due to validation, storage errors, etc.).
    *   **Average Upload Time:** Duration for the upload API call itself.
*   **General API Health (for all critical endpoints):**
    *   Request Count / Throughput
    *   Latency (p50, p90, p95, p99)
    *   Error Rate (categorized by 4xx and 5xx if possible)

## Alerting Strategy

Alerts should be actionable and notify the appropriate personnel. Configuration will typically occur within Encore Cloud's monitoring interface or an integrated third-party monitoring/alerting solution.

*   **Critical Errors / Service Unavailability:**
    *   High rate of 5xx errors on any critical API endpoint.
    *   Service instances repeatedly crashing or unhealthy.
    *   Database or Cache unavailability.
*   **SLA Breaches:**
    *   Chat response time (p95) consistently exceeding 3 seconds.
    *   Document processing time (average or p95) consistently exceeding 5 minutes.
*   **Resource Saturation:**
    *   Sustained high CPU or Memory utilization on critical service instances (e.g., >80-90% for extended periods).
    *   Sustained high CPU, Memory, or Storage on the database.
    *   Low available cache memory leading to high eviction rates.
*   **Application-Specific Failures:**
    *   Significant increase in document processing failure rate.
    *   Significant increase in chat message processing error rate.
    *   Failure in critical background jobs (e.g., cron jobs if any).
*   **Queueing Issues (if applicable):**
    *   Persistently high message queue lengths for asynchronous tasks.
    *   High message processing delays.

## Dashboarding Approach

1.  **Encore Cloud Dashboards:** Leverage the built-in dashboards provided by Encore Cloud for an overview of service health, API performance, and resource utilization.
2.  **Custom Dashboards (Conceptual):** For more detailed application-specific metrics or combined views, data from Encore (logs and metrics via cloud provider integrations) can be exported or queried by dedicated dashboarding tools like:
    *   Grafana
    *   Datadog
    *   Google Cloud Operations (formerly Stackdriver)
    *   AWS CloudWatch Dashboards
    The setup of these external custom dashboards is a separate operational activity but should be planned for comprehensive visibility.

## Incident Response (Operational Consideration)

While the configuration of monitoring and alerting is technical, it's crucial to have defined on-call procedures and incident response plans. This includes:
*   Who gets notified for which alerts.
*   Communication channels during an incident.
*   Playbooks or runbooks for common issues.
*   Post-incident review processes.

These are operational aspects that build upon the technical monitoring and alerting setup.

## Review and Iteration

The key metrics, alert thresholds, and dashboard configurations should be reviewed and refined regularly based on operational experience, application changes, and evolving business requirements. 