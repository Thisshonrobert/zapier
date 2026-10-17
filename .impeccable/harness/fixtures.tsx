import type { ReplayRequestHistoryItem, SavedInvestigation, TriageCase, TriageDiagnosis } from "@/types/triage";
import type { SupportEvidence } from "@/lib/support-evidence";
import type { EngineeringCase } from "@/types/engineering";
import type { OwnerFailureSummary } from "@/types/owner";

/**
 * Inspection fixture. This is illustrative rendering data for one screenshot pass, not pipeline
 * evidence: the values are chosen to make every required state visible in one render. It is
 * never imported by application code.
 */

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

export const cases: TriageCase[] = [
  {
    case_id: "f0100000-0000-4000-8000-000000000001",
    zap_run_id: "11111111-1111-4111-8111-111111111111",
    stage: 2,
    subject_owner_id: 9,
    observed_at: new Date(Date.now() - 42 * 60_000).toISOString(),
    provider_outcome: "rejected",
    safe_code: "telegram_http_429",
    source: "retry_row",
  },
  {
    case_id: "f0100000-0000-4000-8000-000000000002",
    zap_run_id: "22222222-2222-4222-8222-222222222222",
    stage: 1,
    subject_owner_id: 14,
    observed_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    provider_outcome: "unknown",
    safe_code: "telegram_transport_throw",
    source: "retry_row",
  },
  {
    case_id: "f0100000-0000-4000-8000-000000000003",
    zap_run_id: "33333333-3333-4333-8333-333333333333",
    stage: 1,
    subject_owner_id: 22,
    observed_at: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    provider_outcome: "not_attempted",
    safe_code: "invalid_action_inputs",
    source: "reconciled_execution",
  },
  {
    case_id: "f0100000-0000-4000-8000-000000000004",
    zap_run_id: "44444444-4444-4444-8444-444444444444",
    stage: 0,
    subject_owner_id: 9,
    observed_at: new Date(Date.now() - 4 * 24 * 60 * 60_000).toISOString(),
    provider_outcome: "rejected",
    safe_code: "telegram_http_403",
    source: "retry_row",
  },
];

export const diagnosis: TriageDiagnosis = {
  status: "completed",
  diagnosis: {
    taxonomy_id: "transient_provider_failure",
    summary:
      "The Telegram send stage was rejected with HTTP 429 on the second action. The provider stated a retry delay, and the recorded attempt fingerprint still matches the current handler inputs.",
    confidence: "high",
    evidence_refs: ["failure-context:f0100000", "execution-evidence:f0100000", "attempt:2"],
    alternate_explanations: ["A revoked bot token would produce the same rejection if the destination were also invalid."],
    missing_evidence: ["provider_delivery_receipt"],
  },
  proposal: {
    disposition: "replay_candidate",
    kind: "wait_then_replay",
    summary:
      "Wait for the recorded cooldown, then replay the same fingerprinted request once, unchanged, with operator approval.",
    reasons: [
      "The rejection happened at the send stage, so the provider never accepted the message.",
      "No attempt in the ledger was accepted, so a replay cannot duplicate a delivered message.",
    ],
    evidence_refs: ["failure-context:f0100000", "execution-evidence:f0100000"],
    runbook_citations: ["RB-F01-F02@1.1.0#replay-after-send-stage-rejection", "RB-F01-F02@1.1.0#missing-historical-snapshot"],
    preconditions: ["The original inputs and handler must be unchanged.", "At most one replay for this case."],
    not_before: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
};

const historyItem: ReplayRequestHistoryItem = {
  requestId: "aaaaaaaa-1111-4111-8111-111111111111",
  approvalId: "bbbbbbbb-2222-4222-8222-222222222222",
  proposalId: "cccccccc-3333-4333-8333-333333333333",
  investigationId: "dddddddd-4444-4444-8444-444444444444",
  proposalVersion: 1,
  publication: "published",
  execution: "SUCCESS",
  outcome: "accepted",
  requestedBy: 4,
  approvedBy: 4,
  createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
  completedAt: new Date(Date.now() - 29 * 60_000).toISOString(),
};

export const saved: SavedInvestigation = {
  id: "dddddddd-4444-4444-8444-444444444444",
  status: "proposed",
  result: diagnosis,
  authority: {
    id: "cccccccc-3333-4333-8333-333333333333",
    version: 1,
    status: "requires_approval",
    expiresAt: new Date(Date.now() + 25 * 60_000).toISOString(),
    reasons: [],
    eligibility: {
      status: "eligible",
      reasons: [],
      notBefore: new Date(Date.now() - 5 * 60_000).toISOString(),
      requiresOperatorApproval: true,
      candidateGrounded: true,
    },
    allowedDecisions: ["approve", "reject", "escalate_to_engineering", "mark_owner_action_required"],
    decision: null,
    replay: null,
    replayHistory: [historyItem],
    replayEnabled: false,
  },
};

export const blockedSaved: SavedInvestigation = {
  ...saved,
  id: "eeeeeeee-5555-4555-8555-555555555555",
  authority: {
    ...saved.authority!,
    version: 3,
    status: "blocked",
    reasons: ["replay_limit", "ungrounded_candidate"],
    eligibility: {
      status: "blocked",
      reasons: ["replay_limit", "ungrounded_candidate"],
      notBefore: null,
      requiresOperatorApproval: false,
      candidateGrounded: false,
    },
    allowedDecisions: ["reject", "resolve_without_replay"],
    replay: {
      id: historyItem.requestId,
      publication: "published",
      execution: "UNKNOWN",
      completedAt: new Date(Date.now() - 60_000).toISOString(),
    },
  },
};

export const evidence: SupportEvidence = {
  failureContext: {
    data: {
      observed_at: new Date(Date.now() - 42 * 60_000).toISOString(),
      content_hash: hashA,
      complete: true,
      facts: {
        source_kind: "retry_row",
        current_action_type: "telegram",
        retry: {
          provider: "telegram",
          phase: "send",
          provider_outcome: "rejected",
          safe_code: "telegram_http_429",
          provider_status: 429,
          retry_after_seconds: 30,
          requires_human: false,
          final_error: "Too Many Requests: retry after 30",
        },
        action_metadata: {
          paths: [
            { path: "chatId", type: "string" },
            { path: "message", type: "string" },
            { path: "botToken", type: "credential" },
          ],
          truncated: false,
        },
        payload: {
          paths: [
            { path: "text", type: "string" },
            { path: "parse_mode", type: "string" },
          ],
          truncated: false,
        },
      },
    },
    unavailable: [],
  },
  execution: {
    data: {
      observed_at: new Date(Date.now() - 42 * 60_000).toISOString(),
      content_hash: hashB,
      complete: true,
      facts: {
        provenance: "captured",
        current_execution: {
          status: "FAILED",
          lease_until: null,
          completed_at: new Date(Date.now() - 42 * 60_000).toISOString(),
          provider_outcome: "rejected",
          requires_human: false,
        },
        attempts: [
          {
            attempt_number: 1,
            status: "REJECTED",
            provider: "telegram",
            phase: "send",
            provider_outcome: "rejected",
            safe_code: "telegram_http_429",
            provider_status: 429,
            retry_after_seconds: 30,
            started_at: new Date(Date.now() - 43 * 60_000).toISOString(),
            completed_at: new Date(Date.now() - 42 * 60_000).toISOString(),
            provenance: "captured",
          },
          {
            attempt_number: 2,
            status: "REJECTED",
            provider: "telegram",
            phase: "send",
            provider_outcome: "rejected",
            safe_code: "telegram_http_429",
            provider_status: 429,
            retry_after_seconds: 60,
            started_at: new Date(Date.now() - 41 * 60_000).toISOString(),
            completed_at: new Date(Date.now() - 40 * 60_000).toISOString(),
            provenance: "captured",
          },
        ],
        history_limit: 10,
        history_truncated: false,
        predecessors: [
          { stage: 0, status: "SUCCESS", provider_outcome: "accepted", completed_at: new Date(Date.now() - 44 * 60_000).toISOString() },
          { stage: 1, status: "SUCCESS", provider_outcome: "accepted", completed_at: new Date(Date.now() - 43 * 60_000).toISOString() },
        ],
        ordering: { status: "valid", missing_predecessor_stages: [] },
      },
    },
    unavailable: [],
  },
  validation: {
    data: {
      observed_at: new Date(Date.now() - 5 * 60_000).toISOString(),
      content_hash: hashB,
      complete: true,
      facts: {
        action_type: "telegram",
        validation_status: "valid",
        supported: true,
        missing_required_fields: [],
        invalid_field_types: [],
        missing_template_paths: [],
        credential_presence: [{ field: "botToken", present: true, source: "action_metadata" }],
        blocked_reasons: [],
        input_fingerprint: hashA,
      },
    },
    unavailable: [],
  },
};

export const ownerFailures: OwnerFailureSummary[] = [
  {
    caseId: cases[2]!.case_id,
    zapRunId: cases[2]!.zap_run_id,
    zapId: "55555555-5555-4555-8555-555555555555",
    zapName: "Meeting reminder",
    stage: 1,
    stepLabel: "Email (action 1)",
    observedAt: cases[2]!.observed_at,
    providerOutcome: "not_attempted",
    safeCode: "invalid_action_inputs",
    queue: "owner",
    status: "awaiting_owner",
  },
  {
    caseId: cases[0]!.case_id,
    zapRunId: cases[0]!.zap_run_id,
    zapId: "66666666-6666-4666-8666-666666666666",
    zapName: "Ops alerts",
    stage: 2,
    stepLabel: "Telegram (action 2)",
    observedAt: cases[0]!.observed_at,
    providerOutcome: "rejected",
    safeCode: "telegram_http_429",
    queue: "support",
    status: "needing_support",
  },
  {
    caseId: cases[3]!.case_id,
    zapRunId: cases[3]!.zap_run_id,
    zapId: "77777777-7777-4777-8777-777777777777",
    zapName: "Weekly digest",
    stage: 0,
    stepLabel: "Catch Hook (trigger)",
    observedAt: cases[3]!.observed_at,
    providerOutcome: "rejected",
    safeCode: "telegram_http_403",
    queue: "engineering",
    status: "escalated",
  },
  {
    caseId: cases[1]!.case_id,
    zapRunId: cases[1]!.zap_run_id,
    zapId: "88888888-8888-4888-8888-888888888888",
    zapName: "Invoice chase",
    stage: 1,
    stepLabel: "Telegram (action 1)",
    observedAt: cases[1]!.observed_at,
    providerOutcome: "unknown",
    safeCode: "telegram_transport_throw",
    queue: "resolved",
    status: "resolved",
  },
];

export const engineeringCases: EngineeringCase[] = [
  {
    case_id: cases[1]!.case_id,
    zap_run_id: cases[1]!.zap_run_id,
    stage: 1,
    subject_owner_id: 14,
    observed_at: cases[1]!.observed_at,
    provider_outcome: "unknown",
    safe_code: "telegram_transport_throw",
    source: "retry_row",
    workflow: {
      id: "99999999-9999-4999-8999-999999999999",
      queue: "engineering",
      status: "escalated",
      assignedEngineerId: 42,
      escalationReason:
        "The transport threw after the send had started, so delivery is genuinely unknown. Support cannot decide whether a replay would duplicate a delivered message.",
      customerInstructions: null,
      findings: null,
      resolutionReason: null,
      version: 2,
      createdAt: cases[1]!.observed_at,
      updatedAt: cases[1]!.observed_at,
    },
  },
  {
    case_id: cases[3]!.case_id,
    zap_run_id: cases[3]!.zap_run_id,
    stage: 0,
    subject_owner_id: 9,
    observed_at: cases[3]!.observed_at,
    provider_outcome: "rejected",
    safe_code: "telegram_http_403",
    source: "retry_row",
    workflow: {
      id: "abababab-9999-4999-8999-999999999999",
      queue: "engineering",
      status: "escalated",
      assignedEngineerId: null,
      escalationReason: "Repeated 403 after a destination change. Support needs to know whether the bot was removed from the channel.",
      customerInstructions: {
        targetStep: 0,
        missingFields: ["channelUserName"],
        instructions: "Re-add the bot to the channel before the next run.",
        editorPath: "/zap/44444444-4444-4444-8444-444444444444",
      },
      findings: null,
      resolutionReason: null,
      version: 1,
      createdAt: cases[3]!.observed_at,
      updatedAt: cases[3]!.observed_at,
    },
  },
];
