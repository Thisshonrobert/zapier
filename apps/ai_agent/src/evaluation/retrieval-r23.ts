import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { hash, metrics } from "./retrieval-r21.ts";
import { loadR22, validateR22Capture } from "./retrieval-r22.ts";
import { validateScores } from "./retrieval-r2.ts";
import { passageR23, diagnoseR23, r23Variants } from "./r23-analysis.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const directory = join(root, "apps/ai_agent/evaluation/r23");
const r22Directory = join(
  root,
  "apps/ai_agent/evaluation/r22/runs/r22-v1-local",
);
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const fileHash = async (p: string) =>
  createHash("sha256")
    .update(await readFile(p))
    .digest("hex");
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const model = z
  .object({
    id: z.string(),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    dtype: z.literal("q8"),
  })
  .strict();
const models = z.object({ embedding: model, reranker: model }).strict();
const ConfigSchema = z
  .object({
    experimentVersion: z.literal("r23-v1"),
    datasetVersion: z.literal("r21-v1"),
    candidateSource: z.literal("r22-v1-local"),
    candidateLimit: z.literal(24),
    variants: z.tuple([z.literal("original"), z.literal("runbook-context")]),
    rerankThreshold: z.literal(0.001),
    recallTarget: z.literal(0.9),
    selection: z.literal(
      "development_recall_plus_no_match_then_MRR_then_original",
    ),
    maxLength: z.literal(512),
    batchSize: z.literal(8),
    device: z.literal("cpu"),
    models,
    baselineHashes: z.record(z.string(), sha),
  })
  .strict();
const VariantCapture = z
  .object({
    logits: z.record(z.string(), z.number().finite()),
    tokenCounts: z.record(z.string(), z.number().int().nonnegative()),
    tokenHashes: z.record(z.string(), sha),
    tokenInspectionMs: z.number().finite().nonnegative(),
    rerankMs: z.number().finite().nonnegative(),
  })
  .strict();
const CaptureSchema = z
  .object({
    inputHash: sha,
    configHash: sha,
    models,
    modelLoadMs: z.number().finite().nonnegative(),
    records: z.record(
      z.string(),
      z
        .object({ original: VariantCapture, "runbook-context": VariantCapture })
        .strict(),
    ),
  })
  .strict();
export type R23Capture = z.infer<typeof CaptureSchema>;

export async function loadR23() {
  const config = ConfigSchema.parse(await json(join(directory, "config.json")));
  for (const [p, expected] of Object.entries(config.baselineHashes)) {
    const path = resolve(root, p),
      rel = relative(root, path);
    if (
      rel.startsWith("..") ||
      isAbsolute(rel) ||
      (await fileHash(path)) !== expected
    )
      throw new Error(`Frozen R2.2 file changed: ${p}`);
  }
  const baseline = await loadR22();
  if (hash(config.models) !== hash(baseline.config.models))
    throw new Error("Model configuration changed");
  const input = await json(join(r22Directory, "inference-inputs.json"));
  const { inputHash, ...frozen } = input;
  const report = await json(join(r22Directory, "report.json"));
  if (
    hash(frozen) !== inputHash ||
    report.inputHash !== inputHash ||
    report.datasetHash !== hash(baseline.dataset)
  )
    throw new Error("R2.2 input/report mismatch");
  const capture = validateR22Capture(
    await json(join(r22Directory, "scores.json")),
    inputHash,
    baseline.index,
    baseline.queries,
    baseline.config,
  );
  if (hash(capture) !== report.scoresHash)
    throw new Error("R2.2 score hash mismatch");
  return { ...baseline, config, r22Capture: capture, r22Report: report };
}

export function validateR23Capture(
  raw: unknown,
  inputHash: string,
  configHash: string,
  expectedModels: unknown,
  queries: readonly { id: string; candidates: readonly string[] }[],
) {
  const capture = CaptureSchema.parse(raw);
  if (
    capture.inputHash !== inputHash ||
    capture.configHash !== configHash ||
    hash(capture.models) !== hash(expectedModels) ||
    Object.keys(capture.records).length !== queries.length
  )
    throw new Error("Capture provenance mismatch");
  for (const q of queries) {
    const records = capture.records[q.id];
    if (!records) throw new Error("Missing query capture");
    for (const variant of r23Variants) {
      const record = records[variant];
      validateScores(
        record.logits,
        q.candidates,
        -Number.MAX_VALUE,
        Number.MAX_VALUE,
      );
      validateScores(
        record.tokenCounts,
        q.candidates,
        3,
        Number.MAX_SAFE_INTEGER,
      );
      if (
        Object.keys(record.tokenHashes).length !== q.candidates.length ||
        q.candidates.some((c) => !record.tokenHashes[c])
      )
        throw new Error("Incomplete token capture");
    }
  }
  return capture;
}

async function main() {
  const { values } = parseArgs({
    options: { output: { type: "string" }, scores: { type: "string" } },
    strict: true,
  });
  const {
    config,
    corpus,
    index,
    queries,
    dataset,
    baselineReport,
    r22Capture,
    r22Report,
  } = await loadR23();
  const out = resolve(
    root,
    values.output ??
      `apps/ai_agent/evaluation/r23/runs/${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  const rel = relative(root, out).replaceAll("\\", "/");
  if (
    isAbsolute(rel) ||
    !["apps/ai_agent/evaluation/r23/runs/", ".tmp-turbo-user/"].some((prefix) =>
      rel.startsWith(prefix),
    )
  )
    throw new Error(
      "Output must be a new R2.3 run or ignored temporary directory",
    );
  const paths = ["retrieval-r23.ts", "r23-analysis.ts", "r23-models.mjs"].map(
    (p) => `apps/ai_agent/src/evaluation/${p}`,
  );
  const sourceHashes = Object.fromEntries(
    await Promise.all(
      paths.map(async (p) => [p, await fileHash(join(root, p))]),
    ),
  );
  const inferenceQueries = queries.map(({ id, query }) => {
    const candidates = r22Capture.records[id]!.candidates;
    const passages = Object.fromEntries(
      r23Variants.map((variant) => [
        variant,
        Object.fromEntries(
          candidates.map((c) => {
            const section = index.find((s) => s.citation === c)!;
            return [c, passageR23(index, section, variant)];
          }),
        ),
      ]),
    );
    return { id, query, candidates, passages };
  });
  const inference = {
    config,
    corpus,
    queries: inferenceQueries,
    datasetHash: hash(dataset),
    sourceHashes,
    candidateHash: hash(
      inferenceQueries.map((q) => ({ id: q.id, candidates: q.candidates })),
    ),
    baselineScoresHash: hash(r22Capture),
  };
  const inputHash = hash(inference);
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out);
  const save = (name: string, data: unknown) =>
    writeFile(join(out, name), JSON.stringify(data, null, 2) + "\n", {
      flag: "wx",
    });
  await save("inference-inputs.json", { ...inference, inputHash });
  await save("dataset.json", dataset);
  await save("config.json", config);
  const scoresPath = values.scores
    ? resolve(root, values.scores)
    : join(out, "scores.json");
  if (!values.scores)
    execFileSync(
      "node",
      [
        "--experimental-transform-types",
        fileURLToPath(new URL("./r23-models.mjs", import.meta.url)),
        join(out, "inference-inputs.json"),
        scoresPath,
      ],
      { cwd: root, stdio: "inherit", timeout: 600_000 },
    );
  const capture = validateR23Capture(
    await json(scoresPath),
    inputHash,
    hash(config),
    config.models,
    inferenceQueries,
  );
  if (values.scores) {
    const previous = await json(join(dirname(scoresPath), "report.json"));
    if (
      previous.scoresHash !== hash(capture) ||
      previous.inputHash !== inputHash ||
      previous.datasetHash !== hash(dataset) ||
      previous.configHash !== hash(config) ||
      hash(previous.sourceHashes) !== hash(sourceHashes)
    )
      throw new Error("Frozen replay score/report provenance mismatch");
    await save("scores.json", capture);
  }
  const results = r23Variants.map((variant) => {
    const rows = queries.map((q) => {
      const record = capture.records[q.id]![variant],
        original = r22Capture.records[q.id]!;
      const start = performance.now();
      const diagnosis = diagnoseR23(
        q.relevantCitations,
        original.candidates,
        record.logits,
      );
      const sortMs = performance.now() - start;
      return {
        id: q.id,
        split: q.split,
        kind: q.kind,
        group: q.scenarioGroup,
        relevant: q.relevantCitations,
        ...diagnosis,
        candidates: original.candidates,
        rerankMs: record.rerankMs,
        latencyMs:
          sortMs +
          record.rerankMs +
          original.embeddingMs +
          original.candidateMs,
        tokenCounts: record.tokenCounts,
        truncatedCandidates: original.candidates.filter(
          (c) => record.tokenCounts[c]! > 512,
        ),
      };
    });
    const splits = ["development", "held_out"].map((split) => {
      const selected = rows.filter((r) => r.split === split);
      const m = metrics(selected);
      const pairedRerankLatency = metrics(
        selected.map((r) => ({ ...r, latencyMs: r.rerankMs })),
      ).latency;
      const gold = selected.flatMap((r) => r.gold);
      const losses = Object.fromEntries(
        ["candidate", "cutoff", "ranking", "returned"].map((reason) => [
          reason,
          gold.filter((g) => g.reason === reason).length,
        ]),
      );
      const coverage = metrics(
        selected.map((r) => ({ ...r, returned: r.candidates })),
      ).recallAt3;
      const truncation = {
        pairCount: selected.reduce((sum, r) => sum + r.candidates.length, 0),
        truncatedPairCount: selected.reduce(
          (sum, r) => sum + r.truncatedCandidates.length,
          0,
        ),
        maximumPairTokens: Math.max(
          0,
          ...selected.flatMap((r) => Object.values(r.tokenCounts)),
        ),
      };
      return {
        split,
        metrics: m,
        pairedRerankLatency,
        candidateRecallAt12: metrics(
          selected.map((r) => ({ ...r, returned: r.candidates.slice(0, 12) })),
        ).recallAt3,
        candidateRecallAt24: coverage,
        losses,
        truncation,
      };
    });
    return { variant, splits, rows };
  });
  const selected = [...results].sort((a, b) => {
    const x = a.splits[0]!.metrics,
      y = b.splits[0]!.metrics;
    return (
      (y.recallAt3 ?? 0) +
        (y.noMatchAbstentionRate ?? 0) -
        ((x.recallAt3 ?? 0) + (x.noMatchAbstentionRate ?? 0)) ||
      (y.mrr ?? 0) - (x.mrr ?? 0) ||
      r23Variants.indexOf(a.variant) - r23Variants.indexOf(b.variant)
    );
  })[0]!;
  const selectedHeldOut = selected.splits[1]!.metrics;
  const r21 = baselineReport.results.find(
    (r: { variant: string }) => r.variant === "hybrid-reranked",
  ).heldOut;
  const decision = {
    developmentSelectedVariant: selected.variant,
    selectionUsesHeldOut: false,
    recallTarget: 0.9,
    heldOutRecall: selectedHeldOut.recallAt3,
    recallShortfall: Math.max(0, 0.9 - (selectedHeldOut.recallAt3 ?? 0)),
    meetsRecallTarget: (selectedHeldOut.recallAt3 ?? 0) >= 0.9,
    preservesNoMatchAbstention:
      (selectedHeldOut.noMatchAbstentionRate ?? 0) >= r21.noMatchAbstentionRate,
    preservesAnswerableAbstention:
      (selectedHeldOut.answerableAbstentionRate ?? 1) <=
      r21.answerableAbstentionRate,
    productionReady: false,
    requiredBeforeReplacement: [
      "Fresh independent query groups after freezing the chosen method; repeated use of r21-v1 is exploratory.",
      "Production query/metadata contract, redaction and safety checks; downstream grounded diagnosis evidence and latency/cost acceptance.",
      "Separately scoped production integration; no near-target shortcut or automatic replacement.",
    ],
  };
  const limitations = [
    "Only two fixed input representations with existing model are compared; this is not a global best-model search.",
    "Candidate sets, corpus, labels and cutoff 0.001 stay fixed. Labels/splits are absent from the inference worker.",
    "Input representation is chosen on development only; reused held-out scenarios informed prior hypotheses, so results remain exploratory.",
    "Paired fresh reranker times alternate variant order per query. Pipeline latency combines fresh reranking with historical R2.2 embedding/candidate times; it is an estimate, not fresh end-to-end timing.",
    "Token counts/hashes are measured before truncation; counts above 512 flag affected pairs. These are input diagnostics, not relevance scores.",
    "No production retrieval, Phase 11/11A, downstream diagnosis, external API calls or new dependencies. Synthetic correlated scenario groups and author labels limit generalization.",
  ];
  const report = {
    experiment: "R2.3",
    createdAt: new Date().toISOString(),
    config,
    inputHash,
    configHash: hash(config),
    datasetHash: hash(dataset),
    candidateHash: inference.candidateHash,
    scoresHash: hash(capture),
    sourceHashes,
    baselineScoresHash: hash(r22Capture),
    corpusDocuments: 12,
    corpusSections: 60,
    queryCount: queries.length,
    decision,
    results,
    historicalControls: {
      r21: baselineReport.results,
      r22: r22Report.comparisons,
    },
    setup: { modelLoadMs: capture.modelLoadMs },
    externalCostUsd: 0,
    limitations,
  };
  await save("report.json", report);
  const pct = (n: number | null) =>
    n === null ? "n/a" : `${(n * 100).toFixed(2)}%`;
  const table = results
    .flatMap((r) =>
      r.splits.map(
        (s) =>
          `| ${r.variant} | ${s.split} | ${pct(s.metrics.recallAt3)} | ${s.metrics.mrr?.toFixed(3)} | ${pct(s.candidateRecallAt12)} / ${pct(s.candidateRecallAt24)} | ${pct(s.metrics.noMatchAccuracy)} | ${pct(s.metrics.noMatchPrecision)} | ${pct(s.metrics.noMatchAbstentionRate)} | ${pct(s.metrics.answerableAbstentionRate)} | ${s.pairedRerankLatency.meanMs?.toFixed(2)} / ${s.pairedRerankLatency.p95Ms?.toFixed(2)} | ${s.truncation.truncatedPairCount}/${s.truncation.pairCount} |`,
      ),
    )
    .join("\n");
  const md = `# R2.3 reranker failure analysis\n\nFixed R2.2 candidate sets, unchanged 12-runbook /60-section corpus and r21-v1 labels. Same pinned q8 model and cutoff 0.001. One intervention: add the same runbook's existing Symptoms section before the target section.\n\n| Input | Split | Recall@3 | MRR | Candidate R@12 /24 | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Paired rerank mean /p95 ms | Truncated pairs |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${table}\n\nDevelopment-selected input: **${selected.variant}**. Held-out Recall@3: **${pct(selectedHeldOut.recallAt3)}**; target 90%; shortfall ${pct(decision.recallShortfall)} percentage points. Production ready: **no**. No thresholds were recalibrated. report.json preserves per-query raw score margins, rankings, candidate/cutoff/ranking losses, no-match confusion, overall abstention, token counts and pipeline latency estimates.\n\nRecall is macro section recall over answerable queries, MRR uses first relevant rank; no-match accuracy covers all queries and precision covers predicted abstentions. Counts for loss reasons are gold-section occurrences, not independent incidents. Empty denominators yield null. p95 uses nearest rank.\n\n## Reproduce\n\n\`rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r23.ts\` creates a new local cached-model run. Replay with \`--scores ${relative(root, join(out, "scores.json")).replaceAll("\\", "/")}\`; source/config/dataset/candidate and saved-score provenance are checked. Existing directories and baseline output paths are rejected.\n\n## Before replacing production\n\n${decision.requiredBeforeReplacement.map((s) => `- ${s}`).join("\n")}\n\n## Limits\n\n${limitations.map((s) => `- ${s}`).join("\n")}\n`;
  await writeFile(join(out, "report.md"), md, { flag: "wx" });
  console.log(md);
}
if (import.meta.main) await main();
