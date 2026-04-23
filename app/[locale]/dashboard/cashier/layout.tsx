import type { ReactNode } from "react";

import { StaffSidebar } from "@/components/staff/sidebar";
import { StaffTopbar } from "@/components/staff/topbar";

export default function CashierAreaLayout({ children }: { children: ReactNode }) {
  return (
    <div data-cashier-dashboard className="cashier-shell flex min-h-dvh text-foreground">
      <StaffSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopbar />
        <main className="min-w-0 flex-1 bg-[hsl(var(--cashier-canvas))]">{children}</main>
      </div>
    </div>
  );
}

