"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, Search, UserRound, ReceiptText } from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useAuthStore } from "@/store/use-auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  creditBalance: unknown;
  loyaltyPoints: number;
  createdAt: string;
};

type CustomerPayload = {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
};

type CreditLedgerRow = {
  kind: "SALE_CREDIT" | "PAYMENT";
  id: string;
  amount: number;
  createdAt: string;
  status?: string;
  note?: string | null;
  balanceAfter: number;
  cashier?: { id: string; name: string | null; email?: string | null } | null;
};

const EMPTY_FORM: CustomerPayload = {
  name: "",
  phone: "",
  email: "",
  city: "",
};

export function CustomersCrudClient() {
  const t = useTranslations("customersCrud");
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const cashierPerms = user?.cashierPermissions;

  const canView = user?.role !== "CASHIER" || cashierPerms?.customersView !== false;
  const canEdit = user?.role !== "CASHIER" || cashierPerms?.customersEdit !== false;
  const canCredit = user?.role !== "CASHIER" || cashierPerms?.creditCollect !== false;

  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<CustomerRow[]>([]);
  const [meta, setMeta] = React.useState({ total: 0, pages: 1, limit: 25 });

  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomerRow | null>(null);
  const [form, setForm] = React.useState<CustomerPayload>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const [openPay, setOpenPay] = React.useState(false);
  const [payingCustomer, setPayingCustomer] = React.useState<CustomerRow | null>(null);
  const [payAmount, setPayAmount] = React.useState("");
  const [payNote, setPayNote] = React.useState("");
  const [openCreditDetails, setOpenCreditDetails] = React.useState(false);
  const [creditCustomer, setCreditCustomer] = React.useState<CustomerRow | null>(null);
  const [creditLoading, setCreditLoading] = React.useState(false);
  const [creditSummary, setCreditSummary] = React.useState<{ totalCreditSales: number; totalPaid: number; remainingBalance: number } | null>(null);
  const [creditLedger, setCreditLedger] = React.useState<CreditLedgerRow[]>([]);

  const loadCustomers = React.useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(meta.limit),
      });
      if (query.trim()) params.set("search", query.trim());

      const res = await fetchWithAuth(`/api/v1/customers?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        customers?: CustomerRow[];
        meta?: { total: number; pages: number; limit: number };
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? t("errors.load"));
        return;
      }
      setRows(data.customers ?? []);
      if (data.meta) setMeta((m) => ({ ...m, ...data.meta }));
    } finally {
      setLoading(false);
    }
  }, [canView, meta.limit, page, query, t]);

  React.useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  React.useEffect(() => {
    setPage(1);
  }, [query]);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpenForm(true);
  }

  function startEdit(row: CustomerRow) {
    setEditing(row);
    setForm({
      name: row.name,
      phone: row.phone ?? "",
      email: row.email ?? "",
      city: row.city ?? "",
    });
    setOpenForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    if (!form.name.trim()) {
      toast.error(t("errors.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload: CustomerPayload = {
        name: form.name.trim(),
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        city: form.city?.trim() || undefined,
      };
      const url = editing ? `/api/v1/customers/${editing.id}` : "/api/v1/customers";
      const method = editing ? "PUT" : "POST";
      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? t("errors.save"));
        return;
      }
      toast.success(editing ? t("toast.updated") : t("toast.created"));
      setOpenForm(false);
      await loadCustomers();
    } finally {
      setSaving(false);
    }
  }

  async function removeCustomer(row: CustomerRow) {
    if (!canEdit) return;
    const ok = window.confirm(t("confirmDelete", { name: row.name }));
    if (!ok) return;
    const res = await fetchWithAuth(`/api/v1/customers/${row.id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? t("errors.delete"));
      return;
    }
    toast.success(t("toast.deleted"));
    await loadCustomers();
  }

  function openCreditDialog(row: CustomerRow) {
    setPayingCustomer(row);
    setPayAmount("");
    setPayNote("");
    setOpenPay(true);
  }

  async function submitCreditPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payingCustomer || !canCredit) return;
    const amount = Number.parseFloat(payAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("errors.invalidAmount"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/v1/customers/${payingCustomer.id}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          note: payNote.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? t("errors.payment"));
        return;
      }
      toast.success(t("toast.payment"));
      setOpenPay(false);
      await loadCustomers();
    } finally {
      setSaving(false);
    }
  }

  async function openCreditDetailsDialog(row: CustomerRow) {
    setOpenCreditDetails(true);
    setCreditCustomer(row);
    setCreditSummary(null);
    setCreditLedger([]);
    setCreditLoading(true);
    try {
      const res = await fetchWithAuth(`/api/v1/customers/${row.id}/credit`);
      const data = (await res.json().catch(() => ({}))) as {
        summary?: { totalCreditSales: number; totalPaid: number; remainingBalance: number };
        ledger?: CreditLedgerRow[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? t("errors.creditDetails"));
        return;
      }
      setCreditSummary(data.summary ?? null);
      setCreditLedger(data.ledger ?? []);
    } finally {
      setCreditLoading(false);
    }
  }

  if (!canView) {
    return (
      <Card className="max-w-xl border-dashed">
        <CardHeader>
          <CardTitle>{t("noAccessTitle")}</CardTitle>
          <CardDescription>{t("noAccessBody")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
            <UserRound className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        {canEdit ? (
          <Button onClick={startCreate} className="gap-2">
            <Plus className="size-4" />
            {t("add")}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder={t("search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.phone")}</TableHead>
                  <TableHead>{t("columns.email")}</TableHead>
                  <TableHead className="text-end">{t("columns.credit")}</TableHead>
                  <TableHead className="text-end">{t("columns.loyalty")}</TableHead>
                  <TableHead className="text-end">{t("columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      ...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.phone ?? "—"}</TableCell>
                      <TableCell>{row.email ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums">{Number(row.creditBalance).toFixed(2)}</TableCell>
                      <TableCell className="text-end tabular-nums">{row.loyaltyPoints}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          {canView ? (
                            <Button size="sm" variant="ghost" onClick={() => void openCreditDetailsDialog(row)}>
                              <ReceiptText className="size-4" />
                              {t("details")}
                            </Button>
                          ) : null}
                          {canCredit ? (
                            <Button size="sm" variant="outline" onClick={() => openCreditDialog(row)}>
                              {t("pay")}
                            </Button>
                          ) : null}
                          {canEdit ? (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
                                {t("edit")}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => void removeCustomer(row)}>
                                {t("delete")}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {meta.pages > 1 ? (
            <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {t("pagination", { page, pages: meta.pages, total: meta.total })}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t("prev")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitForm}>
            <DialogHeader>
              <DialogTitle>{editing ? t("editTitle") : t("createTitle")}</DialogTitle>
              <DialogDescription>{t("formHint")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cust-name">{t("fields.name")}</Label>
                <Input
                  id="cust-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-phone">{t("fields.phone")}</Label>
                <Input
                  id="cust-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-email">{t("fields.email")}</Label>
                <Input
                  id="cust-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-city">{t("fields.city")}</Label>
                <Input
                  id="cust-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitCreditPayment}>
            <DialogHeader>
              <DialogTitle>{t("payTitle")}</DialogTitle>
              <DialogDescription>
                {payingCustomer ? t("payHint", { name: payingCustomer.name }) : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="pay-amount">{t("fields.amount")}</Label>
                <Input
                  id="pay-amount"
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pay-note">{t("fields.note")}</Label>
                <Input id="pay-note" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenPay(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreditDetails} onOpenChange={setOpenCreditDetails}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("creditDetailsTitle")}</DialogTitle>
            <DialogDescription>
              {creditCustomer ? t("creditDetailsHint", { name: creditCustomer.name }) : ""}
            </DialogDescription>
          </DialogHeader>
          {creditLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">...</div>
          ) : (
            <div className="space-y-4">
              {creditSummary ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t("summary.creditSales")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xl font-semibold tabular-nums">
                      {creditSummary.totalCreditSales.toFixed(2)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t("summary.totalPaid")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {creditSummary.totalPaid.toFixed(2)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t("summary.remaining")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {creditSummary.remainingBalance.toFixed(2)}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("ledger.when")}</TableHead>
                          <TableHead>{t("ledger.type")}</TableHead>
                          <TableHead>{t("ledger.cashier")}</TableHead>
                          <TableHead className="text-end">{t("ledger.amount")}</TableHead>
                          <TableHead className="text-end">{t("ledger.balanceAfter")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditLedger.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                              {t("ledger.empty")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          creditLedger.map((row) => (
                            <TableRow key={`${row.kind}-${row.id}`}>
                              <TableCell className="text-muted-foreground">
                                {new Date(row.createdAt).toLocaleString(locale)}
                              </TableCell>
                              <TableCell>
                                {row.kind === "SALE_CREDIT" ? t("ledger.saleCredit") : t("ledger.payment")}
                              </TableCell>
                              <TableCell>{row.cashier?.name ?? row.cashier?.email ?? "—"}</TableCell>
                              <TableCell className="text-end tabular-nums">
                                <span className={row.kind === "SALE_CREDIT" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                                  {row.kind === "SALE_CREDIT" ? "+" : "-"}
                                  {Number(row.amount).toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell className="text-end tabular-nums font-medium">
                                {Number(row.balanceAfter).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenCreditDetails(false)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
