import { test, expect } from '@playwright/test';

test('navbar layout and styles — brand left, controls right, CSS vars present, dropdown overlays', async ({ page, request }) => {
  // Set a fake JWT token (with far future exp) and a test user so the app renders the navbar
  const fakeToken = 'eyJhbGciOiJub25lIn0.eyJleHAiOjMyNTAzNjgwMDAwfQ.'; // alg:none, exp year ~3000
  const mockUser = {
    username: 'playwright',
    full_name: 'Playwright Test',
    role: 'Admin',
    permissions: {
      users: ['approve','read'],
      interest_payables: ['read'],
      dividend_payables: ['read'],
      companies: ['read'],
      clients: ['read'],
      reports: ['read'],
      reconciliation: ['read']
    }
  };

  // Try a real login using backend (use demo credentials) so the app sets up auth the same way it does in production
  const res = await request.post('http://localhost:8000/api/auth/login/', { data: { username: 'admin', password: 'admin123' } });
  if (res.status() !== 200) {
    throw new Error('Could not login to backend: ' + res.status());
  }
  const body = await res.json();
  const { access, refresh, user: userData } = body;
  await page.addInitScript((token, refreshToken, user) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }, access, refresh, userData);

  // Forward page console to test output to help debug mounting issues
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.toString()));

  await page.goto('/dashboard');
  // useful debug: capture a small screenshot for CI artifacts if needed
  await page.screenshot({ path: 'test-artifacts/page-start.png', fullPage: false });
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('test-artifacts/page.html', html);

  // Ensure some navbar element exists (accept either .modern-navbar or any <nav>)
  const navbar = page.locator('.modern-navbar').count().then(async (c) => c > 0 ? page.locator('.modern-navbar') : page.locator('nav'));
  const navLocator = await navbar;
  await expect(navLocator).toBeVisible({ timeout: 10000 });

  // Brand and controls presence
  const brand = navLocator.locator('.navbar-brand').first();
  const controls = navLocator.locator('.navbar-controls').first();
  await expect(brand).toBeVisible({ timeout: 5000 });
  await expect(controls).toBeVisible({ timeout: 5000 });

  const brandBox = await brand.boundingBox();
  const controlsBox = await controls.boundingBox();
  expect(brandBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();

  // Brand x should be less than controls x (brand left, controls right)
  expect(brandBox!.x).toBeLessThan(controlsBox!.x);

  // CSS variable check
  const navGrad = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--nav-grad-start').trim());
  expect(navGrad).not.toBe('');

  // Open user menu and ensure overlay is visible and has high z-index
  await page.click('.user-btn');
  const menu = page.locator('.user-menu');
  await expect(menu).toBeVisible();

  const z = await page.evaluate(() => {
    const el = document.querySelector('.user-menu');
    return el ? Number(window.getComputedStyle(el).zIndex || '0') : 0;
  });
  expect(z).toBeGreaterThan(100);
});
