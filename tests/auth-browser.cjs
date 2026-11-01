const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');

module.exports = async function authBrowser({ base, prisma }) {
  await prisma.storeSettings.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main', storeName: 'Hydration Test Store' } });
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const reducedMotion of ['reduce', 'no-preference']) {
      const context = await browser.newContext({ reducedMotion, viewport: { width: 390, height: 844 } });
      await context.route(/https:\/\/(images\.unsplash\.com|example\.com)\//, route => route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz8AAAAASUVORK5CYII=','base64')}));
      await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
      await context.route('**/_next/static/**/*.js', async route => {
        await new Promise(resolve => setTimeout(resolve, 80));
        await route.continue();
      });
      await context.addInitScript(() => {
        localStorage.setItem('veloura-cart', JSON.stringify([{ id: 'saved-object', slug: 'saved-object', name: 'Saved object', price: 100, image: 'https://example.com/object.jpg', stock: 5, quantity: 2 }]));
        localStorage.setItem('veloura-wishlist', JSON.stringify(['saved-object']));
        localStorage.setItem('veloura-motion', 'off');
      });
      const page = await context.newPage();
      page.on('pageerror', error => { failures.push(`${new URL(page.url()).pathname}: ${error.stack || error.message}`); });
      page.on('console', message => { if(process.env.AUTH_BROWSER_DEBUG==='1' && message.type()==='error' && /hydration|didn't match|server rendered/i.test(message.text())){failures.push(message.text());console.error(message.text());} });
      if(process.env.AUTH_BROWSER_DEBUG==='1'){
        for(let repeat=0;repeat<5;repeat++)for(const path of ['/login','/signup','/checkout','/about','/delivery','/privacy','/account','/admin/login']){await page.goto(base+path);await expect(page.locator('main h1')).toBeVisible();}
        if(failures.length)throw new Error(failures.join('\n'));
      }
      for (let repeat = 0; repeat < 8; repeat++) {
        for (const path of ['/login', '/signup', '/admin/login']) {
          await page.goto(base + path);
          await expect(page.locator('main h1')).toBeVisible();
          const password = page.getByLabel('Password', { exact: true });
          await password.fill('BrowserPassword!2026');
          await page.getByRole('button', { name: 'Show password', exact: true }).click();
          await expect(password).toHaveAttribute('type', 'text');
          await page.getByRole('button', { name: 'Hide password', exact: true }).click();
          await expect(password).toHaveAttribute('type', 'password');
          await expect(page.getByRole('link', { name: 'Shopping bag (2)', exact: true })).toBeVisible();
          await expect(page.getByRole('link', { name: 'Saved favourites (1)', exact: true })).toBeVisible();
          await page.getByRole('button', { name: 'Toggle menu', exact: true }).click();
          await expect(page.locator('#mobile-navigation')).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(page.locator('#mobile-navigation')).toHaveCount(0);
        }
      }
      await context.close();
    }
    assert.deepEqual(failures, [], 'Auth pages must hydrate without runtime errors under delayed scripts and saved browser state');
    console.log('PASS: 48 customer/admin auth page visits with delayed scripts, saved bag/favourites, password toggles, mobile menus and both motion preferences.');
  } finally { await browser.close(); }
};
