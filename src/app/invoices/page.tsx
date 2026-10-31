import { AdminShell } from "@/components/admin/admin-shell";
import RecordsView from "@/components/admin/records-view";
export default function InvoicesPage() { return <AdminShell active="Invoices"><RecordsView resource="invoices" /></AdminShell>; }
