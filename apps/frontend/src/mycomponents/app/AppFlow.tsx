"use client";

import { ChevronRight } from "lucide-react";
import type { AppType, Zap } from "@/types/zap";

/**
 * App logos repeat on every row of a Zap list, which turns the table into
 * visual noise. Instead each app gets a stable colour derived from its name,
 * and the Zap is drawn as a labelled trigger -> action path.
 */
const TINTS = [
  { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 ring-violet-200" },
  { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 ring-sky-200" },
  { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
  { dot: "bg-cyan-500", chip: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
] as const;

const hash = (value: string) =>
  [...value].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

export const appTint = (name: string) => TINTS[hash(name) % TINTS.length]!;

export const stepsOf = (zap: Pick<Zap, "trigger" | "actions">): AppType[] => [
  ...(zap.trigger?.type ? [zap.trigger.type] : []),
  ...[...zap.actions]
    .sort((a, b) => a.sortingOrder - b.sortingOrder)
    .map((a) => a.type),
];

/** Trigger → action path, rendered as named chips instead of a row of logos. */
export function ZapFlow({
  steps,
  max = 3,
}: {
  steps: AppType[];
  max?: number;
}) {
  if (steps.length === 0) {
    return <span className="text-sm text-zinc-400">No steps</span>;
  }

  const shown = steps.slice(0, max);
  const overflow = steps.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((step, i) => {
        const tint = appTint(step.name);
        return (
          <span key={`${step.id}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tint.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${tint.dot}`} />
              {step.name}
            </span>
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200"
          title={steps
            .slice(max)
            .map((s) => s.name)
            .join(", ")}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

/** Square monogram standing in for the Zap itself, like an app avatar. */
export function ZapMonogram({ name }: { name: string }) {
  const label = (name || "Untitled Zap")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  const tint = appTint(name || "Untitled Zap");

  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold ring-1 ${tint.chip}`}
    >
      {label || "Z"}
    </span>
  );
}
