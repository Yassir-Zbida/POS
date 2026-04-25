import "./globals.css";

import type { Viewport } from "next";
import { cookies } from "next/headers";
import { DM_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { defaultLocale, type Locale } from "@/i18n/routing";

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

const LOCALE_COOKIE = "NEXT_LOCALE";

function coerceLocale(value: string | undefined | null): Locale {
  if (value === "fr" || value === "en" || value === "ar") return value;
  return defaultLocale;
}

function dirForLocale(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161622" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = coerceLocale(cookieLocale);

  return (
    <html
      lang={locale}
      dir={dirForLocale(locale)}
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

