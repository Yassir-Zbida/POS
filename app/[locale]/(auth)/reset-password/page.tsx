import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LanguageSwitcherFooter } from "@/components/language-switcher-footer";
import { AuthLiquidBackground } from "@/components/auth-liquid-background";
import { ResetPasswordForm } from "@/components/reset-password-form";
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

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  const t = await getTranslations({ locale, namespace: "resetPassword" });

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 pb-24 md:p-10">
      <AuthLiquidBackground />
      <div
        className={`absolute top-4 z-20 ${locale === "ar" ? "left-4" : "right-4"}`}
      >
        <ModeToggle />
      </div>
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center justify-center self-center">
          <BrandLogo locale={locale} priority />
        </Link>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            {t("missingToken")}
          </div>
        )}
      </div>
      <LanguageSwitcherFooter />
    </div>
  );
}

