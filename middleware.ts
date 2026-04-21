import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/navigation";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - API routes
    // - Next.js internals
    // - static files (e.g. favicon.svg)
    "/((?!api|_next|.*\\..*).*)",
  ],
};
