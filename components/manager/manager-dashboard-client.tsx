"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProductRow = {
  id: string;
  nameFr: string;
  expiryDate?: string | null;
};

export function ManagerDashboardClient() {
  const t = useTranslations("managerDashboard");
  const [expiring, setExpiring] = React.useState<ProductRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchWithAuth("/api/v1/products?expiringInDays=30&limit=5&page=1");
      if (!res.ok) return;
      const data = (await res.json()) as { products?: ProductRow[] };
      if (!cancelled) setExpiring(data.products ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold sm:text-2xl">{t("title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {t("subtitle")}
      </p>

      <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/reports" className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent">
          {t("links.reports")}
        </Link>
        <Link href="/dashboard/sales" className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent">
          {t("links.sales")}
        </Link>
        <Link href="/dashboard/inventory" className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent">
          {t("links.inventory")}
        </Link>
        <Link href="/dashboard/products" className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent">
          {t("links.products")}
        </Link>
        <Link href="/dashboard/categories" className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent">
          {t("links.categories")}
        </Link>
        <Link href="/dashboard/customers" className="rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent">
          {t("links.customers")}
        </Link>
      </div>

      <Card className="mt-6 border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            {t("expiring.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("expiring.empty")}</p>
          ) : (
            <div className="space-y-2">
              {expiring.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span className="font-medium">{p.nameFr}</span>
                  <span className="text-muted-foreground">
                    {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "-"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
