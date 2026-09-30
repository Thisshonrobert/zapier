export type ReplayPolicyFacts = {
  disposition: string;
  kind: string;
  taxonomyId: string;
  source: string;
  provenance: string;
  evidenceComplete: boolean;
  provider: string | null;
  phase: string | null;
  safeCode: string | null;
  providerStatus: number | null;
  providerOutcome: string | null;
  attempts: readonly {
    outcome: string;
    provider: string | null;
    phase: string | null;
    status: number | null;
    retryAfterSeconds: number | null;
    completedAt: string | null;
  }[];
  historyTruncated: boolean;
  executionStatus: string | null;
  leaseUntil: string | null;
  orderValid: boolean;
  predecessorsSuccessful: boolean;
  incompatibleSuccessor: boolean;
  activeReplay: boolean;
  previousReplayCount: number;
  inputValid: boolean;
  actionFingerprint: string | null;
  requestFingerprint: string | null;
  currentActionFingerprint: string | null;
  currentRequestFingerprint: string | null;
  handlerVersion: string | null;
  currentHandlerVersion: string | null;
};

export type ReplayPolicyResult = {
  status: "blocked" | "requires_approval" | "no_action";
  reasons: string[];
  notBefore: string | null;
  actionFingerprint: string | null;
  requestFingerprint: string | null;
  handlerVersion: string | null;
};

export function evaluateReplayPolicy(facts: ReplayPolicyFacts, now = new Date()): ReplayPolicyResult {
  const result: ReplayPolicyResult = {
    status: "blocked",
    reasons: [],
    notBefore: null,
    actionFingerprint: facts.actionFingerprint,
    requestFingerprint: facts.requestFingerprint,
    handlerVersion: facts.handlerVersion,
  };
  if (facts.disposition !== "replay_candidate") {
    result.status = ["owner_action_required", "engineering_escalation_required", "resolved_without_replay"]
      .includes(facts.disposition) ? "no_action" : "blocked";
    result.reasons = [facts.disposition];
    return result;
  }

  const reasons = result.reasons;
  if (facts.kind !== "wait_then_replay" || facts.taxonomyId !== "F01") reasons.push("unsupported_proposal");
  if (facts.source !== "retry_row" || facts.provenance !== "captured" || !facts.evidenceComplete || facts.historyTruncated)
    reasons.push("missing_evidence");
  if (facts.providerOutcome === "unknown" || facts.attempts.some((attempt) => attempt.outcome === "unknown"))
    reasons.push("unknown_outcome");
  if (facts.provider !== "telegram" || facts.phase !== "send" || facts.safeCode !== "telegram_http_429" ||
      facts.providerStatus !== 429 || facts.providerOutcome !== "rejected") reasons.push("unsupported_failure");
  if (facts.attempts.length === 0) reasons.push("missing_attempt");
  if (facts.attempts.some((attempt) =>
    attempt.outcome !== "rejected" || attempt.provider !== "telegram" || attempt.phase !== "send" ||
    attempt.status !== 429 || !Number.isInteger(attempt.retryAfterSeconds) ||
    (attempt.retryAfterSeconds ?? 0) < 1 || (attempt.retryAfterSeconds ?? 0) > 86_400 ||
    !attempt.completedAt || !Number.isFinite(Date.parse(attempt.completedAt)))) reasons.push("unsafe_attempt");
  if (facts.executionStatus !== "FAILED") reasons.push("stale_execution");
  if (facts.leaseUntil !== null) reasons.push("active_lease");
  if (!facts.orderValid || !facts.predecessorsSuccessful || facts.incompatibleSuccessor) reasons.push("invalid_order");
  if (facts.activeReplay) reasons.push("active_replay");
  if (facts.previousReplayCount !== 0) reasons.push("replay_limit");
  if (!facts.inputValid) reasons.push("invalid_inputs");
  if (!facts.actionFingerprint || !facts.requestFingerprint ||
      facts.actionFingerprint !== facts.currentActionFingerprint ||
      facts.requestFingerprint !== facts.currentRequestFingerprint) reasons.push("changed_fingerprint");
  if (!facts.handlerVersion || facts.handlerVersion !== facts.currentHandlerVersion) reasons.push("changed_handler");
  if (reasons.length) return result;

  const notBefore = Math.max(...facts.attempts.map((attempt) =>
    Date.parse(attempt.completedAt!) + attempt.retryAfterSeconds! * 1_000));
  result.notBefore = new Date(notBefore).toISOString();
  if (now.getTime() < notBefore) reasons.push("cooldown_pending");
  else result.status = "requires_approval";
  return result;
}
