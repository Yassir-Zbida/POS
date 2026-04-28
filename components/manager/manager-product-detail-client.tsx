"use client";

import * as React from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Hash,
  Layers,
  Package,
  Pencil,
  Tag,
  Warehouse,
  Wrench,
  XCircle,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ──────────────────────────────────────────────────────────────────

type ProductType = "SIMPLE" | "VARIABLE" | "SERVICE";

type ProductVariant = {
  id: string;
  name: string;
  sku: string | null;
  priceOverride: number | null;
  costOverride: number | null;
  stock: number;
  minStock: number;
  isActive: boolean;
  attributes: Array<{
    attributeValue: { value: string; attribute: { id: string; name: string } };
  }>;
};

type ProductAttrLink = {
  attribute: {
    id: string;
    name: string;
    values: Array<{ id: string; value: string; sortOrder: number }>;
  };
};

type ProductDetail = {
  id: string;
  type: ProductType;
  nameFr: string;
  nameEn?: string | null;
  nameAr?: string | null;
  sku: string;
  barcode?: string | null;
  price: number;
  costPrice?: number | null;
  vatRate: number;
  stock: number;
  minStock: number;
  expiryDate?: string | null;
  isActive: boolean;
  categoryId: string;
  category?: {
    id: string;
    nameFr: string;
    nameEn?: string | null;
    nameAr?: string | null;
  };
  attributes: ProductAttrLink[];
  variants: ProductVariant[];
};

type ProductFieldKey =
  | "name"
  | "category"
  | "sku"
  | "barcode"
  | "price"
  | "costPrice"
  | "vatRate"
  | "stock"
  | "minStock"
  | "expiryDate"
  | "type";

// ── Component ──────────────────────────────────────────────────────────────

export function ManagerProductDetailClient({ productId }: { productId: string }) {
  const t = useTranslations("managerProductDetail");
  const locale = useLocale();
  const pageDir = locale === "ar" ? "rtl" : "ltr";

  const [product, setProduct] = React.useState<ProductDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [categories, setCategories] = React.useState<Array<{ id: string; label: string }>>([]);

  // ── Product field editing
  const [editOpen, setEditOpen] = React.useState(false);
  const [editField, setEditField] = React.useState<ProductFieldKey>("name");
  const [editValue, setEditValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // ── Variant editing
  const [variantEditOpen, setVariantEditOpen] = React.useState(false);
  const [editingVariant, setEditingVariant] = React.useState<ProductVariant | null>(null);
  const [variantDraft, setVariantDraft] = React.useState({
    sku: "",
    priceOverride: "",
    costOverride: "",
    stock: "0",
    minStock: "0",
  });
  const [variantSaving, setVariantSaving] = React.useState(false);

  // ── Data loading ───────────────────────────────────────────────────────────

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [productRes, categoriesRes] = await Promise.all([
        fetchWithAuth(`/api/v1/products/${productId}`),
        fetchWithAuth("/api/v1/categories"),
      ]);
      if (!productRes.ok) {
        toast.error(t("errors.loadFailed"));
        return;
      }
      const data = (await productRes.json()) as { product?: ProductDetail };
      setProduct(data.product ?? null);
      if (categoriesRes.ok) {
        const catData = (await categoriesRes.json()) as {
          categories?: Array<{
            id: string;
            nameFr: string;
            nameEn?: string | null;
            nameAr?: string | null;
          }>;
        };
        setCategories(
          (catData.categories ?? []).map((c) => ({
            id: c.id,
            label:
              locale === "ar"
                ? c.nameAr || c.nameFr || c.nameEn || c.id
                : locale === "en"
                  ? c.nameEn || c.nameFr || c.id
                  : c.nameFr || c.nameEn || c.id,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [locale, productId, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ── Product field helpers ──────────────────────────────────────────────────

  function valueForField(field: ProductFieldKey): string {
    if (!product) return "";
    switch (field) {
      case "name":       return product.nameFr ?? "";
      case "category":   return product.categoryId ?? "";
      case "sku":        return product.sku ?? "";
      case "barcode":    return product.barcode ?? "";
      case "price":      return String(product.price ?? "");
      case "costPrice":  return product.costPrice == null ? "" : String(product.costPrice);
      case "vatRate":    return String(product.vatRate ?? "");
      case "stock":      return String(product.stock ?? 0);
      case "minStock":   return String(product.minStock ?? 0);
      case "expiryDate": return product.expiryDate ? String(product.expiryDate).slice(0, 10) : "";
      case "type":       return product.type;
      default:           return "";
    }
  }

  function openProductEdit(field: ProductFieldKey) {
    setEditField(field);
    setEditValue(valueForField(field));
    setEditOpen(true);
  }

  async function saveProductField() {
    if (!product) return;
    setSaving(true);
    try {
      let payload: Record<string, unknown> = {};
      switch (editField) {
        case "name":
          payload = { nameFr: editValue.trim(), nameEn: editValue.trim(), nameAr: editValue.trim() };
          break;
        case "sku":        payload = { sku: editValue.trim() }; break;
        case "category":   payload = { categoryId: editValue }; break;
        case "barcode":    payload = { barcode: editValue.trim() || null }; break;
        case "price":      payload = { price: Number(editValue) }; break;
        case "costPrice":  payload = { costPrice: editValue.trim() ? Number(editValue) : null }; break;
        case "vatRate":    payload = { vatRate: Number(editValue) }; break;
        case "stock":      payload = { stock: Number(editValue) }; break;
        case "minStock":   payload = { minStock: Number(editValue) }; break;
        case "expiryDate":
          payload = { expiryDate: editValue ? new Date(`${editValue}T00:00:00.000Z`).toISOString() : null };
          break;
        case "type":       payload = { type: editValue as ProductType }; break;
      }
      const res = await fetchWithAuth(`/api/v1/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { toast.error(t("errors.updateFailed")); return; }
      toast.success(t("toast.updated"));
      setEditOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductStatus() {
    if (!product) return;
    const res = await fetchWithAuth(`/api/v1/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !product.isActive }),
    });
    if (!res.ok) { toast.error(t("errors.updateFailed")); return; }
    toast.success(t("toast.updated"));
    await load();
  }

  // ── Variant helpers ────────────────────────────────────────────────────────

  function openVariantEdit(variant: ProductVariant) {
    setEditingVariant(variant);
    setVariantDraft({
      sku: variant.sku ?? "",
      priceOverride: variant.priceOverride != null ? String(variant.priceOverride) : "",
      costOverride: variant.costOverride != null ? String(variant.costOverride) : "",
      stock: String(variant.stock),
      minStock: String(variant.minStock),
    });
    setVariantEditOpen(true);
  }

  async function saveVariant() {
    if (!product || !editingVariant) return;
    setVariantSaving(true);
    try {
      const payload: Record<string, unknown> = {
        sku: variantDraft.sku.trim() || null,
        priceOverride: variantDraft.priceOverride ? Number(variantDraft.priceOverride) : null,
        costOverride: variantDraft.costOverride ? Number(variantDraft.costOverride) : null,
        stock: Number(variantDraft.stock),
        minStock: Number(variantDraft.minStock),
      };
      const res = await fetchWithAuth(
        `/api/v1/products/${product.id}/variants/${editingVariant.id}`,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      if (!res.ok) { toast.error(t("variants.updateFailed")); return; }
      toast.success(t("variants.updated"));
      setVariantEditOpen(false);
      await load();
    } finally {
      setVariantSaving(false);
    }
  }

  async function toggleVariantStatus(variant: ProductVariant) {
    if (!product) return;
    const res = await fetchWithAuth(
      `/api/v1/products/${product.id}/variants/${variant.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !variant.isActive }),
      },
    );
    if (!res.ok) { toast.error(t("variants.updateFailed")); return; }
    toast.success(t("variants.updated"));
    await load();
  }

  // ── Sub-components ─────────────────────────────────────────────────────────

  function Row({
    label,
    value,
    field,
    mono = false,
    accent,
  }: {
    label: string;
    value: React.ReactNode;
    field: ProductFieldKey;
    mono?: boolean;
    accent?: "amber" | "red";
  }) {
    return (
      <div className="flex items-center justify-between gap-4 py-2.5">
        <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <span
            className={cn(
              "truncate text-sm font-medium",
              mono && "font-mono",
              accent === "amber" && "text-amber-600 dark:text-amber-400",
              accent === "red" && "text-red-600 dark:text-red-400",
            )}
          >
            {value}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => openProductEdit(field)}
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-1">
        <div className="flex items-center gap-3">
          <div className="size-9 animate-pulse rounded-md bg-muted" />
          <div className="space-y-1.5">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const categoryLabel =
    locale === "ar"
      ? product.category?.nameAr || product.category?.nameFr || product.category?.nameEn || "-"
      : locale === "en"
        ? product.category?.nameEn || product.category?.nameFr || "-"
        : product.category?.nameFr || product.category?.nameEn || "-";

  const isExpiringSoon =
    product.expiryDate != null &&
    new Date(product.expiryDate).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;

  const typeConfig: Record<
    ProductType,
    { icon: React.ReactNode; className: string }
  > = {
    SIMPLE: {
      icon: <Package className="size-3.5" />,
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    },
    VARIABLE: {
      icon: <Layers className="size-3.5" />,
      className:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
    },
    SERVICE: {
      icon: <Wrench className="size-3.5" />,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    },
  };

  const { icon: typeIcon, className: typeClass } = typeConfig[product.type];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" dir={pageDir}>
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start gap-3">
        <Button asChild variant="outline" size="icon" className="mt-0.5 size-9 shrink-0">
          <Link href="/dashboard/products" aria-label={t("back")}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold sm:text-2xl">{product.nameFr}</h1>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => openProductEdit("name")}
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                typeClass,
              )}
            >
              {typeIcon}
              {t(`type.${product.type}`)}
            </span>

            <Badge
              variant={product.isActive ? "default" : "secondary"}
              className={
                product.isActive ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""
              }
            >
              {product.isActive ? t("status.active") : t("status.inactive")}
            </Badge>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 gap-1.5 px-2 text-xs",
                product.isActive
                  ? "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                  : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
              )}
              onClick={() => void toggleProductStatus()}
            >
              {product.isActive ? (
                <XCircle className="size-3.5" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {product.isActive ? t("deactivate") : t("activate")}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* ─── Card: General info (all types) ─── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Tag className="size-4" />
              {t("sections.general")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y px-4 pb-3">
            <Row label={t("fields.name")} value={product.nameFr} field="name" />
            <Row label={t("fields.category")} value={categoryLabel} field="category" />
            <Row label={t("fields.sku")} value={product.sku} field="sku" mono />
            <Row
              label={t("fields.barcode")}
              value={product.barcode ?? (
                <span className="text-muted-foreground">{t("empty")}</span>
              )}
              field="barcode"
              mono
            />
            <Row
              label={t("fields.type")}
              value={
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    typeClass,
                  )}
                >
                  {typeIcon}
                  {t(`type.${product.type}`)}
                </span>
              }
              field="type"
            />
          </CardContent>
        </Card>

        {/* ─── Card: Pricing (all types) ─── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <DollarSign className="size-4" />
              {t("sections.pricing")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y px-4 pb-3">
            <Row
              label={t("fields.price")}
              value={Number(product.price).toFixed(2)}
              field="price"
            />
            <Row
              label={t("fields.costPrice")}
              value={
                product.costPrice == null ? (
                  <span className="text-muted-foreground">{t("empty")}</span>
                ) : (
                  Number(product.costPrice).toFixed(2)
                )
              }
              field="costPrice"
            />
            <Row
              label={t("fields.vatRate")}
              value={`${product.vatRate} %`}
              field="vatRate"
            />
          </CardContent>
        </Card>

        {/* ─── Card: Stock — SIMPLE only ─── */}
        {product.type === "SIMPLE" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Warehouse className="size-4" />
                {t("sections.stock")}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y px-4 pb-3">
              <Row
                label={t("fields.stock")}
                value={product.stock}
                field="stock"
                accent={product.stock <= product.minStock ? "amber" : undefined}
              />
              <Row
                label={t("fields.minStock")}
                value={product.minStock}
                field="minStock"
              />
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="shrink-0 text-sm text-muted-foreground">
                  {t("fields.expiryDate")}
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                  <span
                    className={cn(
                      "flex items-center gap-1 truncate text-sm font-medium",
                      isExpiringSoon && "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {product.expiryDate ? (
                      <>
                        <CalendarDays className="size-3.5 shrink-0" />
                        {new Date(product.expiryDate).toLocaleDateString(locale)}
                        {isExpiringSoon && (
                          <Badge
                            variant="outline"
                            className="h-5 border-amber-400 px-1.5 text-[10px] text-amber-600 dark:text-amber-400"
                          >
                            {t("expiringSoon")}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">{t("empty")}</span>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => openProductEdit("expiryDate")}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Card: Service note — SERVICE only ─── */}
        {product.type === "SERVICE" && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Wrench className="size-4" />
                {t("sections.service")}
              </CardTitle>
              <CardDescription className="text-xs">{t("service.note")}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                {t("service.description")}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Card: Attributes — VARIABLE only ─── */}
        {product.type === "VARIABLE" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Hash className="size-4" />
                {t("sections.attributes")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {product.attributes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("attributes.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {product.attributes.map((a) => (
                    <div key={a.attribute.id}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {a.attribute.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {a.attribute.values.map((v) => (
                          <Badge key={v.id} variant="outline" className="text-xs">
                            {v.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Variants table — VARIABLE only ─── */}
      {product.type === "VARIABLE" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-4 text-muted-foreground" />
              {t("sections.variants")}
              <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-xs">
                {product.variants.length}
              </Badge>
            </CardTitle>
            <CardDescription>{t("variants.description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {product.variants.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {t("variants.empty")}
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="ps-6">{t("variants.cols.name")}</TableHead>
                      <TableHead>{t("variants.cols.sku")}</TableHead>
                      <TableHead>{t("variants.cols.price")}</TableHead>
                      <TableHead>{t("variants.cols.stock")}</TableHead>
                      <TableHead>{t("variants.cols.status")}</TableHead>
                      <TableHead className="pe-4 text-end" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((v) => {
                      const isLowStock = v.stock > 0 && v.stock <= v.minStock;
                      const isOutOfStock = v.stock === 0;
                      return (
                        <TableRow key={v.id} className={!v.isActive ? "opacity-50" : ""}>
                          <TableCell className="ps-6 font-medium">{v.name}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {v.sku ?? "-"}
                          </TableCell>
                          <TableCell>
                            {v.priceOverride != null ? (
                              <span className="font-medium">
                                {Number(v.priceOverride).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {t("variants.inheritedPrice", {
                                  price: Number(product.price).toFixed(2),
                                })}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "font-medium",
                                isOutOfStock && "text-red-600 dark:text-red-400",
                                isLowStock && "text-amber-600 dark:text-amber-400",
                              )}
                            >
                              {v.stock}
                            </span>
                            {isOutOfStock && (
                              <span className="ms-1.5 text-xs text-red-500 dark:text-red-400">
                                {t("variants.outOfStock")}
                              </span>
                            )}
                            {isLowStock && (
                              <span className="ms-1.5 text-xs text-amber-500 dark:text-amber-400">
                                {t("variants.lowStock")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={v.isActive ? "default" : "secondary"}
                              className={cn(
                                "text-xs",
                                v.isActive
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "",
                              )}
                            >
                              {v.isActive ? t("status.active") : t("status.inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell className="pe-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openVariantEdit(v)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "size-8",
                                  v.isActive
                                    ? "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                                    : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
                                )}
                                onClick={() => void toggleVariantStatus(v)}
                              >
                                {v.isActive ? (
                                  <XCircle className="size-4" />
                                ) : (
                                  <CheckCircle2 className="size-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Product field edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>{t("edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t(`fields.${editField}`)}</Label>
            {editField === "type" ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMPLE">{t("type.SIMPLE")}</SelectItem>
                  <SelectItem value="VARIABLE">{t("type.VARIABLE")}</SelectItem>
                  <SelectItem value="SERVICE">{t("type.SERVICE")}</SelectItem>
                </SelectContent>
              </Select>
            ) : editField === "category" ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                autoFocus
                type={
                  editField === "expiryDate"
                    ? "date"
                    : ["price", "costPrice", "vatRate", "stock", "minStock"].includes(editField)
                      ? "number"
                      : "text"
                }
                min={
                  editField === "vatRate" ? 0 : ["price", "costPrice"].includes(editField) ? 0.01 : undefined
                }
                max={editField === "vatRate" ? 100 : undefined}
                step={["price", "costPrice"].includes(editField) ? "0.01" : undefined}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void saveProductField()} disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Variant edit dialog ── */}
      <Dialog open={variantEditOpen} onOpenChange={setVariantEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-4 text-muted-foreground" />
              {editingVariant?.name}
            </DialogTitle>
            <DialogDescription>{t("variants.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("variants.cols.sku")}</Label>
              <Input
                placeholder="AUTO"
                value={variantDraft.sku}
                onChange={(e) => setVariantDraft((p) => ({ ...p, sku: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("variants.cols.price")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={variantDraft.priceOverride}
                onChange={(e) => setVariantDraft((p) => ({ ...p, priceOverride: e.target.value }))}
                placeholder={t("variants.inheritPrice")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("variants.costOverride")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={variantDraft.costOverride}
                onChange={(e) => setVariantDraft((p) => ({ ...p, costOverride: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("variants.cols.stock")}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={variantDraft.stock}
                onChange={(e) => setVariantDraft((p) => ({ ...p, stock: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("fields.minStock")}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={variantDraft.minStock}
                onChange={(e) => setVariantDraft((p) => ({ ...p, minStock: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVariantEditOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void saveVariant()} disabled={variantSaving}>
              {variantSaving ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
