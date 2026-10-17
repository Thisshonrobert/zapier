/**
 * Shared vocabulary for the three support surfaces (`/triage`, `/failures`,
 * `/engineering`). These are presentation types only: every value here is derived from a
 * contract the backend already owns, so nothing in this file can widen what a surface knows.
 */

/** Semantic tone of a state mark. Tone carries meaning; it is never decorative. */
export type MarkTone =
  | "neutral"
  | "waiting"
  | "submitted"
  | "engineering"
  | "accepted"
  | "denied"
  | "active";

/**
 * One row in any support index. The owner and engineering projections carry a Zap name and
 * step label; the operator case projection does not, so those fields stay optional and the
 * row falls back to the readable failure summary it does have.
 */
export type SupportTicket = {
  caseId: string;
  /** Zap name when the projection knows it. */
  zapName?: string;
  /** Step label when the projection knows it, e.g. "Email (action 1)". */
  stepLabel?: string;
  /** Fallback identity line: stage plus what the provider recorded. */
  summary: string;
  /** The one state label this row is allowed to claim. */
  status: string;
  tone: MarkTone;
  observedAt: string;
  /** Privileged responsibility line; owners never see another owner's id. */
  ownerLabel?: string;
  /** Bounded application error code, shown as secondary detail. */
  safeCode?: string | null;
  /** Keyboard/roving-focus support. */
  tabIndex?: number;
  /** Stable DOM id for the row, so focus can be restored after a keyboard move. */
  id?: string;
};

/** A single observed fact: a label and the value the backend actually recorded. */
export type EvidenceFact = { label: string; value: string; mono?: boolean };
