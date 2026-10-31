# Automatic Discount Rules — Backend Milestone

This milestone adds automatic recurring-invoice promotions while retaining the
existing `POST /api/billing/run` and invoice response envelopes.

## Deployment order

Apply the existing `001`–`004` migrations first. Then apply
`supabase/migrations/005_automatic_discount_rules.sql` to a disposable staging
Supabase project **before production**. Migration 005 adds fields and replaces
the existing `run_due_billing` function. Do not run migration 003 afterward.

The migration is **not applied automatically** by a GitHub commit. Production
billing must not be used to discover migration errors.

## Endpoints

`GET /api/discounts` — admin/staff, HTTP 200, returns
`{data: DiscountRule[], error:null, meta:{count:number}}`.

`POST /api/discounts` — admin only, HTTP 201, returns
`{data: DiscountRule, error:null, meta:{}}`.

Example:
```json
{
  "code": "BULK10",
  "description": "Ten percent off eligible orders",
  "discount_type": "percentage",
  "value": "10.00",
  "minimum_spend": "500.00",
  "minimum_quantity": "2",
  "product_id": null,
  "valid_from": "2026-10-01",
  "valid_until": "2026-12-31",
  "max_redemptions": 100,
  "is_active": true
}
```

`product_id: null` discounts an entire subscription; setting a product UUID
applies only to lines with that product. Only admin can create rules; ordinary
customers cannot read or write them. The shared error envelope and authentication
semantics match `docs/api-contract.md`.

## Policy & invoice calculation

- An active rule must be within its effective dates, satisfy minimum spend and
  quantity, and have unused redemptions.
- The **single highest-value eligible** automatic rule wins. Rules do not stack
  with other automatic rules, although existing subscription-line discounts
  still apply first.
- Fixed and percentage discounts are capped at the eligible pre-tax subtotal.
- Discount cents are allocated deterministically to invoice lines, with tax
  calculated from each discounted net line.
- Each created invoice records `discount_rule_id` and increments
  `redemption_count` in the same billing transaction. Repeating the same
  billing period must create neither a duplicate invoice nor an extra redemption.
- The billing routine locks due subscriptions and eligible rule rows. A billing
  batch still caps at 250 due subscriptions, per the existing behavior.

## Required staging verification

1. Create one eligible and one ineligible rule; confirm admin can create,
   staff can read, and customers are forbidden.
2. Bill a due subscription with a 10% rule and 18% tax. Check the invoice
   header equals the sum of invoice lines and tax is after discount.
3. Run billing again; verify no duplicate and unchanged redemption count.
4. Exercise product-scoped discount, minimum spend, minimum quantity, expiry,
   fixed-amount cap, and maximum redemption count.
5. Test two concurrent billing calls and two subscriptions competing for a
   rule with a single remaining redemption.
6. Re-run the existing 61-assertion integration suite on the staging database
   and test a fresh subscription without any discount rule.

The above checks are a test **plan**, not claims that live SQL has passed.
