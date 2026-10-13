import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CapturedEvaluationContext } from "../src/evaluation/checks.ts";
import { evaluateRepairAcceptance } from "../src/evaluation/repair-acceptance.ts";
import { repairAcceptanceControls } from "../src/evaluation/repair-acceptance-controls.ts";

const contexts: CapturedEvaluationContext[] = JSON.parse(await readFile(join(import.meta.dir, "../evaluation/phase-11a-baseline-v6/contexts.json"), "utf8"));

test("preserves the raw response and separates service acceptance from experimental rejection", async () => {
  const row = JSON.parse(await readFile(join(import.meta.dir, "../evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-2.json"), "utf8"));
  const context = contexts.find(c => c.case_id === row.caseId)!;
  const before = JSON.stringify(row.output);
  const result = await evaluateRepairAcceptance(context.evidence!, context.retrieval!.matches, row.output, ["destination_format"]);
  expect(result.rawOutput).toEqual(row.output);
  expect(JSON.stringify(row.output)).toBe(before);
  expect(result.serviceAcceptance.accepted).toBe(true);
  expect(result.deliveryConsistency).toEqual([]);
  expect(result.repairSupport.status).toBe("unsupported");
  expect(result.experimentalAcceptance).toBe("rejected");
  expect(result.externalModelCalls).toBe(0);
});

for (const control of repairAcceptanceControls(contexts)) {
  test(control.name, async () => {
    const result = await evaluateRepairAcceptance(control.evidence, [], control.output, control.categories);
    expect(result.repairSupport.status).toBe(control.expectedRepairSupport);
    expect(result.experimentalAcceptance).toBe(control.expectedAcceptance);
    expect(result.rawOutput).toEqual(control.output);
    if (control.expectedConsistencyIssue) expect(result.deliveryConsistency).toContain(control.expectedConsistencyIssue);
    if (control.name === "synthetic real-contract missing template") {
      expect(result.repairSupport.assessments[0]!.provenance).toBe("production_contract_validation");
    }
    if (control.name === "fixture format with carrying citation") {
      expect(result.repairSupport.assessments[0]!.provenance).toBe("controlled_fixture_only");
    }
  });
}

test("malformed output is preserved and rejected without a fallback", async () => {
  const context = contexts.find(c => c.evidence)!;
  const raw = { proposal: "invalid" };
  const result = await evaluateRepairAcceptance(context.evidence!, [], raw, []);
  expect(result.rawOutput).toEqual(raw);
  expect(result.schemaValid).toBe(false);
  expect(result.experimentalAcceptance).toBe("rejected");
  expect(result.repairSupport.status).toBe("not_assessed");
});
