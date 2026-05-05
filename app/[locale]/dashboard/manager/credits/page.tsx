import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ManagerCreditsClient } from "@/components/manager/manager-credits-client";
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
  return { title: t("managerCredits") };
}

export default function ManagerCreditsPage() {
  return (
    <div className="p-4 md:p-6">
      <ManagerCreditsClient />
    </div>
  );
}
