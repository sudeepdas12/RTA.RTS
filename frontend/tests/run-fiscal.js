(async () => {
  const { chromium } = require('playwright');
  const base = process.env.BASE_URL || 'http://host.docker.internal:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    console.log('Navigating to login...');
    await page.goto(`${base}/login`, { timeout: 30000 });
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    console.log('Opening fiscal year settings...');
    await page.goto(`${base}/settings/fiscal-years`);
    await page.click('text=Add Fiscal Year');

    const sel = await page.$('select.fiscal-year-select');
    if (!sel) {
      console.error('ERROR: select.fiscal-year-select not found');
      process.exit(2);
    }
    const options = await sel.$$('option');
    console.log('Option count:', options.length);
    if (options.length <= 1) {
      console.error('ERROR: no company options present');
      process.exit(3);
    }

    const firstReal = options[1];
    const txt = (await firstReal.innerText()).trim();
    console.log('First company:', txt);
    if (!txt) {
      console.error('ERROR: first company option has empty text');
      process.exit(4);
    }

    console.log('SUCCESS: Company dropdown present and styled class exists.');
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('EXCEPTION', e);
    await browser.close();
    process.exit(1);
  }
})();
