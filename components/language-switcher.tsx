"use client";

import * as React from "react";
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
import { ChevronDown } from "lucide-react";

const LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-9 px-2 text-sm", className)}
        >
          <span>{LABELS[locale]}</span>
          <ChevronDown className="ms-1 size-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup value={locale} onValueChange={onValueChange}>
          {locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l}>
              {LABELS[l]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

