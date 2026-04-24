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
  return { title: t("pos") };
}

export default function PosPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">POS</h1>
    </main>
  );
}

