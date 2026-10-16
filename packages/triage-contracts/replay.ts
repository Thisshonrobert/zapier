import { z } from "zod";

/**
 * Replay reason codes are the application's deterministic policy vocabulary. The model
 * never authors these; they come from `evaluateReplayPolicy`, the request/worker
 * revalidation and the proposal submission, and they are safe to show to a support
 * operator as the explanation of a denial.
 */
export const ReplayReasonSchema = z.enum([
  "active_lease",
  "active_replay",
  "approval_expired",
  "approval_required",
  "changed_fingerprint",
  "changed_handler",
  "cooldown_pending",
  "duplicate_or_stale",
  "engineering_escalation_required",
  "insufficient_evidence",
  "invalid_inputs",
  "invalid_order",
  "missing_attempt",
  "missing_evidence",
  "outcome_unknown",
  "owner_action_required",
  "proposal_expired",
  "replay_authority_invalid",
  "replay_input_identity_unproven",
  "replay_policy_changed",
  "replay_limit",
  "resolved_without_replay",
  "stale_execution",
  "ungrounded_candidate",
  "unknown_outcome",
  "unsafe_attempt",
  "unsupported_failure",
  "unsupported_proposal",
]);
export type ReplayReason = z.infer<typeof ReplayReasonSchema>;

export const REPLAY_DENIAL_FALLBACK: ReplayReason = "missing_evidence";

/** Bounds and de-duplicates raw policy reasons; an unrecognised or oversize code fails closed to a generic denial. */
export function replayReasons(values: readonly string[] | undefined): ReplayReason[] {
  const unique = [...new Set((values ?? []).filter(value => typeof value === "string" && value.length > 0))];
  return unique.slice(0, 16)
    .map(value => ReplayReasonSchema.safeParse(value).success ? value as ReplayReason : REPLAY_DENIAL_FALLBACK);
}

/**
 * A denied policy result always carries at least one bounded reason, so the operator
 * surface can state a concrete denial instead of a fixed "replay disabled" paragraph.
 */
export function replayPolicyDenial(reasons: readonly string[] | undefined) {
  const parsed = replayReasons(reasons);
  return { reasons: parsed.length ? parsed : [REPLAY_DENIAL_FALLBACK] };
}

/**
 * Application-computed eligibility for the case as it exists right now. This is evidence
 * about deterministic policy, never model authority, and it stays separate from the AI's
 * advisory disposition and from any approval decision.
 */
export const ReplayEligibilitySchema = z.object({
  status: z.enum(["eligible", "blocked", "no_action", "unknown"]),
  reasons: z.array(ReplayReasonSchema).max(16),
  notBefore: z.string().nullable(),
  requiresOperatorApproval: z.boolean(),
  candidateGrounded: z.boolean(),
}).strict();
export type ReplayEligibility = z.infer<typeof ReplayEligibilitySchema>;

/**
 * What the server currently permits, reported to the operator surface so a hard-coded
 * client paragraph cannot drift from the deployed switches and release profile.
 */
export const ReplayCapabilitiesSchema = z.object({
  investigation: z.boolean(),
  replayIntent: z.boolean(),
  replayExecution: z.boolean(),
  releaseReady: z.boolean(),
  labProfile: z.string().nullable(),
  reasons: z.array(z.string().min(1).max(64)).max(8),
}).strict();
export type ReplayCapabilities = z.infer<typeof ReplayCapabilitiesSchema>;

export const ReplayCapabilitiesResponseSchema = z.object({
  capabilities: ReplayCapabilitiesSchema,
}).strict();

/**
 * One replay request for the case, listed across investigations. `proposalId` and
 * `investigationId` identify which proposal authorized the request, and `outcome` is the
 * recorded provider result; provider acceptance is not final end-user delivery.
 */
export const ReplayRequestHistoryItemSchema = z.object({
  requestId: z.uuid(),
  approvalId: z.uuid(),
  proposalId: z.uuid(),
  investigationId: z.uuid(),
  proposalVersion: z.number().int().positive(),
  publication: z.enum(["queued", "published"]),
  execution: z.enum(["PENDING", "RESERVED", "RUNNING", "SUCCESS", "FAILED", "UNKNOWN"]),
  outcome: z.enum(["accepted", "rejected", "unknown", "not_attempted", "pending"]),
  requestedBy: z.number().int().positive(),
  approvedBy: z.number().int().positive(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
}).strict();
export type ReplayRequestHistoryItem = z.infer<typeof ReplayRequestHistoryItemSchema>;
