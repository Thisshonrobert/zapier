import { expect, test } from "bun:test";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { buildDiagnosisService } from "../src/graph.ts";
import { IntegratedDiagnosisResultSchema } from "../src/contracts.ts";
import { createFixtureTools, fixtureInput } from "../src/evaluation/fixture-tools.ts";
import { checkEvaluationObservation, loadEvaluationCases } from "../src/evaluation/checks.ts";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";
import { loadExperiment, evaluateExperiment, runModelExperiment, compareExperiments } from "../src/evaluation/model-experiment.ts";
import type { IntegratedModelOutput, DiagnosisPrompt } from "../src/contracts.ts";

const cases = await loadEvaluationCases(join(import.meta.dir, "../evaluation/cases.jsonl"));
const index = await loadRunbooks(join(import.meta.dir, "../../../docs/AI/runbooks"));
const invocations = JSON.parse(await readFile(join(import.meta.dir, "../evaluation/phase-11a-baseline-v4/invocations.json"), "utf8"));
const usage = { input_tokens: 10, output_tokens: 10, total_tokens: 20 };
const itemFor = (id: string) => cases.find(item => item.case_id === id)!;
function outputFor(id: string): IntegratedModelOutput {
  return structuredClone(invocations.find((call: {case_id: string}) => call.case_id === id).output);
}

test("missing-evidence repair supplies the full exact disclosure list to the model", async () => {
  const id = "f07-provider-response-lost";
  const fixture = createFixtureTools(fixtureInput(itemFor(id)), index, "2026-10-03T00:00:00.000Z");
  let calls = 0;
  const service = buildDiagnosisService(fixture.tools, {
    close: async () => {},
    generate: async (prompt) => {
      calls++;
      const input = JSON.parse(prompt.input);
      const output = outputFor(id);
      if (calls === 2) {
        expect(input.repair.issue).toBe("unacknowledged_missing_evidence");
        expect(input.repair.required_missing_evidence).toEqual(input.required_missing_evidence);
        output.diagnosis.missing_evidence = input.repair.required_missing_evidence;
        output.status = "abstained";
        output.proposal.disposition = "outcome_unknown";
        output.proposal.kind = "escalate";
      }
      return { output, usage };
    },
  }, { allowSimulatedEvidence: true });
  const result = await service.diagnose();
  expect(calls).toBe(2);
  expect(result.diagnosis.missing_evidence).toEqual([...new Set(Object.values(fixture.bundle).flatMap(e => e.unavailable))]);
});

for (const id of ["f01-rate-limit-rejected", "f02-connection-refused", "f05-handler-version-unknown"]) {
  test(`${id}: platform repair cannot be assigned to the customer`, async () => {
    const fixture = createFixtureTools(fixtureInput(itemFor(id)), index, "2026-10-03T00:00:00.000Z");
    let calls = 0;
    const result = await buildDiagnosisService(fixture.tools, {
      close: async () => {},
      generate: async (prompt) => {
        calls++;
        const output = outputFor(id);
        if (prompt.repair) {
          expect(prompt.repair.issue).toBe("platform_ownership_requires_escalation");
          output.status = "completed";
          output.proposal.disposition = "engineering_escalation_required";
          output.proposal.kind = "escalate";
        }
        return { output, usage };
      },
    }, { allowSimulatedEvidence: true }).diagnose();
    expect(calls).toBe(2);
    expect(result.proposal.disposition).toBe("engineering_escalation_required");
  });
}

test("changing the model taxonomy cannot assign observed handler defects to the customer", async () => {
  const id = "f05-handler-version-unknown";
  const fixture = createFixtureTools(fixtureInput(itemFor(id)), index, "2026-10-03T00:00:00.000Z");
  const output = outputFor(id);
  output.diagnosis.taxonomy_id = "F04";
  await expect(buildDiagnosisService(fixture.tools, {
    close: async () => {}, generate: async () => ({ output, usage }),
  }, { allowSimulatedEvidence: true }).diagnose()).rejects.toThrow("invalid output");
});

for (const id of ["f10-sdk-error-recorded-success", "s05-expired-email-dedup-window"]) {
  test(`${id}: unknown delivery repair supplies the exact abstention combination`, async () => {
    const fixture = createFixtureTools(fixtureInput(itemFor(id)), index, "2026-10-03T00:00:00.000Z");
    let calls = 0;
    const result = await buildDiagnosisService(fixture.tools, {
      close: async () => {},
      generate: async (prompt: DiagnosisPrompt) => {
        calls++;
        const input = JSON.parse(prompt.input);
        const output = outputFor(id);
        if (prompt.repair) {
          expect(input.required_delivery_route).toEqual({status: "abstained", disposition: "outcome_unknown", kind: "escalate"});
          expect(input.repair.guidance).toContain("outcome_unknown");
          output.status = input.required_delivery_route.status;
          Object.assign(output.proposal, { disposition: input.required_delivery_route.disposition, kind: input.required_delivery_route.kind });
        }
        return { output, usage };
      },
    }, { allowSimulatedEvidence: true }).diagnose();
    expect(calls).toBe(2);
    expect(result.status).toBe("abstained");
    expect(result.proposal.disposition).toBe("outcome_unknown");
  });
}

test("advisory-v2 accepts supported routes without relabeling the original gate or permitting replay", async () => {
  const selected = ["f01-rate-limit-rejected", "f02-connection-refused", "f04-template-path-missing", "f04-invalid-destination"];
  const before = JSON.stringify(cases);
  const run = await runModelExperiment({
    allCases: cases, index, modelId: "offline-stub", caseIds: selected,
    acceptanceContract: "advisory-v2", settings: { minCallIntervalMs: 0 },
    model: {
      close: async () => {},
      generate: async (prompt) => {
        const { evidence } = JSON.parse(prompt.input);
        // Synthetic source IDs are not fixture labels; use the supplied evidence ref.
        const caseId = evidence.failureContext.evidence_id.replace("fixture:failure:", "");
        const output = outputFor(caseId);
        if (caseId.startsWith("f01") || caseId.startsWith("f02")) {
          output.proposal.disposition = "engineering_escalation_required";
          output.proposal.kind = "escalate";
        }
        return { output, usage };
      },
    },
  });
  expect(run.manifest.acceptance_contract).toBe("advisory-v2");
  const report = await evaluateExperiment(run);
  expect(report.acceptanceContract).toBe("advisory-v2");
  expect(report.rows.every(row => row.accepted)).toBe(true);
  expect(report.safety.violations).toBe(0);
  const frozenRun = JSON.stringify(run);
  const rescore = await evaluateExperiment(run, "frozen-v1");
  expect(rescore.rows.every(row => !row.accepted)).toBe(true);
  expect(rescore.acceptanceContract).toBeUndefined();
  expect(JSON.stringify(run)).toBe(frozenRun);
  const original = structuredClone(run);
  delete original.manifest.acceptance_contract;
  const legacy = await evaluateExperiment(original);
  expect(legacy.rows.every(row => !row.accepted)).toBe(true);
  expect((await compareExperiments(original, run)).incompatible).toContain("acceptance_contract");
  for (const observation of run.observations) {
    const context = run.contexts.find(row => row.case_id === observation.case_id)!;
    const result = IntegratedDiagnosisResultSchema.parse(structuredClone(observation.result));
    result.proposal.disposition = "replay_candidate";
    result.proposal.kind = "wait_then_replay";
    const check = checkEvaluationObservation(itemFor(observation.case_id), {...observation, result}, context.retrieval!.matches.map(m => m.citation), context, "advisory-v2");
    expect(check.safetyIssues).toContain("simulated_replay_candidate");
    if (observation.case_id.startsWith("f01") || observation.case_id.startsWith("f02")) {
      result.proposal.disposition = "owner_action_required";
      result.proposal.kind = "request_manual_fix";
      expect(checkEvaluationObservation(itemFor(observation.case_id), {...observation, result}, context.retrieval!.matches.map(m => m.citation), context, "advisory-v2").qualityIssues).toContain("unexpected_disposition");
      expect(checkEvaluationObservation(itemFor(observation.case_id), {...observation, result}, context.retrieval!.matches.map(m => m.citation), context, "advisory-v2").safetyIssues).toContain("platform_ownership_requires_escalation");
    } else {
      const withoutOwnership = structuredClone(context);
      withoutOwnership.evidence!.failureContext.fixture_observation.observed_facts = [];
      expect(checkEvaluationObservation(itemFor(observation.case_id), observation, context.retrieval!.matches.map(m => m.citation), withoutOwnership, "advisory-v2").qualityIssues).toContain("unexpected_disposition");
    }
  }
  expect(JSON.stringify(cases)).toBe(before);
});

test("V4 frozen artifacts still reproduce under their original prompt and acceptance contract", async () => {
  const report = await evaluateExperiment(await loadExperiment(join(import.meta.dir, "../evaluation/phase-11a-baseline-v4")));
  expect(report.splits.development!.diagnosisAcceptance.numerator).toBe(8);
  expect(report.splits.development!.schemaValidity.numerator).toBe(13);
});

