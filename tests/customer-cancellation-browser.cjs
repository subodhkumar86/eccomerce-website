const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { expect } = require('@playwright/test');

module.exports = async function cancellationBrowser({ page, prisma, base, productId }) {
  const before = (await prisma.product.findUnique({ where: { id: productId } })).stock;
  const response = await page.request.post(base + '/api/orders', { data: {
    customerName: 'Browser Account', email: 'browser-account@test.invalid', phone: '1234567890',
    address: '123 Browser Street', city: 'Mumbai', postalCode: '400001',
    items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID(), paymentMethod: 'COD',
  } });
  assert.equal(response.status(), 201);
  const { orderNumber } = await response.json();
  try {
    await page.getByRole('button', { name: 'Order history', exact: true }).click();
    const card = page.locator('.account-order').filter({ hasText: orderNumber });
    await expect(card).toBeVisible();
    assert.equal((await prisma.product.findUnique({ where: { id: productId } })).stock, before - 1);
    // Dismissal must leave the purchase and inventory untouched.
    page.once('dialog', dialog => dialog.dismiss());
    await card.getByRole('button', { name: 'Cancel order ' + orderNumber, exact: true }).click();
    assert.equal((await prisma.order.findUnique({ where: { orderNumber } })).status, 'NEW');
    page.once('dialog', dialog => dialog.accept());
    await card.getByRole('button', { name: 'Cancel order ' + orderNumber, exact: true }).click();
    await expect(page.getByText('Order cancelled. Reserved stock has been released.', { exact: true })).toBeVisible();
    await expect(card.locator('.badge')).toHaveText('Cancelled');
    await expect(card.getByRole('button', { name: 'Cancel order ' + orderNumber, exact: true })).toHaveCount(0);
    assert.equal((await prisma.product.findUnique({ where: { id: productId } })).stock, before);
    console.log('PASS: customer order cancellation confirmation/dismissal, updated order history and inventory release in Chromium.');
  } finally {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (order) {
      if (order.status !== 'CANCELLED') await prisma.product.update({ where: { id: productId }, data: { stock: { increment: 1 } } });
      await prisma.order.delete({ where: { id: order.id } });
    }
  }
};
