import { test, expect } from '@playwright/test';

test('Fiscal Year Settings - Company dropdown populated and styled', async ({ page }) => {
  // Use baseURL defined in playwright.config (will be overridden by env if needed)
  const base = process.env.BASE_URL || 'http://host.docker.internal:3000';
  await page.goto(`${base}/login`);

  // Login
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Wait to land on dashboard (or any authenticated route)
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Navigate to Fiscal Year Settings
  await page.goto('/settings/fiscal-years');

  // Open Add Fiscal Year modal
  await page.click('text=Add Fiscal Year');

  // Ensure the select exists and has our themed class
  const select = await page.waitForSelector('select.fiscal-year-select', { timeout: 5000 });
  expect(select).not.toBeNull();

  // Ensure options are present (more than the default placeholder)
  const options = await select.$$('option');
  expect(options.length).toBeGreaterThan(1);

  // Ensure the first real option is visible and has company text
  const firstReal = options[1];
  const txt = (await firstReal.innerText()).trim();
  expect(txt.length).toBeGreaterThan(0);
});
