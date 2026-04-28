"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  BadgeCheck,
  Boxes,
  Eye,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Trash2,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type ProductType = "SIMPLE" | "VARIABLE" | "SERVICE";

type CategoryNode = {
  id: string;
  nameFr: string;
  nameEn?: string | null;
  nameAr?: string | null;
  children?: CategoryNode[];
};

type AttributeRow = {
  id: string;
  name: string;
};

type ProductRow = {
  id: string;
  type: ProductType;
  nameFr: string;
  nameEn?: string | null;
  nameAr?: string | null;
  sku: string;
  barcode?: string | null;
  price: string | number;
  stock: number;
  minStock: number;
  expiryDate?: string | null;
  categoryId: string;
  isActive: boolean;
  category?: { id: string; nameFr: string; nameEn?: string | null; nameAr?: string | null };
};

type ProductDetail = ProductRow & {
  attributes?: Array<{
    attributeId: string;
    attribute: {
      id: string;
      name: string;
      values: Array<{ id: string; value: string }>;
    };
  }>;
  variants?: Array<{
    id: string;
    name: string;
    sku?: string | null;
    priceOverride?: string | number | null;
    stock: number;
    isActive: boolean;
    attributes: Array<{ attributeValue: { id: string; value: string; attribute: { name: string } } }>;
  }>;
};

type ProductFormState = {
  type: ProductType;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
  vatRate: string;
  stock: string;
  minStock: string;
  expiryDate: string;
  categoryId: string;
  attributeIds: string[];
};

const DEFAULT_FORM: ProductFormState = {
  type: "SIMPLE",
  name: "",
  sku: "",
  barcode: "",
  price: "",
  costPrice: "",
  vatRate: "20",
  stock: "0",
  minStock: "0",
  expiryDate: "",
  categoryId: "",
  attributeIds: [],
};

type VariantDraft = {
  selectedValueIds: string[];
  sku: string;
  priceOverride: string;
  stock: string;
};

function flattenCategories(nodes: CategoryNode[]): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const node of nodes) {
    const label = node.nameFr;
    out.push({ id: node.id, label });
    if (node.children?.length) {
      out.push(...flattenCategories(node.children));
    }
  }
  return out;
}

function localizedCategoryName(
  category: ProductRow["category"],
  locale: string,
) {
  if (!category) return "-";
  if (locale.startsWith("ar")) return category.nameAr || category.nameEn || category.nameFr;
  if (locale.startsWith("en")) return category.nameEn || category.nameFr;
  return category.nameFr;
}

export function ManagerProductsClient() {
  const t = useTranslations("managerProducts");
  const locale = useLocale();
  const params = useParams() as { locale?: string | string[] };
  const paramLocale =
    typeof params?.locale === "string"
      ? params.locale
      : Array.isArray(params?.locale)
        ? params.locale[0]
        : null;
  const isRtl = (paramLocale ?? locale).startsWith("ar");
  const pageDir: "ltr" | "rtl" = isRtl ? "rtl" : "ltr";

  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [categories, setCategories] = React.useState<Array<{ id: string; label: string }>>([]);
  const [attributes, setAttributes] = React.useState<AttributeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  const [openCreate, setOpenCreate] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openCategoryCreate, setOpenCategoryCreate] = React.useState(false);
  const [openAttributeCreate, setOpenAttributeCreate] = React.useState(false);
  const [productDetail, setProductDetail] = React.useState<ProductDetail | null>(null);
  const [variantSaving, setVariantSaving] = React.useState(false);
  const [variantDraft, setVariantDraft] = React.useState<VariantDraft>({
    selectedValueIds: [],
    sku: "",
    priceOverride: "",
    stock: "0",
  });
  const [saving, setSaving] = React.useState(false);
  const [metaSaving, setMetaSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductRow | null>(null);
  const [form, setForm] = React.useState<ProductFormState>(DEFAULT_FORM);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [newAttributeName, setNewAttributeName] = React.useState("");
  const [newAttributeValues, setNewAttributeValues] = React.useState("");

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.nameFr, p.nameEn, p.nameAr, p.sku, p.barcode].some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [products, search]);

  const stats = React.useMemo(() => {
    const total = products.length;
    const variable = products.filter((p) => p.type === "VARIABLE").length;
    const lowStock = products.filter((p) => p.stock <= p.minStock).length;
    return { total, variable, lowStock };
  }, [products]);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, aRes] = await Promise.all([
        fetchWithAuth("/api/v1/products?limit=200&page=1"),
        fetchWithAuth("/api/v1/categories"),
        fetchWithAuth("/api/v1/attributes"),
      ]);

      if (!pRes.ok || !cRes.ok || !aRes.ok) {
        toast.error(t("errors.loadFailed"));
        return;
      }

      const pData = (await pRes.json()) as { products: ProductRow[] };
      const cData = (await cRes.json()) as { categories: CategoryNode[] };
      const aData = (await aRes.json()) as { attributes: Array<{ id: string; name: string }> };

      setProducts(pData.products ?? []);
      setCategories(flattenCategories(cData.categories ?? []));
      setAttributes((aData.attributes ?? []).map((a) => ({ id: a.id, name: a.name })));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function updateField<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openEditDialog(row: ProductRow) {
    setEditing(row);
    setForm({
      type: row.type,
      name: row.nameFr,
      sku: row.sku,
      barcode: row.barcode ?? "",
      price: String(row.price ?? ""),
      costPrice: "",
      vatRate: "20",
      stock: String(row.stock ?? 0),
      minStock: String(row.minStock ?? 0),
      expiryDate: row.expiryDate ? String(row.expiryDate).slice(0, 10) : "",
      categoryId: row.categoryId,
      attributeIds: [],
    });
    setVariantDraft({
      selectedValueIds: [],
      sku: "",
      priceOverride: "",
      stock: "0",
    });
    void loadProductDetail(row.id);
    setOpenEdit(true);
  }

  async function loadProductDetail(productId: string) {
    const res = await fetchWithAuth(`/api/v1/products/${productId}`);
    if (!res.ok) return;
    const data = (await res.json()) as { product?: ProductDetail };
    setProductDetail(data.product ?? null);
  }

  function buildPayload() {
    const sharedName = form.name.trim();
    return {
      type: form.type,
      nameFr: sharedName,
      nameEn: sharedName,
      nameAr: sharedName,
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || undefined,
      price: Number(form.price),
      costPrice: form.costPrice.trim() ? Number(form.costPrice) : undefined,
      vatRate: Number(form.vatRate || "20"),
      stock: Number(form.stock || "0"),
      minStock: Number(form.minStock || "0"),
      expiryDate: form.expiryDate ? new Date(`${form.expiryDate}T00:00:00.000Z`).toISOString() : undefined,
      categoryId: form.categoryId,
      attributeIds: form.type === "VARIABLE" ? form.attributeIds : [],
    };
  }

  function validateForm() {
    if (!form.name.trim() || !form.sku.trim() || !form.categoryId || !form.price.trim()) {
      toast.error(t("errors.required"));
      return false;
    }
    if (form.type === "VARIABLE" && form.attributeIds.length === 0) {
      toast.error(t("errors.variableAttributeRequired"));
      return false;
    }
    return true;
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        toast.error(t("errors.createFailed"));
        return;
      }
      toast.success(t("toast.created"));
      setOpenCreate(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!validateForm()) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/v1/products/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        toast.error(t("errors.updateFailed"));
        return;
      }
      toast.success(t("toast.updated"));
      setOpenEdit(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function softDelete(row: ProductRow) {
    const res = await fetchWithAuth(`/api/v1/products/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("errors.deleteFailed"));
      return;
    }
    toast.success(t("toast.deleted"));
    await loadAll();
  }

  async function createCategoryQuick() {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error(t("errors.categoryNameRequired"));
      return;
    }
    setMetaSaving(true);
    try {
      const res = await fetchWithAuth("/api/v1/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameFr: name,
          nameEn: name,
          nameAr: name,
        }),
      });
      if (!res.ok) {
        toast.error(t("errors.categoryCreateFailed"));
        return;
      }
      const data = (await res.json()) as { category?: { id: string } };
      toast.success(t("toast.categoryCreated"));
      setOpenCategoryCreate(false);
      setNewCategoryName("");
      await loadAll();
      if (data.category?.id) {
        updateField("categoryId", data.category.id);
      }
    } finally {
      setMetaSaving(false);
    }
  }

  async function createAttributeQuick() {
    const name = newAttributeName.trim();
    if (!name) {
      toast.error(t("errors.attributeNameRequired"));
      return;
    }
    setMetaSaving(true);
    try {
      const res = await fetchWithAuth("/api/v1/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          values: newAttributeValues
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .map((value, idx) => ({ value, sortOrder: idx })),
        }),
      });
      if (!res.ok) {
        toast.error(t("errors.attributeCreateFailed"));
        return;
      }
      const data = (await res.json()) as { attribute?: { id: string } };
      toast.success(t("toast.attributeCreated"));
      setOpenAttributeCreate(false);
      setNewAttributeName("");
      setNewAttributeValues("");
      await loadAll();
      if (data.attribute?.id) {
        setForm((prev) => ({
          ...prev,
          attributeIds: prev.attributeIds.includes(data.attribute!.id)
            ? prev.attributeIds
            : [...prev.attributeIds, data.attribute!.id],
        }));
      }
    } finally {
      setMetaSaving(false);
    }
  }

  async function createVariant() {
    if (!editing) return;
    if (variantDraft.selectedValueIds.length === 0) {
      toast.error(t("variants.errors.valuesRequired"));
      return;
    }
    if (!variantDraft.priceOverride.trim()) {
      toast.error(t("variants.errors.priceRequired"));
      return;
    }
    setVariantSaving(true);
    try {
      const res = await fetchWithAuth(`/api/v1/products/${editing.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attributeValueIds: variantDraft.selectedValueIds,
          sku: variantDraft.sku.trim() || undefined,
          priceOverride: Number(variantDraft.priceOverride),
          stock: Number(variantDraft.stock || "0"),
        }),
      });
      if (!res.ok) {
        toast.error(t("variants.errors.createFailed"));
        return;
      }
      toast.success(t("variants.toast.created"));
      await loadProductDetail(editing.id);
      setVariantDraft({ selectedValueIds: [], sku: "", priceOverride: "", stock: "0" });
    } finally {
      setVariantSaving(false);
    }
  }

  async function updateVariant(variantId: string, patch: { stock?: number; priceOverride?: number }) {
    if (!editing) return;
    const res = await fetchWithAuth(`/api/v1/products/${editing.id}/variants/${variantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error(t("variants.errors.updateFailed"));
      return;
    }
    await loadProductDetail(editing.id);
  }

  const formFields = (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("form.category")}</Label>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpenCategoryCreate(true)}>
              <Plus className="size-3.5" />
              {t("form.addCategory")}
            </Button>
          </div>
          <Select value={form.categoryId} onValueChange={(v) => updateField("categoryId", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("form.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("form.categoryHint")}</p>
        </div>
        <div className="space-y-2">
          <Label>{t("form.type")}</Label>
          <Select value={form.type} onValueChange={(v) => updateField("type", v as ProductType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SIMPLE">{t("type.SIMPLE")}</SelectItem>
              <SelectItem value="VARIABLE">{t("type.VARIABLE")}</SelectItem>
              <SelectItem value="SERVICE">{t("type.SERVICE")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t(`typeHelp.${form.type}`)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("form.name")}</Label>
        <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
        <p className="text-xs text-muted-foreground">{t("form.nameHint")}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("form.sku")}</Label>
          <Input value={form.sku} onChange={(e) => updateField("sku", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>{t("form.barcode")}</Label>
          <Input value={form.barcode} onChange={(e) => updateField("barcode", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="space-y-2">
          <Label>{t("form.price")}</Label>
          <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => updateField("price", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>{t("form.costPrice")}</Label>
          <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => updateField("costPrice", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("form.vatRate")}</Label>
          <Input type="number" min="0" max="100" step="0.01" value={form.vatRate} onChange={(e) => updateField("vatRate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("form.stock")}</Label>
          <Input type="number" min="0" step="1" value={form.stock} onChange={(e) => updateField("stock", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("form.minStock")}</Label>
        <Input type="number" min="0" step="1" value={form.minStock} onChange={(e) => updateField("minStock", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>{t("form.expiryDate")}</Label>
        <Input type="date" value={form.expiryDate} onChange={(e) => updateField("expiryDate", e.target.value)} />
        <p className="text-xs text-muted-foreground">{t("form.expiryDateHint")}</p>
      </div>

      {form.type === "VARIABLE" ? (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">{t("form.attributes")}</CardTitle>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpenAttributeCreate(true)}>
                <Plus className="size-3.5" />
                {t("form.addAttribute")}
              </Button>
            </div>
            <CardDescription>{t("form.attributesHint")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {attributes.map((attr) => {
              const checked = form.attributeIds.includes(attr.id);
              return (
                <label key={attr.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      setForm((prev) => ({
                        ...prev,
                        attributeIds: v
                          ? [...prev.attributeIds, attr.id]
                          : prev.attributeIds.filter((id) => id !== attr.id),
                      }));
                    }}
                  />
                  <span>{attr.name}</span>
                </label>
              );
            })}
            {attributes.length === 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <p>{t("form.noAttributes")}</p>
                <p className="mt-1">{t("form.noAttributesAction")}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {form.type === "VARIABLE" && editing && productDetail ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("variants.title")}</CardTitle>
            <CardDescription>{t("variants.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("variants.values")}</Label>
                <Select
                  value=""
                  onValueChange={(valueId) => {
                    setVariantDraft((prev) => ({
                      ...prev,
                      selectedValueIds: prev.selectedValueIds.includes(valueId)
                        ? prev.selectedValueIds
                        : [...prev.selectedValueIds, valueId],
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("variants.valuesPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(productDetail.attributes ?? []).flatMap((a) =>
                      a.attribute.values.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {a.attribute.name}: {v.value}
                        </SelectItem>
                      )),
                    )}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1.5">
                  {variantDraft.selectedValueIds.map((id) => {
                    const found = (productDetail.attributes ?? [])
                      .flatMap((a) => a.attribute.values.map((v) => ({ attribute: a.attribute.name, ...v })))
                      .find((v) => v.id === id);
                    if (!found) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {found.attribute}: {found.value}
                        <button
                          type="button"
                          onClick={() =>
                            setVariantDraft((prev) => ({
                              ...prev,
                              selectedValueIds: prev.selectedValueIds.filter((x) => x !== id),
                            }))
                          }
                          className="ms-1 text-xs"
                          aria-label="remove"
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("variants.sku")}</Label>
                  <Input value={variantDraft.sku} onChange={(e) => setVariantDraft((p) => ({ ...p, sku: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("variants.price")}</Label>
                  <Input type="number" min="0" step="0.01" value={variantDraft.priceOverride} onChange={(e) => setVariantDraft((p) => ({ ...p, priceOverride: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("variants.stock")}</Label>
                  <Input type="number" min="0" step="1" value={variantDraft.stock} onChange={(e) => setVariantDraft((p) => ({ ...p, stock: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => void createVariant()} disabled={variantSaving}>
                {variantSaving ? t("saving") : t("variants.add")}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("variants.table.name")}</TableHead>
                    <TableHead>{t("variants.table.price")}</TableHead>
                    <TableHead>{t("variants.table.stock")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(productDetail.variants ?? []).map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={v.priceOverride == null ? "" : String(v.priceOverride)}
                          onBlur={(e) => {
                            const val = e.currentTarget.value.trim();
                            if (!val) return;
                            void updateVariant(v.id, { priceOverride: Number(val) });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={String(v.stock)}
                          onBlur={(e) => {
                            const val = e.currentTarget.value.trim();
                            if (!val) return;
                            void updateVariant(v.id, { stock: Number(val) });
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(productDetail.variants ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        {t("variants.empty")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );

  return (
    <div className="w-full max-w-full space-y-6 text-start" dir={pageDir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="size-9">
            <Link href="/dashboard/manager" aria-label={t("back")}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/products/new">
              <PackagePlus className="size-4" />
              {t("add")}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4" dir={pageDir}>
        <TabsList className="inline-flex h-auto min-h-10 w-auto max-w-full flex-wrap gap-0.5">
          <TabsTrigger value="overview" className="gap-1.5">
            <BadgeCheck className="size-4" />
            <span>{t("tabs.overview")}</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5">
            <Boxes className="size-4" />
            <span>{t("tabs.products")}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">{products.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("stats.total")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("stats.variable")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{stats.variable}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("stats.lowStock")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">{stats.lowStock}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="max-w-md"
            />
            <Button asChild className="gap-2">
              <Link href="/dashboard/products/new">
                <PackagePlus className="size-4" />
                {t("add")}
              </Link>
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="ps-4">{t("table.name")}</TableHead>
                      <TableHead>{t("table.type")}</TableHead>
                      <TableHead>{t("table.category")}</TableHead>
                      <TableHead>{t("table.price")}</TableHead>
                      <TableHead>{t("table.stock")}</TableHead>
                      <TableHead>{t("table.expiry")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                      <TableHead className="pe-4 text-end">{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="ps-4">
                          <div>
                            <p className="font-medium">{row.nameFr}</p>
                            <p className="text-xs text-muted-foreground">{row.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.type === "VARIABLE" ? "default" : "secondary"}>{t(`type.${row.type}`)}</Badge>
                        </TableCell>
                        <TableCell>{localizedCategoryName(row.category, locale)}</TableCell>
                        <TableCell>{Number(row.price).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={cn(row.stock <= row.minStock ? "font-medium text-amber-600 dark:text-amber-400" : "")}>{row.stock}</span>
                        </TableCell>
                        <TableCell className={cn(row.expiryDate && new Date(row.expiryDate).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000 ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                          {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString(locale) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.isActive ? "default" : "secondary"}>
                            {row.isActive ? t("status.active") : t("status.inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="pe-4 text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/products/${row.id}`}>
                                  <Eye className="size-4" />
                                  {t("actions.view")}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(row)}>
                                <Pencil className="size-4" />
                                {t("actions.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void softDelete(row)}>
                                <Trash2 className="size-4" />
                                {t("actions.deactivate")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>{t("create.title")}</DialogTitle>
              <DialogDescription>{t("create.description")}</DialogDescription>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={saving}>{saving ? t("saving") : t("create.submit")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle>{t("edit.title")}</DialogTitle>
              <DialogDescription>{t("edit.description")}</DialogDescription>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={saving}>{saving ? t("saving") : t("edit.submit")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openCategoryCreate} onOpenChange={setOpenCategoryCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("categoryDialog.title")}</DialogTitle>
            <DialogDescription>{t("categoryDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t("categoryDialog.name")}</Label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t("categoryDialog.placeholder")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenCategoryCreate(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={metaSaving} onClick={() => void createCategoryQuick()}>
              {metaSaving ? t("saving") : t("categoryDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAttributeCreate} onOpenChange={setOpenAttributeCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("attributeDialog.title")}</DialogTitle>
            <DialogDescription>{t("attributeDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t("attributeDialog.name")}</Label>
            <Input
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
              placeholder={t("attributeDialog.placeholder")}
            />
            <Label>{t("attributeDialog.values")}</Label>
            <Input
              value={newAttributeValues}
              onChange={(e) => setNewAttributeValues(e.target.value)}
              placeholder={t("attributeDialog.valuesPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("attributeDialog.valuesHint")}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenAttributeCreate(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={metaSaving} onClick={() => void createAttributeQuick()}>
              {metaSaving ? t("saving") : t("attributeDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
