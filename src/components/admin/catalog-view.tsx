"use client";
import { FormEvent, useState } from "react";
import { MoreHorizontal, Package, Search, X } from "lucide-react";
import { DemoNotice, PageHeader } from "@/components/admin/admin-shell";

type Product = { id: number; name: string; category: string; price: string; status: "Active" | "Draft"; plans: number };
type Plan = { id: number; name: string; product: string; price: string; cadence: string; subscribers: number; status: "Active" | "Draft" };
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
function Badge({ status }: { status: string }) { return <span className={`status-badge ${status.toLowerCase()}`}><span />{status}</span>; }
function Modal({ title, close, submit, children }: { title: string; close: () => void; submit: (event: FormEvent) => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={close}><X size={19} /></button></div>{children}<div className="modal-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button type="submit" className="button primary">Save changes</button></div></form></div>; }
export default function CatalogView({ resource }: { resource: "products" | "plans" }) {
  const isProducts = resource === "products";
  const [products, setProducts] = useState(productsSeed); const [plans, setPlans] = useState(plansSeed);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Product | Plan | null>(null); const [name, setName] = useState(""); const [error, setError] = useState("");
  const start = (item?: Product | Plan) => { setEditing(item ?? null); setName(item?.name ?? ""); setError(""); setOpen(true); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (name.trim().length < 3) return setError("Use at least 3 characters."); if (isProducts) setProducts(editing ? products.map((item) => item.id === editing.id ? { ...item, name: name.trim() } : item) : [...products, { id: Date.now(), name: name.trim(), category: "New category", price: "$0.00", status: "Draft", plans: 0 }]); else setPlans(editing ? plans.map((item) => item.id === editing.id ? { ...item, name: name.trim() } : item) : [...plans, { id: Date.now(), name: name.trim(), product: "Analytics Pro", price: "$0.00", cadence: "Monthly", subscribers: 0, status: "Draft" }]); setOpen(false); };
  const rows = isProducts ? products : plans;
  return <><PageHeader title={isProducts ? "Products" : "Subscription plans"} description={isProducts ? "Manage the products you offer to customers." : "Set up recurring pricing that fits every customer segment."} action={isProducts ? "Add product" : "Create plan"} onAction={() => start()} /><DemoNotice /><article className="panel table-panel"><div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder={`Search ${resource}`} /></div></div><div className="table-scroll"><table><thead><tr>{isProducts ? <><th>Product</th><th>Category</th><th>Base price</th><th>Plans</th></> : <><th>Plan</th><th>Product</th><th>Price</th><th>Subscribers</th></>}<th>Status</th><th /></tr></thead><tbody>{rows.map((item) => isProducts ? <tr key={item.id}><td><div className="product-cell"><span className="product-thumb"><Package size={18} /></span><strong>{(item as Product).name}</strong></div></td><td>{(item as Product).category}</td><td>{(item as Product).price}</td><td>{(item as Product).plans}</td><td><Badge status={item.status} /></td><td><button className="row-action" onClick={() => start(item)}>Edit</button><MoreHorizontal size={17} /></td></tr> : <tr key={item.id}><td><strong>{(item as Plan).name}</strong></td><td>{(item as Plan).product}</td><td>{(item as Plan).price} / {(item as Plan).cadence.toLowerCase()}</td><td>{(item as Plan).subscribers}</td><td><Badge status={item.status} /></td><td><button className="row-action" onClick={() => start(item)}>Edit</button><MoreHorizontal size={17} /></td></tr>)}</tbody></table></div></article>{open && <Modal title={`${editing ? "Edit" : "Create"} ${isProducts ? "product" : "plan"}`} close={() => setOpen(false)} submit={submit}><label>{isProducts ? "Product name" : "Plan name"}<input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={isProducts ? "e.g. Analytics Pro" : "e.g. Growth"} />{error && <span className="form-error">{error}</span>}</label>{isProducts ? <label>Category<input placeholder="e.g. Analytics" /></label> : <label>Product<select defaultValue="Analytics Pro"><option>Analytics Pro</option><option>Team Workspace</option></select></label>}</Modal>}</>;
}
