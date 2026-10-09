import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  loadR2Corpus,
  loadR2Queries,
  rankR2,
  summarizeR2,
  calibrateR2,
  validateScores,
  variants,
  type Scores,
} from "./retrieval-r2.ts";
import {
  fixtureHash,
  fixtureInput,
  createFixtureTools,
  fixtureRejection,
} from "./fixture-tools.ts";
import {
  loadEvaluationCases,
  checkEvaluationObservation,
  EvaluationObservationSchema,
  CapturedEvaluationContextSchema,
  type EvaluationObservation,
  type CapturedEvaluationContext,
} from "./checks.ts";
import {
  buildDiagnosisService,
  retrievalInput,
  RunbookMatchSchema,
} from "../graph.ts";
import { GeminiDiagnosisModel } from "../gemini-model.ts";
import { DIAGNOSIS_PROMPT_VERSION } from "../prompts.ts";
import type { IntegratedDiagnosisModel, ModelUsage } from "../contracts.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const { values } = parseArgs({
  options: {
    output: { type: "string", default: "apps/ai_agent/evaluation/r2/results" },
    scores: { type: "string" },
    "diagnosis-report": { type: "string" },
    live: { type: "boolean", default: false },
  },
  strict: true,
});
const directory = resolve(root, values.output!);
if (values.live && values["diagnosis-report"])
  throw new Error("Choose live diagnosis or frozen diagnosis, not both");
if (
  !directory.startsWith(resolve(root) + "\\") &&
  !directory.startsWith(resolve(root) + "/")
)
  throw new Error("R2 output must be inside repository");
await mkdir(directory, { recursive: true });
const index = await loadR2Corpus();
const queries = await loadR2Queries(index);
const allCases = await loadEvaluationCases(
  join(root, "apps/ai_agent/evaluation/cases.jsonl"),
  { includeHeldOut: true },
);
const selectedIds = [
  "f01-rate-limit-rejected",
  "f03-token-missing",
  "f07-expired-lease-after-send",
  "f01-rate-limit-earlier-timeout",
];
const cases = selectedIds.map((id) => {
  const item = allCases.find((c) => c.case_id === id);
  if (!item || fixtureRejection(fixtureInput(item)))
    throw new Error(`Invalid R2 downstream case ${id}`);
  return item;
});
const observedAt = "2026-10-07T00:00:00.000Z";
const adapters = cases.map((item) =>
  createFixtureTools(fixtureInput(item), index, observedAt),
);
const downstreamQueries = adapters.map((adapter, i) => ({
  id: `diagnosis-${cases[i]!.case_id}`,
  ...retrievalInput(adapter.bundle),
}));
const corpus = index.map((s) => ({
  ...s,
  headingTerms: [...s.headingTerms],
  contentTerms: [...s.contentTerms],
}));
const frozen = {
  corpus,
  queries: [
    ...queries.map(({ id, query, taxonomy, providers }) => ({
      id,
      query,
      taxonomy,
      providers,
    })),
    ...downstreamQueries,
  ],
};
const inputHash = fixtureHash(frozen);
const inputPath = join(directory, "inputs.json");
await writeFile(
  inputPath,
  JSON.stringify(
    {
      ...frozen,
      inputHash,
      labels: queries,
      diagnosisCases: cases,
      evidence: adapters.map((a) => a.bundle),
      promptVersion: DIAGNOSIS_PROMPT_VERSION,
    },
    null,
    2,
  ) + "\n",
);
const scoresPath = values.scores
  ? resolve(root, values.scores)
  : join(directory, "scores.json");
if (!values.scores)
  execFileSync(
    process.execPath.includes("bun") ? "node" : process.execPath,
    [
      "--experimental-transform-types",
      fileURLToPath(new URL("./r2-models.mjs", import.meta.url)),
      inputPath,
      scoresPath,
    ],
    { cwd: root, stdio: "inherit", timeout: 600_000 },
  );
const RecordSchema = z
  .object({
    semantic: z.record(z.string(), z.number().finite().min(-1).max(1)),
    rerank: z.record(z.string(), z.number().finite().min(0).max(1)),
    embeddingMs: z.number().finite().nonnegative(),
    rerankMs: z.number().finite().nonnegative(),
    rerankCandidateCount: z.number().int().nonnegative().max(64),
  })
  .strict();
const capture = z
  .object({
    inputHash: z.literal(inputHash),
    models: z.object({
      embedding: z.object({
        id: z.literal("Xenova/all-MiniLM-L6-v2"),
        revision: z.literal("751bff37182d3f1213fa05d7196b954e230abad9"),
        dtype: z.literal("q8"),
      }),
      reranker: z.object({
        id: z.literal("Xenova/ms-marco-MiniLM-L-6-v2"),
        revision: z.literal("a09144355adeed5f58c8ed011d209bf8ee5a1fec"),
        dtype: z.literal("q8"),
      }),
    }),
    modelLoadMs: z.number().nonnegative(),
    corpusEmbeddingMs: z.number().nonnegative(),
    records: z.record(z.string(), RecordSchema),
  })
  .strict()
  .parse(JSON.parse(await readFile(scoresPath, "utf8")));
const scoreTables: Record<string, Scores> = {},
  rerankTables: Record<string, Scores> = {};
for (const query of frozen.queries) {
  const row = capture.records[query.id];
  if (!row) throw new Error(`Missing scores ${query.id}`);
  validateScores(
    row.semantic,
    index.map((s) => s.citation),
  );
  scoreTables[query.id] = row.semantic;
  rerankTables[query.id] = row.rerank;
}
const thresholds = calibrateR2(index, queries, scoreTables, rerankTables);
const rankings = variants.map((variant) => {
  const rows = queries.map((q) => {
    const start = performance.now();
    const matches = rankR2(
      index,
      q,
      variant,
      scoreTables[q.id],
      rerankTables[q.id],
      thresholds,
    );
    const measured = capture.records[q.id]!;
    return {
      id: q.id,
      split: q.split,
      kind: q.kind,
      relevant: q.relevantCitations,
      returned: matches.map((m) => m.citation),
      latencyMs:
        performance.now() -
        start +
        (["semantic", "hybrid", "hybrid-reranked"].includes(variant)
          ? measured.embeddingMs
          : 0) +
        (variant === "hybrid-reranked" ? measured.rerankMs : 0),
    };
  });
  return {
    variant,
    development: summarizeR2(rows.filter((r) => r.split === "development")),
    heldOut: summarizeR2(rows.filter((r) => r.split === "held_out")),
    rows,
  };
});

// One frozen model, evidence bundle, prompt and case set across all variants.
// External actions are absent: only the existing read-only fixture tools exist.
const downstream: {
  variant: string;
  cases: unknown[];
  grounded: number;
  safeRouting: number;
  abstained: number;
  acceptedDiagnosis: number;
  completed: number;
}[] = [];
let invocations = 0,
  tokens = 0;
const tokenCap = 120_000,
  invocationCap = 20,
  reservation = 6_000;
let stopReason: string | null = null;
let modelId: string | null = null;
if (values.live) {
  const key = process.env.GEMINI_API_KEY;
  modelId = process.env.GEMINI_MODEL ?? null;
  if (!key || !modelId)
    throw new Error(
      "Live R2 diagnosis requires GEMINI_API_KEY and GEMINI_MODEL",
    );
  const model = new GeminiDiagnosisModel({
    apiKey: key,
    model: modelId,
    api: "generate-content",
    maxOutputTokens: 2048,
    maxTotalTokens: reservation,
  });
  const deadline = AbortSignal.timeout(900_000);
  let lastCall = 0;
  const measuredModel: IntegratedDiagnosisModel = {
    close: async () => {},
    async generate(prompt, signal) {
      if (
        stopReason ||
        invocations >= invocationCap ||
        tokens + reservation > tokenCap
      )
        throw new Error("R2 model budget exhausted");
      const wait = Math.max(0, 13_000 - (performance.now() - lastCall));
      if (wait)
        await new Promise<void>((resolveWait, reject) => {
          const done = () => {
            clearTimeout(timer);
            signal.removeEventListener("abort", abort);
          };
          const abort = () => {
            done();
            reject(new Error("R2 pacing aborted"));
          };
          const timer = setTimeout(() => {
            done();
            resolveWait();
          }, wait);
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
        });
      invocations++;
      lastCall = performance.now();
      tokens += reservation;
      try {
        const generation = await model.generate(prompt, signal);
        tokens += generation.usage.total_tokens - reservation;
        return generation;
      } catch (error) {
        // Keep the full reservation for unknown usage and stop repeated provider failures.
        stopReason = "model_call_failed";
        throw error;
      }
    },
  };
  for (const variant of variants) {
    const summary = {
      variant,
      cases: [] as unknown[],
      grounded: 0,
      safeRouting: 0,
      abstained: 0,
      acceptedDiagnosis: 0,
      completed: 0,
    };
    for (let i = 0; i < cases.length; i++) {
      const item = cases[i]!,
        adapter = adapters[i]!,
        query = downstreamQueries[i]!;
      const matches = rankR2(
        index,
        query,
        variant,
        scoreTables[query.id],
        rerankTables[query.id],
        thresholds,
      );
      const tools = { ...adapter.tools, searchRunbooks: () => matches };
      const callsBefore = invocations,
        started = performance.now();
      let result: unknown = null,
        failure: "provider_error" | null = null;
      let usage: ModelUsage | null = null;
      const caseModel: IntegratedDiagnosisModel = {
        close: async () => {},
        async generate(prompt, signal) {
          const generation = await measuredModel.generate(prompt, signal);
          usage = generation.usage;
          return generation;
        },
      };
      if (!stopReason) {
        try {
          result = await buildDiagnosisService(tools, caseModel, {
            modelName: modelId,
            allowSimulatedEvidence: true,
            maxRepairAttempts: 0,
            modelTimeoutMs: 60_000,
            investigationTimeoutMs: 90_000,
            signal: deadline,
            maxModelTokens: reservation,
          }).diagnose();
          summary.completed++;
        } catch {
          failure = "provider_error";
        }
      } else failure = "provider_error";
      const context: CapturedEvaluationContext = {
        context_version: 1,
        case_id: item.case_id,
        evidence: adapter.bundle,
        retrieval: {
          input: {
            query: query.query,
            providers: query.providers ? [...query.providers] : undefined,
            limit: 3,
          },
          matches: matches.map((m) => RunbookMatchSchema.parse(m)),
        },
        rejection: null,
        failure,
      };
      const observation: EvaluationObservation = {
        case_id: item.case_id,
        result,
        model_invocations: invocations - callsBefore,
        usage,
        cost_usd: null,
        latency_ms: performance.now() - started,
      };
      const checked = checkEvaluationObservation(
        item,
        observation,
        matches.map((m) => m.citation),
        context,
        "advisory-v2",
      );
      summary.grounded += Number(
        checked.schemaValid &&
          !checked.safetyIssues.includes("ungrounded_evidence_reference"),
      );
      summary.safeRouting += Number(
        checked.schemaValid &&
          !checked.safetyIssues.some((s) =>
            ["unsafe_abstention", "unsafe_unknown_delivery_route"].includes(s),
          ),
      );
      summary.abstained += Number(
        checked.schemaValid &&
          typeof result === "object" &&
          result !== null &&
          "status" in result &&
          result.status === "abstained",
      );
      summary.acceptedDiagnosis += Number(
        checked.schemaValid &&
          !checked.qualityIssues.includes("unexpected_taxonomy"),
      );
      summary.cases.push({
        id: item.case_id,
        split: item.split,
        observation,
        context,
        checked,
      });
      console.log(
        `R2 diagnosis: ${variant}/${item.case_id} ${result ? "completed" : "failed"}`,
      );
      await writeFile(
        join(directory, "diagnosis-progress.json"),
        JSON.stringify(
          {
            downstream: [...downstream, summary],
            invocations,
            tokens,
            stopReason,
          },
          null,
          2,
        ) + "\n",
      );
    }
    downstream.push(summary);
  }
}
if (values["diagnosis-report"]) {
  const saved = z
    .object({
      inputHash: z.literal(inputHash),
      scoresHash: z.literal(fixtureHash(capture)),
      labelsHash: z.literal(fixtureHash(queries)),
      diagnosis: z.object({
        model: z.string().min(1),
        invocations: z.number().int().min(0).max(invocationCap),
        accountedTokens: z.number().int().min(0).max(tokenCap),
        stopReason: z.string().nullable(),
        downstream: z
          .array(
            z.object({
              variant: z.enum(variants),
              cases: z.array(
                z.object({
                  id: z.string(),
                  observation: EvaluationObservationSchema,
                  context: CapturedEvaluationContextSchema,
                }),
              ),
            }),
          )
          .length(5),
      }),
    })
    .parse(
      JSON.parse(
        await readFile(resolve(root, values["diagnosis-report"]), "utf8"),
      ),
    );
  modelId = saved.diagnosis.model;
  invocations = saved.diagnosis.invocations;
  tokens = saved.diagnosis.accountedTokens;
  stopReason = saved.diagnosis.stopReason;
  if (new Set(saved.diagnosis.downstream.map((d) => d.variant)).size !== 5)
    throw new Error("Duplicate frozen diagnosis variant");
  for (const d of saved.diagnosis.downstream) {
    const summary = {
      variant: d.variant,
      cases: [] as unknown[],
      grounded: 0,
      safeRouting: 0,
      abstained: 0,
      acceptedDiagnosis: 0,
      completed: 0,
    };
    if (
      d.cases.length !== cases.length ||
      new Set(d.cases.map((c) => c.id)).size !== cases.length
    )
      throw new Error("Incomplete frozen diagnosis cases");
    for (const row of d.cases) {
      const item = cases.find((c) => c.case_id === row.id);
      if (
        !item ||
        row.observation.case_id !== row.id ||
        row.context.case_id !== row.id
      )
        throw new Error("Frozen diagnosis case mismatch");
      const i = cases.indexOf(item),
        q = downstreamQueries[i]!;
      const matches = rankR2(
        index,
        q,
        d.variant,
        scoreTables[q.id],
        rerankTables[q.id],
        thresholds,
      );
      if (
        fixtureHash(row.context.evidence) !==
          fixtureHash(adapters[i]!.bundle) ||
        fixtureHash(row.context.retrieval?.matches) !== fixtureHash(matches)
      )
        throw new Error("Frozen diagnosis evidence or retrieval changed");
      const checked = checkEvaluationObservation(
        item,
        row.observation,
        matches.map((m) => m.citation),
        row.context,
        "advisory-v2",
      );
      const result = row.observation.result;
      summary.completed += Number(checked.schemaValid);
      summary.grounded += Number(
        checked.schemaValid &&
          !checked.safetyIssues.includes("ungrounded_evidence_reference"),
      );
      summary.safeRouting += Number(
        checked.schemaValid &&
          !checked.safetyIssues.some((s) =>
            ["unsafe_abstention", "unsafe_unknown_delivery_route"].includes(s),
          ),
      );
      summary.abstained += Number(
        checked.schemaValid &&
          typeof result === "object" &&
          result !== null &&
          "status" in result &&
          result.status === "abstained",
      );
      summary.acceptedDiagnosis += Number(
        checked.schemaValid &&
          !checked.qualityIssues.includes("unexpected_taxonomy"),
      );
      summary.cases.push({ ...row, split: item.split, checked });
    }
    downstream.push(summary);
  }
}
const report = {
  experiment: "R2",
  createdAt: new Date().toISOString(),
  inputHash,
  scoresHash: fixtureHash(capture),
  corpusHash: fixtureHash(corpus),
  labelsHash: fixtureHash(queries),
  corpusDocuments: new Set(index.map((s) => s.id)).size,
  corpusSections: index.length,
  queryCount: queries.length,
  models: capture.models,
  thresholds,
  calibration:
    "development only; maximize macro section recall + no-match accuracy; tie-break MRR then stricter threshold",
  setup: {
    modelLoadMs: capture.modelLoadMs,
    corpusEmbeddingMs: capture.corpusEmbeddingMs,
  },
  retrievalCostUsd: 0,
  rankings,
  diagnosis: {
    mode:
      values.live || values["diagnosis-report"]
        ? "live model on controlled fixtures"
        : "not run",
    model: modelId,
    promptVersion: DIAGNOSIS_PROMPT_VERSION,
    invocations,
    accountedTokens: tokens,
    tokenCap,
    invocationCap,
    providerRequestAccounting:
      "Each generation has a zero-generation countTokens preflight. At most 40 provider HTTP requests for 20 diagnosis generations; 20 successful generations establish 40 successful requests.",
    stopReason,
    costUsd: null,
    downstream,
  },
  recommendation:
    "Keep production weighted-keyword retrieval. This small simulated experiment cannot establish production adoption or replay eligibility.",
  limitations: [
    "Section labels are author-assigned, not independently adjudicated.",
    "Held-out queries are authored separately but share scenarios with development; no statistical significance claim.",
    "CPU timings include query encoding and bounded calibration-candidate reranking, exclude one-time setup; cached scores rescore rankings without rerunning inference.",
    "Downstream pilot has four controlled incomplete-evidence cases per variant; external action providers are absent. Paid model monetary cost is unknown; token usage is recorded.",
    "Public global runbooks contain no customer data; owner access remains in the existing graph and production retrieval path is unchanged.",
    "Similarity and relevance scores cannot change deterministic replay policy.",
  ],
};
await writeFile(
  join(directory, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const percentage = (n: number | null) =>
  n === null ? "n/a" : `${(n * 100).toFixed(1)}%`;
const md = `# R2 expanded retrieval experiment\n\n${report.corpusDocuments} runbooks, ${report.corpusSections} sections, ${queries.length} labelled queries (20 development, 20 held-out).\n\n| Variant | Dev Recall@3 | Held-out Recall@3 | Held-out MRR | Held-out no-match | Mean held-out ms |\n|---|---:|---:|---:|---:|---:|\n${rankings.map((r) => `| ${r.variant} | ${percentage(r.development.recallAt3)} | ${percentage(r.heldOut.recallAt3)} | ${r.heldOut.mrr?.toFixed(3)} | ${percentage(r.heldOut.noMatchAccuracy)} | ${r.heldOut.averageLatencyMs?.toFixed(2)} |`).join("\n")}\n\nThresholds selected on development only: cosine ${thresholds.semantic}, reranker sigmoid ${thresholds.rerank}. Retrieval external cost: $0. Local model loading: ${capture.modelLoadMs.toFixed(0)} ms; corpus encoding: ${capture.corpusEmbeddingMs.toFixed(0)} ms.\n\n## Downstream grounded diagnosis and abstention\n\nMode: ${report.diagnosis.mode}. Model: ${modelId ?? "none"}. Calls: ${invocations}/${invocationCap}; accounted tokens: ${tokens}/${tokenCap}; monetary cost: unmeasured.\n\n| Variant | Completed | Evidence grounding | Safe routing | Accepted taxonomy |\n|---|---:|---:|---:|---:|\n${downstream.map((d) => `| ${d.variant} | ${d.completed}/4 | ${d.grounded}/4 | ${d.safeRouting}/4 | ${d.acceptedDiagnosis}/4 |`).join("\n")}\n\nActual abstentions are recorded per variant in report.json. Stop reason: ${stopReason ?? "none"}. Inspect report.json for each case's safety and quality diagnostics. Evidence-grounding counts validate references; they do not measure semantic grounding. All variants share evidence, cases, graph, prompt and model. Labels never enter retrieval or diagnosis prompts.\n\n## Recommendation and limits\n\n${report.recommendation}\n\n${report.limitations.map((s) => `- ${s}`).join("\n")}\n\n## Reproduce\n\nFrom the repository root:\n\n\`rtk proxy bun --env-file=apps/ai_agent/.env apps/ai_agent/src/evaluation/run-r2.ts --live\`\n\nOmit --live for retrieval only. Reuse captured scores without model downloads:\n\n\`rtk proxy bun apps/ai_agent/src/evaluation/run-r2.ts --scores apps/ai_agent/evaluation/r2/results/scores.json --output .tmp-turbo-user/r2-rescore\`\n\nModel implementations follow the pinned [embedding model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2) and [cross-encoder model card](https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2); the runtime is an experiment-only development dependency.\n`;
await writeFile(join(directory, "report.md"), md);
console.log(md);
