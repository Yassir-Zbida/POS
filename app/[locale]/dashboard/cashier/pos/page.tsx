import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

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
  return { title: `${t("dashboard")} | ${t("cashierPos")}` };
}

export default function StaffPosPage() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center rounded-xl border bg-card p-4 text-sm text-muted-foreground sm:p-6">
      POS page (empty)
    </div>
  );
}
