"use client";

import { useEffect } from "react";

/**
 * Imperatively updates <html lang> and <html dir> on the client so that
 * client-side navigations between locales always reflect the correct values,
 * regardless of what the root SSR layout rendered.
 */
export function HtmlLocaleSync({ locale }: { locale: string }) {
  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  return null;
}
