"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StaffThemeToggle() {
  const t = useTranslations("staff.theme");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = (resolvedTheme ?? theme) === "dark";

  if (!mounted) {
    return (
      <div className="flex h-9 items-center gap-0.5 rounded-lg border p-0.5 opacity-60">
        <span className="px-2 text-xs">…</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5"
      role="group"
      aria-label={t("label")}
    >
      <div className="flex rounded-lg border border-border/60 bg-background/80 p-0.5 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setTheme("light")}
          className={cn(
            "h-8 gap-1.5 rounded-md px-2.5",
            !isDark && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
          )}
          aria-pressed={!isDark}
        >
          <Sun className="size-3.5" aria-hidden="true" />
          <span className="text-xs font-semibold">{t("light")}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setTheme("dark")}
          className={cn(
            "h-8 gap-1.5 rounded-md px-2.5",
            isDark && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
          )}
          aria-pressed={isDark}
        >
          <Moon className="size-3.5" aria-hidden="true" />
          <span className="text-xs font-semibold">{t("dark")}</span>
        </Button>
      </div>
    </div>
  );
}
