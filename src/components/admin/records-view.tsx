"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import {
  ApiClientError,
  createAdminApi,
  type CustomerRecord,
  type InvoiceRecord,
  type PaymentMethod,
  type PaymentRecord,
  type PlanRecord,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from "@/lib/api";
import { DemoNotice, PageHeader } from "@/components/admin/admin-shell";

type Resource = "subscriptions" | "invoices" | "payments";
const descriptions: Record<Resource, string> = {
  subscriptions: "Create, monitor and control recurring subscriptions.",
  invoices: "Track billing documents and payment status.",
  payments: "Review payment history and record offline payments.",
};
const subscriptionStatuses: SubscriptionStatus[] = [
  "draft",
  "quotation",
  "confirmed",
  "active",
  "closed",
];
const paymentMethods: PaymentMethod[] = [
  "cash",
  "card",
  "bank_transfer",
  "upi",
  "other",
];
const nextStatus: Partial<Record<SubscriptionStatus, SubscriptionStatus>> = {
  draft: "quotation",
  quotation: "confirmed",
  confirmed: "active",
  active: "closed",
};
const dateLabel = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : "—";
const money = (value: string, currency = "INR") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);
const badge = (value: string) => (
  <span className={`status-badge ${value.toLowerCase()}`}>
    <span />
    {value.replaceAll("_", " ")}
  </span>
);

function TableFrame({
  query,
  setQuery,
  filter,
  setFilter,
  count,
  loading,
  error,
  retry,
  children,
}: {
  query: string;
  setQuery: (value: string) => void;
  filter: string;
  setFilter: (value: string) => void;
  count: number;
  loading: boolean;
  error: string;
  retry: () => void;
  children: React.ReactNode;
}) {
  return (
    <article className="panel table-panel">
      <div className="table-toolbar">
        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
            aria-label="Search records"
          />
        </label>
        <label className="filter-button">
          <SlidersHorizontal size={16} />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter status"
          >
            <option>All</option>
            {subscriptionStatuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
            <option>issued</option>
            <option>partially_paid</option>
            <option>paid</option>
            <option>overdue</option>
            <option>void</option>
          </select>
        </label>
      </div>
      {loading ? (
        <div className="table-skeleton" aria-label="Loading records">
          <span />
          <span />
          <span />
        </div>
      ) : error ? (
        <div className="table-empty" role="alert">
          <strong>Records could not be loaded</strong>
          <p>{error}</p>
          <button type="button" className="button secondary" onClick={retry}>
            Try again
          </button>
        </div>
      ) : count ? (
        <div className="table-scroll">
          <table>{children}</table>
        </div>
      ) : (
        <div className="table-empty">
          <div className="empty-icon">⌕</div>
          <strong>No matching records</strong>
          <p>Try another search or clear the status filter.</p>
        </div>
      )}
      <div className="table-footer">
        <span>
          {count} {count === 1 ? "record" : "records"}
        </span>
      </div>
    </article>
  );
}
function Modal({
  title,
  close,
  submit,
  children,
  saving,
  error,
  readOnly = false,
}: {
  title: string;
  close: () => void;
  submit: (event: FormEvent) => void;
  children: React.ReactNode;
  saving: boolean;
  error: string;
  readOnly?: boolean;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form
        className="modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={close}
            aria-label="Close form"
          >
            <X size={19} />
          </button>
        </div>
        {children}
        {error && (
          <div className="customer-form-error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={close}>
            Cancel
          </button>
          {!readOnly && (
            <button type="submit" className="button primary" disabled={saving}>
              {saving && <LoaderCircle className="spin" size={16} />}
              {saving ? "Saving…" : "Save record"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label>
    {label}
    {children}
  </label>
);

function invoiceLineLabel(line: unknown, index: number) {
  if (!line || typeof line !== "object") return `Line item ${index + 1}`;
  const record = line as Record<string, unknown>;
  return typeof record.description === "string"
    ? record.description
    : typeof record.name === "string"
      ? record.name
      : `Line item ${index + 1}`;
}

function invoiceLineAmount(line: unknown) {
  if (!line || typeof line !== "object") return "—";
  const record = line as Record<string, unknown>;
  const value = record.amount ?? record.total_amount ?? record.unit_price;
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "—";
}

export default function RecordsView({ resource }: { resource: Resource }) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<InvoiceRecord | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(today());
  const [subscriptionNotes, setSubscriptionNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [paidAt, setPaidAt] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [billingDate, setBillingDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [transitioningId, setTransitioningId] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const api = createAdminApi();
      if (resource === "subscriptions") {
        const [subData, customerData, planData] = await Promise.all([
          api.listSubscriptions(),
          api.listCustomers(),
          api.listPlans(),
        ]);
        setSubscriptions(subData);
        setCustomers(customerData);
        setPlans(planData);
      } else if (resource === "invoices") setInvoices(await api.listInvoices());
      else {
        const [paymentData, invoiceData] = await Promise.all([
          api.listPayments(),
          api.listInvoices(),
        ]);
        setPayments(paymentData);
        setInvoices(invoiceData);
      }
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : `Unable to load ${resource}.`,
      );
    } finally {
      setLoading(false);
    }
  }, [resource]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const customerNames = useMemo(
    () =>
      new Map(
        customers.map((customer) => [customer.id, customer.display_name]),
      ),
    [customers],
  );
  const plansById = useMemo(
    () => new Map(plans.map((plan) => [plan.id, plan])),
    [plans],
  );
  const invoicesById = useMemo(
    () => new Map(invoices.map((invoice) => [invoice.id, invoice])),
    [invoices],
  );
  const visibleSubscriptions = subscriptions.filter(
    (row) =>
      `${row.id} ${row.customer?.display_name ?? ""} ${row.plan?.name ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" || row.status === filter),
  );
  const visibleInvoices = invoices.filter(
    (row) =>
      `${row.invoice_number} ${customerNames.get(row.customer_id) ?? row.customer_id}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" || row.status === filter),
  );
  const visiblePayments = payments.filter(
    (row) =>
      `${row.id} ${row.invoice_id} ${invoicesById.get(row.invoice_id)?.invoice_number ?? ""} ${row.payment_method}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" || row.payment_method === filter),
  );
  const selectedPaymentInvoice = invoiceId
    ? invoicesById.get(invoiceId)
    : undefined;
  const advance = async (row: SubscriptionRecord) => {
    const status = nextStatus[row.status];
    if (!status) return;
    if (
      !window.confirm(
        `Advance this subscription from ${row.status} to ${status}?`,
      )
    )
      return;
    setTransitioningId(row.id);
    setError("");
    try {
      const updated = await createAdminApi().updateSubscription(row.id, {
        status,
      });
      setSubscriptions((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, ...updated, status } : item,
        ),
      );
      setStatusMessage(`Subscription advanced to ${status}.`);
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Unable to update subscription.",
      );
    } finally {
      setTransitioningId("");
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setStatusMessage("");
    try {
      const api = createAdminApi();
      if (resource === "subscriptions") {
        if (!customerId || !planId)
          throw new Error("Choose a customer and plan.");
        if (!subscriptionStartDate) throw new Error("Choose a start date.");
        await api.createSubscription({
          customer_id: customerId,
          plan_id: planId,
          status: "draft",
          start_date: subscriptionStartDate,
          notes: subscriptionNotes.trim(),
        });
        setSubscriptions(await api.listSubscriptions());
        setStatusMessage("Subscription created as draft.");
      } else if (resource === "payments") {
        const numericAmount = Number(amount.trim());
        const selectedInvoice = invoicesById.get(invoiceId);
        if (!invoiceId || !selectedInvoice)
          throw new Error("Choose an invoice.");
        if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0)
          throw new Error("Choose an invoice and enter a positive amount.");
        if (numericAmount > Number(selectedInvoice.due_amount))
          throw new Error("Payment cannot exceed the invoice outstanding balance.");
        await api.createPayment({
          invoice_id: invoiceId,
          amount,
          payment_method: method,
          ...(paidAt ? { paid_at: new Date(paidAt).toISOString() } : {}),
          reference: paymentReference.trim(),
          notes: paymentNotes.trim(),
        });
        const [refreshedPayments, refreshedInvoices] = await Promise.all([
          api.listPayments(),
          api.listInvoices(),
        ]);
        setPayments(refreshedPayments);
        setInvoices(refreshedInvoices);
        setStatusMessage("Payment recorded and invoices refreshed.");
      } else {
        if (billingDate > today())
          throw new Error("Billing date cannot be in the future.");
        if (
          !window.confirm(
            `Run billing through ${billingDate}? This will process genuinely due active subscriptions and create any missing invoice periods.`,
          )
        ) {
          setSaving(false);
          return;
        }
        const result = await api.runBilling({ as_of_date: billingDate });
        setInvoices(await api.listInvoices());
        setStatusMessage(
          `Billing completed: ${result.processed} processed, ${result.created_invoice_ids.length} invoice(s) created.`,
        );
      }
      setOpen(false);
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save record.",
      );
    } finally {
      setSaving(false);
    }
  };
  const action =
    resource === "subscriptions"
      ? "Create subscription"
      : resource === "payments"
        ? "Record payment"
        : "Run billing";
  return (
    <>
      <PageHeader
        title={resource[0].toUpperCase() + resource.slice(1)}
        description={descriptions[resource]}
        action={action}
        onAction={() => {
          setFormError("");
          setStatusMessage("");
          setCustomerId("");
          setPlanId("");
          setSubscriptionStartDate(today());
          setSubscriptionNotes("");
          setInvoiceId("");
          setAmount("");
          setMethod("upi");
          setPaidAt("");
          setPaymentReference("");
          setPaymentNotes("");
          setBillingDate(today());
          setOpen(true);
        }}
      />
      <DemoNotice>
        Live {resource} data from the authenticated Subflow API. No demo records
        are used.
      </DemoNotice>
      {statusMessage && (
        <div className="operation-success" role="status">
          {statusMessage}
        </div>
      )}
      {resource === "subscriptions" && (
        <TableFrame
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          count={visibleSubscriptions.length}
          loading={loading}
          error={error}
          retry={() => void load()}
        >
          <thead>
            <tr>
              <th>Subscription</th>
              <th>Customer</th>
              <th>Plan</th>
              <th>Recurring amount</th>
              <th>Interval</th>
              <th>Start date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleSubscriptions.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.customer?.display_name ?? row.customer_id}</td>
                <td>{row.plan?.name ?? row.plan_id}</td>
                <td>
                  {plansById.has(row.plan_id)
                    ? money(
                        plansById.get(row.plan_id)?.price ?? "0",
                        plansById.get(row.plan_id)?.currency,
                      )
                    : "—"}
                </td>
                <td>{plansById.get(row.plan_id)?.billing_interval ?? "—"}</td>
                <td>{dateLabel(row.start_date)}</td>
                <td>{badge(row.status)}</td>
                <td>
                  {nextStatus[row.status] ? (
                    <button
                      type="button"
                      className="row-action"
                      disabled={transitioningId === row.id}
                      onClick={() => void advance(row)}
                    >
                      {transitioningId === row.id
                        ? "Updating…"
                        : `Advance to ${nextStatus[row.status]}`}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
      )}
      {resource === "invoices" && (
        <>
          <div className="summary-strip">
            <div>
              <span>Total invoiced</span>
              <strong>
                {money(
                  invoices
                    .reduce((sum, row) => sum + Number(row.total_amount), 0)
                    .toFixed(2),
                )}
              </strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>
                {money(
                  invoices
                    .reduce((sum, row) => sum + Number(row.paid_amount), 0)
                    .toFixed(2),
                )}
              </strong>
            </div>
            <div>
              <span>Outstanding</span>
              <strong>
                {money(
                  invoices
                    .reduce((sum, row) => sum + Number(row.due_amount), 0)
                    .toFixed(2),
                )}
              </strong>
            </div>
            <div>
              <span>Overdue</span>
              <strong>
                {invoices.filter((row) => row.status === "overdue").length}
              </strong>
            </div>
          </div>
          <TableFrame
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            count={visibleInvoices.length}
            loading={loading}
            error={error}
            retry={() => void load()}
          >
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setSelected(row)}
                    >
                      {row.invoice_number}
                    </button>
                  </td>
                  <td>
                    {customerNames.get(row.customer_id) ?? row.customer_id}
                  </td>
                  <td>{dateLabel(row.issued_at)}</td>
                  <td>{dateLabel(row.due_at)}</td>
                  <td>
                    <strong>{money(row.total_amount)}</strong>
                  </td>
                  <td>{badge(row.status)}</td>
                  <td>
                    <button
                      type="button"
                      className="row-action"
                      onClick={() => setSelected(row)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
          {selected && (
            <Modal
              title={selected.invoice_number}
              close={() => setSelected(null)}
              submit={(event) => {
                event.preventDefault();
                setSelected(null);
              }}
              saving={false}
              error=""
              readOnly
            >
              <Field label="Customer">
                <input
                  value={
                    customerNames.get(selected.customer_id) ??
                    selected.customer_id
                  }
                  readOnly
                />
              </Field>
              <Field label="Total">
                <input value={money(selected.total_amount)} readOnly />
              </Field>
              <Field label="Subscription">
                <input value={selected.subscription_id} readOnly />
              </Field>
              <div className="invoice-detail-grid">
                <Field label="Issued">
                  <input value={dateLabel(selected.issued_at)} readOnly />
                </Field>
                <Field label="Due">
                  <input value={dateLabel(selected.due_at)} readOnly />
                </Field>
              </div>
              <div className="invoice-detail-grid">
                <Field label="Paid">
                  <input value={money(selected.paid_amount)} readOnly />
                </Field>
                <Field label="Outstanding">
                  <input value={money(selected.due_amount)} readOnly />
                </Field>
              </div>
              <div className="invoice-line-items">
                <strong>Line items</strong>
                {selected.invoice_lines.length > 0 ? (
                  selected.invoice_lines.map((line, index) => (
                    <div key={`${selected.id}-line-${index}`}>
                      <span>{invoiceLineLabel(line, index)}</span>
                      <span>{invoiceLineAmount(line)}</span>
                    </div>
                  ))
                ) : (
                  <span>No line items returned.</span>
                )}
              </div>
              <Field label="Status">
                <input value={selected.status.replaceAll("_", " ")} readOnly />
              </Field>
            </Modal>
          )}
        </>
      )}
      {resource === "payments" && (
        <TableFrame
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          count={visiblePayments.length}
          loading={loading}
          error={error}
          retry={() => void load()}
        >
          <thead>
            <tr>
              <th>Payment</th>
              <th>Invoice</th>
              <th>Invoice outstanding</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Paid at</th>
            </tr>
          </thead>
          <tbody>
            {visiblePayments.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>
                  {invoicesById.get(row.invoice_id)?.invoice_number ??
                    row.invoice_id}
                </td>
                <td>
                  {invoicesById.has(row.invoice_id)
                    ? money(invoicesById.get(row.invoice_id)?.due_amount ?? "0")
                    : "—"}
                </td>
                <td>
                  <strong>{money(row.amount)}</strong>
                </td>
                <td>{row.payment_method}</td>
                <td>{dateLabel(row.paid_at)}</td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
      )}
      {open && (
        <Modal
          title={
            resource === "subscriptions"
              ? "Create subscription"
              : resource === "payments"
                ? "Record payment"
                : "Run billing"
          }
          close={() => setOpen(false)}
          submit={submit}
          saving={saving}
          error={formError}
        >
          {resource === "subscriptions" ? (
            <>
              <Field label="Customer">
                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value="">Select customer</option>
                  {customers.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Plan">
                <select
                  value={planId}
                  onChange={(event) => setPlanId(event.target.value)}
                >
                  <option value="">Select plan</option>
                  {plans.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} · {money(row.price, row.currency)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Initial status">
                <input value="Draft" readOnly />
              </Field>
              <Field label="Start date">
                <input
                  type="date"
                  value={subscriptionStartDate}
                  onChange={(event) =>
                    setSubscriptionStartDate(event.target.value)
                  }
                />
              </Field>
              <Field label="Notes">
                <textarea
                  value={subscriptionNotes}
                  onChange={(event) => setSubscriptionNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional internal notes"
                />
              </Field>
            </>
          ) : resource === "payments" ? (
            <>
              <Field label="Invoice">
                <select
                  value={invoiceId}
                  onChange={(event) => setInvoiceId(event.target.value)}
                >
                  <option value="">Select invoice</option>
                  {invoices.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.invoice_number} · {money(row.due_amount)} due
                    </option>
                  ))}
                </select>
              </Field>
              {selectedPaymentInvoice && (
                <div className="payment-invoice-summary" aria-live="polite">
                  <span>
                    Total <strong>{money(selectedPaymentInvoice.total_amount)}</strong>
                  </span>
                  <span>
                    Paid <strong>{money(selectedPaymentInvoice.paid_amount)}</strong>
                  </span>
                  <span>
                    Outstanding <strong>{money(selectedPaymentInvoice.due_amount)}</strong>
                  </span>
                </div>
              )}
              <Field label="Amount">
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </Field>
              <Field label="Payment method">
                <select
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value as PaymentMethod)
                  }
                >
                  {paymentMethods.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field label="Payment date">
                <input
                  type="datetime-local"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                />
              </Field>
              <Field label="Reference">
                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="Optional payment reference"
                />
              </Field>
              <Field label="Notes">
                <textarea
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional internal notes"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="As of date">
                <input
                  type="date"
                  value={billingDate}
                  max={today()}
                  onChange={(event) => setBillingDate(event.target.value)}
                />
              </Field>
              <p>
                Generates due invoices transactionally for active subscriptions.
                Duplicate billing periods are protected by the backend.
              </p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
