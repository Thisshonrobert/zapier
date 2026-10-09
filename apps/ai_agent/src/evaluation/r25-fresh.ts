import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { hash, metrics } from "./retrieval-r21.ts";
import { loadR2Corpus, QuerySchema, validateScores } from "./retrieval-r2.ts";
import { eligibleR25, validateSelectionR25 } from "./r25-analysis.ts";
import { descriptivePassagesR25 } from "./r25-descriptions.ts";
import { generateR25, instructionsR25, generationSettingsR25 } from "./r25-gemini.ts";
import { rowsAtR24 } from "./r24-analysis.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const FreezeSchema = z.object({ version: z.literal("r25-method-v1"), method: z.enum(["minilm-original", "minilm-descriptions", "gemini-reasoning"]),
  config: z.object({ model: z.object({ id: z.string(), revision: z.string(), dtype: z.literal("q8") }).strict(), cutoff: z.literal(0.001),
    maxLength: z.literal(512), batchSize: z.literal(8), candidateBound: z.literal(60) }).strict(),
  corpusHash: z.string(), descriptionHash: z.string().nullable(), geminiModel: z.string().nullable(), promptHash: z.string().nullable(),
  generationConfigHash: z.string().nullable(), sourceHashes: z.record(z.string(), z.string()),
  frozenAt: z.string(), selectionEvidence: z.string(), productionReady: z.literal(false),
}).strict();

async function main() {
  const { values } = parseArgs({ options: { freeze: { type: "string" }, output: { type: "string" }, live: { type: "boolean" }, prepare: { type: "boolean" }, scores: { type: "string" } }, strict: true });
  if (!values.freeze || !values.output) throw new Error("Provide --freeze and a new --output");
  const frozen = FreezeSchema.parse(await json(resolve(root, values.freeze)));
  for (const [p, expected] of Object.entries(frozen.sourceHashes)) {
    const actual = createHash("sha256").update(await readFile(new URL(p, import.meta.url))).digest("hex");
    if (actual !== expected) throw new Error("Frozen method implementation changed");
  }
  const corpus = await loadR2Corpus();
  if (hash(corpus.map(({ headingTerms, contentTerms, ...s }) => s)) !== frozen.corpusHash) throw new Error("Frozen corpus changed");
  const raw = await json(join(root, "apps/ai_agent/evaluation/r25/fresh-scenarios-v1.json"));
  const querySchema = QuerySchema.extend({ scenarioGroup: z.string().min(1) }).strict();
  const queries = z.array(querySchema).length(32).parse(raw.queries);
  if (!raw.provenance?.independent || !raw.provenance?.synthetic || raw.provenance?.humanAdjudication || new Set(queries.map(q => q.id)).size !== 32 || new Set(queries.map(q => q.scenarioGroup)).size !== 32 || queries.some(q => q.split !== "held_out")) throw new Error("Fresh dataset provenance mismatch");
  const descriptions = await json(join(root, "apps/ai_agent/evaluation/r25/section-descriptions-v1.json"));
  if (frozen.method === "minilm-descriptions" && hash(descriptions) !== frozen.descriptionHash) throw new Error("Frozen descriptions changed");
  if (frozen.method === "gemini-reasoning" && (hash(instructionsR25) !== frozen.promptHash || hash(generationSettingsR25) !== frozen.generationConfigHash || process.env.GEMINI_MODEL !== frozen.geminiModel)) throw new Error("Frozen Gemini settings changed");
  const passages = frozen.method === "minilm-descriptions" ? descriptivePassagesR25(corpus, descriptions.descriptions) : Object.fromEntries(corpus.map(s => [s.citation, `${s.heading}\n${s.content}`]));
  for (const q of queries) {
    const eligible = eligibleR25(corpus, q);
    if (q.relevantCitations.some(c => !eligible.some(s => s.citation === c)) || (q.kind === "no_match") !== (q.relevantCitations.length === 0)) throw new Error("Fresh label eligibility mismatch");
  }
  const inference = { config: frozen.config, queries: queries.map(q => ({ id: q.id, query: q.query,
    candidates: eligibleR25(corpus, q).map(s => s.citation), passages: Object.fromEntries(eligibleR25(corpus, q).map(s => [s.citation, passages[s.citation]])) })),
    freezeHash: hash(frozen) };
  const inputHash = hash(inference), out = resolve(root, values.output);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !["apps/ai_agent/evaluation/r25/runs/", ".tmp-turbo-user/"].some(p => rel.startsWith(p))) throw new Error("Invalid output directory");
  if (!values.prepare && frozen.method === "gemini-reasoning" && !values.scores && (!values.live || !process.env.GEMINI_API_KEY)) throw new Error("Gemini requires explicitly authorized --live or frozen scores");
  await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
  const save = (p: string, data: unknown) => writeFile(join(out, p), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  await save("inference-inputs.json", { ...inference, inputHash });
  await save("dataset.json", raw); await save("freeze.json", frozen);
  if (values.prepare) { console.log("Fresh request preview prepared; zero API calls"); return; }
  let capture: { inputHash: string; records: Record<string, { selected?: string[]; logits?: Record<string, number>; rerankMs?: number; latencyMs?: number; usage?: unknown }> };
  if (values.scores) {
    capture = await json(resolve(root, values.scores));
    const prior = await json(join(resolve(root, values.scores, ".."), "report.json"));
    if (prior.scoresHash !== hash(capture) || prior.inputHash !== inputHash || prior.datasetHash !== hash(raw)) throw new Error("Frozen fresh scores changed");
  } else if (frozen.method === "gemini-reasoning") {
    capture = { inputHash, records: {} };
    const started = Date.now(); let last = 0;
    for (const q of inference.queries) {
      if (Date.now() - started > 900000) throw new Error("Fresh run deadline exhausted");
      const wait = Math.max(0, 15000 - (Date.now() - last));
      if (wait) await new Promise(r => setTimeout(r, wait)); last = Date.now();
      try {
        const record = await generateR25(frozen.geminiModel!, process.env.GEMINI_API_KEY!, JSON.stringify({ question: q.query, sections: q.candidates.map(citation => ({ citation, text: q.passages[citation] })) }), q.candidates);
        capture.records[q.id] = record;
        await appendFile(join(out, "progress.jsonl"), JSON.stringify({ id: q.id, ...record }) + "\n");
        console.log(`Fresh R2.5: ${Object.keys(capture.records).length}/32`);
      } catch (error) {
        await save("failure.json", { inputHash, incomplete: true, id: q.id, completed: Object.keys(capture.records).length,
          attemptedGenerationsUpperBound: Object.keys(capture.records).length + 1, reservedTokensUpperBound: (Object.keys(capture.records).length + 1) * 20000,
          category: error instanceof Error && /^Gemini HTTP \d+$/.test(error.message) ? error.message : "bounded inference failure", capture });
        console.log("Fresh inference stopped; sanitized failure preserved"); return;
      }
    }
  } else {
    execFileSync("node", ["--experimental-transform-types", fileURLToPath(new URL("./r25-models.mjs", import.meta.url)), join(out, "inference-inputs.json"), join(out, "scores.json")], { cwd: root, stdio: "inherit", timeout: 600000 });
    capture = await json(join(out, "scores.json"));
  }
  if (capture.inputHash !== inputHash || Object.keys(capture.records).length !== queries.length) throw new Error("Incomplete fresh capture");
  const rows = queries.map(q => {
    const r = capture.records[q.id]!, candidates = inference.queries.find(s => s.id === q.id)!.candidates;
    const latencyMs = r.latencyMs ?? r.rerankMs;
    if (latencyMs === undefined || !Number.isFinite(latencyMs) || latencyMs < 0) throw new Error("Invalid fresh latency");
    let returned: string[];
    if (frozen.method === "gemini-reasoning") returned = validateSelectionR25({ selected: r.selected }, candidates);
    else {
      validateScores(r.logits!, candidates, -Number.MAX_VALUE, Number.MAX_VALUE);
      returned = rowsAtR24([{ split: q.split, relevant: q.relevantCitations, candidates, logits: r.logits!, latencyMs }], frozen.config.cutoff)[0]!.returned;
    }
    return { id: q.id, relevant: q.relevantCitations, candidates, returned, latencyMs };
  });
  if (values.scores || frozen.method === "gemini-reasoning") await save("scores.json", capture);
  const measured = metrics(rows), candidateRecall = metrics(rows.map(r => ({ ...r, returned: r.candidates }))).recallAt3;
  await save("report.json", { inputHash, scoresHash: hash(capture), datasetHash: hash(raw), freezeHash: hash(frozen), frozen, rows,
    metrics: measured, candidateRecall, engineeringCandidateGoal: 0.98, recallTarget: 0.9,
    meetsRetrievalTargets: (candidateRecall ?? 0) >= 0.98 && (measured.recallAt3 ?? 0) >= 0.9 && measured.noMatchAbstentionRate === 1,
    productionReady: false, costUsd: frozen.method === "gemini-reasoning" ? null : 0,
    limitations: ["Independent synthetic scenarios, with author-labelled gold rather than human adjudication.", "One frozen-method evaluation; no subsequent tuning against fresh results.", "Passing a retrieval score does not establish downstream diagnosis quality or production suitability."] });
  console.log(JSON.stringify({ method: frozen.method, metrics: measured, candidateRecall }, null, 2));
}
if (import.meta.main) await main();
