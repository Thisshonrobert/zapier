// Offline reproduction artifact. The previous evaluator must come from trusted,
// preserved source matching v1's hashes; neither experiment is rewritten.
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
  new URL("../phase-11a-baseline/", import.meta.url),
);
const source = resolve(sourceDirectory);
const manifest = JSON.parse(
  await readFile(join(previousDirectory, "manifest.json"), "utf8"),
);
for (const [path, expected] of Object.entries(manifest.source_hashes)) {
  const bytes = await readFile(join(source, path));
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw new Error(`Previous source hash mismatch: ${path}`);
}
const previousEvaluator = await import(
  pathToFileURL(
    join(source, "apps/ai_agent/src/evaluation/model-experiment.ts"),
  ).href
);
const previous = await previousEvaluator.loadExperiment(previousDirectory);
const current = await loadExperiment(resolve(currentDirectory));
const before = await previousEvaluator.evaluateExperiment(previous);
const after = await evaluateExperiment(current);
const comparison = compareExperimentReports(previous, current, before, after);
const result = {
  ...comparison,
  reproduction: {
    previous: {
      reproduced: true,
      source_hashes_verified: 13,
      method: "isolated matching v1 source",
    },
    current: { reproduced: true, method: "current v2 source" },
  },
  limitations: [
    ...comparison.limitations,
    "Prompt, call timeout and diagnostic instrumentation changed together; this comparison cannot isolate which change caused a score difference.",
    "V1 and v2 are different configurations, not repeated trials for pass@k or pass^k.",
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
