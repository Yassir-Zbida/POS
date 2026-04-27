import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { MerchantDetailClient } from "@/components/admin/merchant-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "fr"
        ? "Détail du marchand"
        : locale === "ar"
          ? "تفاصيل التاجر"
          : "Merchant details",
  };
}

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);

  return <MerchantDetailClient merchantId={id} />;
}
