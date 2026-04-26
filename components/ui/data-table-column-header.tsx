"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

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
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        className="h-8 -ms-1.5 gap-0 px-2 hover:bg-transparent data-[state=open]:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {title}
        {column.getIsSorted() === "desc" ? (
          <ArrowDown className="ms-1.5 size-4 shrink-0" />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp className="ms-1.5 size-4 shrink-0" />
        ) : (
          <ArrowUpDown className="ms-1.5 size-4 shrink-0 opacity-60" />
        )}
      </Button>
    </div>
  );
}
