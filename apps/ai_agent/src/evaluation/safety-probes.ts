// Offline contract probes. SQL fixtures exercise application gates, not PostgreSQL isolation.
import assert from "node:assert/strict";
import {
  TriageOperatorService,
  TriageOperatorDenied,
  TriageOperatorCaseNotFound,
} from "../../../primary_backend/services/triage-operator.ts";
import {
  TriageEvidenceService,
  TriageCaseNotFound,
} from "../../../primary_backend/services/triage-evidence.ts";
import {
  InvestigationAuthority,
  InvestigationDecisionDenied,
} from "../../../primary_backend/services/investigation-authority.ts";
import {
  evaluateReplayPolicy,
  type ReplayPolicyFacts,
} from "../../../primary_backend/services/replay-policy.ts";

const caseId = "11111111-1111-4111-8111-111111111111";
const investigationId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-09-28T01:00:00.000Z");
type Query = { sql: string; values: unknown[] };
export type SafetyProbe = { id: string; passed: boolean };

export const eligibleReplayFacts: ReplayPolicyFacts = {
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
  attempts: [
    {
      outcome: "rejected",
      provider: "telegram",
      phase: "send",
      status: 429,
      retryAfterSeconds: 30,
      completedAt: "2026-09-28T00:00:00.000Z",
    },
  ],
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

export async function runSafetyProbes(): Promise<SafetyProbe[]> {
  const probes: SafetyProbe[] = [];
  const probe = async (id: string, operation: () => unknown) => {
    try {
      await operation();
      probes.push({ id, passed: true });
    } catch {
      probes.push({ id, passed: false });
    }
  };
  const operatorDb = (permitted = true, failAudit = false) => {
    const audits: Query[] = [];
    const db = {
      async $queryRaw<T>(value: unknown): Promise<T> {
        const query = value as Query;
        if (query.sql.includes('"isSupportOperator"'))
          return [{ isSupportOperator: permitted }] as T;
        return [
          {
            caseId,
            zapRunId: investigationId,
            stage: 0,
            subjectOwnerId: 9,
            observedAt: now,
            providerOutcome: "rejected",
            safeCode: "telegram_http_429",
            evidenceSource: "captured",
          },
        ] as T;
      },
      async $executeRaw(value: unknown) {
        if (failAudit) throw new Error("audit unavailable");
        audits.push(value as Query);
        return 1;
      },
    };
    return { db, audits };
  };
  await probe("subject_owner_cross_tenant", async () => {
    const service = new TriageEvidenceService({
      async $queryRaw<T>(value: unknown): Promise<T> {
        const query = value as Query;
        assert.match(query.sql, /WHERE zap\."userId" =/);
        return (query.values[0] === 9 ? [{ caseId }] : []) as T;
      },
    });
    await service.assertOwnedCase(9, caseId);
    await assert.rejects(
      service.assertOwnedCase(10, caseId),
      TriageCaseNotFound,
    );
    await assert.rejects(
      service.getFailureContext(10, caseId),
      TriageCaseNotFound,
    );
    await assert.rejects(
      service.getExecutionEvidence(10, caseId),
      TriageCaseNotFound,
    );
    await assert.rejects(
      service.validateActionInputs(10, caseId),
      TriageCaseNotFound,
    );
  });
  await probe("support_actor_subject_action_audit", async () => {
    const { db, audits } = operatorDb();
    assert.equal(
      (await new TriageOperatorService(db).resolveCase(4, caseId, "diagnose"))
        .subject_owner_id,
      9,
    );
    assert.deepEqual(audits[0]?.values.slice(1), [
      4,
      9,
      caseId,
      "diagnose",
      "allowed",
    ]);
  });
  await probe("unauthorized_operator", async () => {
    const { db, audits } = operatorDb(false);
    await assert.rejects(
      new TriageOperatorService(db).resolveCase(4, caseId),
      TriageOperatorDenied,
    );
    assert.deepEqual(audits[0]?.values.slice(1), [
      4,
      null,
      caseId,
      "read_case",
      "denied",
    ]);
  });
  await probe("operator_case_mismatch", async () => {
    const { db, audits } = operatorDb();
    const other = "33333333-3333-4333-8333-333333333333";
    await assert.rejects(
      new TriageOperatorService(db).resolveCase(4, other),
      TriageOperatorCaseNotFound,
    );
    assert.deepEqual(audits[0]?.values.slice(1), [
      4,
      null,
      other,
      "read_case",
      "denied",
    ]);
  });
  await probe("operator_audit_fail_closed", async () => {
    await assert.rejects(
      new TriageOperatorService(operatorDb(true, true).db).resolveCase(
        4,
        caseId,
      ),
      /audit unavailable/,
    );
  });

  const decisionInput = {
    proposalId: caseId,
    proposalVersion: 1,
    investigationId,
    caseId,
    subjectOwnerId: 9,
    actorId: 4,
    decisionId: "44444444-4444-4444-8444-444444444444",
    decision: "approve" as const,
  };
  const authorityDb = (
    options: {
      permitted?: boolean;
      owner?: number;
      latest?: number;
      failAudit?: boolean;
    } = {},
  ) => {
    const writes: Query[] = [];
    const committed: Query[] = [];
    const tx = {
      async $queryRaw<T>(value: unknown): Promise<T> {
        const query = value as Query;
        if (query.sql.includes("SELECT version FROM"))
          return [{ version: options.latest ?? 1 }] as T;
        if (query.sql.includes('FROM "TriageProposal"'))
          return [
            {
              id: caseId,
              investigationId,
              caseId,
              subjectOwnerId: 9,
              disposition: "replay_candidate",
              status: "requires_approval",
              version: 1,
              expiresAt: new Date("2026-09-29T00:00:00Z"),
              policy: {},
            },
          ] as T;
        if (query.sql.includes('FROM "User"'))
          return [{ isSupportOperator: options.permitted ?? true }] as T;
        if (query.sql.includes('FROM "ZapRunRetry"'))
          return [{ subjectOwnerId: options.owner ?? 9 }] as T;
        return [] as T;
      },
      async $executeRaw(value: unknown) {
        const query = value as Query;
        if (options.failAudit && query.sql.includes('"TriageAccessAudit"'))
          throw new Error("audit unavailable");
        writes.push(query);
        return 1;
      },
    };
    return {
      writes,
      committed,
      ...tx,
      async $transaction<T>(
        operation: (client: typeof tx) => Promise<T>,
      ): Promise<T> {
        const result = await operation(tx);
        committed.push(...writes);
        return result;
      },
    };
  };
  await probe("approval_records_authority_only", async () => {
    const db = authorityDb();
    await new InvestigationAuthority(db, async () => ({
      status: "requires_approval",
    })).decide(decisionInput, now);
    assert.equal(db.committed.length, 3);
    assert(
      db.committed.some(
        (query) =>
          query.sql.includes('"TriageAccessAudit"') &&
          query.values.includes(4) &&
          query.values.includes(9),
      ),
    );
    assert(
      db.committed.every(
        (query) => !/ReplayRequest|ZapRunExecution/.test(query.sql),
      ),
    );
  });
  for (const [id, options, input, date, reason] of [
    [
      "stale_displayed_proposal",
      {},
      { ...decisionInput, proposalVersion: 2 },
      now,
      "stale proposal version",
    ],
    [
      "superseded_proposal",
      { latest: 2 },
      decisionInput,
      now,
      "stale proposal version",
    ],
    [
      "expired_proposal",
      {},
      decisionInput,
      new Date("2026-09-29T00:00:00Z"),
      "proposal expired",
    ],
    [
      "revoked_decision_operator",
      { permitted: false },
      decisionInput,
      now,
      "operator permission revoked",
    ],
    [
      "decision_subject_mismatch",
      { owner: 10 },
      decisionInput,
      now,
      "case binding changed",
    ],
    [
      "decision_case_mismatch",
      {},
      { ...decisionInput, caseId: investigationId },
      now,
      "proposal binding mismatch",
    ],
  ] as const)
    await probe(id, async () => {
      const db = authorityDb(options);
      await assert.rejects(
        new InvestigationAuthority(db, async () => ({
          status: "requires_approval",
        })).decide(input, date),
        (error: unknown) =>
          error instanceof InvestigationDecisionDenied &&
          error.message === reason,
      );
      assert.equal(db.writes.length, 0);
    });
  await probe("decision_audit_atomic", async () => {
    const db = authorityDb({ failAudit: true });
    await assert.rejects(
      new InvestigationAuthority(db, async () => ({
        status: "requires_approval",
      })).decide(decisionInput, now),
      /audit unavailable/,
    );
    assert.equal(db.committed.length, 0);
  });
  await probe("approval_revalidates_policy", async () => {
    const db = authorityDb();
    await assert.rejects(
      new InvestigationAuthority(db, async () => ({
        status: "blocked",
        reasons: ["changed_fingerprint"],
      })).decide(decisionInput, now),
      /current policy blocks approval/,
    );
    assert.equal(db.writes.length, 0);
  });
  await probe("eligible_replay_requires_approval", () => {
    assert.equal(
      evaluateReplayPolicy(eligibleReplayFacts, now).status,
      "requires_approval",
    );
  });
  const mutations: [string, Partial<ReplayPolicyFacts>, string][] = [
    ["unknown_outcome", { providerOutcome: "unknown" }, "unknown_outcome"],
    [
      "unknown_earlier_attempt",
      {
        attempts: [{ ...eligibleReplayFacts.attempts[0]!, outcome: "unknown" }],
      },
      "unknown_outcome",
    ],
    [
      "changed_destination",
      { currentRequestFingerprint: "c".repeat(64) },
      "changed_fingerprint",
    ],
    [
      "changed_action",
      { currentActionFingerprint: "c".repeat(64) },
      "changed_fingerprint",
    ],
    [
      "changed_handler",
      { currentHandlerVersion: "worker-v2" },
      "changed_handler",
    ],
    ["success_reset", { executionStatus: "SUCCESS" }, "stale_execution"],
    ["unknown_reset", { executionStatus: "UNKNOWN" }, "stale_execution"],
    ["active_lease", { leaseUntil: now.toISOString() }, "active_lease"],
    ["incomplete_history", { historyTruncated: true }, "missing_evidence"],
    ["unsupported_email", { provider: "email" }, "unsupported_failure"],
    ["changed_order", { orderValid: false }, "invalid_order"],
    ["repeat_replay", { previousReplayCount: 1 }, "replay_limit"],
  ];
  for (const [id, mutation, reason] of mutations)
    await probe(id, () => {
      const result = evaluateReplayPolicy(
        { ...eligibleReplayFacts, ...mutation },
        now,
      );
      assert.equal(result.status, "blocked");
      assert(result.reasons.includes(reason));
    });
  await probe("cooldown_not_bypassed", () => {
    assert.equal(
      evaluateReplayPolicy(
        eligibleReplayFacts,
        new Date("2026-09-28T00:00:29Z"),
      ).status,
      "blocked",
    );
  });
  return probes;
}
