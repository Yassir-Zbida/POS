"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sortIcon =
    column.getIsSorted() === "desc" ? (
      <ArrowDown className="size-4 shrink-0" />
    ) : column.getIsSorted() === "asc" ? (
      <ArrowUp className="size-4 shrink-0" />
    ) : (
      <ArrowUpDown className="size-4 shrink-0 opacity-60" />
    );

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Button
        type="button"
        variant="ghost"
        className="h-8 -ms-1.5 gap-1.5 px-2 hover:bg-transparent data-[state=open]:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {isRtl ? (
          <>
            {sortIcon}
            {title}
          </>
        ) : (
          <>
            {title}
            {sortIcon}
          </>
        )}
      </Button>
    </div>
  );
}
