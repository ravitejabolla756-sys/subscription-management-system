# SubFlow Customer Portal and Quotations Handoff

## 1. Project overview

This is the `feature/portal` handoff for the Customer Portal and Quotations
module. It is a Next.js 16 App Router prototype using Tailwind CSS, Lucide
icons, and Recharts.

Important: the current UI is demo-data driven. The pages do not yet call
Supabase or the deployed backend. Values shown for customers, subscriptions,
invoices, quotations, charts, dates, and amounts come from
`src/app/portal/_components/portal-data.ts`.

The deployed core backend is:

`https://subscription-management-system-jade.vercel.app`

The deployed `main` backend must be treated separately from advanced backend
work in later PRs. Do not consume advanced endpoints until they are deployed.

## 2. Completed features

- Customer portal shell with desktop sidebar and mobile navigation.
- Overview dashboard at `/portal`.
- Subscription list and detail routes.
- Invoice list and detail routes.
- Quotations list and detail routes.
- Shared headings, status pills, demo notice, and empty-state components.
- Loading and error boundaries for portal and quotations.
- Local TypeScript API contract types for subscriptions and invoices.
- Responsive cards, tables, detail layouts, and a Recharts spend chart.

The current visual palette is blue/navy (`#0c1b33`, blue accents, white and
slate cards), not the requested final black/yellow identity.

## 3. Route status

### `/portal`

File: `src/app/portal/page.tsx`

Shows demo active-subscription count, hard-coded monthly spend and next
billing data, outstanding balance derived from demo invoices, a six-month demo
chart, a demo renewal card, and demo active subscriptions. Navigation works.
“Download statement” is disabled. No authentication, live data, notifications,
or statement download is implemented.

### `/portal/subscriptions`

File: `src/app/portal/subscriptions/page.tsx`

Shows demo subscription cards with plan, price, cadence, status, dates, and
links to demo detail pages. There are no API calls, filters, pagination, or
customer actions.

### `/portal/subscriptions/[id]`

File: `src/app/portal/subscriptions/[id]/page.tsx`

Uses `findSubscription(id)` against demo data. Shows plan, price, start date,
next renewal, and activity copy. Update payment method, invoice download, and
pause buttons are disabled. `canManageSubscription` is hard-coded to `false`.
IDs such as `sub-analytics` are not database UUIDs.

### `/portal/invoices`

File: `src/app/portal/invoices/page.tsx`

Shows demo totals, paid/outstanding summaries, and an invoice table. Search is
visual only. Download buttons are disabled. No real invoice API, filters,
pagination, or customer authorization is connected.

### `/portal/invoices/[id]`

File: `src/app/portal/invoices/[id]/page.tsx`

Uses `findInvoice(id)` against demo data. Shows demo status, billing period,
dates, one summary line, total, and payment summary. PDF download and payment
actions are disabled. Real invoice lines, taxes, discounts, and payments are
not connected.

### `/quotations`

Files: `src/app/quotations/page.tsx`, `layout.tsx`, `loading.tsx`, and
`error.tsx`.

Shows demo quotation cards with service, description, dates, amount, and
status. “Request a quote” is disabled because no customer quotation endpoint
is available in the deployed core contract.

### `/quotations/[id]`

File: `src/app/quotations/[id]/page.tsx`

Shows demo quotation items, totals, dates, status, and next steps. PDF and
“Request an update” are disabled. Acceptance, rejection, messaging, and live
quotation data are not implemented.

## 4. Architecture and file map

```text
src/app/portal/
  layout.tsx
  page.tsx
  loading.tsx
  error.tsx
  subscriptions/page.tsx
  subscriptions/[id]/page.tsx
  invoices/page.tsx
  invoices/[id]/page.tsx
  _components/portal-shell.tsx
  _components/portal-data.ts
  _components/portal-api.ts

src/app/quotations/
  layout.tsx
  page.tsx
  loading.tsx
  error.tsx
  [id]/page.tsx
```

`portal-shell.tsx` contains `PortalShell`, `DemoNotice`, `PageHeading`,
`StatusPill`, and `EmptyState`. `portal-data.ts` contains UI types, demo
records, chart data, and `findSubscription`, `findInvoice`, and
`findQuotation`. `portal-api.ts` contains API types and path constants only;
there is no fetch adapter.

Styling is mostly inline Tailwind classes. Global defaults are in
`src/app/globals.css`. The branch has no Supabase client, SSR session helper,
proxy, middleware, or portal-specific API adapter.

Dependencies include Next.js 16.4.3, React 19.3.0, `lucide-react`, `recharts`,
Tailwind, TypeScript, and ESLint.

## 5. Backend integration

No portal page currently makes a runtime API request. The only declared paths
are in `src/app/portal/_components/portal-api.ts`:

| Feature | Method | Endpoint | Auth | Current usage | Deployment-tested |
|---|---|---|---|---|---|
| Subscriptions | GET | `/api/subscriptions` | Supabase SSR customer session | Not used; demo data | No |
| Invoices | GET | `/api/invoices` | Supabase SSR customer session | Not used; demo data | No |

Expected response envelope:

```ts
type ApiEnvelope<T> = {
  data: T;
  error: { code: string; message: string; details?: Record<string, unknown> } | null;
  meta: Record<string, unknown>;
};
```

Postgres financial values should be treated as decimal strings. Customer RLS
must restrict records to the authenticated user’s linked customer.

Do not assume these advanced endpoints exist on deployed `main`:

- `/api/customer/dashboard`
- `/api/customer/subscriptions/:id`
- `/api/invoices/:id` and `/api/invoices/:id/print`
- quotation-template endpoints
- signup, reset, staff, and variant endpoints

The portal types are also stale relative to later backend work: they omit the
`paused` subscription state and newer invoice states such as `confirmed` and
`sent`.

## 6. Authentication and security

Authentication is not implemented in this branch. `PortalShell` uses the hard-
coded demo identity Jordan Davis (`jordan@northstar.co`) and the sign-out
button has no handler. There is no login redirect, session check, profile
lookup, role check, or server-side customer authorization.

Required integration rules:

1. Use the final application’s Supabase SSR client and session-refresh proxy.
2. Require an authenticated user before rendering customer records.
3. Never trust a customer ID supplied by the browser as proof of ownership.
4. Enforce ownership through server-side role checks and database RLS.
5. Add loading, empty, unauthorized, expired-session, and API-error states.
6. Never expose a Supabase secret/service key to browser code.

## 7. Git status and integration notes

The inspected branch is:

```text
feature/portal
latest local remote-tracking commit: ee5691e
```

At inspection time:

```text
origin/main...origin/feature/portal = 18 2
```

The portal ref was 18 commits behind `main` and 2 commits ahead. A fresh
`git fetch origin` could not refresh refs from the backend checkout because
`.git/FETCH_HEAD` was permission-blocked and network resolution failed. Recheck
before integration.

The portal checkout was clean before this handoff document. The separate
backend checkout contains staged backend work; do not switch branches there or
reset it.

The portal branch is based on an earlier project state. Integrate through a
reviewed branch and pull request; do not reset or force-push either branch.

## 8. Verification

The actual `origin/feature/portal` snapshot was verified in an isolated copy:

```text
npm run lint       PASS
npx tsc --noEmit   PASS
npm run build      PASS
```

The build generated the seven requested route groups:

```text
/portal
/portal/subscriptions
/portal/subscriptions/[id]
/portal/invoices
/portal/invoices/[id]
/quotations
/quotations/[id]
```

Local HTTP smoke testing was blocked by the execution environment’s socket
policy. Browser/authenticated runtime behavior is not claimed. No Supabase
records were read or written by portal verification.

`npm ci` reported 16 moderate advisories in this older branch. Dependencies
were not upgraded.

## 9. Prioritized pending work

### P0 — live and secure portal

- Integrate Supabase SSR session handling and login redirect.
- Replace the hard-coded identity with the authenticated profile.
- Replace `portal-data.ts` with API adapters.
- Connect customer-scoped subscriptions and invoices.
- Verify RLS with two customer accounts and Admin/Staff.
- Add loading, empty, unauthorized, expired-session, and error states.

### P1 — customer workflows

- Connect subscription detail and real invoice lines.
- Add pause, resume, cancel, and renew only after backend deployment.
- Connect customer payment history and invoice print/download.
- Preserve decimal-string financial values and correct currency formatting.

### P1 — quotations

- Confirm a deployed customer-readable quotation contract.
- Connect list/detail data and remove demo quotation records.
- Add request, accept/reject, update-request, and printable actions only after
  backend authorization is approved.

### P2 — design and quality

- Apply black `#0A0C0F`, yellow `#F5C518`, white, and neutral grays.
- Verify mobile, tablet, and desktop layouts.
- Add keyboard/focus accessibility states.
- Test malformed IDs, loading, empty, error, and unauthorized states.
- Recheck dependency advisories without force-upgrading packages.

## 10. Known blockers

- All business data is demo data.
- Customer authentication and authorization are absent.
- Search, downloads, payment updates, pause, quotation requests, PDFs,
  messaging, and acceptance are disabled or visual-only.
- The visual theme is blue/navy rather than black/yellow.
- API types are not synchronized with the later backend contract.
- No portal request has been tested against the deployed Vercel backend.
- Advanced PR functionality must not be assumed deployed.

## 11. Setup

```powershell
git clone https://github.com/ravitejabolla756-sys/subscription-management-system.git C:\subscription-management-system-portal
Set-Location C:\subscription-management-system-portal
git switch --track -c feature/portal origin/feature/portal
git config --local user.name "NRVS NARASIMAHAM"
git config --local user.email "narasimham1108@gmail.com"
npm ci
npm run dev -- --port 3001
```

Do not commit `.env.local` or any service key. Only public Supabase values may
be placed in browser environment configuration.

## 12. Exact next steps for Member 2

1. Preserve this portal branch and the backend branch separately.
2. Integrate the portal into a reviewed branch from the current backend/main
   baseline.
3. Add the shared Supabase SSR client and customer session guard.
4. Replace demo data with subscriptions and invoices API adapters.
5. Verify customer-only RLS with an authenticated customer session.
6. Integrate only endpoints confirmed on deployed `main`.
7. Coordinate advanced backend deployment before enabling portal actions.
8. Apply the black-yellow design and responsive/accessibility fixes.
9. Run lint, TypeScript, build, and authenticated browser workflow tests.
10. Commit reviewed portal-owned changes to `feature/portal` and open a PR.
