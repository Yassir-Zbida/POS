/**
 * API routes a MANAGER may call while `mustChangePassword` is true (until first password change).
 * Pathnames are from `new URL(request.url).pathname`.
 */
export function isPasswordSetupExemptApiRoute(method: string, pathname: string): boolean {
  if (method === "POST" && (pathname === "/api/auth/refresh" || pathname === "/api/v1/auth/refresh")) {
    return true;
  }
  if (
    method === "POST" &&
    (pathname === "/api/auth/change-password" || pathname === "/api/v1/auth/change-password")
  ) {
    return true;
  }
  if (method === "POST" && (pathname === "/api/auth/logout" || pathname === "/api/v1/auth/logout")) {
    return true;
  }
  if (
    method === "GET" &&
    (pathname === "/api/auth/me" ||
      pathname === "/api/v1/auth/me" ||
      pathname.startsWith("/api/auth/me/") ||
      pathname.startsWith("/api/v1/auth/me/"))
  ) {
    return true;
  }
  return false;
}
