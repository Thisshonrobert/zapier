import { expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CapturedEvaluationContext } from "../src/evaluation/checks.ts";
import type { IntegratedModelOutput } from "../src/contracts.ts";
import { diagnosisConsistencyIssues, repairEvidenceIssue } from "../src/evaluation/causal-diagnosis.ts";
import { executeCausalPilot, prepareCausalPilot } from "../src/evaluation/causal-pilot.ts";
import { pilotFetch } from "../src/evaluation/oracle-pilot.ts";
import { buildDiagnosisService } from "../src/graph.ts";

const contexts: CapturedEvaluationContext[] = JSON.parse(await readFile(join(import.meta.dir, "../evaluation/phase-11a-baseline-v6/contexts.json"), "utf8"));
const evidenceFor = (id: string) => structuredClone(contexts.find(c => c.case_id === id)!.evidence!);
const run = join(import.meta.dir, "../evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1");
const frozen = JSON.parse(await readFile(join(run, "result-2.json"), "utf8")).output as IntegratedModelOutput;
const investigation = (): IntegratedModelOutput => ({
  ...structuredClone(frozen), status: "completed",
  proposal: { ...structuredClone(frozen.proposal), disposition: "engineering_escalation_required", kind: "escalate" },
});

test("reports the frozen rejected-delivery contradiction without rewriting its response", () => {
  const before = JSON.stringify(frozen);
  expect(diagnosisConsistencyIssues(evidenceFor("f03-permission-ambiguous"), frozen)).toEqual(["known_delivery_marked_unknown"]);
  expect(JSON.stringify(frozen)).toBe(before);
});

test("known rejection permits low-certainty family investigation, and insufficient evidence remains allowed", () => {
  const evidence = evidenceFor("f03-permission-ambiguous");
  const value = investigation();
  expect(value.diagnosis.confidence).toBe("low");
  expect(diagnosisConsistencyIssues(evidence, value)).toEqual([]);
  expect(repairEvidenceIssue(evidence, value)).toBeNull();
  value.status = "abstained";
  value.proposal.disposition = "insufficient_evidence";
  expect(diagnosisConsistencyIssues(evidence, value)).toEqual([]);
});

test("confirmed format defect permits cited bounded repair but does not establish replay eligibility", async () => {
  const evidence = evidenceFor("f04-invalid-destination");
  const value = JSON.parse(await readFile(join(run, "result-4.json"), "utf8")).output;
  expect(diagnosisConsistencyIssues(evidence, value)).toEqual([]);
  expect(repairEvidenceIssue(evidence, value)).toBeNull();
  value.proposal.evidence_refs = [evidence.executionEvidence.evidence_id];
  expect(repairEvidenceIssue(evidence, value)).toBe("unsupported_owner_repair");
  // Delivery consistency cannot decide repair support or replay policy.
  expect(diagnosisConsistencyIssues(evidence, value)).toEqual([]);
});

test("unknown delivery overrides an independently observed defect, error wording and SUCCESS", () => {
  const evidence = evidenceFor("f07-provider-response-lost");
  if (evidence.failureContext.simulated) {
    evidence.failureContext.fixture_observation.observed_facts.push("destination_format_invalid");
    evidence.failureContext.fixture_observation.execution_status = "SUCCESS";
  }
  evidence.failureContext.facts.retry.final_error = "rejected: invalid destination";
  expect(diagnosisConsistencyIssues(evidence, frozen)).toEqual([]);
  expect(diagnosisConsistencyIssues(evidence, investigation())).toEqual(["unknown_delivery_requires_outcome_unknown"]);
  const replay = investigation();
  replay.proposal.disposition = "replay_candidate";
  replay.proposal.kind = "wait_then_replay";
  expect(diagnosisConsistencyIssues(evidence, replay)).toEqual(["unknown_delivery_requires_outcome_unknown"]);
});

test("missing outcomes are not inferred from errors; explicit unknown and accepted/rejected conflicts take precedence", () => {
  const evidence = evidenceFor("f03-permission-ambiguous");
  evidence.failureContext.facts.retry.provider_outcome = null;
  expect(diagnosisConsistencyIssues(evidence, frozen)).toEqual([]);
  expect(diagnosisConsistencyIssues(evidence, investigation())).toEqual([]);
  // Aggregate fixture text is not a replacement for the routed structured facts.
  if (evidence.failureContext.simulated) evidence.failureContext.fixture_observation.delivery_outcome = "rejected";
  evidence.failureContext.facts.retry.provider_outcome = "unknown";
  expect(diagnosisConsistencyIssues(evidence, investigation())).toContain("unknown_delivery_requires_outcome_unknown");
  evidence.executionEvidence.facts.attempts.push({
    attempt_number: 1, status: "SUCCESS", provider: "telegram", phase: "send",
    provider_outcome: "accepted", safe_code: null, provider_status: 200,
    retry_after_seconds: null, started_at: null, completed_at: null, provenance: "legacy",
  });
  evidence.failureContext.facts.retry.provider_outcome = "rejected";
  expect(diagnosisConsistencyIssues(evidence, frozen)).toEqual([]);
  expect(diagnosisConsistencyIssues(evidence, investigation())).toContain("unknown_delivery_requires_outcome_unknown");
});

test("status and kind mappings are checked separately from cause certainty", () => {
  const value = investigation();
  value.status = "abstained";
  value.proposal.kind = "request_manual_fix";
  expect(diagnosisConsistencyIssues(evidenceFor("f03-permission-ambiguous"), value)).toEqual(["invalid_disposition_mapping", "invalid_abstention_status"]);
});

test("known fixture non-delivery and not-applicable outcomes are not delivery uncertainty", () => {
  const evidence = evidenceFor("f03-permission-ambiguous");
  for (const known of ["not_delivered", "not_applicable", "not_attempted", "accepted"]) {
    evidence.failureContext.facts.retry.provider_outcome = known;
    expect(diagnosisConsistencyIssues(evidence, frozen)).toEqual(["known_delivery_marked_unknown"]);
    expect(diagnosisConsistencyIssues(evidence, investigation())).toEqual([]);
  }
});

test("v2 prepares six paired generations and evaluates both preserved responses equally", async () => {
  const plan = await prepareCausalPilot("v2");
  const out = await mkdtemp(join(tmpdir(), "causal-v2-"));
  const prompts: unknown[] = [];
  let now = 100_000;
  const rows = await executeCausalPilot(plan, out, {
    close: async () => {}, generate: async prompt => {
      prompts.push(prompt);
      return { output: structuredClone(frozen), usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 } };
    },
  }, { now: () => now, sleep: async ms => { now += ms; } });
  expect(rows.map(r => `${r.caseId}/${r.variant}`)).toEqual([
    "f03-permission-ambiguous/current", "f03-permission-ambiguous/candidate",
    "f04-invalid-destination/candidate", "f04-invalid-destination/current",
    "f07-provider-response-lost/current", "f07-provider-response-lost/candidate",
  ]);
  expect(prompts).toHaveLength(6);
  expect(rows.map(r => r.startedAt)).toEqual([100_000, 110_000, 120_000, 130_000, 140_000, 150_000]);
  for (const pair of plan.pairs) expect(pair.current.input).toBe(pair.candidate.input);
  expect(rows.map(r => r.consistencyIssues)).toEqual([
    ["known_delivery_marked_unknown"], ["known_delivery_marked_unknown"],
    ["known_delivery_marked_unknown"], ["known_delivery_marked_unknown"], [], [],
  ]);
  const raw = JSON.parse(await readFile(join(out, "attempt-1.json"), "utf8"));
  expect(raw.output).toEqual(frozen);
  expect(raw.consistencyIssues).toBeNull();
  await expect(executeCausalPilot(plan, out, { close: async () => {}, generate: async () => { throw new Error(); } }, { resume: true })).rejects.toThrow("v2 cannot resume");
});

test("frozen v1 prompts remain reproducible", async () => {
  const saved = JSON.parse(await readFile(join(run, "plan.json"), "utf8"));
  const plan = await prepareCausalPilot();
  expect(plan).toEqual(saved);
});

test("unknown delivery with a defect cannot pass the existing service as correction or replay", async () => {
  const plan = await prepareCausalPilot("v2");
  const pair = plan.pairs[2]!;
  const evidence = structuredClone(pair.evidence);
  if (evidence.failureContext.simulated) evidence.failureContext.fixture_observation.observed_facts.push("destination_format_invalid");
  const value = investigation();
  value.proposal.evidence_refs = [evidence.failureContext.evidence_id];
  value.diagnosis.evidence_refs = value.proposal.evidence_refs;
  value.diagnosis.missing_evidence = [...new Set(Object.values(evidence).flatMap(e => e.unavailable))];
  value.proposal.runbook_citations = [];
  const service = () => buildDiagnosisService({
    getFailureContext: async () => evidence.failureContext,
    getExecutionEvidence: async () => evidence.executionEvidence,
    validateActionInputs: async () => evidence.inputValidation,
    searchRunbooks: async () => pair.retrieval.matches,
  }, { close: async () => {}, generate: async () => ({ output: value, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }) }, { allowSimulatedEvidence: true, maxRepairAttempts: 0 });
  value.proposal.disposition = "owner_action_required";
  value.proposal.kind = "request_manual_fix";
  expect(repairEvidenceIssue(evidence, value)).toBeNull();
  await expect(service().diagnose()).rejects.toThrow();
  value.proposal.disposition = "replay_candidate";
  value.proposal.kind = "wait_then_replay";
  await expect(service().diagnose()).rejects.toThrow();
  value.status = "abstained";
  value.proposal.disposition = "outcome_unknown";
  value.proposal.kind = "escalate";
  await expect(service().diagnose()).resolves.toBeDefined();
});

test("v2 preserves a provider failure and stops without replacement generations", async () => {
  const plan = await prepareCausalPilot("v2");
  const out = await mkdtemp(join(tmpdir(), "causal-v2-stop-"));
  let calls = 0;
  const rows = await executeCausalPilot(plan, out, {
    close: async () => {}, generate: async () => { calls++; throw new Error("provider blocked"); },
  });
  expect(calls).toBe(1);
  expect(rows).toHaveLength(1);
  expect(JSON.parse(await readFile(join(out, "result-1.json"), "utf8")).failure).toBe("generation_failed");
  await expect(executeCausalPilot(plan, out, { close: async () => {}, generate: async () => { calls++; throw new Error(); } })).rejects.toThrow("already attempted");
  expect(calls).toBe(1);
});

test("six-generation provider audit counts preflights separately, spaces starts and blocks a seventh", async () => {
  const out = await mkdtemp(join(tmpdir(), "causal-v2-audit-"));
  let now = 100_000, calls = 0;
  const audit = await pilotFetch(out, { generationLimit: 6, now: () => now,
    sleep: async ms => { now += ms; }, fetch: async () => { calls++; return new Response("{}", { status: 200 }); } });
  const base = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:";
  for (let i = 0; i < 6; i++) { await audit(base + "countTokens"); await audit(base + "generateContent"); }
  await expect(audit(base + "generateContent")).rejects.toThrow("six-generation");
  expect(calls).toBe(12);
  const events = (await readFile(join(out, "requests.jsonl"), "utf8")).trim().split("\n").map(l => JSON.parse(l));
  expect(events.filter(e => e.phase === "start" && e.operation === "countTokens")).toHaveLength(6);
  expect(events.filter(e => e.phase === "start" && e.operation === "generateContent").map(e => e.at)).toEqual([100_000, 110_000, 120_000, 130_000, 140_000, 150_000]);
});
