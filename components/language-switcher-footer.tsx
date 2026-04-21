"use client";

import * as React from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
  ar: "AR",
};

export function LanguageSwitcherFooter({ className }: { className?: string }) {
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
    <div
      className={cn(
        "fixed bottom-6 left-6 right-6 z-50 flex items-center justify-start",
        className
      )}
    >
      <div className="relative inline-flex items-center">
        <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <select
          aria-label="Language"
          className={cn(
            "h-10 appearance-none rounded-full border border-border/70 bg-background/80 pl-10 pr-10 text-sm font-medium text-foreground shadow-sm backdrop-blur",
            "transition-colors transition-shadow",
            "hover:bg-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0"
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
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

