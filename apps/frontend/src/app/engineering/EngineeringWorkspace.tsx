"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeftRight, CheckCircle2, History } from "lucide-react";

import { LoaderOne } from "@/components/ui/loader";
import { Field, Section, btnPrimary, btnSecondary } from "@/mycomponents/app/FormKit";
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

  if (state.kind === "loading") {
    return (
      <div className="grid place-items-center rounded-xl border border-zinc-200 bg-white py-20">
        <LoaderOne />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-3">
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{state.message}</p>
        </div>
        <button className={btnSecondary} onClick={() => setReloadKey((key) => key + 1)}>
          Retry
        </button>
      </div>
    );
  }

  const { history } = state;
  const handoff = handoffCopy(history);
  const inQueue = history.case.workflow.queue === "engineering";
  const allowed = Boolean(capabilities?.isEngineer && inQueue);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-900">
              {history.case.safe_code ?? "Unclassified failure"}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {history.case.stage === 0 ? "Trigger" : `Action ${history.case.stage}`} · observed{" "}
              {new Date(history.case.observed_at).toLocaleString()}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
            {queueLabels[history.case.workflow.queue]}
          </span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          <div className="flex justify-between gap-3 border-b border-zinc-100 pb-1">
            <dt className="text-zinc-500">Provider outcome</dt>
            <dd className="font-medium text-zinc-800">{history.case.provider_outcome ?? "not recorded"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-zinc-100 pb-1">
            <dt className="text-zinc-500">Evidence source</dt>
            <dd className="font-medium text-zinc-800">
              {history.case.source === "reconciled_execution" ? "Reconciled execution" : "Failure row"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-zinc-100 pb-1">
            <dt className="text-zinc-500">Subject owner</dt>
            <dd className="font-mono text-zinc-700">{history.case.subject_owner_id}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-zinc-100 pb-1">
            <dt className="text-zinc-500">Assigned engineer</dt>
            <dd className="font-mono text-zinc-700">
              {history.case.workflow.assignedEngineerId ?? "unassigned"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-zinc-100 pb-1 sm:col-span-2">
            <dt className="text-zinc-500">Case</dt>
            <dd className="truncate font-mono text-zinc-700" title={history.case.case_id}>
              {history.case.case_id}
            </dd>
          </div>
        </dl>

        <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">{handoff.message}</p>
      </section>

      <Section title="Why support escalated this" description="The reason the support operator recorded.">
        <p className="text-sm text-zinc-800">
          {history.case.workflow.escalationReason ?? "No escalation reason was recorded."}
        </p>
      </Section>

      {history.case.workflow.customerInstructions ? (
        <Section title="Customer-safe instructions already published" description="What the owner was asked to do.">
          <p className="text-sm text-zinc-800">{history.case.workflow.customerInstructions.instructions}</p>
        </Section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-[#FF4F00]" />
          <h3 className="text-sm font-semibold text-zinc-900">Handoff history</h3>
        </div>
        {history.events.length === 0 ? (
          <p className="text-sm text-zinc-600">No workflow events are recorded for this case.</p>
        ) : (
          <ol className="space-y-3">
            {history.events.map((event) => (
              <li key={event.id} className="border-l-2 border-zinc-200 pl-3">
                <p className="text-sm font-medium text-zinc-900">
                  {workflowActionLabels[event.action] ?? event.action}
                </p>
                <p className="text-xs text-zinc-500">
                  {queueLabels[event.fromQueue]} → {queueLabels[event.toQueue]} · actor {event.actorId} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
                {event.notes ? <p className="mt-1 text-xs text-zinc-700">{event.notes}</p> : null}
              </li>
            ))}
          </ol>
        )}
        {history.case.workflow.findings ? (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
            <span className="font-medium">Recorded findings: </span>
            {history.case.workflow.findings}
          </div>
        ) : null}
      </section>

      {allowed ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[#FF4F00]" />
            <h3 className="text-sm font-semibold text-zinc-900">Return findings to support</h3>
          </div>
          <p className="mb-4 text-xs text-zinc-500">
            Responsibility moves back to the support queue. Replay approval and dispatch stay with
            support operators; this workspace cannot request or execute a replay.
          </p>

          {notice ? (
            <div
              role={notice.tone === "error" ? "alert" : "status"}
              className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
                notice.tone === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {notice.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
              {notice.message}
            </div>
          ) : null}

          <div className="space-y-4">
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
            <button
              className={btnPrimary}
              disabled={!canSubmitFindings(findings, pending)}
              onClick={() => void submitFindings(history)}
            >
              {pending ? "Working…" : "Return findings to support"}
            </button>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <h4 className="text-sm font-semibold text-zinc-900">Resolve with an explanation</h4>
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
        </section>
      ) : (
        <Section title="No engineering action available">
          <p className="text-sm text-zinc-600">
            {inQueue
              ? "Your engineering access was revoked or is not active, so this case is read-only for you."
              : "This case is no longer routed to engineering, so responsibility sits elsewhere."}
          </p>
        </Section>
      )}
    </div>
  );
}
