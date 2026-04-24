import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { type Locale } from "@/i18n/routing";
import { CashierHomeDashboard } from "@/components/cashier-home-dashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta.titles" });
  return { title: `${t("dashboard")} | ${t("cashier")}` };
}

export default function CashierDashboardIndexPage() {
  return <CashierHomeDashboard />;
}
