import type { ReactNode } from "react";

import { CashierAppSidebar } from "@/components/staff/cashier-app-sidebar";
import { StaffTopbar } from "@/components/staff/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function CashierAreaLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="min-h-0" data-cashier-dashboard>
      <CashierAppSidebar />
      <SidebarInset className="min-h-0 min-h-svh flex-1 flex-col border-0 bg-muted shadow-none md:min-h-0">
        <StaffTopbar className="shrink-0" />
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
