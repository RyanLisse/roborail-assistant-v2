# Test-Driven Development (TDD) Workflow

Test-Driven Development is a software development process that relies on the repetition of a very short development cycle: requirements are turned into very specific test cases, then the software is improved to pass the new tests, only then the new code is accepted.

This document outlines the TDD workflow to be followed in the `roborail-assistant` project.

## Workflow Steps

1.  **Understand the Requirement:** Fully understand the feature or bug you need to work on. Refer to the Taskmaster task details (`task-master show <id>`) and any related documentation (e.g., PRDs in `scripts/`).

2.  **Write a Failing Test:** Write a unit or integration test that specifically targets the requirement. This test should initially fail because the functionality has not yet been implemented. Ensure your test is specific, isolated, and covers a single piece of functionality.

3.  **Run the Test:** Execute the newly written test using the appropriate Vitest command:
    *   Unit tests: `bun test:unit`
    *   Integration tests: `bun test:integration`

    Confirm that the test fails as expected. If it passes, either the test is incorrect, or the functionality already exists.

4.  **Write the Minimum Code:** Write *only* the code necessary to make the failing test pass. Do not implement additional functionality not covered by the current failing test.

5.  **Run the Tests Again:** Re-run the specific test you just wrote, and potentially all tests (`bun test`), to ensure your new code passes the new test and hasn't broken any existing functionality.

6.  **Refactor the Code:** Once all tests pass, refactor your code. This involves improving the design, readability, and maintainability of the code without changing its behavior (i.e., ensuring tests still pass after refactoring). Look for opportunities to: (refer to [shared/README.md](mdc:shared/README.md) for shared components/patterns)
    *   Eliminate duplication (DRY principle)
    *   Improve clarity and simplicity
    *   Ensure modularity and separation of concerns (refer to [memory-bank/systemPatterns.md](mdc:memory-bank/systemPatterns.md))
    *   Adhere to code quality standards (refer to project linters/formatters like Biome)

7.  **Repeat:** Go back to step 2 and write the next failing test for the next piece of functionality or aspect of the requirement. Continue this cycle until the entire requirement is implemented and covered by tests.

## Test Coverage

Maintaining high test coverage is important for ensuring code quality and confidence in refactoring. We use Vitest for coverage reporting.

To generate a test coverage report, run:

```bash
bun test:coverage
```

*(Note: This script assumes you have manually added the `test:coverage` script to your `package.json`)*

Coverage thresholds can be configured in the Vitest configuration files (`vitest.config.unit.ts`, `vitest.config.integration.ts`). It is recommended to set and enforce minimum coverage percentages, especially in CI/CD pipelines, although CI/CD setup is outside the scope of this document.

## Integration with Taskmaster

Each TDD cycle should ideally correspond to the implementation steps outlined in a Taskmaster subtask (`task-master show <id.subtask>`). Use `task-master update-subtask <id.subtask> --prompt="<notes>"` to log your progress, discoveries, and any deviations from the plan within the subtask details.

Once all tests for a subtask's requirements pass and the code is refactored, mark the subtask as done using `task-master set-status --id=<id.subtask> --status=done`. 