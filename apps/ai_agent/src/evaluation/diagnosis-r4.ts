// R4.5 diagnosis validation. This module only reads the sealed holdout after
// R4.4 accepted retrieval. It reuses the frozen R4.4 logits, runs the serving
// diagnosis graph once per pre-registered case, and never promotes on its own.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  IntegratedModelOutputSchema,
  ModelUsageSchema,
  type DiagnosisEvidence,
  type DiagnosisPrompt,
  type IntegratedDiagnosisModel,
  type IntegratedDiagnosisResult,
  type ModelGeneration,
  type ModelUsage,
} from "../contracts.ts";
import { GeminiDiagnosisModel, ModelProviderError } from "../gemini-model.ts";
import {
  buildDiagnosisService,
  issueForOutput,
  requiresPlatformInvestigation,
} from "../graph.ts";
import { rankStructured } from "../tools/structured-ranking.ts";
import type { RunbookMatch } from "../tools/search-runbooks.ts";
import {
  loadDevelopmentContext,
  loadHoldoutContext,
  loadSelectedRetrievalConfig,
  metricRow,
  type CohortContext,
  type Metric,
} from "./retrieval-r4.ts";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const defaultOutDir = join(repoRoot, "apps/ai_agent/evaluation/r4/diagnosis");
const defaultProtocolPath = join(defaultOutDir, "protocol.json");
const selectedConfigPath = join(
  repoRoot,
  "apps/ai_agent/evaluation/r4/selected-retrieval-config.json",
);

const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const repoPath = (path: string) => relative(repoRoot, path).replaceAll("\\", "/");
const sleep = (ms: number) =>
  new Promise<void>((resolveSleep) => setTimeout(resolveSleep, ms));
const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? "n/a" : `${(value * 100).toFixed(2)}%`;

// ---------------------------------------------------------------------------
// Frozen protocol and pre-registered subset
// ---------------------------------------------------------------------------

export const ProtocolSchema = z
  .object({
    version: z.literal(1),
    phase: z.literal("R4.5"),
    runId: z.string().min(1),
    status: z.literal("frozen_before_measurement"),
    predecessor: z
      .object({
        phase: z.literal("R4.4"),
        decision: z.literal("retrieval_accepted"),
        retrievalConfig: z
          .object({
            hash: z.string().regex(/^[a-f0-9]{64}$/),
            method: z.string().min(1),
          })
          .passthrough(),
      })
      .passthrough(),
    subset: z
      .object({
        path: z.string().min(1),
        hash: z.string().regex(/^[a-f0-9]{64}$/),
        cases: z.literal(40),
        answerable: z.literal(30),
        noMatch: z.literal(10),
        // D1 screens on the development cohort; R4.5 protocols predate the field.
        split: z.enum(["development", "holdout"]).default("holdout"),
      })
      .passthrough(),
    retrieval: z
      .object({
        scoresPath: z.string().min(1),
        scoresHash: z.string().regex(/^[a-f0-9]{64}$/),
        reportPath: z.string().min(1),
        reportHash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .passthrough(),
    diagnosis: z
      .object({
        prompt: z
          .object({
            version: z.enum(["phase-11a-v3", "phase-11a-v4"]),
            source: z.string().min(1),
            sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .passthrough(),
        graph: z
          .object({
            source: z.string().min(1),
            sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
            version: z.string().min(1),
          })
          .passthrough(),
        model: z
          .object({
            id: z.string().min(1),
            api: z.literal("generate-content"),
            disableThinking: z.boolean(),
            source: z.string().min(1),
            sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
            contractsSource: z.string().min(1),
            contractsSourceHash: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .passthrough(),
        caps: z
          .object({
            maxOutputTokens: z.number().int().positive(),
            maxTotalTokensPerCall: z.number().int().positive(),
            maxModelTokensPerCase: z.number().int().positive(),
            maxPromptCharacters: z.number().int().positive(),
            modelTimeoutMs: z.number().int().positive(),
            investigationTimeoutMs: z.number().int().positive(),
            maxRepairAttempts: z.number().int().nonnegative(),
          })
          .passthrough(),
        allowSimulatedEvidence: z.boolean(),
      })
      .passthrough(),
    schedule: z
      .object({
        cases: z.literal(40),
        concurrency: z.literal(1),
        maxGenerationCalls: z.number().int().positive(),
        minGenerationIntervalMs: z.number().int().nonnegative(),
        availabilityRetry: z
          .object({
            maxRetries: z.number().int().nonnegative(),
            backoffMs: z.number().int().nonnegative(),
          })
          .passthrough(),
      })
      .passthrough(),
    budget: z
      .object({
        tier: z.string().min(1),
        monetaryCeilingUsd: z.literal(0),
        paidFallback: z.literal(false),
        standardRateEstimateInputUsdPerMillionTokens: z.number().nonnegative(),
        standardRateEstimateOutputUsdPerMillionTokens: z.number().nonnegative(),
      })
      .passthrough(),
    review: z
      .object({
        doubleLabeledCount: z.number().int().positive(),
        doubleLabeledRule: z.string().min(1),
        agreement: z
          .object({ threshold: z.number().positive() })
          .passthrough(),
      })
      .passthrough(),
    gates: z
      .object({
        semanticAcceptancePoint: z.number().positive(),
        semanticAcceptanceWilsonLower: z.number().positive(),
        safetyViolationsMax: z.number().int().nonnegative(),
        reviewCoverage: z.number().int().positive(),
        cohenKappaMin: z.number().positive(),
        unresolvedDisagreementsMax: z.number().int().nonnegative(),
        confidence: z.number().positive(),
      })
      .passthrough(),
  })
  .passthrough();

export type DiagnosisProtocol = z.infer<typeof ProtocolSchema>;

const SubsetSchema = z.object({
  version: z.literal(1),
  cases: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum(["answerable", "no_match"]),
      family: z.string().optional(),
      bucket: z.string().optional(),
    }),
  ),
});

export type DiagnosisSubsetCase = z.infer<typeof SubsetSchema>["cases"][number];

export async function loadDiagnosisProtocol(protocolPath: string) {
  const bytes = await readFile(protocolPath);
  return {
    protocol: ProtocolSchema.parse(JSON.parse(bytes.toString("utf8"))),
    protocolHash: sha256(bytes),
  };
}

export function validateDiagnosisSubset(cases: readonly DiagnosisSubsetCase[]) {
  if (cases.length !== 40) throw new Error("Diagnosis subset must have 40 cases");
  if (new Set(cases.map((item) => item.id)).size !== 40)
    throw new Error("Diagnosis subset has duplicate ids");
  const answerable = cases.filter((item) => item.kind === "answerable");
  const noMatch = cases.filter((item) => item.kind === "no_match");
  if (answerable.length !== 30) throw new Error("Diagnosis subset needs 30 answerable cases");
  if (noMatch.length !== 10) throw new Error("Diagnosis subset needs 10 no-match cases");
  const families = new Map<string, number>();
  for (const item of answerable)
    families.set(item.family ?? "", (families.get(item.family ?? "") ?? 0) + 1);
  if (families.size !== 10)
    throw new Error("Diagnosis subset must cover all ten families");
  for (const [family, count] of families)
    if (!/^F(?:0[1-9]|10)$/.test(family) || count !== 3)
      throw new Error(`Diagnosis subset needs three answerable cases for ${family || "unknown"}`);
  const buckets = new Map<string, number>();
  for (const item of noMatch)
    buckets.set(item.bucket ?? "", (buckets.get(item.bucket ?? "") ?? 0) + 1);
  const expected: Record<string, number> = {
    missing_guidance: 3,
    missing_runtime_fact: 3,
    out_of_scope: 2,
    adversarial: 2,
  };
  if (buckets.size !== Object.keys(expected).length)
    throw new Error("Diagnosis subset must cover every no-match bucket");
  for (const [bucket, count] of Object.entries(expected))
    if (buckets.get(bucket) !== count)
      throw new Error(`Diagnosis subset needs ${count} ${bucket} cases`);
  return {
    cases: 40,
    answerable: answerable.length,
    noMatch: noMatch.length,
    families: Object.fromEntries([...families].sort()),
    buckets: Object.fromEntries([...buckets].sort()),
  };
}

// ---------------------------------------------------------------------------
// Review packet identity and order
// ---------------------------------------------------------------------------

export const REVIEW_SEED = "r4.5-review-v1";

export function reviewHash(caseId: string) {
  return sha256(`${REVIEW_SEED}:${caseId}`);
}

export function reviewIdFor(caseId: string) {
  return reviewHash(caseId).slice(0, 16);
}

export function packetOrder(caseIds: readonly string[]) {
  return [...caseIds].sort((left, right) =>
    reviewHash(left).localeCompare(reviewHash(right)),
  );
}

export function doubleLabeledIds(orderedCaseIds: readonly string[]) {
  if (orderedCaseIds.length !== 40)
    throw new Error("Double-label selection needs the full 40-case packet");
  return orderedCaseIds.filter((_, index) => (index + 1) % 5 === 0);
}

// ---------------------------------------------------------------------------
// Resume planning
// ---------------------------------------------------------------------------

/**
 * A case may only be run again when it produced no generation. Reusing a
 * completed case keeps the "one generation per case" invariant, and a failed
 * case that did generate is treated as an interrupted case rather than
 * silently regenerated.
 */
export function caseResumeAction(
  prior: Pick<DiagnosisCaseRun, "status" | "generations"> | undefined,
): "run" | "reuse" {
  if (!prior) return "run";
  if (prior.status === "completed") return "reuse";
  if (prior.generations.length === 0) return "run";
  throw new Error("run_interrupted_mid_case");
}

export function planResume<
  T extends {
    id: string;
    status: DiagnosisCaseRun["status"];
    generations: DiagnosisCaseRun["generations"];
  },
>(
  events: ReadonlyArray<{ type: string; caseId?: string; case?: T }>,
) {
  const records = new Map<string, T>();
  const started = new Set<string>();
  for (const event of events) {
    if (event.type === "case_started" && event.caseId) started.add(event.caseId);
    if (event.type === "case_completed" && event.case)
      records.set(event.case.id, event.case);
  }
  for (const caseId of started)
    if (!records.has(caseId)) throw new Error("run_interrupted_mid_case");
  return { records };
}

// ---------------------------------------------------------------------------
// Deterministic safety and cost helpers
// ---------------------------------------------------------------------------

const SAFETY_ISSUES = new Set([
  "unsafe_delivery_disposition",
  "unsafe_replay_candidate",
  "platform_ownership_requires_escalation",
]);

type EvidenceBundle = Parameters<typeof issueForOutput>[0];

export function safetyIssueFor(
  evidence: DiagnosisEvidence,
  runbooks: readonly RunbookMatch[],
  output: unknown,
): string | null {
  const parsed = IntegratedModelOutputSchema.safeParse(output);
  if (!parsed.success) return null;
  // The graph parsed this bundle before generation; the union type only narrows
  // the fixture/non-fixture pairing that the schema already enforced.
  const bundle = evidence as EvidenceBundle;
  const issue = issueForOutput(bundle, runbooks, parsed.data);
  if (issue && SAFETY_ISSUES.has(issue)) return issue;
  const retry = bundle.failureContext.facts.retry;
  const attempts = bundle.executionEvidence.facts.attempts;
  const outcomes = new Set([
    retry.provider_outcome,
    ...attempts.map((attempt) => attempt.provider_outcome),
  ]);
  const replay =
    parsed.data.proposal.kind === "wait_then_replay" ||
    parsed.data.proposal.disposition === "replay_candidate";
  if (
    replay &&
    (bundle.failureContext.simulated ||
      retry.provider_outcome === "unknown" ||
      outcomes.has("unknown") ||
      (outcomes.has("rejected") && outcomes.has("accepted")))
  )
    return "unsafe_replay_recommendation";
  if (
    parsed.data.proposal.kind === "request_manual_fix" &&
    requiresPlatformInvestigation(bundle)
  )
    return "platform_fault_as_owner_repair";
  return null;
}

export function estimateStandardCostUsd(
  usage: ModelUsage,
  inputRate: number,
  outputRate: number,
) {
  return (
    (usage.input_tokens * inputRate) / 1_000_000 +
    (usage.output_tokens * outputRate) / 1_000_000
  );
}

export function cohenKappa(pairs: ReadonlyArray<[boolean, boolean]>) {
  if (pairs.length === 0) return null;
  const observed =
    pairs.filter(([left, right]) => left === right).length / pairs.length;
  const leftTrue = pairs.filter(([left]) => left).length / pairs.length;
  const rightTrue = pairs.filter(([, right]) => right).length / pairs.length;
  const expected = leftTrue * rightTrue + (1 - leftTrue) * (1 - rightTrue);
  if (expected === 1) return observed === 1 ? 1 : 0;
  return (observed - expected) / (1 - expected);
}

export function percentile(values: readonly number[], fraction: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(fraction * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

export type DiagnosisGateCheck = {
  name: string;
  value: number | null;
  threshold: number;
  pass: boolean;
  basis: string;
};

export type DiagnosisDecision = {
  status: "diagnosis_accepted" | "diagnosis_rejected" | "blocked";
  checks: DiagnosisGateCheck[];
  failing: string[];
  blockedReasons: string[];
  semanticAcceptance: Metric;
  reviewed: number;
  scheduled: number;
};

export function evaluateDiagnosisGate(input: {
  scheduled: number;
  reviewed: number;
  semanticAccepted: number;
  safetyViolations: number;
  kappa: number | null;
  unresolvedDisagreements: number;
  blockedReasons: readonly string[];
  gates: DiagnosisProtocol["gates"];
}): DiagnosisDecision {
  const confidence = input.gates.confidence;
  const semanticAcceptance = metricRow(
    input.semanticAccepted,
    input.scheduled,
    { confidence, basis: "all scheduled cases" },
  );
  const coverage = metricRow(input.reviewed, input.scheduled, { confidence });
  const blockedReasons = [...new Set(input.blockedReasons)];
  if (input.reviewed < input.gates.reviewCoverage) {
    blockedReasons.push("review_coverage_incomplete");
    if (input.reviewed < input.scheduled) blockedReasons.push("human_review_outstanding");
  }
  if (input.kappa === null) {
    if (input.reviewed >= input.gates.reviewCoverage)
      blockedReasons.push("inter_rater_agreement_below_threshold");
  } else if (input.kappa < input.gates.cohenKappaMin) {
    blockedReasons.push("inter_rater_agreement_below_threshold");
  }
  if (input.unresolvedDisagreements > input.gates.unresolvedDisagreementsMax)
    blockedReasons.push("unresolved_review_disagreement");

  const checks: DiagnosisGateCheck[] = [
    {
      name: "reviewCoverage",
      value: coverage.point,
      threshold: input.gates.reviewCoverage,
      pass: input.reviewed >= input.gates.reviewCoverage,
      basis: `${input.reviewed}/${input.scheduled} reviewed`,
    },
    {
      name: "semanticAcceptancePoint",
      value: semanticAcceptance.point,
      threshold: input.gates.semanticAcceptancePoint,
      pass:
        semanticAcceptance.point !== null &&
        semanticAcceptance.point >= input.gates.semanticAcceptancePoint,
      basis: `${input.semanticAccepted}/${input.scheduled}`,
    },
    {
      name: "semanticAcceptanceWilsonLower",
      value: semanticAcceptance.wilson?.lower ?? null,
      threshold: input.gates.semanticAcceptanceWilsonLower,
      pass:
        (semanticAcceptance.wilson?.lower ?? -1) >=
        input.gates.semanticAcceptanceWilsonLower,
      basis: `Wilson 95% on ${input.semanticAccepted}/${input.scheduled}`,
    },
    {
      name: "safetyViolations",
      value: input.safetyViolations,
      threshold: input.gates.safetyViolationsMax,
      pass: input.safetyViolations <= input.gates.safetyViolationsMax,
      basis: "final outputs plus reviewer safety flags",
    },
    {
      name: "cohenKappa",
      value: input.kappa,
      threshold: input.gates.cohenKappaMin,
      pass: input.kappa !== null && input.kappa >= input.gates.cohenKappaMin,
      basis: "20% double-labeled overlap",
    },
    {
      name: "unresolvedDisagreements",
      value: input.unresolvedDisagreements,
      threshold: input.gates.unresolvedDisagreementsMax,
      pass:
        input.unresolvedDisagreements <=
        input.gates.unresolvedDisagreementsMax,
      basis: "primary/secondary disagreements without adjudication",
    },
  ];
  const failing = checks.filter((check) => !check.pass).map((check) => check.name);
  const status = blockedReasons.length
    ? "blocked"
    : failing.length
      ? "diagnosis_rejected"
      : "diagnosis_accepted";
  return {
    status,
    checks,
    failing,
    blockedReasons: [...new Set(blockedReasons)],
    semanticAcceptance,
    reviewed: input.reviewed,
    scheduled: input.scheduled,
  };
}

// ---------------------------------------------------------------------------
// Budgeted, paced model adapter
// ---------------------------------------------------------------------------

export type DiagnosisGenerationRecord = {
  caseId: string;
  index: number;
  promptHash: string;
  promptCharacters: number;
  repairIssue: string | null;
  output: unknown;
  usage: ModelUsage;
  latencyMs: number;
  schemaValid: boolean;
  groundingIssue: string | null;
  safetyIssue: string | null;
  at: string;
};

export class PacedBudgetedModel implements IntegratedDiagnosisModel {
  readonly generations: DiagnosisGenerationRecord[] = [];
  rateLimitRetries = 0;
  private calls = 0;
  private caseId = "";
  private lastCallAt = 0;
  private callsThisCase = 0;

  constructor(
    private readonly inner: IntegratedDiagnosisModel,
    private readonly limits: {
      maxCalls: number;
      minIntervalMs: number;
      maxTotalTokensPerCall: number;
    },
    private readonly clock: () => number = Date.now,
    private readonly wait: (ms: number) => Promise<void> = sleep,
  ) {}

  beginCase(caseId: string) {
    this.caseId = caseId;
    this.callsThisCase = 0;
  }

  /**
   * Wait for the next scheduled generation slot. The runner calls this before
   * starting a case so the pacing wait never counts against the model timeout.
   * Repair attempts are issued inside the graph, so `generate` paces them.
   */
  async pace() {
    const waitMs = this.lastCallAt + this.limits.minIntervalMs - this.clock();
    if (waitMs > 0) await this.wait(waitMs);
    this.lastCallAt = this.clock();
  }

  async generate(
    prompt: DiagnosisPrompt,
    signal: AbortSignal,
  ): Promise<ModelGeneration> {
    if (this.calls >= this.limits.maxCalls)
      throw new Error("generation_budget_exhausted");
    if (this.callsThisCase > 0) await this.pace();
    this.callsThisCase += 1;
    this.lastCallAt = this.clock();
    const callStarted = performance.now();
    const generation = await this.inner.generate(prompt, signal);
    const callLatencyMs = performance.now() - callStarted;

    const usage = ModelUsageSchema.parse(generation.usage);
    if (usage.total_tokens > this.limits.maxTotalTokensPerCall)
      throw new Error("token_budget_exhausted");
    this.calls += 1;
    const startedAt = new Date().toISOString();
    const parsed = IntegratedModelOutputSchema.safeParse(generation.output);
    this.generations.push({
      caseId: this.caseId,
      index: this.generations.filter((item) => item.caseId === this.caseId)
        .length,
      promptHash: sha256(prompt.instructions + "\n" + prompt.input),
      promptCharacters: prompt.instructions.length + prompt.input.length,
      repairIssue: prompt.repair?.issue ?? null,
      output: generation.output,
      usage,
      latencyMs: callLatencyMs,
      schemaValid: parsed.success,
      groundingIssue: null,
      safetyIssue: null,
      at: startedAt,
    });
    return generation;
  }

  async close() {
    await this.inner.close();
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const ScoresSchema = z.object({
  records: z.record(
    z.string(),
    z.object({
      original: z.object({
        logits: z.record(z.string(), z.number()),
        rerankMs: z.number(),
      }),
    }),
  ),
});

const RetrievalReportSchema = z.object({
  rows: z.array(
    z.object({
      id: z.string(),
      returned: z.array(z.string()),
      kind: z.string(),
      family: z.string().nullable().optional(),
    }),
  ),
});

// Rebuilds each case's retrieval from the frozen logits and requires parity
// with the accepted retrieval report before any generation.
export function planDiagnosisCases(input: {
  split: "development" | "holdout";
  cases: readonly DiagnosisSubsetCase[];
  context: CohortContext;
  scores: z.infer<typeof ScoresSchema>;
  retrievalReport: z.infer<typeof RetrievalReportSchema>;
}) {
  const retrievalRows = new Map(input.retrievalReport.rows.map((row) => [row.id, row]));
  const contextRows = new Map(input.context.rows.map((row) => [row.case.id, row]));

  return input.cases.map((item) => {
    const row = contextRows.get(item.id);
    if (!row) throw new Error(`Subset case missing from the ${input.split} cohort: ${item.id}`);
    const score = input.scores.records[item.id]?.original;
    if (!score) throw new Error(`Missing frozen R4.4 logits for ${item.id}`);
    const packed = rankStructured(input.context.index, row.profile, score.logits, {
      minAnchorHits: 1,
    });
    const expected = retrievalRows.get(item.id);
    if (!expected) throw new Error(`Missing R4.4 report row for ${item.id}`);
    if (JSON.stringify(packed.matches.map((match) => match.citation)) !== JSON.stringify(expected.returned))
      throw new Error(`R4.4 retrieval parity failed for ${item.id}`);
    if (item.kind !== row.case.kind)
      throw new Error(`Subset kind disagrees with the case for ${item.id}`);
    if (item.kind === "no_match" && packed.matches.length !== 0)
      throw new Error(`Accepted no-match case returned guidance for ${item.id}`);
    return {
      item,
      evidence: row.evidence,
      matches: packed.matches,
    };
  });
}

export type DiagnosisCaseRun = {
  id: string;
  reviewId: string;
  kind: "answerable" | "no_match";
  family: string | null;
  bucket: string | null;
  status: "completed" | "failed";
  failure: string | null;
  result: IntegratedDiagnosisResult | null;
  matches: RunbookMatch[];
  generations: DiagnosisGenerationRecord[];
  usage: ModelUsage;
  latencyMs: number;
  schemaAccepted: boolean;
  citationMembership: boolean;
  safetyViolations: string[];
};

const emptyUsage = (): ModelUsage => ({
  input_tokens: 0,
  output_tokens: 0,
  total_tokens: 0,
});

const addUsage = (left: ModelUsage, right: ModelUsage): ModelUsage => ({
  input_tokens: left.input_tokens + right.input_tokens,
  output_tokens: left.output_tokens + right.output_tokens,
  total_tokens: left.total_tokens + right.total_tokens,
});

// Amendment 2: 429 and 503 reject the request without a generation, so either
// may be retried — but only before the case has generated, so a retry can never
// become a second generation.
export function availabilityRetryable(error: unknown, generatedThisCase: boolean) {
  return (
    !generatedThisCase &&
    error instanceof ModelProviderError &&
    (error.details.http_status === 429 || error.details.http_status === 503)
  );
}

function classifyFailure(error: unknown) {
  if (error instanceof ModelProviderError)
    return `provider_or_quota_failure:${error.details.category}:${error.details.http_status ?? "none"}`;
  if (error instanceof Error) {
    if (/generation_budget_exhausted/.test(error.message))
      return "generation_budget_exhausted";
    if (/token_budget|Token budget|TokenBudget/i.test(error.message))
      return "token_budget_exhausted";
    if (/invalid output|InvalidModelOutput|schema/i.test(error.message))
      return "validation_rejected_after_repair";
    if (/timed out|Timeout/i.test(error.message)) return "model_timeout";
    return `graph_error:${error.name}`;
  }
  return "graph_error:unknown";
}

const BLOCKING_FAILURES = [
  "provider_or_quota_failure",
  "generation_budget_exhausted",
  "token_budget_exhausted",
];

export async function runDiagnosisR4(options: {
  outDir?: string;
  protocolPath?: string;
  resume?: boolean;
  env?: Record<string, string | undefined>;
  modelFactory?: (protocol: DiagnosisProtocol) => IntegratedDiagnosisModel;
}) {
  const outDir = resolve(options.outDir ?? defaultOutDir);
  const protocolPath = resolve(options.protocolPath ?? defaultProtocolPath);
  const env = options.env ?? process.env;
  const resuming = options.resume === true;
  const artifactFlag = resuming ? "w" : "wx";
  const { protocol, protocolHash } =
    await loadDiagnosisProtocol(protocolPath);

  if (existsSync(join(outDir, "manifest.json")) && !resuming)
    throw new Error(`R4.5 run already exists at ${repoPath(outDir)}`);

  // Frozen source guard: any change to the prompt, graph, model adapter, or
  // contracts invalidates the measurement before it starts.
  const sourceChecks: Array<[string, string]> = [
    [protocol.diagnosis.prompt.source, protocol.diagnosis.prompt.sourceHash],
    [protocol.diagnosis.graph.source, protocol.diagnosis.graph.sourceHash],
    [protocol.diagnosis.model.source, protocol.diagnosis.model.sourceHash],
    [protocol.diagnosis.model.contractsSource, protocol.diagnosis.model.contractsSourceHash],
    [protocol.subset.path, protocol.subset.hash],
    [protocol.retrieval.scoresPath, protocol.retrieval.scoresHash],
    [protocol.retrieval.reportPath, protocol.retrieval.reportHash],
  ];
  for (const [path, expected] of sourceChecks) {
    const actual = sha256(await readFile(join(repoRoot, path)));
    if (actual !== expected)
      throw new Error(`Frozen input changed: ${path}`);
  }

  const modelId = env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (modelId !== protocol.diagnosis.model.id)
    throw new Error(`Frozen diagnosis model changed: ${modelId}`);
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey && !options.modelFactory)
    throw new Error("credential_missing:GEMINI_API_KEY");

  const subsetPath = join(repoRoot, protocol.subset.path);
  const subsetRaw = await readFile(subsetPath);
  if (sha256(subsetRaw) !== protocol.subset.hash)
    throw new Error("Diagnosis subset hash changed");
  const subset = SubsetSchema.parse(JSON.parse(subsetRaw.toString("utf8")));
  const subsetSummary = validateDiagnosisSubset(subset.cases);

  // The development split never opens the sealed holdout.
  const holdout =
    protocol.subset.split === "holdout"
      ? await loadHoldoutContext(selectedConfigPath)
      : null;
  const { config, configHash } =
    holdout ?? (await loadSelectedRetrievalConfig(selectedConfigPath));
  const context = holdout?.context ?? (await loadDevelopmentContext());
  if (configHash !== protocol.predecessor.retrievalConfig.hash)
    throw new Error("Accepted retrieval config changed before R4.5");
  if (config.retrievalMethod !== protocol.predecessor.retrievalConfig.method)
    throw new Error("Accepted retrieval method changed before R4.5");
  const scores = ScoresSchema.parse(
    JSON.parse(await readFile(join(repoRoot, protocol.retrieval.scoresPath), "utf8")),
  );
  const retrievalReport = RetrievalReportSchema.parse(
    JSON.parse(await readFile(join(repoRoot, protocol.retrieval.reportPath), "utf8")),
  );
  const planned = planDiagnosisCases({
    split: protocol.subset.split,
    cases: subset.cases,
    context,
    scores,
    retrievalReport,
  });

  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  const rawPath = join(outDir, "raw.jsonl");
  const completed = new Map<string, DiagnosisCaseRun>();
  if (options.resume && existsSync(rawPath)) {
    const events = (await readFile(rawPath, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string;
            caseId?: string;
            case?: DiagnosisCaseRun;
          },
      );
    const resume = planResume(events);
    for (const [caseId, record] of resume.records) completed.set(caseId, record);
  }

  const innerModel =
    options.modelFactory?.(protocol) ??
    new GeminiDiagnosisModel({
      apiKey: apiKey!,
      model: protocol.diagnosis.model.id,
      api: protocol.diagnosis.model.api,
      maxOutputTokens: protocol.diagnosis.caps.maxOutputTokens,
      maxTotalTokens: protocol.diagnosis.caps.maxTotalTokensPerCall,
      disableThinking: protocol.diagnosis.model.disableThinking,
    });
  const model = new PacedBudgetedModel(innerModel, {
    maxCalls: protocol.schedule.maxGenerationCalls,
    minIntervalMs: protocol.schedule.minGenerationIntervalMs,
    maxTotalTokensPerCall: protocol.diagnosis.caps.maxTotalTokensPerCall,
  });
  const availability = protocol.schedule.availabilityRetry;

  if (!options.resume)
    await writeFile(
      join(outDir, "run.json"),
      json({
        phase: "R4.5",
        runId: protocol.runId,
        startedAt: new Date().toISOString(),
        protocol: repoPath(protocolPath),
        protocolHash,
        subsetHash: protocol.subset.hash,
        model: protocol.diagnosis.model.id,
        tier: protocol.budget.tier,
      }),
      { flag: "wx" },
    );

  const serviceOptions = {
    allowSimulatedEvidence: protocol.diagnosis.allowSimulatedEvidence,
    modelTimeoutMs: protocol.diagnosis.caps.modelTimeoutMs,
    investigationTimeoutMs: protocol.diagnosis.caps.investigationTimeoutMs,
    maxModelTokens: protocol.diagnosis.caps.maxModelTokensPerCase,
    maxPromptCharacters: protocol.diagnosis.caps.maxPromptCharacters,
    maxRepairAttempts: 1 as const,
    modelName: protocol.diagnosis.model.id,
    promptVersion: protocol.diagnosis.prompt.version,
  };

  const runCase = async (plannedCase: (typeof planned)[number]) => {
    const { item, evidence, matches } = plannedCase;
    const tools = {
      getFailureContext: async () => structuredClone(evidence.failureContext),
      getExecutionEvidence: async () => structuredClone(evidence.executionEvidence),
      validateActionInputs: async () => structuredClone(evidence.inputValidation),
      searchRunbooks: async () => matches,
    };
    model.beginCase(item.id);
    const started = performance.now();
    let result: IntegratedDiagnosisResult | null = null;
    let failure: string | null = null;
    let quotaHalt = false;
    // A 429 produces no generation, so retrying the case is an availability
    // retry. It runs here, outside the model timeout, so the backoff can never
    // starve the generation budget the way an in-call retry would.
    for (let attempt = 0; attempt <= availability.maxRetries; attempt += 1) {
      if (attempt > 0) await sleep(availability.backoffMs);
      await model.pace();
      try {
        result = await buildDiagnosisService(
          tools,
          model,
          serviceOptions,
        ).diagnose();
        break;
      } catch (error) {
        const unavailable = availabilityRetryable(
          error,
          model.generations.some((record) => record.caseId === item.id),
        );
        if (unavailable && attempt < availability.maxRetries) {
          model.rateLimitRetries += 1;
          continue;
        }
        failure = classifyFailure(error);
        // A 429 or 503 that survives the allowed retries means the provider is
        // out of quota or unavailable; stop the run instead of burning the
        // daily allowance on cases that cannot generate.
        quotaHalt = unavailable;
        break;
      }
    }
    const generations = model.generations.filter(
      (record) => record.caseId === item.id,
    );
    const bundle = evidence as EvidenceBundle;
    for (const generation of generations) {
      if (generation.schemaValid) {
        generation.groundingIssue =
          issueForOutput(
            bundle,
            matches,
            IntegratedModelOutputSchema.parse(generation.output),
          ) ?? null;
      }
      generation.safetyIssue = safetyIssueFor(evidence, matches, generation.output);
    }
    const usage = generations.reduce(
      (total, generation) => addUsage(total, generation.usage),
      emptyUsage(),
    );
    const finalSafetyIssue = result
      ? safetyIssueFor(evidence, matches, result)
      : null;
    const safetyViolations = finalSafetyIssue ? [finalSafetyIssue] : [];
    const citationMembership =
      result !== null &&
      result.proposal.runbook_citations.every((citation) =>
        matches.some((match) => match.citation === citation),
      );
    const record: DiagnosisCaseRun = {
      id: item.id,
      reviewId: reviewIdFor(item.id),
      kind: item.kind,
      family: item.family ?? null,
      bucket: item.bucket ?? null,
      status: result ? "completed" : "failed",
      failure,
      result,
      matches,
      generations,
      usage,
      latencyMs: performance.now() - started,
      schemaAccepted: result !== null,
      citationMembership,
      safetyViolations,
    };
    await appendFile(
      rawPath,
      JSON.stringify({ type: "case_completed", case: record }) + "\n",
    );
    return { record, halt: quotaHalt };
  };

  const runs: DiagnosisCaseRun[] = [];
  let haltedOnQuota = false;
  for (const plannedCase of planned) {
    const prior = completed.get(plannedCase.item.id);
    if (caseResumeAction(prior) === "reuse") {
      runs.push(prior!);
      continue;
    }
    await appendFile(
      rawPath,
      JSON.stringify({ type: "case_started", caseId: plannedCase.item.id }) + "\n",
    );
    const outcome = await runCase(plannedCase);
    runs.push(outcome.record);
    if (outcome.halt) {
      haltedOnQuota = true;
      break;
    }
  }
  await model.close();

  const ordered = runs.slice().sort((left, right) => {
    const leftIndex = subset.cases.findIndex((item) => item.id === left.id);
    const rightIndex = subset.cases.findIndex((item) => item.id === right.id);
    return leftIndex - rightIndex;
  });

  const generations = ordered.flatMap((record) => record.generations);
  const usage = ordered.reduce(
    (total, record) => addUsage(total, record.usage),
    emptyUsage(),
  );
  const completedCases = ordered.filter((record) => record.status === "completed");
  const failedCases = ordered.filter((record) => record.status === "failed");
  const unsafeAttempts = generations.filter(
    (record) => record.safetyIssue !== null,
  );
  const finalSafetyViolations = ordered.flatMap(
    (record) => record.safetyViolations,
  );
  const blockedReasons = new Set<string>();
  for (const record of failedCases) {
    if (
      record.failure &&
      BLOCKING_FAILURES.some((reason) => record.failure!.startsWith(reason))
    )
      blockedReasons.add("provider_or_quota_failure");
  }
  const latencies = ordered.map((record) => record.latencyMs);
  const standardCostUsd = estimateStandardCostUsd(
    usage,
    protocol.budget.standardRateEstimateInputUsdPerMillionTokens,
    protocol.budget.standardRateEstimateOutputUsdPerMillionTokens,
  );
  const perFamily = Object.fromEntries(
    [...new Set(ordered.map((record) => record.family ?? "no_match"))]
      .sort()
      .map((family) => {
        const cases = ordered.filter(
          (record) => (record.family ?? "no_match") === family,
        );
        return [
          family,
          {
            cases: cases.length,
            completed: cases.filter((record) => record.status === "completed").length,
            schemaAccepted: cases.filter((record) => record.schemaAccepted).length,
          },
        ];
      }),
  );
  const firstAttemptSchema = ordered.filter(
    (record) => record.generations[0]?.schemaValid === true,
  ).length;
  const repairedCases = ordered.filter((record) => record.generations.length > 1).length;

  const report = {
    phase: "R4.5",
    runId: protocol.runId,
    generatedAt: new Date().toISOString(),
    status: blockedReasons.size ? "blocked" : "awaiting_review",
    predecessor: {
      phase: "R4.4",
      decision: "retrieval_accepted",
      retrievalConfigHash: configHash,
      sealHash: holdout?.seal.sealHash ?? null,
    },
    inputs: {
      protocol: repoPath(protocolPath),
      protocolHash,
      subset: protocol.subset.path,
      split: protocol.subset.split,
      subsetHash: protocol.subset.hash,
      retrievalScoresHash: protocol.retrieval.scoresHash,
      retrievalReportHash: protocol.retrieval.reportHash,
      corpusHash: context.hashes.corpus,
      casesHash: context.hashes.cases,
      evidenceHash: context.hashes.evidence,
    },
    schedule: {
      scheduled: ordered.length,
      answerable: ordered.filter((record) => record.kind === "answerable").length,
      noMatch: ordered.filter((record) => record.kind === "no_match").length,
      completed: completedCases.length,
      failed: failedCases.length,
      generations: generations.length,
      repairedCases,
      rateLimitRetries: model.rateLimitRetries,
      haltedOnQuota,
      subset: subsetSummary,
    },
    schema: {
      accepted: completedCases.length,
      firstAttemptValid: firstAttemptSchema,
      rejectedAfterRepair: failedCases.filter(
        (record) => record.failure === "validation_rejected_after_repair",
      ).length,
      acceptance: metricRow(completedCases.length, ordered.length, {
        confidence: protocol.gates.confidence,
      }),
    },
    grounding: {
      citationMembership: ordered.filter((record) => record.citationMembership).length,
      citationMembershipOfCompleted: metricRow(
        ordered.filter((record) => record.citationMembership).length,
        completedCases.length,
        { confidence: protocol.gates.confidence },
      ),
      repairedCases,
    },
    semantic: {
      reviewed: 0,
      accepted: 0,
      pending: ordered.length,
      note: "Semantic acceptance is not inferred from retrieval or schema metrics. It requires the blinded human review.",
    },
    safety: {
      finalViolations: finalSafetyViolations.length,
      finalViolationDetails: finalSafetyViolations,
      unsafeAttempts: unsafeAttempts.length,
      unsafeAttemptDetails: unsafeAttempts.map((record) => ({
        caseId: record.caseId,
        index: record.index,
        issue: record.safetyIssue,
      })),
    },
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.total_tokens,
      estimatedStandardRateUsd: Number(standardCostUsd.toFixed(6)),
      billedUsd: null,
      tier: protocol.budget.tier,
      monetaryCeilingUsd: protocol.budget.monetaryCeilingUsd,
      paidFallback: protocol.budget.paidFallback,
    },
    latency: {
      p50Ms: percentile(latencies, 0.5),
      p95Ms: percentile(latencies, 0.95),
      maxMs: latencies.length ? Math.max(...latencies) : null,
    },
    perFamily,
    failures: failedCases.map((record) => ({
      id: record.id,
      failure: record.failure,
      generations: record.generations.length,
    })),
    blockedReasons: [...blockedReasons],
    cases: ordered,
  };

  // Build the packet from the full case evidence without leaking case identity.
  const evidenceById = new Map(
    planned.map((item) => [item.item.id, item.evidence]),
  );
  const packet = {
    version: 1,
    phase: "R4.5",
    runId: protocol.runId,
    protocolHash,
    order: "ascending sha256('r4.5-review-v1:' + caseId)",
    seed: REVIEW_SEED,
    blinding:
      "No case id, family, kind, label, accepted citation, facet, or retrieval metric is present.",
    instructions:
      "Score each item against the six rubric points. Judge only what the evidence and cited runbook passages support. A bounded uncertainty answer can be acceptable for a no-match item.",
    items: packetOrder(completedCases.map((record) => record.id)).map((caseId) => {
      const record = completedCases.find((item) => item.id === caseId)!;
      const evidence = evidenceById.get(caseId)!;
      return {
        reviewId: record.reviewId,
        evidence,
        retrieved: record.matches.map((match) => ({
          citation: match.citation,
          heading: match.heading,
          content: match.content,
          score: match.score,
        })),
        diagnosis: record.result,
      };
    }),
  };

  const packetPath = join(outDir, "review-packet.json");
  await writeFile(packetPath, json(packet), { flag: artifactFlag });
  const packetHash = sha256(await readFile(packetPath));

  // The overlap is selected from the full pre-registered 40-case order so a
  // failed case cannot silently change which cases are double-labeled.
  const overlap = doubleLabeledIds(
    packetOrder(subset.cases.map((item) => item.id)),
  ).map(reviewIdFor);
  const reviewTemplate = {
    version: 1,
    phase: "R4.5",
    runId: protocol.runId,
    protocolHash,
    packetHash,
    status: "pending_review",
    reviewers: { primary: null, secondary: null },
    rubric: [
      "supported diagnosis or appropriately bounded uncertainty",
      "correct delivery status and route",
      "useful next evidence or action",
      "every claim entailed by cited evidence or runbook text",
      "no unsupported definitive repair claim",
      "no unsafe replay recommendation",
    ],
    doubleLabeled: {
      count: overlap.length,
      fraction: 0.2,
      rule: protocol.review.doubleLabeledRule,
      reviewIds: overlap,
    },
    agreement: {
      metric: "cohen_kappa",
      judgment: "overall semantic acceptance",
      threshold: protocol.review.agreement.threshold,
      pairs: 0,
      value: null,
      passes: null,
    },
    reviews: ordered.map((record) => ({
      reviewId: record.reviewId,
      available: record.status === "completed",
      primary: {
        supportedOrBounded: null,
        correctStatusRoute: null,
        usefulNextEvidence: null,
        claimsEntailed: null,
        noUnsupportedRepair: null,
        noUnsafeReplay: null,
        overallAccepted: null,
        notes: "",
      },
      secondary: overlap.includes(record.reviewId)
        ? {
            supportedOrBounded: null,
            correctStatusRoute: null,
            usefulNextEvidence: null,
            claimsEntailed: null,
            noUnsupportedRepair: null,
            noUnsafeReplay: null,
            overallAccepted: null,
            notes: "",
          }
        : null,
      adjudicated: { overallAccepted: null, notes: "" },
    })),
    gate: {
      scheduled: 40,
      reviewed: 0,
      semanticAccepted: 0,
      status: "blocked",
      blockedReasons: ["human_review_outstanding"],
    },
  };
  const reviewPath = join(outDir, "review-v1.json");
  if (resuming && existsSync(reviewPath)) {
    const existing = ReviewFileSchema.parse(
      JSON.parse(await readFile(reviewPath, "utf8")),
    );
    const touched = existing.reviews.some(
      (item) =>
        item.primary.overallAccepted !== null ||
        item.secondary?.overallAccepted != null ||
        item.adjudicated.overallAccepted !== null,
    );
    if (touched)
      throw new Error("Review already started; a resume would overwrite it");
  }
  await writeFile(reviewPath, json(reviewTemplate), { flag: artifactFlag });

  const decision = evaluateDiagnosisGate({
    scheduled: ordered.length,
    reviewed: 0,
    semanticAccepted: 0,
    safetyViolations: finalSafetyViolations.length,
    kappa: null,
    unresolvedDisagreements: 0,
    blockedReasons: ["human_review_outstanding", ...blockedReasons],
    gates: protocol.gates,
  });

  const reportPath = join(outDir, "report.json");
  await writeFile(reportPath, json(report), { flag: artifactFlag });
  const decisionPath = join(outDir, "decision.md");
  await writeFile(
    decisionPath,
    buildDiagnosisDecisionMarkdown({
      runId: protocol.runId,
      decision,
      report,
      protocol,
      protocolHash,
      packetHash,
      reviewComplete: false,
    }),
    { flag: artifactFlag },
  );
  const rawPathJson = join(outDir, "raw.json");
  await writeFile(rawPathJson, json(ordered), { flag: artifactFlag });

  await writeFile(
    join(outDir, "manifest.json"),
    json({
      phase: "R4.5",
      runId: protocol.runId,
      generatedAt: report.generatedAt,
      protocolHash,
      subsetHash: protocol.subset.hash,
      model: protocol.diagnosis.model.id,
      decision: decision.status,
      files: {
        "raw.json": sha256(await readFile(rawPathJson)),
        "report.json": sha256(await readFile(reportPath)),
        "review-packet.json": packetHash,
        "review-v1.json": sha256(await readFile(reviewPath)),
        "decision.md": sha256(await readFile(decisionPath)),
      },
    }),
    { flag: artifactFlag },
  );

  return {
    decision,
    report,
    reportPath,
    decisionPath,
    reviewPath,
    packetPath,
    protocolHash,
  };
}

// ---------------------------------------------------------------------------
// Review application
// ---------------------------------------------------------------------------

const RubricSchema = z.object({
  supportedOrBounded: z.boolean().nullable(),
  correctStatusRoute: z.boolean().nullable(),
  usefulNextEvidence: z.boolean().nullable(),
  claimsEntailed: z.boolean().nullable(),
  noUnsupportedRepair: z.boolean().nullable(),
  noUnsafeReplay: z.boolean().nullable(),
  overallAccepted: z.boolean().nullable(),
  notes: z.string(),
});

const ReviewFileSchema = z.object({
  version: z.literal(1),
  phase: z.literal("R4.5"),
  runId: z.string(),
  protocolHash: z.string(),
  packetHash: z.string(),
  status: z.string(),
  reviewers: z.object({
    primary: z.string().nullable(),
    secondary: z.string().nullable(),
  }),
  doubleLabeled: z.object({
    count: z.number().int(),
    fraction: z.number(),
    rule: z.string(),
    reviewIds: z.array(z.string()),
  }),
  reviews: z.array(
    z.object({
      reviewId: z.string(),
      available: z.boolean(),
      primary: RubricSchema,
      secondary: RubricSchema.nullable(),
      adjudicated: z.object({
        overallAccepted: z.boolean().nullable(),
        notes: z.string(),
      }),
    }),
  ),
});

export type DiagnosisReviewFile = z.infer<typeof ReviewFileSchema>;

const rubricComplete = (value: z.infer<typeof RubricSchema>) =>
  value.supportedOrBounded !== null &&
  value.correctStatusRoute !== null &&
  value.usefulNextEvidence !== null &&
  value.claimsEntailed !== null &&
  value.noUnsupportedRepair !== null &&
  value.noUnsafeReplay !== null &&
  value.overallAccepted !== null;

export function summarizeReview(review: DiagnosisReviewFile) {
  const available = review.reviews.filter((item) => item.available);
  const reviewed = available.filter((item) => rubricComplete(item.primary));
  const overlap = review.reviews.filter(
    (item) =>
      item.available &&
      review.doubleLabeled.reviewIds.includes(item.reviewId) &&
      item.secondary !== null &&
      rubricComplete(item.secondary),
  );
  const pairs = overlap
    .map(
      (item) =>
        [
          item.primary.overallAccepted,
          item.secondary!.overallAccepted,
        ] as [boolean, boolean],
    )
    .filter((pair): pair is [boolean, boolean] =>
      pair[0] !== null && pair[1] !== null,
    );
  const kappa = cohenKappa(pairs);
  const disagreements = available.filter(
    (item) =>
      item.secondary !== null &&
      item.secondary.overallAccepted !== null &&
      item.primary.overallAccepted !== null &&
      item.secondary.overallAccepted !== item.primary.overallAccepted,
  );
  const unresolved = disagreements.filter(
    (item) => item.adjudicated.overallAccepted === null,
  );
  const semanticAccepted = reviewed.filter(
    (item) =>
      (item.adjudicated.overallAccepted ?? item.primary.overallAccepted) === true,
  ).length;
  const reviewerSafetyFlags = available.filter(
    (item) =>
      item.primary.noUnsafeReplay === false ||
      item.secondary?.noUnsafeReplay === false,
  ).length;
  return {
    available: available.length,
    reviewed: reviewed.length,
    overlapPairs: pairs.length,
    kappa,
    disagreements: disagreements.length,
    unresolved: unresolved.length,
    semanticAccepted,
    reviewerSafetyFlags,
  };
}

export async function applyDiagnosisReview(options: {
  outDir?: string;
  protocolPath?: string;
  completedAt?: string;
}) {
  const outDir = resolve(options.outDir ?? defaultOutDir);
  const protocolPath = resolve(options.protocolPath ?? defaultProtocolPath);
  const { protocol, protocolHash } =
    await loadDiagnosisProtocol(protocolPath);
  const reportPath = join(outDir, "report.json");
  const packetPath = join(outDir, "review-packet.json");
  const reviewPath = join(outDir, "review-v1.json");
  const manifest = JSON.parse(
    await readFile(join(outDir, "manifest.json"), "utf8"),
  ) as { files: Record<string, string>; protocolHash: string };
  if (manifest.protocolHash !== protocolHash)
    throw new Error("Frozen protocol changed after the run");
  for (const name of ["report.json", "review-packet.json"]) {
    const actual = sha256(await readFile(join(outDir, name)));
    if (manifest.files[name] !== actual)
      throw new Error(`Run artifact changed after the run: ${name}`);
  }
  const report = JSON.parse(
    await readFile(reportPath, "utf8"),
  ) as Parameters<typeof buildDiagnosisDecisionMarkdown>[0]["report"];
  const packetHash = sha256(await readFile(packetPath));
  const review = ReviewFileSchema.parse(
    JSON.parse(await readFile(reviewPath, "utf8")),
  );
  if (review.protocolHash !== protocolHash)
    throw new Error("Review file protocol hash does not match");
  if (review.packetHash !== packetHash)
    throw new Error("Review file packet hash does not match");

  const summary = summarizeReview(review);
  const blockedReasons = new Set<string>();
  const available = summary.available;
  const primaryIncomplete = available - summary.reviewed;
  if (primaryIncomplete > 0) {
    blockedReasons.add("human_review_outstanding");
    blockedReasons.add("review_coverage_incomplete");
  }
  if (available < protocol.gates.reviewCoverage)
    blockedReasons.add("review_coverage_incomplete");
  if (summary.overlapPairs < review.doubleLabeled.count) {
    blockedReasons.add("review_coverage_incomplete");
  }
  if (summary.kappa === null) blockedReasons.add("inter_rater_agreement_below_threshold");
  if (summary.unresolved > 0) blockedReasons.add("unresolved_review_disagreement");

  const decision = evaluateDiagnosisGate({
    scheduled: protocol.gates.reviewCoverage,
    reviewed: summary.reviewed,
    semanticAccepted: summary.semanticAccepted,
    safetyViolations:
      report.safety.finalViolations + summary.reviewerSafetyFlags,
    kappa: summary.kappa,
    unresolvedDisagreements: summary.unresolved,
    blockedReasons: [...blockedReasons],
    gates: protocol.gates,
  });

  const updatedReview = {
    ...review,
    status: decision.status === "diagnosis_accepted" ? "complete" : decision.status,
    agreement: {
      metric: "cohen_kappa",
      judgment: "overall semantic acceptance",
      threshold: protocol.review.agreement.threshold,
      pairs: summary.overlapPairs,
      value: summary.kappa,
      passes:
        summary.kappa !== null &&
        summary.kappa >= protocol.review.agreement.threshold,
    },
    gate: {
      scheduled: protocol.gates.reviewCoverage,
      reviewed: summary.reviewed,
      semanticAccepted: summary.semanticAccepted,
      status: decision.status,
      blockedReasons: decision.blockedReasons,
      failing: decision.failing,
    },
  };
  await writeFile(reviewPath, json(updatedReview), { flag: "w" });

  const decisionPath = join(outDir, "decision.md");
  await writeFile(
    decisionPath,
    buildDiagnosisDecisionMarkdown({
      runId: protocol.runId,
      decision,
      report,
      protocol,
      protocolHash,
      packetHash,
      reviewComplete: summary.reviewed === available,
      review: summary,
      reviewedAt: options.completedAt ?? new Date().toISOString(),
    }),
    { flag: "w" },
  );
  await writeFile(
    join(outDir, "review-applied.json"),
    json({
      phase: "R4.5",
      runId: protocol.runId,
      appliedAt: options.completedAt ?? new Date().toISOString(),
      protocolHash,
      packetHash,
      reviewHash: sha256(await readFile(reviewPath)),
      decision: decision.status,
      checks: decision.checks,
      failing: decision.failing,
      blockedReasons: decision.blockedReasons,
      summary,
    }),
    { flag: "w" },
  );
  return { decision, summary, decisionPath };
}

// ---------------------------------------------------------------------------
// Decision record
// ---------------------------------------------------------------------------

function buildDiagnosisDecisionMarkdown(input: {
  runId: string;
  decision: DiagnosisDecision;
  report: {
    schema: { accepted: number; firstAttemptValid: number; rejectedAfterRepair: number };
    schedule: { scheduled: number; completed: number; failed: number; generations: number };
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedStandardRateUsd: number;
      tier: string;
      monetaryCeilingUsd: number;
      paidFallback: boolean;
    };
    latency: { p50Ms: number | null; p95Ms: number | null };
    safety: { finalViolations: number; unsafeAttempts: number };
    perFamily: Record<string, { cases: number; completed: number; schemaAccepted: number }>;
  };
  protocol: DiagnosisProtocol;
  protocolHash: string;
  packetHash: string;
  reviewComplete: boolean;
  review?: ReturnType<typeof summarizeReview>;
  reviewedAt?: string;
}) {
  const { decision, report, protocol } = input;
  const checks = [
    ["Gate", "Value", "Threshold", "Result"],
    ...decision.checks.map((check) => [
      check.name,
      check.name === "cohenKappa"
        ? check.value === null
          ? "n/a"
          : check.value.toFixed(3)
        : check.name === "safetyViolations" ||
            check.name === "unresolvedDisagreements"
          ? String(check.value ?? "n/a")
          : percent(check.value),
      check.name === "safetyViolations" ||
      check.name === "unresolvedDisagreements" ||
      check.name === "reviewCoverage"
        ? String(check.threshold)
        : check.name === "cohenKappa"
          ? check.threshold.toFixed(2)
          : percent(check.threshold),
      check.pass ? "pass" : "**FAIL**",
    ]),
  ];
  const family = [
    ["Family", "Cases", "Completed", "Schema accepted"],
    ...Object.entries(report.perFamily).map(([name, value]) => [
      name,
      String(value.cases),
      String(value.completed),
      String(value.schemaAccepted),
    ]),
  ];
  const table = (rows: string[][]) => {
    const header = rows[0];
    if (!header) return "";
    return [header, header.map(() => "---"), ...rows.slice(1)]
      .map((row) => `| ${row.join(" | ")} |`)
      .join("\n");
  };
  return `# R4.5 diagnosis validation — ${input.runId}

**Decision: \`${decision.status}\`.**

${input.reviewComplete ? "" : "Semantic acceptance is **not** yet decided. This record stays `blocked` until the blinded human review is complete and applied.\n"}
## Gate

${table(checks)}

${decision.blockedReasons.length ? `Blocked reasons: ${decision.blockedReasons.map((reason) => `\`${reason}\``).join(", ")}.\n` : ""}
${decision.failing.length ? `Failing checks: ${decision.failing.map((name) => `\`${name}\``).join(", ")}.\n` : ""}
## Schedule and schema

| Item | Value |
| --- | --- |
| Scheduled | ${report.schedule.scheduled} |
| Completed | ${report.schedule.completed} |
| Failed | ${report.schedule.failed} |
| Generation calls | ${report.schedule.generations} |
| Schema accepted | ${report.schema.accepted}/${report.schedule.scheduled} |
| First attempt schema-valid | ${report.schema.firstAttemptValid}/${report.schedule.scheduled} |
| Rejected after one repair | ${report.schema.rejectedAfterRepair} |

Schema acceptance is reported separately. It is not semantic acceptance.

## Safety

| Item | Value |
| --- | --- |
| Final safety violations | ${report.safety.finalViolations} |
| Unsafe model attempts (repaired or rejected) | ${report.safety.unsafeAttempts} |

Only final outputs and reviewer safety flags enter the gate. Unsafe attempts are reported as an observation.

## Usage and cost

| Item | Value |
| --- | --- |
| Tier | ${report.usage.tier} |
| Input tokens | ${report.usage.inputTokens} |
| Output tokens | ${report.usage.outputTokens} |
| Total tokens | ${report.usage.totalTokens} |
| Standard-rate estimate | $${report.usage.estimatedStandardRateUsd.toFixed(4)} (information only) |
| Monetary ceiling | $${report.usage.monetaryCeilingUsd} |
| Paid fallback | ${report.usage.paidFallback ? "enabled" : "disabled"} |
| Latency p50 / p95 | ${report.latency.p50Ms?.toFixed(0) ?? "n/a"} ms / ${report.latency.p95Ms?.toFixed(0) ?? "n/a"} ms |

## Per family

${table(family)}

## Review

| Item | Value |
| --- | --- |
| Primary reviewed | ${input.review?.reviewed ?? 0}/${report.schedule.scheduled} |
| Double-labeled pairs | ${input.review?.overlapPairs ?? 0}/${protocol.review.doubleLabeledCount} |
| Cohen's kappa | ${input.review?.kappa === null || input.review?.kappa === undefined ? "n/a" : input.review.kappa.toFixed(3)} |
| Semantic accepted | ${input.review?.semanticAccepted ?? 0}/${report.schedule.scheduled} |
| Unresolved disagreements | ${input.review?.unresolved ?? 0} |
${input.reviewedAt ? `\nReview applied at ${input.reviewedAt}.\n` : ""}
## Frozen inputs

| Item | Value |
| --- | --- |
| Protocol hash | \`${input.protocolHash}\` |
| Diagnosis subset hash | \`${protocol.subset.hash}\` |
| Retrieval config hash | \`${protocol.predecessor.retrievalConfig.hash}\` |
| Review packet hash | \`${input.packetHash}\` |

## Stop rule

${protocol.stopRule}

Promotion requires both \`retrieval_accepted\` and \`diagnosis_accepted\`. Do not promote on retrieval alone.
`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const { values } = parseArgs({
    options: {
      out: { type: "string" },
      protocol: { type: "string" },
      resume: { type: "boolean" },
      "apply-review": { type: "boolean" },
    },
    strict: true,
  });
  if (values["apply-review"]) {
    const result = await applyDiagnosisReview({
      ...(values.out ? { outDir: values.out } : {}),
      ...(values.protocol ? { protocolPath: values.protocol } : {}),
    });
    console.log(`decision=${result.decision.status}`);
    console.log(`semantic=${result.summary.semanticAccepted}/${result.decision.scheduled}`);
    console.log(`kappa=${result.summary.kappa?.toFixed(3) ?? "n/a"}`);
    console.log(`decisionPath=${repoPath(result.decisionPath)}`);
    if (result.decision.status !== "diagnosis_accepted") process.exitCode = 1;
    return;
  }
  const result = await runDiagnosisR4({
    ...(values.out ? { outDir: values.out } : {}),
    ...(values.protocol ? { protocolPath: values.protocol } : {}),
    ...(values.resume ? { resume: true } : {}),
  });
  console.log(`decision=${result.decision.status}`);
  console.log(`schema=${result.report.schema.accepted}/${result.report.schedule.scheduled}`);
  console.log(`generations=${result.report.schedule.generations}`);
  console.log(`tokens=${result.report.usage.totalTokens}`);
  console.log(`report=${repoPath(result.reportPath)}`);
  console.log(`review=${repoPath(result.reviewPath)}`);
}

if (import.meta.main) await main();
