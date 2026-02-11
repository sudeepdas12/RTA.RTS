import { test, expect } from '@playwright/test';

test('Used BOID lookup works', async ({ page }) => {
  // Log in
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Navigate to Clients
  await page.goto('/clients');
  await page.waitForSelector('text=Clients Management');

  // Open BOID lookup
  await page.click('button:has-text("Used BOID")');
  await page.fill('input[placeholder="Enter BOID to lookup"]', 'BOID-DP0001');
  await page.click('button:has-text("Search")');

  // Expect result
  await expect(page.locator('text=Client Code:')).toContainText('DP0001');
});