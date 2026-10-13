import { expect, test } from "bun:test";
import { buildPairedInputs, summarizeHeldout } from "../src/evaluation/procedure-heldout.ts";
import { parseRunbook } from "../src/tools/search-runbooks.ts";

const index = parseRunbook(`---
id: RB-TEST
version: 1.0.0
simulated: true
status: current
owner: test
reviewed: 2026-10-13
taxonomy: F01
providers: generic
code_version: test
---
## Procedure
Wait for the recorded cooldown.
`, "test.md");
const citation = index[0]!.citation;
const queries = [
  { id: "positive", query: "Recorded cooldown", providers: ["telegram"], taxonomy: [], relevantCitations: [citation] },
  { id: "negative", query: "Unsupported device", providers: ["telegram"], taxonomy: [], relevantCitations: [] },
];

test("paired inference preserves eligible passages and excludes evaluation labels", () => {
  const arms = buildPairedInputs(index, queries);
  expect(arms.procedure[0]!.query).toBe("What incident-specific procedure applies to this observed failure? Recorded cooldown");
  expect(arms.procedure[0]!.candidates).toEqual(arms.original[0]!.candidates);
  expect(arms.procedure[0]!.passages).toEqual(arms.original[0]!.passages);
  expect(JSON.stringify(arms)).not.toContain("relevantCitations");
  expect(() => buildPairedInputs(index, [{ ...queries[0]!, query: "x".repeat(500) }])).toThrow();
});

test("unavailable corpus answers remain excluded rather than becoming successful negatives", () => {
  const rows = [
    { id: "positive", relevant: [citation], candidates: [citation], returned: [citation], latencyMs: 1 },
    { id: "negative", relevant: [], candidates: [citation], returned: [], latencyMs: 1 },
    { id: "missing", relevant: ["absent"], candidates: [citation], returned: [], latencyMs: 1 },
  ];
  const result = summarizeHeldout(rows);
  expect(result.eligible.queryCount).toBe(2);
  expect(result.eligible.noMatchQueryCount).toBe(1);
  expect(result.eligible.noMatchAbstentionRate).toBe(1);
  expect(result.allCases.recallAt3).toBe(0.5);
  expect(result.exclusions).toEqual([{ id: "missing", missing: ["absent"] }]);
  expect(() => summarizeHeldout([{ ...rows[0]!, returned: ["invented"] }])).toThrow();
});
