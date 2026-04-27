"use client";

/**
 * Lightweight client-side error tracker — similar to Sentry SDK.
 * Captures unhandled JS errors and promise rejections, then ships them
 * to /api/client-errors so they are stored in the AuditLog table.
 */

interface ErrorPayload {
  message: string;
  stack?: string;
  url?: string;
  componentStack?: string;
  level?: "error" | "warning" | "info";
  context?: Record<string, unknown>;
}

let _initialized = false;
let _getToken: (() => string | null) | null = null;

function send(payload: ErrorPayload) {
  if (typeof window === "undefined") return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = _getToken?.();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // fire-and-forget — never await, never throw
  fetch("/api/client-errors", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export function captureError(
  error: unknown,
  options?: { componentStack?: string; context?: Record<string, unknown> },
) {
  const err = error instanceof Error ? error : new Error(String(error));
  send({
    message: err.message,
    stack: err.stack,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    componentStack: options?.componentStack,
    context: options?.context,
    level: "error",
  });
}

export function captureWarning(message: string, context?: Record<string, unknown>) {
  send({
    message,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    context,
    level: "warning",
  });
}

/**
 * Call once at app bootstrap.
 * @param getToken – optional function that returns the current JWT access token
 */
export function initErrorTracker(getToken?: () => string | null) {
  if (_initialized || typeof window === "undefined") return;
  _initialized = true;
  _getToken = getToken ?? null;

  window.addEventListener("error", (event) => {
    send({
      message: event.message || "Uncaught error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
      url: window.location.href,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      level: "error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
    send({
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
      url: window.location.href,
      level: "error",
    });
  });
}
