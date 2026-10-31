import { AdminShell } from "@/components/admin/admin-shell";
import CatalogView from "@/components/admin/catalog-view";
export default function PlansPage() { return <AdminShell active="Plans"><CatalogView resource="plans" /></AdminShell>; }
