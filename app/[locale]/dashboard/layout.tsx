import type { ReactNode } from "react";

import { RoleGuard } from "@/components/role-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <RoleGuard>{children}</RoleGuard>;
}

