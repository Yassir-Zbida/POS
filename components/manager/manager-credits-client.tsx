"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Wallet, Loader2 } from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Link } from "@/i18n/navigation";
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

export function ManagerCreditsClient() {
  const t = useTranslations("managerCredits");
  const [rows, setRows] = React.useState<CustomerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payCustomer, setPayCustomer] = React.useState<CustomerRow | null>(null);
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/customers?hasCredit=true&limit=100");
      if (!res.ok) {
        toast.error(t("loadError"));
        return;
      }
      const data = (await res.json()) as { customers?: CustomerRow[] };
      setRows(data.customers ?? []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

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
      setPayCustomer(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
            <Wallet className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/manager">{t("back")}</Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("listTitle")}</CardTitle>
          <CardDescription>{t("listHint")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="ps-4">{t("col.customer")}</TableHead>
                  <TableHead>{t("col.phone")}</TableHead>
                  <TableHead className="text-end">{t("col.balance")}</TableHead>
                  <TableHead className="pe-4 text-end">{t("col.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      …
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="ps-4 font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                        {Number(c.creditBalance).toFixed(2)}
                      </TableCell>
                      <TableCell className="pe-4 text-end">
                        <Button size="sm" variant="secondary" onClick={() => openPay(c)}>
                          {t("recordPayment")}
                        </Button>
                      </TableCell>
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
                <Label htmlFor="pay-amt">{t("amountLabel")}</Label>
                <Input
                  id="pay-amt"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-note">{t("noteLabel")}</Label>
                <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="…" />
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
