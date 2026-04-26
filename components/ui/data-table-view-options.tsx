"use client";

import { SlidersHorizontal } from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DataTableViewOptionsProps<TData> = {
  table: Table<TData>;
  getColumnLabel: (columnId: string) => string;
  toggleLabel: string;
  className?: string;
};

export function DataTableViewOptions<TData>({
  table,
  getColumnLabel,
  toggleLabel,
  className,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-9 gap-1.5 px-3 text-xs", className ?? "sm:ms-auto")}
        >
          <SlidersHorizontal className="size-3.5" />
          {toggleLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {toggleLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="text-sm"
              checked={column.getIsVisible()}
              onCheckedChange={(v) => column.toggleVisibility(!!v)}
            >
              {getColumnLabel(column.id)}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
