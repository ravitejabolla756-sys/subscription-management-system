import { AdminShell } from "@/components/admin/admin-shell";
import CatalogView from "@/components/admin/catalog-view";
export default function ProductsPage() { return <AdminShell active="Products"><CatalogView resource="products" /></AdminShell>; }
