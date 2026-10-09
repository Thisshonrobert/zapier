import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { hash, metrics } from "./retrieval-r21.ts";
import { validateSelectionR25 } from "./r25-analysis.ts";
import { generateR25, instructionsR25, generationSettingsR25 } from "./r25-gemini.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
async function main() {
  const { values } = parseArgs({ options: { prior: { type: "string" }, control: { type: "string" }, output: { type: "string" }, live: { type: "boolean" } }, strict: true });
  if (!values.prior || !values.control || !values.output || !values.live) throw new Error("Explicit --live, --prior, --control and new --output required");
  const prior = resolve(root, values.prior), control = resolve(root, values.control), out = resolve(root, values.output);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !rel.startsWith("apps/ai_agent/evaluation/r25/runs/")) throw new Error("Invalid continuation output");
  const manifest = await json(join(prior, "manifest.json")), failure = await json(join(prior, "failure.json"));
  const preview = await json(join(prior, "inference-inputs.json"));
  const { inputHash, ...input } = await json(join(control, "inference-inputs.json"));
  const report = await json(join(control, "report.json"));
  const datasets = await Promise.all(["dataset-original.json", "dataset-audited.json"].map(p => json(join(control, p))));
  if (hash(input) !== inputHash || manifest.inputHash !== inputHash || report.inputHash !== inputHash ||
      hash(preview.queries) !== hash(input.queries) || manifest.model !== process.env.GEMINI_MODEL || !process.env.GEMINI_API_KEY ||
      manifest.promptHash !== hash(instructionsR25) || hash(manifest.generationConfig) !== manifest.generationConfigHash ||
      hash(datasets[0]) !== manifest.originalDatasetHash || hash(datasets[1]) !== manifest.auditedDatasetHash ||
      failure.category !== "bounded inference failure" || !failure.incomplete || !failure.id)
    throw new Error("Continuation provenance or failure category mismatch; quota/HTTP failures cannot continue");
  for (const [p, expected] of Object.entries(manifest.sourceHashes)) {
    if (createHash("sha256").update(await readFile(new URL(p, import.meta.url))).digest("hex") !== expected) throw new Error("Prior method source changed");
  }
  const progress = (await readFile(join(prior, "progress.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const records = { ...failure.records } as Record<string, Awaited<ReturnType<typeof generateR25>>>;
  if (Object.keys(records).length !== failure.completed || failure.attemptedGenerationsUpperBound !== failure.completed + 1 ||
      hash(Object.fromEntries(progress.map(({ id, ...r }) => [id, r]))) !== hash(records)) throw new Error("Prior progress changed");
  const queries: { id: string; query: string; candidates: string[]; passages: Record<string, string> }[] = input.queries;
  const failedIndex = queries.findIndex(q => q.id === failure.id);
  if (failedIndex !== failure.completed || Object.keys(records).some(id => !queries.slice(0, failedIndex).some(q => q.id === id))) throw new Error("Prior query sequence changed");
  for (const q of queries.slice(0, failedIndex)) validateSelectionR25({ selected: records[q.id]?.selected }, q.candidates);
  const remaining = queries.slice(failedIndex + 1);
  if (failure.attemptedGenerationsUpperBound + remaining.length > 96) throw new Error("Global attempt cap exceeded");
  await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
  const save = (name: string, data: unknown) => writeFile(join(out, name), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  const continuationHash = createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex");
  await save("manifest.json", { ...manifest, priorManifestHash: hash(manifest), priorFailureHash: hash(failure),
    skippedFailedQuery: failure.id, priorPath: relative(root, prior).replaceAll("\\", "/"), continuationHash, generationSettings: generationSettingsR25,
    continuationPolicy: "One continuation only, failed query skipped; total generation attempts <=96. Stop on any further failure." });
  await save("inference-inputs.json", { queries, instructions: instructionsR25 });
  const started = Date.now(); let last = Date.now();
  for (const q of remaining) {
    if (Date.now() - started > 3600000) throw new Error("Continuation deadline exhausted");
    const wait = Math.max(0, 15000 - (Date.now() - last)); if (wait) await new Promise(r => setTimeout(r, wait)); last = Date.now();
    try {
      const r = await generateR25(manifest.model, process.env.GEMINI_API_KEY!, JSON.stringify({ question: q.query, sections: q.candidates.map(citation => ({ citation, text: q.passages[citation] })) }), q.candidates);
      records[q.id] = r;
      await appendFile(join(out, "progress.jsonl"), JSON.stringify({ id: q.id, ...r }) + "\n");
      console.log(`R2.5 continuation: ${Object.keys(records).length} successes /96; one preserved failure`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const safe = ["Gemini incomplete selection", "Gemini malformed selection", "Gemini malformed response", "Gemini response too large", "Gemini network error or deadline", "Gemini per-call token budget exhausted", "Invalid candidate selection"];
      await save("failure.json", { id: q.id, incomplete: true, firstFailedQuery: failure.id,
        category: safe.includes(message) || /^Gemini HTTP \d+$/.test(message) ? message : "invalid response schema",
        attemptedGenerationsUpperBound: Object.keys(records).length + 2, reservedTokensUpperBound: (Object.keys(records).length + 2) * 20000, records });
      console.log("Second failure stopped continuation; no further calls"); return;
    }
  }
  const selections = { inputHash, model: manifest.model, promptHash: manifest.promptHash, records, failures: [{ id: failure.id, category: failure.category }] };
  await save("selections.json", selections);
  const results = datasets.map(dataset => ({ labelVersion: dataset.version, splits: ["development", "held_out"].map(split => {
    const all = dataset.queries.filter((q: { split: string }) => q.split === split);
    const successful = all.filter((q: { id: string }) => records[q.id]);
    const rows = successful.map((q: { id: string; relevantCitations: string[] }) => ({ id: q.id, relevant: q.relevantCitations, returned: records[q.id]!.selected, latencyMs: records[q.id]!.latencyMs }));
    const m = metrics(rows), positive = all.filter((q: { relevantCitations: string[] }) => q.relevantCitations.length).length;
    return { split, attemptedQueries: all.length, successfulQueries: rows.length, failures: all.length - rows.length, metrics: m,
      availabilityAdjustedRecall: positive ? (m.recallAt3 ?? 0) * m.positiveQueryCount / positive : null };
  }) }));
  await save("report.json", { ...manifest, selectionsHash: hash(selections), continuationHash, inputHash, results,
    successes: Object.keys(records).length, failures: 1, totalGenerationAttempts: queries.length,
    measuredSuccessfulTokens: Object.values(records).every(r => r.usage.totalTokenCount !== undefined) ? Object.values(records).reduce((n, r) => n + r.usage.totalTokenCount!, 0) : null,
    failedUsage: null, unknownFailedTokenReservation: 20000, productionReady: false,
    limitations: ["One failed development query is unavailable, not a retrieval abstention; successful-only and availability-adjusted recall are separate.", "Old held-out scenarios are diagnostic only. Human label adjudication remains pending."] });
  console.log(JSON.stringify(results, null, 2));
}
if (import.meta.main) await main();
