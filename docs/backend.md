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
- `GET|POST|PATCH|DELETE /api/admin/products` provides authenticated catalog CRUD. DELETE archives instead of deleting records.
- `POST /api/uploads/presign` creates a signed Cloudinary upload request; `/api/uploads/complete` verifies the returned Cloudinary signature and records asset metadata.

## Payments

`POST /api/checkout/session` resolves product/template prices from PostgreSQL, creates a pending order, and creates a Stripe Checkout Session. Client prices are never trusted. Supply an `Idempotency-Key` header for retry-safe requests.

Configure Stripe to send Checkout events to `/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`. The webhook verifies signatures and updates orders idempotently.

## Cloudinary

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the deployment secret manager. The upload endpoint sends image bytes to Cloudinary, stores the returned secure URL and provider metadata in PostgreSQL, and never uses local filesystem storage.

## Security notes

Use a unique `AUTH_SECRET`, rotate the supplied test credentials if they were exposed outside this development workspace, and set production SMTP/admin credentials only through the hosting provider's secret manager. Never commit `.env.local`.
