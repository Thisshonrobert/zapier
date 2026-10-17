"use client";

import { useCallback, useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";

import { AppShell } from "@/mycomponents/app/AppShell";
import { ThreePane } from "@/mycomponents/support/Shell";
import { TicketIndex, type IndexState } from "@/mycomponents/support/TicketIndex";
import { OwnerRepairError, listOwnFailures } from "@/lib/owner-client";
import { ownerWorkflowMark, stageLabel } from "@/lib/support-copy";
import { initialSelection } from "@/lib/support-selection";
import type { OwnerFailureSummary } from "@/types/owner";
import type { SupportTicket } from "@/types/support";
import { RepairPanel } from "./RepairPanel";

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; failures: OwnerFailureSummary[] };

/**
 * `/failures`: the owner's side of the same case file. The owner sees only their own Zaps, so
 * the index never carries another owner's identifier, and the case file offers only the two
 * owner actions the backend allows: open the Zap editor, and submit the repair for review.
 */
export default function FailuresPage() {
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    listOwnFailures()
      .then((failures) => {
        if (!active) return;
        setState({ kind: "ready", failures });
        setSelectedCaseId((current) => initialSelection(
          failures.map((failure) => ({ caseId: failure.caseId })), current));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          kind: "error",
          message: error instanceof OwnerRepairError ? error.message : "Could not load your failures.",
        });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const indexState: IndexState<OwnerFailureSummary> =
    state.kind === "loading"
      ? { kind: "loading", label: "Loading your failures…" }
      : state.kind === "error"
        ? {
            kind: "error",
            title: "Your failures could not be loaded",
            detail: state.message,
          }
        : state.failures.length === 0
          ? {
              kind: "empty",
              title: "No failures need you",
              detail: "When one of your Zaps fails, it appears here with the exact step to fix.",
            }
          : { kind: "ready", rows: state.failures };

  const toTicket = (failure: OwnerFailureSummary): SupportTicket => {
    const mark = ownerWorkflowMark(failure.status);
    return {
      caseId: failure.caseId,
      zapName: failure.zapName,
      stepLabel: `${failure.stepLabel}${failure.safeCode ? ` · ${failure.safeCode}` : ""}`,
      summary: `${stageLabel(failure.stage)}${failure.safeCode ? ` · ${failure.safeCode}` : ""}`,
      status: mark.label,
      tone: mark.tone,
      observedAt: failure.observedAt,
      safeCode: failure.safeCode,
    };
  };

  return (
    <AppShell>
      <ThreePane
        index={
          <TicketIndex
            title="Your failures"
            count={state.kind === "ready" ? String(state.failures.length) : undefined}
            state={indexState}
            toTicket={toTicket}
            onSelect={(failure) => setSelectedCaseId(failure.caseId)}
            selectedCaseId={selectedCaseId}
            collapsedOnNarrow
            actions={
              <button
                type="button"
                onClick={reload}
                className="text-xs font-medium text-zinc-500 transition hover:text-zinc-800"
              >
                Refresh
              </button>
            }
          />
        }
        main={
          <div className={selectedCaseId ? "block" : "hidden lg:block"}>
            {selectedCaseId ? (
              <div className="mx-auto w-full max-w-2xl px-4 py-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                  <LifeBuoy aria-hidden className="h-3.5 w-3.5" />
                  Edits change how the Zap runs from now on. The original failed run and its evidence are never
                  rewritten.
                </div>
                <RepairPanel key={selectedCaseId} caseId={selectedCaseId} onChanged={reload} />
                <button
                  type="button"
                  onClick={() => setSelectedCaseId(null)}
                  className="mt-4 text-xs font-medium text-zinc-500 underline underline-offset-2 lg:hidden"
                >
                  Back to your failures
                </button>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-1 px-6 text-center">
                <LifeBuoy aria-hidden className="h-5 w-5 text-zinc-300" />
                <p className="text-sm font-medium text-zinc-700">Select a failure to see what needs fixing</p>
                <p className="max-w-sm text-xs text-zinc-500">
                  Support publishes the exact instructions and missing fields for a case. Until then there is nothing
                  for you to change.
                </p>
              </div>
            )}
          </div>
        }
        aside={
          <div className="border-t border-zinc-200 p-4 text-xs text-zinc-600 lg:border-t-0">
            <h2 className="text-[13px] font-semibold text-zinc-900">What happens after you submit</h2>
            <ol className="mt-2 space-y-2">
              <li>Support reviews your change against the original failure evidence.</li>
              <li>
                A submitted repair is an acknowledgement, not a certification: it does not prove the failure is fixed,
                and it does not replay the original run.
              </li>
              <li>The original failed run, its attempts and its fingerprints stay exactly as they were recorded.</li>
            </ol>
          </div>
        }
      />
    </AppShell>
  );
}
