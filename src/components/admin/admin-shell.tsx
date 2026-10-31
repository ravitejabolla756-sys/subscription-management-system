"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, ChevronRight, CircleHelp, CreditCard, FileText, LayoutDashboard, Menu, Package, Search, Settings, SlidersHorizontal, Users, WalletCards } from "lucide-react";
import { AuthGate, useAdminSession } from "@/components/admin/auth-gate";
import { createClient } from "@/lib/supabase/client";
import { isUiPreview } from "@/lib/preview-mode";
import { CommandPalette } from "@/components/admin/command-palette";

const navGroups = [{ label: "Workspace", items: [["Dashboard", "/dashboard", LayoutDashboard], ["Products", "/products", Package], ["Plans", "/plans", SlidersHorizontal], ["Customers", "/customers", Users]] }, { label: "Billing operations", items: [["Subscriptions", "/subscriptions", WalletCards], ["Invoices", "/invoices", FileText], ["Payments", "/payments", CreditCard]] }] as const;
export function AdminShell({ active, children }: { active: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(max-width: 680px)").matches) return;
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return <AuthGate><AuthenticatedShell active={active} open={open} setOpen={setOpen} onOpenPalette={() => setPaletteOpen(true)}>{children}<CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} /></AuthenticatedShell></AuthGate>;
}
function AuthenticatedShell({ active, open, setOpen, onOpenPalette, children }: { active: string; open: boolean; setOpen: (open: boolean) => void; onOpenPalette: () => void; children: React.ReactNode }) {
  const { session } = useAdminSession();
  const email = isUiPreview ? "preview.admin@subflow.local" : session?.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase() || "AD";
  const signOut = () => { if (!isUiPreview) void createClient().auth.signOut(); };
  return <div className="app-shell">{open && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}<aside id="admin-sidebar" className={`sidebar ${open ? "open" : "collapsed"}`}><div className="sidebar-top"><div className="brand"><span className="brand-mark"><span /></span>{open && <span>sub<span className="brand-accent">flow</span></span>}</div><button type="button" className="collapse-button" onClick={() => setOpen(!open)} aria-label={open ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={open} aria-controls="admin-sidebar"><Menu size={19} /></button></div><nav aria-label="Admin navigation">{navGroups.map((group) => <div className="nav-group" key={group.label}><span className="nav-label">{open && group.label}</span>{group.items.map(([label, href, Icon]) => <Link key={label} href={href} className={`nav-item ${active === label ? "active" : ""}`} aria-current={active === label ? "page" : undefined} title={!open ? label : undefined} onClick={() => { if (window.innerWidth < 681) setOpen(false); }}><Icon size={18} aria-hidden="true" /><span>{open && label}</span></Link>)}</div>)}</nav><div className="sidebar-bottom"><button type="button" className="nav-item"><Settings size={18} aria-hidden="true" /><span>{open && "Settings"}</span></button><button type="button" className="sidebar-user" onClick={signOut} title={isUiPreview ? "Local preview" : "Sign out"}><span className="avatar blue">{initials}</span>{open && <div><strong>{email}</strong><small>{isUiPreview ? "Local preview" : "Sign out"}</small></div>}{open && <ChevronDown size={15} aria-hidden="true" />}</button></div></aside><main className="main-content"><header className="topbar"><div className="breadcrumbs"><button type="button" className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Open navigation" aria-expanded={open} aria-controls="admin-sidebar"><Menu size={19} aria-hidden="true" /></button><span>Workspace</span><ChevronRight size={14} aria-hidden="true" /><strong>{active}</strong></div><div className="topbar-actions"><button type="button" className="command-trigger" onClick={onOpenPalette}><Search size={15} aria-hidden="true" /><span>Search workspace</span><kbd>⌘ K</kbd></button><button type="button" className="help-button"><CircleHelp size={18} aria-hidden="true" />Help center</button><button type="button" className="notification-button" aria-label="Notifications"><Bell size={19} aria-hidden="true" /><span /></button><span className="top-avatar" aria-label={`Signed in as ${email}`}>{initials}</span></div></header><div className="content-wrap">{children}</div><footer className="app-footer"><span>Subflow admin</span><span>{isUiPreview ? "SAMPLE DATA · Local only" : "Live data · Supabase session"}</span></footer></main></div>;
}
export function PageHeader({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) { return <div className="page-heading list-heading"><div><h1>{title}</h1><p>{description}</p></div>{action && <button type="button" className="button primary" onClick={onAction}><span>+</span>{action}</button>}</div>; }
export function DemoNotice({ children = "Live data from the authenticated Subflow API." }: { children?: React.ReactNode }) { return <div className="demo-notice subtle"><span>✦</span><span>{isUiPreview ? "SAMPLE DATA · Local preview only · changes stay in memory." : children}</span></div>; }
