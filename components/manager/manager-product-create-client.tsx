"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Wand2 } from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProductType = "SIMPLE" | "VARIABLE" | "SERVICE";

type AttributeValue = { id: string; value: string };
type AttributeRow = { id: string; name: string; values: AttributeValue[] };
type CategoryNode = { id: string; nameFr: string; children?: CategoryNode[] };

type VariantDraft = {
  key: string;
  label: string;
  attributeValueIds: string[];
  sku: string;
  price: string;
  stock: string;
};

function flattenCategories(nodes: CategoryNode[]): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const node of nodes) {
    out.push({ id: node.id, label: node.nameFr });
    if (node.children?.length) out.push(...flattenCategories(node.children));
  }
  return out;
}

function cartesian<T>(arr: T[][]): T[][] {
  if (arr.length === 0) return [];
  return arr.reduce<T[][]>((acc, curr) => {
    const next: T[][] = [];
    for (const a of acc) {
      for (const c of curr) next.push([...a, c]);
    }
    return next;
  }, [[]]);
}

export function ManagerProductCreateClient() {
  const t = useTranslations("managerProductsNew");
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [categories, setCategories] = React.useState<Array<{ id: string; label: string }>>([]);
  const [attributes, setAttributes] = React.useState<AttributeRow[]>([]);

  const [type, setType] = React.useState<ProductType>("SIMPLE");
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [vatRate, setVatRate] = React.useState("20");
  const [stock, setStock] = React.useState("0");
  const [minStock, setMinStock] = React.useState("0");
  const [expiryDate, setExpiryDate] = React.useState("");

  const [selectedAttributeIds, setSelectedAttributeIds] = React.useState<string[]>([]);
  const [selectedValueIdsByAttr, setSelectedValueIdsByAttr] = React.useState<Record<string, string[]>>({});
  const [variants, setVariants] = React.useState<VariantDraft[]>([]);
  const [attributeDialogOpen, setAttributeDialogOpen] = React.useState(false);
  const [attributeDialogMode, setAttributeDialogMode] = React.useState<"create" | "edit">("create");
  const [attributeSaving, setAttributeSaving] = React.useState(false);
  const [editingAttribute, setEditingAttribute] = React.useState<AttributeRow | null>(null);
  const [attributeNameInput, setAttributeNameInput] = React.useState("");
  const [attributeValuesInput, setAttributeValuesInput] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cRes, aRes] = await Promise.all([
          fetchWithAuth("/api/v1/categories"),
          fetchWithAuth("/api/v1/attributes"),
        ]);
        if (!cRes.ok || !aRes.ok) {
          toast.error(t("errors.loadFailed"));
          return;
        }
        const cData = (await cRes.json()) as { categories?: CategoryNode[] };
        const aData = (await aRes.json()) as { attributes?: AttributeRow[] };
        if (!cancelled) {
          setCategories(flattenCategories(cData.categories ?? []));
          setAttributes(aData.attributes ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function toggleAttribute(id: string, checked: boolean) {
    setSelectedAttributeIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
    if (!checked) {
      setSelectedValueIdsByAttr((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function toggleAttributeValue(attrId: string, valueId: string, checked: boolean) {
    setSelectedValueIdsByAttr((prev) => {
      const current = prev[attrId] ?? [];
      return {
        ...prev,
        [attrId]: checked ? [...current, valueId] : current.filter((x) => x !== valueId),
      };
    });
  }

  function generateVariants() {
    const selectedAttrs = attributes.filter((a) => selectedAttributeIds.includes(a.id));
    if (selectedAttrs.length === 0) {
      toast.error(t("errors.selectAttributeFirst"));
      return;
    }
    for (const a of selectedAttrs) {
      if (!(selectedValueIdsByAttr[a.id]?.length > 0)) {
        toast.error(t("errors.selectValuesPerAttribute", { attribute: a.name }));
        return;
      }
    }

    const groups = selectedAttrs.map((attr) =>
      attr.values
        .filter((v) => (selectedValueIdsByAttr[attr.id] ?? []).includes(v.id))
        .map((v) => ({ attr: attr.name, id: v.id, value: v.value })),
    );

    const combos = cartesian(groups);
    const next: VariantDraft[] = combos.map((combo) => ({
      key: combo.map((c) => c.id).sort().join("|"),
      label: combo.map((c) => `${c.attr}: ${c.value}`).join(" / "),
      attributeValueIds: combo.map((c) => c.id),
      sku: "",
      price: "",
      stock: "0",
    }));
    setVariants(next);
  }

  function updateVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }

  function generateVariantSku(key: string) {
    const prefix = (sku || name || "VAR")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 18) || "VAR";
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    updateVariant(key, { sku: `${prefix}-${rand}` });
  }

  async function reloadAttributesOnly() {
    const aRes = await fetchWithAuth("/api/v1/attributes");
    if (!aRes.ok) return;
    const aData = (await aRes.json()) as { attributes?: AttributeRow[] };
    setAttributes(aData.attributes ?? []);
  }

  function openCreateAttributeDialog() {
    setAttributeDialogMode("create");
    setEditingAttribute(null);
    setAttributeNameInput("");
    setAttributeValuesInput("");
    setAttributeDialogOpen(true);
  }

  function openEditAttributeDialog(attr: AttributeRow) {
    setAttributeDialogMode("edit");
    setEditingAttribute(attr);
    setAttributeNameInput(attr.name);
    setAttributeValuesInput(attr.values.map((v) => v.value).join(", "));
    setAttributeDialogOpen(true);
  }

  async function saveAttributeDialog() {
    const name = attributeNameInput.trim();
    if (!name) {
      toast.error(t("errors.attributeNameRequired"));
      return;
    }
    setAttributeSaving(true);
    try {
      if (attributeDialogMode === "create") {
        const values = attributeValuesInput
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .map((value, sortOrder) => ({ value, sortOrder }));
        const res = await fetchWithAuth("/api/v1/attributes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, values }),
        });
        if (!res.ok) {
          toast.error(t("errors.attributeCreateFailed"));
          return;
        }
        toast.success(t("toast.attributeCreated"));
      } else {
        if (!editingAttribute) return;
        const res = await fetchWithAuth(`/api/v1/attributes/${editingAttribute.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          toast.error(t("errors.attributeUpdateFailed"));
          return;
        }
        toast.success(t("toast.attributeUpdated"));
      }
      setAttributeDialogOpen(false);
      await reloadAttributesOnly();
    } finally {
      setAttributeSaving(false);
    }
  }

  async function deleteAttribute(attr: AttributeRow) {
    const ok = window.confirm(t("confirmDeleteAttribute", { name: attr.name }));
    if (!ok) return;
    const res = await fetchWithAuth(`/api/v1/attributes/${attr.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("errors.attributeDeleteFailed"));
      return;
    }
    toast.success(t("toast.attributeDeleted"));
    setSelectedAttributeIds((prev) => prev.filter((id) => id !== attr.id));
    setSelectedValueIdsByAttr((prev) => {
      const next = { ...prev };
      delete next[attr.id];
      return next;
    });
    await reloadAttributesOnly();
  }

  async function submit() {
    if (!name.trim() || !sku.trim() || !categoryId || !price.trim()) {
      toast.error(t("errors.required"));
      return;
    }
    if (type === "VARIABLE") {
      if (selectedAttributeIds.length === 0) {
        toast.error(t("errors.selectAttributeFirst"));
        return;
      }
      if (variants.length === 0) {
        toast.error(t("errors.generateVariantsFirst"));
        return;
      }
      if (variants.some((v) => !v.price.trim())) {
        toast.error(t("errors.variantPriceRequired"));
        return;
      }
    }

    setSaving(true);
    try {
      const productRes = await fetchWithAuth("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          nameFr: name.trim(),
          nameEn: name.trim(),
          nameAr: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          categoryId,
          price: Number(price),
          costPrice: costPrice.trim() ? Number(costPrice) : undefined,
          vatRate: Number(vatRate || "20"),
          stock: Number(stock || "0"),
          minStock: Number(minStock || "0"),
          expiryDate: expiryDate ? new Date(`${expiryDate}T00:00:00.000Z`).toISOString() : undefined,
          attributeIds: type === "VARIABLE" ? selectedAttributeIds : [],
        }),
      });
      if (!productRes.ok) {
        toast.error(t("errors.createFailed"));
        return;
      }
      const pData = (await productRes.json()) as { product?: { id: string } };
      const productId = pData.product?.id;
      if (!productId) {
        toast.error(t("errors.createFailed"));
        return;
      }

      if (type === "VARIABLE") {
        for (const v of variants) {
          const res = await fetchWithAuth(`/api/v1/products/${productId}/variants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attributeValueIds: v.attributeValueIds,
              sku: v.sku.trim() || undefined,
              priceOverride: Number(v.price),
              stock: Number(v.stock || "0"),
            }),
          });
          if (!res.ok) {
            toast.error(t("errors.variantCreateFailed"));
            return;
          }
        }
      }

      toast.success(t("toast.created"));
      router.push("/dashboard/products");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-24 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline" size="icon" className="size-9">
          <Link href="/dashboard/products" aria-label={t("back")}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("general.title")}</CardTitle>
          <CardDescription>{t("general.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("general.category")}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("general.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("general.type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProductType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMPLE">{t("type.SIMPLE")}</SelectItem>
                  <SelectItem value="VARIABLE">{t("type.VARIABLE")}</SelectItem>
                  <SelectItem value="SERVICE">{t("type.SERVICE")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t(`typeHelp.${type}`)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("general.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("general.sku")}</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("general.barcode")}</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>{t("general.price")}</Label>
              <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("general.costPrice")}</Label>
              <Input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("general.stock")}</Label>
              <Input type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("general.minStock")}</Label>
              <Input type="number" min="0" step="1" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("general.vatRate")}</Label>
              <Input type="number" min="0" max="100" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("general.expiryDate")}</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {type === "VARIABLE" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("variable.title")}</CardTitle>
            <CardDescription>{t("variable.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t("variable.attributes")}</Label>
                <Button type="button" size="sm" variant="outline" className="gap-1" onClick={openCreateAttributeDialog}>
                  <Plus className="size-3.5" />
                  {t("variable.addAttribute")}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {attributes.map((attr) => (
                  <div key={attr.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedAttributeIds.includes(attr.id)}
                        onCheckedChange={(v) => toggleAttribute(attr.id, Boolean(v))}
                      />
                      <span className="text-sm">{attr.name}</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => openEditAttributeDialog(attr)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => void deleteAttribute(attr)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedAttributeIds.length > 0 ? (
              <div className="space-y-3">
                <Label>{t("variable.values")}</Label>
                {attributes
                  .filter((a) => selectedAttributeIds.includes(a.id))
                  .map((attr) => (
                    <Card key={attr.id} className="border-dashed">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{attr.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-2 sm:grid-cols-3">
                        {attr.values.map((v) => (
                          <label key={v.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                            <Checkbox
                              checked={(selectedValueIdsByAttr[attr.id] ?? []).includes(v.id)}
                              onCheckedChange={(checked) => toggleAttributeValue(attr.id, v.id, Boolean(checked))}
                            />
                            <span>{v.value}</span>
                          </label>
                        ))}
                        {attr.values.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t("variable.noValues")}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : null}

            <div className="flex justify-between gap-2">
              <p className="text-xs text-muted-foreground">{t("variable.generateHint")}</p>
              <Button type="button" variant="outline" className="gap-1" onClick={generateVariants}>
                <Plus className="size-3.5" />
                {t("variable.generate")}
              </Button>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-2">
                <Label>{t("variable.variants")}</Label>
                <div className="space-y-2">
                  {variants.map((v) => (
                    <Card key={v.key}>
                      <CardContent className="grid gap-2 p-3 sm:grid-cols-12">
                        <div className="sm:col-span-5">
                          <Badge variant="secondary" className="h-auto py-1 text-xs">
                            {v.label}
                          </Badge>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="flex items-center gap-1">
                            <Input
                              placeholder={t("variable.variantSku")}
                              value={v.sku}
                              onChange={(e) => updateVariant(v.key, { sku: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-9 shrink-0"
                              onClick={() => generateVariantSku(v.key)}
                              aria-label={t("variable.generateSku")}
                              title={t("variable.generateSku")}
                            >
                              <Wand2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={t("variable.variantPrice")}
                            value={v.price}
                            onChange={(e) => updateVariant(v.key, { price: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder={t("variable.variantStock")}
                            value={v.stock}
                            onChange={(e) => updateVariant(v.key, { stock: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard/products">{t("cancel")}</Link>
        </Button>
        <Button onClick={() => void submit()} disabled={saving}>
          {saving ? t("saving") : t("submit")}
        </Button>
      </div>

      <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {attributeDialogMode === "create" ? t("attributeDialog.createTitle") : t("attributeDialog.editTitle")}
            </DialogTitle>
            <DialogDescription>{t("attributeDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("attributeDialog.name")}</Label>
              <Input value={attributeNameInput} onChange={(e) => setAttributeNameInput(e.target.value)} />
            </div>
            {attributeDialogMode === "create" ? (
              <div className="space-y-1">
                <Label>{t("attributeDialog.values")}</Label>
                <Input
                  value={attributeValuesInput}
                  onChange={(e) => setAttributeValuesInput(e.target.value)}
                  placeholder={t("attributeDialog.valuesPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("attributeDialog.valuesHint")}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAttributeDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void saveAttributeDialog()} disabled={attributeSaving}>
              {attributeSaving ? t("saving") : t("attributeDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
