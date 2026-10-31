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
  sku: string;
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
  email: string;
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
export type DashboardRecord = {
  active_subscriptions: number;
  revenue_collected: string;
  outstanding_amount: string;
  overdue_invoices: number;
  subscription_summary: Record<SubscriptionStatus, number>;
};
export type CreateCustomerInput = {
  display_name: string;
  company_name: string;
  email: string;
  phone: string;
  billing_address: BillingAddress | null;
  auth_user_id: string | null;
};
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
  paid_at: string;
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
  listPlans(query?: URLSearchParams): Promise<PlanRecord[]>;
  listCustomers(query?: URLSearchParams): Promise<CustomerRecord[]>;
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
  createPayment(input: CreatePaymentInput): Promise<PaymentRecord>;
  dashboard(query?: URLSearchParams): Promise<DashboardRecord>;
};

export function createAdminApi(
  baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "",
): AdminApi {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${baseUrl}/api${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
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
    listPlans: (query) => request(`/plans${query ? `?${query}` : ""}`),
    listCustomers: (query) => request(`/customers${query ? `?${query}` : ""}`),
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
