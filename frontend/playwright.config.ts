import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5000 },
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ],
  webServer: {
    command: 'npm run build && npx http-server build -p 3001 -c-1',
    port: 3001,
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
