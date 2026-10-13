// Offline artifact preparation/re-evaluation only. No provider adapter is instantiated.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { IntegratedModelOutputSchema } from "../../src/contracts.ts";
import { diagnosisConsistencyIssues, repairEvidenceIssue } from "../../src/evaluation/causal-diagnosis.ts";
import { prepareCausalPilot } from "../../src/evaluation/causal-pilot.ts";
import { pilotHash } from "../../src/evaluation/oracle-pilot.ts";

const root = join(import.meta.dir, "../../../..");
const directory = join(import.meta.dir, "runs/prepared-causal-v2-20261013");
const frozen = join(import.meta.dir, "runs/free-causal-pilot-20261013-v1");
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const plan = await prepareCausalPilot("v2");
const savedPlan = JSON.parse(await readFile(join(directory, "plan.json"), "utf8"));
if (pilotHash(plan) !== pilotHash(savedPlan)) throw new Error("Prepared v2 plan changed");
const frozenHashes: Record<string, string> = {};
for (const name of await readdir(frozen)) frozenHashes[name] = hash(await readFile(join(frozen, name), "utf8"));
const rows = [];
for (let slot = 1; slot <= 4; slot++) {
  const row = JSON.parse(await readFile(join(frozen, `result-${slot}.json`), "utf8"));
  const evidence = plan.pairs.find(p => p.caseId === row.caseId)!.evidence;
  const output = IntegratedModelOutputSchema.safeParse(row.output);
  rows.push({ slot, caseId: row.caseId, variant: row.variant, failure: row.failure,
    schemaValid: output.success, originalServiceValid: row.serviceValid,
    consistencyIssues: output.success ? diagnosisConsistencyIssues(evidence, output.data) : null,
    repairEvidenceIssue: output.success ? repairEvidenceIssue(evidence, output.data) : null,
    limitation: "Contract consistency and narrow repair support only; no semantic adjudication." });
}
const paths = [
  "apps/ai_agent/src/evaluation/causal-diagnosis.ts", "apps/ai_agent/src/evaluation/causal-pilot.ts",
  "apps/ai_agent/src/evaluation/oracle-pilot.ts", "apps/ai_agent/tests/causal-consistency.test.ts",
  "apps/ai_agent/evaluation/causal-diagnosis/review-v2.ts",
  "apps/ai_agent/src/prompts.ts", "apps/ai_agent/src/contracts.ts", "apps/ai_agent/src/graph.ts",
  "apps/ai_agent/src/gemini-model.ts",
];
const sourceHashes: Record<string, string> = {};
for (const path of paths) sourceHashes[path] = hash(await readFile(join(root, path), "utf8"));
const v4 = join(root, "apps/ai_agent/evaluation/phase-11a-baseline-v4");
const cases = await readFile(join(v4, "cases.json"), "utf8");
const manifest = JSON.parse(await readFile(join(v4, "manifest.json"), "utf8"));
const record = {
  status: "prepared_not_executed", recordedAt: new Date().toISOString(),
  codeRevision: execFileSync("rtk", ["git", "rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  workingTree: "dirty; pre-existing untracked experiments, Prisma and Graphify edits excluded",
  providerRequests: 0, generationsIssued: 0, tokenPreflightsIssued: 0,
  planHash: pilotHash(plan), sourceHashes, frozenV1ArtifactHashes: frozenHashes,
  pairs: plan.pairs.map((p, i) => ({ caseId: p.caseId, split: "development",
    order: i % 2 === 0 ? ["current", "candidate"] : ["candidate", "current"],
    evidenceHash: pilotHash(p.evidence), retrievalHash: pilotHash(p.retrieval),
    currentPromptHash: pilotHash(p.current), candidatePromptHash: pilotHash(p.candidate),
    inputIdentical: p.current.input === p.candidate.input })),
  frozenV1Reevaluation: rows,
  existingV4Failure: { expected: manifest.artifact_hashes["cases.json"], actual: hash(cases), normalizedLF: hash(cases.replace(/\r\n/g, "\n")) },
};
await writeFile(join(directory, "offline-review-final-2.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log("Saved offline review and source hashes; zero provider requests.");
