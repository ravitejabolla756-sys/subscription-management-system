"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Filter, MoreHorizontal, Package, Pencil, Search, Tag, Users, X } from "lucide-react";
import { DemoNotice, PageHeader } from "@/components/admin/admin-shell";
import styles from "./catalog-view.module.css";

type ProductStatus = "Active" | "Draft";
type Product = { id: number; name: string; category: string; price: string; status: ProductStatus; plans: number };
type Plan = { id: number; name: string; product: string; price: string; cadence: string; subscribers: number; status: ProductStatus };
type CatalogItem = Product | Plan;

const productsSeed: Product[] = [
  { id: 1, name: "Analytics Pro", category: "Analytics", price: "$49.00", status: "Active", plans: 3 },
  { id: 2, name: "Team Workspace", category: "Collaboration", price: "$79.00", status: "Active", plans: 2 },
  { id: 3, name: "API Access", category: "Developer tools", price: "$29.00", status: "Draft", plans: 1 },
];
const plansSeed: Plan[] = [
  { id: 1, name: "Starter", product: "Analytics Pro", price: "$29.00", cadence: "Monthly", subscribers: 84, status: "Active" },
  { id: 2, name: "Growth", product: "Analytics Pro", price: "$49.00", cadence: "Monthly", subscribers: 96, status: "Active" },
  { id: 3, name: "Scale", product: "Team Workspace", price: "$149.00", cadence: "Yearly", subscribers: 18, status: "Active" },
];
const statuses: Array<"All statuses" | ProductStatus> = ["All statuses", "Active", "Draft"];

function Badge({ status }: { status: ProductStatus }) {
  return <span className={`status-badge ${status.toLowerCase()}`}><span />{status}</span>;
}
function formatPrice(value: string) {
  const numericValue = value.replace(/[^0-9.]/g, "");
  return numericValue ? `$${Number(numericValue).toFixed(2)}` : "$0.00";
}
function CheckIcon() { return <span aria-hidden="true" className={styles.checkIcon}>✓</span>; }

function CatalogSkeleton({ isProducts }: { isProducts: boolean }) {
  return <div className={styles.skeleton} aria-label={`Loading ${isProducts ? "products" : "plans"}`}>
    <div className={styles.skeletonHeader}><span /><span /><span /></div>
    {Array.from({ length: 3 }).map((_, index) => <div className={styles.skeletonRow} key={index}><span /><span /><span /><span /></div>)}
  </div>;
}
function EmptyState({ hasFilters, clearFilters, isProducts }: { hasFilters: boolean; clearFilters: () => void; isProducts: boolean }) {
  return <div className={styles.emptyState}>
    <span className={styles.emptyIcon}>{isProducts ? <Package size={22} /> : <Tag size={22} />}</span>
    <h2>{hasFilters ? `No ${isProducts ? "products" : "plans"} found` : `No ${isProducts ? "products" : "plans"} yet`}</h2>
    <p>{hasFilters ? "Try a different search or clear the filters to see everything in this catalog." : `Create your first ${isProducts ? "product" : "subscription plan"} to start shaping your catalog.`}</p>
    {hasFilters && <button type="button" className={styles.clearButton} onClick={clearFilters}>Clear filters</button>}
  </div>;
}
function Field({ label, description, error, children }: { label: string; description?: string; error?: string; children: React.ReactNode }) {
  return <label className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    {description && <span className={styles.fieldDescription}>{description}</span>}
    {children}
    {error && <span className={styles.formError} role="alert">{error}</span>}
  </label>;
}
function Modal({ title, description, close, submit, children }: { title: string; description: string; close: () => void; submit: (event: FormEvent) => void; children: React.ReactNode }) {
  return <div className={styles.modalBackdrop} onMouseDown={close}>
    <form className={styles.modal} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") close(); }} role="dialog" aria-modal="true" aria-labelledby="catalog-dialog-title" aria-describedby="catalog-dialog-description">
      <div className={styles.modalHead}><div><h2 id="catalog-dialog-title">{title}</h2><p id="catalog-dialog-description">{description}</p></div><button type="button" className="icon-button" onClick={close} aria-label="Close dialog"><X size={19} /></button></div>
      <div className={styles.modalBody}>{children}</div>
      <div className={styles.modalActions}><button type="button" className="button secondary" onClick={close}>Cancel</button><button type="submit" className="button primary"><CheckIcon />Save changes</button></div>
    </form>
  </div>;
}

export default function CatalogView({ resource }: { resource: "products" | "plans" }) {
  const isProducts = resource === "products";
  const [products, setProducts] = useState(productsSeed);
  const [plans, setPlans] = useState(plansSeed);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof statuses[number]>("All statuses");
  const [productFilter, setProductFilter] = useState("All products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [product, setProduct] = useState(productsSeed[0].name);
  const [price, setPrice] = useState("");
  const [cadence, setCadence] = useState("Monthly");
  const [status, setStatus] = useState<ProductStatus>("Draft");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const timer = window.setTimeout(() => setIsLoading(false), 260); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (open) nameRef.current?.focus(); }, [open]);

  const productOptions = useMemo(() => Array.from(new Set(products.map((item) => item.name))), [products]);
  const rows = isProducts ? products : plans;
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((item) => {
      const matchesQuery = !normalizedQuery || (isProducts ? `${(item as Product).name} ${(item as Product).category}` : `${(item as Plan).name} ${(item as Plan).product} ${(item as Plan).cadence}`).toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "All statuses" || item.status === statusFilter;
      const matchesProduct = isProducts || productFilter === "All products" || (item as Plan).product === productFilter;
      return matchesQuery && matchesStatus && matchesProduct;
    });
  }, [isProducts, productFilter, query, rows, statusFilter]);

  const start = (item?: CatalogItem) => {
    setEditing(item ?? null); setName(item?.name ?? ""); setCategory(isProducts ? (item as Product | undefined)?.category ?? "" : "");
    setProduct(isProducts ? products[0]?.name ?? "" : (item as Plan | undefined)?.product ?? productOptions[0] ?? ""); setPrice(item?.price.replace("$", "") ?? "");
    setCadence((item as Plan | undefined)?.cadence ?? "Monthly"); setStatus(item?.status ?? "Draft"); setError(""); setOpen(true);
  };
  const clearFilters = () => { setQuery(""); setStatusFilter("All statuses"); setProductFilter("All products"); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 3) return setError(`Use at least 3 characters for the ${isProducts ? "product" : "plan"} name.`);
    if (isProducts && category.trim().length < 2) return setError("Add a category so this product is easy to find.");
    if (!isProducts && !product) return setError("Choose the product this plan belongs to.");
    if (isProducts) {
      const nextProduct: Product = { id: editing?.id ?? Date.now(), name: name.trim(), category: category.trim() || "Uncategorized", price: formatPrice(price), status, plans: (editing as Product | null)?.plans ?? 0 };
      setProducts((current) => editing ? current.map((item) => item.id === editing.id ? nextProduct : item) : [...current, nextProduct]);
    } else {
      const nextPlan: Plan = { id: editing?.id ?? Date.now(), name: name.trim(), product, price: formatPrice(price), cadence, subscribers: (editing as Plan | null)?.subscribers ?? 0, status };
      setPlans((current) => editing ? current.map((item) => item.id === editing.id ? nextPlan : item) : [...current, nextPlan]);
    }
    setOpen(false);
  };

  const activeCount = rows.filter((item) => item.status === "Active").length;
  const secondaryCount = isProducts ? products.reduce((total, item) => total + item.plans, 0) : plans.reduce((total, item) => total + item.subscribers, 0);
  const hasFilters = Boolean(query.trim()) || statusFilter !== "All statuses" || productFilter !== "All products";

  return <div className={styles.page}>
    <PageHeader title={isProducts ? "Products" : "Subscription plans"} description={isProducts ? "Build the catalog behind every customer subscription." : "Shape recurring pricing for every customer segment."} action={isProducts ? "Add product" : "Create plan"} onAction={() => start()} />
    <DemoNotice />
    <section className={styles.summary} aria-label={`${isProducts ? "Product" : "Plan"} summary`}>
      <div><span className={styles.summaryIcon}>{isProducts ? <Package size={16} /> : <Tag size={16} />}</span><div><strong>{rows.length}</strong><span>Total {isProducts ? "products" : "plans"}</span></div></div>
      <div><span className={`${styles.summaryIcon} ${styles.green}`}><CheckIcon /></span><div><strong>{activeCount}</strong><span>Active {isProducts ? "products" : "plans"}</span></div></div>
      <div><span className={`${styles.summaryIcon} ${styles.purple}`}>{isProducts ? <Tag size={16} /> : <Users size={16} />}</span><div><strong>{secondaryCount}</strong><span>{isProducts ? "Plans attached" : "Subscribers"}</span></div></div>
    </section>
    <article className={`panel ${styles.catalogPanel}`}>
      <div className={styles.catalogHeader}><div><h2>{isProducts ? "Product catalog" : "Pricing catalog"}</h2><p>{isProducts ? "Keep your customer-facing offerings organized." : "Review cadence, pricing, and adoption at a glance."}</p></div><span className={styles.resultCount} aria-live="polite">{filteredRows.length} of {rows.length} shown</span></div>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}><Search size={17} aria-hidden="true" /><span className={styles.srOnly}>Search {isProducts ? "products" : "plans"}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${isProducts ? "products" : "plans"}`} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}</label>
        <div className={styles.filterGroup}><label className={styles.selectBox}><Filter size={14} aria-hidden="true" /><span className={styles.srOnly}>Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>{statuses.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></label>{!isProducts && <label className={styles.selectBox}><Tag size={14} aria-hidden="true" /><span className={styles.srOnly}>Filter by product</span><select value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option>All products</option>{productOptions.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></label>}</div>
      </div>
      {isLoading ? <CatalogSkeleton isProducts={isProducts} /> : filteredRows.length === 0 ? <EmptyState hasFilters={hasFilters} clearFilters={clearFilters} isProducts={isProducts} /> : <div className={styles.tableScroll}>
        <table className={styles.catalogTable}><thead><tr>{isProducts ? <><th>Product</th><th>Category</th><th>Base price</th><th>Plans</th></> : <><th>Plan</th><th>Product</th><th>Price</th><th>Subscribers</th></>}<th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
          <tbody>{filteredRows.map((item) => isProducts ? <tr key={item.id}><td data-label="Product"><div className={styles.primaryCell}><span className={styles.productThumb}><Package size={17} /></span><div><strong>{(item as Product).name}</strong><span>Product ID · PRD-{String(item.id).padStart(4, "0")}</span></div></div></td><td data-label="Category">{(item as Product).category}</td><td data-label="Base price"><strong className={styles.price}>{(item as Product).price}</strong><span className={styles.subtle}> / month</span></td><td data-label="Plans">{(item as Product).plans} plans</td><td data-label="Status"><Badge status={item.status} /></td><td className={styles.actions}><button type="button" className={styles.editButton} onClick={() => start(item)}><Pencil size={13} />Edit</button><button type="button" className={styles.moreButton} aria-label={`More actions for ${(item as Product).name}`}><MoreHorizontal size={17} /></button></td></tr> : <tr key={item.id}><td data-label="Plan"><div className={styles.primaryCell}><span className={styles.planThumb}><Tag size={16} /></span><div><strong>{(item as Plan).name}</strong><span>Plan ID · PLN-{String(item.id).padStart(4, "0")}</span></div></div></td><td data-label="Product">{(item as Plan).product}</td><td data-label="Price"><strong className={styles.price}>{(item as Plan).price}</strong><span className={styles.subtle}> / {(item as Plan).cadence.toLowerCase()}</span></td><td data-label="Subscribers"><span className={styles.subscriberCell}><Users size={14} />{(item as Plan).subscribers}</span></td><td data-label="Status"><Badge status={item.status} /></td><td className={styles.actions}><button type="button" className={styles.editButton} onClick={() => start(item)}><Pencil size={13} />Edit</button><button type="button" className={styles.moreButton} aria-label={`More actions for ${(item as Plan).name}`}><MoreHorizontal size={17} /></button></td></tr>)}</tbody>
        </table>
      </div>}
    </article>
    <div className={styles.footerHint}><CalendarDays size={14} /><span>{isProducts ? "Products are managed locally in this demo until the catalog API is connected." : "Plan changes are isolated to this demo until the subscription API is connected."}</span></div>
    {open && <Modal title={`${editing ? "Edit" : "Create"} ${isProducts ? "product" : "subscription plan"}`} description={isProducts ? "Define the product details used across your catalog." : "Set the price and billing cadence for this offer."} close={() => setOpen(false)} submit={submit}>
      <div className={styles.formSection}><div className={styles.sectionHeading}><span className={styles.sectionNumber}>01</span><div><h3>Basics</h3><p>Give this {isProducts ? "product" : "plan"} a clear identity.</p></div></div><Field label={isProducts ? "Product name" : "Plan name"} description="Use a short, recognizable name." error={error}><input ref={nameRef} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder={isProducts ? "e.g. Analytics Pro" : "e.g. Growth"} aria-invalid={Boolean(error)} /></Field>{isProducts ? <Field label="Category" description="Helps your team keep the catalog organized."><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Analytics" /></Field> : <Field label="Product" description="Choose the product this plan belongs to."><select value={product} onChange={(event) => setProduct(event.target.value)}>{productOptions.map((value) => <option key={value}>{value}</option>)}</select></Field>}</div>
      <div className={styles.formSection}><div className={styles.sectionHeading}><span className={styles.sectionNumber}>02</span><div><h3>Commercial details</h3><p>Set the offer customers will see.</p></div></div><div className={styles.formGrid}><Field label="Price" description="Enter the amount in USD."><div className={styles.inputWithPrefix}><span>$</span><input value={price} onChange={(event) => setPrice(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="0.00" /></div></Field>{!isProducts && <Field label="Billing cadence" description="How often customers are charged."><select value={cadence} onChange={(event) => setCadence(event.target.value)}><option>Monthly</option><option>Yearly</option></select></Field>}</div><Field label="Status" description="Draft items stay out of active reporting."><select value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)}><option>Draft</option><option>Active</option></select></Field></div>
    </Modal>}
  </div>;
}
