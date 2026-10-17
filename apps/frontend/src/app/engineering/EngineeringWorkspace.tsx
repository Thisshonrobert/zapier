"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, History, X } from "lucide-react";

import { CaseFile, Fact, Section, type CaseIdentity } from "@/mycomponents/support/CaseFile";
import { EvidenceRoom } from "@/mycomponents/support/EvidenceRoom";
import { PaneNotice } from "@/mycomponents/support/Shell";
import { StatusMark } from "@/mycomponents/support/Marks";
import { Field, btnPrimary, btnSecondary } from "@/mycomponents/app/FormKit";
import { useSupportEvidence } from "@/hooks/useSupportEvidence";
import { useNarrowViewport } from "@/hooks/useNarrowViewport";
import { useEvidenceDrawer } from "@/hooks/useEvidenceDrawer";
import { humanizeCode, providerOutcomeLabel, sourceLabel, workflowMark } from "@/lib/support-copy";
import { EVIDENCE_SCOPES } from "@/lib/support-evidence";
import { EngineeringError, readEngineeringCaseHistory, resolveEngineeringCase, returnFindings } from "@/lib/engineering-client";
import {
  handoffCopy,
  queueLabels,
  workflowActionLabels,
  type EngineeringCaseHistory,
  type ViewerCapabilities,
} from "@/types/engineering";

const textareaClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-[#FF4F00] focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; history: EngineeringCaseHistory };

type Notice = { tone: "ok" | "error"; message: string };

/** Bound to the same shape the backend validates, so a rejected payload never leaves the client. */
export const FINDINGS_MAX = 4_000;
export const REASON_MAX = 2_000;
export const NOTES_MAX = 2_000;

export function canSubmitFindings(findings: string, pending: boolean) {
  const trimmed = findings.trim();
  return !pending && trimmed.length > 0 && trimmed.length <= FINDINGS_MAX;
}

export function canSubmitResolution(reason: string, pending: boolean) {
  const trimmed = reason.trim();
  return !pending && trimmed.length > 0 && trimmed.length <= REASON_MAX;
}

function idempotencyKey() {
  return globalThis.crypto.randomUUID();
}

/**
 * The engineering case file. It reuses the shared composition and the shared evidence room,
 * and it renders whatever the engineering service says — including the case where the queue
 * position has already moved on. No replay control exists in this workspace, by contract.
 */
export function EngineeringWorkspace({
  caseId,
  capabilities,
  onRouted,
  onUnauthorized,
}: {
  caseId: string;
  capabilities: ViewerCapabilities | null;
  onRouted?: () => void;
  onUnauthorized?: () => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [findings, setFindings] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const narrow = useNarrowViewport();
  const { panelRef, triggerRef } = useEvidenceDrawer(evidenceOpen, narrow ? () => setEvidenceOpen(false) : undefined);
  const evidence = useSupportEvidence(caseId, true, {
    scope: EVIDENCE_SCOPES.engineering,
  });

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });
    setFindings("");
    setNotes("");
    setReason("");
    setNotice(null);
    void (async () => {
      try {
        const history = await readEngineeringCaseHistory(caseId);
        if (active) setState({ kind: "ready", history });
      } catch (error: unknown) {
        if (!active) return;
        if (error instanceof EngineeringError && (error.status === 403 || error.status === 404)) {
          onUnauthorized?.();
        }
        setState({
          kind: "error",
          message: error instanceof EngineeringError
            ? error.message
            : "Could not load this escalation.",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [caseId, reloadKey, onUnauthorized]);

  async function submitFindings(history: EngineeringCaseHistory) {
    setPending(true);
    setNotice(null);
    try {
      await returnFindings({
        caseId: history.case.case_id,
        findings: findings.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        idempotencyKey: idempotencyKey(),
      });
      setNotice({ tone: "ok", message: "Findings returned to support. It is no longer in your queue." });
      setFindings("");
      setNotes("");
      onRouted?.();
    } catch (error: unknown) {
      if (error instanceof EngineeringError && error.status === 403) onUnauthorized?.();
      setNotice({
        tone: "error",
        message: error instanceof EngineeringError
          ? error.message
          : "Returning findings failed. Try again.",
      });
    } finally {
      setPending(false);
    }
  }

  async function submitResolution(history: EngineeringCaseHistory) {
    setPending(true);
    setNotice(null);
    try {
      await resolveEngineeringCase({
        caseId: history.case.case_id,
        resolutionReason: reason.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        idempotencyKey: idempotencyKey(),
      });
      setNotice({ tone: "ok", message: "Case resolved with your explanation recorded." });
      setReason("");
      setNotes("");
      onRouted?.();
    } catch (error: unknown) {
      if (error instanceof EngineeringError && error.status === 403) onUnauthorized?.();
      setNotice({
        tone: "error",
        message: error instanceof EngineeringError
          ? error.message
          : "Resolving the case failed. Try again.",
      });
    } finally {
      setPending(false);
    }
  }

  const evidenceRoom = (
    <EvidenceRoom
      caseId={caseId}
      state={evidence.state}
      onReload={evidence.reload}
      onClose={evidenceOpen ? () => setEvidenceOpen(false) : undefined}
      saved={null}
      diagnosis={null}
    />
  );

  if (state.kind === "loading") {
    return (
      <div className="grid min-h-[320px] place-items-center">
        <p role="status" className="text-xs text-zinc-500">
          Loading this escalation…
        </p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="p-4">
        <PaneNotice
          tone="alert"
          icon={AlertTriangle}
          title="This escalation could not be loaded"
          detail={state.message}
          action={
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const { history } = state;
  const handoff = handoffCopy(history);
  const inQueue = history.case.workflow.queue === "engineering";
  const allowed = Boolean(capabilities?.isEngineer && inQueue);
  const mark = workflowMark(history.case.workflow.status, history.case.workflow.queue);
  const identity: CaseIdentity = {
    caseId: history.case.case_id,
    title: history.case.safe_code ?? "Unclassified failure",
    subtitle: `${history.case.stage === 0 ? "Trigger" : `Action ${history.case.stage}`} · routed to engineering`,
    status: mark.label,
    tone: mark.tone,
    observedAt: history.case.observed_at,
    ownerLabel: `Owner ${history.case.subject_owner_id}`,
    safeCode: history.case.safe_code,
    providerOutcome: history.case.provider_outcome,
    source: history.case.source,
    stage: history.case.stage,
    zapRunId: history.case.zap_run_id,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain" data-case-file="">
        <CaseFile
          identity={identity}
          aside={
            <div className="flex flex-wrap items-center gap-2">
              <StatusMark label={queueLabels[history.case.workflow.queue]} tone={mark.tone} />
              <span className="text-[11px] text-zinc-600">{handoff.message}</span>
              {narrow ? (
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={() => setEvidenceOpen(true)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Evidence
                </button>
              ) : null}
            </div>
          }
          context={
            <Section title="Routed details" description="What the support operator recorded when escalating." id="routed">
              <dl>
                <Fact label="Provider outcome" value={providerOutcomeLabel(history.case.provider_outcome)} />
                <Fact label="Evidence source" value={sourceLabel(history.case.source)} />
                <Fact
                  label="Assigned engineer"
                  value={history.case.workflow.assignedEngineerId ? String(history.case.workflow.assignedEngineerId) : "unassigned"}
                  mono
                />
                <Fact label="Workflow version" value={`v${history.case.workflow.version}`} />
                <Fact label="Last updated" value={new Date(history.case.workflow.updatedAt).toLocaleString()} />
              </dl>
            </Section>
          }
          activity={
            <>
              <Section
                title="Why support escalated this"
                description="The reason the support operator recorded."
                id="escalation-reason"
              >
                <p className="text-sm text-zinc-800">
                  {history.case.workflow.escalationReason ?? "No escalation reason was recorded."}
                </p>
              </Section>

              {history.case.workflow.customerInstructions ? (
                <Section
                  title="Customer-safe instructions already published"
                  description="What the owner was asked to do. This text was reviewed by a person."
                  id="published-instructions"
                >
                  <p className="text-sm text-zinc-800">{history.case.workflow.customerInstructions.instructions}</p>
                  {history.case.workflow.customerInstructions.missingFields.length ? (
                    <p className="mt-2 text-xs text-zinc-600">
                      Missing fields:{" "}
                      <span className="font-medium text-zinc-800">
                        {history.case.workflow.customerInstructions.missingFields.join(", ")}
                      </span>
                    </p>
                  ) : null}
                </Section>
              ) : null}

              <Section
                title="Handoff history"
                description="Every workflow event recorded for this case."
                id="handoff-history"
              >
                {history.events.length === 0 ? (
                  <p className="text-xs text-zinc-500">No workflow events are recorded for this case.</p>
                ) : (
                  <ol className="space-y-3">
                    {history.events.map((event) => (
                      <li key={event.id} className="border-l-2 border-zinc-200 pl-3">
                        <p className="text-xs font-medium text-zinc-900">
                          {workflowActionLabels[event.action] ?? humanizeCode(event.action)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {queueLabels[event.fromQueue]} → {queueLabels[event.toQueue]} · actor {event.actorId} ·{" "}
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                        {event.notes ? <p className="mt-1 text-[11px] text-zinc-700">{event.notes}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
                {history.case.workflow.findings ? (
                  <p className="mt-3 rounded-md bg-zinc-50 p-2.5 text-xs text-zinc-700">
                    <span className="font-medium">Recorded findings: </span>
                    {history.case.workflow.findings}
                  </p>
                ) : null}
              </Section>
            </>
          }
          work={
            allowed ? (
              <Section
                title="Return findings to support"
                description="Responsibility moves back to the support queue. Replay approval and dispatch stay with support operators; this workspace cannot request or execute a replay."
                id="return-findings"
              >
                {notice ? (
                  <div
                    role={notice.tone === "error" ? "alert" : "status"}
                    className={`mb-3 flex items-start gap-2 rounded-lg border p-3 text-xs ${
                      notice.tone === "ok"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    }`}
                  >
                    {notice.tone === "ok" ? <CheckCircle2 aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
                    {notice.message}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <Field label="Findings" hint={`Required · up to ${FINDINGS_MAX} characters`}>
                    <textarea
                      rows={4}
                      className={textareaClass}
                      value={findings}
                      onChange={(event) => setFindings(event.target.value)}
                      placeholder="What did you find, and what should support do next?"
                    />
                  </Field>
                  <Field label="Internal note" hint={`Optional · up to ${NOTES_MAX} characters`}>
                    <textarea
                      rows={2}
                      className={textareaClass}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </Field>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className={btnPrimary}
                      disabled={!canSubmitFindings(findings, pending)}
                      onClick={() => void submitFindings(history)}
                    >
                      {pending ? "Working…" : "Return findings to support"}
                    </button>
                    <span className="text-[11px] text-zinc-500">
                      {findings.trim().length}/{FINDINGS_MAX}
                    </span>
                  </div>
                </div>

                <div className="mt-5 border-t border-zinc-100 pt-4">
                  <h4 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
                    <History aria-hidden className="h-3.5 w-3.5 text-zinc-400" />
                    Resolve with an explanation
                  </h4>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Use this only when engineering work closed the case without returning it to support.
                  </p>
                  <div className="mt-3 space-y-3">
                    <Field label="Resolution reason" hint={`Required · up to ${REASON_MAX} characters`}>
                      <textarea
                        rows={3}
                        className={textareaClass}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </Field>
                    <button
                      className={btnSecondary}
                      disabled={!canSubmitResolution(reason, pending)}
                      onClick={() => void submitResolution(history)}
                    >
                      Resolve case
                    </button>
                  </div>
                </div>
              </Section>
            ) : (
              <Section
                title="No engineering action available"
                description="This workspace states the queue position honestly rather than offering a control that would be rejected."
                id="no-action"
              >
                <p className="text-xs text-zinc-600">
                  {inQueue
                    ? "Your engineering access was revoked or is not active, so this case is read-only for you."
                    : "This case is no longer routed to engineering, so responsibility sits elsewhere."}
                </p>
              </Section>
            )
          }
        />
      </div>

      <div className="hidden min-h-0 flex-col border-zinc-200 xl:flex xl:w-[400px] xl:shrink-0 xl:border-l">
        {evidenceRoom}
      </div>

      {evidenceOpen && narrow ? (
        <div className="fixed inset-0 z-40 flex flex-col justify-end xl:hidden" role="dialog" aria-modal="true" aria-label="Case evidence">
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
            <button
              type="button"
              onClick={() => setEvidenceOpen(false)}
              className="absolute top-2 right-2 z-10 rounded-md bg-white/90 p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X aria-hidden className="h-4 w-4" />
              <span className="sr-only">Close evidence</span>
            </button>
            {evidenceRoom}
          </div>
        </div>
      ) : null}
    </div>
  );
}
