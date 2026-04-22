import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { type Locale } from "@/i18n/routing";
import { LogoutButton } from "@/components/logout-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta.titles" });
  return { title: t("dashboard") };
}

export default function DashboardPage() {
  return (
    <div className="flex items-center justify-between gap-4 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <LogoutButton />
    </div>
  );
}

