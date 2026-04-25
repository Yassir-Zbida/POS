import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { LanguageSwitcherFooter } from "@/components/language-switcher-footer";
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
  return { title: t("forgotPassword") };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-y-auto bg-muted px-4 py-8 pb-24 sm:p-6 sm:pb-24 md:p-10">
      <AuthLiquidBackground />
      <div
        className={`absolute top-[max(1rem,env(safe-area-inset-top,1rem))] z-20 ${locale === "ar" ? "left-[max(1rem,env(safe-area-inset-left,1rem))]" : "right-[max(1rem,env(safe-area-inset-right,1rem))]"}`}
      >
        <ModeToggle />
      </div>
      <div className="relative z-10 flex w-full max-w-sm flex-col justify-center gap-6">
        <Link href="/" className="flex items-center justify-center self-center">
          <BrandLogo locale={locale} width={52} height={13} priority imageClassName="max-h-10" />
        </Link>
        <ForgotPasswordForm />
      </div>
      <Suspense fallback={null}>
        <LanguageSwitcherFooter />
      </Suspense>
    </div>
  );
}
