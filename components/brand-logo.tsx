"use client";

import Image from "next/image";
import * as React from "react";
import { useTheme } from "next-themes";

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
}: {
  locale: Locale;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const src =
    mounted && resolvedTheme === "dark"
      ? LOGO_DARK_BY_LOCALE[locale] ?? LOGO_DARK_BY_LOCALE.fr
      : LOGO_LIGHT_BY_LOCALE[locale] ?? LOGO_LIGHT_BY_LOCALE.fr;

  return (
    <Image src={src} alt="Hssabaty" width={width} height={height} priority={priority} />
  );
}

