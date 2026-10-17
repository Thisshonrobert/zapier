"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Play, RefreshCw, ShieldAlert } from "lucide-react";

import { CaseFile, CodeList, type CaseIdentity } from "./CaseFile";
import { CapabilitySummary, ReplayLedger } from "./ReplayLedger";
import { EvidenceRoom } from "./EvidenceRoom";
import { PaneNotice, PaneLoading, Section, ThreePane } from "./Shell";
import { StatusMark } from "./Marks";
import { TicketIndex, type IndexState } from "./TicketIndex";
import { filterCases } from "@/lib/triage-command-center";
import { caseSummary } from "@/lib/support-copy";
import { initialSelection } from "@/lib/support-selection";
import { useCommandCenter } from "@/hooks/useCommandCenter";
import { useNarrowViewport } from "@/hooks/useNarrowViewport";
import { useEvidenceDrawer } from "@/hooks/useEvidenceDrawer";
import { useSupportEvidence } from "@/hooks/useSupportEvidence";
import { useTriage } from "@/hooks/useTriage";
import type { CommandCenterState } from "@/lib/triage-command-center";
import type { TriageCase, TriageDiagnosis } from "@/types/triage";
import type { SupportTicket } from "@/types/support";

/**
 * The support workbench: `/triage`'s three panes. The index browses every case the operator is
 * allowed to see, the case file carries the diagnosis and the permitted actions, and the
 * evidence room reads the failure, the attempt ledger and the input validation. The workbench
 * owns no authority of its own — every control here is enabled by what the server reported.
 */
export function SupportWorkbench() {
  const {
    casesState,
    diagnosisState,
    selectedCase,
    selectCase,
    diagnose,
    saved,
    pendingDecision,
    polling,
    decide,
    refresh,
    capabilities,
    replayAction,
    dryRunReplay,
    requestReplay,
  } = useTriage();

  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const narrow = useNarrowViewport();
  const { panelRef, triggerRef } = useEvidenceDrawer(evidenceOpen, narrow ? () => setEvidenceOpen(false) : undefined);

  const cases = casesState.kind === "cases" ? casesState.cases : null;
  const allCases = useMemo(() => cases ?? [], [cases]);
  const visible = useMemo(
    () => filterCases(allCases, { query, outcome, source: "all", order: "newest" }),
    [allCases, query, outcome],
  );
  const commandCenter = useCommandCenter(selectedCase?.case_id, casesState.kind === "blocked" ? null : saved);
  const evidence = useSupportEvidence(
    selectedCase && casesState.kind !== "blocked" ? selectedCase.case_id : null,
    casesState.kind !== "blocked",
  );

  // A cold load with a URL-restored case must not silently drop it: the selection is owned by
  // the hook, and the index only reports what the operator clicked.
  useEffect(() => {
    if (selectedCase || allCases.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("case");
    const next = initialSelection(allCases.map((item) => ({ caseId: item.case_id })), requested);
    const found = allCases.find((item) => item.case_id === next);
    if (found) selectCase(found);
  }, [allCases, selectedCase, selectCase]);

  const outcomes = [...new Set(allCases.map((item) => item.provider_outcome ?? "unavailable"))].sort();
  const blocked = casesState.kind === "blocked";
  const investigationLoading = diagnosisState.kind === "loading";

  const indexState: IndexState<TriageCase> = blocked
    ? {
        kind: "error",
        tone: "muted",
        title: "Support access is required",
        detail: "This account cannot open the support queue. Ask an administrator to grant the support operator role.",
      }
    : casesState.kind === "loading"
      ? { kind: "loading", label: "Loading the support queue…" }
      : casesState.kind === "error"
        ? { kind: "error", title: "The support queue could not load", detail: casesState.message }
        : casesState.kind === "empty"
          ? {
              kind: "empty",
              title: "No failures need support",
              detail: "No recent failed workflow case is inside this bounded view. New durable failures appear here on their own.",
            }
          : { kind: "ready", rows: visible };

  const filteredEmpty =
    casesState.kind === "cases" && allCases.length > 0 && visible.length === 0
      ? {
          title: "No case matches these filters",
          detail: `${allCases.length} cases are loaded, and none match the current search or provider outcome.`,
          onClear: () => {
            setQuery("");
            setOutcome("all");
          },
        }
      : undefined;

  const selectedHidden =
    selectedCase && casesState.kind === "cases" && !visible.some((item) => item.case_id === selectedCase.case_id)
      ? selectedCase
      : null;

  const toTicket = (item: TriageCase): SupportTicket => ({
    caseId: item.case_id,
    summary: caseSummary(item),
    status: item.source === "reconciled_execution" ? "Reconciled" : "Durable failure",
    tone: item.provider_outcome === "rejected" ? "denied" : item.provider_outcome === "unknown" ? "waiting" : "neutral",
    observedAt: item.observed_at,
    ownerLabel: `Owner ${item.subject_owner_id}`,
    safeCode: item.safe_code,
  });

  const evidenceRoom = (
    <EvidenceRoom
      caseId={selectedCase?.case_id ?? null}
      state={evidence.state}
      onReload={evidence.reload}
      onClose={narrow ? () => setEvidenceOpen(false) : undefined}
      saved={saved}
      diagnosis={diagnosisState.kind === "result" ? diagnosisState.result : null}
    />
  );

  return (
    <>
      <ThreePane
        index={
          <TicketIndex
            title="Support queue"
            count={
              casesState.kind === "cases"
                ? `${visible.length}/${allCases.length}`
                : undefined
            }
            state={indexState}
            toTicket={toTicket}
            onSelect={selectCase}
            selectedCaseId={selectedCase?.case_id ?? null}
            collapsedOnNarrow
            actions={
              <button
                type="button"
                onClick={refresh}
                disabled={!selectedCase || pendingDecision || blocked}
                className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
                title="Refresh saved status"
              >
                <RefreshCw aria-hidden className="h-3.5 w-3.5" />
                <span className="sr-only">Refresh saved status</span>
              </button>
            }
            search={{
              label: "Search cases",
              placeholder: "Case, run, owner or error code",
              value: query,
              onChange: setQuery,
              controls:
                allCases.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-zinc-500">
                      <span className="shrink-0">Outcome</span>
                      <select
                        value={outcome}
                        onChange={(event) => setOutcome(event.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-[11px] text-zinc-700 focus:border-[#FF4F00] focus:outline-none"
                      >
                        <option value="all">All outcomes</option>
                        {outcomes.map((value) => (
                          <option key={value} value={value}>
                            {value.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="shrink-0 text-[11px] text-zinc-400">
                      {polling ? "Live" : selectedCase ? "Updates stopped" : ""}
                    </span>
                  </div>
                ) : null,
            }}
            filteredEmpty={filteredEmpty}
            notice={
              selectedHidden ? (
                <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  The selected case is hidden by these filters. Its investigation is still open.
                </div>
              ) : null
            }
          />
        }
        main={
          <div className={selectedCase ? "block" : "hidden lg:block"}>
            {selectedCase ? (
            <CaseFile
              identity={identityOf(selectedCase)}
              onOpenEvidence={narrow ? () => setEvidenceOpen(true) : undefined}
              evidenceTriggerRef={triggerRef}
              aside={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={diagnose}
                    disabled={investigationLoading || pendingDecision || blocked}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4F00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#e64700] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4F00]"
                  >
                    <Play aria-hidden className="h-3.5 w-3.5" />
                    {investigationLoading ? "Investigating…" : saved ? "Investigate again" : "Investigate"}
                  </button>
                  {saved ? <StatusMark label={`Investigation ${saved.status}`} tone="neutral" /> : null}
                  <span className="text-[11px] text-zinc-500">
                    {polling
                      ? "Updates stream while this investigation is open."
                      : "Automatic updates stopped. Refresh saved status to read the current state."}
                  </span>
                </div>
              }
              context={
                <Section
                  title="Step handler"
                  description="Reported by the captured failure evidence, when it was recorded."
                  id="step-handler"
                >
                  <p className="text-xs text-zinc-700">
                    {evidenceContextHandler(evidence.state) ?? "No step handler was recorded in the captured evidence."}
                  </p>
                </Section>
              }
              work={
                <>
                  <DiagnosisOrPending
                    state={diagnosisState}
                    savedProposal={Boolean(saved)}
                    caseId={selectedCase.case_id}
                  />
                  {saved ? (
                    <ReplayLedger
                      saved={saved}
                      capabilities={capabilities}
                      pending={pendingDecision}
                      replayAction={replayAction}
                      onDecision={decide}
                      onDryRun={dryRunReplay}
                      onRequestReplay={requestReplay}
                    />
                  ) : (
                    <Section
                      title="Replay ledger"
                      description="Eligibility, approval, publication and execution are recorded separately."
                      id="replay-ledger-empty"
                    >
                      <p className="text-xs text-zinc-600">
                        No saved proposal exists for this case yet. Run an investigation to produce an advisory
                        candidate, then read the application&apos;s own eligibility beside it.
                      </p>
                    </Section>
                  )}
                  <CapabilitySummary capabilities={capabilities} />
                </>
              }
              activity={<InvestigationActivity state={commandCenter} />}
            />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-1 px-6 text-center">
              <ShieldAlert aria-hidden className="h-5 w-5 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-700">
                {blocked ? "Support access is required" : "Select a case to investigate"}
              </p>
              <p className="max-w-sm text-xs text-zinc-500">
                {blocked
                  ? "This account cannot open the support queue."
                  : "The case file, its evidence and the replay ledger appear here once a case is selected."}
              </p>
            </div>
          )
            }
          </div>
        }
        aside={evidenceRoom}
      />

      {evidenceOpen && narrow ? (
        <div className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden" role="dialog" aria-modal="true" aria-label="Case evidence">
          <button
            type="button"
            aria-label="Close evidence"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setEvidenceOpen(false)}
            className="absolute inset-0 bg-zinc-900/30"
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            className="relative flex h-[82dvh] flex-col overflow-hidden rounded-t-xl border-t border-zinc-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] outline-none"
          >
            {evidenceRoom}
          </div>
        </div>
      ) : null}
    </>
  );
}

function identityOf(item: TriageCase): CaseIdentity {
  return {
    caseId: item.case_id,
    title: caseSummary(item),
    subtitle:
      item.source === "reconciled_execution"
        ? "Reconciled from execution evidence"
        : "Durable failure row",
    status: item.provider_outcome === "rejected" ? "Provider rejected" : item.provider_outcome === "unknown" ? "Outcome unknown" : "With support",
    tone: item.provider_outcome === "rejected" ? "denied" : item.provider_outcome === "unknown" ? "waiting" : "neutral",
    observedAt: item.observed_at,
    ownerLabel: `Owner ${item.subject_owner_id}`,
    safeCode: item.safe_code,
    providerOutcome: item.provider_outcome,
    source: item.source,
    stage: item.stage,
    zapRunId: item.zap_run_id,
  };
}

/** The handler name is only shown when the failure-context evidence actually reported it. */
function evidenceContextHandler(state: ReturnType<typeof useSupportEvidence>["state"]) {
  if (state.kind !== "ready") return null;
  return state.evidence.failureContext.data?.facts.current_action_type ?? null;
}

function DiagnosisOrPending({
  state,
  savedProposal,
  caseId,
}: {
  state: ReturnType<typeof useTriage>["diagnosisState"];
  savedProposal: boolean;
  caseId: string;
}) {
  if (state.kind === "idle")
    return (
      <Section
        title="Diagnosis"
        description="An investigation reads case-scoped evidence and proposes a next step. It grants no authority."
        id="diagnosis"
      >
        <p className="text-xs text-zinc-600">
          Not investigated yet. The deterministic failure facts for {caseId} are already readable in the evidence
          room, so you can start there without spending a model call.
        </p>
      </Section>
    );

  if (state.kind === "loading")
    return (
      <Section title="Diagnosis" id="diagnosis">
        <PaneLoading label="Investigating this case. Grounded evidence is being read first…" />
      </Section>
    );

  if (state.kind === "blocked")
    return (
      <Section title="Diagnosis" id="diagnosis">
        <PaneNotice icon={ShieldAlert} title="Support access is required" detail="This account cannot run an investigation." />
      </Section>
    );

  if (state.kind === "empty")
    return (
      <Section title="Diagnosis" id="diagnosis">
        <PaneNotice icon={Clock} title="No cases to investigate" detail="Select a case from the queue first." />
      </Section>
    );

  if (state.kind === "error")
    return (
      <Section title="Diagnosis" id="diagnosis">
        <PaneNotice
          tone="alert"
          icon={AlertTriangle}
          title="The investigation did not produce a diagnosis"
          detail={`${state.message}${savedProposal ? " A previously saved proposal is still shown below." : ""}`}
        />
      </Section>
    );

  if (state.kind === "cases")
    return (
      <Section title="Diagnosis" id="diagnosis">
        <p className="text-xs text-zinc-600">Select a case and run an investigation.</p>
      </Section>
    );

  return <Diagnosis result={state.result} />;
}

function Diagnosis({ result }: { result: TriageDiagnosis }) {
  const { diagnosis, proposal } = result;
  const unknown = proposal.disposition === "outcome_unknown" || diagnosis.taxonomy_id === "unknown";
  return (
    <>
      <Section
        title="Diagnosis"
        description="Advisory only. Application policy, not this advice, decides what may be replayed."
        id="diagnosis"
        actions={<StatusMark label={`${diagnosis.confidence} confidence`} tone={unknown ? "waiting" : "submitted"} />}
      >
        <h4 className="text-sm font-semibold text-zinc-900">{unknown ? "Outcome unknown" : diagnosis.taxonomy_id}</h4>
        <p className="mt-1 text-sm text-zinc-700">{diagnosis.summary}</p>
        <p className="mt-2 text-[11px] text-zinc-500">
          Investigation status: {result.status === "completed" ? "completed" : "abstained"}
        </p>
        {diagnosis.alternate_explanations?.length ? (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-medium text-zinc-500">Other explanations the evidence allows</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-700">
              {diagnosis.alternate_explanations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section
        title="Advisory next step"
        description="What the resolver proposed. It is not an approval and not a dispatch."
        id="proposal"
        actions={<StatusMark label={proposal.disposition.replaceAll("_", " ")} tone="neutral" />}
      >
        <p className="text-sm text-zinc-800">{proposal.summary}</p>
        <dl className="mt-2">
          <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5">
            <dt className="text-xs text-zinc-500">Proposal kind</dt>
            <dd className="text-xs font-medium text-zinc-800">{proposal.kind.replaceAll("_", " ")}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="text-xs text-zinc-500">Not before</dt>
            <dd className="text-xs font-medium text-zinc-800">{proposal.not_before ?? "no recorded cooldown"}</dd>
          </div>
        </dl>
        {proposal.reasons.length ? (
          <div className="mt-2">
            <p className="mb-1 text-[11px] font-medium text-zinc-500">Why the resolver proposed this</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-700">
              {proposal.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {proposal.preconditions.length ? (
          <div className="mt-2">
            <p className="mb-1 text-[11px] font-medium text-zinc-500">Preconditions it recorded</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-700">
              {proposal.preconditions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <CodeList
        title="Missing evidence"
        description="What the diagnosis could not see. Nothing is inferred to replace it."
        items={diagnosis.missing_evidence}
        empty="The diagnosis reported no missing evidence."
        id="diagnosis-missing-evidence"
      />
      <CodeList
        title="Evidence references"
        description="The case-scoped evidence this diagnosis cited."
        items={diagnosis.evidence_refs}
        empty="The diagnosis cited no evidence references."
        id="diagnosis-evidence-refs"
      />
      <p className="px-4 py-2 text-[11px] text-zinc-500">
        Versioned runbook citations for this diagnosis are listed in the evidence room under Runbooks.
      </p>
    </>
  );
}

/** Investigation milestones and the trace link, read from the command-center projection. */
export function InvestigationActivity({ state }: { state: CommandCenterState | null }) {
  if (!state) return null;
  if (state.kind === "loading")
    return (
      <Section title="Investigation activity" id="activity">
        <PaneLoading label="Loading the investigation timeline…" />
      </Section>
    );
  if (state.kind === "error")
    return (
      <Section title="Investigation activity" id="activity">
        <PaneNotice
          icon={AlertTriangle}
          title="Timeline unavailable"
          detail="The saved status, diagnosis and decisions above are unaffected. Refresh saved status to retry."
        />
      </Section>
    );

  const { history, trace } = state.data;
  return (
    <Section
      title="Investigation activity"
      description="Durable milestones, in order, from the saved investigation."
      id="activity"
      actions={history.data ? <StatusMark label={history.data.currentStatus} tone="neutral" /> : null}
    >
      {history.data ? (
        <>
          {history.data.truncated ? (
            <p className="mb-2 text-[11px] text-amber-800">
              History is partial: at most 64 milestones from the last seven days.
            </p>
          ) : null}
          {history.data.events.length === 0 ? (
            <p className="text-xs text-zinc-500">No retained milestones are available for this investigation.</p>
          ) : (
            <ol className="space-y-2">
              {[...history.data.events].reverse().map((event) => (
                <li key={event.sequence} className="flex items-baseline gap-3 text-xs">
                  <time dateTime={event.observedAt} className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-400">
                    {new Date(event.observedAt).toLocaleTimeString()}
                  </time>
                  <span className="font-medium text-zinc-800">{event.status.replaceAll("_", " ")}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p role="status" className="text-xs text-amber-800">
          Timeline unavailable. Diagnosis and decisions remain in the saved status above.
        </p>
      )}

      <div className="mt-3 border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-600">
        {trace ? (
          <>
            {trace.url ? (
              <a href={trace.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#b33800] underline underline-offset-2">
                Open investigation trace ↗
              </a>
            ) : (
              <span>Trace link unavailable.</span>
            )}
            <p className="mt-1 font-mono break-all text-zinc-400">Trace {trace.id}</p>
            <p className="mt-1">
              Export is best effort; a recorded trace ID does not confirm delivery to the trace service. Trace access
              requires project membership.
            </p>
          </>
        ) : (
          <p>No trace was recorded for this saved investigation.</p>
        )}
      </div>
    </Section>
  );
}
