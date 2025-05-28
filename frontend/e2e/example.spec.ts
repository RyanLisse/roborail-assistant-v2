import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  
  // Check if the page loads without errors
  await expect(page).toHaveTitle(/RoboRail Assistant/);
  
  // Verify some basic content is present
  await expect(page.locator('body')).toBeVisible();
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Test navigation to documents page
  const documentsLink = page.getByRole('link', { name: /documents/i });
  if (await documentsLink.isVisible()) {
    await documentsLink.click();
    await expect(page.url()).toContain('/documents');
  }
});