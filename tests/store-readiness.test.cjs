const { test } = require('node:test');
const assert = require('node:assert/strict');
const { storeChecks } = require('../scripts/check-store.cjs');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');

const env = { AUTH_SECRET: 'a'.repeat(64), SITE_URL: 'https://shop.veloura.com', ADMIN_EMAIL: 'studio@veloura.com', SUPPORT_EMAIL: 'care@veloura.com', ADMIN_PASSWORD: 'A-unique-bootstrap-secret-2026', DATABASE_URL: 'file:/app/data/store.db' };
function database({ admins = 1, products = 3, available = 2, settings = { storeName: 'Veloura', supportEmail: env.SUPPORT_EMAIL } } = {}) {
  return { admin: { count: async () => admins }, product: { count: async ({ where }) => where.stock ? available : products }, storeSettings: { findUnique: async () => settings } };
}

test('launch checks distinguish saved store configuration from environment values', async () => {
  assert.ok((await storeChecks(database(), env)).every(check => check.ok));
  const checks = await storeChecks(database({ settings: { storeName: 'Veloura', supportEmail: 'care@veloura.example' } }), env);
  assert.equal(checks.find(check => check.name === 'Production configuration').ok, true);
  assert.equal(checks.find(check => check.name === 'Public support address').ok, false);
});

test('an empty store cannot pass the launch checks and database failures redact credentials', async () => {
  const checks = await storeChecks(database({ admins: 0, products: 0, available: 0, settings: null }), env);
  for (const name of ['Administrator', 'Catalogue', 'Available inventory', 'Store branding', 'Public support address']) assert.equal(checks.find(check => check.name === name).ok, false, name);
  const broken = database();
  broken.admin.count = async () => { throw new Error('mongodb://private-user:private-password@private-host/store'); };
  const failure = await storeChecks(broken, env);
  assert.equal(failure.find(check => check.name === 'Database').ok, false);
  assert.ok(!JSON.stringify(failure).includes('private-'));
});

test('the launch checker refuses a missing SQLite database without creating a file', () => {
  const missing = path.join(os.tmpdir(), 'veloura-readiness-' + randomUUID() + '.db');
  const result = spawnSync(process.execPath, ['scripts/check-store.cjs'], { env: { ...process.env, ...env, DATABASE_URL: 'file:' + missing.replaceAll('\\', '/') }, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(fs.existsSync(missing), false);
  assert.ok(!result.stdout.includes(env.AUTH_SECRET));
  assert.ok(!result.stderr.includes(env.ADMIN_PASSWORD));
});
