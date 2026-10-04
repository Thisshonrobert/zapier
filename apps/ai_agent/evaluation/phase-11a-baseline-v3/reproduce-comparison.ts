// Each frozen report is validated with its own trusted matching source before
// the existing comparison helper is called. No model initialization or network.
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  loadExperiment,
  evaluateExperiment,
  compareExperimentReports,
} from "../../src/evaluation/model-experiment.ts";

const [sourceDirectory, currentDirectory, outputFile] = process.argv.slice(2);
if (!sourceDirectory || !currentDirectory || !outputFile)
  throw new Error(
    "Expected previous-source-directory current-experiment-directory new-output-file",
  );
const previousDirectory = fileURLToPath(
  new URL("../phase-11a-baseline-v2/", import.meta.url),
);
const root = fileURLToPath(new URL("../../../../", import.meta.url));
async function verifySource(directory: string, experiment: string) {
  const manifest = JSON.parse(
    await readFile(join(experiment, "manifest.json"), "utf8"),
  );
  for (const [path, expected] of Object.entries(manifest.source_hashes)) {
    const bytes = await readFile(join(directory, path));
    if (createHash("sha256").update(bytes).digest("hex") !== expected)
      throw new Error(`Source hash mismatch: ${path}`);
  }
  return Object.keys(manifest.source_hashes).length;
}
const source = resolve(sourceDirectory);
const currentPath = resolve(currentDirectory);
const previousCount = await verifySource(source, previousDirectory);
const currentCount = await verifySource(root, currentPath);
const previousEvaluator = await import(
  pathToFileURL(
    join(source, "apps/ai_agent/src/evaluation/model-experiment.ts"),
  ).href
);
const previous = await previousEvaluator.loadExperiment(previousDirectory);
const current = await loadExperiment(currentPath);
const before = await previousEvaluator.evaluateExperiment(previous);
const after = await evaluateExperiment(current);
const comparison = compareExperimentReports(previous, current, before, after);
const result = {
  ...comparison,
  reproduction: {
    previous: {
      reproduced: true,
      source_hashes_verified: previousCount,
      method: "isolated matching v2 source",
    },
    current: {
      reproduced: true,
      source_hashes_verified: currentCount,
      method: "current matching v3 source",
    },
  },
  limitations: [
    ...comparison.limitations,
    "Prompt, graph query construction, generic runbook applicability and parse diagnostics changed together; this single-run comparison cannot isolate causal effects.",
    "V2 and v3 use different configurations and are not repeated trials for pass@k or pass^k.",
  ],
};
await writeFile(resolve(outputFile), JSON.stringify(result, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    comparable: result.comparable,
    changedSettings: result.changedSettings,
    regressions: result.regressions,
    reproduced: true,
  }),
);
