"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search, SlidersHorizontal, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { MvpAction } from "@/mycomponents/app/MvpDialog";
import { useZaps } from "@/hooks/useZaps";
import type { Zap as ZapType } from "@/types/zap";

interface Connection {
  id: string;
  name: string;
  imageUrl: string;
  workflows: number;
  lastModified: Date;
}

/**
 * There is no Connection model in the schema yet, so the list is derived from
 * the apps actually used by the user's Zaps (trigger + action catalog entries).
 */
function toConnections(zaps: ZapType[]): Connection[] {
  const map = new Map<string, Connection>();

  for (const zap of zaps) {
    const types = [
      ...(zap.trigger?.type ? [zap.trigger.type] : []),
      ...zap.actions.map((a) => a.type),
    ];

    for (const type of types) {
      const existing = map.get(type.id);
      const time = new Date(zap.time);
      if (existing) {
        existing.workflows += 1;
        if (time > existing.lastModified) existing.lastModified = time;
      } else {
        map.set(type.id, {
          id: type.id,
          name: type.name,
          imageUrl: type.imageUrl,
          workflows: 1,
          lastModified: time,
        });
      }
    }
  }

  return [...map.values()].sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
  );
}

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function ConnectionsPage() {
  const { loading, zaps } = useZaps();
  const [query, setQuery] = useState("");

  const connections = useMemo(() => toConnections(zaps), [zaps]);
  const filtered = useMemo(
    () =>
      connections.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [connections, query]
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Connections
          </h1>
          <MvpAction title="Create connection">
            <span className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#6c52ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b41ee]">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Create connection
            </span>
          </MvpAction>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <MvpAction title="View by">
            <span className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
              <span className="text-zinc-500">View by:</span> Connections
            </span>
          </MvpAction>

          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search connection or app name"
              className="bg-white pl-9"
            />
          </div>

          <MvpAction title="Filters">
            <span className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </span>
          </MvpAction>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoaderOne />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-20 text-center">
            <p className="text-base font-semibold text-zinc-900">
              No connections yet
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Apps you use inside a Zap show up here as connections.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                    <TableHead className="py-3 font-semibold text-zinc-700">Name</TableHead>
                    <TableHead className="font-semibold text-zinc-700">App</TableHead>
                    <TableHead className="font-semibold text-zinc-700">Status</TableHead>
                    <TableHead className="font-semibold text-zinc-700">Zap workflows</TableHead>
                    <TableHead className="font-semibold text-zinc-700">Last modified</TableHead>
                    <TableHead className="font-semibold text-zinc-700">People with access</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-zinc-50/70">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="h-8 w-8 rounded object-contain"
                          />
                          <div>
                            <div className="font-medium text-zinc-900">{c.name}</div>
                            <div className="text-xs text-zinc-500">
                              Connected through the Zap builder
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-700">{c.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-sm text-zinc-700">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Connected
                          </span>
                          <MvpAction title="Test connection">
                            <span className="cursor-pointer rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-400">
                              Test connection
                            </span>
                          </MvpAction>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm text-zinc-700">
                          <Zap className="h-4 w-4 text-[#FF4F00]" />
                          {c.workflows}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600">
                        {formatDate(c.lastModified)}
                      </TableCell>
                      <TableCell>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">Me</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="text-right">
                        <MvpAction className="inline-block" title="Connection options">
                          <MoreHorizontal className="h-4 w-4 cursor-pointer text-zinc-500" />
                        </MvpAction>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
              <span>
                1–{filtered.length} of {filtered.length}
              </span>
              <MvpAction title="Page size">
                <span className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-1.5">
                  25 per page
                </span>
              </MvpAction>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
