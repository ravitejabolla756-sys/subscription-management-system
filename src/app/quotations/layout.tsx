import { Suspense } from "react";
import { PortalShell } from "../portal/_components/portal-shell";

export default function QuotationsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" /> }><PortalShell>{children}</PortalShell></Suspense>;
}
