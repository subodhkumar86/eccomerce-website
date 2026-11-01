const http = require('node:http');

module.exports = async function paymentFixture() {
  const orders = new Map(), payments = new Map(); let creates = 0, failCreate = false;
  const secret = 'fixture-secret-not-a-real-provider-key';
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization !== 'Basic ' + Buffer.from('rzp_test_fixture:' + secret).toString('base64')) { res.writeHead(401); return res.end('{}'); }
    if (req.method === 'POST' && req.url === '/orders') {
      let body = ''; for await (const chunk of req) body += chunk;
      const data = JSON.parse(body), id = 'order_fixture' + (++creates);
      const order = { ...data, id }; orders.set(id, order); if(failCreate){failCreate=false;res.writeHead(503);return res.end('{}');} return res.end(JSON.stringify(order));
    }
    if(req.method==='GET'&&req.url.startsWith('/orders?')){const receipt=new URL(req.url,'http://fixture').searchParams.get('receipt');return res.end(JSON.stringify({items:[...orders.values()].filter(order=>order.receipt===receipt)}));}
    const paymentId = req.url.match(/^\/payments\/(pay_[A-Za-z0-9]+)$/)?.[1];
    if (paymentId && payments.has(paymentId)) return res.end(JSON.stringify(payments.get(paymentId)));
    const orderId = req.url.match(/^\/orders\/(order_[A-Za-z0-9]+)\/payments$/)?.[1];
    if (orderId) return res.end(JSON.stringify({ items: [...payments.values()].filter(payment => payment.order_id === orderId) }));
    res.writeHead(404); res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    env: { RAZORPAY_ENABLED: 'true', RAZORPAY_KEY_ID: 'rzp_test_fixture', RAZORPAY_KEY_SECRET: secret, RAZORPAY_WEBHOOK_SECRET: 'fixture-webhook-secret-not-real', VELOURA_PAYMENT_TEST_BASE_URL: 'http://127.0.0.1:' + server.address().port, UPI_ENABLED: 'true', UPI_ID: 'fixture-merchant@upi', UPI_PAYEE_NAME: 'Fixture merchant' },
    orders, payments,
    failNextCreate(){failCreate=true;},
    capture(orderId, changes = {}) { const order = orders.get(orderId); const id = 'pay_fixture' + (payments.size + 1); const payment = { id, order_id: orderId, amount: order.amount, currency: 'INR', status: 'captured', captured: true, amount_refunded: 0, method: 'upi', ...changes }; payments.set(id, payment); return payment; },
    close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }),
  };
};
