# Payments

Cash on delivery remains available. Direct UPI is configured privately for this workspace. Razorpay is an optional gateway integration and remains disabled until merchant credentials are configured.

## Direct UPI

Set `UPI_ENABLED="true"` and `UPI_ID` in private `.env`. `UPI_PAYEE_NAME` is optional; new orders otherwise snapshot the current store name. Check the actual recipient name in your bank/UPI app before publishing. The application validates the ID format, not account ownership or bank eligibility.

Customers choose UPI at checkout, then receive a QR code and `upi://pay` app link for the recorded amount and order reference. The recipient details are saved with the order so later configuration changes do not silently reroute an existing order's payment. Customers may submit a transaction reference/UTR. That action never marks an order paid.

In Admin → Orders, open the order, match the reference, payee and amount to an actual bank credit, select PAID and tick the bank-verification acknowledgement. Pending UPI/gateway orders cannot move into fulfilment. Checking a screenshot or a customer claim alone is not bank verification. Never request a customer's UPI PIN or OTP.

The verified-reference field can also record a bank-confirmed credit when the customer did not submit a reference, including a late credit on a cancelled order. The order stays cancelled and enters refund review. Orders can be filtered by method, pending UPI bank verification or paid/cancelled review; reference and provider IDs are included in filtered CSV exports.

## Razorpay: UPI, cards, netbanking and wallets

Methods actually shown depend on the merchant account and provider availability. Configure these private values:

```dotenv
RAZORPAY_ENABLED="true"
RAZORPAY_KEY_ID="your_test_or_live_key_id"
RAZORPAY_KEY_SECRET="your_private_api_secret"
RAZORPAY_WEBHOOK_SECRET="your_independent_random_webhook_secret"
```

Use test keys first. Configure automatic capture in the Razorpay dashboard. Add the public HTTPS webhook URL `https://YOUR_STORE/api/payments/webhook` with the matching webhook secret, subscribing to `payment.captured` and `refund.processed`. Configure the database schema with `npm.cmd run db:generate` and `npm.cmd run db:push` when upgrading. No reset/data-loss flags are used.

The store creates and reserves the order before online payment; its receipt supports payment retry/status checks without placing another store order. Razorpay orders are created server-side in paise from the recorded INR total. A database lease prevents concurrent setup from returning competing provider orders. Gateway callbacks require a signature based on the stored provider order ID; the server also fetches the payment and checks amount, currency, ownership and captured status. Browser redirects and authorization alone never mark an order paid.

Setup first searches the provider by the exact store receipt/reference and validates its amount/currency. This recovers a provider order created before a lost/failed response without issuing another gateway order on retry.

Webhook signatures cover raw request bytes. Replayed captured events are idempotent. Full provider-verified refunds update the recorded status; partial refunds do not mislabel the whole order as refunded. Refunds themselves must be performed in the provider dashboard; the application does not initiate them. Refresh payment status can recover a missed callback/webhook. Razorpay payment status cannot be manually overridden through the admin form/API.

## Reservations, cancellations and exceptions

All placed orders reserve stock, including unpaid online orders. Unpaid orders do not auto-expire; review/cancel abandoned orders in the admin. Cancellation restores stock once and does not itself refund money. A delayed captured payment on a cancelled order is recorded as PAID while the order stays CANCELLED, with a receipt warning requiring merchant review/refund. It never reopens fulfilment or consumes restored stock again.

Receipt links authorize access to that order's payment controls for seven days. Customers can generate a fresh link from owned account history. Keep links private. Direct UPI references and public payee details are stored; card details, PINs and OTPs are not collected by the store. Razorpay receives checkout contact details only when the customer explicitly starts its payment flow.

## Tests

`npm.cmd run test:admin` and `npm.cmd run test:browser` start a loopback-only fake provider with fixed fake test credentials, an isolated database and a dummy UPI recipient. They test verification failures, exact amounts, unsigned/replayed webhooks, manual UPI acknowledgement, provider order reuse, refunds and late payments. They do not call the real provider or transfer money. Live gateway activation and settlement must be verified separately with the merchant account.

`npm.cmd run test:payments` runs the isolated HTTP/payment and focused UPI/gateway/admin browser flows without the full storefront layout matrix. It is also included in the regular browser suite.

Provider references: [Razorpay integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/), [payment lookup](https://razorpay.com/docs/api/payments/fetch-with-id/).

Gateway test payments are labelled TEST MODE, excluded from paid sales totals and blocked from fulfilment. Cancel test orders before switching to live keys; an existing order cannot switch between test and live mode.
