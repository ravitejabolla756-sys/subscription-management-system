import type { Customer, Invoice, Payment, Subscription } from "@/lib/demo-data";

export type ApiResult<T> = { data: T; source: "demo" | "api" };
export type AdminApi = {
  listCustomers(): Promise<ApiResult<Customer[]>>;
  listSubscriptions(): Promise<ApiResult<Subscription[]>>;
  listInvoices(): Promise<ApiResult<Invoice[]>>;
  listPayments(): Promise<ApiResult<Payment[]>>;
};

const endpoint = process.env.NEXT_PUBLIC_API_URL;
export function createAdminApi(): AdminApi {
  const request = async <T>(path: string, fallback: T): Promise<ApiResult<T>> => {
    if (!endpoint) return { data: fallback, source: "demo" };
    try {
      const response = await fetch(`${endpoint}${path}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`API request failed: ${response.status}`);
      return { data: (await response.json()) as T, source: "api" };
    } catch { return { data: fallback, source: "demo" }; }
  };
  return {
    listCustomers: () => import("@/lib/demo-data").then(({ demoCustomers }) => request("/customers", demoCustomers)),
    listSubscriptions: () => import("@/lib/demo-data").then(({ demoSubscriptions }) => request("/subscriptions", demoSubscriptions)),
    listInvoices: () => import("@/lib/demo-data").then(({ demoInvoices }) => request("/invoices", demoInvoices)),
    listPayments: () => import("@/lib/demo-data").then(({ demoPayments }) => request("/payments", demoPayments)),
  };
}
