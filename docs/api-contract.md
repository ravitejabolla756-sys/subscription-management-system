# SubFlow API Contract

This document defines the Phase 1 integration contract for the frontend and the
future Next.js Route Handlers. All field names use `snake_case` and match the
Supabase schema. Examples are illustrative and contain no production data.

## Authentication

Requests are authenticated with the Supabase SSR session cookie established by
Supabase Auth. Route Handlers must verify the current user server-side and load
the role from `profiles`. Clients must not send a role to elevate permissions.

Responses use this envelope:

```json
{
  "data": {},
  "error": null,
  "meta": {}
}
```

Errors use:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {}
  }
}
```

Common status codes:

- `200` successful read or update
- `201` successful creation
- `400` malformed or invalid business input
- `401` missing or invalid authentication
- `403` authenticated but not authorized
- `404` resource does not exist or is not visible to the caller
- `409` uniqueness or state conflict
- `500` unexpected server failure

## Shared types

```ts
type AppRole = "admin" | "staff" | "customer";
type SubscriptionStatus =
  | "draft"
  | "quotation"
  | "confirmed"
  | "active"
  | "closed";
type BillingInterval = "daily" | "weekly" | "monthly" | "yearly";
type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";
type PaymentMethod = "cash" | "card" | "bank_transfer" | "upi" | "other";
```

Financial values are decimal strings in JSON to avoid JavaScript floating-point
rounding. Dates use `YYYY-MM-DD`; timestamps use ISO 8601 UTC strings.

## Products

### `GET /api/products`

Allowed roles: `admin`, `staff`.

Optional query parameters: `is_active`, `search`.

Response `200`:

```json
{
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "sku": "BL-SUPPORT",
      "name": "Priority Support",
      "description": "Business support service",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "error": null,
  "meta": { "count": 1 }
}
```

### `POST /api/products`

Allowed role: `admin`.

Request:

```json
{
  "sku": "BL-SUPPORT",
  "name": "Priority Support",
  "description": "Business support service",
  "is_active": true
}
```

The server derives audit fields and does not accept `id`, `created_by`, or
timestamps from the client.

## Plans

### `GET /api/plans`

Allowed roles: `admin`, `staff`.

Optional query parameters: `is_active`, `product_id`.

Response data contains `id`, `product_id`, `name`, `description`,
`billing_interval`, `interval_count`, `price`, `currency`, `tax_rate`, and
`is_active`.

### `POST /api/plans`

Allowed role: `admin`.

Request:

```json
{
  "product_id": "00000000-0000-0000-0000-000000000001",
  "name": "Monthly Priority Support",
  "description": "Monthly support plan",
  "billing_interval": "monthly",
  "interval_count": 1,
  "price": "25000.00",
  "currency": "INR",
  "tax_rate": "18.00",
  "is_active": true
}
```

## Customers

### `GET /api/customers`

Allowed roles: `admin`, `staff`. Customer callers receive only their own
customer record when a customer portal endpoint is added.

Optional query parameters: `search`, `is_active`.

Response data contains `id`, `auth_user_id`, `display_name`, `company_name`,
`email`, `phone`, `billing_address`, `is_active`, `created_at`, and
`updated_at`.

### `POST /api/customers`

Allowed roles: `admin`, `staff`.

Request:

```json
{
  "display_name": "Brightloop Software",
  "company_name": "Brightloop Software Pvt Ltd",
  "email": "billing@example.com",
  "phone": "+91-9000000000",
  "billing_address": {
    "line_1": "1 Demo Street",
    "city": "Hyderabad",
    "postal_code": "500001",
    "country": "IN"
  },
  "auth_user_id": null
}
```

The server validates that an optional `auth_user_id` exists and never changes a
user's profile role as part of customer creation.

`billing_address` may be `null` or omitted in the request. The API normalizes
those values to `{}` before inserting the customer because the database column
is non-null JSONB.

## Subscriptions

### `GET /api/subscriptions`

Allowed roles: `admin`, `staff`, `customer`. RLS limits customer results to
subscriptions whose customer is linked to the authenticated user.

Optional query parameters: `customer_id`, `status`.

Response data includes the subscription fields plus `customer` and `plan`
summaries when requested by the frontend integration.

### `POST /api/subscriptions`

Allowed roles: `admin`, `staff`.

Request:

```json
{
  "customer_id": "00000000-0000-0000-0000-000000000010",
  "plan_id": "00000000-0000-0000-0000-000000000020",
  "status": "draft",
  "start_date": "2026-01-01",
  "notes": "Annual support customer"
}
```

The server loads plan pricing and product data. Clients cannot provide invoice
totals or override the plan price.

### `PATCH /api/subscriptions/:id`

Allowed roles: `admin`, `staff`.

Request:

```json
{
  "status": "active",
  "start_date": "2026-01-01",
  "notes": "Activated after quotation approval"
}
```

Allowed transitions are `draft -> quotation -> confirmed -> active -> closed`.
The server sets billing dates and lifecycle timestamps; clients cannot mark an
invoice as paid through this endpoint.

## Invoices

### `GET /api/invoices`

Allowed roles: `admin`, `staff`, `customer`. Customer results are restricted by
RLS to their own invoices.

Optional query parameters: `customer_id`, `subscription_id`, `status`,
`overdue_only`.

Response data contains `id`, `invoice_number`, `customer_id`,
`subscription_id`, billing period dates, `status`, `issued_at`, `due_at`,
`subtotal_amount`, `discount_amount`, `tax_amount`, `total_amount`,
`paid_amount`, `due_amount`, and `invoice_lines`.

Invoice totals are server/database-generated values. The client must not submit
or update financial totals.

## Billing

### `POST /api/billing/run`

Allowed role: `admin` only.

Request:

```json
{
  "as_of_date": "2026-01-31"
}
```

The production endpoint must use the current UTC date when `as_of_date` is not
provided and must not accept a future date. It processes genuinely due active
subscriptions, creates invoice lines from subscription snapshots, advances the
next billing date, and relies on the unique subscription-period constraint for
duplicate protection.

Response `200`:

```json
{
  "data": {
    "processed": 1,
    "created_invoice_ids": [
      "00000000-0000-0000-0000-000000000030"
    ],
    "skipped": 0
  },
  "error": null,
  "meta": {}
}
```

Invoice creation and billing-date advancement must execute in one database
transaction. A later billing implementation should expose this as a protected
Postgres function/RPC or an equivalent transaction-safe server operation.

## Payments

### `GET /api/payments`

Allowed roles: `admin`, `staff`. Customers receive HTTP `403`.

Optional query parameter: `invoice_id` (UUID). Results are ordered by
`paid_at` descending and limited to the newest 500 records.

Response `200`:

```json
{
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000040",
      "invoice_id": "00000000-0000-0000-0000-000000000030",
      "amount": "40.00",
      "payment_method": "upi",
      "paid_at": "2026-01-31T10:30:00Z",
      "reference": "UPI-DEMO-001",
      "notes": "Partial settlement"
    }
  ],
  "error": null,
  "meta": { "count": 1 }
}
```

### `POST /api/payments`

Allowed roles: `admin`, `staff`.

Request:

```json
{
  "invoice_id": "00000000-0000-0000-0000-000000000030",
  "amount": "29500.00",
  "payment_method": "upi",
  "paid_at": "2026-01-31T10:30:00Z",
  "reference": "UPI-DEMO-001",
  "notes": "Full settlement"
}
```

The server verifies the invoice exists, rejects void invoices and overpayments,
and records `recorded_by` from the authenticated user. The database trigger
updates `paid_amount`, `due_amount`, and invoice status atomically.

Response `201` returns the created payment directly in `data`. The updated
invoice summary is returned in `meta.invoice`:

```json
{
  "data": {
    "id": "00000000-0000-0000-0000-000000000040",
    "invoice_id": "00000000-0000-0000-0000-000000000030",
    "amount": "40.00",
    "payment_method": "upi",
    "paid_at": "2026-01-31T10:30:00Z",
    "reference": "UPI-DEMO-001",
    "notes": "Partial settlement"
  },
  "error": null,
  "meta": {
    "invoice": {
      "id": "00000000-0000-0000-0000-000000000030",
      "status": "partially_paid",
      "total_amount": "118.00",
      "paid_amount": "40.00",
      "due_amount": "78.00"
    }
  }
}
```

## Dashboard

### `GET /api/dashboard`

Allowed roles: `admin`, `staff`; customer dashboards must use a future scoped
portal endpoint.

Optional query parameters: `from`, `to` using `YYYY-MM-DD`.

Response:

```json
{
  "data": {
    "active_subscriptions": 12,
    "revenue_collected": "125000.00",
    "outstanding_amount": "45000.00",
    "overdue_invoices": 2,
    "subscription_summary": {
      "draft": 1,
      "quotation": 2,
      "confirmed": 1,
      "active": 12,
      "closed": 3
    }
  },
  "error": null,
  "meta": {
    "from": "2026-01-01",
    "to": "2026-01-31"
  }
}
```

All dashboard values must come from aggregate database queries. No values are
hardcoded or derived from client-submitted totals.
