import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadR2Corpus } from "./retrieval-r2.ts";
import { hash } from "./retrieval-r21.ts";
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const directory = join(root, "apps/ai_agent/evaluation/r25");
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
export function validateFreezeEvidenceR25(original: any, described: any, originalInput: any, descriptionInput: any, descriptions: unknown, sources: Record<string, string>) {
  for (const [input, report] of [[originalInput, original], [descriptionInput, described]]) {
    const { inputHash, ...payload } = input;
    if (hash(payload) !== inputHash || report.inputHash !== inputHash) throw new Error("Development input provenance changed");
  }
  if (hash(originalInput.config) !== hash(descriptionInput.config) || described.descriptionsHash !== hash(descriptions) || descriptionInput.descriptionsHash !== hash(descriptions)) throw new Error("Development representation/config changed");
  for (const report of [original, described]) for (const [path, expected] of Object.entries(report.sourceHashes)) {
    if (sources[path.split("/").at(-1)!] !== expected) throw new Error("Development source changed");
  }
}
async function main() {
  const original = await json(join(directory, "runs/exhaustive-v2/report.json"));
  const described = await json(join(directory, "runs/descriptions-v1/report.json"));
  if (described.originalReportHash !== hash(original)) throw new Error("Description control provenance changed");
  const labels = "r25-audited-v1";
  const plain = original.results.find((r: { labelVersion: string }) => r.labelVersion === labels).controls.find((c: { cutoff: number }) => c.cutoff === 0.001).splits[0].metrics;
  const description = described.results.find((r: { labelVersion: string }) => r.labelVersion === labels).splits[0].metrics;
  const variants = [{ method: "minilm-original", metrics: plain, preference: 0 }, { method: "minilm-descriptions", metrics: description, preference: 1 }];
  const selected = variants.sort((a, b) => (b.metrics.recallAt3 + b.metrics.noMatchAbstentionRate) - (a.metrics.recallAt3 + a.metrics.noMatchAbstentionRate) || a.preference - b.preference)[0]!;
  const descriptions = await json(join(directory, "section-descriptions-v1.json"));
  const corpus = await loadR2Corpus();
  const paths = ["r25-fresh.ts", "r25-models.mjs", "r25-analysis.ts", "r25-descriptions.ts", "retrieval-r21.ts", "retrieval-r2.ts", "r24-analysis.ts", "r23-analysis.ts"];
  const sourceHashes = Object.fromEntries(await Promise.all(paths.map(async p => [p,
    createHash("sha256").update(await readFile(new URL(p, import.meta.url))).digest("hex")])));
  const originalInput = await json(join(directory, "runs/exhaustive-v2/inference-inputs.json"));
  const descriptionInput = await json(join(directory, "runs/descriptions-v1/inference-inputs.json"));
  const evaluatedSources = { ...sourceHashes, "retrieval-r25.ts": createHash("sha256").update(await readFile(new URL("retrieval-r25.ts", import.meta.url))).digest("hex") };
  validateFreezeEvidenceR25(original, described, originalInput, descriptionInput, descriptions, evaluatedSources);
  if (process.argv.includes("--verify")) {
    const existing = await json(join(directory, "method-freeze.json"));
    if (existing.method !== selected.method || hash(existing.config) !== hash(originalInput.config) || hash(existing.sourceHashes) !== hash(sourceHashes) || existing.corpusHash !== hash(corpus.map(({ headingTerms, contentTerms, ...s }) => s))) throw new Error("Existing freeze differs from evaluated method");
    console.log(JSON.stringify({ existingFreezeConsistent: true, developmentProvenanceVerified: true }));
    return;
  }
  const frozen = { version: "r25-method-v1", method: selected.method, config: (await json(join(directory, "runs/exhaustive-v2/inference-inputs.json"))).config,
    corpusHash: hash(corpus.map(({ headingTerms, contentTerms, ...s }) => s)),
    descriptionHash: selected.method === "minilm-descriptions" ? hash(descriptions) : null,
    geminiModel: null, promptHash: null, generationConfigHash: null, sourceHashes,
    frozenAt: new Date().toISOString(), productionReady: false,
    selectionEvidence: "Development-only audited-label Recall@3 + no-match abstention, ties prefer original. Fixed .001 cutoff. Gemini pilot incomplete and excluded. Fresh scenario questions/labels were not loaded by this selector." };
  await writeFile(join(directory, "method-freeze.json"), JSON.stringify(frozen, null, 2) + "\n", { flag: "wx" });
  await writeFile(join(directory, "method-selection.json"), JSON.stringify({ originalReportHash: hash(original), descriptionReportHash: hash(described), variants, selectedMethod: selected.method }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ method: frozen.method, variants }));
}
if (import.meta.main) await main();
