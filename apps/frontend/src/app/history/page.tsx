"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoaderOne } from "@/components/ui/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppShell } from "@/mycomponents/app/AppShell";
import { ZapFlow, stepsOf } from "@/mycomponents/app/AppFlow";
import { useZapRuns } from "@/hooks/useZaps";
import type { ZapRun } from "@/types/zap";

const STATUS_STYLES: Record<ZapRun["status"], string> = {
  success: "bg-green-50 text-green-700 ring-green-200",
  running: "bg-amber-50 text-amber-700 ring-amber-200",
};

const StatusBadge = ({ status }: { status: ZapRun["status"] }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${STATUS_STYLES[status]}`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        status === "success" ? "bg-green-500" : "bg-amber-500"
      }`}
    />
    {status}
  </span>
);

const preview = (metadata: Record<string, unknown>) => {
  const entries = Object.entries(metadata ?? {});
  if (entries.length === 0) return "No payload";
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
};

export default function HistoryPage() {
  const { loading, runs } = useZapRuns();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ZapRun["status"]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter((run) => {
      const matchesStatus = status === "all" || run.status === status;
      const matchesQuery =
        !q ||
        run.zap.name?.toLowerCase().includes(q) ||
        run.id.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [runs, query, status]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Zap history
          </h1>
        </div>

        <div className="mb-6 flex items-center gap-6 border-b border-zinc-200">
          <span className="-mb-px border-b-2 border-[#FF4F00] pb-3 text-sm font-semibold text-zinc-900">
            Zap runs
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Zap runs"
            className="bg-white pl-9"
          />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(["all", "success", "running"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                  status === s
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
              >
                {s === "all" ? "All statuses" : s}
              </button>
            ))}
          </div>

        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoaderOne />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-20 text-center">
            <Search className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
            <p className="text-base font-semibold text-zinc-900">
              {runs.length === 0 ? "No Zap runs yet" : "No results found"}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {runs.length === 0
                ? "Trigger one of your Zaps and its runs will appear here."
                : "Adjust your filters and try again."}
            </p>
            {runs.length > 0 && (
              <button
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
                className="mt-5 rounded-lg bg-[#6c52ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5b41ee]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                  <TableHead className="py-3 font-semibold text-zinc-700">Zap workflow</TableHead>
                  <TableHead className="font-semibold text-zinc-700">Apps</TableHead>
                  <TableHead className="font-semibold text-zinc-700">Status</TableHead>
                  <TableHead className="font-semibold text-zinc-700">Data in</TableHead>
                  <TableHead className="font-semibold text-zinc-700">Run ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((run) => (
                  <TableRow key={run.id} className="hover:bg-zinc-50/70">
                    <TableCell className="py-3 font-medium text-zinc-900">
                      {run.zap.name}
                    </TableCell>
                    <TableCell>
                      <ZapFlow steps={stepsOf(run.zap)} max={2} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-zinc-600">
                      {preview(run.metadata)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {run.id.slice(0, 8)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
