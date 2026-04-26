import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/navigation";

/**
 * Delegate all locale routing to next-intl's official middleware.
 *
 * It handles everything the previous custom middleware did:
 *  • localePrefix: "as-needed" — FR (default) has no prefix, EN/AR get /en/ /ar/
 *  • Internal rewrite for the default locale so app/[locale]/… resolves correctly
 *  • First-visit Accept-Language detection → redirect to the right prefix
 *  • NEXT_LOCALE cookie stamping
 *  • x-next-intl-locale header — required by requestLocale in getRequestConfig
 *    so getMessages() returns the correct language on every navigation
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)" ],
};
