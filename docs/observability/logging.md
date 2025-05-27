# Structured Logging and Context Preservation Strategy

This document outlines the strategy for structured logging within the `roborail-assistant` project, emphasizing context preservation for audit trails, debugging, and monitoring.

## Logging Library

We utilize Encore's built-in structured logging library (`encore.dev/log`). This library provides:
- Automatic timestamping.
- Structured JSON output by default in production environments.
- Service-aware logging through `log.with({ service: "service-name" })`.

## Key Principles for Context Preservation

To ensure logs are effective for auditing, traceability, and debugging, the following principles are applied:

1.  **Unique Identifiers:**
    *   **`userId`**: Include the identifier of the user performing the action wherever applicable and available. *Dependency: Full implementation of user authentication across all services is required for consistent `userId` logging.*
    *   **`documentId`**: For operations related to specific documents (upload, processing, retrieval, deletion), always log the `documentId`.
    *   **`conversationId`**: For chat-related operations, log the `conversationId`.
    *   **`messageId`**: For individual chat messages, log the `messageId`.
    *   Other relevant entity IDs (e.g., `chunkId`, `organizationId`) should be included when appropriate to the operation being logged.

2.  **Request Scope and Parameters:**
    *   Log key request parameters that define the scope or target of an operation. Examples:
        *   `fileName`, `fileSize`, `contentType` for file uploads.
        *   Search terms, filters, pagination parameters (`page`, `limit`) for listing operations.
        *   Snippets of user messages in chat interactions (ensuring sensitive data is handled appropriately).

3.  **Operation Outcome and Key Details:**
    *   Log the outcome of an operation (e.g., success, failure).
    *   Include key details about the outcome. Examples:
        *   `status` (e.g., "uploaded", "processed", "failed").
        *   `chunksCreated`, `tokensUsed`, `documentsFound`.
        *   `bucketPath` for file storage operations.
        *   `updatedFields` for update operations.
        *   Execution time for critical operations (`totalTimeMs`).

4.  **Error Logging:**
    *   Log errors with as much detail as possible, including the error message, stack trace (if available), and the context (identifiers, request parameters) at the time of the error.
    *   Use distinct error messages to differentiate between failure points.

5.  **Service-Specific Context:**
    *   Each service logger is initialized with `log.with({ service: "service-name" })` to automatically include the service name in all log entries, aiding in filtering and analysis.

## Log Levels

Standard log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`) are used:

*   **`ERROR`**: For unrecoverable errors or critical failures that prevent an operation from completing.
*   **`WARN`**: For unexpected situations or potential issues that do not necessarily stop an operation but might indicate a problem (e.g., failure to clear a draft, missing optional data).
*   **`INFO`**: For logging the start, successful completion, and key milestones of critical operations. This is the primary level for audit trail events.
*   **`DEBUG`**: For more verbose logging useful during development and troubleshooting, not typically enabled in production unless actively debugging an issue.

## Review and Evolution

The logging strategy and the specific contextual details captured will be reviewed and refined as the application evolves and new auditing or monitoring requirements emerge. 