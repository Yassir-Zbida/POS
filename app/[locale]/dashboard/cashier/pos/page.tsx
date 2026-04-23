"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Minus,
  Plus,
  RefreshCcw,
  Search,
  ShoppingCart,
  TicketPercent,
  Trash2,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: "Shoes" | "Clothing" | "Others";
};

const PRODUCTS: readonly Product[] = [
  { id: "p1", name: "Nike Waffle Debut", price: 80.0, stock: 218, category: "Shoes" },
  { id: "p2", name: "Nike Tech", price: 130.83, stock: 198, category: "Clothing" },
  { id: "p3", name: "Nike V2K Run New", price: 16.5, stock: 123, category: "Others" },
  { id: "p4", name: "Nike P-6000", price: 115.28, stock: 121, category: "Shoes" },
  { id: "p5", name: "Nike Zoom Vomero Roam", price: 187.43, stock: 119, category: "Shoes" },
  { id: "p6", name: "Men's Fleece Cargo Pants", price: 65.42, stock: 92, category: "Clothing" },
];

type CartLine = { productId: string; qty: number; detail?: "lineDetailA" | "lineDetailB" };

const CATEGORY_COUNTS = {
  all: 320,
  Shoes: 182,
  Clothing: 78,
  Others: 60,
} as const;

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

export default function StaffPosPage() {
  const t = useTranslations("staff.pos");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<"All" | Product["category"]>("All");
  const [barcode, setBarcode] = React.useState("");
  const [lines, setLines] = React.useState<CartLine[]>([
    { productId: "p3", qty: 1, detail: "lineDetailA" },
    { productId: "p5", qty: 1, detail: "lineDetailB" },
  ]);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [promoApplied, setPromoApplied] = React.useState(true);

  const filtered = PRODUCTS.filter((p) => {
    const matchesCategory = category === "All" ? true : p.category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q ? true : p.name.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const cart = lines
    .map((l) => {
      const product = PRODUCTS.find((p) => p.id === l.productId);
      if (!product) return null;
      return { ...l, product };
    })
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const subTotal = cart.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const tax = subTotal * 0.12;
  const discount = promoApplied ? subTotal * 0.1 : 0;
  const total = Math.max(0, subTotal + tax - discount);

  function addToCart(productId: string) {
    setLines((prev) => {
      const found = prev.find((l) => l.productId === productId);
      if (!found) return [...prev, { productId, qty: 1 }];
      return prev.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l));
    });
  }

  function dec(productId: string) {
    setLines((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, qty: Math.max(0, l.qty - 1) } : l))
        .filter((l) => l.qty > 0),
    );
  }

  function inc(productId: string) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l)));
  }

  function remove(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  const categoryTabs: { id: "All" | Product["category"]; count: number }[] = [
    { id: "All", count: CATEGORY_COUNTS.all },
    { id: "Shoes", count: CATEGORY_COUNTS.Shoes },
    { id: "Clothing", count: CATEGORY_COUNTS.Clothing },
    { id: "Others", count: CATEGORY_COUNTS.Others },
  ];

  return (
    <div className="p-3 sm:p-4 lg:grid lg:min-h-0 lg:grid-cols-1 lg:gap-4 xl:grid-cols-[1fr_420px]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="rounded-2xl border-border/50 bg-[hsl(var(--cashier-surface))] ps-10 shadow-sm"
              />
            </div>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder={t("barcodePlaceholder")}
              className="max-w-full rounded-2xl border-dashed sm:max-w-xs"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 self-end rounded-2xl border border-border/50 sm:hidden"
            aria-label={t("searchPlaceholder")}
          >
            <Search className="size-4" />
          </Button>
        </div>

        <div className="-mx-1 flex items-center gap-2 overflow-x-auto pb-1">
          {categoryTabs.map((tab) => {
            const active = category === tab.id;
            const count = tab.count;
            const label =
              tab.id === "All"
                ? t("categories.allWithCount", { count })
                : tab.id === "Shoes"
                  ? t("categories.shoesWithCount", { count })
                  : tab.id === "Clothing"
                    ? t("categories.clothingWithCount", { count })
                    : t("categories.othersWithCount", { count });
            return (
              <Button
                key={tab.id}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(tab.id)}
                className={cn("shrink-0 rounded-full px-4", active && "shadow-sm")}
              >
                {label}
              </Button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="overflow-hidden rounded-3xl border border-border/50 bg-[hsl(var(--cashier-surface))] shadow-sm"
            >
              <CardHeader className="space-y-2 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-medium text-background">
                    {t("stock", { count: p.stock })}
                  </div>
                </div>
                <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-muted/80">
                  <ImageIcon className="size-10 text-muted-foreground/50" aria-hidden="true" />
                </div>
                <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                <p className="line-clamp-2 text-xs text-muted-foreground">{t("description")}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                <div className="text-lg font-bold tabular-nums">{money(p.price)}</div>
                <Button
                  type="button"
                  className="w-full rounded-2xl font-semibold shadow-sm"
                  onClick={() => addToCart(p.id)}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t("addToCart")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <aside className="mt-4 min-h-0 lg:mt-0 xl:mt-0 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-3.5rem)]">
        <Card className="flex max-h-full flex-col overflow-hidden rounded-3xl border border-border/50 bg-[hsl(var(--cashier-surface))] shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/40 pb-3">
            <CardTitle className="text-base font-semibold">{t("detailTransaction")}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-destructive hover:text-destructive"
              onClick={() => setLines([])}
            >
              <RefreshCcw className="size-3.5" aria-hidden="true" />
              {t("resetOrder")}
            </Button>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  {t("cartEmpty")}
                </div>
              ) : (
                cart.map((l) => (
                  <div
                    key={l.productId}
                    className="flex gap-3 rounded-2xl border border-border/40 bg-background/60 p-2.5 shadow-sm"
                  >
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ShoppingCart className="size-5 opacity-50" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{l.product.name}</div>
                      {l.detail ? <div className="text-xs text-muted-foreground">{t(l.detail)}</div> : null}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {money(l.product.price)} · {t("lineEach")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-sm font-semibold tabular-nums">{money(l.product.price * l.qty)}</div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 rounded-lg"
                          onClick={() => dec(l.productId)}
                          aria-label="Decrease"
                        >
                          <Minus className="size-3" />
                        </Button>
                        <div className="w-6 text-center text-xs font-semibold tabular-nums">{l.qty}</div>
                        <Button
                          type="button"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          onClick={() => inc(l.productId)}
                          aria-label="Increase"
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => remove(l.productId)}
                          aria-label="Remove"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TicketPercent className="size-4" aria-hidden="true" />
                  {t("promoNewUser")}
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="link" className="h-8 px-1 text-primary">
                    {t("changePromo")}
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setPromoApplied((v) => !v)}
                >
                  {promoApplied ? t("remove") : t("apply")}
                </Button>
              </div>
            </div>

            <div className="mt-auto space-y-1.5 rounded-2xl border border-border/50 bg-background/60 p-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("subTotal")}</span>
                <span className="tabular-nums text-foreground">{money(subTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("tax")}</span>
                <span className="tabular-nums text-foreground">{money(tax)}</span>
              </div>
              <div className={cn("flex items-center justify-between", promoApplied ? "" : "opacity-50")}>
                <span className="text-muted-foreground">{t("discount")}</span>
                <span className="tabular-nums text-destructive">−{money(discount)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                <span>{t("totalPayment")}</span>
                <span className="tabular-nums text-primary">{money(total)}</span>
              </div>

              <div className="mt-1 rounded-xl border border-border/50 bg-card p-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{t("paymentCredit")}</span>
                  <span className="text-primary">{t("changeMethod")} ›</span>
                </div>
              </div>

              <Button
                type="button"
                className="mt-1 w-full rounded-2xl py-5 text-base font-bold shadow-md"
                disabled={cart.length === 0}
                onClick={() => setCheckoutOpen(true)}
              >
                {t("continue")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>

      {checkoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl border border-border/50 bg-[hsl(var(--cashier-surface))] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{t("checkoutTitle")}</div>
                <div className="text-xs text-muted-foreground">{t("checkoutHint")}</div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCheckoutOpen(false)}>
                {t("close")}
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/50 p-3 text-sm">
                <div className="font-medium">{t("paymentCredit")}</div>
                <div className="mt-2 space-y-2">
                  <Button type="button" variant="outline" className="w-full justify-start rounded-xl">
                    {t("paymentCredit")}
                  </Button>
                  <Button type="button" variant="outline" className="w-full justify-start rounded-xl">
                    {t("payCash")}
                  </Button>
                  <Button type="button" variant="outline" className="w-full justify-start rounded-xl">
                    {t("payWallet")}
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-border/50 p-3 text-sm">
                <div className="font-medium">{t("receipt")}</div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>
                    {t("items")}: {cart.reduce((n, l) => n + l.qty, 0)}
                  </div>
                  <div>
                    {t("subTotal")}: {money(subTotal)}
                  </div>
                  <div>
                    {t("tax")}: {money(tax)}
                  </div>
                  <div>
                    {t("discount")}: −{money(discount)}
                  </div>
                  <div className="pt-2 text-sm font-semibold text-foreground">
                    {t("total")}: {money(total)}
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-3 w-full rounded-2xl font-semibold"
                  onClick={() => setCheckoutOpen(false)}
                >
                  {t("payPrint")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
