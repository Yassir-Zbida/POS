"use client";

import type { ReactNode } from "react";
import { useInactivityLock } from "@/hooks/useInactivityLock";

export default function CashierAreaLayout({ children }: { children: ReactNode }) {
  // Start the inactivity timer — fires lock() from sessionStore after 15 min.
  // The <LockScreen /> overlay is rendered in the parent dashboard layout
  // so it stays mounted even if the user navigates to another dashboard route.
  useInactivityLock(15);
  return <>{children}</>;
}
