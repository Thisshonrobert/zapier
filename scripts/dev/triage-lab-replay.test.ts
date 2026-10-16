import { describe, expect, test } from "bun:test";

import { verifyReplayEvidence, type ReplayEvidence } from "./triage-lab-replay.ts";
import { parseReplayFlags } from "./triage-lab.ts";

const evidence: ReplayEvidence = { caseId: "f0100000-0000-4000-8000-000000000001",
  originalExecutionId: "11111111-1111-4111-8111-111111111111", runId: "22222222-2222-4222-8222-222222222222",
  stage: 0, ownerId: 7, requestId: "33333333-3333-4333-8333-333333333333",
  approvalId: "44444444-4444-4444-8444-444444444444", publication: "published", execution: "SUCCESS",
  outcome: "accepted", providerOperations: 1, originalAttempts: 1, replayFailures: 0 };

describe("Phase 16F lab replay evidence", () => {
  test("accepts exactly one published, accepted replay with preserved original history", () => {
    expect(verifyReplayEvidence(evidence, { requestId: evidence.requestId, originalAttempts: 1 })).toBe(evidence);
  });

  test.each([
    [{ publication: "queued" }, "publication not confirmed"],
    [{ execution: "FAILED" }, "execution FAILED"],
    [{ execution: "UNKNOWN" }, "execution UNKNOWN"],
    [{ outcome: "rejected" }, "provider outcome rejected"],
    [{ outcome: "pending" }, "provider outcome pending"],
    [{ providerOperations: 0 }, "provider operations 0"],
    [{ providerOperations: 2 }, "provider operations 2"],
    [{ replayFailures: 1 }, "unexpected replay failure ledger"],
    [{ requestId: "55555555-5555-4555-8555-555555555555" }, "request identity"],
  ] as const)("refuses %o", (patch, message) => {
    expect(() => verifyReplayEvidence({ ...evidence, ...patch }, { requestId: evidence.requestId, originalAttempts: 1 }))
      .toThrow(`Lab replay evidence mismatch: ${message}`);
  });

  test("refuses a replay that changed the original execution history", () => {
    expect(() => verifyReplayEvidence({ ...evidence, originalAttempts: 2 },
      { requestId: evidence.requestId, originalAttempts: 1 })).toThrow("original history changed");
  });

  test("replay flags require a case or a run and reject unknown flags", () => {
    expect(parseReplayFlags(["--run-id", evidence.runId])).toEqual({ runId: evidence.runId, caseId: undefined, timeout: 90000 });
    expect(parseReplayFlags(["--case-id", evidence.caseId, "--timeout-ms", "5000"]))
      .toEqual({ caseId: evidence.caseId, runId: undefined, timeout: 5000 });
    expect(() => parseReplayFlags([])).toThrow("--run-id");
    expect(() => parseReplayFlags(["--case-id", "not-a-uuid"])).toThrow("Invalid --case-id");
    expect(() => parseReplayFlags(["--outcome", "accepted"])).toThrow("Invalid lab replay flags");
    expect(() => parseReplayFlags(["--run-id", evidence.runId, "--timeout-ms", "10"])).toThrow("1000..300000");
  });
});
