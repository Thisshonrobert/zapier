import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { hash, metrics } from "./retrieval-r21.ts";
import { generateR25, instructionsR25, generationSettingsR25 } from "./r25-gemini.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
async function main() {
  const { values } = parseArgs({ options: { run: { type: "string" }, output: { type: "string" }, live: { type: "boolean" } }, strict: true });
  if (!values.run || !values.output) throw new Error("Provide --run exhaustive R2.5 directory and a new --output");
  const run = resolve(root, values.run), out = resolve(root, values.output);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !["apps/ai_agent/evaluation/r25/runs/", ".tmp-turbo-user/"].some(p => rel.startsWith(p))) throw new Error("Invalid output directory");
  const { inputHash, ...input } = await json(join(run, "inference-inputs.json"));
  const report = await json(join(run, "report.json"));
  if (hash(input) !== inputHash || report.inputHash !== inputHash || report.productionReady !== false) throw new Error("Exhaustive input provenance mismatch");
  const original = await json(join(run, "dataset-original.json")), audited = await json(join(run, "dataset-audited.json"));
  const audit = await json(join(run, "audit.json"));
  if (hash(original) !== report.originalDatasetHash || hash(audited) !== report.auditedDatasetHash || hash(audit) !== report.auditHash)
    throw new Error("Frozen label/audit provenance mismatch");
  const queries: { id: string; query: string; candidates: string[]; passages: Record<string, string> }[] = input.queries;
  if (queries.length > 96) throw new Error("Request limit exceeded");
  const model = process.env.GEMINI_MODEL;
  if (values.live && (!model || !process.env.GEMINI_API_KEY)) throw new Error("Configured Gemini credentials required");
  await mkdir(resolve(out, ".."), { recursive: true });
  await mkdir(out);
  const save = (name: string, data: unknown) => writeFile(join(out, name), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  const paths = ["r25-reasoning.ts", "r25-gemini.ts", "r25-analysis.ts", "retrieval-r21.ts"];
  const sourceHashes = Object.fromEntries(await Promise.all(paths.map(async p => [p,
    createHash("sha256").update(await readFile(new URL(p, import.meta.url))).digest("hex")])));
  const generationConfig = { ...generationSettingsR25, schema: "strict selected array, up to three enum citations" };
  const manifest = { inputHash, model: model ?? null, promptHash: hash(instructionsR25), sourceHashes, generationConfig,
    generationConfigHash: hash(generationConfig), originalDatasetHash: hash(original), auditedDatasetHash: hash(audited),
    auditHash: hash(audit), exhaustiveReportHash: hash(report),
    freeTier: "User-declared free-tier project; no billing changes or provider fallback",
    maxGenerations: 96, maxHttpRequests: 192, maxTokensPerCall: 20000, maxReservedTokens: 1920000,
    deadlineMs: 3600000, spacingMs: 15000, productionReady: false, monetaryCostUsd: null };
  await save("manifest.json", manifest);
  await save("inference-inputs.json", { queries, instructions: instructionsR25 });
  if (!values.live) { console.log("Prepared label-blind Gemini preview; zero API calls"); return; }
  const records: Record<string, Awaited<ReturnType<typeof generateR25>>> = {};
  const started = Date.now();
  let lastStart = 0, reservedTokens = 0;
  for (const q of queries) {
    if (Date.now() - started > manifest.deadlineMs || reservedTokens + 20000 > manifest.maxReservedTokens) throw new Error("Run budget exhausted");
    const wait = Math.max(0, manifest.spacingMs - (Date.now() - lastStart));
    if (wait) await new Promise(r => setTimeout(r, wait));
    lastStart = Date.now();
    try {
      const record = await generateR25(model!, process.env.GEMINI_API_KEY!, JSON.stringify({ question: q.query,
        sections: q.candidates.map(citation => ({ citation, text: q.passages[citation] })) }), q.candidates);
      reservedTokens += record.reservedTokens;
      records[q.id] = record;
      await appendFile(join(out, "progress.jsonl"), JSON.stringify({ id: q.id, ...record }) + "\n");
      console.log(`R2.5 reasoning: ${Object.keys(records).length}/${queries.length}, ${q.id}`);
    } catch (error) {
      const failure = { id: q.id, category: error instanceof Error && /^Gemini HTTP \d+$/.test(error.message) ? error.message : "bounded inference failure",
        completed: Object.keys(records).length, attemptedGenerationsUpperBound: Object.keys(records).length + 1,
        reservedTokens: reservedTokens + 20000, incomplete: true, records };
      await save("failure.json", failure);
      console.log(JSON.stringify({ ...failure, records: undefined }));
      return;
    }
  }
  await save("selections.json", { inputHash, promptHash: manifest.promptHash, model, records });
  const results = [original, audited].map(dataset => ({ labelVersion: dataset.version,
    splits: ["development", "held_out"].map(split => ({ split, metrics: metrics(dataset.queries.filter((q: { split: string }) => q.split === split)
      .map((q: { id: string; relevantCitations: string[] }) => ({ relevant: q.relevantCitations, returned: records[q.id]!.selected, latencyMs: records[q.id]!.latencyMs }))) })),
  }));
  await save("report.json", { ...manifest, results, completed: Object.keys(records).length, reservedTokens,
    measuredTokens: Object.values(records).every(r => r.usage.totalTokenCount !== undefined) ? Object.values(records).reduce((n, r) => n + r.usage.totalTokenCount!, 0) : null,
    elapsedMs: Date.now() - started, limitations: ["Single stochastic run; reused scenario groups are diagnostic only.", "Model review is not human adjudication. No production or downstream diagnosis change."] });
  console.log(JSON.stringify(results, null, 2));
}
if (import.meta.main) await main();
