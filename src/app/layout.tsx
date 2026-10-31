import type { Metadata } from "next";
import "./globals.css";
import "./phase2.css";
import "./phase3.css";
import "./customers.css";
import "./admin-theme.css";

export const metadata: Metadata = { title: "SubFlow — Subscription operations", description: "Manage products, plans, customers, subscriptions and billing in one workspace." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
