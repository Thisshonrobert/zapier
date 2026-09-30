import { describe, expect, test } from "bun:test";

import { buildReplayPolicyFacts } from "../services/replay-policy-facts.ts";

const hash = "a".repeat(64);
const source = { case_id: "11111111-1111-4111-8111-111111111111",
  zap_run_id: "22222222-2222-4222-8222-222222222222", stage: 0 };
const saved = {
  failureContext: { source_ref: source, content_hash: hash, complete: true,
    facts: { source_kind: "retry_row", retry: { provider: "telegram", phase: "send",
      safe_code: "telegram_http_429", provider_status: 429, provider_outcome: "rejected" } } },
  executionEvidence: { source_ref: source, content_hash: hash, complete: true,
    facts: { provenance: "captured", current_execution: { status: "FAILED", lease_until: null,
      action_fingerprint: hash, request_fingerprint: hash, provider_outcome: "rejected" },
      attempts: [{ provider: "telegram", phase: "send", provider_outcome: "rejected",
        provider_status: 429, retry_after_seconds: 30, completed_at: "2026-09-28T00:00:00Z" }],
      history_truncated: false, ordering: { status: "valid" }, predecessors: [] } },
  inputValidation: { source_ref: source, content_hash: hash, complete: true,
    facts: { validation_status: "valid", supported: true } },
};
const current = structuredClone(saved);
const config = { actionFingerprint: hash, requestFingerprint: hash,
  handlerVersion: "worker-v1", currentHandlerVersion: "worker-v1", incompatibleSuccessor: false };

describe("Phase 8 policy evidence mapping", () => {
  test("uses current source hashes and handler identity before requiring approval", () => {
    const facts = buildReplayPolicyFacts({ disposition: "replay_candidate", kind: "wait_then_replay",
      taxonomyId: "F01", saved, current, config } as never);
    expect(facts.evidenceComplete).toBe(true);
    expect(facts.handlerVersion).toBe("worker-v1");
    expect(facts.predecessorsSuccessful).toBe(true);
  });

  test("fails closed when a saved source or deployed handler changed", () => {
    const changed = structuredClone(current);
    changed.executionEvidence.content_hash = "b".repeat(64);
    const facts = buildReplayPolicyFacts({ disposition: "replay_candidate", kind: "wait_then_replay",
      taxonomyId: "F01", saved, current: changed,
      config: { ...config, currentHandlerVersion: "worker-v2" } } as never);
    expect(facts.evidenceComplete).toBe(false);
    expect(facts.handlerVersion).not.toBe(facts.currentHandlerVersion);
  });
});
