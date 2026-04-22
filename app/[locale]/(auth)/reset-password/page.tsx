import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LanguageSwitcherFooter } from "@/components/language-switcher-footer";
import { AuthLiquidBackground } from "@/components/auth-liquid-background";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { type Locale } from "@/i18n/routing";

const LOGO_BY_LOCALE: Record<Locale, string> = {
  en: "/assets/brand/logo-en.svg",
  fr: "/assets/brand/logo-fr.svg",
  ar: "/assets/brand/logo-ar.svg",
};

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
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center justify-center self-center">
          <Image
            src={LOGO_BY_LOCALE[locale] ?? LOGO_BY_LOCALE.fr}
            alt="Hssabaty"
            width={160}
            height={40}
            priority
          />
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

