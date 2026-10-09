import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { hash, metrics } from "./retrieval-r21.ts";
import { loadR23 } from "./retrieval-r23.ts";
import { diagnoseR23 } from "./r23-analysis.ts";
import { validateScores } from "./retrieval-r2.ts";
import { rowsAtR24, selectR24 } from "./r24-analysis.ts";
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const directory = join(root, "apps/ai_agent/evaluation/r24");
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
    experimentVersion: z.literal("r24-v1"),
    datasetVersion: z.literal("r21-v1"),
    candidateSource: z.literal("r22-v1-local"),
    candidateLimit: z.literal(24),
    maxLength: z.literal(512),
    batchSize: z.literal(8),
    device: z.literal("cpu"),
    models,
    modelFiles: z.array(z.unknown()),
    modelFileHashes: z.record(z.string(), sha),
    baselineHashes: z.record(z.string(), sha),
    thresholds: z.array(z.number().finite().min(0).max(1)).min(2).max(32),
    recallTarget: z.literal(0.9),
    selection: z.literal(
      "development_recall_plus_no_match_then_MRR_then_lower_answerable_abstention_then_lower_threshold",
    ),
  })
  .strict();
const RecordSchema = z
  .object({
    logits: z.record(z.string(), z.number().finite()),
    tokenCounts: z.record(z.string(), z.number().int().nonnegative()),
    tokenHashes: z.record(z.string(), sha),
    rerankMs: z.number().finite().nonnegative(),
  })
  .strict();
const CaptureSchema = z
  .object({
    inputHash: sha,
    configHash: sha,
    models,
    modelLoadMs: z.number().finite().nonnegative(),
    records: z.record(z.string(), RecordSchema),
  })
  .strict();

export function validateR24Capture(
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
    const r = capture.records[q.id];
    if (!r) throw new Error("Missing query capture");
    validateScores(r.logits, q.candidates, -Number.MAX_VALUE, Number.MAX_VALUE);
    validateScores(r.tokenCounts, q.candidates, 3, Number.MAX_SAFE_INTEGER);
    if (
      Object.keys(r.tokenHashes).length !== q.candidates.length ||
      q.candidates.some((c) => !r.tokenHashes[c])
    )
      throw new Error("Missing token hash");
  }
  return capture;
}

async function main() {
  const { values } = parseArgs({
    options: { output: { type: "string" }, scores: { type: "string" } },
    strict: true,
  });
  const config = ConfigSchema.parse(await json(join(directory, "config.json")));
  if (
    config.models.reranker.id !== "Xenova/bge-reranker-base" ||
    !config.thresholds.includes(0.001) ||
    !config.thresholds.includes(0) ||
    new Set(config.thresholds).size !== config.thresholds.length
  )
    throw new Error("Invalid frozen model/threshold configuration");
  for (const [p, expected] of Object.entries(config.baselineHashes)) {
    const path = resolve(root, p),
      rel = relative(root, path);
    if (
      rel.startsWith("..") ||
      isAbsolute(rel) ||
      (await fileHash(path)) !== expected
    )
      throw new Error(`Frozen R2.3 file changed: ${p}`);
  }
  const { index, queries, dataset, r22Capture, baselineReport, r22Report } =
    await loadR23();
  const inferenceQueries = queries.map(({ id, query }) => ({
    id,
    query,
    candidates: r22Capture.records[id]!.candidates,
    passages: Object.fromEntries(
      r22Capture.records[id]!.candidates.map((c) => {
        const s = index.find((s) => s.citation === c)!;
        return [c, `${s.heading}\n${s.content}`];
      }),
    ),
  }));
  const paths = ["retrieval-r24.ts", "r24-analysis.ts", "r24-models.mjs"].map(
    (p) => `apps/ai_agent/src/evaluation/${p}`,
  );
  const sourceHashes = Object.fromEntries(
    await Promise.all(
      paths.map(async (p) => [p, await fileHash(join(root, p))]),
    ),
  );
  const inference = {
    config,
    queries: inferenceQueries,
    datasetHash: hash(dataset),
    sourceHashes,
    baselineScoresHash: hash(r22Capture),
    candidateHash: hash(
      inferenceQueries.map((q) => ({ id: q.id, candidates: q.candidates })),
    ),
  };
  const inputHash = hash(inference),
    out = resolve(
      root,
      values.output ??
        `apps/ai_agent/evaluation/r24/runs/${new Date().toISOString().replace(/[:.]/g, "-")}`,
    );
  const rel = relative(root, out).replaceAll("\\", "/");
  if (
    isAbsolute(rel) ||
    !["apps/ai_agent/evaluation/r24/runs/", ".tmp-turbo-user/"].some((prefix) =>
      rel.startsWith(prefix),
    )
  )
    throw new Error(
      "Output must be a new R2.4 run or ignored temporary directory",
    );
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out);
  const save = (name: string, value: unknown) =>
    writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", {
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
        fileURLToPath(new URL("./r24-models.mjs", import.meta.url)),
        join(out, "inference-inputs.json"),
        scoresPath,
      ],
      { cwd: root, stdio: "inherit", timeout: 1200000 },
    );
  const capture = validateR24Capture(
    await json(scoresPath),
    inputHash,
    hash(config),
    config.models,
    inferenceQueries,
  );
  if (values.scores) {
    const prior = await json(join(dirname(scoresPath), "report.json"));
    if (
      prior.scoresHash !== hash(capture) ||
      prior.inputHash !== inputHash ||
      prior.configHash !== hash(config) ||
      prior.datasetHash !== hash(dataset) ||
      hash(prior.sourceHashes) !== hash(sourceHashes)
    )
      throw new Error("Frozen replay score/report provenance mismatch");
    await save("scores.json", capture);
  }
  const rawRows = queries.map((q) => ({
    id: q.id,
    group: q.scenarioGroup,
    kind: q.kind,
    split: q.split,
    relevant: q.relevantCitations,
    candidates: r22Capture.records[q.id]!.candidates,
    logits: capture.records[q.id]!.logits,
    latencyMs: capture.records[q.id]!.rerankMs,
  }));
  const calibration = selectR24(rawRows, config.thresholds);
  const rows = rowsAtR24(rawRows, calibration.threshold).map((r, i) => {
    const diagnosis = diagnoseR23(r.relevant, r.candidates, r.logits),
      source = rawRows[i]!;
    return {
      ...r,
      id: source.id,
      group: source.group,
      kind: source.kind,
      ranking: diagnosis.ranking,
      gold: diagnosis.gold.map((g) => ({
        ...g,
        reason:
          g.score === null
            ? "candidate"
            : g.score < calibration.threshold
              ? "cutoff"
              : r.returned.includes(g.citation)
                ? "returned"
                : "ranking",
      })),
      tokenCounts: capture.records[source.id]!.tokenCounts,
    };
  });
  const splits = ["development", "held_out"].map((split) => {
    const selected = rows.filter((r) => r.split === split),
      gold = selected.flatMap((r) => r.gold);
    return {
      split,
      metrics: metrics(selected),
      candidateRecallAt12: metrics(
        selected.map((r) => ({ ...r, returned: r.candidates.slice(0, 12) })),
      ).recallAt3,
      candidateRecallAt24: metrics(
        selected.map((r) => ({ ...r, returned: r.candidates })),
      ).recallAt3,
      losses: Object.fromEntries(
        ["candidate", "cutoff", "ranking", "returned"].map((reason) => [
          reason,
          gold.filter((g) => g.reason === reason).length,
        ]),
      ),
      maximumPairTokens: Math.max(
        0,
        ...selected.flatMap((r) => Object.values(r.tokenCounts)),
      ),
      truncatedPairs: selected.reduce(
        (sum, r) =>
          sum + Object.values(r.tokenCounts).filter((n) => n > 512).length,
        0,
      ),
    };
  });
  const controls = [0, 0.001].map((threshold) => ({
    threshold,
    splits: ["development", "held_out"].map((split) => ({
      split,
      metrics: metrics(
        rowsAtR24(
          rawRows.filter((r) => r.split === split),
          threshold,
        ),
      ),
    })),
  }));
  const r21 = baselineReport.results.find(
    (r: { variant: string }) => r.variant === "hybrid-reranked",
  );
  const held = splits[1]!.metrics;
  const decision = {
    recallTarget: 0.9,
    heldOutRecall: held.recallAt3,
    recallShortfall: Math.max(0, 0.9 - (held.recallAt3 ?? 0)),
    meetsRecallTarget: (held.recallAt3 ?? 0) >= 0.9,
    preservesNoMatchAbstention:
      (held.noMatchAbstentionRate ?? 0) >= r21.heldOut.noMatchAbstentionRate,
    preservesAnswerableAbstention:
      (held.answerableAbstentionRate ?? 1) <=
      r21.heldOut.answerableAbstentionRate,
    productionReady: false,
    reason:
      "Reused synthetic held-out groups are exploratory. Independent evaluation, downstream safety and operational validation are required before separately scoped production replacement.",
  };
  const limitations = [
    "BGE-base q8 is the only additional model tested; no claim of global best retrieval.",
    "R2.3 context intervention was rejected. R2.4 changes reranker family and calibrates its score cutoff on development only; old cutoff .001 and zero cutoff remain controls.",
    "Candidate pool, ordering, passage text, dataset and corpus remain frozen. Labels/splits are absent from the inference process.",
    "Reported latency is fresh reranker inference only (tokenization included), not end-to-end retrieval; historical R2.1/R2.2 pipeline timing is not directly comparable.",
    "Public pinned model download is one-time setup in ignored cache, not an API inference service. Model bytes/tokenizer/config hashes are frozen and live runs are local-only. External inference cost USD 0.",
    "No production retrieval, Phase 11/11A, downstream diagnosis or dependency edits. Author-labelled correlated synthetic groups do not establish deployment readiness.",
  ];
  const report = {
    experiment: "R2.4",
    createdAt: new Date().toISOString(),
    inputHash,
    configHash: hash(config),
    datasetHash: hash(dataset),
    candidateHash: inference.candidateHash,
    sourceHashes,
    scoresHash: hash(capture),
    config,
    calibration,
    splits,
    controls,
    rows,
    decision,
    historicalControls: {
      r21: baselineReport.results,
      r22: r22Report.comparisons,
    },
    modelLoadMs: capture.modelLoadMs,
    externalCostUsd: 0,
    limitations,
  };
  await save("report.json", report);
  const pct = (n: number | null) =>
    n === null ? "n/a" : `${(n * 100).toFixed(2)}%`;
  const table = splits
    .map(
      (s) =>
        `| ${s.split} | ${pct(s.metrics.recallAt3)} | ${s.metrics.mrr?.toFixed(3)} | ${pct(s.candidateRecallAt12)} / ${pct(s.candidateRecallAt24)} | ${pct(s.metrics.noMatchAccuracy)} | ${pct(s.metrics.noMatchPrecision)} | ${pct(s.metrics.noMatchAbstentionRate)} | ${pct(s.metrics.answerableAbstentionRate)} | ${s.metrics.latency.meanMs?.toFixed(2)} / ${s.metrics.latency.p95Ms?.toFixed(2)} |`,
    )
    .join("\n");
  const md = `# R2.4 fixed-pool BGE-base comparison\n\nPinned model ${config.models.reranker.id}@${config.models.reranker.revision}, q8 CPU, unchanged R2.2 candidate sets and original passage text. Development-selected sigmoid cutoff: **${calibration.threshold}**. No held-out threshold selection.\n\n| Split | Recall@3 | MRR | Candidate R@12 /24 | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Rerank mean /p95 ms |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${table}\n\nHeld-out recall target 90%; shortfall ${(decision.recallShortfall * 100).toFixed(2)} percentage points. Production ready: **no**. Full calibration grid, controls at 0 and .001, rankings, logits, tokenization diagnostics and no-match confusion/overall abstention are preserved in report.json. Recall is macro section recall over answerable queries; MRR uses first relevant rank. No-match accuracy includes answerable queries; precision measures predicted abstentions. Null indicates empty denominators. p95 uses nearest rank.\n\n## Reproduce\n\n\`rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r24.ts\` runs verified local pinned cache only. Replay with \`--scores ${relative(root, join(out, "scores.json")).replaceAll("\\", "/")}\`. Existing outputs and baseline paths are rejected; config/input/dataset/source/candidate and saved score provenance is validated.\n\n## Limits\n\n${limitations.map((s) => `- ${s}`).join("\n")}\n`;
  await writeFile(join(out, "report.md"), md, { flag: "wx" });
  console.log(md);
}
if (import.meta.main) await main();
