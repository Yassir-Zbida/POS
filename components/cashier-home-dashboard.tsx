"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Landmark,
  AlertTriangle,
  CreditCard,
  BarChart3,
  PackageOpen,
  Tag,
  Clock,
  ArrowRight,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// ─── Demo data ───────────────────────────────────────────────────────────────

const CHART_DATA = {
  today: [
    { label: "08h", value: 0 },
    { label: "09h", value: 0 },
    { label: "10h", value: 0 },
    { label: "11h", value: 0 },
    { label: "12h", value: 0 },
    { label: "13h", value: 0 },
    { label: "14h", value: 0 },
    { label: "15h", value: 0 },
  ],
  week: [
    { label: "Mon", value: 1240 },
    { label: "Tue", value: 980 },
    { label: "Wed", value: 1560 },
    { label: "Thu", value: 2100 },
    { label: "Fri", value: 1875 },
    { label: "Sat", value: 3200 },
    { label: "Sun", value: 890 },
  ],
  month: [
    { label: "W1", value: 8400 },
    { label: "W2", value: 11200 },
    { label: "W3", value: 9800 },
    { label: "W4", value: 13500 },
  ],
};

const TOP_PRODUCTS = [
  { name: "Chanel No.5 – 100ml", category: "Parfum", qty: 14, revenue: 8400 },
  { name: "Polo Ralph Lauren", category: "Vêtements", qty: 9, revenue: 5850 },
  { name: "Dior Sauvage – 50ml", category: "Parfum", qty: 12, revenue: 7200 },
  { name: "T-shirt blanc M", category: "Vêtements", qty: 22, revenue: 2200 },
  { name: "Crème hydratante", category: "Soins", qty: 18, revenue: 1800 },
];

const TOP_CATEGORIES = [
  { name: "Parfum", revenue: 18400, percent: 48 },
  { name: "Vêtements", revenue: 12200, percent: 32 },
  { name: "Soins", revenue: 4800, percent: 13 },
  { name: "Accessoires", revenue: 2600, percent: 7 },
];

const RECENT_SALES = [
  { id: "#0041", cashier: "Yassir Z.", amount: 450, date: "14:32", method: "cash" },
  { id: "#0040", cashier: "Yassir Z.", amount: 1200, date: "13:18", method: "card" },
  { id: "#0039", cashier: "Yassir Z.", amount: 320, date: "12:05", method: "cash" },
  { id: "#0038", cashier: "Yassir Z.", amount: 890, date: "11:47", method: "credit" },
  { id: "#0037", cashier: "Yassir Z.", amount: 2100, date: "10:30", method: "cash" },
];

const LOW_STOCK = [
  { name: "Dior Sauvage – 50ml", stock: 2, min: 5 },
  { name: "T-shirt noir L", stock: 1, min: 3 },
  { name: "Crème hydratante", stock: 3, min: 10 },
];

// ─── KPI config ──────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month";

const KPI_BY_PERIOD: Record<
  Period,
  { revenue: number; tx: number; avg: number; trend: number }
> = {
  today: { revenue: 0, tx: 0, avg: 0, trend: 0 },
  week: { revenue: 38845, tx: 47, avg: 826, trend: 12.4 },
  month: { revenue: 142900, tx: 183, avg: 781, trend: -3.2 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0 %
      </span>
    );
  const up = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-emerald-500" : "text-red-500"
      )}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}
      {value} %
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
      <PackageOpen className="size-8 opacity-30" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CashierHomeDashboard() {
  const t = useTranslations("cashierHome");
  const [period, setPeriod] = React.useState<Period>("week");

  const kpi = KPI_BY_PERIOD[period];
  const chartData = CHART_DATA[period];
  const hasChartData = chartData.some((d) => d.value > 0);

  const PAYMENT_LABEL: Record<string, string> = {
    cash: "Espèces",
    card: "Carte",
    credit: "Crédit",
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="today">{t("periods.today")}</TabsTrigger>
            <TabsTrigger value="week">{t("periods.week")}</TabsTrigger>
            <TabsTrigger value="month">{t("periods.month")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        <KpiCard
          icon={<BarChart3 className="size-4" />}
          label={t("kpi.revenue")}
          value={`${fmt(kpi.revenue)} dh`}
          trend={<TrendBadge value={kpi.trend} />}
          accent="blue"
        />
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label={t("kpi.transactions")}
          value={String(kpi.tx)}
          trend={<TrendBadge value={kpi.trend} />}
          accent="violet"
        />
        <KpiCard
          icon={<CreditCard className="size-4" />}
          label={t("kpi.avgBasket")}
          value={`${fmt(kpi.avg)} dh`}
          trend={<TrendBadge value={kpi.trend} />}
          accent="emerald"
        />
        <KpiCard
          icon={<AlertTriangle className="size-4" />}
          label={t("kpi.lowStock")}
          value={`${LOW_STOCK.length} ${t("kpi.items")}`}
          accent="amber"
          urgent={LOW_STOCK.length > 0}
        />
        <KpiCard
          icon={<Users className="size-4" />}
          label={t("kpi.credit")}
          value="3 200,00 dh"
          accent="rose"
        />
        <KpiCard
          icon={<Landmark className="size-4" />}
          label={t("kpi.sessions")}
          value="1"
          accent="sky"
        />
      </div>

      {/* ── Performance overview + Quick actions ── */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Chart card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <p className="text-base font-semibold">{t("overview.title")}</p>
              <p className="text-xs text-muted-foreground">{t("overview.subtitle")}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("overview.salesInsights")}
            </p>
            <div className="mb-4 flex items-end gap-3">
              <span className="text-3xl font-bold tracking-tight">
                {fmt(kpi.revenue)} dh
              </span>
              <TrendBadge value={kpi.trend} />
            </div>

            {hasChartData ? (
              <ResponsiveContainer width="100%" height={160} className="sm:[&]:!h-[200px]">
                <BarChart data={chartData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    className="fill-muted-foreground"
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${fmt(v)} dh`, ""]}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label={t("overview.noData")} />
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2">
            <p className="text-base font-semibold">{t("quickActions.title")}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <QuickAction
              icon={<ShoppingCart className="size-4" />}
              label={t("quickActions.openPos")}
              href="/dashboard/cashier/pos"
              color="blue"
            />
            <QuickAction
              icon={<Landmark className="size-4" />}
              label={t("quickActions.openSession")}
              href="/dashboard/cashier/cash-register"
              color="emerald"
            />
            <QuickAction
              icon={<Tag className="size-4" />}
              label={t("quickActions.addProduct")}
              href="/dashboard/cashier/products"
              color="violet"
            />
            <QuickAction
              icon={<BarChart3 className="size-4" />}
              label={t("quickActions.viewReports")}
              href="/dashboard/cashier/reports"
              color="amber"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Operations performance ── */}
      <div>
        <p className="mb-3 text-base font-semibold">{t("operations.title")}</p>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Top products */}
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <ShoppingCart className="size-4 text-muted-foreground" />
                {t("operations.topProducts")}
              </p>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                <Link href="/dashboard/cashier/products">
                  {t("operations.product")} <ArrowRight className="size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {TOP_PRODUCTS.length === 0 ? (
                <EmptyState label={t("operations.noProducts")} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[340px] text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-start font-medium">{t("operations.product")}</th>
                        <th className="px-4 py-2 text-end font-medium">{t("operations.qty")}</th>
                        <th className="px-4 py-2 text-end font-medium">{t("operations.revenue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TOP_PRODUCTS.map((p, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="font-medium leading-none">{p.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{p.category}</p>
                          </td>
                          <td className="px-4 py-2.5 text-end text-muted-foreground">{p.qty}</td>
                          <td className="px-4 py-2.5 text-end font-semibold">{fmt(p.revenue)} dh</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top categories */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Tag className="size-4 text-muted-foreground" />
                {t("operations.topCategories")}
              </p>
            </CardHeader>
            <CardContent>
              {TOP_CATEGORIES.length === 0 ? (
                <EmptyState label={t("operations.noCategories")} />
              ) : (
                <div className="flex flex-col gap-3">
                  {TOP_CATEGORIES.map((c, i) => (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.percent}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${c.percent}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{fmt(c.revenue)} dh</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low stock alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <AlertTriangle className="size-4 text-amber-500" />
                {t("operations.lowStockAlerts")}
              </p>
              {LOW_STOCK.length > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {LOW_STOCK.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {LOW_STOCK.length === 0 ? (
                <EmptyState label={t("operations.noAlerts")} />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {LOW_STOCK.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-900/10"
                    >
                      <div>
                        <p className="text-sm font-medium leading-none">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t("operations.min")}: {item.min}
                        </p>
                      </div>
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        {item.stock}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Recent sales ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="size-4 text-muted-foreground" />
            {t("operations.recentSales")}
          </p>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
            <Link href="/dashboard/cashier/sales">
              <span className="hidden sm:inline">{t("operations.recentSales")}</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {RECENT_SALES.length === 0 ? (
            <EmptyState label={t("operations.noSales")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-start font-medium">#</th>
                    <th className="px-4 py-2 text-start font-medium">{t("operations.cashier")}</th>
                    <th className="px-4 py-2 text-start font-medium hidden sm:table-cell">{t("operations.date")}</th>
                    <th className="px-4 py-2 text-start font-medium hidden md:table-cell">Méthode</th>
                    <th className="px-4 py-2 text-end font-medium">{t("operations.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_SALES.map((s, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.id}</td>
                      <td className="px-4 py-2.5 font-medium">{s.cashier}</td>
                      <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">{s.date}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        <PaymentBadge method={s.method} label={PAYMENT_LABEL[s.method]} />
                      </td>
                      <td className="px-4 py-2.5 text-end font-semibold">{fmt(s.amount)} dh</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ACCENT_CLASSES: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
};

function KpiCard({
  icon,
  label,
  value,
  trend,
  accent = "blue",
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: React.ReactNode;
  accent?: string;
  urgent?: boolean;
}) {
  return (
    <Card className={cn("gap-2 p-3 sm:gap-3 sm:p-4", urgent && "border-amber-300 dark:border-amber-700")}>
      <div className="flex items-center justify-between">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8", ACCENT_CLASSES[accent])}>
          {icon}
        </span>
        {trend}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold tracking-tight sm:text-xl">{value}</p>
      </div>
    </Card>
  );
}

const QA_COLOR: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/10 dark:border-blue-900/40 dark:hover:bg-blue-900/20",
  emerald: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/40 dark:hover:bg-emerald-900/20",
  violet: "bg-violet-50 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/10 dark:border-violet-900/40 dark:hover:bg-violet-900/20",
  amber: "bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/10 dark:border-amber-900/40 dark:hover:bg-amber-900/20",
};

const QA_ICON_COLOR: Record<string, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
};

function QuickAction({
  icon,
  label,
  href,
  color = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        QA_COLOR[color]
      )}
    >
      <span className={cn("shrink-0", QA_ICON_COLOR[color])}>{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ArrowRight className="size-3.5 text-muted-foreground" />
    </Link>
  );
}

function PaymentBadge({ method, label }: { method: string; label: string }) {
  const styles: Record<string, string> = {
    cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    card: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    credit: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  };
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", styles[method] ?? "bg-muted text-muted-foreground")}>
      {label}
    </span>
  );
}
