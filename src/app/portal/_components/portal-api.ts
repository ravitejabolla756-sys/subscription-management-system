/**
 * API contract types for the customer-facing surfaces.
 *
 * These types mirror docs/api-contract.md from origin/feature/backend. They are
 * intentionally kept separate from demo data until authenticated customer
 * portal endpoints are available.
 */

export type AppRole = "admin" | "staff" | "customer";
export type ApiSubscriptionStatus = "draft" | "quotation" | "confirmed" | "active" | "closed";
export type BillingInterval = "daily" | "weekly" | "monthly" | "yearly";
export type ApiInvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "void";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "upi" | "other";

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiEnvelope<T> = {
  data: T;
  error: ApiError | null;
  meta: Record<string, unknown>;
};

export type ApiCustomerSummary = {
  id: string;
  display_name: string;
  company_name?: string | null;
};

export type ApiPlanSummary = {
  id: string;
  name: string;
  description?: string | null;
  billing_interval: BillingInterval;
  interval_count: number;
  price: string;
  currency: string;
};

export type ApiSubscription = {
  id: string;
  customer_id: string;
  plan_id: string;
  status: ApiSubscriptionStatus;
  start_date: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  customer?: ApiCustomerSummary;
  plan?: ApiPlanSummary;
};

export type ApiInvoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  subscription_id: string;
  billing_period_start?: string;
  billing_period_end?: string;
  status: ApiInvoiceStatus;
  issued_at?: string | null;
  due_at?: string | null;
  subtotal_amount: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  paid_amount: string;
  due_amount: string;
  // The contract exposes invoice_lines but does not define its nested shape yet.
  invoice_lines: Array<Record<string, unknown>>;
};

export type SubscriptionListResponse = ApiEnvelope<ApiSubscription[]>;
export type InvoiceListResponse = ApiEnvelope<ApiInvoice[]>;

export const portalApiPaths = {
  subscriptions: "/api/subscriptions",
  invoices: "/api/invoices",
} as const;

export const portalApiCapabilities = {
  subscriptions: { read: true, customerMutation: false },
  invoices: { read: true, customerMutation: false },
  quotations: { read: false, customerMutation: false },
} as const;
