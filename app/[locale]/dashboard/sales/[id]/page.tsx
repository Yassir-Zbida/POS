import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ManagerSaleDetailClient } from "@/components/manager/manager-sale-detail-client";
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
  return { title: t("dashboardSaleDetail") };
}

export default async function SaleDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  setRequestLocale(rawLocale as Locale);

  return (
    <div className="p-4 md:p-6">
      <ManagerSaleDetailClient saleId={id} />
    </div>
  );
}
