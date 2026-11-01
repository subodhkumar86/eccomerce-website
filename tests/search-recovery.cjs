const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');

module.exports = async function searchRecovery({ base }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route(/https:\/\//, route => route.abort());
    await context.route('**/_next/static/**/*.js', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let failSearch = true;
    await page.route('**/api/search?*', route => route.fulfill({
      status: failSearch ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(failSearch ? { error: 'Search temporarily unavailable.' } : { products: [], hasMore: false }),
    }));
    // Click as soon as server-rendered controls appear, while scripts are delayed.
    await page.goto(base + '/delivery', { waitUntil: 'commit' });
    const trigger = page.getByRole('button', { name: 'Search products', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Search the collection', exact: true });
    await expect(dialog.getByRole('searchbox')).toBeFocused();
    await dialog.getByRole('searchbox').fill('ceramic');
    await expect(dialog.getByRole('alert')).toContainText('Search temporarily unavailable');
    failSearch = false;
    await dialog.getByRole('button', { name: 'Retry search', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('No matching objects');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await trigger.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close product search', exact: true }).click();
    await trigger.click();
    await expect(dialog.getByRole('searchbox')).toBeFocused();
    assert.deepEqual(errors, [], 'Search recovery must not cause hydration or runtime errors');
    console.log('PASS: search opens during delayed hydration, survives failed requests/retry and reopens after native and button close.');
  } finally {
    await browser.close();
  }
};
