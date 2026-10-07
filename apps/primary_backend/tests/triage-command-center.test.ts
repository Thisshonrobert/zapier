import { test, expect } from "bun:test";
import { readEvaluationSummary, traceLink } from "../services/triage-command-center.ts";
import { HistorySchema } from "../../../packages/triage-contracts/command-center.ts";

test("trace links accept only configured safe origins and recorded trace IDs", () => {
  const id = "a".repeat(32);
  expect(traceLink(id, "https://cloud.langfuse.com", "project-1")?.url)
    .toBe(`https://cloud.langfuse.com/project/project-1/traces/${id}`);
  for (const origin of ["javascript:alert(1)", "https://secret@example.com", "http://example.com", "https://example.com?token=secret"])
    expect(traceLink(id, origin, "project-1")?.url).toBeNull();
  expect(traceLink(id, "http://127.0.0.1:3000", "project-1")?.url).toContain("http://127.0.0.1:3000/");
  expect(traceLink("javascript:alert(1)", "https://cloud.langfuse.com", "project-1")).toBeNull();
  expect(traceLink(id, "https://cloud.langfuse.com", "../forged")?.url).toBeNull();
  expect(traceLink(id, "https://cloud.langfuse.com", "project-1")?.exportVerified).toBe(false);
});

test("evaluation projection preserves shortfalls without exposing raw fixture cases", async () => {
  const summary = await readEvaluationSummary();
  expect(summary.splits.development.diagnosisAcceptance.met).toBe(false);
  expect(summary.splits.held_out?.retrievalRecallAt3).toMatchObject({ numerator: 4, denominator: 5, met: false });
  expect(summary.splits.development.latencyMs.mean).toBeNull();
  expect(JSON.stringify(summary)).not.toContain("f01-rate-limit-rejected");
  expect(JSON.stringify(summary)).not.toContain("probes");
});

test("history rejects unordered, oversized and secret-bearing event projections", () => {
  const event = { sequence: 1, status: "queued", observedAt: "2026-10-05T00:00:00.000Z" };
  const base = { currentSequence: 2, currentStatus: "proposed", truncated: false };
  for (const events of [[event, event], [{ ...event, sequence: 3 }], [{ ...event, rawPayload: "secret" }], Array(65).fill(event)])
    expect(HistorySchema.safeParse({ ...base, events }).success).toBe(false);
});
