/** Calendar date in local timezone, no time-of-day. */
export function parseYmd(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (mo < 0 || mo > 11 || day < 1 || day > 31) return undefined;
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return undefined;
  return d;
}

export function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const BCP47: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar",
};

/**
 * Long form date (e.g. 26 avril 2026) for the app UI locale, without date-fns.
 */
export function formatLongDate(d: Date, appLocale: string): string {
  const tag = BCP47[appLocale] ?? "fr-FR";
  return d.toLocaleDateString(tag, { year: "numeric", month: "long", day: "numeric" });
}
