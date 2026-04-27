import { Link } from "@/i18n/navigation";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold sm:text-2xl">Admin Dashboard</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Platform monitoring, audit logs, and user management.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:mt-6 lg:grid-cols-3">
        <Link
          href="/docs/api-docs"
          className="rounded-lg border bg-card p-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          API Docs (Admin)
        </Link>
        <Link
          href="/dashboard/settings"
          className="rounded-lg border bg-card p-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}

