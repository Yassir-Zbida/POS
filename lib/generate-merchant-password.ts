/**
 * Cryptographically strong random password for new merchant logins.
 * Ensures at least one upper, lower, digit, and symbol (8+ rules satisfied).
 */
export function generateMerchantPassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$%&*!?";
  const all = upper + lower + digits + symbols;

  const rnd = (max: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0]! % max;
  };

  const minLen = Math.max(8, length);
  const chars: string[] = [
    upper[rnd(upper.length)]!,
    lower[rnd(lower.length)]!,
    digits[rnd(digits.length)]!,
    symbols[rnd(symbols.length)]!,
  ];
  for (let i = chars.length; i < minLen; i++) {
    chars.push(all[rnd(all.length)]!);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
