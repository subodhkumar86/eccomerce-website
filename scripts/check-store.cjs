const { productionErrors } = require('./check-production.cjs');

async function storeChecks(db, env) {
  const config = productionErrors(env);
  const checks = [{ name: 'Production configuration', ok: config.length === 0, detail: config.length ? config.join(' ') : 'Required environment values are configured.' }];
  try {
    const [admins, products, available, settings] = await Promise.all([
      db.admin.count(),
      db.product.count({ where: { active: true } }),
      db.product.count({ where: { active: true, stock: { gt: 0 } } }),
      db.storeSettings.findUnique({ where: { id: 'main' }, select: { storeName: true, supportEmail: true } }),
    ]);
    checks.push(
      { name: 'Database', ok: true, detail: 'Required store tables are readable.' },
      { name: 'Administrator', ok: admins > 0, detail: admins > 0 ? 'An administrator exists.' : 'Create the initial administrator before launch.' },
      { name: 'Catalogue', ok: products > 0, detail: products > 0 ? `${products} published products.` : 'Publish your real catalogue in the admin studio.' },
      { name: 'Available inventory', ok: available > 0, detail: available > 0 ? `${available} published products have stock.` : 'Add stock to at least one published product.' },
      { name: 'Store branding', ok: Boolean(settings?.storeName.trim()), detail: settings?.storeName.trim() ? 'A store name is saved.' : 'Save the store name in Store settings.' },
    );
    if(env.UPI_ENABLED==='true'||env.RAZORPAY_ENABLED==='true'){
      try{await db.paymentIntent.findFirst({select:{id:true}});checks.push({name:'Payment records',ok:true,detail:'Payment storage is readable. Recipient ownership, gateway credentials and settlements still need merchant verification.'});}
      catch{checks.push({name:'Payment records',ok:false,detail:'Apply the payment schema before enabling UPI/gateway checkout.'});}
    }
    const supportErrors = productionErrors({ ...env, SUPPORT_EMAIL: settings?.supportEmail }).filter(message => message.startsWith('SUPPORT_EMAIL'));
    checks.push({ name: 'Public support address', ok: supportErrors.length === 0, detail: supportErrors.length ? 'Save a real public support address in Store settings; the environment value alone does not update existing settings.' : 'The saved store support address is configured.' });
  } catch {
    // Database errors can include connection strings. Never print their messages.
    checks.push({ name: 'Database', ok: false, detail: 'Unable to read the store schema. Check connectivity and apply the database schema before retrying.' });
  }
  return checks;
}

module.exports = { storeChecks };

if (require.main === module) {
  require('@next/env').loadEnvConfig(process.cwd());
  (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Set DATABASE_URL before checking the store.');
    if (url.startsWith('file:')) {
      const file = require('node:path').resolve('prisma', decodeURIComponent(url.slice(5).split('?')[0]));
      if (url.includes(':memory:') || !require('node:fs').existsSync(file)) throw new Error('The configured SQLite file does not exist on disk. Run setup before checking the store.');
    }
    const db = require('./database.cjs').createDatabaseClient(url);
    try {
      const checks = await storeChecks(db, process.env);
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'NEEDS ATTENTION'}: ${check.name} — ${check.detail}`);
      console.log('Read-only application checks. Domain ownership, TLS, backups, merchant policies and external payment/email services require separate verification.');
      if (checks.some(check => !check.ok)) process.exitCode = 1;
    } finally { await db.$disconnect(); }
  })().catch(() => { console.error('Store check could not start. Verify DATABASE_URL, the existing database file and generated Prisma clients. No setup or schema changes were run.'); process.exitCode = 1; });
}
