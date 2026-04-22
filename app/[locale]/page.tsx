import { redirect } from "next/navigation";

import { defaultLocale, type Locale } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;

  redirect(locale === defaultLocale ? "/login" : `/${locale}/login`);
}

