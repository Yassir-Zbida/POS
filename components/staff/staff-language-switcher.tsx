"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

const SHORT: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
  ar: "AR",
};

export function StaffLanguageSwitcher() {
  const t = useTranslations("staff.lang");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const onChange = React.useCallback(
    (nextLocale: Locale) => {
      if (nextLocale === locale) return;
      const qs = searchParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: nextLocale });
    },
    [locale, pathname, router, searchParams],
  );

  return (
    <div
      className="flex items-center gap-1.5"
      role="group"
      aria-label={t("label")}
    >
      <Globe className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
      <div className="flex rounded-lg border border-border/60 bg-background/80 p-0.5 shadow-sm">
        {locales.map((l) => {
          const active = locale === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => onChange(l)}
              className={cn(
                "min-w-9 rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={active}
              aria-label={SHORT[l]}
            >
              {SHORT[l]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
