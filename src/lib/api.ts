import { isUiPreview } from "@/lib/preview-mode";
import { createPreviewApi } from "@/lib/preview-data";

export type SubscriptionStatus =
  "draft" | "quotation" | "confirmed" | "active" | "closed";
export type BillingInterval = "daily" | "weekly" | "monthly" | "yearly";
export type InvoiceStatus =
  "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "void";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "upi" | "other";
export type BillingAddress = {
  line_1: string;
  city: string;
  postal_code: string;
  country: string;
};
export type ApiEnvelope<T> = {
  data: T;
  error: null | { code: string; message: string; details?: unknown };
  meta: Record<string, unknown>;
};
export type ProductRecord = {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type PlanRecord = {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  billing_interval: BillingInterval;
  interval_count: number;
  price: string;
  currency: string;
  tax_rate: string;
  is_active: boolean;
};
export type CustomerRecord = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: BillingAddress | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type SubscriptionRecord = {
  id: string;
  customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: string | null;
  customer?: Pick<CustomerRecord, "id" | "display_name" | "company_name">;
  plan?: Pick<PlanRecord, "id" | "name" | "price" | "currency">;
};
export type InvoiceRecord = {
  id: string;
  invoice_number: string;
  customer_id: string;
  subscription_id: string;
  billing_period_start: string;
  billing_period_end: string;
  status: InvoiceStatus;
  issued_at: string | null;
  due_at: string | null;
  subtotal_amount: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  paid_amount: string;
  due_amount: string;
  invoice_lines: unknown[];
};
export type PaymentRecord = {
  id: string;
  invoice_id: string;
  amount: string;
  payment_method: PaymentMethod;
  paid_at: string;
  reference: string | null;
  notes: string | null;
};
export type PaymentResponse = {
  payment: PaymentRecord;
  invoice: Pick<InvoiceRecord, "id" | "status" | "total_amount" | "paid_amount" | "due_amount">;
};
export type DashboardRecord = {
  active_subscriptions: number;
  revenue_collected: string;
  outstanding_amount: string;
  overdue_invoices: number;
  subscription_summary: Record<SubscriptionStatus, number>;
  revenue_series?: Array<{ label: string; revenue: number; subscriptions: number }>;
};
export type CreateCustomerInput = {
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: BillingAddress | null;
  auth_user_id: string | null;
};
export type CreateProductInput = Pick<ProductRecord, "sku" | "name" | "description" | "is_active">;
export type CreatePlanInput = Pick<PlanRecord, "product_id" | "name" | "description" | "billing_interval" | "interval_count" | "price" | "currency" | "tax_rate" | "is_active">;
export type CreateSubscriptionInput = {
  customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: string;
  notes: string;
};
export type CreatePaymentInput = {
  invoice_id: string;
  amount: string;
  payment_method: PaymentMethod;
  paid_at?: string;
  reference: string;
  notes: string;
};

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
export type AdminApi = {
  listProducts(query?: URLSearchParams): Promise<ProductRecord[]>;
  createProduct(input: CreateProductInput): Promise<ProductRecord>;
  listPlans(query?: URLSearchParams): Promise<PlanRecord[]>;
  createPlan(input: CreatePlanInput): Promise<PlanRecord>;
  listCustomers(query?: URLSearchParams): Promise<CustomerRecord[]>;
  createCustomer(input: CreateCustomerInput): Promise<CustomerRecord>;
  listSubscriptions(query?: URLSearchParams): Promise<SubscriptionRecord[]>;
  createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<SubscriptionRecord>;
  updateSubscription(
    id: string,
    input: Partial<Pick<SubscriptionRecord, "status" | "start_date">> & {
      notes?: string;
    },
  ): Promise<SubscriptionRecord>;
  listInvoices(query?: URLSearchParams): Promise<InvoiceRecord[]>;
  listPayments(): Promise<PaymentRecord[]>;
  createPayment(input: CreatePaymentInput): Promise<PaymentResponse>;
  dashboard(query?: URLSearchParams): Promise<DashboardRecord>;
};

export class AuthenticationRequiredError extends ApiClientError {
  constructor() {
    super(401, "UNAUTHENTICATED", "Sign in to access the admin workspace.");
    this.name = "AuthenticationRequiredError";
  }
}
export function createAdminApi(
  baseUrl = "",
): AdminApi {
  if (isUiPreview) return createPreviewApi();
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new AuthenticationRequiredError();
    const response = await fetch(`${baseUrl}/api${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...init?.headers,
      },
    });
    let body: ApiEnvelope<T> | null = null;
    try {
      body = (await response.json()) as ApiEnvelope<T>;
    } catch {
      /* handled below */
    }
    if (!response.ok || !body || body.error)
      throw new ApiClientError(
        response.status,
        body?.error?.code ?? "REQUEST_FAILED",
        body?.error?.message ?? `Request failed with status ${response.status}`,
      );
    return body.data;
  };
  return {
    listProducts: (query) => request(`/products${query ? `?${query}` : ""}`),
    createProduct: (input) => request("/products", { method: "POST", body: JSON.stringify(input) }),
    listPlans: (query) => request(`/plans${query ? `?${query}` : ""}`),
    createPlan: (input) => request("/plans", { method: "POST", body: JSON.stringify(input) }),
    listCustomers: (query) => request(`/customers${query ? `?${query}` : ""}`),
    createCustomer: (input) => request("/customers", { method: "POST", body: JSON.stringify(input) }),
    listSubscriptions: (query) =>
      request(`/subscriptions${query ? `?${query}` : ""}`),
    createSubscription: (input) =>
      request("/subscriptions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    updateSubscription: (id, input) =>
      request(`/subscriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    listInvoices: (query) => request(`/invoices${query ? `?${query}` : ""}`),
    listPayments: () => request("/payments"),
    createPayment: (input) =>
      request("/payments", { method: "POST", body: JSON.stringify(input) }),
    dashboard: (query) => request(`/dashboard${query ? `?${query}` : ""}`),
  };
}
