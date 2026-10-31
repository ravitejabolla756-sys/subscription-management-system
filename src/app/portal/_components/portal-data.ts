export type SubscriptionStatus = "Active" | "Paused" | "Cancelled";
export type PaymentStatus = "Paid" | "Due soon" | "Overdue";

export type Subscription = {
  id: string;
  name: string;
  plan: string;
  price: number;
  cadence: string;
  status: SubscriptionStatus;
  startDate: string;
  nextBilling: string;
  description: string;
  accent: string;
};

export type Invoice = {
  id: string;
  subscription: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: PaymentStatus;
};

export type Quotation = {
  id: string;
  title: string;
  service: string;
  created: string;
  validUntil: string;
  amount: number;
  status: "Accepted" | "Pending review" | "Expired";
  description: string;
  items: { label: string; detail: string; amount: number }[];
};

// Demo-only data. Replace this module with API adapters once the backend is available.
export const demoSubscriptions: Subscription[] = [
  {
    id: "sub-design-suite",
    name: "Design Suite",
    plan: "Professional",
    price: 149,
    cadence: "month",
    status: "Active",
    startDate: "Jan 12, 2025",
    nextBilling: "Dec 12, 2025",
    description: "Design tools, shared libraries, and priority support for your team.",
    accent: "bg-blue-600",
  },
  {
    id: "sub-analytics",
    name: "Analytics Pro",
    plan: "Growth",
    price: 89,
    cadence: "month",
    status: "Active",
    startDate: "Mar 04, 2025",
    nextBilling: "Dec 04, 2025",
    description: "Real-time reporting and customer insights across every touchpoint.",
    accent: "bg-violet-500",
  },
  {
    id: "sub-storage",
    name: "Secure Storage",
    plan: "Team",
    price: 39,
    cadence: "month",
    status: "Paused",
    startDate: "May 22, 2025",
    nextBilling: "Paused",
    description: "Encrypted workspace storage with automated retention controls.",
    accent: "bg-emerald-500",
  },
];

export const demoInvoices: Invoice[] = [
  { id: "INV-1048", subscription: "Design Suite", issueDate: "Nov 12, 2025", dueDate: "Nov 12, 2025", amount: 149, status: "Paid" },
  { id: "INV-1037", subscription: "Analytics Pro", issueDate: "Nov 04, 2025", dueDate: "Nov 04, 2025", amount: 89, status: "Paid" },
  { id: "INV-1026", subscription: "Design Suite", issueDate: "Oct 12, 2025", dueDate: "Oct 12, 2025", amount: 149, status: "Paid" },
  { id: "INV-1014", subscription: "Analytics Pro", issueDate: "Oct 04, 2025", dueDate: "Oct 11, 2025", amount: 89, status: "Overdue" },
  { id: "INV-1003", subscription: "Design Suite", issueDate: "Sep 12, 2025", dueDate: "Sep 12, 2025", amount: 149, status: "Paid" },
];

export const demoQuotations: Quotation[] = [
  {
    id: "QT-2408",
    title: "Annual growth package",
    service: "Analytics Pro + onboarding",
    created: "Nov 18, 2025",
    validUntil: "Dec 18, 2025",
    amount: 1280,
    status: "Pending review",
    description: "A tailored analytics package for expanding your reporting coverage in 2026.",
    items: [
      { label: "Analytics Pro — annual", detail: "12 months · 5 seats", amount: 1068 },
      { label: "Guided onboarding", detail: "One-time implementation", amount: 212 },
    ],
  },
  {
    id: "QT-2321",
    title: "Workspace consolidation",
    service: "Design Suite · Enterprise",
    created: "Oct 02, 2025",
    validUntil: "Nov 02, 2025",
    amount: 2140,
    status: "Accepted",
    description: "Consolidate your design workspaces with shared permissions and priority support.",
    items: [
      { label: "Design Suite — annual", detail: "10 seats · billed annually", amount: 1788 },
      { label: "Migration support", detail: "One-time service", amount: 352 },
    ],
  },
  {
    id: "QT-2194",
    title: "Secure storage expansion",
    service: "Secure Storage · 2TB",
    created: "Aug 11, 2025",
    validUntil: "Sep 11, 2025",
    amount: 720,
    status: "Expired",
    description: "Additional encrypted storage for your growing creative archive.",
    items: [{ label: "Secure Storage — annual", detail: "2TB expansion", amount: 720 }],
  },
];

export const revenueData = [
  { month: "Jun", revenue: 280, invoices: 4 },
  { month: "Jul", revenue: 342, invoices: 5 },
  { month: "Aug", revenue: 298, invoices: 4 },
  { month: "Sep", revenue: 387, invoices: 6 },
  { month: "Oct", revenue: 238, invoices: 4 },
  { month: "Nov", revenue: 238, invoices: 4 },
];

export function findSubscription(id: string) {
  return demoSubscriptions.find((subscription) => subscription.id === id);
}

export function findQuotation(id: string) {
  return demoQuotations.find((quotation) => quotation.id === id);
}

export function findInvoice(id: string) {
  return demoInvoices.find((invoice) => invoice.id === id);
}
