import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { type Locale } from "@/i18n/routing";
import { ManagerCategoriesClient } from "@/components/manager/manager-categories-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta.titles" });
  return { title: t("dashboardCategories") };
}

export default function CategoriesPage() {
  return (
    <div className="p-4 md:p-6">
      <ManagerCategoriesClient />
    </div>
  );
}

