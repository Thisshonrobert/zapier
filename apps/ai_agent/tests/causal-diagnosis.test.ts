import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildDiagnosisPrompt } from "../src/prompts.ts";
import { buildCausalDiagnosisPrompt, repairEvidenceIssue } from "../src/evaluation/causal-diagnosis.ts";
import type { CapturedEvaluationContext } from "../src/evaluation/checks.ts";
import type { IntegratedModelOutput } from "../src/contracts.ts";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { confirmFreeTier, prepareCausalPilot, executeCausalPilot } from "../src/evaluation/causal-pilot.ts";
import { stubDiagnosis } from "../src/evaluation/agentic-experiment.ts";
import { pilotHash } from "../src/evaluation/oracle-pilot.ts";

const contexts: CapturedEvaluationContext[] = JSON.parse(await readFile(join(import.meta.dir, "../evaluation/phase-11a-baseline-v6/contexts.json"), "utf8"));
const context = (id: string) => contexts.find(c => c.case_id === id)!;
const ambiguous = context("f03-permission-ambiguous");
const confirmed = context("f04-invalid-destination");
function output(c: CapturedEvaluationContext): IntegratedModelOutput {
  return {
    status: "completed",
    diagnosis: { taxonomy_id: "F04", summary: "The destination is defective.", confidence: "high", evidence_refs: [c.evidence!.failureContext.evidence_id], alternate_explanations: [], missing_evidence: Object.values(c.evidence!).flatMap(e => e.unavailable) },
    proposal: { disposition: "owner_action_required", kind: "request_manual_fix", summary: "Correct the destination.", reasons: ["Destination format is invalid."], evidence_refs: [c.evidence!.failureContext.evidence_id], runbook_citations: [], preconditions: [] },
  };
}

test("generic resolver error and runbook membership cannot justify owner correction", () => {
  const value = output(ambiguous);
  value.proposal.runbook_citations = ambiguous.retrieval!.matches.map(m => m.citation);
  expect(repairEvidenceIssue(ambiguous.evidence!, value)).toBe("unsupported_owner_repair");
  // Changing taxonomy is not evidence.
  value.diagnosis.taxonomy_id = "F03";
  expect(repairEvidenceIssue(ambiguous.evidence!, value)).toBe("unsupported_owner_repair");
});

test("confirmed format defect supports a bounded repair despite missing replay evidence", () => {
  expect(repairEvidenceIssue(confirmed.evidence!, output(confirmed))).toBeNull();
  const withoutDefect = structuredClone(confirmed.evidence!);
  if (withoutDefect.failureContext.simulated) withoutDefect.failureContext.fixture_observation.observed_facts = [];
  expect(repairEvidenceIssue(withoutDefect, output(confirmed))).toBe("unsupported_owner_repair");
});

test("repair must cite the evidence carrying the defect", () => {
  const value = output(confirmed);
  value.proposal.evidence_refs = [confirmed.evidence!.executionEvidence.evidence_id];
  expect(repairEvidenceIssue(confirmed.evidence!, value)).toBe("unsupported_owner_repair");
});

test("supported classification and targeted investigation do not require blanket abstention", () => {
  const value = output(ambiguous);
  value.diagnosis.taxonomy_id = "F03";
  value.diagnosis.confidence = "low";
  value.proposal.disposition = "engineering_escalation_required";
  value.proposal.kind = "escalate";
  expect(repairEvidenceIssue(ambiguous.evidence!, value)).toBeNull();
  expect(value.status).toBe("completed");
});

test("candidate changes instructions only and retains production and frozen prompt behavior", () => {
  const current = buildDiagnosisPrompt(ambiguous.evidence!, ambiguous.retrieval!.matches);
  const candidate = buildCausalDiagnosisPrompt(ambiguous.evidence!, ambiguous.retrieval!.matches);
  expect(candidate.input).toBe(current.input);
  expect(candidate.instructions).not.toBe(current.instructions);
  expect(buildDiagnosisPrompt(ambiguous.evidence!, ambiguous.retrieval!.matches)).toEqual(current);
});

test("explicit validation finding supports repair but blocked validation does not", () => {
  const evidence = structuredClone(ambiguous.evidence!);
  const value = output(ambiguous);
  value.proposal.evidence_refs = [evidence.inputValidation.evidence_id];
  Object.assign(evidence.inputValidation.facts, { validation_status: "invalid", supported: true, missing_template_paths: ["customer.channel"] });
  expect(repairEvidenceIssue(evidence, value)).toBeNull();
  evidence.inputValidation.facts.validation_status = "blocked";
  expect(repairEvidenceIssue(evidence, value)).toBe("unsupported_owner_repair");
});

test("pilot makes exactly four initial attempts, keeps retrieval fixed and refuses replay of its slots", async () => {
  const plan = await prepareCausalPilot();
  const out = await mkdtemp(join(tmpdir(), "causal-pilot-"));
  let now = 100_000;
  const rows = await executeCausalPilot(plan, out, stubDiagnosis, { now: () => now, sleep: async ms => { now += ms; } });
  expect(rows.map(r => `${r.caseId}/${r.variant}`)).toEqual([
    "f03-permission-ambiguous/current", "f03-permission-ambiguous/candidate",
    "f04-invalid-destination/candidate", "f04-invalid-destination/current",
  ]);
  expect(rows.map(r => r.startedAt)).toEqual([100_000, 110_000, 120_000, 130_000]);
  expect(rows[0]!.retrievalHash).toBe(rows[1]!.retrievalHash);
  expect(rows[2]!.retrievalHash).toBe(rows[3]!.retrievalHash);
  await expect(executeCausalPilot(plan, out, stubDiagnosis)).rejects.toThrow("already attempted");
});

test("pilot stops after provider failure without repair or fallback", async () => {
  const plan = await prepareCausalPilot();
  const out = await mkdtemp(join(tmpdir(), "causal-failure-"));
  const rows = await executeCausalPilot(plan, out, { close: async () => {}, generate: async () => { throw new Error("private provider details"); } });
  expect(rows).toHaveLength(1);
  expect(rows[0]!.failure).toBe("generation_failed");
  expect(await readFile(join(out, "result-1.json"), "utf8")).not.toContain("private provider details");
  const resumed = await executeCausalPilot(plan, out, stubDiagnosis, { resume: true, now: () => 200_000, sleep: async () => {} });
  expect(resumed.map(r => `${r.caseId}/${r.variant}`)).toEqual([
    "f03-permission-ambiguous/candidate", "f04-invalid-destination/candidate", "f04-invalid-destination/current",
  ]);
  expect(JSON.parse(await readFile(join(out, "result-1.json"), "utf8")).failure).toBe("generation_failed");
});

test("free-tier gate rejects stale confirmation, a changed key and non-free access", () => {
  const value = { verifiedAt: 100_000, project: "gen-lang-client-0124525712", model: "gemini-3.5-flash-lite", keyHash: pilotHash("offline-key"), freeTier: true, freeGeneration: true };
  expect(() => confirmFreeTier(value, "offline-key", 100_000)).not.toThrow();
  expect(() => confirmFreeTier(value, "changed-key", 100_000)).toThrow("confirmation");
  expect(() => confirmFreeTier(value, "offline-key", 3_700_001)).toThrow("confirmation");
  expect(() => confirmFreeTier({ ...value, freeTier: false }, "offline-key", 100_000)).toThrow("confirmation");
});

test("explicit reuse accepts saved free-tier evidence but still binds the project, key and free access", () => {
  const value = { verifiedAt: 100_000, project: "gen-lang-client-0124525712", model: "gemini-3.5-flash-lite", keyHash: pilotHash("offline-key"), freeTier: true, freeGeneration: true };
  expect(() => confirmFreeTier(value, "offline-key", 3_700_001, true)).not.toThrow();
  expect(() => confirmFreeTier(value, "changed-key", 3_700_001, true)).toThrow("confirmation");
  expect(() => confirmFreeTier({ ...value, freeGeneration: false }, "offline-key", 3_700_001, true)).toThrow("confirmation");
});
