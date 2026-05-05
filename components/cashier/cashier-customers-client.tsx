"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Search, Users, Wallet } from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useAuthStore } from "@/store/use-auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  creditBalance: unknown;
};

export function CashierCustomersClient() {
  const t = useTranslations("cashierCustomers");
  const perms = useAuthStore((s) => s.user?.cashierPermissions);
  const canView = perms?.customersView !== false;
  const canCredit = perms?.creditCollect !== false;

  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<CustomerRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payCustomer, setPayCustomer] = React.useState<CustomerRow | null>(null);
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const search = React.useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetchWithAuth(`/api/v1/customers?${params}`);
      if (!res.ok) {
        toast.error(t("loadError"));
        return;
      }
      const data = (await res.json()) as { customers?: CustomerRow[] };
      setRows(data.customers ?? []);
    } finally {
      setLoading(false);
    }
  }, [q, canView, t]);

  React.useEffect(() => {
    const tmr = setTimeout(() => {
      void search();
    }, 300);
    return () => clearTimeout(tmr);
  }, [search]);

  function openPay(c: CustomerRow) {
    setPayCustomer(c);
    setAmount("");
    setNote("");
    setPayOpen(true);
  }

  async function submitPay(e: React.FormEvent) {
    e.preventDefault();
    if (!payCustomer) return;
    const n = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error(t("invalidAmount"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/v1/customers/${payCustomer.id}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        toast.error(t("payError"));
        return;
      }
      toast.success(t("paySuccess"));
      setPayOpen(false);
      await search();
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <Card className="mx-auto max-w-lg border-dashed">
        <CardHeader>
          <CardTitle>{t("deniedTitle")}</CardTitle>
          <CardDescription>{t("deniedBody")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-1 sm:px-0">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
          <Users className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="ps-9"
          placeholder={t("searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="ps-4">{t("col.name")}</TableHead>
                  <TableHead>{t("col.phone")}</TableHead>
                  <TableHead className="text-end">{t("col.credit")}</TableHead>
                  {canCredit ? <TableHead className="pe-4 text-end">{t("col.actions")}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canCredit ? 4 : 3} className="py-10 text-center text-muted-foreground">
                      …
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canCredit ? 4 : 3} className="py-12 text-center text-sm text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="ps-4 font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {Number(c.creditBalance).toFixed(2)}
                      </TableCell>
                      {canCredit ? (
                        <TableCell className="pe-4 text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={Number(c.creditBalance) <= 0}
                            onClick={() => openPay(c)}
                          >
                            <Wallet className="size-3.5" />
                            {t("pay")}
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitPay}>
            <DialogHeader>
              <DialogTitle>{t("payTitle")}</DialogTitle>
              <DialogDescription>
                {payCustomer ? t("payHint", { name: payCustomer.name }) : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="c-pay-amt">{t("amountLabel")}</Label>
                <Input
                  id="c-pay-amt"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-pay-note">{t("noteLabel")}</Label>
                <Input id="c-pay-note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : t("submitPay")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
