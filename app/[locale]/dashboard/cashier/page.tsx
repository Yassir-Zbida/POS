import { Link } from "@/i18n/navigation";

export default function CashierDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Staff Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Daily operations and POS actions.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/cash-register"
          className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
        >
          Cash Register
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

