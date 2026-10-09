import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  rankR2,
  QuerySchema,
  validateScores,
  variants,
  type Query,
  type Scores,
} from "./retrieval-r2.ts";
import type { RunbookIndex } from "../tools/search-runbooks.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const directory = join(root, "apps/ai_agent/evaluation/r21");
export const hash = (value: unknown) =>
  createHash("sha256")
    .update(
      JSON.stringify(value, (_key, item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? Object.fromEntries(
              Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
            )
          : item,
      ),
    )
    .digest("hex");
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const model = z
  .object({
    id: z.string(),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    dtype: z.literal("q8"),
  })
  .strict();
const ConfigSchema = z
  .object({
    experimentVersion: z.literal("r21-v1"),
    datasetVersion: z.literal("r21-v1"),
    corpusHash: sha,
    semanticThreshold: z.literal(0.2),
    candidateLimit: z.literal(12),
    rerankThresholds: z.array(z.number().finite().min(0).max(1)).min(2).max(32),
    calibrationObjective: z.literal(
      "macro_recall_at_3_plus_no_match_abstention",
    ),
    tieBreak: z.literal(
      "MRR_then_lower_answerable_abstention_then_lower_threshold",
    ),
    models: z.object({ embedding: model, reranker: model }).strict(),
  })
  .strict();
type Config = z.infer<typeof ConfigSchema>;
const R21QuerySchema = QuerySchema.extend({
  scenarioGroup: z.string().min(1).max(96),
});
type R21Query = z.infer<typeof R21QuerySchema>;
const RecordSchema = z
  .object({
    semantic: z.record(z.string(), z.number().finite().min(-1).max(1)),
    logits: z.record(z.string(), z.number().finite()),
    candidates: z.array(z.string()).max(12),
    embeddingMs: z.number().finite().nonnegative(),
    candidateMs: z.number().finite().nonnegative(),
    rerankMs: z.number().finite().nonnegative(),
  })
  .strict();
export type ScoreRecord = z.infer<typeof RecordSchema>;
const CaptureSchema = z
  .object({
    inputHash: sha,
    configHash: sha,
    models: z.object({ embedding: model, reranker: model }),
    modelLoadMs: z.number().finite().nonnegative(),
    corpusEmbeddingMs: z.number().finite().nonnegative(),
    records: z.record(z.string(), RecordSchema),
  })
  .strict();
const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));
const probabilities = (record: ScoreRecord): Scores =>
  Object.fromEntries(
    Object.entries(record.logits).map(([c, logit]) => [c, sigmoid(logit)]),
  );

export async function loadExperiment() {
  const config = ConfigSchema.parse(
    JSON.parse(await readFile(join(directory, "config.json"), "utf8")),
  );
  const original = JSON.parse(
    await readFile(
      join(root, "apps/ai_agent/evaluation/r2/results/inputs.json"),
      "utf8",
    ),
  );
  const originalReport = JSON.parse(
    await readFile(
      join(root, "apps/ai_agent/evaluation/r2/results/report.json"),
      "utf8",
    ),
  );
  const corpus = original.corpus as (Omit<
    RunbookIndex[number],
    "headingTerms" | "contentTerms"
  > & { headingTerms: string[]; contentTerms: string[] })[];
  if (
    hash(corpus) !== config.corpusHash ||
    new Set(corpus.map((s) => s.id)).size !== 12 ||
    corpus.length !== 60 ||
    hash(config.models) !== hash(originalReport.models)
  )
    throw new Error("Frozen R2 corpus or model configuration changed");
  if (
    new Set(config.rerankThresholds).size !== config.rerankThresholds.length ||
    !config.rerankThresholds.includes(0) ||
    !config.rerankThresholds.includes(0.3)
  )
    throw new Error("Threshold grid must be unique and contain both controls");
  const index: RunbookIndex = corpus.map((s) => ({
    ...s,
    headingTerms: new Set(s.headingTerms),
    contentTerms: new Set(s.contentTerms),
  }));
  for (const s of corpus)
    if (
      createHash("sha256")
        .update(`${s.heading}\n${s.content}`)
        .digest("hex") !== s.contentHash
    )
      throw new Error("Section content hash mismatch");
  const dataset = z
    .object({
      version: z.literal(config.datasetVersion),
      queries: z.array(R21QuerySchema).min(80).max(100),
    })
    .strict()
    .parse(JSON.parse(await readFile(join(directory, "queries.json"), "utf8")));
  const queries = dataset.queries;
  const historicalQueries = new Set(
    (original.labels as Query[]).map((q) => q.query),
  );
  const seenIds = new Set<string>(),
    seenText = new Set<string>(),
    groups = new Map<string, string>();
  for (const q of queries) {
    if (
      seenIds.has(q.id) ||
      seenText.has(q.query) ||
      historicalQueries.has(q.query)
    )
      throw new Error("Duplicate or reused query");
    seenIds.add(q.id);
    seenText.add(q.query);
    if (groups.has(q.scenarioGroup) && groups.get(q.scenarioGroup) !== q.split)
      throw new Error("Scenario group leaks across splits");
    groups.set(q.scenarioGroup, q.split);
    if (
      (q.kind === "no_match") !== !q.relevantCitations.length ||
      new Set(q.relevantCitations).size !== q.relevantCitations.length
    )
      throw new Error("Invalid relevance labels");
    // Give every section an equal dense score to inspect metadata eligibility only.
    const allScores = Object.fromEntries(index.map((s) => [s.citation, 1]));
    if (
      q.relevantCitations.some(
        (c) =>
          !index.some((s) => s.citation === c) ||
          rankR2(
            index.filter((s) => s.citation === c),
            q,
            "semantic",
            allScores,
          ).length !== 1,
      )
    )
      throw new Error("Unknown or filtered gold citation");
    rankR2([], q, "weighted-keyword");
  }
  for (const split of ["development", "held_out"])
    if (
      queries.filter((q) => q.split === split).length !== 48 ||
      queries.filter((q) => q.split === split && q.kind === "no_match")
        .length !== 12
    )
      throw new Error(
        "R21-v1 requires 48 queries and 12 no-match controls per split",
      );
  return { config, corpus, index, queries };
}

type Row = {
  relevant: readonly string[];
  returned: readonly string[];
  latencyMs: number;
};
export function metrics(rows: readonly Row[]) {
  const positive = rows.filter((r) => r.relevant.length),
    negative = rows.filter((r) => !r.relevant.length);
  const tp = negative.filter((r) => !r.returned.length).length,
    fp = positive.filter((r) => !r.returned.length).length;
  const fn = negative.length - tp,
    tn = positive.length - fp;
  const ratio = (a: number, b: number) => (b ? a / b : null);
  const times = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
  return {
    queryCount: rows.length,
    positiveQueryCount: positive.length,
    noMatchQueryCount: negative.length,
    recallAt3: ratio(
      positive.reduce(
        (sum, r) =>
          sum +
          r.relevant.filter((c) => r.returned.includes(c)).length /
            r.relevant.length,
        0,
      ),
      positive.length,
    ),
    mrr: ratio(
      positive.reduce((sum, r) => {
        const i = r.returned.findIndex((c) => r.relevant.includes(c));
        return sum + (i < 0 ? 0 : 1 / (i + 1));
      }, 0),
      positive.length,
    ),
    noMatchConfusion: { tp, fp, fn, tn },
    noMatchAccuracy: ratio(tp + tn, rows.length),
    noMatchPrecision: ratio(tp, tp + fp),
    noMatchAbstentionRate: ratio(tp, negative.length),
    answerableAbstentionRate: ratio(fp, positive.length),
    overallAbstentionRate: ratio(tp + fp, rows.length),
    latency: {
      meanMs: ratio(
        times.reduce((a, b) => a + b, 0),
        times.length,
      ),
      p95Ms: times.length ? times[Math.ceil(times.length * 0.95) - 1]! : null,
    },
  };
}
function rowsFor(
  index: RunbookIndex,
  queries: readonly R21Query[],
  records: Record<string, ScoreRecord>,
  config: Config,
  variant: (typeof variants)[number],
  threshold: number,
) {
  return queries.map((q) => {
    const record = records[q.id];
    if (!record) throw new Error(`Missing score ${q.id}`);
    const start = performance.now();
    const matches = rankR2(
      index,
      q,
      variant,
      record.semantic,
      probabilities(record),
      { semantic: config.semanticThreshold, rerank: threshold },
    );
    return {
      id: q.id,
      group: q.scenarioGroup,
      split: q.split,
      kind: q.kind,
      relevant: q.relevantCitations,
      returned: matches.map((m) => m.citation),
      latencyMs:
        performance.now() -
        start +
        (variant === "weighted-keyword" || variant === "bm25"
          ? 0
          : record.embeddingMs) +
        (variant === "hybrid-reranked" ? record.rerankMs : 0),
    };
  });
}
export function calibrate(
  index: RunbookIndex,
  queries: readonly R21Query[],
  records: Record<string, ScoreRecord>,
  config: Config,
) {
  const dev = queries.filter((q) => q.split === "development");
  const grid = config.rerankThresholds.map((threshold) => {
    const measured = metrics(
      rowsFor(index, dev, records, config, "hybrid-reranked", threshold).map(
        (row) => ({ ...row, latencyMs: 0 }),
      ),
    );
    return {
      threshold,
      metrics: measured,
      objective:
        (measured.recallAt3 ?? 0) + (measured.noMatchAbstentionRate ?? 0),
    };
  });
  const selected = [...grid].sort(
    (a, b) =>
      b.objective - a.objective ||
      (b.metrics.mrr ?? 0) - (a.metrics.mrr ?? 0) ||
      (a.metrics.answerableAbstentionRate ?? 0) -
        (b.metrics.answerableAbstentionRate ?? 0) ||
      a.threshold - b.threshold,
  )[0]!;
  return { threshold: selected.threshold, grid };
}
export function validateCapture(
  raw: unknown,
  expectedHash: string,
  index: RunbookIndex,
  queries: readonly Pick<R21Query, "id" | "query" | "taxonomy" | "providers">[],
  config?: Config,
) {
  const capture = CaptureSchema.parse(raw);
  if (
    capture.inputHash !== expectedHash ||
    Object.keys(capture.records).length !== queries.length ||
    (config &&
      (capture.configHash !== hash(config) ||
        hash(capture.models) !== hash(config.models)))
  )
    throw new Error("Score capture does not match frozen inputs/config");
  for (const q of queries) {
    const record = capture.records[q.id];
    if (!record) throw new Error("Missing query scores");
    validateScores(
      record.semantic,
      index.map((s) => s.citation),
    );
    const candidates = rankR2(
      index,
      q,
      "hybrid",
      record.semantic,
      {},
      { semantic: config?.semanticThreshold ?? 0.2, rerank: 0 },
      12,
    ).map((s) => s.citation);
    if (hash(record.candidates) !== hash(candidates))
      throw new Error("Candidate set/order mismatch");
    validateScores(
      record.logits,
      candidates,
      -Number.MAX_VALUE,
      Number.MAX_VALUE,
    );
  }
  return capture;
}

async function main() {
  const { values } = parseArgs({
    options: { output: { type: "string" }, scores: { type: "string" } },
    strict: true,
  });
  const { config, corpus, index, queries } = await loadExperiment();
  const out = resolve(
    root,
    values.output ??
      `apps/ai_agent/evaluation/r21/runs/${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  const rel = relative(root, out);
  if (!rel || rel.startsWith("..") || isAbsolute(rel))
    throw new Error("Output must stay inside repository");
  await mkdir(out, { recursive: true });
  const inferenceQueries = queries.map(
    ({ id, query, taxonomy, providers }) => ({
      id,
      query,
      taxonomy,
      providers,
    }),
  );
  const sources = await Promise.all(
    [
      "apps/ai_agent/src/evaluation/retrieval-r21.ts",
      "apps/ai_agent/src/evaluation/r21-models.mjs",
      "apps/ai_agent/src/evaluation/retrieval-r2.ts",
      "apps/ai_agent/src/tools/search-runbooks.ts",
      "apps/ai_agent/package.json",
      "bun.lock",
    ].map(async (p) => [
      p,
      createHash("sha256")
        .update(await readFile(join(root, p)))
        .digest("hex"),
    ]),
  );
  const inference = {
    config,
    corpus,
    queries: inferenceQueries,
    datasetHash: hash({ version: config.datasetVersion, queries }),
    sourceHashes: Object.fromEntries(sources),
  };
  const inputHash = hash(inference),
    inputPath = join(out, "inference-inputs.json");
  // Keep labels in a separate artifact; the model process never receives them.
  await writeFile(
    inputPath,
    JSON.stringify({ ...inference, inputHash }, null, 2) + "\n",
  );
  await writeFile(
    join(out, "dataset.json"),
    JSON.stringify({ version: config.datasetVersion, queries }, null, 2) + "\n",
  );
  await writeFile(
    join(out, "config.json"),
    JSON.stringify(config, null, 2) + "\n",
  );
  const scoresPath = values.scores
    ? resolve(root, values.scores)
    : join(out, "scores.json");
  if (!values.scores)
    execFileSync(
      "node",
      [
        "--experimental-transform-types",
        fileURLToPath(new URL("./r21-models.mjs", import.meta.url)),
        inputPath,
        scoresPath,
      ],
      { cwd: root, stdio: "inherit", timeout: 600_000 },
    );
  const capture = validateCapture(
    JSON.parse(await readFile(scoresPath, "utf8")),
    inputHash,
    index,
    inferenceQueries,
    config,
  );
  if (values.scores)
    await writeFile(
      join(out, "scores.json"),
      JSON.stringify(capture, null, 2) + "\n",
    );
  const calibration = calibrate(index, queries, capture.records, config);
  const results = variants.map((variant) => {
    const rows = rowsFor(
      index,
      queries,
      capture.records,
      config,
      variant,
      calibration.threshold,
    );
    return {
      variant,
      development: metrics(rows.filter((r) => r.split === "development")),
      heldOut: metrics(rows.filter((r) => r.split === "held_out")),
      rows,
    };
  });
  const controls = [0, 0.3].map((threshold) => {
    const rows = rowsFor(
      index,
      queries,
      capture.records,
      config,
      "hybrid-reranked",
      threshold,
    );
    return {
      threshold,
      development: metrics(rows.filter((r) => r.split === "development")),
      heldOut: metrics(rows.filter((r) => r.split === "held_out")),
      rows,
    };
  });
  const candidateDiagnostics = ["development", "held_out"].map((split) => {
    const selected = queries.filter((q) => q.split === split);
    const coverage = metrics(
      selected.map((q) => ({
        relevant: q.relevantCitations,
        returned: capture.records[q.id]!.candidates,
        latencyMs: 0,
      })),
    );
    const distributions = selected.map((q) => {
      const r = capture.records[q.id]!;
      return {
        id: q.id,
        kind: q.kind,
        maxLogit: Math.max(...Object.values(r.logits)),
        goldCandidateLogits: q.relevantCitations.map((c) => ({
          citation: c,
          logit: r.logits[c] ?? null,
        })),
        candidateCount: r.candidates.length,
      };
    });
    return { split, candidateRecallAt12: coverage.recallAt3, distributions };
  });
  const report = {
    experiment: "R2.1",
    createdAt: new Date().toISOString(),
    inputHash,
    configHash: hash(config),
    datasetHash: hash({ version: config.datasetVersion, queries }),
    scoresHash: hash(capture),
    config,
    corpusDocuments: 12,
    corpusSections: 60,
    queryCount: queries.length,
    scenarioGroupCount: new Set(queries.map((q) => q.scenarioGroup)).size,
    calibration,
    results,
    controls,
    candidateDiagnostics,
    setup: {
      modelLoadMs: capture.modelLoadMs,
      corpusEmbeddingMs: capture.corpusEmbeddingMs,
    },
    externalCostUsd: 0,
    limitations: [
      "Author-labelled synthetic queries; held-out scenario groups are disjoint, not independently human-adjudicated. Four queries per scenario are correlated; report has 24 scenario groups, not 96 independent incidents.",
      "Fixed R2 corpus and semantic cutoff; only reranker score cutoff is recalibrated. Sigmoid scores are not relevance probabilities.",
      "Mean/p95 latency combines recorded query inference and local ranking; cross-encoder timing is the actual selected top-12 candidates, excludes one-time model/corpus setup. Rescoring does not rerun inference.",
      "No downstream diagnosis, Gemini calls, customer data, action providers, production adoption or replay authority.",
    ],
  };
  await writeFile(
    join(out, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  const pct = (n: number | null) =>
    n === null ? "n/a" : `${(n * 100).toFixed(1)}%`;
  const table = (rows: typeof results) =>
    rows
      .map(
        (r) =>
          `| ${r.variant} | ${pct(r.heldOut.recallAt3)} | ${r.heldOut.mrr?.toFixed(3)} | ${pct(r.heldOut.noMatchAccuracy)} | ${pct(r.heldOut.noMatchPrecision)} | ${pct(r.heldOut.noMatchAbstentionRate)} | ${pct(r.heldOut.answerableAbstentionRate)} | ${r.heldOut.latency.meanMs?.toFixed(2)} / ${r.heldOut.latency.p95Ms?.toFixed(2)} |`,
      )
      .join("\n");
  const md = `# R2.1 retrieval experiment\n\n96 queries (48/48), 24 disjoint scenario groups, unchanged 12-runbook /60-section corpus. Frozen version: ${config.experimentVersion}. No external calls/cost.\n\nDevelopment-selected reranker sigmoid cutoff: ${calibration.threshold}. Selection objective: macro Recall@3 + no-match abstention; ties prefer MRR, less answerable abstention, then smaller cutoff. Held-out labels do not select thresholds.\n\n| Variant | Recall@3 | MRR | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Mean /p95 ms |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${table(results)}\n\n## Reranker controls (held-out, diagnostic only)\n\n${controls.map((c) => `- Cutoff ${c.threshold}: Recall@3 ${pct(c.heldOut.recallAt3)}, no-match abstention ${pct(c.heldOut.noMatchAbstentionRate)}, answerable abstention ${pct(c.heldOut.answerableAbstentionRate)}.`).join("\n")}\n\nCandidate Recall@12: ${candidateDiagnostics.map((c) => `${c.split} ${pct(c.candidateRecallAt12)}`).join("; ")}. report.json records raw logits, full calibration grid, per-query ranks and both controls. Ranking/candidate losses and threshold losses are reported separately.\n\n## Metric definitions\n\nAn expected no-match has zero labelled relevant sections. A predicted no-match returns zero excerpts. No-match accuracy is the binary decision accuracy across all queries; precision is correct no-match abstentions divided by all abstentions. No-match abstention is the fraction of no-match queries returning nothing; answerable abstention measures the opposite error. Zero-denominator metrics are null, not 100%. Recall@3 is macro section recall over answerable queries only; MRR uses first relevant rank.\n\n## Reproduce\n\n\`rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r21.ts\` creates a new run directory. For no-model rescoring, pass \`--scores ${relative(root, join(out, "scores.json")).replaceAll("\\", "/")}\`. Corpus, config, input/source hashes and candidate identities are validated. Dataset labels are separately frozen and never sent to inference.\n\n## Limits\n\n${report.limitations.map((s) => `- ${s}`).join("\n")}\n\nProduction retrieval remains unchanged.\n`;
  await writeFile(join(out, "report.md"), md);
  console.log(md);
  console.log(`Artifacts: ${out}`);
}
if (import.meta.main) await main();
