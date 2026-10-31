"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, ReceiptText, UserRound, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/subscriptions", label: "Subscriptions", icon: ReceiptText },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
  { href: "/quotations", label: "Quotations", icon: FileText },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0c1b33] px-5 py-6 text-white transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/portal" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-sm font-bold shadow-lg shadow-blue-500/25">S</span>
            <span className="text-[17px] font-semibold tracking-tight">SubFlow</span>
          </Link>
          <button className="rounded-lg p-1 text-slate-400 hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="mt-12 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Customer space</div>
        <nav className="mt-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/portal" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30" : "text-slate-400 hover:bg-white/8 hover:text-white"}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">JD</div>
          <p className="text-sm font-medium">Jordan Davis</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">jordan@northstar.co</p>
          <button className="mt-4 flex w-full items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white"><LogOut size={14} /> Sign out</button>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div><p className="hidden text-xs text-slate-400 sm:block">Customer portal</p><p className="text-sm font-semibold text-slate-800">Welcome back, Jordan</p></div></div>
          <div className="flex items-center gap-3"><button className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" /></button><div className="hidden h-6 w-px bg-slate-200 sm:block" /><button className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 text-left hover:bg-slate-100"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">JD</span><span className="hidden text-xs font-medium text-slate-700 sm:block">Jordan Davis</span><ChevronDown size={14} className="hidden text-slate-400 sm:block" /></button></div>
        </header>
        <main className="mx-auto max-w-[1380px] px-5 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

export function DemoNotice() {
  return <div className="mb-7 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs text-blue-800"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-200 font-semibold">i</span><p><span className="font-semibold">Demo workspace.</span> The details on this page are sample data for the SubFlow prototype and are not connected to a live account.</p></div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{eyebrow || "Customer portal"}</p><h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950 md:text-[28px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>{action}</div>;
}

export function StatusPill({ status }: { status: string }) {
  const tone = status === "Active" || status === "Paid" || status === "Accepted" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15" : status === "Overdue" || status === "Expired" ? "bg-rose-50 text-rose-700 ring-rose-600/15" : "bg-amber-50 text-amber-700 ring-amber-600/15";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><UserRound size={22} /></div><h2 className="text-sm font-semibold text-slate-800">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p></div>;
}
