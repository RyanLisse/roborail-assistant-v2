Okay, Architect! This is the final slice focusing on deployment, final checks, and outlining post-launch activities.

---
<SLICING_TEMPLATE>
# Slice 20: Deployment, Final Checks & Post-Launch Plan
## What You're Building
This slice covers the final steps before "going live": preparing deployment configurations for Encore, performing pre-deployment checks, outlining the deployment process, and planning for post-launch monitoring and iteration.
## Tasks
### 1. Prepare Production Deployment Configuration for Encore - Complexity: 2 (Configuration)
- [ ] Ensure all secrets (API keys, DB URLs, Redis URL, etc. from Slice 14) are securely configured in Encore Cloud for the `production` environment.
- [ ] Finalize resource allocations (`cpu`, `memory`) and scaling parameters (`minInstances`, `maxInstances`, `targetCPU`) in `encore.app` for all services, based on insights from (stubbed) load testing and estimates.
- [ ] Verify production database configurations (e.g., NeonDB plan, connection limits, PGVector HNSW index parameters like `ef_search`).
- [ ] Configure domain names and TLS/SSL certificates for public-facing APIs via Encore.
- [ ] Set up appropriate log levels for production in Encore (e.g., `INFO` or `WARN` as default, with `DEBUG` available if needed for troubleshooting).
- [ ] This is primarily a configuration and review task using Encore Cloud UI and `encore.app`.
### 2. Pre-Deployment Checklist & Review - Complexity: 2 (Process)
- [ ] **Code Freeze**: Announce a code freeze period before deployment.
- [ ] **Final Code Review**: Senior developers conduct a final review of critical code paths.
- [ ] **Run All Tests**: Ensure all unit, integration (including DeepEval RAG evaluation scripts from Slice 18), and E2E tests (from Slice 18) pass in a staging/preview environment that mirrors production.
- [ ] **Security Review**:
    - Check for common web vulnerabilities (OWASP Top 10) in API endpoints.
    - Ensure no secrets are leaked in logs or client-side code.
    - Verify authentication and authorization on all protected endpoints.
    - Review third-party dependencies for known vulnerabilities (`npm audit` or similar).
- [ ] **Data Migration Review**: Ensure all database migrations (Drizzle) have been tested and are ready for production.
- [ ] **Rollback Plan**: Document a basic rollback plan (e.g., redeploying a previous stable version via Encore).
- [ ] Create a deployment checklist based on these items.
### 3. Execute Production Deployment via Encore - Complexity: 1 (Process)
- [ ] Follow Encore's deployment process to deploy the application to the production environment (e.g., `encore deploy --env production` or via GitOps integration if set up).
- [ ] Monitor deployment progress via Encore dashboard.
- [ ] Perform initial smoke tests on the production environment:
    - Basic chat functionality.
    - Document upload and (eventual) processing.
    - Key API endpoints are responsive.
### 4. Post-Launch Monitoring & Iteration Plan - Complexity: 2 (Planning)
- [ ] **Monitoring**:
    - Actively monitor Encore dashboard for application logs, traces, and custom metrics (Slice 14) immediately after deployment.
    - Set up alerts for critical errors, high latency, or resource exhaustion (if Encore supports direct alerting or via integrated monitoring tools).
    - Monitor costs associated with NeonDB, Cohere, Gemini, Unstructured, Redis.
- [ ] **Feedback Loop**:
    - Establish a mechanism for collecting user feedback (if applicable for internal users or a beta launch).
    - Plan for regular review of RAG performance using the DeepEval evaluation pipeline (Slice 18) against production data or an evolving golden dataset.
- [ ] **Iteration Plan**:
    - Prioritize bug fixes based on production issues.
    - Plan for iterative improvements based on:
        - Performance bottlenecks identified.
        - RAG quality evaluations.
        - User feedback.
        - Implementing deferred features (e.g., advanced document updates, full LLM-based query contextualization, summarization in pruning).
- [ ] Schedule regular maintenance and dependency updates.
## Code Example
```
// No specific new code for this slice, as it's primarily configuration, process, and planning.
// Key files to review/finalize:
// - encore.app (service configurations, CORS, etc.)
// - src/shared/config/environment.ts (ensure all secrets are used via `secret()`)
// - All Drizzle migration files (ensure they are sequential and correct)
// - CI/CD scripts (ensure they point to correct environments and run all tests before deployment)

// Example: Part of a Pre-Deployment Checklist (Markdown)

# Pre-Deployment Checklist: RAG Chat Application v1.0

## General
- [ ] Code freeze initiated.
- [ ] All feature branches merged to main/release branch.
- [ ] Release version tagged (e.g., v1.0.0).

## Testing & Quality
- [ ] All unit tests (Vitest) PASSING (100%).
- [ ] All integration tests (Vitest, including service interactions) PASSING.
- [ ] RAG Evaluation Script (DeepEval on golden dataset) PASSING with scores above threshold (e.g., Faithfulness > 0.8, Answer Relevancy > 0.8).
- [ ] E2E Tests (Playwright/Cypress) PASSING for all critical user flows.
- [ ] Manual smoke tests performed on staging/preview environment.

## Configuration & Secrets (Production Environment)
- [ ] `encore.app` reviewed for production resource allocation & scaling.
- [ ] All production secrets (NEON_DB, COHERE_KEY, GEMINI_KEY, etc.) correctly set in Encore Cloud.
- [ ] Production database (NeonDB) plan/tier confirmed.
- [ ] Production Redis instance configured and accessible.
- [ ] Domain names & SSL certificates configured in Encore.
- [ ] Production log levels set (e.g., INFO).

## Security
- [ ] `npm audit` run, critical vulnerabilities addressed.
- [ ] No hardcoded secrets in codebase.
- [ ] Authentication & Authorization verified on all protected API endpoints.
- [ ] Input validation reviewed for key endpoints (upload, chat, search).

## Database
- [ ] All Drizzle migrations successfully run on a staging DB identical to production.
- [ ] Backup strategy for NeonDB confirmed.

## Documentation & Planning
- [ ] Rollback plan documented and understood by deployer.
- [ ] Key personnel available during deployment window.
- [ ] Post-launch monitoring plan in place (who watches what).

## Sign-off
- [ ] Lead Developer: _________________________
- [ ] QA Lead (if applicable): _______________
- [ ] Product Owner (if applicable): _________

Date: _______________
```
## Ready to Merge Checklist
- [ ] All tests pass (as this slice is about process, this means previous slices' tests are green)
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev (especially deployment configurations and plans)
- [ ] Feature works as expected (all pre-deployment checks are positive, team is ready for deployment).
## Quick Research (5-10 minutes)
**Official Docs:**
- Encore deployment process: [https://encore.dev/docs/workflows/deploy](https://encore.dev/docs/workflows/deploy)
- Encore environments and promotion: [https://encore.dev/docs/concepts/environments](https://encore.dev/docs/concepts/environments)
- Best practices for production checklists.
- Monitoring cloud costs for services like NeonDB, Cohere, Gemini.
**Examples:**
- Sample rollback plans for web applications.
- Post-launch monitoring dashboards for similar applications.
## Need to Go Deeper?
**Research Prompt:** *"What are effective strategies for canary deployments or blue/green deployments with Encore? How can we minimize risk and downtime when deploying new versions of the RAG application, especially if there are database schema changes or significant backend logic updates?"*
## Questions for Senior Dev
- [ ] What is our defined process for promoting builds through Encore environments (e.g., dev -> preview -> production)?
- [ ] Who are the key personnel responsible for monitoring specific aspects of the application post-launch (e.g., DB performance, LLM API costs, RAG quality metrics)?
- [ ] What are the specific thresholds for alerts on our custom metrics that should trigger an immediate investigation?

---

This concludes the planned slices based on the PRD and additional considerations! You now have a comprehensive plan from architecture through to deployment for your RAG chat application.