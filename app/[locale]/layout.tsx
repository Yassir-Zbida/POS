import "../globals.css";

import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { locales, type Locale } from "@/i18n/routing";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

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

function getDir(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

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
    <html
      lang={locale}
      dir={getDir(locale)}
      className={`${dmSans.variable} ${ibmPlexArabic.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          <Toaster position={locale === "ar" ? "bottom-left" : "bottom-right"} />
        </ThemeProvider>
      </body>
    </html>
  );
}

