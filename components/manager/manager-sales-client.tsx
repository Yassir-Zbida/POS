"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Printer, Receipt, Search, X } from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SaleRow = {
  id: string;
  totalAmount: unknown;
  paymentMethod: string;
  status: string;
  createdAt: string;
  cashier: { id: string; name: string | null; email?: string | null } | null;
  customer?: { id: string; name: string } | null;
};

type SaleDetail = {
  id: string;
  createdAt: string;
  paymentMethod: string;
  subtotal: unknown;
  discountAmt: unknown;
  vatAmt: unknown;
  totalAmount: unknown;
  items: Array<{
    quantity: number;
    unitPrice: unknown;
    totalPrice: unknown;
    product: { nameFr: string; sku: string };
  }>;
};

type CashierRow = {
  id: string;
  name: string | null;
  email: string;
};

export function ManagerSalesClient() {
  const t = useTranslations("managerSales");
  const locale = useLocale();
  const role = useAuthStore((s) => s.user?.role);
  const [sales, setSales] = React.useState<SaleRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, pages: 1, limit: 25 });
  const [loading, setLoading] = React.useState(true);
  const [ticketQuery, setTicketQuery] = React.useState("");
  const [searchMode, setSearchMode] = React.useState(false);
  const [printingId, setPrintingId] = React.useState<string | null>(null);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [cashierId, setCashierId] = React.useState("");
  const [includeCredit, setIncludeCredit] = React.useState(true);
  const [cashiers, setCashiers] = React.useState<CashierRow[]>([]);
  const [filteredTotalAmount, setFilteredTotalAmount] = React.useState(0);

  function startOfDayIso(date: string) {
    return new Date(`${date}T00:00:00`).toISOString();
  }

  function endOfDayIso(date: string) {
    return new Date(`${date}T23:59:59.999`).toISOString();
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(meta.limit) });
      if (fromDate) q.set("from", startOfDayIso(fromDate));
      if (toDate) q.set("to", endOfDayIso(toDate));
      if (!includeCredit) q.set("includeCredit", "false");
      if (role === "MANAGER" && cashierId) q.set("cashierId", cashierId);
      const res = await fetchWithAuth(`/api/v1/sales?${q}`);
      if (!res.ok) {
        toast.error(t("loadError"));
        return;
      }
      const data = (await res.json()) as {
        sales?: SaleRow[];
        meta?: { total: number; page: number; pages: number; limit: number };
        summary?: { totalAmount: number };
      };
      setSales(data.sales ?? []);
      if (data.meta) {
        setMeta({ total: data.meta.total, pages: data.meta.pages, limit: data.meta.limit });
      }
      setFilteredTotalAmount(Number(data.summary?.totalAmount ?? 0));
    } finally {
      setLoading(false);
    }
  }, [page, meta.limit, t, fromDate, toDate, includeCredit, role, cashierId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (role !== "MANAGER") return;
    let cancelled = false;
    void (async () => {
      const res = await fetchWithAuth("/api/manager/cashiers");
      if (!res.ok) return;
      const data = (await res.json()) as { cashiers?: CashierRow[] };
      if (!cancelled) setCashiers(data.cashiers ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  React.useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, cashierId, includeCredit]);

  function printReceiptHtml(sale: SaleDetail): string {
    const date = new Date(sale.createdAt).toLocaleString(locale);
    const itemsHtml = sale.items
      .map(
        (i) => `<tr>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.product.nameFr}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${Number(i.unitPrice).toFixed(2)}</td>
      <td style="text-align:right">${Number(i.totalPrice).toFixed(2)}</td>
    </tr>`,
      )
      .join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
    <style>
      body{font-family:monospace;font-size:12px;max-width:320px;margin:0 auto;padding:12px}
      .center{text-align:center}.right{text-align:right}
      table{width:100%;border-collapse:collapse} th,td{padding:2px 0}
      hr{border:none;border-top:1px dashed #000;margin:8px 0}
    </style></head><body>
    <h3 class="center">Hssabaty POS</h3>
    <p class="center">${date}</p>
    <p class="center">#${sale.id.slice(-8).toUpperCase()}</p>
    <hr />
    <table>
      <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <hr />
    <table>
      <tr><td>Subtotal</td><td class="right">${Number(sale.subtotal).toFixed(2)}</td></tr>
      <tr><td>Discount</td><td class="right">${Number(sale.discountAmt).toFixed(2)}</td></tr>
      <tr><td>VAT</td><td class="right">${Number(sale.vatAmt).toFixed(2)}</td></tr>
      <tr><td><b>TOTAL</b></td><td class="right"><b>${Number(sale.totalAmount).toFixed(2)}</b></td></tr>
    </table>
    <hr />
    <p>Payment: ${sale.paymentMethod}</p>
    </body></html>`;
  }

  async function reprintTicket(id: string) {
    setPrintingId(id);
    try {
      const res = await fetchWithAuth(`/api/v1/sales/${id}`);
      if (!res.ok) {
        toast.error(t("printError"));
        return;
      }
      const data = (await res.json()) as { sale?: SaleDetail };
      if (!data.sale) {
        toast.error(t("idNotFound"));
        return;
      }
      const win = window.open("", "_blank", "width=420,height=680");
      if (!win) {
        toast.error(t("printError"));
        return;
      }
      win.document.write(printReceiptHtml(data.sale));
      win.document.close();
      win.onload = () => win.print();
    } finally {
      setPrintingId(null);
    }
  }

  async function searchByTicketId() {
    const query = ticketQuery.trim().replace(/^#/, "");
    if (!query) {
      setSearchMode(false);
      await load();
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/v1/sales/${query}`);
      if (!res.ok) {
        setSales([]);
        setSearchMode(true);
        toast.error(t("idNotFound"));
        return;
      }
      const data = (await res.json()) as { sale?: SaleRow };
      setSales(data.sale ? [data.sale] : []);
      setSearchMode(true);
      setMeta((m) => ({ ...m, total: data.sale ? 1 : 0, pages: 1 }));
      setFilteredTotalAmount(Number(data.sale?.totalAmount ?? 0));
    } finally {
      setLoading(false);
    }
  }

  function applyTodayFilter() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const today = `${y}-${m}-${d}`;
    setFromDate(today);
    setToDate(today);
    setPage(1);
    setSearchMode(false);
  }

  const colCount = role === "MANAGER" ? 7 : 6;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
            <Receipt className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === "MANAGER" ? t("subtitleManager") : t("subtitleCashier")}
            </p>
          </div>
        </div>
        {role === "MANAGER" ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/manager">{t("back")}</Link>
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("listTitle")}</CardTitle>
          <CardDescription>{t("listHint")}</CardDescription>
          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            {role === "MANAGER" ? (
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={cashierId}
                onChange={(e) => setCashierId(e.target.value)}
              >
                <option value="">{t("allCashiers")}</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.email}
                  </option>
                ))}
              </select>
            ) : (
              <div />
            )}
            <Button variant={includeCredit ? "secondary" : "outline"} onClick={() => setIncludeCredit((v) => !v)}>
              {includeCredit ? t("creditIncluded") : t("creditExcluded")}
            </Button>
            <Button variant="outline" onClick={applyTodayFilter}>
              {t("todayTotal")}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("filteredTotal")}</span>
            <span className="tabular-nums font-semibold">{filteredTotalAmount.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="ps-9"
                placeholder={t("searchPlaceholder")}
                value={ticketQuery}
                onChange={(e) => setTicketQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void searchByTicketId();
                }}
              />
            </div>
            <Button variant="outline" onClick={() => void searchByTicketId()}>
              {t("searchById")}
            </Button>
            {searchMode ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setTicketQuery("");
                  setSearchMode(false);
                  setPage(1);
                  void load();
                }}
              >
                <X className="size-4" />
                {t("clearSearch")}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="ps-4 whitespace-nowrap">{t("col.id")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("col.date")}</TableHead>
                  {role === "MANAGER" ? <TableHead>{t("col.cashier")}</TableHead> : null}
                  <TableHead>{t("col.customer")}</TableHead>
                  <TableHead className="text-end">{t("col.total")}</TableHead>
                  <TableHead>{t("col.payment")}</TableHead>
                  <TableHead className="pe-4 text-end">{t("col.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="py-10 text-center text-sm text-muted-foreground">
                      …
                    </TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="py-12 text-center text-sm text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="ps-4 font-mono text-xs text-muted-foreground">
                        #{s.id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString(locale)}
                      </TableCell>
                      {role === "MANAGER" ? (
                        <TableCell className="text-sm">
                          {s.cashier?.name ?? s.cashier?.email ?? "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-sm">{s.customer?.name ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium">
                        {Number(s.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs uppercase text-muted-foreground">{s.paymentMethod}</TableCell>
                      <TableCell className="pe-4 text-end">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => void reprintTicket(s.id)}
                            disabled={printingId === s.id}
                          >
                            <Printer className="size-4" />
                            {t("reprint")}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" asChild>
                            <Link href={`/dashboard/sales/${s.id}`}>{t("view")}</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && meta.pages > 1 ? (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {t("pageOf", { page, pages: meta.pages, total: meta.total })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" />
                  {t("prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("next")}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
