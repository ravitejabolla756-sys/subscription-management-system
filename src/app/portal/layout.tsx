import { Suspense } from "react";
import { PortalShell } from "./_components/portal-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" /> }><PortalShell>{children}</PortalShell></Suspense>;
}
