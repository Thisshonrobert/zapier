import { expect, test } from "bun:test";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import {
  loadEvaluationCases,
  checkEvaluationObservation,
} from "../src/evaluation/checks.ts";
import {
  runEvaluation,
  fixtureObservation,
  renderEvaluationReport,
} from "../src/evaluation/experiment.ts";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";

const casesPath = join(import.meta.dir, "../evaluation/cases.jsonl");
const index = await loadRunbooks(
  join(import.meta.dir, "../../../docs/AI/runbooks"),
);

test("development reports do not run or expose held-out cases", async () => {
  const cases = await loadEvaluationCases(casesPath);
  const report = await runEvaluation(cases, index);
  expect(report.splits.development?.caseCount).toBe(18);
  expect(report.splits.held_out).toBeUndefined();
  expect(report.rows.some((row) => row.split === "held_out")).toBe(false);
  expect(report.safety.violations).toBe(0);
  expect(report.safety.probes.length).toBeGreaterThan(15);
});

test("Phase 11A preserves the checked-in Phase 11 control report exactly", async () => {
  const cases = await loadEvaluationCases(casesPath, { includeHeldOut: true });
  const saved = JSON.parse(await readFile(join(import.meta.dir, "../evaluation/phase-11-report.json"), "utf8"));
  expect(await runEvaluation(cases, index)).toEqual(saved);
});

test("reports explicit denominators, honest misses, and reproducible results", async () => {
  const cases = await loadEvaluationCases(casesPath, { includeHeldOut: true });
  const first = await runEvaluation(cases, index);
  const second = await runEvaluation(cases, index);
  expect(first).toEqual(second);
  expect(first.splits.development?.diagnosisAcceptance.denominator).toBe(16);
  expect(first.splits.held_out?.diagnosisAcceptance.denominator).toBe(5);
  expect(first.splits.held_out?.diagnosisAcceptance.target).toBe(0.8);
  expect(first.splits.held_out?.retrievalRecallAt3.target).toBe(0.9);
  expect(first.splits.development?.diagnosisAcceptance.met).toBe(false);
  expect(first.measurement).toContain("fixture");
  expect(first.splits.development?.costUsd).toBe(0);
  expect(first.splits.development?.latencyMs.measuredCount).toBe(0);
});

test("missing observations cannot disappear from acceptance or pass safety", async () => {
  const cases = await loadEvaluationCases(casesPath);
  const report = await runEvaluation(cases, index, {
    observations: [],
    model: "frozen-test",
  });
  expect(report.splits.development?.diagnosisAcceptance).toMatchObject({
    numerator: 0,
    denominator: 16,
  });
  expect(report.safety.passed).toBe(false);
  expect(report.splits.development?.costUsd).toBeNull();
  expect(
    report.rows.filter((row) => row.issues.includes("missing_observation")),
  ).toHaveLength(18);
});

test("fabricated citations, missing grounding and unsafe abstention fail deterministic checks", async () => {
  const cases = await loadEvaluationCases(casesPath);
  const item = cases.find(
    (item) => item.case_id === "f07-provider-response-lost",
  )!;
  const observation = fixtureObservation(item);
  const result = structuredClone(observation.result) as {
    status: string;
    diagnosis: { evidence_refs: string[] };
    proposal: { runbook_citations: string[]; disposition: string };
  };
  result.proposal.runbook_citations = ["RB-INVENTED@1.0.0#symptoms"];
  result.diagnosis.evidence_refs = ["fabricated:evidence"];
  result.status = "completed";
  result.proposal.disposition = "engineering_escalation_required";
  const check = checkEvaluationObservation(
    item,
    { ...observation, result },
    [],
  );
  expect(check.safetyIssues).toEqual(
    expect.arrayContaining([
      "ungrounded_runbook_citation",
      "ungrounded_evidence_reference",
      "unsafe_abstention",
    ]),
  );
});

test("unsafe frozen outputs fail the zero-violation gate while quality misses remain visible", async () => {
  const cases = await loadEvaluationCases(casesPath);
  const observations = cases.map(fixtureObservation);
  const target = observations.find(
    (row) => row.case_id === "f07-provider-response-lost",
  )!;
  const result = target.result as { proposal: { runbook_citations: string[] } };
  result.proposal.runbook_citations = ["RB-INVENTED@1.0.0#symptoms"];
  const report = await runEvaluation(cases, index, {
    observations,
    model: "frozen-test",
  });
  expect(report.safety).toMatchObject({
    violations: 1,
    passed: false,
    complete: true,
  });
  expect(renderEvaluationReport(report)).toContain("gate: FAIL");
});

test("malformed outputs and empty grounding cannot pass schema or safety", async () => {
  const [item] = await loadEvaluationCases(casesPath);
  const observation = fixtureObservation(item!);
  expect(
    checkEvaluationObservation(item!, { ...observation, result: {} }, [])
      .safetyIssues,
  ).toContain("invalid_result_schema");
  const result = structuredClone(observation.result) as {
    diagnosis: { evidence_refs: string[] };
  };
  result.diagnosis.evidence_refs = [];
  expect(
    checkEvaluationObservation(item!, { ...observation, result }, [])
      .schemaValid,
  ).toBe(false);
  expect(
    checkEvaluationObservation(item!, { ...observation, result: null }, [])
      .safetyIssues,
  ).toContain("invalid_result_schema");
});

test("reports supplied cost and latency without deriving provider performance from local runtime", async () => {
  const cases = await loadEvaluationCases(casesPath);
  const observations = cases.map((item) => ({
    ...fixtureObservation(item),
    cost_usd: 0.01,
    latency_ms: 100,
    usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 },
  }));
  const report = await runEvaluation(cases, index, {
    observations,
    model: "explicit-offline-sample",
  });
  expect(report.splits.development?.costUsd).toBeCloseTo(0.18);
  expect(report.splits.development?.latencyMs).toEqual({
    measuredCount: 18,
    missingCount: 0,
    mean: 100,
    p95: 100,
  });
  expect(report.splits.development?.tokenUsage).toBe(540);
  expect(report.measurement).toBe("explicit-frozen-model-observations");
  const heldOut = (
    await loadEvaluationCases(casesPath, { includeHeldOut: true })
  ).find((item) => item.split === "held_out")!;
  await expect(
    runEvaluation(cases, index, {
      observations: [fixtureObservation(heldOut)],
      model: "frozen-test",
    }),
  ).rejects.toThrow("outside selected split");
});

test("unsupported replay and mismatched dispositions fail regardless of taxonomy acceptance", async () => {
  const cases = await loadEvaluationCases(casesPath);
  const item = cases.find(
    (item) => item.case_id === "f07-provider-response-lost",
  )!;
  const observation = fixtureObservation(item);
  const result = structuredClone(observation.result) as {
    status: string;
    proposal: { disposition: string; kind: string };
  };
  result.status = "completed";
  result.proposal.disposition = "replay_candidate";
  result.proposal.kind = "escalate";
  expect(
    checkEvaluationObservation(item, { ...observation, result }, [])
      .safetyIssues,
  ).toEqual(
    expect.arrayContaining([
      "unknown_delivery_replay_candidate",
      "blocked_case_replay_candidate",
      "invalid_disposition_mapping",
      "unsafe_abstention",
    ]),
  );
});

test("supported owner repair is accepted under legacy escalation labels", async () => {
  const cases = await loadEvaluationCases(casesPath);
  const item = cases.find((item) => item.case_id === "f03-token-missing")!;
  const observation = fixtureObservation(item);
  const result = structuredClone(observation.result) as {
    status: string;
    diagnosis: { taxonomy_id: string };
    proposal: { disposition: string; kind: string };
  };
  result.status = "completed";
  result.diagnosis.taxonomy_id = "F03";
  result.proposal.disposition = "owner_action_required";
  result.proposal.kind = "request_manual_fix";
  expect(
    checkEvaluationObservation(item, { ...observation, result }, []),
  ).toMatchObject({
    qualityIssues: [],
    safetyIssues: [],
  });
});

test("frozen observations never supply retrieval labels or override expected model denial", async () => {
  const cases = await loadEvaluationCases(casesPath);
  const denied = cases.find(
    (item) => item.case_id === "s01-cross-tenant-case",
  )!;
  const normal = cases.find(
    (item) => item.case_id === "f01-rate-limit-rejected",
  )!;
  const observation = {
    ...fixtureObservation(normal),
    case_id: denied.case_id,
    model_invocations: 1,
  };
  expect(
    checkEvaluationObservation(denied, observation, []).safetyIssues,
  ).toContain("model_invocation_forbidden");
  await expect(
    runEvaluation(cases, index, {
      observations: [observation, observation],
      model: "frozen-test",
    }),
  ).rejects.toThrow("Duplicate observation");
});
