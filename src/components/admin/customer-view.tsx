"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LoaderCircle, MoreHorizontal, X } from "lucide-react";
import { ApiClientError, createAdminApi, type CustomerRecord } from "@/lib/api";
import { DemoNotice, PageHeader } from "@/components/admin/admin-shell";
import { CustomerEmptyState, CustomerIdentity, CustomerSkeleton, CustomerStatus, CustomerToolbar } from "@/components/admin/customer-components";

function CustomerModal({ customer, close, save }: { customer: CustomerRecord | null; close: () => void; save: (input: Omit<CustomerRecord, "id" | "created_at" | "updated_at">) => Promise<void> }) {
  const [name, setName] = useState(customer?.display_name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [company, setCompany] = useState(customer?.company_name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (customer) return setError("The backend contract does not expose customer updates yet.");
    if (name.trim().length < 1) return setError("Enter a customer name.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    setSaving(true); setError("");
    try {
      await save({ auth_user_id: null, display_name: name.trim(), company_name: company.trim() || null, email: email.trim() || null, phone: phone.trim() || null, billing_address: null, is_active: true });
      close();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create customer.");
    } finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onMouseDown={close}><form className="customer-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="customer-modal-top"><div><span className="form-eyebrow">Customer record</span><h2>{customer ? "Customer details" : "Add customer"}</h2><p>{customer ? "Review the persisted customer profile." : "Create a profile for billing and subscriptions."}</p></div><button type="button" className="icon-button" onClick={close} aria-label="Close customer form"><X size={19} /></button></div><div className="customer-form-grid"><label>Full name<input autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="e.g. Alex Morgan" readOnly={Boolean(customer)} required /></label><label>Email address<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="alex@company.com" readOnly={Boolean(customer)} /></label><label className="full-field">Company<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Northstar" readOnly={Boolean(customer)} /></label><label className="full-field">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. +91 90000 00000" readOnly={Boolean(customer)} /></label></div>{error && <div className="customer-form-error" role="alert">{error}</div>}<div className="customer-modal-actions"><button type="button" className="button secondary" onClick={close}>Close</button>{!customer && <button type="submit" className="button primary" disabled={saving}>{saving && <LoaderCircle className="spin" size={16} />}{saving ? "Creating…" : "Create customer"}</button>}</div></form></div>;
}

export default function CustomerView() {
  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerRecord["is_active"] | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalCustomer, setModalCustomer] = useState<CustomerRecord | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void createAdminApi().listCustomers().then((data) => { if (!cancelled) setRows(data); }).catch((requestError) => { if (!cancelled) setError(requestError instanceof ApiClientError ? requestError.message : "Unable to load customers."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const visible = useMemo(() => rows.filter((customer) => `${customer.display_name} ${customer.email ?? ""} ${customer.company_name ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All" || customer.is_active === filter)), [filter, query, rows]);
  const save = async (input: Omit<CustomerRecord, "id" | "created_at" | "updated_at">) => { const created = await createAdminApi().createCustomer(input); setRows((current) => [created, ...current]); };
  const filtered = query.length > 0 || filter !== "All";
  return <><PageHeader title="Customers" description="Manage the people and businesses behind your subscriptions." action="Add customer" onAction={() => setModalCustomer(null)} /><DemoNotice>Live customer data from the authenticated Subflow API.</DemoNotice><section className="customer-surface"><div className="customer-surface-heading"><div><span className="surface-kicker">Account directory</span><h2>All customers</h2><p>A single view of your customer relationships and subscription footprint.</p></div><span className="customer-live-dot"><i />Live workspace</span></div><CustomerToolbar query={query} setQuery={setQuery} filter={filter === "All" ? "All" : filter ? "Active" : "Invited"} setFilter={(value) => setFilter(value === "All" ? "All" : value === "Active")} count={visible.length} />{loading ? <CustomerSkeleton /> : error ? <div className="customer-empty" role="alert"><h3>Customers could not be loaded</h3><p>{error}</p></div> : visible.length === 0 ? <CustomerEmptyState filtered={filtered} /> : <><div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Company</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map((customer) => <tr key={customer.id}><td><CustomerIdentity customer={customer} /></td><td><span className="customer-company">{customer.company_name || "—"}</span></td><td><CustomerStatus status={customer.is_active ? "Active" : "Invited"} /></td><td><span className="customer-date">{new Date(customer.created_at).toLocaleDateString()}</span></td><td><button className="customer-edit" onClick={() => setModalCustomer(customer)}>View</button><button className="icon-button" aria-label={`More actions for ${customer.display_name}`}><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div><div className="customer-card-list">{visible.map((customer) => <article className="customer-card" key={customer.id}><div className="customer-card-top"><CustomerIdentity customer={customer} /><CustomerStatus status={customer.is_active ? "Active" : "Invited"} /></div><div className="customer-card-meta"><span><small>Company</small><strong>{customer.company_name || "—"}</strong></span><span><small>Email</small><strong>{customer.email || "—"}</strong></span><span><small>Joined</small><strong>{new Date(customer.created_at).toLocaleDateString()}</strong></span></div><button className="button secondary customer-card-edit" onClick={() => setModalCustomer(customer)}>View customer</button></article>)}</div></>}<div className="customer-surface-footer"><span>Showing {visible.length} of {rows.length} customers</span><span>Persisted in Supabase</span></div></section>{modalCustomer !== undefined && <CustomerModal customer={modalCustomer} close={() => setModalCustomer(undefined)} save={save} />}</>;
}
