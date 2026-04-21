import "../globals.css";

import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { locales, type Locale } from "@/i18n/routing";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hssabaty Point de vente",
    template: "%s • Hssabaty Point de vente",
  },
  description:
    "Hssabaty Point de vente is a POS solution by Hssabaty startup, building multiple solutions for companies.",
  icons: {
    icon: [{ url: "/assets/brand/favicon.svg", type: "image/svg+xml" }],
  },
};

function getDir(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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
    <html lang={locale} dir={getDir(locale)}>
      <body className={`${dmSans.variable} ${ibmPlexArabic.variable}`}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

