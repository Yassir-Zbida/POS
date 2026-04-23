"use client";

import Image from "next/image";
import * as React from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const LOGO_LIGHT_BY_LOCALE: Record<Locale, string> = {
  en: "/assets/brand/logo-en.svg",
  fr: "/assets/brand/logo-fr.svg",
  ar: "/assets/brand/logo-ar.svg",
};

const LOGO_DARK_BY_LOCALE: Record<Locale, string> = {
  en: "/assets/brand/logo-en-dark.svg",
  fr: "/assets/brand/logo-fr-dark.svg",
  ar: "/assets/brand/logo-ar-dark.svg",
};

export function BrandLogo({
  locale,
  width = 160,
  height = 40,
  priority,
  className,
  imageClassName,
}: {
  locale: Locale;
  width?: number;
  height?: number;
  priority?: boolean;
  /** e.g. layout/flex; logo marks are always inline */
  className?: string;
  imageClassName?: string;
}) {
  const t = useTranslations("brand");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const src =
    mounted && resolvedTheme === "dark"
      ? LOGO_DARK_BY_LOCALE[locale] ?? LOGO_DARK_BY_LOCALE.fr
      : LOGO_LIGHT_BY_LOCALE[locale] ?? LOGO_LIGHT_BY_LOCALE.fr;

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src={src}
        alt={t("name")}
        width={width}
        height={height}
        className={cn("h-auto w-auto max-w-full object-contain", imageClassName)}
        priority={priority}
      />
    </span>
  );
}

