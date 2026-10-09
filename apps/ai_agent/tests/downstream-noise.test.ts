import { expect, test } from "bun:test";
import {
  assessDiagnosis,
  comparePairs,
} from "../src/evaluation/downstream-noise.ts";

const output = {
  status: "completed",
  diagnosis: {
    taxonomy_id: "F03",
    summary: "Configured credential is absent; worker fallback is unavailable.",
    confidence: "medium",
    evidence_refs: ["e:failure"],
    alternate_explanations: [],
    missing_evidence: ["worker_fallback"],
  },
  proposal: {
    disposition: "owner_action_required",
    kind: "request_manual_fix",
    summary: "Ask the owner to verify configuration without exposing a secret.",
    evidence_refs: ["e:failure"],
    runbook_citations: ["RB-TEST@1.0.0#evidence"],
    reasons: ["Captured configuration is absent."],
    preconditions: [],
  },
};
const expected = {
  taxonomies: ["F03"],
  disposition: "owner_action_required",
  kind: "request_manual_fix",
  status: "completed",
};
test("assesses raw cause, references, route and unavailable disclosures separately", () => {
  expect(
    assessDiagnosis(
      output,
      expected,
      ["e:failure"],
      ["RB-TEST@1.0.0#evidence"],
      ["worker_fallback"],
    ).passed,
  ).toBe(true);
  expect(
    assessDiagnosis(
      { ...output, diagnosis: { ...output.diagnosis, taxonomy_id: "F01" } },
      expected,
      ["e:failure"],
      ["RB-TEST@1.0.0#evidence"],
      ["worker_fallback"],
    ).rootCauseCorrect,
  ).toBe(false);
  expect(
    assessDiagnosis(output, expected, [], [], ["worker_fallback"])
      .referencesValid,
  ).toBe(false);
  expect(
    assessDiagnosis(
      output,
      expected,
      ["e:failure"],
      ["RB-TEST@1.0.0#evidence"],
      ["worker_fallback", "missing_attempts"],
    ).missingEvidenceDisclosed,
  ).toBe(false);
});
test("no-match controls reject hallucinated runbook citations", () => {
  expect(
    assessDiagnosis(output, expected, ["e:failure"], [], ["worker_fallback"])
      .passed,
  ).toBe(false);
});
test("paired comparison exposes noisy-only failure rather than averaging it away", () => {
  const rows = [
    { pairId: "a", arm: "clean", assessment: { passed: true } },
    { pairId: "a", arm: "baseline", assessment: { passed: false } },
    { pairId: "b", arm: "clean", assessment: { passed: false } },
    { pairId: "b", arm: "baseline", assessment: { passed: false } },
  ];
  expect(comparePairs(rows)).toEqual({
    pairs: 2,
    bothPass: 0,
    cleanOnlyPass: 1,
    baselineOnlyPass: 0,
    bothFail: 1,
  });
});
