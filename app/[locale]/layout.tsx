import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { locales, type Locale } from "@/i18n/routing";
import { Toaster } from "@/components/ui/sonner";
import { HtmlLocaleSync } from "@/components/html-locale-sync";
import { ErrorTrackerProvider } from "@/components/error-tracker-provider";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const tBrand = await getTranslations({ locale, namespace: "brand" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });
  const appName = tBrand("name");

  return {
    title: {
      default: appName,
      template: `%s | ${appName}`,
    },
    description: tMeta("description"),
    icons: {
      icon: [{ url: "/assets/brand/favicon.svg", type: "image/svg+xml" }],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <>
      {/* Keep <html lang dir> in sync on every client-side locale navigation */}
      <HtmlLocaleSync locale={locale} />
      <ErrorTrackerProvider />
      <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      <Toaster
        position={locale === "ar" ? "bottom-left" : "bottom-right"}
        dir={locale === "ar" ? "rtl" : "ltr"}
        closeButton
      />
    </>
  );
}

