import { Link } from "@/i18n/navigation";

export default function ManagerDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Manager Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Store overview, reporting, inventory, and team management.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/reports" className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent">
          Reports
        </Link>
        <Link href="/dashboard/sales" className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent">
          Sales
        </Link>
        <Link
          href="/dashboard/inventory"
          className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
        >
          Inventory
        </Link>
        <Link
          href="/dashboard/products"
          className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
        >
          Products
        </Link>
        <Link
          href="/dashboard/categories"
          className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
        >
          Categories
        </Link>
        <Link
          href="/dashboard/customers"
          className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
        >
          Customers
        </Link>
        <Link
          href="/dashboard/settings"
          className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}

