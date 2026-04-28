/** Cashiers may use PIN-only login only within this window after a full (password/OTP) sign-in. */
export const CASHIER_FULL_AUTH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isCashierPinLoginAllowed(cashierFullAuthAt: Date | null): boolean {
  if (!cashierFullAuthAt) return false;
  return Date.now() - cashierFullAuthAt.getTime() <= CASHIER_FULL_AUTH_WINDOW_MS;
}
