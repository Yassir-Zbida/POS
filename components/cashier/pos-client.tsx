"use client";

import * as React from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Layers,
  Minus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  Wrench,
  X,
  Plus,
  ScanLine,
  Receipt,
  AlertTriangle,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductType = "SIMPLE" | "VARIABLE" | "SERVICE";
type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "CREDIT";

type ProductVariant = {
  id: string;
  name: string;
  sku: string | null;
  barcode?: string | null;
  priceOverride: number | null;
  stock: number;
  minStock: number;
  isActive: boolean;
};

type ProductRow = {
  id: string;
  type: ProductType;
  nameFr: string;
  nameEn?: string | null;
  nameAr?: string | null;
  sku: string;
  barcode?: string | null;
  price: number;
  vatRate: number;
  stock: number;
  minStock: number;
  isActive: boolean;
  category?: {
    id: string;
    nameFr: string;
    nameEn?: string | null;
    nameAr?: string | null;
  };
  variants?: ProductVariant[];
};

type CartItem = {
  cartKey: string;
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  stock: number;
  lineDiscount: number;
};

type CouponResult = {
  valid: boolean;
  coupon?: { id: string; code: string; type: string; value: number };
  discountAmt?: number;
  error?: string;
};

type CompletedSale = {
  id: string;
  totalAmount: number;
  subtotal: number;
  vatAmt: number;
  discountAmt: number;
  paymentMethod: string;
  amountTendered?: number;
  changeGiven?: number;
  items: CartItem[];
  couponCode?: string;
  createdAt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const VAT_RATE = 0.2;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null) {
  if (n == null || isNaN(n)) return "0.00";
  return n.toFixed(2);
}

function buildReceiptHtml(sale: CompletedSale, locale: string): string {
  const date = new Date(sale.createdAt).toLocaleString(locale);
  const itemsHtml = sale.items
    .map(
      (i) => `<tr>
        <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.name}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">${fmt(i.price)}</td>
        <td style="text-align:right">${fmt(i.price * i.quantity)}</td>
      </tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:monospace;font-size:12px;max-width:300px;margin:0 auto;padding:12px}
    h2{text-align:center;font-size:14px;margin-bottom:2px}
    .center{text-align:center}.right{text-align:right}
    .divider{border:none;border-top:1px dashed #000;margin:8px 0}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;border-bottom:1px solid #000;padding:2px 0;font-size:11px}
    td{padding:2px 0;font-size:11px}
    .total-row td{font-weight:bold;font-size:14px;border-top:1px solid #000;padding-top:4px}
    .muted{color:#555}
    @media print{html,body{width:100%;margin:0;padding:0}}
  </style>
  </head><body>
  <h2>Hssabaty POS</h2>
  <p class="center muted">${date}</p>
  <p class="center muted">Receipt #${sale.id.slice(-8).toUpperCase()}</p>
  <hr class="divider">
  <table>
    <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <hr class="divider">
  <table>
    <tr><td>Subtotal</td><td class="right">${fmt(sale.subtotal)}</td></tr>
    ${sale.discountAmt > 0 ? `<tr><td>Discount</td><td class="right" style="color:green">-${fmt(sale.discountAmt)}</td></tr>` : ""}
    <tr><td>VAT (20%)</td><td class="right">${fmt(sale.vatAmt)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td class="right">${fmt(sale.totalAmount)}</td></tr>
  </table>
  <hr class="divider">
  <table>
    <tr><td>Payment</td><td class="right">${sale.paymentMethod}</td></tr>
    ${sale.amountTendered != null ? `<tr><td>Tendered</td><td class="right">${fmt(sale.amountTendered)}</td></tr>` : ""}
    ${sale.changeGiven != null && sale.changeGiven > 0 ? `<tr><td>Change</td><td class="right">${fmt(sale.changeGiven)}</td></tr>` : ""}
  </table>
  <hr class="divider">
  <p class="center muted">Thank you! / Merci!</p>
</body></html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PosClient() {
  const t = useTranslations("cashierPos");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  // Catalog state
  const [categories, setCategories] = React.useState<Array<{ id: string; label: string }>>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategoryId, setActiveCategoryId] = React.useState("");
  const [sessionId, setSessionId] = React.useState<string | undefined>();

  // Barcode
  const barcodeRef = React.useRef<HTMLInputElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = React.useState("");
  const [barcodeLoading, setBarcodeLoading] = React.useState(false);

  // Cart
  const [cart, setCart] = React.useState<CartItem[]>([]);

  // Variant selector
  const [variantProduct, setVariantProduct] = React.useState<ProductRow | null>(null);

  // Coupon
  const [couponCode, setCouponCode] = React.useState("");
  const [couponResult, setCouponResult] = React.useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = React.useState(false);

  // Checkout
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Receipt
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [completedSale, setCompletedSale] = React.useState<CompletedSale | null>(null);

  // ── Boot ──────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    void loadCategories();
    void loadOpenSession();
    void searchProducts("", "");
    // Auto-focus barcode on mount
    barcodeRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced product search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      void searchProducts(searchQuery, activeCategoryId);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, activeCategoryId]);

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadCategories() {
    try {
      const res = await fetchWithAuth("/api/v1/categories");
      if (!res.ok) return;
      const data = (await res.json()) as {
        categories?: Array<{ id: string; nameFr: string; nameEn?: string | null; nameAr?: string | null }>;
      };
      setCategories(
        (data.categories ?? []).map((c) => ({
          id: c.id,
          label:
            locale === "ar"
              ? c.nameAr || c.nameFr
              : locale === "en"
                ? c.nameEn || c.nameFr
                : c.nameFr,
        })),
      );
    } catch {
      // non-critical
    }
  }

  async function loadOpenSession() {
    try {
      const res = await fetchWithAuth("/api/v1/sessions?status=OPEN&limit=1");
      if (!res.ok) return;
      const data = (await res.json()) as { sessions?: Array<{ id: string }> };
      if (data.sessions?.[0]) setSessionId(data.sessions[0].id);
    } catch {
      // non-critical
    }
  }

  async function searchProducts(query: string, catId: string) {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (catId) params.set("categoryId", catId);
      params.set("limit", "60");
      const res = await fetchWithAuth(`/api/v1/pos/search?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        products?: ProductRow[];
        matchedVariantId?: string | null;
      };
      const list = data.products ?? [];
      setProducts(list);

      // Parent search returned nothing, API resolved exact variant barcode → one VARIABLE product + variant id
      if (query.trim() && list.length === 1 && data.matchedVariantId) {
        const p = list[0];
        const v = p.variants?.find((x) => x.id === data.matchedVariantId);
        if (p.type === "VARIABLE" && v?.isActive) {
          addToCart(p, v);
          setSearchQuery("");
        }
      }
    } finally {
      setLoadingProducts(false);
    }
  }

  async function lookupBarcode(barcode: string) {
    const raw = barcode.trim();
    if (!raw) return;
    setBarcodeLoading(true);
    try {
      const res = await fetchWithAuth(`/api/v1/pos/search?barcode=${encodeURIComponent(raw)}`);
      if (!res.ok) {
        toast.error(t("errors.barcodeNotFound"));
        return;
      }
      const data = (await res.json()) as {
        product?: ProductRow;
        products?: ProductRow[];
        matchedVariantId?: string | null;
      };
      const found = data.product ?? data.products?.[0];
      if (!found) {
        toast.error(t("errors.barcodeNotFound"));
      } else if (data.matchedVariantId) {
        const v = found.variants?.find((x) => x.id === data.matchedVariantId);
        if (found.type === "VARIABLE" && v?.isActive) {
          addToCart(found, v);
        } else {
          handleProductSelect(found);
        }
      } else {
        handleProductSelect(found);
      }
    } finally {
      setBarcodeInput("");
      setBarcodeLoading(false);
      barcodeRef.current?.focus();
    }
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────

  function localizedName(product: ProductRow) {
    if (locale === "ar") return product.nameAr || product.nameFr || product.nameEn || "";
    if (locale === "en") return product.nameEn || product.nameFr || "";
    return product.nameFr || product.nameEn || "";
  }

  function addToCart(product: ProductRow, variant?: ProductVariant) {
    if (!product.isActive) {
      toast.error(t("errors.productInactive"));
      return;
    }
    const price = Number(variant?.priceOverride ?? product.price);
    const stock = variant?.stock ?? product.stock;
    const cartKey = variant ? `${product.id}:${variant.id}` : product.id;
    const base = localizedName(product);
    const displayName = variant ? `${base} — ${variant.name}` : base;

    if (product.type !== "SERVICE" && stock === 0) {
      toast.error(t("errors.outOfStock"));
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        if (product.type !== "SERVICE" && existing.quantity >= stock) {
          toast.warning(t("errors.stockInsufficient"));
          return prev;
        }
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          cartKey,
          productId: product.id,
          variantId: variant?.id,
          name: displayName,
          sku: variant?.sku || product.sku,
          price,
          quantity: 1,
          stock: product.type === "SERVICE" ? Infinity : stock,
          lineDiscount: 0,
        },
      ];
    });
    toast.success(t("toast.added", { name: displayName }), { duration: 1200 });
  }

  function handleProductSelect(product: ProductRow) {
    if (product.type === "VARIABLE") {
      const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
      if (activeVariants.length === 0) {
        toast.error(t("errors.noVariants"));
        return;
      }
      setVariantProduct(product);
    } else {
      addToCart(product);
    }
  }

  function updateQty(cartKey: string, delta: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartKey !== cartKey) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (item.stock !== Infinity && newQty > item.stock) {
          toast.warning(t("errors.stockInsufficient"));
          return item;
        }
        return { ...item, quantity: newQty };
      }),
    );
  }

  function setItemQty(cartKey: string, value: string) {
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty < 1) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartKey !== cartKey) return item;
        if (item.stock !== Infinity && qty > item.stock) {
          toast.warning(t("errors.stockInsufficient"));
          return item;
        }
        return { ...item, quantity: qty };
      }),
    );
  }

  function removeItem(cartKey: string) {
    setCart((prev) => prev.filter((i) => i.cartKey !== cartKey));
  }

  function clearCart() {
    setCart([]);
    setCouponResult(null);
    setCouponCode("");
  }

  // ── Totals ────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity - i.lineDiscount, 0);
  const couponDiscount = couponResult?.valid ? (couponResult.discountAmt ?? 0) : 0;
  const afterDiscount = Math.max(0, subtotal - couponDiscount);
  const vatAmt = afterDiscount * VAT_RATE;
  const total = afterDiscount + vatAmt;
  const tendered = parseFloat(amountTendered || "0");
  const change = paymentMethod === "CASH" && tendered >= total ? tendered - total : 0;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Coupon ────────────────────────────────────────────────────────────────

  async function validateCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          cartTotal: subtotal,
        }),
      });
      if (!res.ok) {
        toast.error(t("errors.couponError"));
        return;
      }
      const data = (await res.json()) as CouponResult;
      setCouponResult(data);
      if (data.valid) {
        toast.success(t("toast.couponApplied", { discount: fmt(data.discountAmt) }));
      } else {
        toast.error(data.error ?? t("errors.invalidCoupon"));
      }
    } finally {
      setCouponLoading(false);
    }
  }

  // ── Checkout ──────────────────────────────────────────────────────────────

  async function submitSale() {
    if (cart.length === 0) {
      toast.error(t("errors.emptyCart"));
      return;
    }
    if (paymentMethod === "CASH" && amountTendered && tendered < total) {
      toast.error(t("errors.insufficientTender"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/v1/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          items: cart.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            unitPrice: i.price,
            discountAmt: i.lineDiscount,
          })),
          paymentMethod,
          amountTendered:
            paymentMethod === "CASH" && amountTendered ? tendered : undefined,
          couponId: couponResult?.valid ? couponResult.coupon?.id : undefined,
          discountAmt: couponDiscount,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? t("errors.saleFailed"));
        return;
      }

      const data = (await res.json()) as {
        sale: { id: string; createdAt: string };
        summary: {
          subtotal: number;
          vatAmt: number;
          totalAmount: number;
          totalDiscount: number;
          changeGiven?: number;
        };
      };

      const snapshot = [...cart];
      setCompletedSale({
        id: data.sale.id,
        totalAmount: data.summary.totalAmount,
        subtotal: data.summary.subtotal,
        vatAmt: data.summary.vatAmt,
        discountAmt: data.summary.totalDiscount,
        paymentMethod,
        amountTendered:
          paymentMethod === "CASH" && amountTendered ? tendered : undefined,
        changeGiven: data.summary.changeGiven,
        items: snapshot,
        couponCode: couponResult?.valid ? couponResult.coupon?.code : undefined,
        createdAt: data.sale.createdAt,
      });

      clearCart();
      setAmountTendered("");
      setCheckoutOpen(false);
      setReceiptOpen(true);
      toast.success(t("toast.saleCompleted"));
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    if (!completedSale) return;
    const w = window.open("", "_blank", "width=420,height=680");
    if (!w) return;
    w.document.write(buildReceiptHtml(completedSale, locale));
    w.document.close();
    w.onload = () => w.print();
  }

  function startNewSale() {
    setReceiptOpen(false);
    setCompletedSale(null);
    setPaymentMethod("CASH");
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-[calc(100svh-3.5rem)] overflow-hidden rounded-xl border bg-background"
      dir={dir}
    >
      {/* ══ Left: Catalog ══════════════════════════════════════════════════ */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar: barcode + search */}
        <div className="flex flex-col gap-2 border-b bg-muted/30 p-3">
          <div className="flex gap-2">
            {/* Barcode scanner */}
            <div className="relative w-52 shrink-0">
              <ScanLine className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                placeholder={t("barcodePlaceholder")}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void lookupBarcode(barcodeInput);
                }}
                className="h-9 ps-8 font-mono text-sm"
                disabled={barcodeLoading}
              />
            </div>
            {/* Text search */}
            <div className="relative flex-1">
              <Search className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 ps-8 text-sm"
              />
              {searchQuery && (
                <button
                  className="absolute end-2 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                className={cn(
                  "shrink-0 rounded-full px-3 py-0.5 text-xs font-medium transition-colors",
                  activeCategoryId === ""
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background text-muted-foreground hover:bg-accent",
                )}
                onClick={() => setActiveCategoryId("")}
              >
                {t("allCategories")}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-0.5 text-xs font-medium transition-colors",
                    activeCategoryId === c.id
                      ? "bg-primary text-primary-foreground"
                      : "border bg-background text-muted-foreground hover:bg-accent",
                  )}
                  onClick={() => setActiveCategoryId(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingProducts ? (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Search className="size-8 opacity-30" />
              <span className="text-sm">
                {searchQuery || activeCategoryId ? t("noResults") : t("startHint")}
              </span>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  name={localizedName(product)}
                  onSelect={() => handleProductSelect(product)}
                  tInStock={t("inStock")}
                  tOutOfStock={t("outOfStock")}
                  tVariable={t("typeVariable")}
                  tService={t("typeService")}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ Right: Cart ════════════════════════════════════════════════════ */}
      <div className="flex w-[360px] shrink-0 flex-col border-s bg-card">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4" />
            <span className="font-semibold">{t("cart")}</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                {totalItems}
              </Badge>
            )}
          </div>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={clearCart}
              title={t("clearCart")}
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <ShoppingCart className="size-8 opacity-20" />
              <p className="text-sm">{t("cartEmpty")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.cartKey} className="group flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(item.price)} × {item.quantity} ={" "}
                      <span className="font-medium text-foreground">
                        {fmt(item.price * item.quantity)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-6"
                      onClick={() =>
                        item.quantity === 1
                          ? removeItem(item.cartKey)
                          : updateQty(item.cartKey, -1)
                      }
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="size-3 text-destructive" />
                      ) : (
                        <Minus className="size-3" />
                      )}
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max={item.stock === Infinity ? undefined : item.stock}
                      value={item.quantity}
                      onChange={(e) => setItemQty(item.cartKey, e.target.value)}
                      className="h-6 w-10 px-1 text-center text-sm tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-6"
                      onClick={() => updateQty(item.cartKey, 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {/* Coupon */}
            <div className="flex gap-1.5">
              <Input
                placeholder={t("couponPlaceholder")}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void validateCoupon();
                }}
                className="h-8 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-2.5 text-xs"
                onClick={() => void validateCoupon()}
                disabled={couponLoading || !couponCode.trim()}
              >
                {t("applyCoupon")}
              </Button>
            </div>
            {couponResult?.valid && (
              <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400">
                <span className="font-medium">
                  {couponResult.coupon?.code} — -{fmt(couponResult.discountAmt)}
                </span>
                <button
                  onClick={() => {
                    setCouponResult(null);
                    setCouponCode("");
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <Separator />

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("subtotal")}</span>
                <span className="tabular-nums">{fmt(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{t("discount")}</span>
                  <span className="tabular-nums">-{fmt(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>{t("vat", { rate: "20" })}</span>
                <span className="tabular-nums">{fmt(vatAmt)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>{t("total")}</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>
            </div>

            {/* Checkout button */}
            <Button
              className="w-full gap-2 text-sm"
              size="lg"
              onClick={() => setCheckoutOpen(true)}
            >
              <CreditCard className="size-4" />
              {t("checkout")} — {fmt(total)}
            </Button>
          </div>
        )}
      </div>

      {/* ══ Variant selector dialog ════════════════════════════════════════ */}
      <Dialog open={!!variantProduct} onOpenChange={() => setVariantProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {variantProduct ? localizedName(variantProduct) : ""}
            </DialogTitle>
            <DialogDescription>{t("selectVariant")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {(variantProduct?.variants ?? [])
              .filter((v) => v.isActive)
              .map((variant) => {
                const price = Number(variant.priceOverride ?? variantProduct?.price ?? 0);
                const isOut = variant.stock === 0;
                const isLow = variant.stock > 0 && variant.stock <= (variant.minStock ?? 0);
                return (
                  <button
                    key={variant.id}
                    disabled={isOut}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 text-sm transition-colors",
                      isOut
                        ? "cursor-not-allowed opacity-40"
                        : "hover:border-primary/50 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/30",
                    )}
                    onClick={() => {
                      if (variantProduct) addToCart(variantProduct, variant);
                      setVariantProduct(null);
                    }}
                  >
                    <span className="font-medium">{variant.name}</span>
                    <div className="text-end">
                      <p className="font-bold">{fmt(price)}</p>
                      <p
                        className={cn(
                          "text-xs",
                          isOut
                            ? "text-red-500"
                            : isLow
                              ? "text-amber-500"
                              : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {isOut ? t("outOfStock") : `${variant.stock} ${t("inStock")}`}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantProduct(null)}>
              {t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Checkout dialog ════════════════════════════════════════════════ */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("checkoutTitle")}</DialogTitle>
            <DialogDescription>{t("checkoutSubtitle")}</DialogDescription>
          </DialogHeader>

          {/* Order summary */}
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {cart.map((i) => (
                <div key={i.cartKey} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {i.name} ×{i.quantity}
                  </span>
                  <span className="shrink-0 tabular-nums">{fmt(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-2" />
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("subtotal")}</span>
                <span className="tabular-nums">{fmt(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>{t("discount")}</span>
                  <span className="tabular-nums">-{fmt(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("vat", { rate: "20" })}</span>
                <span className="tabular-nums">{fmt(vatAmt)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>{t("total")}</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("paymentMethod")}</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["CASH", "CARD", "TRANSFER", "CREDIT"] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-colors",
                    paymentMethod === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-accent",
                  )}
                  onClick={() => setPaymentMethod(m)}
                >
                  {m === "CASH" ? (
                    <Banknote className="size-4" />
                  ) : m === "CARD" ? (
                    <CreditCard className="size-4" />
                  ) : m === "TRANSFER" ? (
                    <Receipt className="size-4" />
                  ) : (
                    <Tag className="size-4" />
                  )}
                  {t(`payment.${m.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Cash tendered */}
          {paymentMethod === "CASH" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("amountTendered")}</Label>
              <Input
                type="number"
                min={fmt(total)}
                step="0.01"
                placeholder={fmt(total)}
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                autoFocus
              />
              {amountTendered && tendered >= total ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    {t("change")}: <strong className="tabular-nums">{fmt(change)}</strong>
                  </span>
                </div>
              ) : amountTendered && tendered < total ? (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>
                    {t("missingAmount")}: {fmt(total - tendered)}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              className="gap-2"
              onClick={() => void submitSale()}
              disabled={
                submitting ||
                (paymentMethod === "CASH" && !!amountTendered && tendered < total)
              }
            >
              {submitting ? t("processing") : t("confirmSale")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Receipt dialog ═════════════════════════════════════════════════ */}
      <Dialog open={receiptOpen} onOpenChange={() => startNewSale()}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" />
              {t("saleCompleted")}
            </DialogTitle>
          </DialogHeader>

          {completedSale && (
            <div className="rounded-lg border bg-muted/10 p-4 font-mono text-xs">
              {/* Header */}
              <div className="mb-3 text-center">
                <p className="text-sm font-bold">Hssabaty POS</p>
                <p className="text-muted-foreground">
                  #{completedSale.id.slice(-8).toUpperCase()}
                </p>
                <p className="text-muted-foreground">
                  {new Date(completedSale.createdAt).toLocaleString(locale)}
                </p>
              </div>

              {/* Items */}
              <div className="mb-2 space-y-1 border-t border-dashed pt-2">
                {completedSale.items.map((i) => (
                  <div key={i.cartKey} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {i.name} ×{i.quantity}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {fmt(i.price * i.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 border-t border-dashed pt-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("subtotal")}</span>
                  <span className="tabular-nums">{fmt(completedSale.subtotal)}</span>
                </div>
                {completedSale.discountAmt > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>{t("discount")}</span>
                    <span className="tabular-nums">-{fmt(completedSale.discountAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT 20%</span>
                  <span className="tabular-nums">{fmt(completedSale.vatAmt)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed pt-1 text-sm font-bold">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{fmt(completedSale.totalAmount)}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="mt-2 space-y-1 border-t border-dashed pt-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t(`payment.${completedSale.paymentMethod.toLowerCase()}`)}</span>
                  {completedSale.amountTendered != null && (
                    <span className="tabular-nums">{fmt(completedSale.amountTendered)}</span>
                  )}
                </div>
                {completedSale.changeGiven != null && completedSale.changeGiven > 0 && (
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>{t("change")}</span>
                    <span className="tabular-nums">{fmt(completedSale.changeGiven)}</span>
                  </div>
                )}
              </div>

              <p className="mt-3 text-center text-muted-foreground">{t("thankYou")}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handlePrint}
            >
              <Printer className="size-4" />
              {t("print")}
            </Button>
            <Button className="flex-1 gap-2" onClick={startNewSale}>
              <ShoppingCart className="size-4" />
              {t("newSale")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({
  product,
  name,
  onSelect,
  tInStock,
  tOutOfStock,
  tVariable,
  tService,
}: {
  product: ProductRow;
  name: string;
  onSelect: () => void;
  tInStock: string;
  tOutOfStock: string;
  tVariable: string;
  tService: string;
}) {
  const isService = product.type === "SERVICE";
  const isOut = !isService && product.stock === 0;
  const isLow = !isService && product.stock > 0 && product.stock <= product.minStock;

  return (
    <button
      onClick={onSelect}
      disabled={isOut}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border p-3 text-start transition-all",
        isOut
          ? "cursor-not-allowed opacity-45"
          : "hover:border-primary/40 hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      {/* Top badges */}
      <div className="flex flex-wrap items-center gap-1">
        {product.category && (
          <Badge
            variant="secondary"
            className="h-4 max-w-[80px] truncate px-1.5 text-[10px]"
          >
            {product.category.nameFr}
          </Badge>
        )}
        {product.type === "VARIABLE" && (
          <Badge
            variant="outline"
            className="h-4 gap-0.5 px-1.5 text-[10px] text-violet-600 dark:text-violet-400"
          >
            <Layers className="size-2.5" />
            {tVariable}
          </Badge>
        )}
        {product.type === "SERVICE" && (
          <Badge
            variant="outline"
            className="h-4 gap-0.5 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-400"
          >
            <Wrench className="size-2.5" />
            {tService}
          </Badge>
        )}
      </div>

      {/* Name */}
      <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug">{name}</p>

      {/* Price + stock */}
      <div className="flex items-end justify-between gap-1 pt-0.5">
        <span className="text-base font-bold tabular-nums">
          {Number(product.price).toFixed(2)}
        </span>
        {!isService && (
          <span
            className={cn(
              "text-[10px] font-medium",
              isOut
                ? "text-red-500"
                : isLow
                  ? "text-amber-500"
                  : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {isOut ? tOutOfStock : `${product.stock} ${tInStock}`}
          </span>
        )}
      </div>
    </button>
  );
}
