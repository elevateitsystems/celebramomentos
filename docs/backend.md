# Celebramomentos backend

The project now includes a PostgreSQL/Prisma backend foundation. Copy `.env.example` to `.env.local` and fill in deployment values; local secrets are ignored by git.

## Database

```bash
npm run db:generate
npm run db:validate
npm run db:migrate -- --name init
```

The schema covers admin roles, catalog products and variants, postcard templates, assets, customers, addresses, orders, payments, discounts, shipping, contact messages, site content/settings, and audit logs.

## Admin API

- `POST /api/admin/login` authenticates an owner/admin/editor and sets an httpOnly session cookie. The first login can bootstrap the owner when the submitted credentials match `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- `POST /api/admin/logout` clears the session.
- `GET /api/admin/me` returns the current admin without the password hash.
- `GET|POST|PATCH|DELETE /api/admin/products` provides authenticated catalog CRUD (OWNER/ADMIN can write, EDITOR can read). DELETE removes the product; past orders keep their line name/price, and carts that still reference it are rejected at checkout. Setting `active: false` hides a product without deleting it.
- `POST /api/uploads/presign` creates a signed Cloudinary upload request; `/api/uploads/complete` verifies the returned Cloudinary signature and records asset metadata.

## Product catalog

`Product.kind` is the storefront category; each kind has one page:

| Kind | Category | Page |
| --- | --- | --- |
| `POSTCARD` | Cards (Tarjetas) | `/templates` → `/customize` |
| `WALL_ART` | Wall Art (Arte de pared) | `/wall-art` |
| `MAGNET` | Magnets (Imanes) | `/magnets` |
| `PHONE_CASE` | Phone Cases (Fundas de móvil) | `/phone-cases` |
| `MUG` | Mugs (Tazas) | `/mugs` |
| `CALENDAR` | Calendars (Calendarios) | `/calendars` |

- `GET /api/products?kind=…` is the public catalog: active products with their active sizes (`ProductVariant`) and options (`PersonalizationOption`). Category pages read it at request time, so admin changes show up on the next page load.
- The three card templates (Tradicional `template-3`, Collage `template-2`, Magazine `template-magazine`) are for Cards only. A Card product stores its template in `metadata.templateSlug`; other kinds cannot have one, and the API rejects any attempt to add one.
- Other kinds can have sizes (each with its own price), select options (`{ name, choices[], required }`) and `metadata.photoCount` (how many photos the customer uploads, 1–9). Sizes that are removed are deactivated rather than deleted, so past orders keep their reference.
- The cart and checkout re-price every line on the server (`resolveCartLine` in `lib/server/catalog.ts`). A line is rejected if its product was deleted or deactivated, if it uses a product from another category, if its Card template is archived, or if its size or option is no longer offered.

## Payments

`POST /api/checkout/session` resolves product/template prices from PostgreSQL, creates a pending order, and creates a Stripe Checkout Session. Client prices are never trusted. Supply an `Idempotency-Key` header for retry-safe requests.

Configure Stripe to send Checkout events to `/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`. The webhook verifies signatures and updates orders idempotently.

### PayPal (Orders v2)

Environment variables (server-side only):

| Variable | Value |
| --- | --- |
| `PAYPAL_CLIENT_ID` | REST app Client ID (Sandbox or Live) |
| `PAYPAL_CLIENT_SECRET` | REST app Secret. Never exposed to the browser |
| `PAYPAL_MODE` | `sandbox` (default) or `live` |
| `NEXT_PUBLIC_APP_URL` | Base URL that PayPal returns customers to |

Flow:

1. `POST /api/checkout/paypal/order` (customer session required; same body as the Stripe route with `payment: "paypal"`; optional `Idempotency-Key` header). It re-prices the server-side cart, creates a `PENDING` order and payment (`provider: "paypal"`), creates a PayPal order (`intent: CAPTURE`, EUR, with an item/shipping/discount breakdown) and returns `approvalUrl`.
2. The customer approves on PayPal, which redirects to `/checkout/paypal/return?token=<PayPal order id>`.
3. That page calls `POST /api/checkout/paypal/capture`. The server looks up the order for the signed-in customer, and if PayPal reports `APPROVED` it captures (`PayPal-Request-Id: capture-<paymentId>`). The order is marked `PAID` only when the capture is `COMPLETED` and its amount, currency and `custom_id` match the order. The `PENDING → PAID` update is conditional, so a payment cannot be finalised twice. Calling capture again on a paid order returns `paid` without contacting PayPal.
4. If the customer cancels, PayPal redirects to `/checkout?payment=cancelled&provider=paypal&token=…`. The checkout page calls `POST /api/checkout/paypal/cancel`, which checks PayPal first: an approved or completed order is reconciled, not cancelled. Otherwise the order and payment become `CANCELLED`. The cart is kept.
5. A declined funding source (`INSTRUMENT_DECLINED`) sends the customer back to PayPal to pick another one. Other capture rejections mark the payment `FAILED` and the order `CANCELLED`. A `PENDING` capture (PayPal review) leaves the order pending.

Nothing is charged until step 3 runs on the server, so an abandoned approval leaves the order `PENDING` with no money taken. A PayPal webhook is not required for this flow. If you later accept funding sources that settle asynchronously, add a `PAYMENT.CAPTURE.COMPLETED`/`DENIED` webhook (signature checked through `/v1/notifications/verify-webhook-signature`) to update orders whose capture stays `PENDING`.

Setup:

1. Apply the migrations (`npm run db:deploy`). `20261026120000_paypal_payments` adds `Payment.paypalOrderId` and `Payment.paypalCaptureId`.
2. Sandbox: create a REST app under *Sandbox* in the PayPal Developer Dashboard, set the three `PAYPAL_*` variables, and pay with a sandbox **personal** account (Dashboard → Testing tools → Sandbox accounts).
3. Live: create a *Live* REST app, set its credentials with `PAYPAL_MODE=live`, set `NEXT_PUBLIC_APP_URL` to the production domain, and make a small real payment (refund it afterwards) before announcing PayPal. Live payments have not been tested yet.

## Cloudinary

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the deployment secret manager. The upload endpoint sends image bytes to Cloudinary, stores the returned secure URL and provider metadata in PostgreSQL, and never uses local filesystem storage.

## Security notes

Use a unique `AUTH_SECRET`, rotate the supplied test credentials if they were exposed outside this development workspace, and set production SMTP/admin credentials only through the hosting provider's secret manager. Never commit `.env.local`.
