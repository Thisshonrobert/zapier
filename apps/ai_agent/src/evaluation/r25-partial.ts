import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { hash, metrics } from "./retrieval-r21.ts";
import { validateSelectionR25 } from "./r25-analysis.ts";
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const base = join(root, "apps/ai_agent/evaluation/r25/runs");
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
async function main() {
  const { values } = parseArgs({ options: { output: { type: "string" } }, strict: true });
  const first = await json(join(base, "reasoning-v1/failure.json"));
  const second = await json(join(base, "reasoning-continuation-v1/failure.json"));
  const manifest = await json(join(base, "reasoning-continuation-v1/manifest.json"));
  const { inputHash, ...input } = await json(join(base, "exhaustive-v2/inference-inputs.json"));
  if (hash(input) !== inputHash || manifest.inputHash !== inputHash || hash(first) !== manifest.priorFailureHash ||
      !second.incomplete || second.firstFailedQuery !== first.id || second.category !== "Gemini HTTP 503") throw new Error("Incomplete pilot provenance changed");
  const records = second.records as Record<string, { selected: string[]; latencyMs: number; usage: { totalTokenCount?: number } }>;
  const failures = [{ id: first.id, category: first.category }, { id: second.id, category: second.category }];
  const attempted = input.queries.slice(0, input.queries.findIndex((q: { id: string }) => q.id === second.id) + 1);
  if (attempted.length !== second.attemptedGenerationsUpperBound || attempted.length !== Object.keys(records).length + failures.length ||
      failures.some(f => records[f.id]) || Object.keys(records).some(id => !attempted.some((q: { id: string }) => q.id === id))) throw new Error("Incomplete pilot accounting mismatch");
  for (const q of input.queries) {
    const record = records[q.id];
    if (record) validateSelectionR25({ selected: record.selected }, q.candidates);
  }
  for (const [id, r] of Object.entries(first.records)) if (hash(records[id]) !== hash(r)) throw new Error("Earlier selections changed");
  const datasets = await Promise.all(["dataset-original.json", "dataset-audited.json"].map(p => json(join(base, "exhaustive-v2", p))));
  if (hash(datasets[0]) !== manifest.originalDatasetHash || hash(datasets[1]) !== manifest.auditedDatasetHash) throw new Error("Label provenance changed");
  const results = datasets.map(dataset => ({ labelVersion: dataset.version, splits: ["development", "held_out"].map(split => {
    const all = dataset.queries.filter((q: { split: string }) => q.split === split);
    const successful = all.filter((q: { id: string }) => records[q.id]);
    return { split, expected: all.length, successful: successful.length,
      failed: all.filter((q: { id: string }) => failures.some(f => f.id === q.id)).length,
      unattempted: all.filter((q: { id: string }) => !attempted.some((a: { id: string }) => a.id === q.id)).length,
      successfulOnlyMetrics: metrics(successful.map((q: { id: string; relevantCitations: string[] }) => ({ relevant: q.relevantCitations, returned: records[q.id]!.selected, latencyMs: records[q.id]!.latencyMs }))) };
  }) }));
  const report = { ...manifest, complete: false, generationAttemptsUpperBound: attempted.length, providerHttpRequestsUpperBound: attempted.length * 2,
    successfulGenerations: Object.keys(records).length, failures, unattempted: input.queries.length - attempted.length,
    results, sourceCaptureHashes: { first: hash(first), second: hash(second) }, recordsHash: hash(records),
    measuredSuccessfulTokens: Object.values(records).every(r => r.usage.totalTokenCount !== undefined) ? Object.values(records).reduce((n, r) => n + r.usage.totalTokenCount!, 0) : null,
    reportSourceHash: createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex"),
    failedUsage: null, failedReservedTokens: failures.length * 20000, costUsd: null, productionReady: false,
    limitations: ["No held-out generation was attempted; no held-out quality or overall no-match claim is possible.",
      "The first failure's subtype was not captured; the second is provider HTTP 503. Neither is a retrieval abstention.",
      "Only one failed query was skipped in one bounded continuation; no failed query was retried and no fallback was used.",
      "Model and API key were configured on the user's declared free-tier project; billing was not inspected or changed."] };
  const name = values.output ?? "reasoning-partial-report-v2";
  if (!/^[a-zA-Z0-9-]+$/.test(name)) throw new Error("Output must be a new run name");
  const out = resolve(base, name); await mkdir(out);
  await writeFile(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ completed: report.successfulGenerations, attemptsUpperBound: report.generationAttemptsUpperBound, unattempted: report.unattempted, failures, tokens: report.measuredSuccessfulTokens }));
}
if (import.meta.main) await main();
