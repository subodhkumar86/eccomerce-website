import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
const config = [
  ...nextVitals,
  ...nextTypeScript,
  {ignores:['node_modules/**','.netlify/**','.vercel/**','tests/.artifacts/**','playwright-report/**','test-results/**','.next/**','.next-dev/**','.next-production/**','.next-browser-debug/**','tests/.tmp/**','next-env.d.ts']},
  {rules:{'@next/next/no-img-element':'off'}},
  {files:['**/*.cjs','**/*.mjs'],rules:{'@typescript-eslint/no-require-imports':'off'}},
  // Preserve existing browser/API synchronization during the framework migration.
  // New components keep Next 16's default rule; hooks/dependency checks stay enabled.
  {files:[
    'app/checkout/page.tsx','components/admin-customers.tsx','components/admin-dashboard.tsx',
    'components/admin-subscribers.tsx','components/customer-orders.tsx','components/hero-scene-loader.tsx',
    'components/object-studio.tsx','components/product-detail.tsx','components/product-search.tsx',
    'components/quick-view.tsx','components/shop-client.tsx','components/site-header.tsx',
  ],rules:{'react-hooks/set-state-in-effect':'off'}},
  // These existing flows intentionally reload the document after session/order changes.
  {files:[
    'app/checkout/page.tsx','components/admin-login.tsx','components/customer-account.tsx',
    'components/product-search.tsx','lib/admin-client.ts',
  ],rules:{'@next/next/no-location-assign-relative-destination':'off'}},
];

export default config;
