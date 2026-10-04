import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadExperiment } from "../../src/evaluation/model-experiment.ts";
import { runEvaluation, renderEvaluationReport } from "../../src/evaluation/experiment.ts";
import type { RunbookIndex } from "../../src/tools/search-runbooks.ts";

// Run from the repository root. This script has no model adapter or live mode.
const audit = "apps/ai_agent/evaluation/phase-11a-v5-audit";
const baseline = "apps/ai_agent/evaluation/phase-11a-baseline-v5";
const hash = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
const freeze = JSON.parse(await readFile(join(audit, "freeze.json"), "utf8"));
let checkoutByteMatches = 0;
for (const [path, expected] of Object.entries(freeze.files) as [string, { sha256_bytes: string; sha256_lf: string }][]) {
  const data = await readFile(path);
  if (hash(data) === expected.sha256_bytes) checkoutByteMatches++;
  assert.equal(hash(data.toString("utf8").replaceAll("\r\n", "\n")), expected.sha256_lf, `Frozen content changed: ${path}`);
}
// Git's Windows checkout converted capture artifacts to CRLF. Restore only the
// capture's line endings in a separate ignored directory; validate original hashes.
const local = "apps/ai_agent/evaluation/local";
await mkdir(local, { recursive: true });
const copy = await mkdtemp(join(local, "v5-audit-"));
const manifest = JSON.parse(await readFile(join(baseline, "manifest.json"), "utf8"));
for (const name of ["manifest.json", ...Object.keys(manifest.artifact_hashes)]) {
  const text = (await readFile(join(baseline, name), "utf8")).replaceAll("\r\n", "\n");
  if (name !== "manifest.json") assert.equal(hash(text), manifest.artifact_hashes[name], `Capture artifact changed: ${name}`);
  await writeFile(join(copy, name), text, { flag: "wx" });
}
const run = await loadExperiment(copy);
const index: RunbookIndex = run.corpus.map(section => ({
  ...section,
  headingTerms: new Set(section.headingTerms),
  contentTerms: new Set(section.contentTerms),
}));
// Original Phase 11 acceptance rules, with Phase 11A's actual captured context.
// Do not use the legacy CLI: its synthetic evidence IDs cannot score this capture.
const report = await runEvaluation(run.cases, index, {
  observations: run.observations, contexts: run.contexts,
  model: run.manifest.model, acceptanceContract: "frozen-v1",
});
assert.deepEqual(report, JSON.parse(await readFile(join(baseline, "frozen-v1-rescore.json"), "utf8")));
const failures = report.rows.filter(row => !row.modelForbidden && !row.accepted);
const evidence = failures.map(row => {
  const item = run.cases.find(item => item.case_id === row.caseId)!;
  const observation = run.observations.find(item => item.case_id === row.caseId)!;
  const context = run.contexts.find(item => item.case_id === row.caseId)!;
  return { case_id: row.caseId, original_evaluation: row,
    expected_diagnoses: item.expected_diagnoses, expected_policy: item.expected_policy,
    actual_result: observation.result, supplied_evidence: context.evidence,
    supplied_retrieval: context.retrieval };
});
const generated = {
  "original-report.json": JSON.stringify(report, null, 2) + "\n",
  "original-report.md": renderEvaluationReport(report),
  "failure-evidence.json": JSON.stringify(evidence, null, 2) + "\n",
};
for (const [name, text] of Object.entries(generated)) {
  if (process.argv.slice(2).includes("--write")) await writeFile(join(audit, name), text, { flag: "wx" });
  else assert.equal((await readFile(join(audit, name), "utf8")).replaceAll("\r\n", "\n"), text, `Audit result changed: ${name}`);
}
const metrics = report.splits.development!;
console.log(JSON.stringify({ reproduced: true, frozenFiles: Object.keys(freeze.files).length,
  checkoutByteMatches, acceptance: metrics.diagnosisAcceptance, retrieval: metrics.retrievalRecallAt3,
  safetyViolations: report.safety.violations, probesPassed: report.safety.probes.filter(p => p.passed).length,
  controls: report.rows.filter(r => r.modelForbidden).map(r => ({ caseId: r.caseId, modelInvocations: r.modelInvocations })),
  failures: failures.map(r => ({ caseId: r.caseId, issues: r.issues })) }));
