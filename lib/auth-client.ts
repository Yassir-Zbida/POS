/** Browser-facing auth API base (aligned with SRS `/api/v1/auth`). */
export const AUTH_API_BASE = "/api/v1/auth" as const;

export function authApiUrl(suffix: string) {
  const s = suffix.startsWith("/") ? suffix.slice(1) : suffix;
  return `${AUTH_API_BASE}/${s}`;
}
