// Offline saved-output experiment. No provider, prompt builder, credentials or labels.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CapturedEvaluationContextSchema } from "./checks.ts";
import { evaluateRepairAcceptance, type RepairCategory } from "./repair-acceptance.ts";
import { repairAcceptanceControls } from "./repair-acceptance-controls.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const out = join(root, "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
type Review = { categories: RepairCategory[]; repair: "supported" | "unsupported" | "not_applicable" | "not_assessed" | "unmeasured";
  legitimateRepair: boolean | null; targetedInvestigation: boolean; note: string };
const destination = (supported: boolean): Review => ({ categories: ["destination_format"], repair: supported ? "supported" : "unsupported",
  legitimateRepair: supported, targetedInvestigation: false,
  note: supported ? "Correction is justified by the separate fixture format finding, not the error text. No replacement value or replay is proposed." : "Correction is asserted from ambiguous resolver wording without an independent defect finding." });
const unknown: Review = { categories: [], repair: "not_applicable", legitimateRepair: null, targetedInvestigation: false, note: "Outcome reconciliation preserves unknown delivery and proposes no owner correction." };
// Direct agent annotations of proposal text and supplied facts, with variants visible.
// These scope annotations are NOT expected taxonomy/policy labels or evaluator facts.
const sources = [
  { name: "causal-v1", path: "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1",
    reviews: [destination(false), { ...unknown, targetedInvestigation: true, note: "Investigation advice is appropriate, but the known-rejection output wrongly uses outcome_unknown." },
      { ...unknown, repair: "unmeasured" as const, note: "HTTP 503: no model output; no semantic conclusion." }, destination(true)] },
  { name: "causal-v2", path: "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013",
    reviews: [destination(false), destination(false), destination(true), destination(true), unknown, unknown] },
  { name: "oracle", path: "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1",
    reviews: [{ ...destination(false), categories: ["destination_format", "input_requirements"] as RepairCategory[], note: "Proposes destination or input-mapping correction without either independent finding; the saved evidence reference is also invalid." }, destination(false), unknown, unknown] },
];
const sourceHashes: Record<string, string> = {};
const readSource = async (path: string) => {
  const text = await readFile(join(root, path), "utf8"); sourceHashes[path] = hash(text); return JSON.parse(text);
};
const counts = (rows: Array<{ review: Review; evaluation: Awaited<ReturnType<typeof evaluateRepairAcceptance>> | null }>) => ({
  total: rows.length,
  supportedRepairAccepted: rows.filter(r => r.review.repair === "supported" && r.evaluation?.experimentalAcceptance === "accepted").length,
  unsupportedRepairRejected: rows.filter(r => r.review.repair === "unsupported" && r.evaluation?.experimentalAcceptance === "rejected").length,
  legitimateRepairIncorrectlyRejected: rows.filter(r => r.review.legitimateRepair === true && r.evaluation?.experimentalAcceptance === "rejected").length,
  unsupportedRepairIncorrectlyAccepted: rows.filter(r => r.review.repair === "unsupported" && r.evaluation?.experimentalAcceptance === "accepted").length,
  notAssessed: rows.filter(r => r.evaluation?.repairSupport.status === "not_assessed").length,
  targetedInvestigationPreserved: rows.filter(r => r.review.targetedInvestigation && r.evaluation?.experimentalAcceptance === "accepted").length,
  targetedInvestigationRawPreserved: rows.filter(r => r.review.targetedInvestigation && r.evaluation).length,
  deliveryConsistencyViolations: rows.filter(r => r.evaluation?.deliveryConsistency?.length).length,
  unavailableOutputs: rows.filter(r => !r.evaluation).length,
});

if (import.meta.main) {
  await mkdir(out, { recursive: true });
  // Refuse to overwrite an earlier report. Individual outputs also use exclusive writes.
  await writeFile(join(out, "started.json"), json({ at: new Date().toISOString(), externalModelCalls: 0 }), { flag: "wx" });
  const contexts = CapturedEvaluationContextSchema.array().parse(await readSource("apps/ai_agent/evaluation/phase-11a-baseline-v6/contexts.json"));
  const savedRows = [];
  for (const source of sources) {
    const plan = await readSource(`${source.path}/plan.json`);
    for (const [index, review] of source.reviews.entries()) {
      const raw = await readSource(`${source.path}/result-${index + 1}.json`);
      const name = `${source.name}-${index + 1}`;
      // Preserve original output/failure before wrapper evaluation, including the 503.
      await writeFile(join(out, `${name}-raw.json`), json(raw), { flag: "wx" });
      const pair = plan.pairs.find((p: { caseId: string }) => p.caseId === raw.caseId);
      if (!pair) throw new Error("Saved result lacks its original evidence pair");
      const matches = source.name === "oracle" ? pair[raw.variant] : pair.retrieval.matches;
      const evaluation = raw.output === null ? null : await evaluateRepairAcceptance(pair.evidence, matches, raw.output, review.categories);
      const row = { name, caseId: raw.caseId, variant: raw.variant, originalServiceAccepted: raw.serviceValid,
        originalFailure: raw.failure, review, evaluation };
      await writeFile(join(out, `${name}-assessment.json`), json(row), { flag: "wx" });
      savedRows.push(row);
    }
  }
  const controlRows = [];
  for (const [index, control] of repairAcceptanceControls(contexts).entries()) {
    const review: Review = { categories: control.categories, repair: control.reviewRepair,
      // Independently established repair with unknown delivery remains ineligible.
      legitimateRepair: control.reviewRepair === "supported" && control.name !== "unknown delivery overrides supported repair",
      targetedInvestigation: control.name === "known rejection with targeted investigation" || control.name === "conflicting delivery overrides investigation route",
      note: control.reviewNote };
    await writeFile(join(out, `control-${index + 1}-raw.json`), json({ name: control.name, synthetic: true, evidence: control.evidence, output: control.output }), { flag: "wx" });
    const evaluation = await evaluateRepairAcceptance(control.evidence, [], control.output, control.categories);
    const row = { name: control.name, review, evaluation };
    await writeFile(join(out, `control-${index + 1}-assessment.json`), json(row), { flag: "wx" });
    controlRows.push(row);
  }
  for (const path of ["apps/ai_agent/src/evaluation/repair-acceptance.ts", "apps/ai_agent/src/evaluation/repair-acceptance-controls.ts", "apps/ai_agent/src/evaluation/repair-acceptance-pilot.ts", "apps/ai_agent/tests/repair-acceptance.test.ts",
    "apps/ai_agent/src/evaluation/causal-diagnosis.ts", "apps/ai_agent/src/graph.ts", "apps/ai_agent/src/contracts.ts", "apps/ai_agent/src/prompts.ts"]) {
    sourceHashes[path] = hash(await readFile(join(root, path), "utf8"));
  }
  const report = { experiment: "offline-repair-acceptance-v1", at: new Date().toISOString(), externalModelCalls: 0,
    reviewMethod: "Direct agent annotations, variants visible, no benchmark labels; no independent/blinded semantic calibration",
    scope: "Reviewer-scoped bounded destination-format fixture findings and deterministic input requirements; all other repair claims not assessed",
    counts: { savedOutputs: counts(savedRows), syntheticControls: counts(controlRows) }, sourceHashes, savedRows, controlRows,
    recommendation: "Coverage is insufficient for universal or autonomous integration. Next: independently annotate all existing development capture proposals for category and boundedness, then replay this check offline without prompts or provider calls." };
  await writeFile(join(out, "report.json"), json(report), { flag: "wx" });
  console.log(json(report.counts));
}
