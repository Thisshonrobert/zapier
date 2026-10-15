"use client";

import { AlertTriangle, ChevronRight, Inbox } from "lucide-react";

import { LoaderOne } from "@/components/ui/loader";
import { appTint } from "@/mycomponents/app/AppFlow";
import type { OwnerFailureSummary, WorkflowStatus } from "@/types/owner";

const statusCopy: Record<WorkflowStatus, { label: string; chip: string }> = {
  needing_support: { label: "With support", chip: "bg-zinc-100 text-zinc-700 ring-zinc-200" },
  awaiting_owner: { label: "Needs your fix", chip: "bg-[#FF4F00]/10 text-[#c23c00] ring-[#FF4F00]/30" },
  repair_submitted: { label: "Submitted", chip: "bg-sky-50 text-sky-700 ring-sky-200" },
  escalated: { label: "With engineering", chip: "bg-violet-50 text-violet-700 ring-violet-200" },
  findings_returned: { label: "Under review", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  resolved: { label: "Resolved", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export function StatusChip({ status }: { status: WorkflowStatus }) {
  const copy = statusCopy[status] ?? statusCopy.needing_support;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${copy.chip}`}>
      {copy.label}
    </span>
  );
}

export function OwnerFailureList({
  state,
  selectedCaseId,
  onSelect,
}: {
  state:
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; failures: OwnerFailureSummary[] };
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

  if (state.kind === "error") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{state.message}</p>
      </div>
    );
  }

  if (state.failures.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white py-16 text-center">
        <Inbox className="h-6 w-6 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">No failures need you</p>
        <p className="max-w-sm text-xs text-zinc-500">
          When one of your Zaps fails, it appears here with the exact step to fix.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {state.failures.map((failure) => {
        const tint = appTint(failure.zapName);
        const selected = failure.caseId === selectedCaseId;
        return (
          <li key={failure.caseId}>
            <button
              onClick={() => onSelect(failure.caseId)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                selected ? "bg-orange-50/70" : "hover:bg-zinc-50"
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${tint.dot}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900">
                  {failure.zapName}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {failure.stepLabel}
                  {failure.safeCode ? ` · ${failure.safeCode}` : ""}
                </span>
              </span>
              <StatusChip status={failure.status} />
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
