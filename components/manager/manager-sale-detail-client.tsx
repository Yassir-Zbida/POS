"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Receipt } from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type SaleDetail = {
  id: string;
  createdAt: string;
  paymentMethod: string;
  status: string;
  subtotal: unknown;
  discountAmt: unknown;
  vatAmt: unknown;
  totalAmount: unknown;
  cashier: { id: string; name: string | null } | null;
  customer: { id: string; name: string; phone?: string | null } | null;
  items: Array<{
    quantity: number;
    unitPrice: unknown;
    totalPrice: unknown;
    product: { nameFr: string; sku: string };
  }>;
};

export function ManagerSaleDetailClient({ saleId }: { saleId: string }) {
  const t = useTranslations("managerSaleDetail");
  const locale = useLocale();
  const [sale, setSale] = React.useState<SaleDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/api/v1/sales/${saleId}`);
        if (!res.ok) {
          toast.error(t("loadError"));
          return;
        }
        const data = (await res.json()) as { sale?: SaleDetail };
        if (!cancelled) setSale(data.sale ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [saleId, t]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-1 py-8 sm:px-0">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="mx-auto max-w-lg px-1 py-10 text-center sm:px-0">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/sales">{t("backList")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-1 sm:px-0">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon" className="size-9 shrink-0">
          <Link href="/dashboard/sales" aria-label={t("backList")}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <Receipt className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold sm:text-xl">{t("title")}</h1>
            <p className="font-mono text-xs text-muted-foreground">#{sale.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("summary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("date")}</span>
            <span>{new Date(sale.createdAt).toLocaleString(locale)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("cashier")}</span>
            <span>{sale.cashier?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("customer")}</span>
            <span>{sale.customer?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("payment")}</span>
            <span className="uppercase">{sale.paymentMethod}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("status")}</span>
            <span>{sale.status}</span>
          </div>
          <Separator />
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="tabular-nums">{Number(sale.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("discount")}</span>
            <span className="tabular-nums">{Number(sale.discountAmt).toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("vat")}</span>
            <span className="tabular-nums">{Number(sale.vatAmt).toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2 font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{Number(sale.totalAmount).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("lines")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sale.items.map((it, idx) => (
            <div key={idx} className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {it.product.nameFr} <span className="text-muted-foreground">×{it.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">{Number(it.totalPrice).toFixed(2)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
