const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { loadTS } = require('./helpers.cjs');
const { validPaymentSignature, paymentAmount, verifiedPaymentState, paymentConfiguration } = loadTS('lib/payment-security.ts');
const { upiAvailable, validUpiId, upiPaymentUri } = loadTS('lib/upi.ts');

test('payment signatures cover exact raw bytes and reject missing, malformed and altered signatures', () => {
  const secret = 'a-private-test-secret', body = '{"payment":"captured"}';
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(validPaymentSignature(body, signature, secret), true);
  for (const invalid of [null, '', 'abc', 'g'.repeat(64)]) assert.equal(validPaymentSignature(body, invalid, secret), false);
  assert.equal(validPaymentSignature(body + ' ', signature, secret), false);
  assert.equal(validPaymentSignature(body, signature, 'different'), false);
});

test('gateway verification binds captured payments to the stored order, INR and exact paise amount', () => {
  const payment = { id: 'pay_test', order_id: 'order_test', amount: 120000, currency: 'INR', status: 'captured', captured: true };
  assert.equal(paymentAmount(1200), 120000);
  for (const amount of [-1, 0, 0.5, Number.MAX_SAFE_INTEGER]) assert.throws(() => paymentAmount(amount));
  assert.equal(verifiedPaymentState(payment, 'order_test', 1200), 'PAID');
  for (const change of [{ currency: 'USD' }, { amount: 120001 }, { order_id: 'order_other' }, { captured: false }, { status: 'authorized' }]) assert.equal(verifiedPaymentState({ ...payment, ...change }, 'order_test', 1200), null);
  assert.equal(verifiedPaymentState({ ...payment, status: 'refunded', amount_refunded: 120000 }, 'order_test', 1200), 'REFUNDED');
  assert.equal(verifiedPaymentState({ ...payment, status: 'refunded', amount_refunded: 100 }, 'order_test', 1200), null);
  assert.equal(paymentConfiguration({}), false);
});

test('UPI requests use merchant configuration, exact totals and encoded references', () => {
  assert.equal(upiAvailable({ UPI_ENABLED: 'true', UPI_ID: 'merchant@bank' }), true);
  assert.equal(upiAvailable({ UPI_ID: 'merchant@bank' }), false);
  assert.equal(validUpiId('merchant@bank?am=1'), false);
  const uri = new URL(upiPaymentUri({ vpa: 'merchant@bank', name: 'Store & Studio', total: 1200, reference: 'ORDER & 123' }));
  assert.equal(uri.protocol, 'upi:'); assert.equal(uri.searchParams.get('pa'), 'merchant@bank');
  assert.equal(uri.searchParams.get('am'), '1200.00'); assert.equal(uri.searchParams.get('cu'), 'INR');
  assert.equal(uri.searchParams.get('pn'), 'Store & Studio'); assert.equal(uri.searchParams.get('tr'), 'ORDER & 123');
  assert.throws(() => upiPaymentUri({ vpa: 'https://evil', name: 'Store', total: 1, reference: 'x' }));
});
