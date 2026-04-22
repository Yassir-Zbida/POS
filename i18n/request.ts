import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

import { defaultLocale, locales, type Locale } from "./routing";

import en from "../messages/en.json";
import fr from "../messages/fr.json";
import ar from "../messages/ar.json";

const messagesByLocale: Record<Locale, AbstractIntlMessages> = {
  en: en as AbstractIntlMessages,
  fr: fr as AbstractIntlMessages,
  ar: ar as AbstractIntlMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) as Locale | undefined;
  const resolvedLocale: Locale =
    locale && (locales as readonly string[]).includes(locale) ? locale : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: messagesByLocale[resolvedLocale],
  };
});

