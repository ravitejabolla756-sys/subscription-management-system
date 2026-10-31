"use client";

import { useEffect, useRef, useState } from "react";
import { Command, LayoutDashboard, Package, SlidersHorizontal, Users, WalletCards, FileText, CreditCard, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

const commands = [
  { label: "Dashboard", description: "Review live workspace metrics", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", description: "Manage catalog products", href: "/products", icon: Package },
  { label: "Plans", description: "Manage recurring plans", href: "/plans", icon: SlidersHorizontal },
  { label: "Customers", description: "Search and manage customers", href: "/customers", icon: Users },
  { label: "Subscriptions", description: "Review lifecycle and billing", href: "/subscriptions", icon: WalletCards },
  { label: "Invoices", description: "Review invoice balances", href: "/invoices", icon: FileText },
  { label: "Payments", description: "Review and record payments", href: "/payments", icon: CreditCard },
] as const;

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const filtered = commands.filter((command) => `${command.label} ${command.description}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); onOpenChange(true); }
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  useEffect(() => { if (open) { const timer = window.setTimeout(() => { setQuery(""); setSelected(0); inputRef.current?.focus(); }, 0); return () => window.clearTimeout(timer); } }, [open]);
  if (!open) return null;

  const activeIndex = Math.min(selected, Math.max(filtered.length - 1, 0));
  const choose = (href: string) => { onOpenChange(false); router.push(href); };
  return <div className="command-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Search workspace" onMouseDown={(event) => event.stopPropagation()}>
    <div className="command-search"><Search size={17} aria-hidden="true" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setSelected((value) => Math.min(value + 1, Math.max(filtered.length - 1, 0))); } if (event.key === "ArrowUp") { event.preventDefault(); setSelected((value) => Math.max(value - 1, 0)); } if (event.key === "Enter" && filtered[activeIndex]) choose(filtered[activeIndex].href); }} placeholder="Jump to a workspace section…" aria-label="Search workspace sections" /><kbd>ESC</kbd><button className="icon-button" onClick={() => onOpenChange(false)} aria-label="Close command palette"><X size={17} /></button></div>
    <div className="command-heading"><span>Navigate</span><small>{filtered.length} {filtered.length === 1 ? "result" : "results"}</small></div>
    <div className="command-list">{filtered.length ? filtered.map((command, index) => { const Icon = command.icon; return <button key={command.href} className={`command-item ${activeIndex === index ? "selected" : ""}`} onMouseEnter={() => setSelected(index)} onClick={() => choose(command.href)}><span className="command-icon"><Icon size={17} /></span><span><strong>{command.label}</strong><small>{command.description}</small></span><span className="command-arrow">↵</span></button>; }) : <div className="command-empty"><Command size={19} /><strong>No workspace match</strong><span>Try a section such as invoices or customers.</span></div>}</div>
    <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span></div>
  </section></div>;
}
