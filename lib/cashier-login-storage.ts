/** Persisted on device so cashiers can enter PIN only until server requires full login again. */
export const CASHIER_REMEMBER_EMAIL_KEY = "hssabaty_cashier_login_email";

export function readRememberedCashierEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CASHIER_REMEMBER_EMAIL_KEY);
    return v && v.includes("@") ? v.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export function writeRememberedCashierEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CASHIER_REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* quota / private mode */
  }
}

export function clearRememberedCashierEmail() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CASHIER_REMEMBER_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}
