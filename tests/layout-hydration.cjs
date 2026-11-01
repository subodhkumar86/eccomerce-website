const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');

module.exports = async function layoutHydration({ base, prisma }) {
  await prisma.storeSettings.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main', storeName: 'Layout Test Store' } });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route(/https:\/\//, route => route.abort());
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('console', message => {
      if (message.type() === 'error' && /hydrat|didn.t match|server rendered/i.test(message.text())) console.error(message.text());
    });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (let repeat = 0; repeat < (process.env.HYDRATION_STRESS === '1' ? 12 : 3); repeat++) {
        for (const path of ['/delivery', '/privacy', '/signup', '/login']) {
          await page.goto(base + path);
          await page.waitForLoadState('networkidle');
          await expect(page.locator('main h1')).toBeVisible();
          await expect(page.locator('#main-content > .page-enter > main')).toHaveCount(1);
          await expect(page.locator('.page-enter')).toHaveCount(1);
          assert.deepEqual(errors, [], `${path} must hydrate without errors at ${width}px`);
        }
      }
      console.log(`PASS: repeated information/auth hydration at ${width}px`);
    }
  } finally { await browser.close(); }
};
