import { expect, test } from "bun:test";
import { parseRunbook } from "../src/tools/search-runbooks.ts";
import { scoreSelection, verifyProvenance, rankSelectionArm, selectDevelopmentFinalist, evaluateSelectionMatrix, productionQueryVariant, type SelectionCase } from "../src/evaluation/retrieval-selection.ts";

const index = parseRunbook(`---
id: RB-TEST
version: 1.0.0
simulated: true
status: current
owner: test
reviewed: 2026-10-13
taxonomy: F01
providers: email
code_version: test
---
## Direct
Known provider rejection.
## Alternative
Equivalent guidance.
## Supporting
Additional evidence.
`, "test.md");
const [direct, alternative, supporting] = index.map(s => s.citation) as [string, string, string];
const positive: SelectionCase = {
  id: "positive", kind: "answerable", input: { query: "rejection", providers: ["email"], limit: 3 },
  answerSets: [[direct], [alternative]], supporting: [supporting], missingRuntimeFacts: [],
};
const negative: SelectionCase = { ...positive, id: "negative", kind: "no_match", answerSets: [], supporting: [] };

test("credits an alternative sufficient answer without demanding both alternatives", () => {
  const result = scoreSelection(index, [positive], [{ id: "positive", returned: [alternative, supporting], latencyMs: 1 }]);
  expect(result.metrics.recallAt3).toBe(1);
  expect(result.metrics.precisionAt3).toBe(0.5);
  expect(result.rows[0]?.supportingHits).toBe(1);
});

test("keeps provider exclusions separate from eligible recall and all-incident coverage", () => {
  const blocked = { ...positive, id: "blocked", input: { ...positive.input, providers: ["telegram"] } };
  const result = scoreSelection(index, [positive, blocked], [{ id: "positive", returned: [direct], latencyMs: 1 }, { id: "blocked", returned: [], latencyMs: 1 }]);
  expect(result.counts.eligibleAnswerable).toBe(1);
  expect(result.counts.providerExcluded).toBe(1);
  expect(result.metrics.recallAt3).toBe(1);
  expect(result.allIncidentCoverage).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
});

test("missing and failed outputs cannot count as successful negative abstention", () => {
  const cases = [negative, { ...negative, id: "failed" }, { ...negative, id: "empty" }];
  const result = scoreSelection(index, cases, [{ id: "failed", error: "provider_error" }, { id: "empty", returned: [], latencyMs: 1 }]);
  expect(result.noMatchAbstention).toEqual({ numerator: 1, denominator: 3, rate: 1 / 3 });
  expect(result.counts.unavailable).toBe(2);
});

test("counts unavailable positives as zero recall rather than removing them", () => {
  const result = scoreSelection(index, [positive, { ...positive, id: "missing" }], [{ id: "positive", returned: [direct], latencyMs: 1 }]);
  expect(result.metrics.recallAt3).toBe(0.5);
  expect(result.falseAbstention).toEqual({ numerator: 0, denominator: 2, rate: 0 });
});

test("rejects impossible top-three labels, false no-match labels and unauthorized citations", () => {
  expect(() => scoreSelection(index, [{ ...positive, answerSets: [[direct, alternative, supporting, "fourth"]] }], [])).toThrow();
  expect(() => scoreSelection(index, [{ ...negative, answerSets: [[direct]] }], [])).toThrow();
  expect(() => scoreSelection(index, [positive], [{ id: "positive", returned: ["fabricated"], latencyMs: 1 }])).toThrow();
  expect(() => scoreSelection(index, [{ ...positive, input: { query: "x", providers: ["telegram"] } }], [{ id: "positive", returned: [direct], latencyMs: 1 }])).toThrow();
});

test("rejects changed, missing or extra provenance entries", () => {
  expect(() => verifyProvenance({ corpus: "a" }, { corpus: "b" })).toThrow();
  expect(() => verifyProvenance({ corpus: "a" }, {})).toThrow();
  expect(() => verifyProvenance({ corpus: "a" }, { corpus: "a", source: "b" })).toThrow();
  expect(() => verifyProvenance({ corpus: "a" }, { corpus: "a" })).not.toThrow();
});

test("keeps original MiniLM cutoff frozen while calibrated hybrid can abstain", () => {
  const scores = { semantic: Object.fromEntries(index.map(s => [s.citation, 0.8])),
    logits: { [direct]: -6, [alternative]: -8, [supporting]: -8 } };
  expect(rankSelectionArm(index, positive.input, "minilm-original", scores, 0.9).map(m => m.citation)).toEqual([direct]);
  expect(rankSelectionArm(index, positive.input, "hybrid-reranked", scores, 0.9)).toEqual([]);
});

test("direct precision includes direct sections beyond the minimum sufficient answer", () => {
  const result = scoreSelection(index, [{ ...positive, answerSets: [[direct]], direct: [direct, alternative] }],
    [{ id: "positive", returned: [direct, alternative, supporting], latencyMs: 1 }]);
  expect(result.metrics.precisionAt3).toBe(2 / 3);
});

test("missing negative cohort and failed abstention gate cannot produce a finalist", () => {
  const noNegatives = scoreSelection(index, [positive], [{ id: "positive", returned: [direct], latencyMs: 1 }]);
  expect(selectDevelopmentFinalist([{ method: "keyword", cutoff: 0, report: noNegatives }]).finalist).toBeNull();
  const badAbstention = scoreSelection(index, [positive, negative], [
    { id: "positive", returned: [direct], latencyMs: 1 }, { id: "negative", returned: [direct], latencyMs: 1 },
  ]);
  expect(selectDevelopmentFinalist([{ method: "keyword", cutoff: 0, report: badAbstention }]).finalist).toBeNull();
});

test("passing development candidate is eligible while false abstention rejects a rival", () => {
  const good = scoreSelection(index, [positive, negative], [
    { id: "positive", returned: [direct], latencyMs: 1 }, { id: "negative", returned: [], latencyMs: 1 },
  ]);
  const bad = scoreSelection(index, [positive, negative], [
    { id: "positive", returned: [], latencyMs: 1 }, { id: "negative", returned: [], latencyMs: 1 },
  ]);
  const result = selectDevelopmentFinalist([{ method: "keyword", cutoff: 0, report: bad }, { method: "minilm-original", cutoff: .001, report: good }]);
  expect(result.finalist?.method).toBe("minilm-original");
  expect(result.feasible).toHaveLength(1);
});

test("matrix refuses a missing no-match cohort before scoring", () => {
  expect(() => evaluateSelectionMatrix(index, [positive], {})).toThrow("no-match");
});

test("missing model captures count as unavailable instead of keyword fallback", () => {
  const result = evaluateSelectionMatrix(index, [positive, negative], {});
  expect(result.candidates.find(c => c.method === "semantic")?.report.counts.unavailable).toBe(2);
  expect(result.candidates.find(c => c.method === "minilm-original")?.report.noMatchAbstention.rate).toBe(0);
  expect(result.candidates.find(c => c.method === "keyword")?.report.counts.unavailable).toBe(0);
});

test("corpus gaps remain outside the no-match abstention denominator", () => {
  const gap = { ...negative, id: "gap", kind: "corpus_gap" as const };
  const result = scoreSelection(index, [positive, negative, gap], [
    { id: "positive", returned: [direct], latencyMs: 1 }, { id: "negative", returned: [], latencyMs: 1 },
    { id: "gap", returned: [], latencyMs: 1 },
  ]);
  expect(result.counts.corpusGaps).toBe(1);
  expect(result.noMatchAbstention).toEqual({ numerator: 1, denominator: 1, rate: 1 });
  expect(result.allIncidentCoverage.rate).toBe(2 / 3);
});

test("finalist selection requires the paired keyword comparator", () => {
  const good = scoreSelection(index, [positive, negative], [
    { id: "positive", returned: [direct], latencyMs: 1 }, { id: "negative", returned: [], latencyMs: 1 },
  ]);
  expect(selectDevelopmentFinalist([{ method: "minilm-original", cutoff: .001, report: good }]).finalist).toBeNull();
});

test("normalizes observed code separators without losing provider/status or changing eligibility", () => {
  const input = { query: "send_rejected_http_400 support_unknown", providers: ["telegram"], limit: 3 as const };
  expect(productionQueryVariant(input, "normalized-observations")).toEqual({ ...input, query: "send rejected http 400 support unknown" });
  expect(input.query).toBe("send_rejected_http_400 support_unknown");
});

test("adds explicit procedural task without asserting a cause or silently truncating evidence", () => {
  const input = { query: "Invalid channel username", providers: ["telegram"] };
  const revised = productionQueryVariant(input, "procedure-question");
  expect(revised.query).toBe("What incident-specific procedure applies to this observed failure? Invalid channel username");
  expect(revised.providers).toEqual(["telegram"]);
  expect(() => productionQueryVariant({ query: "x".repeat(500) }, "procedure-question")).toThrow();
});
