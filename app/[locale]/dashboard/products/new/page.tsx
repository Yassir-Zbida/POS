import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ManagerProductCreateClient } from "@/components/manager/manager-product-create-client";
import { type Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta.titles" });
  return { title: t("dashboardProducts") };
}

export default function ProductCreatePage() {
  return <ManagerProductCreateClient />;
}
