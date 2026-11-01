const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

module.exports = async function customerCancellation({ request, prisma, cookie, otherCookie, adminCookie, productId, stored }) {
  const ids = [];
  const payload = { customerName: stored.customerName, email: stored.email, phone: stored.phone, address: stored.address, city: stored.city, postalCode: stored.postalCode };
  async function create(paymentMethod = 'COD', quantity = 1) {
    const response = await request('/api/orders', 'POST', { ...payload, paymentMethod, items: [{ productId, quantity }], idempotencyKey: randomUUID() }, cookie);
    assert.equal(response.status, 201, JSON.stringify(response.data));
    const order = await prisma.order.findUnique({ where: { orderNumber: response.data.orderNumber } });
    ids.push(order.id);
    return order;
  }
  const cancel = (order, session = cookie, headers = {}) => request('/api/customer/orders/cancel', 'POST', { orderNumber: order.orderNumber }, session, headers);
  const stock = async () => (await prisma.product.findUnique({ where: { id: productId } })).stock;
  const initialStock = await stock();
  try {
    assert.equal((await request('/api/customer/orders/cancel', 'POST', { orderNumber: stored.orderNumber })).status, 401);
    assert.equal((await request('/api/customer/orders/cancel', 'POST', { orderNumber: 42 }, cookie)).status, 400);
    const order = await create('COD', 2);
    assert.equal(await stock(), initialStock - 2);
    assert.equal((await cancel(order, cookie, { origin: 'https://evil.invalid' })).status, 403);
    assert.equal((await cancel(order, otherCookie)).status, 404);
    const duplicate = await Promise.all([cancel(order), cancel(order)]);
    assert.ok(duplicate.some(result => result.status === 200));
    assert.ok(duplicate.every(result => [200, 409].includes(result.status)), JSON.stringify(duplicate));
    assert.equal((await cancel(order)).status, 200);
    assert.equal(await stock(), initialStock, 'concurrent cancellation releases all reserved units exactly once');
    const history = await request('/api/customer/orders?q=' + order.orderNumber, 'GET', undefined, cookie);
    assert.equal(history.data.orders[0].status, 'CANCELLED');
    assert.equal(history.data.orders[0].canCancel, false);
    for (const [status, method, paymentStatus] of [
      ['CONFIRMED', 'COD', 'PENDING'], ['PROCESSING', 'COD', 'PENDING'],
      ['SHIPPED', 'COD', 'PENDING'], ['DELIVERED', 'COD', 'PENDING'],
      ['NEW', 'COD', 'PAID'], ['NEW', 'UPI', 'PENDING'], ['NEW', 'RAZORPAY', 'PENDING'],
    ]) {
      const blocked = await create(method);
      await prisma.order.update({ where: { id: blocked.id }, data: { status, paymentStatus } });
      const reserved = await stock();
      assert.equal((await cancel(blocked)).status, 409, `${method}/${status}/${paymentStatus} requires store review`);
      assert.equal(await stock(), reserved);
      // These fixtures did not actually receive money or enter fulfilment.
      await prisma.$transaction([
        prisma.product.update({ where: { id: productId }, data: { stock: { increment: 1 } } }),
        prisma.paymentIntent.deleteMany({ where: { id: blocked.id } }),
        prisma.order.delete({ where: { id: blocked.id } }),
      ]);
    }
    const race = await create();
    const reserved = await stock();
    const results = await Promise.all([
      cancel(race), request('/api/admin/orders/' + race.id, 'PATCH', { status: 'CONFIRMED' }, adminCookie),
    ]);
    assert.ok(results.some(result => result.status === 200));
    const final = await prisma.order.findUnique({ where: { id: race.id } });
    assert.ok(['CANCELLED', 'CONFIRMED'].includes(final.status));
    assert.equal(await stock(), reserved + (final.status === 'CANCELLED' ? 1 : 0));
    assert.equal((await cancel(race)).status, final.status === 'CANCELLED' ? 200 : 409);
    console.log('PASS: customer-owned COD cancellation, ownership/origin/status/payment guards, repeated requests and confirmation races restore stock at most once.');
  } finally {
    for (const id of ids) {
      const order = await prisma.order.findUnique({ where: { id } });
      if (order && order.status !== 'CANCELLED') {
        for (const item of JSON.parse(order.items)) await prisma.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }
    await prisma.paymentIntent.deleteMany({ where: { id: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
    assert.equal(await stock(), initialStock);
  }
};
