# E2E Testing with Playwright

This directory contains end-to-end tests for the Roborail Assistant frontend application.

## Setup

### Prerequisites
- Node.js and Bun installed
- Playwright browsers installed

### Installation
```bash
# Install Playwright browsers
bun run playwright:install

# Or install specific browsers
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

## Running Tests

### All Tests
```bash
# Run all E2E tests
bun run test:e2e

# Run tests with UI mode (interactive)
bun run test:e2e:ui

# Run tests in headed mode (see browser)
bun run test:e2e:headed

# Run tests in debug mode
bun run test:e2e:debug
```

### Specific Browsers
```bash
# Run tests on Chromium only
bun run test:e2e:chromium

# Run tests on Firefox only
bun run test:e2e:firefox

# Run tests on WebKit only
bun run test:e2e:webkit
```

### Specific Tests
```bash
# Run a specific test file
npx playwright test setup-verification.test.ts

# Run tests matching a pattern
npx playwright test --grep "chat"

# Run a specific test by name
npx playwright test --grep "should load the homepage successfully"
```

## Configuration

The Playwright configuration is defined in `playwright.config.ts` and includes:

- **Multiple Browser Support**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, Edge, Chrome
- **Automatic Server Startup**: Next.js dev server starts automatically before tests
- **Parallel Execution**: Tests run in parallel for faster execution
- **Screenshots and Videos**: Captured on test failures
- **Traces**: Available for debugging failed tests
- **Multiple Reporters**: HTML, JSON, and JUnit reports

## Test Structure

### Page Object Model
Tests use the Page Object Model pattern with page classes in `../pages/`:
- `ChatPage`: Handles chat interface interactions
- `AuthPage`: Handles authentication flows
- `ArtifactPage`: Handles artifact-related interactions

### Fixtures
Custom fixtures are defined in `../fixtures.ts` for:
- User authentication contexts
- Test data setup
- Shared test utilities

### Test Organization
- `setup-verification.test.ts`: Basic setup and configuration verification
- `chat.test.ts`: Chat functionality tests
- `artifacts.test.ts`: Artifact creation and management tests
- `session.test.ts`: Session management tests
- `reasoning.test.ts`: AI reasoning capability tests

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Using Page Objects
```typescript
import { expect, test } from "../fixtures";
import { ChatPage } from "../pages/chat";

test.describe("Chat functionality", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("should send message", async () => {
    await chatPage.sendUserMessage("Hello");
    await chatPage.isGenerationComplete();
    
    const response = await chatPage.getRecentAssistantMessage();
    expect(response.content).toBeTruthy();
  });
});
```

## Best Practices

### Test Isolation
- Each test should be independent
- Use `test.beforeEach` for setup
- Clean up after tests when necessary

### Selectors
- Use data-testid attributes for reliable selectors
- Prefer accessible locators (role, label, text)
- Avoid CSS selectors that might change

### Assertions
- Use Playwright's auto-waiting assertions
- Be specific with expectations
- Test both positive and negative cases

### Performance
- Use `page.waitForLoadState()` appropriately
- Set reasonable timeouts
- Consider using `page.route()` to mock external APIs

## Debugging

### Visual Debugging
```bash
# Run with browser visible
bun run test:e2e:headed

# Run in debug mode with step-by-step execution
bun run test:e2e:debug

# Open test results in browser
npx playwright show-report
```

### Screenshots and Videos
- Screenshots are taken automatically on failure
- Videos are recorded for failed tests
- Traces can be viewed in the Playwright trace viewer

### Common Issues
1. **Server not starting**: Check that the dev server can start on port 3000
2. **Flaky tests**: Add proper waits and use stable selectors
3. **Timeout errors**: Increase timeouts or optimize test setup

## CI/CD Integration

The configuration is optimized for CI environments:
- Reduced parallel workers in CI
- Retry failed tests
- Generate reports in multiple formats
- Fail fast on test.only in source code

## Environment Variables

Set these in `.env.local` for test configuration:
- `PORT`: Server port (default: 3000)
- `CI`: Set to 'true' in CI environments
- `PLAYWRIGHT`: Set to 'true' when running E2E tests