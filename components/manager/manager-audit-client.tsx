"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useAuthStore } from "@/store/use-auth-store";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type Actor = { id: string; email: string; name: string | null; role: string };
type LogRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: unknown;
  createdAt: string;
  actor: Actor;
};

export function ManagerAuditClient() {
  const t = useTranslations("managerAudit");
  const locale = useLocale();
  const me = useAuthStore((s) => s.user);
  const [logs, setLogs] = React.useState<LogRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, pages: 1, limit: 30 });
  const [loading, setLoading] = React.useState(true);
  const [actorId, setActorId] = React.useState<string>("all");
  const [actors, setActors] = React.useState<Array<{ id: string; label: string }>>([]);

  const loadActors = React.useCallback(async () => {
    const res = await fetchWithAuth("/api/manager/cashiers");
    if (!res.ok) return;
    const data = (await res.json()) as { cashiers?: Array<{ id: string; email: string; name: string | null }> };
    const opts =
      data.cashiers?.map((c) => ({
        id: c.id,
        label: c.name?.trim() ? `${c.name} (${c.email})` : c.email,
      })) ?? [];
    setActors(opts);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(meta.limit),
      });
      if (actorId !== "all") q.set("actorId", actorId);
      const res = await fetchWithAuth(`/api/manager/audit-logs?${q}`);
      if (!res.ok) {
        toast.error(t("loadError"));
        return;
      }
      const data = (await res.json()) as {
        logs?: LogRow[];
        meta?: { total: number; page: number; pages: number; limit: number };
      };
      setLogs(data.logs ?? []);
      if (data.meta) {
        setMeta({ total: data.meta.total, pages: data.meta.pages, limit: data.meta.limit });
      }
    } finally {
      setLoading(false);
    }
  }, [actorId, page, meta.limit, t]);

  React.useEffect(() => {
    void loadActors();
  }, [loadActors]);

  React.useEffect(() => {
    setPage(1);
  }, [actorId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
            <ScrollText className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-center">
          <Link href="/dashboard/manager/staff">{t("backStaff")}</Link>
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("filtersTitle")}</CardTitle>
          <CardDescription>{t("filtersHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-xs">
            <Select value={actorId} onValueChange={(v) => setActorId(v)}>
              <SelectTrigger aria-label={t("actorFilter")}>
                <SelectValue placeholder={t("actorFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allActors")}</SelectItem>
                {me?.id ? <SelectItem value={me.id}>{t("filterSelf")}</SelectItem> : null}
                {actors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[140px] ps-4 whitespace-nowrap">{t("col.when")}</TableHead>
                  <TableHead className="min-w-[120px] whitespace-nowrap">{t("col.who")}</TableHead>
                  <TableHead className="min-w-[140px] whitespace-nowrap">{t("col.action")}</TableHead>
                  <TableHead className="min-w-[100px] whitespace-nowrap">{t("col.target")}</TableHead>
                  <TableHead className="min-w-[180px] pe-4">{t("col.detail")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      …
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="ps-4 align-top text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString(locale)}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div className="font-medium">{row.actor.name ?? row.actor.email}</div>
                        <div className="text-xs text-muted-foreground">{row.actor.role}</div>
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs">{row.action}</TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {row.targetType}
                        <div className="font-mono text-[10px] opacity-80">{row.targetId.slice(0, 12)}…</div>
                      </TableCell>
                      <TableCell className="pe-4 align-top">
                        <pre className="max-h-24 max-w-md overflow-auto rounded-md bg-muted/50 p-2 text-[10px] leading-relaxed">
                          {row.metadata ? JSON.stringify(row.metadata, null, 0).slice(0, 280) : "—"}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && meta.pages > 1 ? (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {t("pageOf", { page, pages: meta.pages, total: meta.total })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  {t("prev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("next")}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
