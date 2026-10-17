"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, FileSearch, ListTree, ShieldAlert, X } from "lucide-react";

import { PaneNotice, PaneLoading, Section, Chip } from "./Shell";
import { ReasonList } from "./Marks";
import {
  humanizeCode,
  providerOutcomeLabel,
  sourceLabel,
  timestampLabel,
} from "@/lib/support-copy";
import type { SupportEvidenceState } from "@/hooks/useSupportEvidence";
import type { ReplayRequestHistoryItem, SavedInvestigation, TriageDiagnosis } from "@/types/triage";

/**
 * The evidence room: the right pane's tabs, shared by the operator workbench and the
 * engineering workspace. Every tab is either the fact the backend recorded, or a named reason
 * it could not be read. Nothing is inferred to fill a hole.
 */

const TABS = [
  { id: "observed", label: "Observed", icon: FileSearch },
  { id: "execution", label: "Execution", icon: ListTree },
  { id: "inputs", label: "Inputs", icon: ShieldAlert },
  { id: "runbooks", label: "Runbooks", icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** The tab a caller wants the room opened on. */
export type EvidenceTabId = TabId;

export function EvidenceRoom({
  caseId,
  state,
  onReload,
  onClose,
  saved,
  diagnosis,
  initialTab = "observed",
}: {
  caseId: string | null;
  state: SupportEvidenceState;
  onReload: () => void;
  /** Present only in the narrow-screen drawer, where the room must be dismissible. */
  onClose?: () => void;
  saved: SavedInvestigation | null;
  diagnosis: TriageDiagnosis | null;
  /** Lets a caller or a test open the room on a specific tab. */
  initialTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white" data-evidence-room="">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-zinc-200 px-2">
        <div role="tablist" aria-label="Case evidence" className="flex min-w-0 flex-1 items-center gap-0.5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                id={`evidence-tab-${id}`}
                aria-selected={active}
                aria-controls={`evidence-panel-${id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  const index = TABS.findIndex((entry) => entry.id === tab);
                  const next = event.key === "ArrowRight" ? (index + 1) % TABS.length
                    : event.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  setTab(TABS[next]!.id);
                  document.getElementById(`evidence-tab-${TABS[next]!.id}`)?.focus();
                }}
                className={`flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                }`}
              >
                <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X aria-hidden className="h-4 w-4" />
            <span className="sr-only">Close evidence</span>
          </button>
        ) : null}
      </div>

      <div
        role="tabpanel"
        id={`evidence-panel-${tab}`}
        aria-labelledby={`evidence-tab-${tab}`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#FF4F00]"
      >
        {!caseId ? (
          <PaneNotice
            icon={FileSearch}
            title="No case selected"
            detail="Select a case to read its failure, attempt ledger and input validation."
          />
        ) : state.kind === "idle" || state.kind === "loading" ? (
          <PaneLoading label="Reading case evidence…" />
        ) : state.kind === "denied" ? (
          <PaneNotice
            tone="alert"
            icon={AlertTriangle}
            title="Evidence access denied"
            detail={`${state.message} Reloading will not change this; the permission is checked on every read.`}
          />
        ) : (
          <>
            {state.evidence.failureContext.unavailable.length ||
            state.evidence.execution.unavailable.length ||
            state.evidence.validation.unavailable.length ? (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                Some evidence could not be read:{" "}
                <span className="font-mono">
                  {[...new Set([
                    ...state.evidence.failureContext.unavailable,
                    ...state.evidence.execution.unavailable,
                    ...state.evidence.validation.unavailable,
                  ])].join(", ")}
                </span>
              </div>
            ) : null}

            {tab === "observed" ? <ObservedTab state={state} /> : null}
            {tab === "execution" ? <ExecutionTab state={state} /> : null}
            {tab === "inputs" ? <InputsTab state={state} /> : null}
            {tab === "runbooks" ? <RunbooksTab saved={saved} diagnosis={diagnosis} caseId={caseId} /> : null}

            <div className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] text-zinc-500">
              <span>
                {state.evidence.failureContext.data?.content_hash
                  ? `Content hash ${state.evidence.failureContext.data.content_hash.slice(0, 12)}…`
                  : "No content hash was recorded."}
              </span>
              <button type="button" onClick={onReload} className="font-medium text-zinc-600 underline underline-offset-2">
                Re-read evidence
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type ReadyProps = { state: Extract<SupportEvidenceState, { kind: "ready" }> };

function ObservedTab({ state }: ReadyProps) {
  const envelope = state.evidence.failureContext;
  if (!envelope.data)
    return (
      <PaneNotice
        icon={AlertTriangle}
        title="Failure evidence unavailable"
        detail={`The failure context could not be read (${envelope.unavailable.join(", ") || "no reason reported"}). No observed facts are shown rather than an inferred version of them.`}
      />
    );
  const { facts } = envelope.data;
  const columns = [
    ["Source", sourceLabel(facts.source_kind)],
    ["Step handler", facts.current_action_type ?? "not recorded"],
    ["Provider", facts.retry.provider ?? "not recorded"],
    ["Stage phase", facts.retry.phase ?? "not recorded"],
    ["Provider outcome", providerOutcomeLabel(facts.retry.provider_outcome)],
    ["Provider status", facts.retry.provider_status ? String(facts.retry.provider_status) : "not recorded"],
    ["Safe code", facts.retry.safe_code ?? "not recorded"],
    ["Retry after", facts.retry.retry_after_seconds ? `${facts.retry.retry_after_seconds}s` : "not recorded"],
    ["Needs a human", facts.retry.requires_human ? "yes" : "no"],
    ["Observed", timestampLabel(envelope.data.observed_at)],
  ] as const;

  return (
    <>
      <Section
        title="Observed facts"
        description="Read from the stored failure evidence. Nothing here is model output."
        id="observed-facts"
      >
        <dl>
          {columns.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0">
              <dt className="shrink-0 text-xs text-zinc-500">{label}</dt>
              <dd className="min-w-0 text-right text-xs font-medium break-words text-zinc-800">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[11px] text-zinc-500">
          {envelope.data.complete
            ? "The evidence contract reports this capture as complete."
            : "The evidence contract reports this capture as incomplete; the missing facts are named below."}
        </p>
      </Section>
      {facts.retry.final_error ? (
        <Section title="Recorded final error" description="The bounded error the worker stored.">
          <p className="rounded-md bg-zinc-50 p-2.5 font-mono text-[11px] break-words text-zinc-700">
            {facts.retry.final_error}
          </p>
        </Section>
      ) : null}
      <Section title="Captured structure" description="Field paths and types, never raw values.">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>action metadata {facts.action_metadata.paths.length}</Chip>
          <Chip>payload {facts.payload.paths.length}</Chip>
          {facts.action_metadata.truncated || facts.payload.truncated ? <Chip tone="accent">truncated</Chip> : null}
        </div>
        {facts.action_metadata.paths.length + facts.payload.paths.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">No structure paths were captured for this case.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {[...facts.action_metadata.paths, ...facts.payload.paths].slice(0, 24).map((entry, index) => (
              <li key={`${entry.path}-${index}`} className="flex items-baseline justify-between gap-3 text-[11px]">
                <code className="truncate font-mono text-zinc-700">{entry.path}</code>
                <span className="shrink-0 text-zinc-400">{entry.type}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function ExecutionTab({ state }: ReadyProps) {
  const envelope = state.evidence.execution;
  if (!envelope.data)
    return (
      <PaneNotice
        icon={AlertTriangle}
        title="Execution evidence unavailable"
        detail={`The attempt ledger could not be read (${envelope.unavailable.join(", ") || "no reason reported"}). A missing ledger is not evidence that nothing ran.`}
      />
    );
  const { facts } = envelope.data;
  const current = facts.current_execution;
  return (
    <>
      <Section
        title="Current execution"
        description="The attempt the worker is holding for this case."
        actions={<Chip tone={facts.provenance === "captured" ? "accent" : "neutral"}>{facts.provenance.replace("_", " ")}</Chip>}
        id="current-execution"
      >
        {current ? (
          <dl>
            {[
              ["Status", current.status],
              ["Provider outcome", providerOutcomeLabel(current.provider_outcome)],
              ["Lease until", timestampLabel(current.lease_until)],
              ["Completed", timestampLabel(current.completed_at)],
              ["Needs a human", current.requires_human ? "yes" : "no"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0">
                <dt className="shrink-0 text-xs text-zinc-500">{label}</dt>
                <dd className="min-w-0 text-right text-xs font-medium break-words text-zinc-800">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-zinc-500">
            No execution row is recorded for this case. It was reported from a retry row instead.
          </p>
        )}
      </Section>

      <Section
        title="Attempt ledger"
        description="Every recorded attempt, oldest first, with its own provider result."
        actions={<Chip>{facts.attempts.length}</Chip>}
        id="attempt-ledger"
      >
        {facts.attempts.length === 0 ? (
          <p className="text-xs text-zinc-500">No attempts were recorded for this case.</p>
        ) : (
          <ol className="space-y-2">
            {facts.attempts.map((attempt) => (
              <li key={`${attempt.attempt_number}-${attempt.started_at ?? "unknown"}`} className="rounded-md border border-zinc-200 p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900">Attempt {attempt.attempt_number}</span>
                  <span className="font-mono text-[11px] text-zinc-500">{attempt.provenance.replace("_", " ")}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-700">{providerOutcomeLabel(attempt.provider_outcome)}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {humanizeCode(attempt.status)}
                  {attempt.phase ? ` · phase ${attempt.phase}` : ""}
                  {attempt.provider_status ? ` · HTTP ${attempt.provider_status}` : ""}
                  {attempt.safe_code ? ` · ${attempt.safe_code}` : ""}
                  {attempt.retry_after_seconds ? ` · retry after ${attempt.retry_after_seconds}s` : ""}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  {timestampLabel(attempt.started_at)} → {timestampLabel(attempt.completed_at)}
                </p>
              </li>
            ))}
          </ol>
        )}
        {facts.history_truncated ? (
          <p className="mt-2 text-[11px] text-amber-800">
            The ledger is partial: at most {facts.history_limit} attempts are returned.
          </p>
        ) : null}
      </Section>

      <Section title="Order and predecessors" description="Whether the earlier stages actually completed first." id="ordering">
        <p className="text-xs text-zinc-700">
          Ordering is <span className="font-semibold">{facts.ordering.status}</span>
          {facts.ordering.status === "invalid"
            ? ` · missing predecessor stages ${facts.ordering.missing_predecessor_stages.join(", ") || "unnamed"}`
            : ""}
        </p>
        {facts.predecessors.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">No predecessor executions are recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {facts.predecessors.map((entry) => (
              <li key={entry.stage} className="flex items-baseline justify-between gap-3 text-[11px]">
                <span className="text-zinc-700">Stage {entry.stage}</span>
                <span className="text-zinc-500">
                  {humanizeCode(entry.status)}
                  {entry.provider_outcome ? ` · ${entry.provider_outcome}` : ""} · {timestampLabel(entry.completed_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function InputsTab({ state }: ReadyProps) {
  const envelope = state.evidence.validation;
  if (!envelope.data)
    return (
      <PaneNotice
        icon={AlertTriangle}
        title="Input validation unavailable"
        detail={`The dry-run validator could not be read (${envelope.unavailable.join(", ") || "no reason reported"}). Missing-field claims are not shown without it.`}
      />
    );
  const { facts } = envelope.data;
  return (
    <>
      <Section
        title="Validation result"
        description="What the dry-run validator observed, using the same rules the worker applies."
        actions={<Chip tone={facts.validation_status === "valid" ? "neutral" : "accent"}>{facts.validation_status}</Chip>}
        id="validation-result"
      >
        <dl>
          {[
            ["Action type", facts.action_type ?? "not recorded"],
            ["Handler supported", facts.supported ? "yes" : "no"],
            ["Observed", timestampLabel(envelope.data.observed_at)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0">
              <dt className="shrink-0 text-xs text-zinc-500">{label}</dt>
              <dd className="min-w-0 text-right text-xs font-medium break-words text-zinc-800">{value}</dd>
            </div>
          ))}
        </dl>
        {!facts.supported ? (
          <p className="mt-2 text-xs text-amber-800">
            This step handler is not supported by the repair editor, so a missing-field repair cannot be offered.
          </p>
        ) : null}
      </Section>

      <Section title="Missing required fields" description="Exact field names, not paraphrases." id="missing-fields">
        {facts.missing_required_fields.length === 0 ? (
          <p className="text-xs text-zinc-500">No required field was reported missing.</p>
        ) : (
          <ul className="flex flex-wrap gap-1">
            {facts.missing_required_fields.map((field) => (
              <li key={field}>
                <code className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] text-amber-900 ring-1 ring-amber-200">
                  {field}
                </code>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {facts.invalid_field_types.length || facts.missing_template_paths.length ? (
        <Section title="Type and template problems" id="type-problems">
          <ul className="space-y-1 text-xs text-zinc-700">
            {facts.invalid_field_types.map((entry) => (
              <li key={`type-${entry.field}`}>
                <code className="font-mono">{entry.field}</code> expected {entry.expected}, received {entry.actual}
              </li>
            ))}
            {facts.missing_template_paths.map((path) => (
              <li key={`template-${path}`}>
                Template path <code className="font-mono">{path}</code> resolved to nothing
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Credentials" description="Presence only. Values never reach this view." id="credentials">
        {facts.credential_presence.length === 0 ? (
          <p className="text-xs text-zinc-500">No credential field was inspected for this step.</p>
        ) : (
          <ul className="space-y-1">
            {facts.credential_presence.map((entry) => (
              <li key={entry.field} className="flex items-baseline justify-between gap-3 text-xs">
                <code className="font-mono text-zinc-700">{entry.field}</code>
                <span className={entry.present ? "text-zinc-600" : "font-medium text-amber-800"}>
                  {entry.present ? "present" : "absent"} · {entry.source.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Blocked reasons" description="Why the validator refused the inputs." id="blocked-reasons">
        <ReasonList reasons={facts.blocked_reasons} empty="No blocking reason was reported." />
        {facts.input_fingerprint ? (
          <p className="mt-2 text-[11px] text-zinc-500">
            Input fingerprint <code className="font-mono">{facts.input_fingerprint.slice(0, 16)}…</code>
          </p>
        ) : null}
      </Section>
    </>
  );
}

function RunbooksTab({
  saved,
  diagnosis,
  caseId,
}: {
  saved: SavedInvestigation | null;
  diagnosis: TriageDiagnosis | null;
  caseId: string;
}) {
  const citations = diagnosis?.proposal.runbook_citations ?? [];
  const history: ReplayRequestHistoryItem[] = saved?.authority?.replayHistory ?? [];
  return (
    <>
      <Section
        title="Cited runbook excerpts"
        description="Versioned sections the advisory diagnosis retrieved. A citation is a reference, not a guarantee."
        id="citations"
      >
        {citations.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No runbook section is cited yet. Run an investigation for this case to retrieve the current guidance.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {citations.map((citation) => (
              <li key={citation}>
                <code className="block rounded-md bg-zinc-50 p-2 font-mono text-[11px] break-words text-zinc-700">
                  {citation}
                </code>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Missing evidence reported by the diagnosis"
        description="What the diagnosis could not see. Absence is reported, never filled in."
        id="missing-evidence"
      >
        {!diagnosis || diagnosis.diagnosis.missing_evidence.length === 0 ? (
          <p className="text-xs text-zinc-500">
            {diagnosis ? "The diagnosis reported no missing evidence." : "No diagnosis has been produced yet."}
          </p>
        ) : (
          <ReasonList reasons={diagnosis.diagnosis.missing_evidence} />
        )}
      </Section>

      <Section
        title="Replay requests for this case"
        description="Across every investigation, with the proposal that authorized each request."
        id="evidence-replay-history"
      >
        {history.length === 0 ? (
          <p className="text-xs text-zinc-500">No replay request has been recorded for case {caseId}.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((item) => (
              <li key={item.requestId} className="rounded-md border border-zinc-200 p-2.5 text-[11px]">
                <p className="font-medium text-zinc-800">
                  {item.publication === "published" ? "Published" : "Queued"} · {item.execution} · provider{" "}
                  {item.outcome}
                </p>
                <p className="mt-1 text-zinc-500">
                  Requested by operator {item.requestedBy} · approved by {item.approvedBy} ·{" "}
                  {timestampLabel(item.createdAt)}
                </p>
                <p className="mt-0.5 font-mono break-all text-zinc-400">
                  proposal {item.proposalId} v{item.proposalVersion} · investigation {item.investigationId}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
