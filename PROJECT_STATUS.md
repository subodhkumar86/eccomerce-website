# Project handoff

The application supports cash on delivery, direct UPI with bank verification and a configurable Razorpay gateway integration. See PAYMENTS.md for activation and verification. Public-launch configuration is still pending; real gateway activation and email delivery require merchant/provider setup.

## Available now

The storefront now includes an editorial hero edition panel, refined ivory/evergreen/gold styling, sculpted collection frames, updated product-card details, a warmer newsletter section and button/image hover treatments. Sections reveal once as they enter the viewport, and the mobile menu has a short entrance animation. These effects follow Pause motion and the system reduced-motion preference; content remains visible without JavaScript. Styling lives in `app/refinements.css`, with viewport reveals in `components/scroll-reveals.tsx`.

UI-refresh validation: production build and TypeScript passed. Browser layout/hydration checks passed at 320/390/768/1024/1440px. A focused isolated Chromium run passed desktop/mobile hero visibility, actual scroll reveal activation, reduced-motion, pause controls, keyboard mobile navigation and runtime-error checks. Desktop/mobile screenshots are in `tests/.artifacts/ui-home-desktop.png` and `ui-home-mobile.png`; external images were blocked in that focused run. The final full browser regression after the UI refresh passed: storefront layouts at all five widths, admin layouts at 320/768/1024px, shopping, checkout, customer accounts, cancellation, product editing, payment guards, WebGL controls, keyboard rotation, image zoom and motion preferences. Earlier runs hit zero free disk space and a screenshot timeout; generated caches were cleaned and screenshot captures now have an explicit 60-second limit. Functional assertions remain unchanged. The final isolated test database was removed and no real payment was made.

| Area | Included |
| --- | --- |
| Shopping | Catalogue, collections, live quick search, product pages, previews, comparison, saved items, gift finder and browser-local bag |
| Checkout | Current stock/price validation, delivery totals, guest/customer checkout, COD/direct UPI/optional Razorpay and retry protection |
| After purchase | Signed receipts, order progress, printable receipts and repeat purchases using current stock/prices |
| Customer account | Signup/login, delivery profile, password changes, searchable/paginated owned order history and self-cancellation of new unpaid COD orders |
| Admin | Product/category/inventory management, orders, UPI bank-verification queue, method/review filters, payment-reference exports, customer access, subscribers and store settings |
| Site | Responsive layouts, keyboard controls, motion preferences, product metadata and structured data |
| Operations | SQLite/MongoDB clients, isolated test databases, CI, Docker/Netlify configuration and read-only launch checks |

## Start this checkout

Dependencies and generated database clients are already present in this workspace:

```powershell
npm.cmd run dev
```

Storefront: http://localhost:3000. Admin: http://localhost:3000/admin/login. Use your private administrator credentials from local configuration; this document contains no credentials.

For a fresh installation, follow `README.md` rather than resetting the existing database.

## Verification

On 1 November 2026, the production build, TypeScript, lint and all 27 unit tests passed again. The supplied support address was saved to private configuration and existing store settings; `npm.cmd run check:store` then passed every check against the configured database. These checks do not establish domain ownership, TLS, mailbox delivery, backups or payment settlement.

The current browser harness creates a fresh context between viewport sweeps and before interaction checks, retaining accumulated runtime errors. This releases resources after repeated full-document visits. Asset failures now log their URL and HTTP/network error; Chromium reported `net::ERR_INSUFFICIENT_RESOURCES` during the initial run. Browser assertions use the same 15-second allowance as browser actions.

Final reruns passed the full storefront/customer/admin/payment browser suite, the 60-visit information/authentication hydration regression and all 48 delayed-script authentication visits. All stages of `verify` passed individually after the harness changes. Earlier attempts included asset-resource failures, a native schema-engine crash and an authentication process exit without diagnostics; the final successful runs do not prove these environment failures cannot recur. Integration databases were isolated and cleaned up, and no real payment was transferred.

The current implementation passed the production build, `npm.cmd run check` (lint, generated route types, TypeScript and 27 unit tests), the full Chromium storefront/admin/payment regression, 48 delayed-script authentication visits with saved browser state, and 240 production information/authentication page visits across 320/390/768/1024/1440px. The earlier intermittent hydration failure was not observed in these final runs. Browser runtime/hydration assertions remain enabled. All integration databases were isolated and removed; no real payment was transferred.

The production mismatch was captured with React expecting a wrapper while its hydration cursor pointed at the existing child. Next.js was upgraded from 15.5.28 to 16.4.3; its bundled renderer contains the [upstream host replay cursor-restoration fix](https://github.com/react/react/pull/35494). The original template and provider behavior were restored. No internal renderer patch, global hydration gate or hydration-warning suppression is shipped. The version upgrade includes other framework changes, so these results establish regression coverage rather than uniquely attributing the failure to one upstream commit.

Webpack remains explicit for development, production and the verification harness. Next 16 route types are generated before standalone TypeScript checks, and its required automatic JSX runtime is configured. ESLint uses native flat presets, with scoped compatibility exceptions for existing effect-based synchronization and intentional full-document redirects; hooks and dependency checks remain enabled.

`npm.cmd run test:layout-hydration` runs the focused 60-visit regression. Set `HYDRATION_STRESS=1` in the test process environment for the 240-visit version. This regression is now included in CI and `verify`.

```powershell
npm.cmd run verify
npm.cmd run check:store
```

`verify` checks the application using isolated test data. `check:store` reads the configured store and reports actual configuration gaps without changing records. Network restrictions can prevent database access inside a sandbox; the configured database was readable when checked outside that restriction.

## Before accepting real orders

- The supplied public support address is saved in both private `SUPPORT_EMAIL` and Admin → Store settings. The read-only store readiness check passed on 1 November 2026. Mailbox access and message delivery still require merchant verification.
- Replace/verify sample products, photography, prices and inventory, and complete the actual delivery, return and privacy terms for the merchant.
- Configure and verify the intended hosting, public HTTPS `SITE_URL`, persistent database, backups and domain/TLS. Application tests do not establish those external services.
- Activate the Razorpay integration with real merchant credentials/webhooks if automatic gateway verification is required. Direct UPI references must be verified in the merchant bank/UPI app; administrative status changes do not charge or refund money.
- Connect a mail provider if password-reset/verification emails, order notifications or newsletter delivery are required. Newsletter subscriptions are currently saved/exportable records.

No deployment, payment collection, email delivery or support-address creation is represented as completed by this handoff.
