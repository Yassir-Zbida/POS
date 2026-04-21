"use client";

import * as React from "react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
  ar: "العربية",
};

export function LanguageSwitcher({
  className,
}: {
  className?: string;
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const onChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextLocale = e.target.value as Locale;
      router.replace(pathname, { locale: nextLocale });
    },
    [pathname, router]
  );

  return (
    <select
      aria-label="Language"
      className={cn(
        "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0",
        className
      )}
      value={locale}
      onChange={onChange}
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {LABELS[l]}
        </option>
      ))}
    </select>
  );
}

