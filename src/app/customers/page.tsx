import { AdminShell } from "@/components/admin/admin-shell";
import RecordsView from "@/components/admin/records-view";
export default function CustomersPage() { return <AdminShell active="Customers"><RecordsView resource="customers" /></AdminShell>; }
