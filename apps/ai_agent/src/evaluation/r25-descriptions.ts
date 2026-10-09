import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, join, relative, isAbsolute } from "node:path";
import { parseArgs } from "node:util";
import { hash, metrics } from "./retrieval-r21.ts";
import { rowsAtR24 } from "./r24-analysis.ts";
import { validateScores } from "./retrieval-r2.ts";

export function descriptivePassagesR25(corpus: readonly { citation: string; heading: string; content: string }[], descriptions: Record<string, string>) {
  if (Object.keys(descriptions).length !== corpus.length || corpus.some(s => !descriptions[s.citation]?.trim() || descriptions[s.citation]!.length > 1000))
    throw new Error("Section descriptions must cover exactly the frozen corpus");
  return Object.fromEntries(corpus.map(s => [s.citation, `Section description: ${descriptions[s.citation]}\n${s.heading}\n${s.content}`]));
}
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
async function main() {
  const { values } = parseArgs({ options: { run: { type: "string" }, output: { type: "string" }, scores: { type: "string" } }, strict: true });
  if (!values.run || !values.output) throw new Error("Provide --run and new --output");
  const source = resolve(root, values.run), out = resolve(root, values.output);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !["apps/ai_agent/evaluation/r25/runs/", ".tmp-turbo-user/"].some(p => rel.startsWith(p))) throw new Error("Invalid output directory");
  const { inputHash: originalHash, ...original } = await json(join(source, "inference-inputs.json"));
  const originalReport = await json(join(source, "report.json"));
  const datasets = await Promise.all(["dataset-original.json", "dataset-audited.json"].map(p => json(join(source, p))));
  if (hash(original) !== originalHash || originalReport.inputHash !== originalHash || hash(datasets[0]) !== originalReport.originalDatasetHash || hash(datasets[1]) !== originalReport.auditedDatasetHash)
    throw new Error("Original corpus/label provenance changed");
  const corpus = await json(join(root, "apps/ai_agent/evaluation/r25/corpus-only.json"));
  const descriptions = await json(join(root, "apps/ai_agent/evaluation/r25/section-descriptions-v1.json"));
  const passages = descriptivePassagesR25(corpus, descriptions.descriptions);
  // Verify the representation source matches every frozen original passage.
  for (const q of original.queries) for (const c of q.candidates) {
    const s = corpus.find((s: { citation: string }) => s.citation === c);
    if (!s || `${s.heading}\n${s.content}` !== q.passages[c]) throw new Error("Description corpus changed");
  }
  const sourceHashes = Object.fromEntries(await Promise.all(["r25-descriptions.ts", "r25-models.mjs"].map(async p => [p,
    createHash("sha256").update(await readFile(new URL(p, import.meta.url))).digest("hex")])));
  const input = { config: original.config, corpusHash: original.corpusHash,
    queries: original.queries.map((q: { id: string; query: string; candidates: string[] }) => ({ ...q, passages: Object.fromEntries(q.candidates.map(c => [c, passages[c]])) })),
    descriptionsHash: hash(descriptions), sourceHashes };
  const inputHash = hash(input);
  await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
  const save = (name: string, data: unknown) => writeFile(join(out, name), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  await save("inference-inputs.json", { ...input, inputHash });
  await save("descriptions.json", descriptions);
  const scoresPath = values.scores ? resolve(root, values.scores) : join(out, "scores.json");
  if (!values.scores) execFileSync("node", ["--experimental-transform-types", fileURLToPath(new URL("./r25-models.mjs", import.meta.url)), join(out, "inference-inputs.json"), scoresPath], { cwd: root, stdio: "inherit", timeout: 600000 });
  const capture = await json(scoresPath);
  if (capture.inputHash !== inputHash || capture.configHash !== hash(input.config) || Object.keys(capture.records).length !== input.queries.length) throw new Error("Description score provenance mismatch");
  for (const q of input.queries) {
    const r = capture.records[q.id];
    if (!r || !Number.isFinite(r.rerankMs) || r.rerankMs < 0) throw new Error("Invalid description capture");
    validateScores(r.logits, q.candidates, -Number.MAX_VALUE, Number.MAX_VALUE);
    validateScores(r.tokenCounts, q.candidates, 3, 512);
  }
  if (values.scores) {
    const prior = await json(join(resolve(scoresPath, ".."), "report.json"));
    if (prior.inputHash !== inputHash || prior.scoresHash !== hash(capture)) throw new Error("Changed frozen description scores");
    await save("scores.json", capture);
  }
  const results = datasets.map(dataset => {
    const rows = dataset.queries.map((q: { id: string; split: string; relevantCitations: string[] }) => ({ id: q.id, split: q.split, relevant: q.relevantCitations,
      candidates: input.queries.find((i: { id: string }) => i.id === q.id).candidates, logits: capture.records[q.id].logits, latencyMs: capture.records[q.id].rerankMs }));
    return { labelVersion: dataset.version, cutoff: 0.001, rows: rowsAtR24(rows, 0.001),
      splits: ["development", "held_out"].map(split => ({ split, metrics: metrics(rowsAtR24(rows.filter((q: { split: string }) => q.split === split), 0.001)) })) };
  });
  await save("report.json", { inputHash, scoresHash: hash(capture), results, originalReportHash: hash(originalReport), sourceHashes,
    descriptionsHash: hash(descriptions), productionReady: false, externalCostUsd: 0,
    limitations: ["Same candidates, model and fixed cutoff; description prefix is the only passage change.", "Timing was collected separately and is not a paired latency benchmark.", "Reused synthetic scenarios are diagnostic; descriptions require independent validation."] });
  console.log(JSON.stringify(results.map(r => ({ labelVersion: r.labelVersion, splits: r.splits })), null, 2));
}
if (import.meta.main) await main();
