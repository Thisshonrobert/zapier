import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { hash, metrics } from "./retrieval-r21.ts";
import { validateSelectionR25 } from "./r25-analysis.ts";
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
async function main() {
  const { values } = parseArgs({ options: { run: { type: "string" }, control: { type: "string" }, output: { type: "string" } }, strict: true });
  if (!values.run || !values.control || !values.output) throw new Error("Provide --run, --control and new --output");
  const run = resolve(root, values.run), control = resolve(root, values.control), out = resolve(root, values.output);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || ![".tmp-turbo-user/", "apps/ai_agent/evaluation/r25/runs/"].some(p => rel.startsWith(p))) throw new Error("Invalid replay output");
  const report = await json(join(run, "report.json")), selections = await json(join(run, "selections.json"));
  const { inputHash, ...input } = await json(join(control, "inference-inputs.json"));
  const datasets = await Promise.all(["dataset-original.json", "dataset-audited.json"].map(p => json(join(control, p))));
  if (hash(input) !== inputHash || report.inputHash !== inputHash || selections.inputHash !== inputHash || report.selectionsHash !== hash(selections) ||
      hash(datasets[0]) !== report.originalDatasetHash || hash(datasets[1]) !== report.auditedDatasetHash ||
      selections.model !== report.model || selections.promptHash !== report.promptHash) throw new Error("Frozen reasoning provenance changed");
  const allIds = input.queries.map((q: { id: string }) => q.id);
  const failedIds: string[] = selections.failures.map((f: { id: string }) => f.id);
  const records = selections.records;
  if (new Set(failedIds).size !== failedIds.length || Object.keys(records).length + failedIds.length !== allIds.length ||
      [...Object.keys(records), ...failedIds].some(id => !allIds.includes(id)) || failedIds.some(id => records[id])) throw new Error("Incomplete or duplicated capture");
  for (const q of input.queries) if (records[q.id]) {
    validateSelectionR25({ selected: records[q.id].selected }, q.candidates);
    if (!Number.isFinite(records[q.id].latencyMs) || records[q.id].latencyMs < 0) throw new Error("Invalid frozen latency");
  }
  const results = datasets.map(dataset => ({ labelVersion: dataset.version, splits: ["development", "held_out"].map(split => {
    const all = dataset.queries.filter((q: { split: string }) => q.split === split);
    const successful = all.filter((q: { id: string }) => records[q.id]);
    const rows = successful.map((q: { id: string; relevantCitations: string[] }) => ({ id: q.id, relevant: q.relevantCitations, returned: records[q.id].selected, latencyMs: records[q.id].latencyMs }));
    const m = metrics(rows), positive = all.filter((q: { relevantCitations: string[] }) => q.relevantCitations.length).length;
    return { split, attemptedQueries: all.length, successfulQueries: rows.length, failures: all.length - rows.length, metrics: m,
      availabilityAdjustedRecall: positive ? (m.recallAt3 ?? 0) * m.positiveQueryCount / positive : null };
  }) }));
  if (hash(results) !== hash(report.results)) throw new Error("Frozen reasoning metrics mismatch");
  await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
  await writeFile(join(out, "report.json"), JSON.stringify({ ...report, results }, null, 2) + "\n", { flag: "wx" });
  console.log("Frozen reasoning replay reproduced all metrics; zero API calls");
}
if (import.meta.main) await main();
