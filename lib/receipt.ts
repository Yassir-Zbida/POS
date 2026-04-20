export function buildReceiptNumber(prefix = "RCP") {
  return `${prefix}-${Date.now()}`;
}
