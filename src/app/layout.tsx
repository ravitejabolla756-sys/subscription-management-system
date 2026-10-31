import type { Metadata } from "next";
import "./globals.css";
import "./phase2.css";
import "./phase3.css";
import "./customers.css";

export const metadata: Metadata = { title: "Subflow — Subscription operations", description: "Admin dashboard for managing products, plans and subscriptions." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
