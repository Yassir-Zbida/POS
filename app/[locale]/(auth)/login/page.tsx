import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LanguageSwitcherFooter } from "@/components/language-switcher-footer";
import { LoginForm } from "@/components/login-form";
import { RedirectIfAuthenticated } from "@/components/redirect-if-authenticated";
import { AuthLiquidBackground } from "@/components/auth-liquid-background";
import { ModeToggle } from "@/components/mode-toggle";
import { BrandLogo } from "@/components/brand-logo";
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
  return { title: t("login") };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 pb-24 md:p-10">
      <AuthLiquidBackground />
      <div
        className={`absolute top-4 z-20 ${locale === "ar" ? "left-4" : "right-4"}`}
      >
        <ModeToggle />
      </div>
      <div className="relative z-10 flex w-full max-w-sm flex-col justify-center gap-6 min-h-[28rem]">
        <Link href="/" className="flex items-center justify-center self-center">
          <BrandLogo locale={locale} width={52} height={13} priority imageClassName="max-h-10" />
        </Link>
        <RedirectIfAuthenticated />
        <LoginForm />
      </div>
      <Suspense fallback={null}>
        <LanguageSwitcherFooter />
      </Suspense>
    </div>
  );
}

