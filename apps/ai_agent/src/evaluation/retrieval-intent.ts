import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { hash, metrics } from "./retrieval-r21.ts";
import { loadR2Corpus, validateScores } from "./retrieval-r2.ts";
import { eligibleR25 } from "./r25-analysis.ts";
import { rowsAtR24 } from "./r24-analysis.ts";

export const intents = [
  "EVIDENCE_GATHERING",
  "REMEDIATION",
  "CONSTRAINTS",
  "ROOT_CAUSE",
] as const;
type Intent = (typeof intents)[number];
const prefixes: Record<Intent, string> = {
  EVIDENCE_GATHERING: "Find diagnostic evidence to collect: ",
  REMEDIATION: "Find allowed repair actions: ",
  CONSTRAINTS: "Find forbidden actions and safety constraints: ",
  ROOT_CAUSE: "Find how to distinguish causes from observed symptoms: ",
};

// Bounded experiment: explicit task wording only; ambiguous queries stay unchanged.
// Labels are never passed to this classifier or the model.
export function classifyIntent(query: string): Intent | null {
  const task = query
    .toLowerCase()
    .split(/[?,]|\b(?:after|before|including)\b/)[0]!;
  if (
    /\b(evidence|captured information|captured facts)\b/.test(task) &&
    /\b(collect|needed|missing|what|which)\b/.test(task)
  )
    return "EVIDENCE_GATHERING";
  if (
    /\b(forbidden|prohibited|constraints|must not|cannot|can investigation)\b/.test(
      task,
    )
  )
    return "CONSTRAINTS";
  if (/\b(why|distinguish|cause|caused)\b/.test(task)) return "ROOT_CAUSE";
  if (/\b(repair|remediation|correct configuration|restore)\b/.test(task))
    return "REMEDIATION";
  return null;
}
export function conditionQuery(query: string) {
  const intent = classifyIntent(query);
  return intent ? prefixes[intent] + query : query;
}

const Query = z
  .object({
    id: z.string().min(1),
    scenarioGroup: z.string().optional(),
    split: z.literal("development"),
    intent: z.enum(intents),
    query: z.string().min(1).max(400),
    providers: z.array(z.string()),
    taxonomy: z.array(z.string()),
    relevantCitations: z.array(z.string()).max(3),
    support: z.record(z.string(), z.string().min(1)),
  })
  .strict();
export function validateBenchmark(
  raw: unknown,
  passages: Record<string, string>,
) {
  const queries = z.array(Query).min(1).max(48).parse(raw);
  if (
    new Set(queries.map((q) => q.id)).size !== queries.length ||
    new Set(queries.map((q) => q.query)).size !== queries.length
  )
    throw new Error("Duplicate benchmark query");
  for (const q of queries) {
    if (
      new Set(q.relevantCitations).size !== q.relevantCitations.length ||
      hash(Object.keys(q.support).sort()) !==
        hash([...q.relevantCitations].sort())
    )
      throw new Error("Incomplete support labels");
    for (const c of q.relevantCitations)
      if (!passages[c]?.includes(q.support[c]!))
        throw new Error("Unsupported benchmark gold");
  }
  return queries;
}
export function intentMetrics(
  rows: {
    relevant: readonly string[];
    returned: readonly string[];
    latencyMs: number;
  }[],
) {
  const positive = rows.filter((r) => r.relevant.length);
  return {
    ...metrics(rows),
    precisionAt3: positive.length
      ? positive.reduce(
          (n, r) =>
            n +
            (r.returned.length
              ? r.returned.filter((c) => r.relevant.includes(c)).length /
                r.returned.length
              : 0),
          0,
        ) / positive.length
      : null,
  };
}
function sectionIntent(passage: string): Intent | null {
  const heading = passage.split("\n")[0]?.toLowerCase();
  return heading === "evidence needed"
    ? "EVIDENCE_GATHERING"
    : heading === "allowed remediation"
      ? "REMEDIATION"
      : heading === "forbidden actions" || heading === "replay and approval"
        ? "CONSTRAINTS"
        : heading === "read-only investigation"
          ? "ROOT_CAUSE"
          : null;
}

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const base = join(root, "apps/ai_agent/evaluation/r25");
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const fileHash = async (p: string) =>
  createHash("sha256")
    .update(await readFile(p))
    .digest("hex");
async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: "string" },
      prepare: { type: "boolean" },
      scores: { type: "string" },
    },
    strict: true,
  });
  if (!values.output) throw new Error("Provide a new --output directory");
  const out = resolve(root, values.output),
    rel = relative(root, out).replaceAll("\\", "/");
  if (
    isAbsolute(rel) ||
    !["apps/ai_agent/evaluation/intent-dev/runs/", ".tmp-turbo-user/"].some(
      (p) => rel.startsWith(p),
    )
  )
    throw new Error("Invalid output directory");
  const frozen = await json(join(base, "method-freeze.json"));
  if (frozen.method !== "minilm-original" || frozen.config.cutoff !== 0.001)
    throw new Error("Unexpected frozen baseline");
  for (const [p, expected] of Object.entries(frozen.sourceHashes))
    if (
      (await fileHash(fileURLToPath(new URL(p, import.meta.url)))) !== expected
    )
      throw new Error(`Frozen source changed: ${p}`);
  const index = await loadR2Corpus();
  if (
    hash(index.map(({ headingTerms, contentTerms, ...s }) => s)) !==
    frozen.corpusHash
  )
    throw new Error("Frozen corpus changed");
  const passages = Object.fromEntries(
    index.map((s) => [s.citation, `${s.heading}\n${s.content}`]),
  );
  const dataset = await json(
    join(root, "apps/ai_agent/evaluation/intent-dev/benchmark.json"),
  );
  if (dataset.recallTarget !== 0.8)
    throw new Error("Expected authorized 80% target");
  const queries = validateBenchmark(dataset.queries, passages);
  if (intents.some((i) => queries.filter((q) => q.intent === i).length !== 7))
    throw new Error(
      "Benchmark must have six positives and one no-match per intent",
    );
  const inference = {
    config: frozen.config,
    queries: queries.flatMap((q) => {
      const eligible = eligibleR25(index, q),
        candidates = eligible.map((s) => s.citation);
      if (q.relevantCitations.some((c) => !candidates.includes(c)))
        throw new Error("Filtered gold label");
      return ["baseline", "conditioned"].map((variant) => ({
        id: `${q.id}:${variant}`,
        query: variant === "baseline" ? q.query : conditionQuery(q.query),
        candidates,
        passages: Object.fromEntries(candidates.map((c) => [c, passages[c]])),
      }));
    }),
    freezeHash: hash(frozen),
    datasetHash: hash(dataset),
    interventionHash: hash(prefixes),
    sourceHash: await fileHash(fileURLToPath(import.meta.url)),
  };
  const inputHash = hash(inference);
  // Dev-only diagnostic audit. Fresh dataset/capture paths are never opened.
  const oldDataset = await json(
    join(base, "runs/exhaustive-v2/dataset-audited.json"),
  );
  const oldReport = await json(join(base, "runs/exhaustive-v2/report.json"));
  const oldInput = await json(
    join(base, "runs/exhaustive-v2/inference-inputs.json"),
  );
  const { inputHash: oldHash, ...oldPayload } = oldInput;
  if (
    hash(oldPayload) !== oldHash ||
    oldReport.inputHash !== oldHash ||
    oldReport.auditedDatasetHash !== hash(oldDataset)
  )
    throw new Error("Development audit provenance changed");
  const oldControl = oldReport.results
    .find((r: any) => r.labelVersion === "r25-audited-v1")
    .controls.find((c: any) => c.cutoff === 0.001);
  const audit = oldDataset.queries
    .filter((q: any) => q.split === "development")
    .map((q: any) => {
      const returned: string[] = oldControl.rows.find(
        (r: any) => r.id === q.id,
      ).returned;
      const intent = classifyIntent(q.query);
      return {
        id: q.id,
        query: q.query,
        intent,
        relevant: q.relevantCitations,
        returned,
        missingGold: q.relevantCitations.filter(
          (c: string) => !returned.includes(c),
        ),
        extraSections: returned
          .filter((c) => !q.relevantCitations.includes(c))
          .map((c) => ({
            citation: c,
            sectionIntent: sectionIntent(passages[c]!),
            suspectedIntentMismatch:
              intent !== null &&
              sectionIntent(passages[c]!) !== null &&
              intent !== sectionIntent(passages[c]!),
          })),
      };
    });
  await mkdir(resolve(out, ".."), { recursive: true });
  await mkdir(out);
  const save = (p: string, data: unknown) =>
    writeFile(join(out, p), JSON.stringify(data, null, 2) + "\n", {
      flag: "wx",
    });
  await save("benchmark.json", dataset);
  await save("inference-inputs.json", { ...inference, inputHash });
  await save("development-audit.json", {
    datasetHash: hash(oldDataset),
    reportHash: hash(oldReport),
    rows: audit,
    limitation:
      "Extra sections are not automatically irrelevant; heading/task mismatches are heuristic flags. Existing labels were not modified.",
  });
  if (values.prepare) {
    console.log(`Prepared ${queries.length} development queries; ${out}`);
    return;
  }
  const scoresPath = values.scores
    ? resolve(root, values.scores)
    : join(out, "scores.json");
  if (!values.scores)
    execFileSync(
      "node",
      [
        "--experimental-transform-types",
        fileURLToPath(new URL("./r25-models.mjs", import.meta.url)),
        join(out, "inference-inputs.json"),
        scoresPath,
      ],
      { cwd: root, stdio: "inherit", timeout: 600_000 },
    );
  const capture = await json(scoresPath);
  if (
    capture.inputHash !== inputHash ||
    capture.configHash !== hash(inference.config) ||
    Object.keys(capture.records).length !== inference.queries.length
  )
    throw new Error("Capture provenance mismatch");
  for (const q of inference.queries) {
    const r = capture.records[q.id];
    if (!r || !Number.isFinite(r.rerankMs) || r.rerankMs < 0)
      throw new Error("Invalid capture timing");
    validateScores(r.logits, q.candidates, -Number.MAX_VALUE, Number.MAX_VALUE);
    validateScores(r.tokenCounts, q.candidates, 3, Number.MAX_SAFE_INTEGER);
  }
  if (values.scores) await save("scores.json", capture);
  const results = ["baseline", "conditioned"].map((variant) => {
    const rows = rowsAtR24(
      queries.map((q) => {
        const input = inference.queries.find(
            (x) => x.id === `${q.id}:${variant}`,
          )!,
          r = capture.records[input.id];
        return {
          split: q.split,
          relevant: q.relevantCitations,
          candidates: input.candidates,
          logits: r.logits,
          latencyMs: r.rerankMs,
        };
      }),
      frozen.config.cutoff,
    ).map((r, i) => ({ ...r, id: queries[i]!.id, intent: queries[i]!.intent }));
    const measured = intentMetrics(rows);
    return {
      variant,
      metrics: measured,
      meetsRecallTarget: (measured.recallAt3 ?? 0) >= dataset.recallTarget,
      byIntent: intents.map((intent) => ({
        intent,
        metrics: intentMetrics(rows.filter((r) => r.intent === intent)),
      })),
      suspectedWrongIntentReturns: rows.flatMap((r) =>
        r.returned
          .filter(
            (c) =>
              !r.relevant.includes(c) &&
              sectionIntent(passages[c]!) !== null &&
              sectionIntent(passages[c]!) !== r.intent,
          )
          .map((c) => ({
            id: r.id,
            requested: r.intent,
            citation: c,
            returnedIntent: sectionIntent(passages[c]!),
          })),
      ),
      rows,
    };
  });
  const report = {
    experiment: "intent-dev-v1",
    inputHash,
    scoresHash: hash(capture),
    recallTarget: dataset.recallTarget,
    results,
    classifierAccuracy:
      queries.filter((q) => classifyIntent(q.query) === q.intent).length /
      queries.length,
    productionReady: false,
    externalCostUsd: 0,
    limitations: [
      "Synthetic targeted development benchmark, author-labeled, no independent human adjudication.",
      "Rule classifier handles explicit task wording and leaves ambiguous queries unchanged.",
      "Heading-based wrong-intent counts are diagnostic flags, not semantic adjudication.",
      "No fresh held-out data accessed, no threshold/model tuning, no production retrieval change.",
    ],
  };
  await save("report.json", report);
  console.log(
    JSON.stringify(
      results.map(
        ({
          variant,
          metrics: m,
          meetsRecallTarget,
          suspectedWrongIntentReturns,
        }) => ({
          variant,
          metrics: m,
          meetsRecallTarget,
          suspectedWrongIntentReturns: suspectedWrongIntentReturns.length,
        }),
      ),
      null,
      2,
    ),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
