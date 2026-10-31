# SubFlow core API contract checklist

Audited against `origin/main:docs/api-contract.md` and the core route handlers on 2026-10-31. This is an internal frontend reference; it does not add or imply unsupported endpoints.

## Shared rules

- [x] Responses use `{ data, error, meta }`.
- [x] Financial values are decimal strings; dates are `YYYY-MM-DD`; timestamps are ISO 8601 UTC.
- [x] Server-side Supabase Auth validates the session and loads the role from `profiles`.
- [x] The client never submits a role or uses service-role credentials.
- [x] Expected errors: `400` validation/business input, `401` unauthenticated, `403` unauthorized, `404` missing/not visible, `409` conflict, `500` unexpected failure.
- [x] Frontend proxy forwards the authenticated request to `SUBFLOW_BACKEND_URL`.

## Resource contracts

| Resource | Read | Create/update | Roles | Frontend mapping |
| --- | --- | --- | --- | --- |
| Products | `GET /api/products` with `is_active`, `search` | `POST /api/products` (`sku`, `name`, `description`, `is_active`) | Read: `admin`, `staff`; create: `admin` | `ProductRecord`, `CreateProductInput` |
| Plans | `GET /api/plans` with `is_active`, `product_id` | `POST /api/plans` (`product_id`, `name`, `description`, `billing_interval`, `interval_count`, `price`, `currency`, `tax_rate`, `is_active`) | Read: `admin`, `staff`; create: `admin` | `PlanRecord`, `CreatePlanInput` |
| Customers | `GET /api/customers` with `search`, `is_active` | `POST /api/customers` (`display_name`, `company_name`, `email`, `phone`, `billing_address`, `auth_user_id`) | `admin`, `staff` | `CustomerRecord`, `CreateCustomerInput` |
| Subscriptions | `GET /api/subscriptions` with `customer_id`, `status` | `POST /api/subscriptions` (draft only); `PATCH /api/subscriptions/:id` | Read: `admin`, `staff`, `customer`; create/update: `admin`, `staff` | `SubscriptionRecord`, `CreateSubscriptionInput` |
| Invoices | `GET /api/invoices` with `customer_id`, `subscription_id`, `status`, `overdue_only` | No standalone create/update endpoint | Read: `admin`, `staff`, `customer` with customer scoping | `InvoiceRecord` |
| Billing | `POST /api/billing/run` with optional non-future `as_of_date` | Generates due invoices transactionally | `admin` only | Not currently exposed as a generic invoice-create form |
| Payments | `GET /api/payments` with optional `invoice_id`; newest 500 | `POST /api/payments` (`invoice_id`, `amount`, `payment_method`, optional `paid_at`, `reference`, `notes`) | `admin`, `staff`; customers receive `403` | `PaymentRecord`; POST returns direct `data` and updated invoice in `meta.invoice` |
| Dashboard | `GET /api/dashboard` with optional `from`, `to` | Read-only aggregate | `admin`, `staff` | `DashboardRecord`; no live time-series field in core response |

## Lifecycle and status checklist

- [x] Subscription statuses: `draft`, `quotation`, `confirmed`, `active`, `closed`.
- [x] Supported transitions: `draft → quotation → confirmed → active → closed`.
- [x] Invoice statuses: `draft`, `issued`, `partially_paid`, `paid`, `overdue`, `void`.
- [x] Billing creates invoice lines from subscription snapshots and prevents duplicate subscription periods.
- [x] Payment creation rejects void invoices and overpayments; the database trigger updates invoice paid/due amounts and status.
- [x] Payment response is **not** `{ payment, invoice }`; it is `data: PaymentRecord` plus `meta.invoice`.

## Shared UI audit

- [x] `PageHeader` exists in `src/components/admin/admin-shell.tsx` and uses the shared `.button` styling.
- [x] Shared button, input, select, table, modal/dialog, status badge, empty, error, and loading styles are currently provided by global CSS and route components.
- [x] The login structural CSS is present in `src/app/admin-theme.css`, loaded last by `src/app/layout.tsx`.
- [x] Products and plans use their existing CSS module with a deliberate literal-class compatibility layer in `admin-theme.css`.
- [ ] A standalone toast abstraction is not present; current forms surface inline errors and loading states. No new toast implementation is introduced in this contract-only block.
- [ ] Data-table, dialog, and field controls are not yet consolidated into a single React primitive. Existing route-specific implementations remain unchanged to avoid duplicating business logic.

## Verification notes

- Core contract comparison completed against `origin/main`.
- No backend, migration, portal, or quotation files changed.
- Live API execution still requires the configured Supabase session and authorized test account.
