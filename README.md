# Veloura Commerce

A working Next.js storefront and admin studio with MongoDB Atlas or SQLite persistence, cash-on-delivery, direct UPI and configurable gateway checkout, stock management, product discovery and consent-based newsletter subscriptions.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the current handoff, start commands, verified functionality and remaining public-launch setup.

## Run locally

Requirements: Node.js 20.19 or newer and npm (Node.js 22 is used by CI and Docker).

The project targets Next.js 16.4.3 and explicitly uses Webpack for development and production builds. Type checking generates Next route types first, including on a fresh checkout. See the [official Next.js 16 migration guide](https://nextjs.org/docs/app/guides/upgrading/version-16).

```powershell
npm.cmd install
npm.cmd run setup
npm.cmd run dev
```

Open **http://localhost:3000**. Admin sign-in is **http://localhost:3000/admin/login**.

Setup creates `.env` if it is missing, generates a unique session secret and initial administrator password, creates the database schema and seeds sixteen sample products. Read `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your local `.env` to sign in. Credentials are not printed to the terminal. Existing `.env` files, administrator passwords and existing product records are preserved on subsequent setup runs.

Update your name and password in **Admin → My account**. Update the store name, support email, announcement and delivery charges in **Store settings**. The example support address must be replaced with your own working address before sharing the store.

If upgrading an existing installation, stop its development server and run `npm.cmd run setup` before restarting it. This adds the newsletter table and checkout retry fields without resetting existing records. Schema updates never use a force-reset or data-loss flag.

Sample inventory is for local demonstration. Replace sample descriptions, images, prices and stock with verified merchant data before accepting real orders. Rerunning the seed adds missing sample slugs without overwriting existing product edits.

## Payment methods

See [PAYMENTS.md](PAYMENTS.md) for direct UPI QR/app links, reference submission and admin bank verification, optional Razorpay UPI/cards/netbanking/wallets, signed webhooks, retry/reconciliation and cancellation/refund handling. This workspace has a private UPI configuration. Gateway methods stay disabled until real merchant keys and a webhook are configured. Test suites use an isolated fake provider and never move real money.

## Customer accounts

- `/signup` and `/login` provide customer access with hashed passwords and separate HttpOnly customer sessions.
- `/account` includes order history, saved delivery details and current-password-verified password changes. Password changes revoke older sessions.
- Signed-in checkout uses the account email, prefills delivery details and links new orders to the customer ID. Guest checkout remains available.
- Guest orders are not claimed automatically by matching email. Use their original confirmation links; account history contains orders placed while signed in.
- Admin Customers lists registered accounts including customers without purchases, account-linked order counts, access pause/restore, search and CSV export. Existing guest-customer summaries remain available.
- Email verification and password-reset emails require a configured mail service and are not enabled by this account flow.

## Order receipts and repeat purchases

- Account order history searches order references, filters by fulfilment status and pages through all account-linked purchases, ten per page. Search is case-insensitive for generated order references. Empty search results and request failures have distinct states; retry preserves the applied filters. The API always derives ownership from the signed-in customer and rejects invalid page/status/search values.

- Signed confirmation links show current fulfilment progress, recorded payment status, delivery details, delivery notes and an itemised receipt. Refresh status retrieves the latest store record.
- Print / save receipt opens the browser print dialog with a dedicated layout. This order receipt is not a tax invoice. Cancelled and delivered orders have distinct headings; cancelled orders do not show a pending delivery journey.
- Account history offers Cancel order for owned, new, unpaid COD orders. The customer confirms before submitting; the server rechecks ownership/status and restores reserved stock once in the same transaction. Repeated cancellation is idempotent. Confirmed, paid, online-payment and guest orders require store review; no refund is initiated.
- Account history includes Buy again. It validates the full selection against current prices, visibility and stock, including quantities already in the bag. Unavailable selections leave the bag unchanged. A successful addition never places an order: shoppers review their bag and checkout again.
- Receipt links remain private bearer links valid for seven days; account history can generate fresh links for owned orders.

## Storefront

- Quick search opens from the header, `/` or Ctrl/Cmd+K outside text fields. Search objects, descriptions and collection names; browse up to eight live matches with arrow keys, open with Enter and dismiss with Escape. Empty searches, unavailable search services and retries have separate states. Hidden products are excluded; sold-out products are labelled.
- Product pages have catalogue-specific titles, descriptions, social preview images and canonical URLs when HTTPS `SITE_URL` is configured. Product structured data uses current rupee prices and stock, and never fabricates reviews or ratings. Structured data is escaped before embedding in HTML.

- Collection directory (`/collections`), newest additions (`/new-arrivals`) and a journal with three full editorial stories (`/journal`).
- Shareable collection search/filter URLs, browser Back/Forward restoration, inclusive budget filters and grid/gallery layouts. Saved-item links share filters, not the device-local saved list.
- Personal shopping (`/personal-shopping`) prepares an enquiry preview and email draft; it does not send messages, book appointments or place orders.
- Refined ivory/evergreen styling, homepage journal stories and keyboard-friendly mobile navigation.
- Live catalogue, product details, category browsing, text search, sorting and stock/budget filters.
- Featured homepage objects reflect current admin changes. Empty or unavailable catalogues do not silently become demo inventory.
- Quick previews, device-local favourites, a saved-items page, comparison of up to three objects and recent viewing history.
- Gift finder by occasion, category and per-object budget; related products on detail pages.
- Browser-local bag with validated storage, quantity limits, save-for-later and undo removal. Limits are 30 distinct objects and 99 pieces per object, subject to available stock.
- Checkout checks current prices, delivery charges, visibility and stock before submission. If the total changes, the shopper reviews it before placing the order.
- Checkout retry keys prevent the same submission from creating a second order. Stock changes and order creation share one transaction.
- Successful checkout opens a fresh confirmation document and keeps a tab-local recovery link for up to seven days. Empty checkout can reopen the last confirmation.
- A signed confirmation link displays the recorded order and current status for seven days. An arbitrary order-number URL does not confirm a purchase.
- Newsletter signup requires consent, persists one subscription per email and offers admin export/removal.
- Delivery/support and privacy-information pages, unavailable-page recovery, a custom 404 page, keyboard controls and reduced-motion support.
- Dedicated story (`/about`), searchable shopping FAQs (`/faq`), material-care guidance (`/care`) and contact (`/contact`) pages. Contact prepares a draft in the shopper's email app; it does not silently submit or send a message.

The bag, favourites and recent history are local to the current browser. They do not sync between devices. Product and editorial images load from configured external image URLs; browser tests substitute local fixtures for external assets.

## Admin studio

| Area | Features |
| --- | --- |
| Overview | Order/payment values, fulfilment queue, customer count, inventory value, low-stock alerts and recent orders |
| Products | Create, edit, duplicate as a hidden draft, delete, search, category/visibility/stock filters, pagination and CSV export |
| Bulk inventory | Select up to 100 products; publish, hide, feature, unfeature or add stock |
| Orders | Search, order/payment/date filters, full delivery details, customer notes, line items, totals and status updates |
| Customers | Email-based summaries, contact details, order counts, non-cancelled order values, order-history links and CSV export |
| Categories | Create, rename, edit slugs and delete while keeping products uncategorised |
| Subscribers | Search, export consented subscriptions and remove addresses when requested |
| Store settings | Branding, support email, announcement and shipping calculations |
| My account | Display-name/password updates with current-password verification; password changes invalidate older sessions |

Orders move through `NEW → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`. Unshipped orders may be cancelled. Cancellation restores inventory once, including under repeated or simultaneous requests. Cancelled and delivered orders cannot be reopened through the studio.

For COD/direct UPI, payment status is an administrative record; marking paid or refunded does not collect money or issue a refund. UPI requires a bank-matched reference and explicit verification acknowledgement. Razorpay status is provider-verified and cannot be overridden manually. Only a paid order can be marked refunded. Dashboard order value and customer value are not measures of cash collected. Dates use India time. CSV exports include all filtered result pages and escape spreadsheet formula prefixes.

## Verification

`npm.cmd run test:auth-browser` runs a focused, isolated Chromium regression check: 48 customer login, signup and admin-login visits with delayed JavaScript, saved bag/favourites, password visibility controls, mobile navigation and both motion preferences. It reports browser runtime/hydration errors instead of suppressing them. It is included in `verify` and CI. A passing run does not prove that an intermittent hydration issue can never occur.

For detailed React development diagnostics, `npm.cmd run test:browser:debug` runs that check plus mixed-page navigation sweeps on a separate development server with an isolated SQLite database and `.next-browser-debug/` output. It does not overwrite the regular development or production build folders. Browser layout sweeps wait for network activity to settle before measuring the final page; browser runtime/hydration errors remain failures.

Before launch, run `npm.cmd run check:store`. This read-only check validates production environment values, reads the existing schema, and checks for an administrator, published products, available stock, a saved store name and a real saved public support email. Existing store settings are checked independently of environment values. It never runs setup, pushes a schema, creates a missing SQLite file or seeds inventory. It prints no credentials or customer/order records and exits unsuccessfully when attention is needed. Hosting, TLS, backups, merchant terms and external providers still need separate verification.

Run the complete local verification sequence with `npm.cmd run verify`. It generates both database clients, builds production assets, runs lint/unit tests and executes isolated integration and Chromium checks. Chromium must already be installed (`npx.cmd playwright install chromium`). It does not deploy the store or modify the configured store database. Production environment checks remain available separately through `npm.cmd run check:production`.

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run test:admin
```

`check` runs ESLint, TypeScript and unit tests. `test:admin` needs a completed production build and creates its own temporary SQLite database and test administrator. It exercises authentication, cross-origin protection, product/category management, inventory actions, subscriptions, checkout quotes, price-change rejection, retry protection, confirmation links, order/payment transitions, cancellation and password/session changes. It does not use your store database or credentials.

For real Chromium browser checks:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Browser checks use the isolated test database, check storefront layouts at 320/390/768/1024/1440px and admin layouts at 320/768/1024px, and cover customer signup/login/logout, saved delivery profiles, failed order-history recovery, desktop/mobile discovery, malformed-storage recovery, previews, favourites, bag undo, comparison, gifts, newsletter signup, checkout and admin editing. Screenshots are saved under `tests/.artifacts/`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm.cmd run setup` | Create local configuration, generate Prisma, initialise schema and seed missing records |
| `npm.cmd run dev` | Development server |
| `npm.cmd run build` | Generate Prisma and build production assets |
| `npm.cmd start` | Serve the production build |
| `npm.cmd run lint` | Non-interactive ESLint checks |
| `npm.cmd run typecheck` | Generate Next route types, then check TypeScript |
| `npm.cmd test` | Unit/regression tests |
| `npm.cmd run test:admin` | Isolated HTTP/database integration tests |
| `npm.cmd run test:browser` | Isolated HTTP/database and browser checks |
| `npm.cmd run test:layout-hydration` | Repeated production hydration checks across five screen widths |
| `npm.cmd run db:push` | Apply additive schema changes without resetting data |
| `npm.cmd run db:seed` | Seed missing demo records without overwriting existing records |
| `npm.cmd run db:studio` | Inspect the database locally |

The Prisma wrapper selects installed Windows engine binaries when available. If generation reports a locked engine file, stop this project's running development/production server before generating it again. Never delete the database to fix a client-generation problem.

## MongoDB Atlas and Netlify

The app selects MongoDB when private `DATABASE_URL` starts with `mongodb://` or `mongodb+srv://`; otherwise local SQLite remains supported. Both Prisma 6 clients are generated by the build. MongoDB IDs remain strings to preserve catalogue IDs and receipt compatibility. Checkout keys have non-null unique defaults in MongoDB. Atlas must provide replica-set transactions.

Set the Atlas connection string only in private `.env` and Netlify environment settings. Never use a `NEXT_PUBLIC_` database variable. Then run:

```powershell
npm.cmd run db:generate
npm.cmd run db:mongo:push
npm.cmd run db:migrate:mongo
npm.cmd run db:mongo:admin
```

The migration command copies public categories, products and store settings from `SQLITE_DATABASE_URL` (default `file:./dev.db`) without overwriting destination records. It does **not** export existing admin hashes, orders, customers or subscribers. The admin command initializes a new account from private `ADMIN_EMAIL` / `ADMIN_PASSWORD`; existing target passwords are preserved. Original SQLite files are not deleted.

`netlify.toml` configures the Next.js runtime and MongoDB client files. Set `DATABASE_URL`, `AUTH_SECRET` and the public `SITE_URL` in Netlify environment settings before deploying. Initialize database indexes and the administrator once, rather than on each function invocation. The admin password panel is hidden in production by default. For a public demo, explicitly enable `ADMIN_SHOWCASE_LOGIN` as described below; this gives visitors full admin access. Disable showcase mode and rotate the password before accepting real orders.

## Configuration and deployment

`DATABASE_URL` selects the SQLite database (`file:./dev.db`, relative to `prisma/`, by default). `AUTH_SECRET` must be a unique random value of at least 32 characters. `.env` and local database files are ignored by version control. Keep the database on persistent writable storage and maintain backups. Use MongoDB Atlas on Netlify and other platforms without persistent local disk. SQLite remains suitable for local development and deployments with persistent storage.

On reverse-proxy hosting, set `SITE_URL` to the exact public HTTPS origin. Mutation checks accept that configured origin in addition to the request URL and continue to reject foreign browser origins.

Admin sessions use signed, HTTP-only, same-site cookies and secure cookies in production. Password changes revoke older sessions. Admin/API mutations reject browser requests from another origin. Login and subscription throttles are bounded, per-process limits; multi-instance deployments need shared throttling. Use HTTPS and preserve the public host/protocol headers when placing the app behind a proxy.

This project supports **cash on delivery**, **direct UPI with merchant verification** and an optional **Razorpay gateway integration**. Real gateway collection requires merchant keys, capture settings and public webhooks; it is not activated by application tests. Automatic refund initiation, transactional email/SMS, newsletter campaign delivery and hosted image uploads are not connected. Subscriptions are saved/exportable; saving a subscription does not send an email. Merchant-specific delivery, return and data-retention terms should be completed for the actual business before public launch.

## Motion and the 3D studio

The homepage includes a locally rendered WebGL form study with three forms, three finishes, drag and keyboard rotation, pause and reset controls. It is an abstract design study rather than a 3D scan of the products. No external 3D model, texture or HDR download is required.

The hero and studio stop automatic rendering when offscreen or when the tab is hidden. Pixel density and shadow resolution are capped. Unsupported WebGL receives a styled static fallback. The site respects the system reduced-motion preference and provides a persistent **Pause motion** control. Manual studio rotation remains available in a still view.

Product images have an enlarged-view dialog with zoom, keyboard dismissal and scrolling. Collection tools include sale-price filtering and **Recently restocked**: available products whose inventory was increased through the admin in the past 30 days. Existing inventory does not receive an invented restock date.

## Production deployment option: Docker

Hosting is not selected yet. These files prepare a single-server deployment with persistent SQLite storage; the store has not been published to an external host.

1. Install Docker with Compose on the deployment machine.
2. Copy `.env.production.example` to `.env.production` and replace every placeholder. Use a unique long `AUTH_SECRET`, real administrator/support addresses, a strong initial password and the public HTTPS `SITE_URL`.
3. Build and start the services:

```powershell
docker compose --env-file .env.production up --build -d
```

The one-shot `init` service validates configuration, applies non-destructive schema changes, creates a missing administrator and initial store settings, and inserts **no demo products**. Existing passwords and settings are preserved. The web service starts only after init succeeds, runs as a non-root user and stores SQLite in the `store-data` volume. The production image uses Next.js standalone output; ordinary local builds keep the standard `npm start` workflow.

The web port is bound to `127.0.0.1:3000` by default. Put it behind your HTTPS reverse proxy and forward the original Host and protocol. Change `PORT` in the environment if needed. Configure DNS/TLS and your actual delivery/return/support information before public use. Add your real catalogue through the admin.

`GET /api/health` returns 200 when the store database is initialised and readable, and 503 otherwise. Container health checks use this endpoint. `robots.txt` excludes private/customer routes, and `sitemap.xml` uses the configured HTTPS `SITE_URL` and active products. The app sets clickjacking, content-type, referrer and browser-permission headers.

For a configuration-only check outside Docker, set `DATABASE_URL` to the persistent SQLite file for that deployment and run `npm.cmd run check:production`. This checks configuration format and placeholders; it does not verify ownership of domains or email addresses, TLS, backups or external providers.

Use a stopped/snapshotted SQLite volume or SQLite's backup API for consistent backups. Store backups separately and test restoration. Do not run multiple web replicas against this SQLite file. A serverless or multi-instance host needs a managed database/provider migration and shared throttling; it is not configured by these Docker files. Do not run `docker compose down -v` on a real store, because it removes the database volume.

`.github/workflows/ci.yml` prepares automated application checks, production build, Docker image build and Chromium regression checks. Run it in your repository/CI before deployment. Gateway activation requires real merchant credentials and webhook setup. Automatic refund initiation, email campaigns and transaction notifications still require external services; no placeholder payment success or email delivery is simulated.

Development builds use `.next-dev/` and production builds use `.next-production/`, so a running preview cannot overwrite production manifests. These generated directories are ignored by version control and Docker build contexts.

### Public showcase login

Set `ADMIN_SHOWCASE_LOGIN="true"` in your hosting environment, alongside `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then redeploy. `/admin/login` displays the credentials only when they match the existing database account and offers direct sign-in. This grants public write access to the real admin dashboard; use sample data without real orders or payments. Disable the flag and change the admin password in the dashboard before accepting real customers. Environment settings do not reset an existing account password. Defaults in the deployment templates remain disabled.
