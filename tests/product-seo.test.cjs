const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTS } = require('./helpers.cjs');
const { productStructuredData, serializeStructuredData } = loadTS('lib/product-seo.ts');
const product = { id: 'p1', name: 'Object', slug: 'test-object', description: 'An object.', image: 'https://example.com/object.jpg', price: 1200, stock: 2 };

test('product data uses recorded rupee prices and real stock without inventing ratings', () => {
  const data = productStructuredData(product, 'https://store.test');
  assert.equal(data.offers.price, '1200');
  assert.equal(data.offers.priceCurrency, 'INR');
  assert.equal(data.offers.availability, 'https://schema.org/InStock');
  assert.equal(productStructuredData({ ...product, stock: 0 }, 'https://store.test').offers.availability, 'https://schema.org/OutOfStock');
  assert.equal(data.aggregateRating, undefined);
  assert.equal(productStructuredData(product).offers, undefined);
});

test('product descriptions cannot break out of the structured-data script', () => {
  const text = '</script><script>alert(1)</script>\u2028\u2029';
  const serialized = serializeStructuredData(productStructuredData({ ...product, description: text }));
  assert.ok(!serialized.includes('<'));
  assert.equal(JSON.parse(serialized).description, text);
});
