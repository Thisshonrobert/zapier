export type TriageCase = {
  case_id: string;
  zap_run_id: string;
  stage: number;
  subject_owner_id: number;
  observed_at: string;
  provider_outcome: string | null;
  safe_code: string | null;
  source: "retry_row" | "reconciled_execution";
};

export type TriageDiagnosis = {
  status: "completed" | "abstained";
  diagnosis: {
    taxonomy_id: string;
    summary: string;
    confidence: "low" | "medium" | "high";
    evidence_refs: string[];
    alternate_explanations?: string[];
    missing_evidence: string[];
  };
  proposal: {
    disposition:
      | "replay_candidate"
      | "owner_action_required"
      | "engineering_escalation_required"
      | "insufficient_evidence"
      | "outcome_unknown"
      | "duplicate_or_stale"
      | "resolved_without_replay";
    kind: "wait_then_replay" | "request_manual_fix" | "escalate" | "no_action";
    summary: string;
    reasons: string[];
    evidence_refs: string[];
    runbook_citations: string[];
    preconditions: string[];
    not_before: string | null;
  };
};

export type TriageDisplayState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "blocked" }
  | { kind: "error"; message: string }
  | { kind: "cases"; cases: TriageCase[]; selectedCaseId?: string }
  | { kind: "result"; caseId: string; result: TriageDiagnosis };

/** Bounded application policy vocabulary reported by the backend, never authored by the model. */
export type ReplayReason =
  | "active_lease" | "active_replay" | "approval_expired" | "approval_required"
  | "changed_fingerprint" | "changed_handler" | "cooldown_pending" | "duplicate_or_stale"
  | "engineering_escalation_required" | "insufficient_evidence" | "invalid_inputs" | "invalid_order"
  | "missing_attempt" | "missing_evidence" | "outcome_unknown" | "owner_action_required"
  | "proposal_expired" | "replay_authority_invalid" | "replay_input_identity_unproven"
  | "replay_policy_changed" | "replay_limit" | "resolved_without_replay" | "stale_execution"
  | "ungrounded_candidate" | "unknown_outcome" | "unsafe_attempt" | "unsupported_failure"
  | "unsupported_proposal";

/** Application-computed eligibility, separate from diagnosis advice and from any approval. */
export type ReplayEligibility = {
  status: "eligible" | "blocked" | "no_action" | "unknown";
  reasons: ReplayReason[];
  notBefore: string | null;
  requiresOperatorApproval: boolean;
  candidateGrounded: boolean;
};

export type ReplayRequestHistoryItem = {
  requestId: string;
  approvalId: string;
  proposalId: string;
  investigationId: string;
  proposalVersion: number;
  publication: "queued" | "published";
  execution: "PENDING" | "RESERVED" | "RUNNING" | "SUCCESS" | "FAILED" | "UNKNOWN";
  outcome: "accepted" | "rejected" | "unknown" | "not_attempted" | "pending";
  requestedBy: number;
  approvedBy: number;
  createdAt: string;
  completedAt: string | null;
};

/** Server-reported capability; it replaces the fixed client "replay disabled" copy. */
export type ReplayCapabilities = {
  investigation: boolean;
  replayIntent: boolean;
  replayExecution: boolean;
  releaseReady: boolean;
  labProfile: string | null;
  reasons: string[];
};

export type TriageDecision = "approve" | "reject" | "mark_owner_action_required" |
  "escalate_to_engineering" | "resolve_without_replay";

export type SavedInvestigation = {
  id: string;
  status: string;
  result: TriageDiagnosis | null;
  authority: {
    id: string; version: number; status: string; expiresAt: string;
    reasons: ReplayReason[]; eligibility: ReplayEligibility;
    allowedDecisions: TriageDecision[];
    decision: { id: string; decision: TriageDecision; approvedBy: number } | null;
    replay: { id: string; publication: "queued" | "published";
      execution: "PENDING" | "RESERVED" | "RUNNING" | "SUCCESS" | "FAILED" | "UNKNOWN";
      completedAt: string | null } | null;
    replayHistory: ReplayRequestHistoryItem[];
    replayEnabled: false;
  } | null;
};
