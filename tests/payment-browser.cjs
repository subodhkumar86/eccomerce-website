const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID, createHmac } = require('node:crypto');
const { chromium, expect } = require('@playwright/test');

module.exports = async function paymentBrowser({ base, prisma, fixture }) {
  const key = randomUUID().slice(0, 8);
  const product = await prisma.product.create({ data: { name: 'Payment UI Object', slug: 'payment-ui-' + key, description: 'Isolated payment browser fixture.', price: 500, image: 'https://example.com/payment.jpg', stock: 5, active: true } });
  const emails = ['upi-ui-' + key + '@test.invalid', 'gateway-ui-' + key + '@test.invalid'];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await context.route(/https:\/\/(example\.com|images\.unsplash\.com)\//, route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz8AAAAASUVORK5CYII=','base64') }));
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  async function go(path) { await page.goto(base + path); await page.waitForLoadState('networkidle'); }
  async function checkout(email, method) {
    await go('/products/' + product.slug);
    await page.locator('.detail-copy').getByRole('button', { name: /^Add to bag/ }).click();
    await go('/checkout');
    await page.getByRole('radio', { name: method === 'UPI' ? /UPI.*scan QR/ : /UPI, cards, netbanking/ }).check();
    for (const [label, value] of [['Full name *','Payment UI Customer'],['Email *',email],['Phone *','1234567890'],['Street address *','123 Payment Street'],['City *','Mumbai'],['Postal code *','400001']]) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole('button', { name: /Place order/ }).click();
    await expect(page.getByRole('region', { name: 'Complete payment' })).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  try {
    await checkout(emails[0], 'UPI');
    await expect(page.getByRole('img', { name: /UPI payment QR/ })).toBeVisible();
    const uri = new URL(await page.getByRole('link', { name: 'Open UPI app', exact: true }).getAttribute('href'));
    assert.equal(uri.searchParams.get('pa'), 'fixture-merchant@upi'); assert.equal(uri.searchParams.get('am'), '510.00');
    await page.setViewportSize({ width: 320, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'UPI receipt fits mobile');
    fs.mkdirSync('tests/.artifacts', { recursive: true }); await page.screenshot({ path: 'tests/.artifacts/upi-payment-mobile.png', fullPage: true });
    await page.getByLabel('UPI transaction reference / UTR', { exact: true }).fill('123456789001');
    await page.getByRole('button', { name: 'Submit payment reference', exact: true }).click();
    await expect(page.locator('.payment-panel [role="status"]')).toContainText('Awaiting');
    assert.equal((await prisma.order.findFirst({ where: { email: emails[0] } })).paymentStatus, 'PENDING');
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.exposeFunction('__fixturePayment', async orderId => { const payment = fixture.capture(orderId); return { razorpay_payment_id: payment.id, razorpay_signature: createHmac('sha256', fixture.env.RAZORPAY_KEY_SECRET).update(orderId + '|' + payment.id).digest('hex') }; });
    await page.route('https://checkout.razorpay.com/v1/checkout.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.Razorpay=class{constructor(options){this.options=options}on(){}async open(){this.options.handler(await window.__fixturePayment(this.options.order_id))}}' }));
    await checkout(emails[1], 'RAZORPAY');
    await page.getByRole('button', { name: 'Pay securely', exact: true }).click();
    await expect(page.getByText('Test payment recorded', { exact: true })).toBeVisible();
    assert.equal((await prisma.order.findFirst({ where: { email: emails[1] } })).paymentStatus, 'PAID');

    await go('/admin/login'); await page.getByLabel('Administrator email').fill('studio@test.invalid'); await page.getByLabel('Password', { exact: true }).fill('NewPassword!2026');
    await page.getByRole('button', { name: 'Enter studio' }).click(); await expect(page.getByRole('heading', { name: 'Studio overview', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Orders', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search orders' }).fill(emails[0]);
    await page.getByRole('combobox', { name: 'Filter payment method', exact: true }).selectOption('UPI');
    await page.getByRole('combobox', { name: 'Filter payment review', exact: true }).selectOption('upi-reference');
    await page.getByRole('button', { name: 'View / update', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('123456789001');
    await page.getByLabel('Payment status', { exact: true }).selectOption('PAID');
    await page.getByRole('checkbox', { name: 'I verified the matching bank credit, amount and UPI reference.' }).check();
    await page.getByLabel('Order status', { exact: true }).selectOption('CONFIRMED');
    await page.getByRole('button', { name: 'Save order changes', exact: true }).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('No matching orders.', { exact: true })).toBeVisible();
    assert.equal((await prisma.order.findFirst({ where: { email: emails[0] } })).paymentStatus, 'PAID');
    assert.deepEqual(errors, [], 'Payment flows must not produce runtime or hydration errors');
    console.log('PASS: real Chromium UPI QR/mobile layout/reference submission, admin bank verification queue and simulated gateway checkout/callback. No real money was used.');
  } finally {
    await context.close(); await browser.close();
    const orders = await prisma.order.findMany({ where: { email: { in: emails } }, select: { id: true } });
    await prisma.paymentIntent.deleteMany({ where: { id: { in: orders.map(order => order.id) } } });
    await prisma.order.deleteMany({ where: { email: { in: emails } } });
    await prisma.product.delete({ where: { id: product.id } });
  }
};
