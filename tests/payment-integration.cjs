const assert = require('node:assert/strict');
const { createHmac, randomUUID } = require('node:crypto');

module.exports = async function paymentIntegration({ request, prisma, adminCookie, productId, fixture, base }) {
  const checkout = { customerName: 'Payment Customer', email: 'payment@test.invalid', phone: '1234567890', address: '123 Payment Street', city: 'Mumbai', postalCode: '400001', items: [{ productId, quantity: 1 }] };
  const initialStock = (await prisma.product.findUnique({ where: { id: productId } })).stock;
  const created = [];
  async function place(method) { const response = await request('/api/orders', 'POST', { ...checkout, paymentMethod: method, idempotencyKey: randomUUID() }); assert.equal(response.status, 201, JSON.stringify(response.data)); const order = await prisma.order.findUnique({ where: { orderNumber: response.data.orderNumber } }); created.push(order.id); return { ...order, token: response.data.receiptToken }; }
  const admin = (id, body) => request('/api/admin/orders/' + id, 'PATCH', body, adminCookie);
  async function webhook(payment) {
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: payment } } });
    return fetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'x-razorpay-signature': createHmac('sha256', fixture.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex') }, body });
  }
  try {
    const methods = (await request('/api/payments/methods')).data; assert.equal(methods.upi, true); assert.equal(methods.razorpay, true); assert.equal(methods.testMode, true);
    const upi = await place('UPI');
    assert.equal((await admin(upi.id, { status: 'CONFIRMED' })).status, 409);
    assert.equal((await admin(upi.id, { paymentStatus: 'PAID', paymentVerified: true })).status, 409);
    assert.equal((await request('/api/payments/upi', 'POST', { token: 'invalid', reference: '123456789012' })).status, 401);
    assert.equal((await request('/api/payments/upi', 'POST', { token: upi.token, reference: '123456789012' }, '', { origin: 'https://evil.invalid' })).status, 403);
    assert.equal((await request('/api/payments/upi', 'POST', { token: upi.token, reference: '123456789012' })).status, 200);
    assert.equal((await prisma.order.findUnique({ where: { id: upi.id } })).paymentStatus, 'PENDING');
    assert.equal((await admin(upi.id, { paymentStatus: 'PAID' })).status, 409);
    assert.equal((await admin(upi.id, { paymentStatus: 'PAID', paymentVerified: true, status: 'CONFIRMED' })).status, 200);
    await admin(upi.id, { status: 'CANCELLED' });

    const online = await place('RAZORPAY');
    const start = () => request('/api/payments/razorpay', 'POST', { token: online.token, action: 'start' });
    const starts = await Promise.all([start(), start()]); assert.ok(starts.some(result => result.status === 200));
    const configuration = (await start()).data;
    assert.equal(fixture.orders.size, 1); assert.equal(configuration.amount, online.total * 100);
    assert.equal(configuration.key, 'rzp_test_fixture'); assert.equal(configuration.secret, undefined);
    assert.equal((await admin(online.id, { paymentStatus: 'PAID' })).status, 409);
    assert.equal((await admin(online.id, { status: 'PROCESSING' })).status, 409);
    const pending = fixture.capture(configuration.orderId, { status: 'authorized', captured: false });
    const signature = createHmac('sha256', fixture.env.RAZORPAY_KEY_SECRET).update(configuration.orderId + '|' + pending.id).digest('hex');
    assert.equal((await request('/api/payments/razorpay', 'POST', { token: online.token, action: 'verify', paymentId: pending.id, signature: 'a'.repeat(64) })).status, 400);
    assert.equal((await request('/api/payments/razorpay', 'POST', { token: online.token, action: 'verify', paymentId: pending.id, signature })).status, 409);
    pending.status = 'captured'; pending.captured = true; pending.amount += 1;
    assert.equal((await webhook(pending)).status, 409);
    pending.amount = online.total * 100;
    assert.equal((await fetch(base + '/api/payments/webhook', { method: 'POST', body: '{}' })).status, 400);
    assert.equal((await request('/api/payments/razorpay', 'POST', { token: online.token, action: 'verify', paymentId: pending.id, signature })).status, 200);
    assert.equal((await webhook(pending)).status, 200); assert.equal((await webhook(pending)).status, 200);
    assert.equal((await prisma.order.findUnique({ where: { id: online.id } })).paymentStatus, 'PAID');
    assert.equal((await admin(online.id,{status:'CONFIRMED'})).status,409,'gateway test payments cannot become real fulfilment');
    assert.equal((await start()).status, 409);
    await admin(online.id, { status: 'CANCELLED' });
    pending.status = 'refunded'; pending.amount_refunded = pending.amount;
    assert.equal((await request('/api/payments/razorpay', 'POST', { token: online.token, action: 'refresh' })).data.paymentStatus, 'REFUNDED');
    pending.status = 'captured'; pending.amount_refunded = 0;
    await webhook(pending);
    assert.equal((await prisma.order.findUnique({ where: { id: online.id } })).paymentStatus, 'REFUNDED');

    const late = await place('RAZORPAY');
    const lateStart = (await request('/api/payments/razorpay', 'POST', { token: late.token, action: 'start' })).data;
    await admin(late.id, { status: 'CANCELLED' });
    const latePayment = fixture.capture(lateStart.orderId); assert.equal((await webhook(latePayment)).status, 200);
    const lateOrder = await prisma.order.findUnique({ where: { id: late.id } }); assert.equal(lateOrder.status, 'CANCELLED'); assert.equal(lateOrder.paymentStatus, 'PAID');
    const recovering=await place('RAZORPAY'),before=fixture.orders.size;fixture.failNextCreate();
    assert.equal((await request('/api/payments/razorpay','POST',{token:recovering.token,action:'start'})).status,503);
    assert.equal((await request('/api/payments/razorpay','POST',{token:recovering.token,action:'start'})).status,200);
    assert.equal(fixture.orders.size,before+1,'recover an orphaned provider response without creating another gateway order');
    await admin(recovering.id,{status:'CANCELLED'});
    const lateUpi=await place('UPI');await admin(lateUpi.id,{status:'CANCELLED'});
    assert.equal((await admin(lateUpi.id,{paymentStatus:'PAID',paymentVerified:true,paymentReference:'BANK123456789'})).status,200);
    assert.equal((await prisma.order.findUnique({where:{id:lateUpi.id}})).status,'CANCELLED');
    assert.equal((await prisma.product.findUnique({ where: { id: productId } })).stock, initialStock);
    console.log('PASS: UPI reference/manual verification, gateway order reuse, server amounts, signatures, uncaptured/mismatched payment rejection, webhook replay, refunds and late-payment cancellation guards. No real provider or money was used.');
  } finally {
    await prisma.paymentIntent.deleteMany({ where: { id: { in: created } } });
    await prisma.order.deleteMany({ where: { id: { in: created } } });
  }
};
