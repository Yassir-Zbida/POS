"use client";

import * as React from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export function LanguageSwitcherFooter({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const onChange = React.useCallback(
    (nextLocale: Locale) => {
      router.replace(pathname, { locale: nextLocale });
    },
    [pathname, router]
  );

  const onValueChange = React.useCallback(
    (value: string) => {
      onChange(value as Locale);
    },
    [onChange]
  );

  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 right-6 z-50 flex items-center justify-start",
        className
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10 rounded-full border-border/70 bg-background/80 px-3 font-medium shadow-sm backdrop-blur",
              "hover:bg-background"
            )}
          >
            <Globe className="me-2 size-4 text-muted-foreground" aria-hidden="true" />
            <span>{LABELS[locale]}</span>
            <ChevronDown
              className="ms-2 size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          <DropdownMenuRadioGroup value={locale} onValueChange={onValueChange}>
            {locales.map((l) => (
              <DropdownMenuRadioItem key={l} value={l}>
                {LABELS[l]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

