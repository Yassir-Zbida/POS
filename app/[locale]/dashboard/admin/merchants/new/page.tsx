import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { MerchantNewForm } from "@/components/admin/merchant-new-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "fr"
        ? "Ajouter un marchand"
        : locale === "ar"
          ? "إضافة تاجر"
          : "Add merchant",
  };
}

export default async function NewMerchantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <MerchantNewForm />;
}
