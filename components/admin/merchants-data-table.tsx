"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Merchant, MerchantsPagination } from "./merchants-types";
import { useMerchantsColumns } from "./merchants-columns";

type MerchantsDataTableProps = {
  data: Merchant[];
  pagination: MerchantsPagination;
  page: number;
  onPageChange: (page: number) => void;
  onOpenBan: (m: Merchant) => void;
  onActivate: (m: Merchant) => void;
  onOpenDelete: (m: Merchant) => void;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  subStatusFilter: string;
  onSubStatusFilterChange: (v: string) => void;
  loading: boolean;
  showOnboardingEmpty: boolean;
  onboardingCta: React.ReactNode;
};

const COLUMN_LABEL: Record<string, "name" | "status" | "subscription" | "staff" | "locations" | "joined"> =
  {
    name: "name",
    status: "status",
    subscription: "subscription",
    staff: "staff",
    locations: "locations",
    joined: "joined",
  };

export function MerchantsDataTable({
  data,
  pagination,
  page,
  onPageChange,
  onOpenBan,
  onActivate,
  onOpenDelete,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  subStatusFilter,
  onSubStatusFilterChange,
  loading,
  showOnboardingEmpty,
  onboardingCta,
}: MerchantsDataTableProps) {
  const t = useTranslations("adminMerchants");
  const q = search ?? "";
  const accountStatus = statusFilter ?? "ALL";
  const subscriptionStatus = subStatusFilter ?? "ALL";
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const columns = useMerchantsColumns({ onOpenBan, onActivate, onOpenDelete });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination: {
        pageIndex: page - 1,
        pageSize: pagination.limit,
      },
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize: pagination.limit };
      const next = typeof updater === "function" ? updater(current) : updater;
      onPageChange(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, pagination.pages),
  });

  const getColumnLabel = React.useCallback(
    (id: string) => {
      const k = COLUMN_LABEL[id];
      return k ? t(`table.${k}`) : id;
    },
    [t]
  );

  const canResetFilters =
    Boolean(q.trim()) || accountStatus !== "ALL" || subscriptionStatus !== "ALL";

  function handleResetFilters() {
    onSearchChange("");
    onStatusFilterChange("ALL");
    onSubStatusFilterChange("ALL");
  }

  return (
    <div>
      <div
        className={cn(
          "flex flex-col gap-3 border-b border-border bg-white px-3 py-3",
          "dark:bg-card sm:px-4"
        )}
      >
        <div
          className={cn(
            "flex w-full flex-col gap-3",
            "lg:flex-row lg:items-end lg:justify-between lg:gap-4"
          )}
        >
          <div
            className={cn(
              "flex w-full min-w-0 flex-1 flex-col gap-3",
              "md:flex-row md:flex-wrap md:items-end"
            )}
          >
            <div className="w-full min-w-0 space-y-1.5 md:min-w-[200px] md:max-w-sm md:flex-1">
              <Label
                htmlFor="merchants-search"
                className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {t("searchLabel")}
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="merchants-search"
                  name="q"
                  value={q}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t("search")}
                  disabled={loading}
                  className={cn(
                    "h-9 rounded-md ps-8 text-sm shadow-sm",
                    q.length > 0 && "pe-9"
                  )}
                />
                {q.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onSearchChange("")}
                    className="absolute end-0.5 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
                    disabled={loading}
                    aria-label={t("searchLabel")}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto md:min-w-0 md:max-w-2xl">
              <div className="min-w-0 space-y-1.5">
                <Label
                  className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="merchants-status-filter"
                >
                  {t("filterStatus")}
                </Label>
                <Select
                  value={accountStatus}
                  onValueChange={onStatusFilterChange}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="merchants-status-filter"
                    className={cn(
                      "h-9 w-full min-w-0 shadow-sm sm:min-w-[9.5rem] md:min-w-[10.5rem]",
                      "focus-visible:ring-0 focus-visible:ring-offset-0",
                      "focus:border-border data-[state=open]:border-border"
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("filterAll")}</SelectItem>
                    <SelectItem value="ACTIVE">{t("userStatus.ACTIVE")}</SelectItem>
                    <SelectItem value="SUSPENDED">{t("userStatus.SUSPENDED")}</SelectItem>
                    <SelectItem value="BANNED">{t("userStatus.BANNED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label
                  className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="merchants-sub-filter"
                >
                  {t("filterSubStatus")}
                </Label>
                <Select
                  value={subscriptionStatus}
                  onValueChange={onSubStatusFilterChange}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="merchants-sub-filter"
                    className={cn(
                      "h-9 w-full min-w-0 shadow-sm sm:min-w-[9.5rem] md:min-w-[11.5rem]",
                      "focus-visible:ring-0 focus-visible:ring-offset-0",
                      "focus:border-border data-[state=open]:border-border"
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("filterAll")}</SelectItem>
                    <SelectItem value="ACTIVE">{t("subStatus.ACTIVE")}</SelectItem>
                    <SelectItem value="PAST_DUE">{t("subStatus.PAST_DUE")}</SelectItem>
                    <SelectItem value="SUSPENDED">{t("subStatus.SUSPENDED")}</SelectItem>
                    <SelectItem value="CANCELED">{t("subStatus.CANCELED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canResetFilters && (
              <div className="flex md:pb-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full text-muted-foreground sm:w-auto"
                  onClick={handleResetFilters}
                  disabled={loading}
                >
                  {t("filterReset")}
                </Button>
              </div>
            )}
          </div>

          <DataTableViewOptions
            className="w-full shrink-0 lg:ms-0 lg:w-auto"
            table={table}
            getColumnLabel={getColumnLabel}
            toggleLabel={t("table.toggleColumns")}
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-card">
          <div className="space-y-0 divide-y divide-border/40">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 sm:px-4"
              >
                <Skeleton className="size-8 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full hidden sm:block" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ) : showOnboardingEmpty ? (
        <div className="flex flex-col items-center justify-center bg-white px-4 py-14 text-center dark:bg-card">
          {onboardingCta}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-card">
          <Table
            className={cn(
              "text-sm bg-white dark:bg-card",
              "[&_td]:p-2.5 [&_th]:h-9 [&_th]:p-2.5 [&_th]:align-middle [&_th]:text-xs [&_th]:font-medium"
            )}
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-border bg-white hover:!bg-white dark:border-border/70 dark:bg-card dark:hover:!bg-card"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.column.id === "staff" || header.column.id === "locations"
                          ? "text-center"
                          : header.column.id === "actions"
                            ? "pe-4 text-end"
                            : header.column.id === "name"
                              ? "ps-4"
                              : undefined
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group border-b border-border/50 bg-white hover:!bg-white data-[state=selected]:!bg-white dark:border-border/40 dark:bg-card dark:hover:!bg-card dark:data-[state=selected]:!bg-card"
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          cell.column.id === "staff" || cell.column.id === "locations"
                            ? "text-center"
                            : cell.column.id === "actions"
                              ? "pe-4 text-end"
                              : cell.column.id === "name"
                                ? "ps-4"
                                : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-0 bg-white hover:!bg-white dark:bg-card dark:hover:!bg-card">
                  <TableCell
                    colSpan={columns.length}
                    className="h-20 bg-white text-center text-sm text-muted-foreground dark:bg-card"
                  >
                    {t("table.noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !showOnboardingEmpty && pagination.pages > 1 && (
        <>
          <Separator className="bg-border/50" />
          <div className="flex items-center justify-between bg-white px-3 py-2.5 dark:bg-card sm:px-4">
            <p className="text-xs text-muted-foreground">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">{t("table.prevPage")}</span>
              </Button>
              <span className="min-w-[4rem] text-center text-xs font-medium">
                {pagination.page} / {pagination.pages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">{t("table.nextPage")}</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
