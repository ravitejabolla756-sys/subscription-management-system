import { AdminShell } from "@/components/admin/admin-shell";
import RecordsView from "@/components/admin/records-view";
export default function PaymentsPage() { return <AdminShell active="Payments"><RecordsView resource="payments" /></AdminShell>; }
