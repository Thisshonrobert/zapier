import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  loadRunbooks,
  searchRunbooks,
  type RunbookIndex,
  type RunbookSearchInput,
  type RunbookMatch,
} from "../tools/search-runbooks.ts";
import {
  classifyIntent,
  intentMetrics,
  validateBenchmark,
} from "./retrieval-intent.ts";

export const variants = [
  "baseline",
  "metadata",
  "multi-query",
  "combined",
] as const;
type Variant = (typeof variants)[number];
const headings = {
  EVIDENCE_GATHERING: ["Evidence needed"],
  ROOT_CAUSE: ["Symptoms", "Read-only investigation"],
  REMEDIATION: ["Allowed remediation", "Verification, rollback, or escalation"],
  CONSTRAINTS: ["Forbidden actions", "Replay and approval"],
} as const;

// These fixed procedural facets are not diagnoses. Caller supplies sanitized observed
// evidence via retrievalInput(), or an explicit synthetic development question.
export function planQueries(input: RunbookSearchInput): RunbookSearchInput[] {
  return [
    "",
    "allowed remediation repair ",
    "forbidden actions replay approval ",
  ].map((prefix) => ({
    ...input,
    query: prefix + input.query.slice(0, 500 - prefix.length),
    limit: 3,
  }));
}

function headingIntent(heading: string) {
  return (
    (Object.keys(headings) as Array<keyof typeof headings>).find((intent) =>
      (headings[intent] as readonly string[]).includes(heading),
    ) ?? null
  );
}

export function retrieveVariant(
  index: RunbookIndex,
  input: RunbookSearchInput,
  variant: Variant,
): RunbookMatch[] {
  // Preserve production validation, filters, and exact baseline scores/order.
  const baseline = searchRunbooks(index, input);
  if (variant === "baseline" || baseline.length === 0) return baseline;
  const metadata = variant === "metadata" || variant === "combined";
  const intent = classifyIntent(input.query);
  const pool = index.filter((section) => {
    if (
      metadata &&
      (intent
        ? headingIntent(section.heading) !== intent
        : !headingIntent(section.heading))
    )
      return false;
    // A prefix cannot introduce an unrelated candidate or manufacture a no-match hit.
    return searchRunbooks([section], input).length > 0;
  });
  if (variant === "metadata") return searchRunbooks(pool, input);

  const merged = new Map<string, RunbookMatch>();
  for (const query of planQueries(input)) {
    searchRunbooks(pool, query).forEach((match, rank) => {
      const previous = merged.get(match.citation);
      merged.set(match.citation, {
        ...match,
        score: (previous?.score ?? 0) + 1 / (60 + rank + 1),
      });
    });
  }
  return [...merged.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.citation < b.citation ? -1 : a.citation > b.citation ? 1 : 0),
    )
    .slice(0, input.limit ?? 3);
}

type DevelopmentQuery = {
  id: string;
  split: string;
  query: string;
  providers: readonly string[];
  relevantCitations: readonly string[];
};

export function compareDevelopment(
  index: RunbookIndex,
  queries: readonly DevelopmentQuery[],
) {
  if (queries.some((q) => q.split !== "development"))
    throw new Error("Development-only experiment");
  if (new Set(queries.map((q) => q.id)).size !== queries.length)
    throw new Error("Duplicate development ID");
  return variants.map((name) => {
    const rows = queries.map((q) => {
      // Do not forward benchmark intent, gold citations, taxonomy, or support labels.
      const input = { query: q.query, providers: q.providers, limit: 3 };
      const start = performance.now();
      const matches = retrieveVariant(index, input, name);
      const latencyMs = performance.now() - start;
      const intent = classifyIntent(q.query);
      return {
        id: q.id,
        input,
        queries:
          name === "multi-query" || name === "combined"
            ? planQueries(input)
            : [input],
        relevant: q.relevantCitations,
        returned: matches.map((m) => m.citation),
        contentHashes: matches.map((m) => m.contentHash),
        latencyMs,
        wrongIntentFlags: matches.filter(
          (m) =>
            !q.relevantCitations.includes(m.citation) &&
            intent &&
            headingIntent(m.heading) &&
            headingIntent(m.heading) !== intent,
        ).length,
      };
    });
    return {
      name,
      metrics: {
        ...intentMetrics(rows),
        wrongIntentFlags: rows.reduce((n, r) => n + r.wrongIntentFlags, 0),
      },
      rows,
    };
  });
}

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const captureDirectory = "apps/ai_agent/evaluation/phase-11a-baseline-v6";
const benchmarkPath = "apps/ai_agent/evaluation/intent-dev/benchmark.json";

export async function runMultiQueryExperiment(output: string) {
  const { retrievalInput } = await import("../graph.ts");
  const { buildDiagnosisPrompt } = await import("../prompts.ts");
  const { CapturedEvaluationContextSchema, EvaluationCaseSchema } =
    await import("./checks.ts");
  // Outputs are new artifacts only, never frozen baselines or production paths.
  const out = resolve(output);
  const allowed = [
    join(root, ".tmp-turbo-user"),
    join(root, "apps/ai_agent/evaluation/multi-query/runs"),
  ];
  if (
    !allowed.some(
      (parent) => out.startsWith(parent + "/") || out.startsWith(parent + "\\"),
    )
  )
    throw new Error(
      "Use a new output directory under .tmp-turbo-user or evaluation/multi-query/runs",
    );
  const inputHashes: Record<string, string> = {};
  async function readJson(path: string) {
    const data = await readFile(join(root, path), "utf8");
    inputHashes[path] = hash(data);
    return JSON.parse(data) as unknown;
  }
  const manifest = z
    .object({
      split: z.literal("development"),
      artifact_hashes: z.record(z.string(), z.string()),
    })
    .parse(await readJson(`${captureDirectory}/manifest.json`));
  const cases = z
    .array(EvaluationCaseSchema)
    .min(1)
    .max(18)
    .parse(await readJson(`${captureDirectory}/cases.json`));
  const contexts = z
    .array(CapturedEvaluationContextSchema)
    .min(1)
    .max(18)
    .parse(await readJson(`${captureDirectory}/contexts.json`));
  for (const name of ["cases.json", "contexts.json"]) {
    if (
      inputHashes[`${captureDirectory}/${name}`] !==
      manifest.artifact_hashes[name]
    )
      throw new Error(`Frozen ${name} hash mismatch`);
  }
  if (
    cases.some((c) => c.split !== "development") ||
    new Set(cases.map((c) => c.case_id)).size !== cases.length ||
    new Set(contexts.map((c) => c.case_id)).size !== contexts.length ||
    cases.length !== contexts.length ||
    contexts.some((c) => !cases.some((item) => item.case_id === c.case_id))
  )
    throw new Error("Incomplete or non-development capture");

  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const benchmark = z
    .object({ queries: z.unknown() })
    .parse(await readJson(benchmarkPath));
  const queries = validateBenchmark(
    benchmark.queries,
    Object.fromEntries(
      index.map((s) => [s.citation, `${s.heading}\n${s.content}`]),
    ),
  );
  const intentResults = compareDevelopment(index, queries);
  const graphResults = variants.map((name) => {
    let excludedControls = 0;
    const rows = contexts.flatMap((context) => {
      const item = cases.find((c) => c.case_id === context.case_id)!;
      if (context.rejection) {
        if (item.expected_policy.model_invocation !== "forbidden")
          throw new Error("Unexpected capture rejection");
        excludedControls++;
        return [];
      }
      if (
        context.failure ||
        !context.evidence ||
        !context.retrieval ||
        item.expected_policy.model_invocation === "forbidden"
      )
        throw new Error("Incomplete capture or forbidden retrieval");
      const input = retrievalInput(context.evidence);
      if (JSON.stringify(input) !== JSON.stringify(context.retrieval.input))
        throw new Error("Captured query differs from current graph query");
      const start = performance.now();
      const matches = retrieveVariant(index, input, name);
      const latencyMs = performance.now() - start;
      // Labels enter scoring only, never query construction or filtering.
      const relevant = index.filter((s) =>
        s.taxonomy.some((t) =>
          item.expected_diagnoses.includes(
            t as (typeof item.expected_diagnoses)[number],
          ),
        ),
      );
      const prompt = buildDiagnosisPrompt(context.evidence, matches);
      return [
        {
          id: item.case_id,
          input,
          queries:
            name === "multi-query" || name === "combined"
              ? planQueries(input)
              : [input],
          returned: matches.map((m) => m.citation),
          contentHashes: matches.map((m) => m.contentHash),
          familyEligible: relevant.length > 0,
          familyHit: matches.some((m) =>
            relevant.some((s) => s.id === m.runbookId),
          ),
          latencyMs,
          promptCharacters: prompt.instructions.length + prompt.input.length,
        },
      ];
    });
    const eligible = rows.filter((r) => r.familyEligible);
    const times = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
    return {
      name,
      excludedControls,
      rows,
      metrics: {
        queryCount: rows.length,
        eligibleFamilyQueries: eligible.length,
        familyHitRateAt3: eligible.length
          ? eligible.filter((r) => r.familyHit).length / eligible.length
          : null,
        meanLatencyMs: times.length
          ? times.reduce((a, b) => a + b, 0) / times.length
          : null,
        p95LatencyMs: times[Math.ceil(times.length * 0.95) - 1] ?? null,
      },
    };
  });

  const baseline = intentResults[0]!.metrics;
  const graphBaseline = graphResults[0]!.metrics;
  const combined = intentResults[3]!.metrics;
  const graphCombined = graphResults[3]!.metrics;
  const candidateImproved =
    (combined.recallAt3 ?? 0) >= (baseline.recallAt3 ?? 0) &&
    (combined.precisionAt3 ?? 0) >= (baseline.precisionAt3 ?? 0) &&
    (combined.noMatchAbstentionRate ?? 0) >=
      (baseline.noMatchAbstentionRate ?? 0) &&
    (combined.answerableAbstentionRate ?? 0) <=
      (baseline.answerableAbstentionRate ?? 0) &&
    (graphCombined.familyHitRateAt3 ?? 0) >=
      (graphBaseline.familyHitRateAt3 ?? 0) &&
    ((combined.recallAt3 ?? 0) > (baseline.recallAt3 ?? 0) ||
      (combined.precisionAt3 ?? 0) > (baseline.precisionAt3 ?? 0));
  const limitations = [
    "Development-only, synthetic, previously inspected and author-labeled inputs; fresh held-out data is never read. No statistical or production acceptance claim.",
    "Graph family hit rate is coarse any-family coverage, not section-level recall or precision. Operational-intent metrics use direct section labels.",
    "Heading metadata is a heuristic; mixed passage intent is not semantically adjudicated. Most production runbooks allow generic providers, limiting provider-filter discrimination.",
    "Query expansion only reranks candidates with original-query lexical overlap. It cannot recover zero-overlap paraphrases. Prefixes and RRF k=60 are fixed before this run.",
    "No diagnosis model is invoked. Downstream diagnosis quality, grounding and end-to-end latency/cost remain unmeasured; prompt construction is not model acceptance evidence.",
    "Local retrieval timing is a single CPU sample per query, including validation and candidate gating; it is not a production performance benchmark.",
    "Production graph, retrieval contract, runbooks, prompts and replay authority remain unchanged. At most three excerpts retain their existing citations, hashes and untrusted-guidance markers.",
  ];
  const report = {
    version: "multi-query-metadata-dev-v1",
    productionChanged: false,
    configuration: {
      facets: [
        "original",
        "allowed remediation repair",
        "forbidden actions replay approval",
      ],
      rrfK: 60,
      resultLimit: 3,
      candidateGate: "original-query-positive-score",
      headingMetadata: headings,
    },
    intentResults,
    graphResults,
    modelInvocations: 0,
    externalApiCostUsd: 0,
    downstreamDiagnosis: "unmeasured",
    recommendation: candidateImproved
      ? "Combined candidate merits independent validation; do not adopt production yet."
      : "Keep production baseline; combined candidate does not meet the development improvement gate.",
    limitations,
  };
  const sourceHashes: Record<string, string> = {};
  for (const path of [
    "apps/ai_agent/src/evaluation/retrieval-multi-query.ts",
    "apps/ai_agent/src/evaluation/retrieval-intent.ts",
    "apps/ai_agent/src/tools/search-runbooks.ts",
    "apps/ai_agent/src/graph.ts",
    "apps/ai_agent/src/prompts.ts",
  ])
    sourceHashes[path] = hash(await readFile(join(root, path)));
  const rows = intentResults.map((v) => {
    const m = v.metrics;
    const percent = (n: number | null) =>
      n === null ? "unmeasured" : `${(100 * n).toFixed(2)}%`;
    return `| ${v.name} | ${percent(m.recallAt3)} | ${percent(m.precisionAt3)} | ${percent(m.noMatchAbstentionRate)} | ${m.wrongIntentFlags} | ${m.latency.meanMs?.toFixed(3)} |`;
  });
  const text = `# Multi-query and metadata development comparison\n\n${queries.length} operational-intent queries (${baseline.positiveQueryCount} answerable, ${baseline.noMatchQueryCount} no-match); ${cases.length} captured development cases. Fixed production corpus: ${index.length} sections.\n\n| Variant | Section Recall@3 | Precision among returns | No-match abstention | Wrong-intent flags | Mean local ms |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${rows.join("\n")}\n\n${graphResults.map((v) => `${v.name}: family coverage ${v.rows.filter((r) => r.familyHit && r.familyEligible).length}/${v.metrics.eligibleFamilyQueries}; ${v.excludedControls} controls excluded; mean local retrieval ${v.metrics.meanLatencyMs?.toFixed(3)} ms.`).join("\n\n")}\n\n${report.recommendation}\n\nExternal API cost: $0; model calls: 0. Downstream diagnosis remains unmeasured.\n\n${limitations.map((l) => `- ${l}`).join("\n")}\n`;
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out); // Fails if any prior artifact directory exists.
  const files = { "report.json": json(report), "report.md": text };
  for (const [name, data] of Object.entries(files))
    await writeFile(join(out, name), data, { flag: "wx" });
  await writeFile(
    join(out, "manifest.json"),
    json({
      version: report.version,
      inputHashes,
      sourceHashes,
      corpusHash: hash(
        json(
          index.map((s) => ({
            citation: s.citation,
            contentHash: s.contentHash,
            providers: s.providers,
            taxonomy: s.taxonomy,
          })),
        ),
      ),
      artifactHashes: Object.fromEntries(
        Object.entries(files).map(([name, data]) => [name, hash(data)]),
      ),
    }),
    { flag: "wx" },
  );
  return report;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: { output: { type: "string" } },
    strict: true,
  });
  if (!values.output)
    throw new Error("--output is required; use a new artifact directory");
  const report = await runMultiQueryExperiment(values.output);
  console.log(report.recommendation);
}
