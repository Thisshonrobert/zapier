import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve, relative, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { hash, loadExperiment, metrics, validateCapture as validateBaseline } from "./retrieval-r21.ts";
import { validateScores } from "./retrieval-r2.ts";
import { candidatesR22 } from "./r22-candidates.ts";
import type { RunbookIndex } from "../tools/search-runbooks.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const directory = join(root, "apps/ai_agent/evaluation/r22");
const baselineDirectory = join(root, "apps/ai_agent/evaluation/r21/runs/r21-v1-local");
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const model = z.object({ id: z.string(), revision: z.string().regex(/^[a-f0-9]{40}$/), dtype: z.literal("q8") }).strict();
const models = z.object({ embedding: model, reranker: model }).strict();
const ConfigSchema = z.object({
  experimentVersion: z.literal("r22-v1"), datasetVersion: z.literal("r21-v1"),
  candidateStrategy: z.literal("full_top12_branch_union"), candidateLimit: z.literal(24),
  branchDepth: z.literal(12), rrfConstant: z.literal(60), semanticThreshold: z.literal(0.2),
  rerankThreshold: z.literal(0.001), corpusHash: sha, models,
  baselineFiles: z.record(z.string(), sha),
}).strict();
const RecordSchema = z.object({
  semantic: z.record(z.string(), z.number().finite().min(-1).max(1)),
  logits: z.record(z.string(), z.number().finite()), candidates: z.array(z.string()).max(24),
  embeddingMs: z.number().finite().nonnegative(), candidateMs: z.number().finite().nonnegative(),
  rerankMs: z.number().finite().nonnegative(),
}).strict();
const CaptureSchema = z.object({
  inputHash: sha, configHash: sha, models, modelLoadMs: z.number().finite().nonnegative(),
  corpusEmbeddingMs: z.number().finite().nonnegative(), records: z.record(z.string(), RecordSchema),
}).strict();
type Config = z.infer<typeof ConfigSchema>;
type ScoreRecord = z.infer<typeof RecordSchema>;
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const fileHash = async (path: string) => createHash("sha256").update(await readFile(path)).digest("hex");

export async function loadR22() {
  const config = ConfigSchema.parse(await json(join(directory, "config.json")));
  for (const [path, expected] of Object.entries(config.baselineFiles)) {
    const absolute = resolve(root, path), rel = relative(root, absolute);
    if (rel.startsWith("..") || isAbsolute(rel) || await fileHash(absolute) !== expected)
      throw new Error(`Frozen baseline changed: ${path}`);
  }
  const experiment = await loadExperiment();
  const baselineInput = await json(join(baselineDirectory, "inference-inputs.json"));
  const { inputHash, ...frozen } = baselineInput;
  const baselineReport = await json(join(baselineDirectory, "report.json"));
  const dataset = { version: "r21-v1", queries: experiment.queries };
  if (hash(frozen) !== inputHash || hash(experiment.config) !== hash(frozen.config) ||
      hash(dataset) !== frozen.datasetHash || hash(experiment.corpus) !== config.corpusHash ||
      hash(config.models) !== hash(experiment.config.models) || baselineReport.calibration.threshold !== 0.001)
    throw new Error("Baseline corpus, dataset, config or selected cutoff changed");
  const baselineCapture = validateBaseline(await json(join(baselineDirectory, "scores.json")),
    inputHash, experiment.index, experiment.queries, experiment.config);
  if (hash(baselineCapture) !== baselineReport.scoresHash || baselineReport.inputHash !== inputHash ||
      hash(dataset) !== baselineReport.datasetHash) throw new Error("Baseline report provenance mismatch");
  return { ...experiment, config, dataset, baselineCapture, baselineReport };
}

export function validateR22Capture(raw: unknown, inputHash: string, index: RunbookIndex,
  queries: readonly { id: string; query: string; taxonomy: string[]; providers: string[] }[], config: Config) {
  const capture = CaptureSchema.parse(raw);
  if (capture.inputHash !== inputHash || capture.configHash !== hash(config) ||
      hash(capture.models) !== hash(config.models) || Object.keys(capture.records).length !== queries.length)
    throw new Error("Score capture does not match frozen R2.2 inputs/config");
  for (const q of queries) {
    const record = capture.records[q.id];
    if (!record) throw new Error(`Missing score ${q.id}`);
    validateScores(record.semantic, index.map(s => s.citation));
    const candidates = candidatesR22(index, q, record.semantic).map(s => s.citation);
    if (hash(candidates) !== hash(record.candidates)) throw new Error("Candidate set/order mismatch");
    validateScores(record.logits, candidates, -Number.MAX_VALUE, Number.MAX_VALUE);
  }
  return capture;
}

export function rerankR22(record: ScoreRecord) {
  return record.candidates.map(citation => ({ citation, logit: record.logits[citation]!,
    score: 1 / (1 + Math.exp(-record.logits[citation]!)) }))
    .sort((a, b) => b.score - a.score || (a.citation < b.citation ? -1 : a.citation > b.citation ? 1 : 0));
}

async function main() {
  const { values } = parseArgs({ options: { output: { type: "string" }, scores: { type: "string" } }, strict: true });
  const { config, corpus, index, queries, dataset, baselineCapture, baselineReport } = await loadR22();
  const out = resolve(root, values.output ?? `apps/ai_agent/evaluation/r22/runs/${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !["apps/ai_agent/evaluation/r22/runs/", ".tmp-turbo-user/"].some(prefix => rel.startsWith(prefix)))
    throw new Error("Output must be a new R2.2 run or ignored temporary directory");
  // Existing captures and the baseline are never overwritten, even by --output.
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out, { recursive: false });
  const sourcePaths = ["retrieval-r22.ts", "r22-candidates.ts", "r22-models.mjs"].map(p => `apps/ai_agent/src/evaluation/${p}`);
  const sourceHashes = Object.fromEntries(await Promise.all(sourcePaths.map(async p => [p, await fileHash(join(root, p))])));
  const inference = {
    config, corpus, queries: queries.map(({ id, query, taxonomy, providers }) => ({ id, query, taxonomy, providers })),
    datasetHash: hash(dataset), sourceHashes,
  };
  const inputHash = hash(inference), inputPath = join(out, "inference-inputs.json");
  const save = (name: string, value: unknown) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  await save("inference-inputs.json", { ...inference, inputHash });
  await save("config.json", config);
  await save("dataset.json", dataset);
  const scoresPath = values.scores ? resolve(root, values.scores) : join(out, "scores.json");
  if (!values.scores) execFileSync("node", ["--experimental-transform-types",
    fileURLToPath(new URL("./r22-models.mjs", import.meta.url)), inputPath, scoresPath],
    { cwd: root, stdio: "inherit", timeout: 600_000 });
  const capture = validateR22Capture(await json(scoresPath), inputHash, index, inference.queries, config);
  if (values.scores) {
    const recorded = await json(join(dirname(scoresPath), "report.json"));
    if (recorded.scoresHash !== hash(capture) || recorded.inputHash !== inputHash ||
        recorded.configHash !== hash(config) || recorded.datasetHash !== hash(dataset) ||
        hash(recorded.sourceHashes) !== hash(sourceHashes))
      throw new Error("Frozen replay score/report provenance mismatch");
  }
  if (values.scores) await save("scores.json", capture);
  const rows = queries.map(q => {
    const record = capture.records[q.id]!;
    const started = performance.now();
    const ranking = rerankR22(record);
    const returned = ranking.filter(r => r.score >= config.rerankThreshold).slice(0, 3).map(r => r.citation);
    const baseline = baselineCapture.records[q.id]!;
    return { id: q.id, group: q.scenarioGroup, split: q.split, kind: q.kind, relevant: q.relevantCitations,
      returned, ranking, candidates: record.candidates, baselineCandidates: baseline.candidates,
      addedCandidates: record.candidates.filter(c => !baseline.candidates.includes(c)),
      recoveredGold: q.relevantCitations.filter(c => record.candidates.includes(c) && !baseline.candidates.includes(c)),
      missingGold: q.relevantCitations.filter(c => !record.candidates.includes(c)),
      rankingLoss: q.relevantCitations.filter(c => record.candidates.includes(c) && !ranking.slice(0, 3).some(r => r.citation === c)),
      cutoffLoss: q.relevantCitations.filter(c => ranking.slice(0, 3).some(r => r.citation === c) && !returned.includes(c)),
      latencyMs: performance.now() - started + record.embeddingMs + record.candidateMs + record.rerankMs,
    };
  });
  const baselineResult = baselineReport.results.find((r: { variant: string }) => r.variant === "hybrid-reranked");
  if (!baselineResult) throw new Error("Missing baseline reranked result");
  const comparisons = ["development", "held_out"].map(split => {
    const selected = rows.filter(r => r.split === split);
    const candidateRecall = (limit: number) => metrics(selected.map(r => ({ relevant: r.relevant, returned: r.candidates.slice(0, limit), latencyMs: 0 }))).recallAt3;
    const measured = metrics(selected);
    const baseline = split === "development" ? baselineResult.development : baselineResult.heldOut;
    const baselineCandidate = baselineReport.candidateDiagnostics.find((r: { split: string }) => r.split === split).candidateRecallAt12;
    return { split, baseline: { ...baseline, candidateRecallAt12: baselineCandidate },
      r22: { ...measured, candidateRecallAt12: candidateRecall(12), candidateRecallAt24: candidateRecall(24) },
      delta: { recallAt3: measured.recallAt3! - baseline.recallAt3, mrr: measured.mrr! - baseline.mrr,
        candidateRecallAt12: candidateRecall(12)! - baselineCandidate, candidateRecallAt24VsBaseline12: candidateRecall(24)! - baselineCandidate },
      candidateCounts: selected.map(r => ({ id: r.id, count: r.candidates.length })),
    };
  });
  const limitations = [
    "Exploratory paired comparison: R2.1 held-out diagnostics informed this hypothesis; these are reused labels, not a fresh confirmatory test set. No configuration sweep or cutoff recalibration.",
    "Author-labelled synthetic queries in 24 correlated scenario groups. Corpus and all 96 labels/splits are unchanged.",
    "R2.2 latency is fresh CPU inference; R2.1 latency is its historical saved run. Hardware/load/cache variation prevents a controlled latency claim. Replay retains inference timings and remeasures final sorting only.",
    "R2.1 timing includes reranking and a local retrieval pass; R2.2 timing includes embedding, actual candidate generation, reranking and final sorting. Setup times are excluded and recorded separately.",
    "Reranker revision, q8 precision, CPU device, batch size 8, tokenization and sigmoid cutoff 0.001 remain fixed; expanding inputs changes cost and may change outputs. Sigmoid scores are not calibrated probabilities.",
    "No production retrieval, Phase 11/11A, downstream diagnosis, external API calls or replay authority changes. External cost USD 0.",
  ];
  const report = { experiment: "R2.2", createdAt: new Date().toISOString(), config, inputHash, configHash: hash(config),
    datasetHash: hash(dataset), scoresHash: hash(capture), sourceHashes, corpusDocuments: 12, corpusSections: 60,
    queryCount: queries.length, fixedRerankThreshold: 0.001, comparisons, rows,
    setup: { modelLoadMs: capture.modelLoadMs, corpusEmbeddingMs: capture.corpusEmbeddingMs },
    baselineInputHash: baselineReport.inputHash, baselineScoresHash: baselineReport.scoresHash, externalCostUsd: 0, limitations };
  await save("report.json", report);
  const pct = (value: number | null) => value === null ? "n/a" : `${(value * 100).toFixed(2)}%`;
  const table = comparisons.flatMap(c => [
    `| ${c.split} | R2.1 | ${pct(c.baseline.recallAt3)} | ${c.baseline.mrr.toFixed(3)} | ${pct(c.baseline.candidateRecallAt12)} | n/a | ${pct(c.baseline.noMatchAccuracy)} | ${pct(c.baseline.noMatchPrecision)} | ${pct(c.baseline.noMatchAbstentionRate)} | ${pct(c.baseline.answerableAbstentionRate)} | ${pct(c.baseline.overallAbstentionRate)} | ${c.baseline.latency.meanMs.toFixed(2)} / ${c.baseline.latency.p95Ms.toFixed(2)} |`,
    `| ${c.split} | R2.2 | ${pct(c.r22.recallAt3)} | ${c.r22.mrr?.toFixed(3)} | ${pct(c.r22.candidateRecallAt12)} | ${pct(c.r22.candidateRecallAt24)} | ${pct(c.r22.noMatchAccuracy)} | ${pct(c.r22.noMatchPrecision)} | ${pct(c.r22.noMatchAbstentionRate)} | ${pct(c.r22.answerableAbstentionRate)} | ${pct(c.r22.overallAbstentionRate)} | ${c.r22.latency.meanMs?.toFixed(2)} / ${c.r22.latency.p95Ms?.toFixed(2)} |`,
  ]).join("\n");
  const md = `# R2.2 candidate generation experiment\n\nSingle change: rerank the full deduplicated top-12 BM25 + top-12 dense union (at most 24), instead of its fused top 12. Same RRF ordering, semantic cutoff 0.2, reranker and selected cutoff 0.001. No calibration. Dataset r21-v1 and 12-runbook / 60-section corpus are frozen.\n\n| Split | Experiment | Recall@3 | MRR | Candidate R@12 | Candidate R@24 | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Overall abstention | Mean / p95 ms |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${table}\n\nRecall is macro section recall over answerable queries. MRR uses first relevant rank. No-match confusion treats abstention as positive; accuracy includes all queries, precision is correct no-match abstentions / all abstentions. Empty denominators are null. Latency uses mean and nearest-rank p95. Candidate Recall@12 must remain identical; Recall@24 measures wider-pool coverage. report.json includes confusion counts, deltas, complete candidate/reranked orders, raw logits, added/recovered/missing sections, ranking losses and cutoff losses per query.\n\n## Reproduce\n\n\`rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r22.ts\` runs locally cached pinned models into a new directory. Add \`--scores ${relative(root, join(out, "scores.json")).replaceAll("\\", "/")}\` for no-inference replay. Existing output directories are rejected.\n\n## Limits\n\n${limitations.map(s => `- ${s}`).join("\n")}\n`;
  await writeFile(join(out, "report.md"), md, { flag: "wx" });
  console.log(md);
  console.log(`Artifacts: ${out}`);
}
if (import.meta.main) await main();
