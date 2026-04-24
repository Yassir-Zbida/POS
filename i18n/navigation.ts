import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "./routing";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "as-needed"
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

