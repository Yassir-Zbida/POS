"use client";

import type { ReactNode } from "react";
import { useInactivityLock } from "@/hooks/useInactivityLock";

export default function CashierAreaLayout({ children }: { children: ReactNode }) {
  // Inactivity timer — locks cashier session after 5 minutes without interaction.
  // The <LockScreen /> overlay is rendered in the parent dashboard layout.
  useInactivityLock(5);
  return <>{children}</>;
}
