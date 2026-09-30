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
