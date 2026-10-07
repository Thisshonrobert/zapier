import { test, expect } from "bun:test";
import type { TriageCase } from "../types/triage";

test("case filters combine search, outcome and source within the supplied bounded list", async () => {
  const subject = await import("./triage-command-center.ts").catch(() => null);
  expect(subject).not.toBeNull();
  const cases: TriageCase[] = [
    { case_id: "first", zap_run_id: "run", stage: 0, subject_owner_id: 9, observed_at: "2026-10-04T00:00:00Z",
      provider_outcome: "rejected", safe_code: "RATE_LIMIT", source: "retry_row" },
    { case_id: "second", zap_run_id: "other", stage: 1, subject_owner_id: 10, observed_at: "2026-10-05T00:00:00Z",
      provider_outcome: null, safe_code: null, source: "reconciled_execution" },
  ];
  expect(subject!.filterCases(cases, { query: "rate_limit", outcome: "rejected", source: "retry_row", order: "newest" })).toEqual([cases[0]!]);
  expect(subject!.filterCases(cases, { query: "", outcome: "unavailable", source: "all", order: "newest" })).toEqual([cases[1]!]);
  expect(subject!.filterCases(cases, { query: "", outcome: "all", source: "all", order: "newest" }).map(c => c.case_id)).toEqual(["second", "first"]);
  expect(cases[0]!.case_id).toBe("first");
});
