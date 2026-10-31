export type Lifecycle = "Active" | "Trialing" | "Paused" | "Canceled";
export type PaymentStatus = "Paid" | "Pending" | "Failed";
export type Customer = { id: string; name: string; email: string; company: string; subscriptions: number; joined: string; status: "Active" | "Invited" };
export type Subscription = { id: string; customerId: string; customer: string; plan: string; amount: string; nextBilling: string; status: Lifecycle };
export type Invoice = { id: string; customer: string; amount: string; issued: string; due: string; status: "Paid" | "Open" | "Overdue"; subscription: string };
export type Payment = { id: string; customer: string; invoice: string; amount: string; date: string; method: string; status: PaymentStatus };

export const demoCustomers: Customer[] = [
  { id: "CUS-1001", name: "Olivia Martin", email: "olivia@acme.co", company: "Acme Co.", subscriptions: 2, joined: "Oct 18, 2026", status: "Active" },
  { id: "CUS-1002", name: "Noah Williams", email: "noah@northstar.io", company: "Northstar", subscriptions: 1, joined: "Oct 12, 2026", status: "Active" },
  { id: "CUS-1003", name: "Emma Thompson", email: "emma@brightlabs.com", company: "Bright Labs", subscriptions: 3, joined: "Sep 28, 2026", status: "Active" },
  { id: "CUS-1004", name: "Liam Davis", email: "liam@orbit.dev", company: "Orbit", subscriptions: 1, joined: "Sep 19, 2026", status: "Invited" },
  { id: "CUS-1005", name: "Sophia Wilson", email: "sophia@verve.design", company: "Verve Design", subscriptions: 2, joined: "Sep 08, 2026", status: "Active" },
];
export const demoSubscriptions: Subscription[] = [
  { id: "SUB-2048", customerId: "CUS-1001", customer: "Olivia Martin", plan: "Growth", amount: "$49.00", nextBilling: "Nov 18, 2026", status: "Active" },
  { id: "SUB-2047", customerId: "CUS-1002", customer: "Noah Williams", plan: "Starter", amount: "$29.00", nextBilling: "Nov 12, 2026", status: "Active" },
  { id: "SUB-2046", customerId: "CUS-1003", customer: "Emma Thompson", plan: "Scale", amount: "$149.00", nextBilling: "Nov 28, 2026", status: "Trialing" },
  { id: "SUB-2045", customerId: "CUS-1005", customer: "Sophia Wilson", plan: "Growth", amount: "$49.00", nextBilling: "Nov 08, 2026", status: "Paused" },
];
export const demoInvoices: Invoice[] = [
  { id: "INV-1048", customer: "Noah Williams", amount: "$29.00", issued: "Oct 12, 2026", due: "Oct 19, 2026", status: "Paid", subscription: "SUB-2047" },
  { id: "INV-1047", customer: "Olivia Martin", amount: "$49.00", issued: "Oct 08, 2026", due: "Oct 15, 2026", status: "Open", subscription: "SUB-2048" },
  { id: "INV-1046", customer: "Emma Thompson", amount: "$149.00", issued: "Sep 28, 2026", due: "Oct 05, 2026", status: "Overdue", subscription: "SUB-2046" },
  { id: "INV-1045", customer: "Sophia Wilson", amount: "$49.00", issued: "Sep 08, 2026", due: "Sep 15, 2026", status: "Paid", subscription: "SUB-2045" },
];
export const demoPayments: Payment[] = [
  { id: "PAY-8801", customer: "Noah Williams", invoice: "INV-1048", amount: "$29.00", date: "Oct 12, 2026", method: "Visa ···· 4242", status: "Paid" },
  { id: "PAY-8800", customer: "Olivia Martin", invoice: "INV-1047", amount: "$49.00", date: "Oct 08, 2026", method: "ACH transfer", status: "Pending" },
  { id: "PAY-8799", customer: "Sophia Wilson", invoice: "INV-1045", amount: "$49.00", date: "Oct 08, 2026", method: "Mastercard ···· 8210", status: "Paid" },
];
