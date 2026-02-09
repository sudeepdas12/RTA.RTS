import { test, expect } from '@playwright/test';

test('static harness: brand left, controls right, CSS vars and overlay z-index', async ({ page }) => {
  await page.goto('/test-harness.html');

  // Save page HTML and screenshot for debugging
  const html = await page.content();
  const fs = require('fs');
  if (!fs.existsSync('test-artifacts')) fs.mkdirSync('test-artifacts');
  fs.writeFileSync('test-artifacts/harness.html', html);
  await page.screenshot({ path: 'test-artifacts/harness.png', fullPage: true });

  const navbar = page.locator('.modern-navbar');
  await expect(navbar).toBeVisible({ timeout: 10000 });

  const brand = navbar.locator('.navbar-brand').first();
  const controls = navbar.locator('.navbar-controls').first();
  await expect(brand).toBeVisible();
  await expect(controls).toBeVisible();

  const b = await brand.boundingBox();
  const c = await controls.boundingBox();
  // Debugging: print computed styles for brand/controls
  const brandStyles = await page.evaluate(() => {
    const el = document.querySelector('.navbar-brand');
    const s = el ? window.getComputedStyle(el) : null;
    return s ? { display: s.display, order: s.order, marginRight: s.marginRight, marginLeft: s.marginLeft, width: el.getBoundingClientRect().width } : null;
  });
  const controlsStyles = await page.evaluate(() => {
    const el = document.querySelector('.navbar-controls');
    const s = el ? window.getComputedStyle(el) : null;
    return s ? { display: s.display, order: s.order, marginLeft: s.marginLeft, width: el.getBoundingClientRect().width } : null;
  });
  console.log('BRAND STYLES:', brandStyles);
  console.log('CONTROLS STYLES:', controlsStyles);

  // Ensure brand is fully left of controls: brand.right < controls.left
  expect(b!.x + b!.width).toBeLessThan(c!.x);

  const navGrad = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--nav-grad-start').trim());
  expect(navGrad).not.toBe('');

  const z = await page.evaluate(() => {
    const el = document.querySelector('.user-menu');
    return el ? Number(window.getComputedStyle(el).zIndex || '0') : 0;
  });
  expect(z).toBeGreaterThan(1000);
});
