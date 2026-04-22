import { Link } from "@/i18n/navigation";

export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Platform monitoring, audit logs, and user management.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/docs/api-docs"
          className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
        >
          API Docs (Admin)
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

