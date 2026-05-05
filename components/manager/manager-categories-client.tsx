"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { BarChart3, Eye, Pencil, Plus, Tags, Trash2 } from "lucide-react";

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

type CategoryNode = {
  id: string;
  nameFr: string;
  nameEn?: string | null;
  nameAr?: string | null;
  color?: string | null;
  vatRate?: unknown;
  parentId?: string | null;
  children?: CategoryNode[];
  _count?: { products: number };
};

type CategoryRow = {
  id: string;
  nameFr: string;
  nameEn?: string | null;
  nameAr?: string | null;
  color?: string | null;
  vatRate?: unknown;
  parentId?: string | null;
  parentName?: string | null;
  productsCount: number;
  level: number;
};

type CategoryAnalytics = {
  category: {
    id: string;
    nameFr: string;
    nameEn?: string | null;
    nameAr?: string | null;
    color?: string | null;
    vatRate?: unknown;
    productsCount: number;
  };
  totals: {
    totalProducts: number;
    totalSalesAmount: number;
    totalUnitsSold: number;
    thisMonthSalesAmount: number;
    thisMonthUnitsSold: number;
  };
  monthlySales: Array<{ month: string; amount: number; units: number }>;
};

type CategoryFormState = {
  nameFr: string;
  nameEn: string;
  nameAr: string;
  color: string;
  vatRate: string;
  parentId: string;
};

const EMPTY_FORM: CategoryFormState = {
  nameFr: "",
  nameEn: "",
  nameAr: "",
  color: "",
  vatRate: "",
  parentId: "",
};

function flattenCategories(nodes: CategoryNode[], level = 0, parentName: string | null = null): CategoryRow[] {
  const out: CategoryRow[] = [];
  for (const node of nodes) {
    out.push({
      id: node.id,
      nameFr: node.nameFr,
      nameEn: node.nameEn,
      nameAr: node.nameAr,
      color: node.color,
      vatRate: node.vatRate,
      parentId: node.parentId,
      parentName,
      productsCount: node._count?.products ?? 0,
      level,
    });
    if (node.children?.length) {
      out.push(...flattenCategories(node.children, level + 1, node.nameFr));
    }
  }
  return out;
}

export function ManagerCategoriesClient() {
  const t = useTranslations("managerCategories");
  const locale = useLocale();
  const authUser = useAuthStore((s) => s.user);
  const isCashier = authUser?.role === "CASHIER";
  const perms = authUser?.cashierPermissions;
  const canView = !isCashier || perms?.catalogView !== false;
  const canManage = !isCashier || perms?.categoriesManage !== false;

  const [rows, setRows] = React.useState<CategoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");

  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryRow | null>(null);
  const [form, setForm] = React.useState<CategoryFormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const [openDetails, setOpenDetails] = React.useState(false);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [details, setDetails] = React.useState<CategoryAnalytics | null>(null);

  const loadCategories = React.useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/categories");
      const data = (await res.json().catch(() => ({}))) as { categories?: CategoryNode[]; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? t("errors.load"));
        return;
      }
      setRows(flattenCategories(data.categories ?? []));
    } finally {
      setLoading(false);
    }
  }, [canView, t]);

  React.useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.nameFr, r.nameEn, r.nameAr, r.parentName].some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const stats = React.useMemo(() => {
    const totalCategories = rows.length;
    const totalProducts = rows.reduce((sum, r) => sum + r.productsCount, 0);
    const withProducts = rows.filter((r) => r.productsCount > 0).length;
    return { totalCategories, totalProducts, withProducts };
  }, [rows]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpenForm(true);
  }

  function openEdit(row: CategoryRow) {
    setEditing(row);
    setForm({
      nameFr: row.nameFr ?? "",
      nameEn: row.nameEn ?? "",
      nameAr: row.nameAr ?? "",
      color: row.color ?? "",
      vatRate: row.vatRate == null ? "" : String(row.vatRate),
      parentId: row.parentId ?? "",
    });
    setOpenForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    if (!form.nameFr.trim()) {
      toast.error(t("errors.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nameFr: form.nameFr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        nameAr: form.nameAr.trim() || undefined,
        color: form.color.trim() || undefined,
        vatRate: form.vatRate.trim() ? Number(form.vatRate) : undefined,
        parentId: form.parentId || undefined,
      };
      const url = editing ? `/api/v1/categories/${editing.id}` : "/api/v1/categories";
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
      await loadCategories();
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(row: CategoryRow) {
    if (!canManage) return;
    if (!window.confirm(t("confirmDelete", { name: row.nameFr }))) return;
    const res = await fetchWithAuth(`/api/v1/categories/${row.id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? t("errors.delete"));
      return;
    }
    toast.success(t("toast.deleted"));
    await loadCategories();
  }

  async function showDetails(row: CategoryRow) {
    setOpenDetails(true);
    setDetailsLoading(true);
    setDetails(null);
    try {
      const res = await fetchWithAuth(`/api/v1/categories/${row.id}/analytics`);
      const data = (await res.json().catch(() => ({}))) as CategoryAnalytics & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? t("errors.details"));
        return;
      }
      setDetails(data);
    } finally {
      setDetailsLoading(false);
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
            <Tags className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        {canManage ? (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="size-4" />
            {t("add")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.totalCategories")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{stats.totalCategories}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.totalProducts")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{stats.totalProducts}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.withProducts")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{stats.withProducts}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.parent")}</TableHead>
                  <TableHead className="text-end">{t("columns.products")}</TableHead>
                  <TableHead>{t("columns.vat")}</TableHead>
                  <TableHead className="text-end">{t("columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      ...
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <span style={{ paddingInlineStart: `${row.level * 14}px` }}>{row.nameFr}</span>
                      </TableCell>
                      <TableCell>{row.parentName ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums">{row.productsCount}</TableCell>
                      <TableCell>{row.vatRate == null ? "—" : `${Number(row.vatRate).toFixed(2)}%`}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => void showDetails(row)}>
                            <Eye className="size-4" />
                            {t("details")}
                          </Button>
                          {canManage ? (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                                <Pencil className="size-4" />
                                {t("edit")}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => void removeCategory(row)}>
                                <Trash2 className="size-4" />
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
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submitForm}>
            <DialogHeader>
              <DialogTitle>{editing ? t("editTitle") : t("createTitle")}</DialogTitle>
              <DialogDescription>{t("formHint")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cat-name-fr">{t("fields.nameFr")}</Label>
                <Input
                  id="cat-name-fr"
                  value={form.nameFr}
                  onChange={(e) => setForm((f) => ({ ...f, nameFr: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="cat-name-en">{t("fields.nameEn")}</Label>
                  <Input
                    id="cat-name-en"
                    value={form.nameEn}
                    onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cat-name-ar">{t("fields.nameAr")}</Label>
                  <Input
                    id="cat-name-ar"
                    value={form.nameAr}
                    onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="cat-vat">{t("fields.vatRate")}</Label>
                  <Input
                    id="cat-vat"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.vatRate}
                    onChange={(e) => setForm((f) => ({ ...f, vatRate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cat-color">{t("fields.color")}</Label>
                  <Input
                    id="cat-color"
                    placeholder="#22c55e"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cat-parent">{t("fields.parent")}</Label>
                <select
                  id="cat-parent"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                >
                  <option value="">{t("fields.noParent")}</option>
                  {rows
                    .filter((r) => !editing || r.id !== editing.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nameFr}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "..." : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("detailsTitle")}</DialogTitle>
            <DialogDescription>
              {details?.category ? details.category.nameFr : t("detailsHint")}
            </DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">...</div>
          ) : details ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">{t("analytics.totalProducts")}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold tabular-nums">
                    {details.totals.totalProducts}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">{t("analytics.totalSales")}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold tabular-nums">
                    {details.totals.totalSalesAmount.toFixed(2)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">{t("analytics.thisMonthSales")}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold tabular-nums">
                    {details.totals.thisMonthSalesAmount.toFixed(2)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">{t("analytics.totalUnits")}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold tabular-nums">
                    {details.totals.totalUnitsSold}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="size-4" />
                    {t("analytics.monthlyTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("analytics.month")}</TableHead>
                          <TableHead className="text-end">{t("analytics.salesAmount")}</TableHead>
                          <TableHead className="text-end">{t("analytics.units")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details.monthlySales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                              {t("analytics.empty")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          details.monthlySales.map((m) => (
                            <TableRow key={m.month}>
                              <TableCell>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" })}</TableCell>
                              <TableCell className="text-end tabular-nums">{m.amount.toFixed(2)}</TableCell>
                              <TableCell className="text-end tabular-nums">{m.units}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenDetails(false)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
