import { createRoot } from "react-dom/client";
import { useState } from "react";

import { CaseFile, type CaseIdentity } from "@/mycomponents/support/CaseFile";
import { EvidenceRoom } from "@/mycomponents/support/EvidenceRoom";
import { CapabilitySummary, ReplayLedger } from "@/mycomponents/support/ReplayLedger";
import { Section, ThreePane, PaneNotice } from "@/mycomponents/support/Shell";
import { StatusMark } from "@/mycomponents/support/Marks";
import { TicketIndex } from "@/mycomponents/support/TicketIndex";
import { SupportWorkbench } from "@/mycomponents/support/SupportWorkbench";
import { caseSummary } from "@/lib/support-copy";
import type { SupportTicket } from "@/types/support";
import { cases, diagnosis, evidence, saved } from "./fixtures";

/**
 * Hydrated harness. The static render is the screenshot harness; this entry mounts one real
 * interactive workbench so a browser pass can exercise the keyboard contract (roving tab stop,
 * evidence tabs, drawer) against the shipped components rather than their markup.
 *
 * Run: bun build .impeccable/harness/hydrate.tsx --target=browser --outfile=.impeccable/review/hydrate.js
 */

const capabilities = {
  investigation: true,
  replayIntent: true,
  replayExecution: true,
  releaseReady: true,
  labProfile: "triage-lab-v1",
  reasons: [] as string[],
};

const toTicket = (item: (typeof cases)[number]): SupportTicket => ({
  caseId: item.case_id,
  summary: caseSummary(item),
  status: item.source === "reconciled_execution" ? "Reconciled" : "Durable failure",
  tone: item.provider_outcome === "rejected" ? "denied" : item.provider_outcome === "unknown" ? "waiting" : "neutral",
  observedAt: item.observed_at,
  ownerLabel: `Owner ${item.subject_owner_id}`,
  safeCode: item.safe_code,
});

const identity: CaseIdentity = {
  caseId: cases[0]!.case_id,
  title: caseSummary(cases[0]!),
  subtitle: "Durable failure row",
  status: "Provider rejected",
  tone: "denied",
  observedAt: cases[0]!.observed_at,
  ownerLabel: `Owner ${cases[0]!.subject_owner_id}`,
  safeCode: cases[0]!.safe_code,
  providerOutcome: cases[0]!.provider_outcome,
  source: cases[0]!.source,
  stage: cases[0]!.stage,
  zapRunId: cases[0]!.zap_run_id,
};

/** One live index and one live ledger, so the keyboard contract can be driven in a browser. */
function LiveWorkbench() {
  const [selected, setSelected] = useState<string | null>(cases[0]!.case_id);
  const [tab, setTab] = useState<"observed" | "execution" | "inputs" | "runbooks">("observed");
  return (
    <div className="flex h-[900px] w-full flex-col bg-[#fffdf9]">
      <ThreePane
        index={
          <TicketIndex
            title="Support queue"
            count={`${cases.length}/${cases.length}`}
            state={{ kind: "ready", rows: cases }}
            toTicket={toTicket}
            onSelect={(item) => setSelected(item.case_id)}
            selectedCaseId={selected}
            search={{ label: "Search cases", placeholder: "Case, run, owner or error code", value: "", onChange: () => {} }}
            actions={
              <button
                type="button"
                onClick={() => setTab("execution")}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700"
              >
                Execution
              </button>
            }
          />
        }
        main={
          <CaseFile
            identity={identity}
            onBack={() => setSelected(null)}
            onOpenEvidence={() => setTab("execution")}
            work={
              <>
                <Section title="Diagnosis" description="Advisory only." id="diagnosis">
                  <p className="text-sm text-zinc-700">{diagnosis.diagnosis.summary}</p>
                </Section>
                <ReplayLedger
                  saved={saved}
                  capabilities={capabilities}
                  pending={false}
                  onDecision={() => {}}
                  onDryRun={() => {}}
                  onRequestReplay={() => {}}
                />
                <CapabilitySummary capabilities={capabilities} />
              </>
            }
          />
        }
        aside={
          <EvidenceRoom
            caseId={cases[0]!.case_id}
            state={{ kind: "ready", evidence }}
            onReload={() => {}}
            saved={saved}
            diagnosis={diagnosis}
            initialTab={tab}
          />
        }
      />
    </div>
  );
}

function DrawerWorkbench() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800"
      >
        Open evidence drawer
      </button>
      <PaneNotice tone="alert" title="Drawer state" detail="Opened from the case file on a narrow screen." />
      {open ? (
        <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Case evidence">
          <button type="button" aria-label="Close evidence" onClick={() => setOpen(false)} className="absolute inset-0 bg-zinc-900/30" />
          <div className="relative flex h-[70dvh] flex-col overflow-hidden rounded-t-xl border-t border-zinc-200 bg-white">
            <EvidenceRoom
              caseId={cases[0]!.case_id}
              state={{ kind: "ready", evidence }}
              onReload={() => {}}
              onClose={() => setOpen(false)}
              saved={saved}
              diagnosis={diagnosis}
              initialTab="execution"
            />
          </div>
        </div>
      ) : null}
      <StatusMark label="Drawer closed" tone="neutral" />
    </div>
  );
}

const report = (label: string) => (error: unknown) => {
  const target = document.getElementById("hydrate-error");
  if (target) target.textContent += `[${label}] ${String((error as Error)?.stack ?? error)}\n`;
};

(window as { __hydrateStarted?: boolean }).__hydrateStarted = true;

const mount = (id: string, element: React.ReactElement) => {
  const container = document.getElementById(id);
  if (!container) return;
  // The inspection page must show why a mount failed instead of leaving an empty box.
  createRoot(container, { onUncaughtError: report(id), onCaughtError: report(id) }).render(element);
};

mount("live", <LiveWorkbench />);
mount("drawer", <DrawerWorkbench />);
// The real page component, mounted narrow, so the shipped drawer and its focus contract can be
// driven in a browser even though the dev server cannot start in this environment.
mount("workbench", <SupportWorkbench />);
