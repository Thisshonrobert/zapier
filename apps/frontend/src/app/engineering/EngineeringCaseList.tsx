"use client";

import { AlertTriangle, ChevronRight, Inbox, LifeBuoy } from "lucide-react";

import { LoaderOne } from "@/components/ui/loader";
import type { EngineeringCase } from "@/types/engineering";

export type EngineeringListState =
  | { kind: "loading" }
  | { kind: "denied"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; cases: EngineeringCase[] };

function stageLabel(stage: number) {
  return stage === 0 ? "Trigger" : `Action ${stage}`;
}

function age(observedAt: string) {
  const observed = new Date(observedAt).getTime();
  if (!Number.isFinite(observed)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - observed) / 60_000));
  if (minutes < 60) return `${minutes}m old`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h old`;
  return `${Math.round(hours / 24)}d old`;
}

export function EngineeringCaseList({
  state,
  selectedCaseId,
  onSelect,
}: {
  state: EngineeringListState;
  selectedCaseId?: string;
  onSelect: (caseId: string) => void;
}) {
  if (state.kind === "loading") {
    return (
      <div className="grid place-items-center rounded-xl border border-zinc-200 bg-white py-16">
        <LoaderOne />
      </div>
    );
  }

  if (state.kind === "denied" || state.kind === "error") {
    return (
      <div
        role="alert"
        className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
          state.kind === "denied"
            ? "border-zinc-200 bg-zinc-50 text-zinc-700"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{state.message}</p>
      </div>
    );
  }

  if (state.cases.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white py-16 text-center">
        <Inbox className="h-6 w-6 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">Nothing routed to engineering</p>
        <p className="max-w-sm text-xs text-zinc-500">
          Escalations appear here as soon as a support operator routes a case to engineering.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {state.cases.map((item) => {
        const selected = item.case_id === selectedCaseId;
        return (
          <li key={item.case_id}>
            <button
              onClick={() => onSelect(item.case_id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                selected ? "bg-orange-50/70" : "hover:bg-zinc-50"
              }`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <LifeBuoy className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900">
                  {item.safe_code ?? "Unclassified failure"}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {stageLabel(item.stage)} · owner {item.subject_owner_id} · {age(item.observed_at)}
                </span>
              </span>
              {item.workflow.assignedEngineerId ? (
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                  Assigned
                </span>
              ) : null}
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
