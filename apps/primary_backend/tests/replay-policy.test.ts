import { describe, expect, test } from "bun:test";

import { evaluateReplayPolicy, type ReplayPolicyFacts } from "../services/replay-policy.ts";

const eligible: ReplayPolicyFacts = {
  disposition: "replay_candidate",
  kind: "wait_then_replay",
  taxonomyId: "F01",
  source: "retry_row",
  provenance: "captured",
  evidenceComplete: true,
  provider: "telegram",
  phase: "send",
  safeCode: "telegram_http_429",
  providerStatus: 429,
  providerOutcome: "rejected",
  attempts: [{ outcome: "rejected", provider: "telegram", phase: "send", status: 429, retryAfterSeconds: 30, completedAt: "2026-09-28T00:00:00.000Z" }],
  historyTruncated: false,
  executionStatus: "FAILED",
  leaseUntil: null,
  orderValid: true,
  predecessorsSuccessful: true,
  incompatibleSuccessor: false,
  activeReplay: false,
  previousReplayCount: 0,
  inputValid: true,
  actionFingerprint: "a".repeat(64),
  requestFingerprint: "b".repeat(64),
  currentActionFingerprint: "a".repeat(64),
  currentRequestFingerprint: "b".repeat(64),
  handlerVersion: "worker-v1",
  currentHandlerVersion: "worker-v1",
};

describe("Phase 8 deterministic replay policy", () => {
  test("the captured F01 rejection needs approval after its cooldown", () => {
    expect(evaluateReplayPolicy(eligible, new Date("2026-09-28T00:00:29.000Z"))).toMatchObject({
      status: "blocked", reasons: ["cooldown_pending"],
    });
    expect(evaluateReplayPolicy(eligible, new Date("2026-09-28T00:00:30.000Z"))).toMatchObject({
      status: "requires_approval", reasons: [], notBefore: "2026-09-28T00:00:30.000Z",
    });
  });

  test.each([
    [{ evidenceComplete: false }, "missing_evidence"],
    [{ attempts: [] }, "missing_attempt"],
    [{ attempts: [{ ...eligible.attempts[0]!, outcome: "unknown" as const }] }, "unknown_outcome"],
    [{ providerOutcome: "unknown" }, "unknown_outcome"],
    [{ currentRequestFingerprint: "c".repeat(64) }, "changed_fingerprint"],
    [{ currentActionFingerprint: "c".repeat(64) }, "changed_fingerprint"],
    [{ currentHandlerVersion: "worker-v2" }, "changed_handler"],
    [{ orderValid: false }, "invalid_order"],
    [{ leaseUntil: "2026-09-28T01:00:00.000Z" }, "active_lease"],
    [{ executionStatus: "SUCCESS" }, "stale_execution"],
    [{ activeReplay: true }, "active_replay"],
    [{ previousReplayCount: 1 }, "replay_limit"],
    [{ source: "reconciled_execution" }, "missing_evidence"],
  ] as const)("blocks unsafe evidence or state %#", (change, reason) => {
    expect(evaluateReplayPolicy({ ...eligible, ...change }, new Date("2026-09-28T01:00:00.000Z"))).toMatchObject({
      status: "blocked", reasons: expect.arrayContaining([reason]),
    });
  });

  test("routes manual repair, engineering escalation and unknown outcomes without replay", () => {
    expect(evaluateReplayPolicy({ ...eligible, disposition: "owner_action_required", kind: "request_manual_fix" }).status)
      .toBe("no_action");
    expect(evaluateReplayPolicy({ ...eligible, disposition: "engineering_escalation_required", kind: "escalate" }).status)
      .toBe("no_action");
    expect(evaluateReplayPolicy({ ...eligible, disposition: "outcome_unknown", kind: "escalate" }).status)
      .toBe("blocked");
  });
});
