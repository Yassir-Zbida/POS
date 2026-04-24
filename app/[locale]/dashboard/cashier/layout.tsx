import type { ReactNode } from "react";

export default function CashierAreaLayout({ children }: { children: ReactNode }) {
  // Use the shared dashboard shell at `app/[locale]/dashboard/layout.tsx`.
  return children;
}
