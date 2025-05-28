# Testing Strategy

This document outlines the testing strategy for the `roborail-assistant` project, covering unit, integration, and RAG evaluation tests.

## Testing Frameworks

*   **Backend Unit & Integration Tests:** [Vitest](https://vitest.dev/) is used for testing Encore TypeScript services.
*   **RAG Evaluation:** [DeepEval](https://docs.confident-ai.com/docs) is used for assessing the quality of RAG pipeline outputs (e.g., semantic similarity, faithfulness, answer relevancy).
*   **Frontend Unit & Component Tests:** Vitest with React Testing Library (or similar) for Next.js components.
*   **End-to-End (E2E) Tests:** A framework like Playwright or Cypress for testing full user flows (setup planned in Slice 18).

## Test Categories & Execution

### 1. Backend Unit Tests

*   **Purpose:** Test individual functions, classes, or modules in isolation.
*   **Location:** Typically `*.test.ts` files co-located with the service code (e.g., `src/features/chat/__tests__/chat.service.test.ts`).
*   **Execution:** `bun test:unit` (as defined in `package.json`, pointing to `vitest.config.unit.ts`).
*   **Mocks:** External dependencies (other services, DB, external APIs) should be mocked.

### 2. Backend Integration Tests

*   **Purpose:** Test interactions between services or a service with its database or other Encore primitives.
*   **Location:** Can be in `*.integration.test.ts` files or a dedicated `tests/integration` directory.
*   **Execution using Encore Environment (Recommended for DB/Service interactions):
    ```bash
    encore run --test -- bun test:integration
    ```
    This command runs Vitest within an Encore-managed test environment, allowing tests to interact with real (test-scoped) databases, Pub/Sub, etc., provisioned by Encore.
*   **Execution (Simpler, for isolated integration tests not needing full Encore services):
    ```bash
    bun test:integration
    ```
*   **Mocks:** Mock external APIs (Cohere, Gemini) not managed by Encore.

### 3. RAG Evaluation Tests (using DeepEval)

*   **Purpose:** Evaluate the quality of the RAG pipeline outputs against a golden dataset.
*   **Location:** Scripts like `scripts/evaluate-rag.ts` or tests within `tests/rag-evaluation/`.
*   **Execution:** These are typically run as separate scripts or specialized Vitest tests.
    *   If the script/test calls deployed Encore API endpoints: The Encore application must be running locally or in a test environment.
    *   If the script/test imports and calls service functions directly and requires Encore context (e.g., for secrets): Use `encore run --test -- node ./scripts/evaluate-rag.ts` (or similar for Vitest).
*   **`DEEPEVAL_API_KEY` Setup:**
    *   **For tests run with `encore run --test`:**
        1.  Define the secret name in code: `const deepevalEncoreSecret = secret("DEEPEVAL_API_KEY");` (as done in `src/shared/testing/setup.ts`).
        2.  Set the secret value in your local Encore environment: `encore secret set DEEPEVAL_API_KEY` (you'll be prompted for the value).
        The test setup (`src/shared/testing/setup.ts`) will attempt to load it via Encore's secret mechanism.
    *   **For direct Vitest runs or scripts not using `encore run --test`:**
        Set it as an environment variable before running the test/script:
        ```bash
        DEEPEVAL_API_KEY="your_actual_key_here" bun test:unit # (if unit tests use DeepEval)
        # or add to your .env file if your test setup loads it (ensure .env is gitignored)
        ```
        The `src/shared/testing/setup.ts` script has a fallback to `process.env.DEEPEVAL_API_KEY`.

### 4. Frontend Tests

*   **Purpose:** Test Next.js components and UI logic.
*   **Execution:** `cd frontend && bun test` (or as defined in `frontend/package.json`).

### 5. End-to-End (E2E) Tests

*   **Purpose:** Test full user flows through the UI and backend.
*   **Execution:** Using the chosen E2E framework (e.g., Playwright `npx playwright test`). Requires both frontend and backend applications to be running.

## Test Configuration Files

*   `vitest.config.unit.ts`: For backend unit tests.
*   `vitest.config.integration.ts`: For backend integration tests.
*   `frontend/vitest.config.ts` (or `jest.config.js`): For frontend tests.
*   `src/shared/testing/setup.ts`: Shared setup for Vitest, including DeepEval custom matcher initialization.

## Code Coverage

*   Run `bun test:coverage` to generate coverage reports for backend tests.
*   Aim for >80% test coverage as per project requirements.

## General Best Practices

*   **Test Independence:** Tests should be independent and not rely on the state of previous tests.
*   **Mocking:** Use Vitest's mocking capabilities (`vi.mock`, `vi.spyOn`) for isolating units and controlling dependencies.
*   **Clarity:** Write clear and descriptive test names and assertions.
*   **CI/CD:** All relevant tests (unit, integration, RAG eval) should be part of the CI/CD pipeline to ensure code quality before deployment. 