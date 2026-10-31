"use client";

import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import type { Customer } from "@/lib/demo-data";

export function CustomerStatus({ status }: { status: Customer["status"] }) {
  return <span className={`customer-status ${status.toLowerCase()}`}><span className="status-dot" />{status}</span>;
}

export function CustomerToolbar({ query, setQuery, filter, setFilter, count }: { query: string; setQuery: (value: string) => void; filter: Customer["status"] | "All"; setFilter: (value: Customer["status"] | "All") => void; count: number }) {
  return <div className="customer-toolbar"><label className="customer-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email or company" aria-label="Search customers" /><kbd>⌘ K</kbd></label><div className="customer-toolbar-right"><span className="customer-result-count"><strong>{count}</strong> {count === 1 ? "customer" : "customers"}</span><label className="customer-filter"><SlidersHorizontal size={15} /><span>Status</span><select aria-label="Filter customers by status" value={filter} onChange={(event) => setFilter(event.target.value as Customer["status"] | "All")}><option value="All">All customers</option><option value="Active">Active</option><option value="Invited">Invited</option></select><ChevronDown size={14} /></label></div></div>;
}

export function CustomerEmptyState({ filtered }: { filtered: boolean }) {
  return <div className="customer-empty"><div className="customer-empty-icon"><Search size={20} /></div><h3>{filtered ? "No customers match your search" : "No customers yet"}</h3><p>{filtered ? "Try a different name, email or status filter." : "Create your first customer to start managing subscriptions."}</p></div>;
}

export function CustomerSkeleton() { return <div className="customer-skeleton" aria-label="Loading customers"><div className="customer-skeleton-head" /><span /><span /><span /><span /></div>; }

export function CustomerIdentity({ customer }: { customer: Customer }) { const initials = customer.name.split(" ").map((word) => word[0]).join("").slice(0, 2); return <div className="customer-identity"><span className="customer-avatar">{initials}</span><span><strong>{customer.name}</strong><small>{customer.email}</small></span></div>; }

