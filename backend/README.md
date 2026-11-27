# Backend database setup

The Prisma schema uses PostgreSQL. From the `backend` directory, create your
local environment file from the template and edit it with your database
connection string and a private JWT secret:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Never commit `.env` or put real credentials in `.env.example`.

From the `backend` directory:

```sh
npm install
npm run db:generate
npm run db:migrate
npm run db:studio
```

`db:migrate` creates a development migration and applies it. Use
`npm run db:deploy` to apply committed migrations in deployment environments.

The catalog supports multiple categories per laptop. Suggested category examples
include Gaming, Business, Student, Ultrabook, Workstation, and Creator; create
categories as needed rather than being limited to a fixed list.

Laptop records include core CPU, memory, storage, graphics, display, operating
system, refurbished grade, battery health, condition notes, warranty, pricing,
stock, and ordered product images.

The ecommerce schema also includes customer/admin accounts, saved addresses,
one cart per customer, checkout sessions, orders with product and address
snapshots, and payment attempts. Store only payment-provider references and
statuses in this database; card numbers, CVVs, and other raw payment credentials
must remain with a PCI-compliant payment provider. Shipment records support
carrier, tracking, and delivery status.

To create or update the database tables, configure `DATABASE_URL` in `backend/.env`
and run `npm run db:migrate`. The migration records the schema changes so they
can also be applied to deployment databases with `npm run db:deploy`.

If startup reports Prisma `P1001` ("Can't reach database server"), check that
the hostname in `DATABASE_URL` is the actual PostgreSQL server address—not a
placeholder such as `base` or `HOST`—and that the server is running and accepts
connections on the configured port. Local PostgreSQL commonly uses
`localhost:5432`; hosted databases require the host supplied by that provider.
The API checks database connectivity before listening, so it will not report
itself as ready while the database is unreachable.

## Ecommerce API

Set `DATABASE_URL` and a random `JWT_SECRET` (at least 32 characters) in
`backend/.env`. Set the AWS and Razorpay values in that file to enable image
uploads and online payments. Optionally set `PORT` (defaults to `3001`) and `CORS_ORIGIN`
(comma-separated frontend origins; defaults to `http://localhost:5173`). Start
the API from this directory with:

```sh
npm run dev
```

All API routes are under `/api`. Authentication uses bearer tokens returned by
register and login. New accounts are customers; promote trusted staff to the
`ADMIN` role through a controlled database operation.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a customer account |
| POST | `/api/auth/login` | Public | Sign in and receive a bearer token |
| GET | `/api/auth/me` | Customer | Get the authenticated account |
| POST | `/api/inquiries` | Public | Submit a customer support/contact inquiry |
| GET | `/api/laptops` | Public | Search, filter by availability, popularity (`popularity=best-seller,trending`), brands, RAM, storage, processor, category, condition, and price; paginate active laptops. Selecting both popularity values returns their union, ordered by best-seller rank then trending rank. |
| GET | `/api/laptops/best-sellers` | Public | List the five top-selling active laptops; add `?all=true` for the full list; shows featured in-stock laptops before sales exist |
| GET | `/api/laptops/trending` | Public | List the five active laptops with the most completed sales in the last 30 days; add `?all=true` for the full list; shows featured in-stock laptops before recent sales exist |
| GET | `/api/laptops/filters` | Public | Get available brand, grade, category, and price filter values |
| GET | `/api/search/suggestions?q=think` | Public | Get up to six matching laptop suggestions |
| GET | `/api/laptops/:id` | Public | Get a laptop |
| GET | `/api/categories` | Public | List laptop categories |
| POST/PATCH/DELETE | `/api/categories[/:id]` | Admin | Manage categories |
| POST/PATCH/DELETE | `/api/laptops[/:id]` | Admin | Create, edit, or archive laptops |
| GET | `/api/laptops/admin` | Admin | List laptops across statuses |
| GET | `/api/laptops/admin/:id` | Admin | View a draft, archived, or active laptop |
| GET/PATCH | `/api/admin/users[/:id]` | Admin | List users or update role/account status |
| GET | `/api/admin/dashboard` | Admin | Read product, stock, order, and sales summary |
| GET | `/api/admin/products` | Admin | Search/filter products, statuses, and stock levels |
| GET | `/api/admin/products/:id` | Admin | View complete product and recent inventory history |
| POST | `/api/admin/products/:id/inventory-adjustments` | Admin | Make an audited stock adjustment |
| GET | `/api/admin/products/:id/inventory` | Admin | List paginated inventory movements |
| GET | `/api/admin/orders` | Admin | Search and filter orders |
| GET | `/api/admin/inquiries` | Admin | Search and paginate customer inquiries |
| GET/PATCH | `/api/admin/inquiries/:id` | Admin | View an inquiry, assign it, update its status, or add internal notes |
| POST | `/api/admin/uploads/product-images` | Admin | Get a short-lived S3 upload form for a product image |
| GET/POST/PATCH/DELETE | `/api/admin/coupons[/:id]` | Admin | Manage coupons; DELETE deactivates a coupon |
| GET | `/api/admin/reviews` | Admin | List reviews awaiting moderation |
| PATCH | `/api/admin/reviews/:id/moderation` | Admin | Publish or reject a pending review |
| GET/POST | `/api/account/addresses` | Customer | List or save addresses |
| GET/PATCH | `/api/account/profile` | Customer | Read or update account profile |
| POST | `/api/account/password` | Customer | Change password and revoke prior bearer tokens |
| PATCH/DELETE | `/api/account/addresses/:id` | Customer | Edit or remove an owned address |
| GET | `/api/cart` | Customer | View the current cart |
| POST | `/api/cart/items` | Customer | Add a laptop by `laptopId` and `quantity` |
| PATCH/DELETE | `/api/cart/items/:itemId` | Customer | Change or remove a cart item |
| DELETE | `/api/cart` | Customer | Empty the current cart |
| GET | `/api/wishlist` | Customer | View wishlist and product details |
| POST/DELETE | `/api/wishlist/items[/:laptopId]` | Customer | Add or remove a wishlist item |
| GET/POST | `/api/laptops/:laptopId/reviews` | Public/Customer | List published reviews or submit a verified-purchase review |
| POST | `/api/orders/coupons/validate` | Customer | Preview an eligible coupon against the current cart |
| POST | `/api/orders/checkout` | Customer | Create order from cart, addresses, and optional coupon code |
| POST | `/api/orders/:id/payments/session` | Customer | Create or reuse a Razorpay order for an owned order |
| POST | `/api/orders/:id/payments/verify` | Customer | Verify checkout signature and confirm payment with Razorpay |
| POST | `/api/webhooks/razorpay` | Razorpay | Process signed payment-authorized/captured/failed webhooks |
| GET | `/api/orders` | Customer/Admin | List own orders or all orders for admins |
| GET | `/api/orders/:id` | Customer/Admin | View an order (customers can only view their own) |
| POST | `/api/orders/:id/cancel` | Customer | Cancel an eligible unpaid order |
| POST | `/api/orders/admin/:id/cancel` | Admin | Cancel an eligible unpaid order and restore stock |
| PATCH | `/api/orders/admin/:id/status` | Admin | Update order fulfillment status |
| PATCH | `/api/orders/admin/payments/:paymentId/status` | Admin | Reconcile payment status |
| POST | `/api/orders/admin/:orderId/shipments` | Admin | Add shipment tracking |
| PATCH | `/api/orders/admin/shipments/:shipmentId` | Admin | Update shipment tracking |
| GET | `/api/health` | Public | Check API/database connectivity |

Checkout calculates prices from the database, reserves stock in a transaction,
applies eligible coupon discounts in the same transaction, and snapshots the
products and addresses into the order. Inventory changes are recorded in an
auditable movement ledger. Customers can review products only after a delivered
purchase; submitted reviews stay pending until admin moderation. Shipping and taxes are currently zero because no rates/tax rules are configured.
Razorpay checkout requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
`RAZORPAY_WEBHOOK_SECRET`; configure the webhook URL as
`https://your-api.example.com/api/webhooks/razorpay` and subscribe to
`payment.authorized`, `payment.captured`, and `payment.failed`. Online orders reserve stock for 15 minutes. Expired unpaid orders are cancelled
by the API worker and their stock and coupon redemption are released. A late
Razorpay capture on a cancelled order, or a duplicate captured attempt, is
recorded and flagged as requiring a refund; provider-backed refunds are not
automated. The checkout
verification endpoint also validates the signature and fetches payment status
from Razorpay before changing the order. Razorpay payment statuses cannot be
changed through the admin reconciliation endpoint. Never send raw card
credentials or provider secrets to this API.

For Razorpay payments, create the order through `/api/orders/checkout`, then
request `/api/orders/:id/payments/session` and use the returned public `keyId`,
`razorpayOrderId`, amount, and currency with Razorpay Checkout. Post its
`razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` back to
`/api/orders/:id/payments/verify`. Webhooks are also signature-verified using
the unparsed request body. Configure HTTPS and keep the key secret and webhook
secret private.

### Product image storage

Set `AWS_REGION` and `AWS_BUCKET_NAME` in `backend/.env`. The AWS SDK uses
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the same file when both are
present; otherwise, it uses the AWS default credential provider (such as an
instance role). `AWS_S3_BUCKET` is also accepted as a bucket-name fallback.
Optionally set `AWS_S3_PUBLIC_URL` to the HTTPS CloudFront or other public
image-serving base URL. If omitted, the API forms image URLs using the standard
regional S3 bucket endpoint.
Grant that identity only the S3 permissions needed to write objects under the
`products/` prefix of the configured bucket. `AWS_S3_PUBLIC_URL` should normally
be the HTTPS CloudFront distribution URL backed by this bucket. Do not make the
bucket public merely to serve images.

An admin requests an upload form with `contentType` and `sizeBytes`, uploads the
image directly to the returned S3 `uploadUrl` using `multipart/form-data` and
all returned `fields`, then saves the returned `imageUrl` in the product's
`images` array. Forms expire after 10 minutes and accept JPEG, PNG, WebP, or
AVIF images up to 10 MB. Configure the S3 bucket CORS policy to allow `POST`
from each actual frontend origin. Example:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://your-store.example.com"],
    "AllowedMethods": ["POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Email verification and password recovery, tax calculation, shipping-rate
calculation, and provider-backed refunds are not implemented; configure the
required provider and business rules before enabling those workflows.

Public inquiries are rate-limited and stored for admins to process; this API
does not send confirmation emails. Customers should not include payment-card
details or other highly sensitive information in inquiry messages.

The inventory/reviews/coupons additions are in the
`20261022131500_inventory_movement_audit` migration; Razorpay order tracking
adds `20261022141100_razorpay_payment_orders`, and online order expiry adds
`20261022142200_expire_unpaid_orders`. Customer inquiries add
`20261022143000_support_inquiries`. Apply pending migrations with
`npm run db:deploy` in a configured deployment environment before using the
affected endpoints.

Laptop search accepts `search`, `brand`, `grade`, `category`, `minPrice`,
`maxPrice`, `featured`, `sort` (`newest`, `price_asc`, `price_desc`), `page`,
and `pageSize` query parameters.
