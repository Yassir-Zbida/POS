import { useAuthStore } from "@/store/use-auth-store";

let refreshInFlight: Promise<string | null> | null = null;

/** Match next-intl `localePrefix: "as-needed"`: `fr` has no URL prefix, `en`/`ar` use /en, /ar */
function getLoginPath(): string {
  if (typeof window === "undefined") return "/login";
  const path = window.location.pathname;
  const m = path.match(/^\/(en|ar)(?:\/|$)/);
  return m ? `/${m[1]}/login` : "/login";
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  const run = (async (): Promise<string | null> => {
    const { refreshToken, user } = useAuthStore.getState();
    if (!refreshToken || !user) {
      return null;
    }
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json().catch(() => ({}))) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken || !data.refreshToken) {
      return null;
    }
    useAuthStore.getState().setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user,
    });
    return data.accessToken;
  })();

  refreshInFlight = run.finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * `fetch` with `Authorization: Bearer` from the auth store. On HTTP 401, tries once
 * to rotate tokens with `POST /api/auth/refresh`, updates the store, and retries
 * the request. If refresh fails, clears the session and redirects to the login page
 * (locale-aware for paths under /en or /ar).
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const { accessToken } = useAuthStore.getState();
  const headers = new Headers(init.headers ?? undefined);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(input, { ...init, headers });
  if (res.status !== 401) {
    return res;
  }

  const newToken = await refreshAccessToken();
  if (!newToken) {
    useAuthStore.getState().clearSession();
    if (typeof window !== "undefined") {
      window.location.assign(getLoginPath());
    }
    return res;
  }
  headers.set("Authorization", `Bearer ${newToken}`);
  return fetch(input, { ...init, headers });
}
