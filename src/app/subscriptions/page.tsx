import { AdminShell } from "@/components/admin/admin-shell";
import RecordsView from "@/components/admin/records-view";
export default function SubscriptionsPage() { return <AdminShell active="Subscriptions"><RecordsView resource="subscriptions" /></AdminShell>; }
