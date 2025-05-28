import { test, expect } from '@playwright/test';

test.describe('Playwright Setup Verification', () => {
  test('should load the homepage successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Check that the page loads and responds
    await expect(page.locator('body')).toBeVisible();
    
    // Verify the page title contains expected text
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should handle basic navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check that we can navigate and the page responds
    expect(page.url()).toContain('localhost:3000');
    
    // Verify page is interactive
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work across different viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test 404 page
    const response = await page.goto('/non-existent-page');
    
    // Should still render something (Next.js 404 page)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support basic interactions', async ({ page }) => {
    await page.goto('/');
    
    // Test that JavaScript is working by checking for dynamic content
    await page.waitForLoadState('domcontentloaded');
    
    // Basic interaction test - click somewhere safe
    await page.click('body');
    
    // Verify page is still responsive
    await expect(page.locator('body')).toBeVisible();
  });
});