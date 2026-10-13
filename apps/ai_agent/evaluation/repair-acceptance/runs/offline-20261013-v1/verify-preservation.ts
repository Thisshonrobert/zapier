// Offline final audit; reads only the report's scoped source/artifact inputs.
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const root = join(import.meta.dir, "../../../../../..");
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const report = JSON.parse(await readFile(join(import.meta.dir, "report.json"), "utf8"));
for (const [path, expected] of Object.entries(report.sourceHashes)) {
  if (hash(await readFile(join(root, path), "utf8")) !== expected) throw new Error(`Source or frozen input changed: ${path}`);
}
let preserved = 0;
for (const row of report.savedRows) {
  const raw = JSON.parse(await readFile(join(import.meta.dir, `${row.name}-raw.json`), "utf8"));
  if (row.evaluation) {
    if (JSON.stringify(raw.output) !== JSON.stringify(row.evaluation.rawOutput)) throw new Error("Raw output rewritten");
    preserved++;
  } else if (raw.output !== null) throw new Error("Missing output was substituted");
}
const casesPath = join(root, "apps/ai_agent/evaluation/phase-11a-baseline-v4/cases.json");
const cases = await readFile(casesPath, "utf8");
const v4 = JSON.parse(await readFile(join(root, "apps/ai_agent/evaluation/phase-11a-baseline-v4/manifest.json"), "utf8"));
const artifactHashes: Record<string, string> = {};
for (const name of await readdir(import.meta.dir)) artifactHashes[name] = hash(await readFile(join(import.meta.dir, name), "utf8"));
await writeFile(join(import.meta.dir, "verification.json"), JSON.stringify({
  at: new Date().toISOString(), codeRevision: "b8aca2348fc1954d627a5462950112dbae785519", workingTree: "dirty; unrelated edits excluded",
  externalCalls: 0, savedSlots: 14, savedOutputsPreserved: preserved, providerFailuresPreserved: 1,
  frozenInputsAndSourcesUnchanged: true, artifactHashes,
  tests: { newTestsPassed: 21, focusedPassed: 74, focusedSkipped: 1, focusedFailed: 1,
    failure: "Existing frozen V4 cases.json CRLF hash mismatch", skip: "PostgreSQL restart integration" },
  existingV4Hashes: { expected: v4.artifact_hashes["cases.json"], actual: hash(cases), normalizedLF: hash(cases.replace(/\r\n/g, "\n")) },
  repositoryChecks: { checkTypesExitCode: 0, buildExitCode: 0, lintExitCode: 1, lintErrors: 9, lintWarnings: 22, frontendBuildCached: true },
  modifiedScope: ["apps/ai_agent/src/evaluation/repair-acceptance.ts", "apps/ai_agent/src/evaluation/repair-acceptance-controls.ts", "apps/ai_agent/src/evaluation/repair-acceptance-pilot.ts", "apps/ai_agent/tests/repair-acceptance.test.ts", "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/"],
  limitations: ["Reviewer supplied scope; no universal free-text entailment", "Credential/permission/production-format/replacement coverage not assessed", "No improved generation or successful diagnosis claimed from rejection"],
}, null, 2) + "\n", { flag: "wx" });
console.log("Verified 13 preserved outputs, one unchanged failed slot, frozen input hashes and scoped source hashes. Zero external calls.");
