import { describe, expect, test } from "bun:test";

import { TriageEvidenceService, type TriageEvidenceDb } from "../services/triage-evidence.ts";
import { ExecutionEvidenceSchema } from "../../ai_agent/src/contracts.ts";

const caseId = "11111111-1111-4111-8111-111111111111";
const runId = "44444444-4444-4444-8444-444444444444";
const executionId = "55555555-5555-4555-8555-555555555555";

const owned = {
  caseId,
  zapRunId: runId,
  stage: 2,
  attempt: 1,
  createdAt: new Date("2026-09-24T00:00:00.000Z"),
  evidenceSource: "captured",
  provider: "telegram",
  phase: "send",
  providerOutcome: "rejected",
  safeCode: "telegram_http_429",
  providerStatus: 429,
  retryAfterSeconds: 30,
  requiresHuman: true,
  lastError: null,
  actionTypeId: "telegram",
  actionMetadata: {},
  runMetadata: {},
};

function queuedDb(results: unknown[][]): TriageEvidenceDb {
  let index = 0;
  return { $queryRaw: async <T>() => (results[index++] ?? []) as T };
}

describe("Phase 4B execution evidence", () => {
  test("keeps execution, provider outcome and attempt provenance distinct", async () => {
    const service = new TriageEvidenceService(queuedDb([
      [owned],
      [{
        executionId,
        executionStatus: "FAILED",
        leaseUntil: null,
        completedAt: new Date("2026-09-24T00:00:01.000Z"),
        executionProviderOutcome: "rejected",
        requiresHuman: true,
        actionFingerprint: "a".repeat(64),
        requestFingerprint: "b".repeat(64),
        attemptNumber: 1,
        attemptStatus: "REJECTED",
        attemptProvider: "telegram",
        attemptPhase: "send",
        attemptSafeCode: "telegram_http_429",
        attemptProviderStatus: 429,
        attemptRetryAfterSeconds: 30,
        attemptStartedAt: new Date("2026-09-24T00:00:00.000Z"),
        attemptCompletedAt: new Date("2026-09-24T00:00:01.000Z"),
      }],
      [
        { stage: 0, status: "SUCCESS", providerOutcome: "accepted", completedAt: new Date("2026-09-23T23:59:58.000Z") },
        { stage: 1, status: "SUCCESS", providerOutcome: "accepted", completedAt: new Date("2026-09-23T23:59:59.000Z") },
      ],
      [{ sortingOrder: 0 }, { sortingOrder: 1 }, { sortingOrder: 2 }],
    ]));

    const result = await service.getExecutionEvidence(7, caseId, 10);
    ExecutionEvidenceSchema.parse(result);

    expect(result.facts.current_execution?.status).toBe("FAILED");
    expect(result.facts.current_execution?.provider_outcome).toBe("rejected");
    expect(result.facts.attempts[0]).toMatchObject({
      attempt_number: 1,
      status: "REJECTED",
      provider_outcome: "rejected",
      provenance: "captured",
    });
    expect(result.facts.predecessors.map((item) => item.stage)).toEqual([0, 1]);
    expect(result.facts.ordering).toEqual({ status: "valid", missing_predecessor_stages: [] });
  });

  test("labels reconciled and legacy gaps instead of inventing attempts", async () => {
    for (const evidenceSource of ["reconciled_execution", null]) {
      const service = new TriageEvidenceService(queuedDb([
        [{ ...owned, evidenceSource }],
        [],
        [],
        [{ sortingOrder: 0 }, { sortingOrder: 2 }, { sortingOrder: 2 }],
      ]));
      const result = await service.getExecutionEvidence(7, caseId, 1);

      expect(result.facts.current_execution).toBeNull();
      expect(result.facts.attempts).toEqual([]);
      expect(result.facts.ordering.status).toBe("invalid");
      expect(result.unavailable).toContain("execution");
      expect(result.unavailable).toContain("attempt_history");
      expect(result.facts.provenance).toBe(
        evidenceSource === null ? "legacy" : "reconciled_execution",
      );
    }
  });

  test("caps attempt history at fifty and reports truncation", async () => {
    const attempts = Array.from({ length: 51 }, (_, index) => ({
      executionId,
      executionStatus: "FAILED",
      leaseUntil: null,
      completedAt: null,
      executionProviderOutcome: "unknown",
      requiresHuman: true,
      actionFingerprint: null,
      requestFingerprint: null,
      attemptNumber: 51 - index,
      attemptStatus: "UNKNOWN",
      attemptProvider: "telegram",
      attemptPhase: "send",
      attemptSafeCode: "transport_error",
      attemptProviderStatus: null,
      attemptRetryAfterSeconds: null,
      attemptStartedAt: new Date("2026-09-24T00:00:00.000Z"),
      attemptCompletedAt: null,
    }));
    const service = new TriageEvidenceService(queuedDb([
      [owned], attempts, [], [{ sortingOrder: 0 }, { sortingOrder: 1 }, { sortingOrder: 2 }],
    ]));

    const result = await service.getExecutionEvidence(7, caseId, 500);

    expect(result.facts.attempts).toHaveLength(50);
    expect(result.facts.history_truncated).toBe(true);
  });
});
