"use client";

import { useMemo, useState } from "react";
import { authApiUrl } from "@/lib/auth-client";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsClientPage() {
  const [token, setToken] = useState("");
  const [isAdminVerified, setIsAdminVerified] = useState(
    process.env.NODE_ENV === "development",
  );
  const [error, setError] = useState("");

  const requestInterceptor = useMemo(
    () => (req: Request & { headers: Record<string, string> }) => {
      req.headers = req.headers || {};
      req.headers.Authorization = `Bearer ${token}`;
      return req;
    },
    [token],
  );

  async function verifyAdminToken() {
    setError("");
    const response = await fetch(authApiUrl("me"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setError("Token invalid or expired.");
      return;
    }

    const data = (await response.json()) as { role?: string };
    if (data.role !== "ADMIN") {
      setError("Admin role required.");
      return;
    }

    setIsAdminVerified(true);
  }

  if (!isAdminVerified) {
    return (
      <main className="mx-auto min-h-screen max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Protected API docs</h1>
        <p className="mt-2 text-sm text-slate-600">
          In non-development environments, provide an ADMIN bearer token to access Swagger.
        </p>
        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste ADMIN access token"
          />
          <button
            className="rounded bg-slate-900 px-4 py-2 text-white"
            type="button"
            onClick={verifyAdminToken}
          >
            Verify and open docs
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <SwaggerUI
        url="/api/docs/openapi"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        requestInterceptor={requestInterceptor}
      />
    </main>
  );
}

