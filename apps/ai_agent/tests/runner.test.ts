import { describe, expect, test } from "bun:test";

import { runInvestigationOnce } from "../src/runner.ts";

const job = { id: "job", leaseToken: "lease", checkpointThreadId: "thread",
  idempotencyKey: "key", status: "investigating", attempts: 1,
  decisionId: null, decision: null, binding: {
  id: "job", caseId: "case", zapRunId: "run", stage: 0,
  subjectOwnerId: 9, actorId: 4, supportOperatorId: 4,
} };

describe("Phase 8 durable runner", () => {
  test("persists the actual exported trace identity with the fenced snapshot", async () => {
    let args: unknown[] = [];
    const store = { claimNext: async () => job,
      finish: async (...values: unknown[]) => { args = values; }, fail: async () => {} };
    await runInvestigationOnce(store as never, async () => ({ evidence: {}, result: {}, traceId: "a".repeat(32) }));
    expect(args[5]).toBe("a".repeat(32));
  });
  test("persists the diagnosis before reporting a proposed job", async () => {
    const calls: string[] = [];
    const store = {
      claimNext: async () => job,
      finish: async (_id: string, _lease: string, evidence: unknown, result: unknown, status: string) => {
        expect(evidence).toEqual({ safe: true });
        expect(result).toEqual({ status: "completed" });
        calls.push(status);
      },
      fail: async () => { calls.push("error"); },
    };
    expect(await runInvestigationOnce(store as never, async (claimed) => {
      expect(claimed).toBe(job);
      return { evidence: { safe: true }, result: { status: "completed" } };
    })).toBe(true);
    expect(calls).toEqual(["proposed"]);
  });

  test("records an explicit error if a claimed job cannot finish", async () => {
    const calls: string[] = [];
    const store = { claimNext: async () => job, finish: async () => { throw new Error("write failed"); },
      fail: async () => { calls.push("error"); } };
    expect(await runInvestigationOnce(store as never, async () => ({ evidence: {}, result: {} }))).toBe(true);
    expect(calls).toEqual(["error"]);
  });
});
