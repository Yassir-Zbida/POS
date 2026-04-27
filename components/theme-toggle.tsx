"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = useTranslations("common.theme");

  React.useEffect(() => setMounted(true), []);

  function toggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  const label = mounted
    ? resolvedTheme === "dark"
      ? t("light")
      : t("dark")
    : t("dark");

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 overflow-hidden"
      onClick={toggle}
      disabled={!mounted}
      aria-label={label}
    >
      <span className="relative flex size-4 shrink-0">
        <Sun className="absolute inset-0 size-4 scale-100 rotate-0 transition-all duration-500 ease-in-out dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute inset-0 size-4 scale-0 rotate-90 transition-all duration-500 ease-in-out dark:scale-100 dark:rotate-0" />
      </span>
      <span className="transition-none">{label}</span>
    </Button>
  );
}
