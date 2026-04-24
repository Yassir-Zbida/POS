const bucket = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(key: string) {
  const now = Date.now();
  const current = bucket.get(key);

  if (!current || current.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, remaining: MAX_ATTEMPTS - 1, resetAt: now + WINDOW_MS };
  }

  current.count += 1;
  if (current.count > MAX_ATTEMPTS) {
    return { limited: true, remaining: 0, resetAt: current.resetAt };
  }

  return { limited: false, remaining: MAX_ATTEMPTS - current.count, resetAt: current.resetAt };
}
