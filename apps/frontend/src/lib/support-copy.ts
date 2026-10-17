import type { MarkTone } from "../types/support";

/**
 * Copy helpers for the support surfaces. Every label here states only what the backend
 * recorded: a provider outcome is never presented as confirmed end-user delivery, and an
 * absent value is reported as absent rather than smoothed into something reassuring.
 */

const CODE_WORDS: Record<string, string> = { http_429: "HTTP 429" };

/** Bounded error codes are the backend's vocabulary; only the separators are ours. */
export function humanizeCode(code: string) {
  return code.split("_").map((part) => CODE_WORDS[part] ?? part).join(" ").replace(/^./, (c) => c.toUpperCase());
}

export function stageLabel(stage: number) {
  return stage === 0 ? "Trigger" : `Action ${stage}`;
}

/** Recorded provider result. Acceptance is the provider taking the request, not delivery. */
export function providerOutcomeLabel(outcome: string | null | undefined) {
  if (!outcome) return "No provider outcome recorded";
  const labels: Record<string, string> = {
    accepted: "Provider accepted the request (delivery is not confirmed)",
    rejected: "Provider rejected the request",
    not_attempted: "Provider was never called",
    unknown: "Provider outcome unknown",
  };
  return labels[outcome] ?? `${humanizeCode(outcome)} (recorded provider outcome)`;
}

export function sourceLabel(source: string | null | undefined) {
  if (source === "reconciled_execution") return "Reconciled execution";
  if (source === "retry_row") return "Failure row";
  return "Evidence source not recorded";
}

/** The same fact in a case header, where the full sentence would displace the identity line. */
export function providerOutcomeShort(outcome: string | null | undefined) {
  if (!outcome) return "not recorded";
  const short: Record<string, string> = {
    accepted: "accepted (delivery not confirmed)",
    rejected: "rejected",
    not_attempted: "never called",
    unknown: "unknown",
  };
  return short[outcome] ?? outcome;
}

/** One line for an operator index row: what failed, at which step. */
export function caseSummary(caseItem: { stage: number; provider_outcome: string | null; safe_code: string | null }) {
  const parts = [stageLabel(caseItem.stage)];
  if (caseItem.safe_code) parts.push(caseItem.safe_code);
  else if (caseItem.provider_outcome) parts.push(caseItem.provider_outcome);
  else parts.push("no provider outcome");
  return parts.join(" · ");
}

const QUEUE_COPY: Record<string, { label: string; tone: MarkTone }> = {
  support: { label: "With support", tone: "neutral" },
  owner: { label: "Needs owner fix", tone: "waiting" },
  engineering: { label: "With engineering", tone: "engineering" },
  resolved: { label: "Resolved", tone: "accepted" },
};

const STATUS_COPY: Record<string, { label: string; tone: MarkTone }> = {
  needing_support: { label: "With support", tone: "neutral" },
  awaiting_owner: { label: "Needs owner fix", tone: "waiting" },
  repair_submitted: { label: "Repair awaiting review", tone: "submitted" },
  escalated: { label: "With engineering", tone: "engineering" },
  findings_returned: { label: "Findings returned", tone: "waiting" },
  resolved: { label: "Resolved", tone: "accepted" },
};

/** Workflow state as a label plus the tone that carries its meaning. */
export function workflowMark(status: string | null | undefined, queue?: string | null) {
  return STATUS_COPY[status ?? ""] ?? QUEUE_COPY[queue ?? ""] ??
    { label: status ? humanizeCode(status) : "Responsibility not recorded", tone: "neutral" as MarkTone };
}

/**
 * The same workflow state from the owner's side of the handoff. "With support" and "Needs your
 * fix" describe one queue position to two different readers, so the owner copy is its own
 * mapping rather than a translation of the support copy.
 */
export function ownerWorkflowMark(status: string | null | undefined) {
  const marks: Record<string, { label: string; tone: MarkTone }> = {
    needing_support: { label: "With support", tone: "neutral" },
    awaiting_owner: { label: "Needs your fix", tone: "waiting" },
    repair_submitted: { label: "Submitted", tone: "submitted" },
    escalated: { label: "With engineering", tone: "engineering" },
    findings_returned: { label: "Under review", tone: "waiting" },
    resolved: { label: "Resolved", tone: "accepted" },
  };
  return marks[status ?? ""] ?? { label: status ? humanizeCode(status) : "Not started", tone: "neutral" as MarkTone };
}

/**
 * Investigation lifecycle status. These are the milestone labels the streaming endpoint
 * reports; anything unrecognised is shown verbatim rather than guessed at.
 */
export function investigationMark(status: string | null | undefined) {
  const marks: Record<string, { label: string; tone: MarkTone }> = {
    queued: { label: "Queued", tone: "neutral" },
    investigating: { label: "Investigating", tone: "active" },
    proposed: { label: "Diagnosis ready", tone: "submitted" },
    awaiting_approval: { label: "Awaiting approval", tone: "waiting" },
    blocked: { label: "Blocked by policy", tone: "denied" },
    owner_action_required: { label: "Owner action required", tone: "waiting" },
    engineering_escalation_required: { label: "Engineering required", tone: "engineering" },
    resolved_without_replay: { label: "Resolved without replay", tone: "accepted" },
    approved: { label: "Approved", tone: "submitted" },
    rejected: { label: "Rejected", tone: "denied" },
    expired: { label: "Expired", tone: "denied" },
    error: { label: "Investigation failed", tone: "denied" },
  };
  return marks[status ?? ""] ?? { label: status ? humanizeCode(status) : "Not started", tone: "neutral" as MarkTone };
}

/** Replay request publication state, kept separate from execution. */
export function publicationMark(publication: "queued" | "published" | null | undefined) {
  if (publication === "published") return { label: "Published to the queue", tone: "submitted" as MarkTone };
  if (publication === "queued") return { label: "Queued, publication not confirmed", tone: "waiting" as MarkTone };
  return { label: "No publication recorded", tone: "neutral" as MarkTone };
}

export const EXECUTION_LABELS: Record<string, string> = {
  PENDING: "Pending",
  RESERVED: "Reserved by the worker",
  RUNNING: "Running",
  SUCCESS: "Succeeded",
  FAILED: "Failed",
  UNKNOWN: "Unknown and terminal",
};

/** Execution state plus the one caveat the operator must not lose. */
export function executionMark(execution: string | null | undefined) {
  const label = EXECUTION_LABELS[execution ?? ""];
  if (!label) return { label: "No execution recorded", tone: "neutral" as MarkTone };
  const tone: MarkTone =
    execution === "SUCCESS" ? "accepted" : execution === "FAILED" || execution === "UNKNOWN" ? "denied"
      : execution === "RUNNING" ? "active" : "waiting";
  return { label, tone };
}

export function ageLabel(observedAt: string, now = Date.now()) {
  const observed = Date.parse(observedAt);
  if (!Number.isFinite(observed)) return "time not recorded";
  const minutes = Math.max(0, Math.floor((now - observed) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function timestampLabel(value: string | null | undefined) {
  if (!value) return "not recorded";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : "not recorded";
}

/** Counted facts stop at a bounded denominator so one outage cannot blow up the read. */
export function countLabel(items: unknown[] | null | undefined, singular: string, plural = `${singular}s`) {
  const count = items?.length ?? 0;
  return `${count} ${count === 1 ? singular : plural}`;
}
