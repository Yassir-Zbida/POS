"use client";

import * as React from "react";
import Image from "next/image";
import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { AuthLiquidBackground } from "@/components/auth-liquid-background";
import { BrandLogo } from "@/components/brand-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcherFooter } from "@/components/language-switcher-footer";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("errors");

  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-y-auto bg-muted px-4 py-8 pb-24 sm:p-6 sm:pb-24 md:p-10">
      <AuthLiquidBackground />

      {/* Mode toggle — same position as auth pages */}
      <div
        className={`absolute top-[max(1rem,env(safe-area-inset-top,1rem))] z-20 ${
          locale === "ar"
            ? "left-[max(1rem,env(safe-area-inset-left,1rem))]"
            : "right-[max(1rem,env(safe-area-inset-right,1rem))]"
        }`}
      >
        <ModeToggle />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center">
        {/* Brand logo */}
        <Link href="/" className="flex items-center justify-center self-center">
          <BrandLogo
            locale={locale}
            width={52}
            height={13}
            priority
            imageClassName="max-h-10"
          />
        </Link>

        <Image
          src="/assets/server-failure_syqp.svg"
          alt=""
          width={260}
          height={219}
          priority
          aria-hidden="true"
          className="w-52 sm:w-64 dark:opacity-80"
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("unexpected.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("unexpected.description")}</p>
          {error?.digest ? (
            <p className="mt-1 text-xs text-muted-foreground/70">
              {t("unexpected.reference")}{" "}
              <span className="font-mono">{error.digest}</span>
            </p>
          ) : null}
        </div>

        <Button size="lg" className="w-full max-w-xs" onClick={reset}>
          {t("actions.tryAgain")}
        </Button>
      </div>

      {/* Language switcher — fixed bottom-left, same as auth */}
      <Suspense fallback={null}>
        <LanguageSwitcherFooter />
      </Suspense>
    </div>
  );
}
