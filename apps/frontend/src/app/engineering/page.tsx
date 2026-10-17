"use client";

import { useCallback, useEffect, useState } from "react";
import { Wrench } from "lucide-react";

import { AppShell } from "@/mycomponents/app/AppShell";
import { ThreePane } from "@/mycomponents/support/Shell";
import { TicketIndex, type IndexState } from "@/mycomponents/support/TicketIndex";
import { useViewerCapabilities } from "@/hooks/useViewerCapabilities";
import { listEngineeringCases } from "@/lib/engineering-client";
import { initialSelection } from "@/lib/support-selection";
import { providerOutcomeLabel, stageLabel, workflowMark } from "@/lib/support-copy";
import type { EngineeringCase } from "@/types/engineering";
import type { SupportTicket } from "@/types/support";
import { EngineeringWorkspace } from "./EngineeringWorkspace";

/**
 * `/engineering`: the escalation queue. The index carries only cases support actually routed,
 * and the case file offers only the two engineering actions. Replay stays with support, so this
 * surface has no replay control anywhere in it.
 */
export default function EngineeringPage() {
  const capabilities = useViewerCapabilities();
  const [state, setState] = useState<IndexState<EngineeringCase>>({ kind: "loading", label: "Loading the queue…" });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listEngineeringCases()
      .then((cases) => {
        if (!active) return;
        setState(cases.length === 0
          ? {
              kind: "empty",
              title: "Nothing routed to engineering",
              detail: "Escalations appear here as soon as a support operator routes a case to engineering.",
            }
          : { kind: "ready", rows: cases });
        setSelectedCaseId((current) =>
          initialSelection(cases.map((item) => ({ caseId: item.case_id })), current));
      })
      .catch((error: unknown) => {
        if (!active) return;
        const status = (error as { status?: number }).status;
        setState(status === 403
          ? {
              kind: "error",
              tone: "muted",
              title: "Engineering access is required",
              detail: "This workspace needs an engineering role. Ask an administrator to grant access.",
            }
          : {
              kind: "error",
              title: "The engineering queue could not load",
              detail: error instanceof Error ? error.message : "The engineering service is unavailable.",
            });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // A case that left the queue (returned to support or resolved) must not stay selected:
  // re-read the queue and drop the stale selection.
  const onRouted = useCallback(() => {
    setNotice("Findings recorded. The queue was refreshed so only open escalations remain.");
    setSelectedCaseId(null);
    reload();
  }, [reload]);

  const toTicket = (item: EngineeringCase): SupportTicket => {
    const mark = workflowMark(item.workflow.status, item.workflow.queue);
    return {
      caseId: item.case_id,
      summary: `${stageLabel(item.stage)} · ${item.safe_code ?? providerOutcomeLabel(item.provider_outcome)}`,
      status: mark.label,
      tone: mark.tone,
      observedAt: item.observed_at,
      ownerLabel: `Owner ${item.subject_owner_id}`,
      safeCode: item.safe_code,
    };
  };

  return (
    <AppShell>
      <ThreePane
        index={
          <TicketIndex
            title="Engineering queue"
            count={state.kind === "ready" ? String(state.rows.length) : undefined}
            state={state}
            toTicket={toTicket}
            onSelect={(item) => {
              setNotice(null);
              setSelectedCaseId(item.case_id);
            }}
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
          <div className={selectedCaseId && state.kind === "ready" ? "flex min-h-0 flex-1 flex-col" : "hidden lg:block"}>
            {selectedCaseId && state.kind === "ready" ? (
              <>
                {notice ? (
                  <p
                    role="status"
                    className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800"
                  >
                    {notice}
                  </p>
                ) : null}
                <EngineeringWorkspace
                  key={selectedCaseId}
                  caseId={selectedCaseId}
                  capabilities={capabilities}
                  onRouted={onRouted}
                  onUnauthorized={() => {
                    setSelectedCaseId(null);
                    reload();
                  }}
                />
              </>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-1 px-6 text-center">
                <Wrench aria-hidden className="h-5 w-5 text-zinc-300" />
                <p className="text-sm font-medium text-zinc-700">Select an escalated case</p>
                <p className="max-w-sm text-xs text-zinc-500">
                  You will see the escalation reason, the evidence support authorized for you, and the handoff history.
                  Replay stays with support operators.
                </p>
              </div>
            )}
          </div>
        }
        aside={
          <div className="border-t border-zinc-200 p-4 text-xs text-zinc-600 lg:border-t-0">
            <h2 className="text-[13px] font-semibold text-zinc-900">What this workspace can and cannot do</h2>
            <ul className="mt-2 space-y-2">
              <li>You can record findings and return the case to support, or resolve it with an explanation.</li>
              <li>The evidence room reads the captured failure and the attempt ledger. Input validation is not authorized for this role.</li>
              <li>
                Replay approval, request and dispatch are support-operator surfaces. No control here publishes a replay or
                changes an owner&apos;s Zap.
              </li>
            </ul>
          </div>
        }
      />
    </AppShell>
  );
}
