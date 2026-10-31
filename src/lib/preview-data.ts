import type {
  AdminApi,
  CreateCustomerInput,
  CreatePaymentInput,
  CreatePlanInput,
  CreateProductInput,
  CreateSubscriptionInput,
  CustomerRecord,
  DashboardRecord,
  InvoiceRecord,
  PaymentRecord,
  PlanRecord,
  ProductRecord,
  SubscriptionRecord,
} from "@/lib/api";

const date = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const id = (prefix: string) => `preview-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const copy = <T,>(value: T): T => structuredClone(value);

const productIds = { analytics: "preview-product-analytics", workspace: "preview-product-workspace", api: "preview-product-api" };
const planIds = { growth: "preview-plan-growth", scale: "preview-plan-scale", api: "preview-plan-api" };
const customerIds = { northstar: "preview-customer-northstar", atlas: "preview-customer-atlas", orbit: "preview-customer-orbit", bright: "preview-customer-bright", willow: "preview-customer-willow" };

let products: ProductRecord[] = [
  { id: productIds.analytics, sku: "ANL-001", name: "Analytics Pro", description: "Decision-ready revenue and subscription analytics.", is_active: true, created_at: date(90), updated_at: date(4) },
  { id: productIds.workspace, sku: "WRK-002", name: "Team Workspace", description: "A shared operating space for growing teams.", is_active: true, created_at: date(74), updated_at: date(8) },
  { id: productIds.api, sku: "API-003", name: "API Access", description: "Reliable billing data access for connected systems.", is_active: true, created_at: date(52), updated_at: date(11) },
];
let plans: PlanRecord[] = [
  { id: planIds.growth, product_id: productIds.analytics, name: "Growth", description: "For teams building a repeatable revenue engine.", billing_interval: "monthly", interval_count: 1, price: "2499.00", currency: "INR", tax_rate: "18.00", is_active: true },
  { id: planIds.scale, product_id: productIds.workspace, name: "Scale", description: "More seats, controls and room to grow.", billing_interval: "monthly", interval_count: 1, price: "7499.00", currency: "INR", tax_rate: "18.00", is_active: true },
  { id: planIds.api, product_id: productIds.api, name: "API Pro", description: "Usage-ready access for production integrations.", billing_interval: "yearly", interval_count: 1, price: "49999.00", currency: "INR", tax_rate: "18.00", is_active: true },
];
let customers: CustomerRecord[] = [
  { id: customerIds.northstar, auth_user_id: null, display_name: "Maya Patel", company_name: "Northstar Labs", email: "maya@northstar.example", phone: "+91 98765 12001", billing_address: null, is_active: true, created_at: date(86), updated_at: date(2) },
  { id: customerIds.atlas, auth_user_id: null, display_name: "Arjun Mehta", company_name: "Atlas Retail", email: "arjun@atlas.example", phone: "+91 98765 12002", billing_address: null, is_active: true, created_at: date(65), updated_at: date(5) },
  { id: customerIds.orbit, auth_user_id: null, display_name: "Sofia Chen", company_name: "Orbit Health", email: "sofia@orbit.example", phone: "+91 98765 12003", billing_address: null, is_active: true, created_at: date(43), updated_at: date(7) },
  { id: customerIds.bright, auth_user_id: null, display_name: "Noah Williams", company_name: "Brightline Studio", email: "noah@brightline.example", phone: "+91 98765 12004", billing_address: null, is_active: true, created_at: date(28), updated_at: date(9) },
  { id: customerIds.willow, auth_user_id: null, display_name: "Ishita Rao", company_name: "Willow Finance", email: "ishita@willow.example", phone: "+91 98765 12005", billing_address: null, is_active: false, created_at: date(18), updated_at: date(12) },
];
let subscriptions: SubscriptionRecord[] = [
  { id: "preview-subscription-001", customer_id: customerIds.northstar, plan_id: planIds.scale, status: "active", start_date: date(92).slice(0, 10), customer: { id: customerIds.northstar, display_name: "Maya Patel", company_name: "Northstar Labs" }, plan: { id: planIds.scale, name: "Scale", price: "7499.00", currency: "INR" } },
  { id: "preview-subscription-002", customer_id: customerIds.atlas, plan_id: planIds.growth, status: "active", start_date: date(61).slice(0, 10), customer: { id: customerIds.atlas, display_name: "Arjun Mehta", company_name: "Atlas Retail" }, plan: { id: planIds.growth, name: "Growth", price: "2499.00", currency: "INR" } },
  { id: "preview-subscription-003", customer_id: customerIds.orbit, plan_id: planIds.api, status: "confirmed", start_date: date(16).slice(0, 10), customer: { id: customerIds.orbit, display_name: "Sofia Chen", company_name: "Orbit Health" }, plan: { id: planIds.api, name: "API Pro", price: "49999.00", currency: "INR" } },
  { id: "preview-subscription-004", customer_id: customerIds.bright, plan_id: planIds.growth, status: "draft", start_date: date(3).slice(0, 10), customer: { id: customerIds.bright, display_name: "Noah Williams", company_name: "Brightline Studio" }, plan: { id: planIds.growth, name: "Growth", price: "2499.00", currency: "INR" } },
];
let invoices: InvoiceRecord[] = [
  { id: "preview-invoice-001", invoice_number: "INV-2026-0041", customer_id: customerIds.northstar, subscription_id: "preview-subscription-001", billing_period_start: date(30).slice(0, 10), billing_period_end: date(-1).slice(0, 10), status: "paid", issued_at: date(30), due_at: date(15), subtotal_amount: "7499.00", discount_amount: "0.00", tax_amount: "1349.82", total_amount: "8848.82", paid_amount: "8848.82", due_amount: "0.00", invoice_lines: [] },
  { id: "preview-invoice-002", invoice_number: "INV-2026-0042", customer_id: customerIds.atlas, subscription_id: "preview-subscription-002", billing_period_start: date(30).slice(0, 10), billing_period_end: date(-1).slice(0, 10), status: "issued", issued_at: date(27), due_at: date(4), subtotal_amount: "2499.00", discount_amount: "0.00", tax_amount: "449.82", total_amount: "2948.82", paid_amount: "0.00", due_amount: "2948.82", invoice_lines: [] },
  { id: "preview-invoice-003", invoice_number: "INV-2026-0036", customer_id: customerIds.orbit, subscription_id: "preview-subscription-003", billing_period_start: date(60).slice(0, 10), billing_period_end: date(31).slice(0, 10), status: "overdue", issued_at: date(60), due_at: date(30), subtotal_amount: "4166.58", discount_amount: "0.00", tax_amount: "749.98", total_amount: "4916.56", paid_amount: "1000.00", due_amount: "3916.56", invoice_lines: [] },
  { id: "preview-invoice-004", invoice_number: "INV-2026-0043", customer_id: customerIds.bright, subscription_id: "preview-subscription-004", billing_period_start: date(2).slice(0, 10), billing_period_end: date(-28).slice(0, 10), status: "issued", issued_at: date(2), due_at: date(-13), subtotal_amount: "2499.00", discount_amount: "0.00", tax_amount: "449.82", total_amount: "2948.82", paid_amount: "0.00", due_amount: "2948.82", invoice_lines: [] },
];
let payments: PaymentRecord[] = [
  { id: "preview-payment-001", invoice_id: "preview-invoice-001", amount: "8848.82", payment_method: "upi", paid_at: date(23), reference: "UPI-884812", notes: null },
  { id: "preview-payment-002", invoice_id: "preview-invoice-003", amount: "1000.00", payment_method: "bank_transfer", paid_at: date(42), reference: "NEFT-0217", notes: "Part payment" },
  { id: "preview-payment-003", invoice_id: "preview-invoice-001", amount: "0.00", payment_method: "card", paid_at: date(20), reference: "AUTH-0000", notes: "Sample history row" },
];

function enrichSubscriptions() {
  return subscriptions.map((subscription) => ({ ...subscription, customer: customers.find((customer) => customer.id === subscription.customer_id), plan: plans.find((plan) => plan.id === subscription.plan_id) && (() => { const plan = plans.find((item) => item.id === subscription.plan_id)!; return { id: plan.id, name: plan.name, price: plan.price, currency: plan.currency }; })() }));
}

function dashboard(): DashboardRecord {
  const summary: DashboardRecord["subscription_summary"] = { draft: 0, quotation: 0, confirmed: 0, active: 0, closed: 0 };
  subscriptions.forEach((subscription) => { summary[subscription.status] += 1; });
  return { active_subscriptions: summary.active, revenue_collected: payments.reduce((sum, payment) => sum + Number(payment.amount), 0).toFixed(2), outstanding_amount: invoices.filter((invoice) => invoice.status !== "void").reduce((sum, invoice) => sum + Number(invoice.due_amount), 0).toFixed(2), overdue_invoices: invoices.filter((invoice) => invoice.status === "overdue").length, subscription_summary: summary, revenue_series: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((label, index) => ({ label, revenue: 18_400 + index * 3_250, subscriptions: 8 + index * 2 })) };
}

export function createPreviewApi(): AdminApi {
  return {
    listProducts: async () => copy(products),
    createProduct: async (input: CreateProductInput) => { const record: ProductRecord = { ...input, id: id("product"), created_at: date(), updated_at: date() }; products = [record, ...products]; return copy(record); },
    listPlans: async () => copy(plans),
    createPlan: async (input: CreatePlanInput) => { const record: PlanRecord = { ...input, id: id("plan") }; plans = [record, ...plans]; return copy(record); },
    listCustomers: async () => copy(customers),
    createCustomer: async (input: CreateCustomerInput) => { const record: CustomerRecord = { ...input, id: id("customer"), is_active: true, created_at: date(), updated_at: date() }; customers = [record, ...customers]; return copy(record); },
    listSubscriptions: async () => copy(enrichSubscriptions()),
    createSubscription: async (input: CreateSubscriptionInput) => { const customer = customers.find((item) => item.id === input.customer_id); const plan = plans.find((item) => item.id === input.plan_id); const record: SubscriptionRecord = { ...input, id: id("subscription"), customer: customer && { id: customer.id, display_name: customer.display_name, company_name: customer.company_name }, plan: plan && { id: plan.id, name: plan.name, price: plan.price, currency: plan.currency } }; subscriptions = [record, ...subscriptions]; const total = Number(plan?.price ?? 0).toFixed(2); invoices = [{ id: id("invoice"), invoice_number: `PREVIEW-${String(invoices.length + 1).padStart(4, "0")}`, customer_id: input.customer_id, subscription_id: record.id, billing_period_start: input.start_date, billing_period_end: date(-30).slice(0, 10), status: "draft", issued_at: null, due_at: null, subtotal_amount: total, discount_amount: "0.00", tax_amount: "0.00", total_amount: total, paid_amount: "0.00", due_amount: total, invoice_lines: [] }, ...invoices]; return copy(record); },
    updateSubscription: async (subscriptionId, input) => { subscriptions = subscriptions.map((record) => record.id === subscriptionId ? { ...record, ...input } : record); return copy(enrichSubscriptions().find((record) => record.id === subscriptionId)!); },
    listInvoices: async () => copy(invoices),
    listPayments: async () => copy(payments),
    createPayment: async (input: CreatePaymentInput): Promise<PaymentRecord> => { const invoice = invoices.find((item) => item.id === input.invoice_id); if (!invoice) throw new Error("Choose a valid sample invoice."); const payment: PaymentRecord = { ...input, id: id("payment"), paid_at: input.paid_at ?? date(), reference: input.reference || null, notes: input.notes || null }; payments = [payment, ...payments]; const paid = Math.min(Number(invoice.total_amount), Number(invoice.paid_amount) + Number(input.amount)); const due = Math.max(0, Number(invoice.total_amount) - paid); invoice.paid_amount = paid.toFixed(2); invoice.due_amount = due.toFixed(2); invoice.status = due === 0 ? "paid" : paid > 0 ? "partially_paid" : invoice.status; return copy(payment); },
    dashboard: async () => copy(dashboard()),
  };
}
