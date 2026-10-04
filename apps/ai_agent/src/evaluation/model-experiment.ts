import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import {
  IntegratedModelOutputSchema,
  IntegratedDiagnosisResultSchema,
  ModelUsageSchema,
  type IntegratedDiagnosisModel,
  type ModelUsage,
} from "../contracts.ts";
import {
  buildDiagnosisService,
  retrievalInput,
  RunbookMatchSchema,
  ModelTimeout,
  InvalidModelOutput,
  TokenBudgetExceeded,
  InvestigationTimeout,
} from "../graph.ts";
import {
  GeminiDiagnosisModel,
  GEMINI_DIAGNOSIS_SCHEMA,
  ModelProviderError,
  ProviderErrorDetailsSchema,
  geminiEndpoint,
  type GeminiApi,
} from "../gemini-model.ts";
import { DIAGNOSIS_PROMPT_VERSION, buildDiagnosisPrompt } from "../prompts.ts";
import {
  loadRunbooks,
  searchRunbooks,
  type RunbookIndex,
} from "../tools/search-runbooks.ts";
import {
  CapturedEvaluationContextSchema,
  AcceptanceContractSchema,
  type AcceptanceContract,
  EvaluationObservationSchema,
  EvaluationCaseSchema,
  checkEvaluationDataset,
  loadEvaluationCases,
  type EvaluationCase,
  type EvaluationObservation,
  type CapturedEvaluationContext,
} from "./checks.ts";
import { runEvaluation, renderEvaluationReport } from "./experiment.ts";
import {
  createFixtureTools,
  fixtureHash,
  fixtureInput,
  fixtureRejection,
} from "./fixture-tools.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const endpoint =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const sourcePaths = [
  "apps/ai_agent/src/graph.ts",
  "apps/ai_agent/src/prompts.ts",
  "apps/ai_agent/src/contracts.ts",
  "apps/ai_agent/src/gemini-model.ts",
  "apps/ai_agent/src/tools/search-runbooks.ts",
  "apps/ai_agent/src/evaluation/model-experiment.ts",
  "apps/ai_agent/src/evaluation/fixture-tools.ts",
  "apps/ai_agent/src/evaluation/experiment.ts",
  "apps/ai_agent/src/evaluation/checks.ts",
  "apps/ai_agent/src/evaluation/safety-probes.ts",
  "apps/primary_backend/services/replay-policy.ts",
  "apps/ai_agent/package.json",
  "bun.lock",
] as const;

export const ExperimentSettingsSchema = z
  .object({
    concurrency: z.literal(1).default(1),
    minCallIntervalMs: z
      .number()
      .int()
      .nonnegative()
      .max(60_000)
      .default(13_000),
    callTimeoutMs: z.number().int().positive().max(60_000).default(40_000),
    runTimeoutMs: z.number().int().positive().max(1_800_000).default(600_000),
    maxInvocations: z.number().int().positive().max(64).default(32),
    maxTokens: z.number().int().positive().max(1_000_000).default(200_000),
    maxCaseTokens: z.number().int().positive().max(32_000).default(12_000),
    maxPromptCharacters: z
      .number()
      .int()
      .positive()
      .max(48_000)
      .default(32_000),
    maxOutputTokens: z.number().int().positive().max(4_096).default(4_096),
    maxRepairs: z.union([z.literal(0), z.literal(1)]).default(1),
  })
  .strict();
type SettingsInput = z.input<typeof ExperimentSettingsSchema>;
const RecordedSettingsSchema = ExperimentSettingsSchema.extend({
  // Frozen captures predate pacing; never assign today's default to old runs.
  minCallIntervalMs: ExperimentSettingsSchema.shape.minCallIntervalMs
    .removeDefault()
    .optional(),
  concurrency: ExperimentSettingsSchema.shape.concurrency.removeDefault(),
  callTimeoutMs: ExperimentSettingsSchema.shape.callTimeoutMs.removeDefault(),
  runTimeoutMs: ExperimentSettingsSchema.shape.runTimeoutMs.removeDefault(),
  maxInvocations: ExperimentSettingsSchema.shape.maxInvocations.removeDefault(),
  maxTokens: ExperimentSettingsSchema.shape.maxTokens.removeDefault(),
  maxCaseTokens: ExperimentSettingsSchema.shape.maxCaseTokens.removeDefault(),
  maxPromptCharacters:
    ExperimentSettingsSchema.shape.maxPromptCharacters.removeDefault(),
  maxOutputTokens:
    ExperimentSettingsSchema.shape.maxOutputTokens.removeDefault(),
  maxRepairs: ExperimentSettingsSchema.shape.maxRepairs.removeDefault(),
});
const FrozenSectionSchema = RunbookMatchSchema.omit({
  runbookId: true,
  score: true,
  authority: true,
  canChangePolicy: true,
})
  .extend({
    id: z.string().min(1).max(64),
    status: z.literal("current"),
    owner: z.string().min(1),
    reviewed: z.string().min(1),
    codeVersion: z.string().min(1),
    headingTerms: z.array(z.string()),
    contentTerms: z.array(z.string()),
  })
  .strict();
const InvocationSchema = z
  .object({
    case_id: z.string().min(1).max(96),
    invocation: z.number().int().positive(),
    repair_issue: z.string().min(1).max(128).nullable(),
    prompt_hash: sha,
    elapsed_ms: z.number().finite().nonnegative(),
    usage: ModelUsageSchema.nullable(),
    output: IntegratedModelOutputSchema.nullable(),
    // Optional only for legacy frozen captures that did not record diagnostics.
    error_details: ProviderErrorDetailsSchema.nullable().optional(),
    outcome: z.enum([
      "completed",
      "invalid_output",
      "provider_error",
      "timeout",
      "cancelled",
    ]),
  })
  .strict()
  .refine(
    (value) =>
      value.error_details == null || value.outcome === "provider_error",
  );
const ManifestSchema = z
  .object({
    manifest_version: z.literal(1),
    acceptance_contract: AcceptanceContractSchema.optional(),
    experiment_id: z.uuid(),
    created_at: z.iso.datetime({ offset: true }),
    split: z.enum(["development", "held_out"]),
    selected_case_ids: z.array(z.string().min(1).max(96)).min(1).max(26),
    dataset_version: z.literal(1),
    dataset_file_hash: sha,
    selected_cases_hash: sha,
    corpus_hash: sha,
    model: z.string().min(1).max(128),
    execution: z.enum(["explicit-model", "no-model"]),
    stop_reason: z
      .enum([
        "provider_http_401",
        "provider_http_403",
        "provider_http_404",
        "provider_http_429",
      ])
      .nullable()
      .optional(),
    model_settings: z
      .object({
        endpoint: z.union([
          z.literal(endpoint),
          z
            .string()
            .regex(
              /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-[a-z0-9.-]+:generateContent$/,
            ),
        ]),
        store: z.literal(false),
        max_output_tokens: z.number().int().positive().max(4096),
        response_schema_hash: sha,
        unspecified_generation_settings: z.literal("provider_defaults"),
      })
      .strict(),
    bounds: RecordedSettingsSchema,
    graph_version: z.literal("phase-6-v1"),
    prompt_version: z.enum(["phase-6-v1", "phase-11a-v2"]),
    fixture_contract_version: z.literal(1),
    code_revision: z
      .string()
      .regex(/^[a-f0-9]{40,64}$/)
      .nullable(),
    dirty: z.boolean().nullable(),
    source_hashes: z.record(z.string(), sha),
    runtime_versions: z.record(z.string(), z.string().nullable()),
    elapsed_ms: z.number().finite().nonnegative(),
    captured_cases: z.number().int().nonnegative(),
    cost_rate_source: z.null(),
    cost_rate_date: z.null(),
    artifact_hashes: z.record(z.string(), sha),
  })
  .strict();
const ExperimentSchema = z
  .object({
    manifest: ManifestSchema,
    cases: z.array(EvaluationCaseSchema).min(1).max(26),
    corpus: z.array(FrozenSectionSchema).max(64),
    observations: z.array(EvaluationObservationSchema).max(26),
    contexts: z.array(CapturedEvaluationContextSchema).max(26),
    invocations: z.array(InvocationSchema).max(64),
  })
  .strict();
export type ModelExperiment = z.infer<typeof ExperimentSchema>;

export function selectCases(
  allCases: readonly EvaluationCase[],
  split: "development" | "held_out" = "development",
  caseIds?: readonly string[],
) {
  const selected = allCases.filter(
    (item) =>
      item.split === split && (!caseIds || caseIds.includes(item.case_id)),
  );
  if (
    !selected.length ||
    new Set(selected.map((item) => item.case_id)).size !== selected.length
  )
    throw new Error("Empty or duplicate case selection");
  if (
    caseIds &&
    (new Set(caseIds).size !== caseIds.length ||
      caseIds.length !== selected.length)
  )
    throw new Error(
      "Case selection is outside the explicitly selected split or duplicated",
    );
  return selected.map((item) => EvaluationCaseSchema.parse(item));
}

async function provenance() {
  const source_hashes: Record<string, string> = {};
  for (const path of sourcePaths)
    source_hashes[path] = createHash("sha256")
      .update(await readFile(join(root, path)))
      .digest("hex");
  let code_revision: string | null = null;
  let dirty: boolean | null = null;
  try {
    const git = (args: string[]) =>
      execFileSync(
        "git",
        [
          "-c",
          `safe.directory=${root.replaceAll("\\", "/").replace(/\/$/, "")}`,
          ...args,
        ],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
    code_revision = git(["rev-parse", "HEAD"]);
    dirty = !!git(["status", "--porcelain"]);
  } catch {
    /* Missing Git measurements remain explicitly unknown. */
  }
  const runtime_versions: Record<string, string | null> = {
    bun: Bun.version,
    node: process.version,
  };
  for (const name of ["zod", "@langchain/langgraph"]) {
    try {
      runtime_versions[name] = JSON.parse(
        await readFile(
          join(root, "node_modules", name, "package.json"),
          "utf8",
        ),
      ).version;
    } catch {
      runtime_versions[name] = null;
    }
  }
  return { source_hashes, code_revision, dirty, runtime_versions };
}

function sanitize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "string"
        ? item
            .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+={0,2}\b/gi, "[redacted]")
            .replace(/\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/g, "[redacted]")
            .replace(
              /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
              "[redacted]",
            )
        : item,
    ),
  );
}

class ExperimentBudgetExceeded extends Error {
  constructor(readonly code: "invocation_budget" | "token_budget") {
    super(code);
  }
}
function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolvePromise, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Experiment invocation aborted", "AbortError"));
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
    operation
      .then(resolvePromise, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}
function sumUsage(calls: ModelExperiment["invocations"]): ModelUsage | null {
  if (!calls.length || calls.some((call) => call.usage === null)) return null;
  return calls.reduce(
    (sum, call) => ({
      input_tokens: sum.input_tokens + call.usage!.input_tokens,
      output_tokens: sum.output_tokens + call.usage!.output_tokens,
      total_tokens: sum.total_tokens + call.usage!.total_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
  );
}

export async function runModelExperiment(options: {
  allCases: readonly EvaluationCase[];
  index: RunbookIndex;
  model?: IntegratedDiagnosisModel;
  modelId: string;
  modelApi?: GeminiApi;
  acceptanceContract?: AcceptanceContract;
  split?: "development" | "held_out";
  caseIds?: readonly string[];
  settings?: SettingsInput;
  signal?: AbortSignal;
  datasetFileHash?: string;
  noModelReason?: "configuration_missing" | "not_executed";
  onCase?: (record: {
    observation: EvaluationObservation;
    context: CapturedEvaluationContext;
    invocations: ModelExperiment["invocations"];
  }) => Promise<void>;
}): Promise<ModelExperiment> {
  const split = options.split ?? "development";
  const cases = selectCases(options.allCases, split, options.caseIds);
  // Preflight every selected fixture. Unsupported mapping is a scope conflict,
  // never a silently skipped case or an expected-answer substitute.
  for (const item of cases)
    if (!fixtureRejection(fixtureInput(item)))
      createFixtureTools(
        fixtureInput(item),
        options.index,
        new Date().toISOString(),
      );
  const bounds = ExperimentSettingsSchema.parse(options.settings ?? {});
  const createdAt = new Date().toISOString();
  const metadata = await provenance();
  const started = performance.now();
  let timedOut = false;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, bounds.runTimeoutMs);
  const runSignal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;
  let remainingTokens = bounds.maxTokens;
  const observations: EvaluationObservation[] = [];
  const contexts: CapturedEvaluationContext[] = [];
  const invocations: ModelExperiment["invocations"] = [];
  let stopReason: ModelExperiment["manifest"]["stop_reason"] = null;
  let lastCallStarted: number | null = null;
  const waitForModelSlot = async (signal: AbortSignal) => {
    signal.throwIfAborted();
    if (invocations.length >= bounds.maxInvocations)
      throw new ExperimentBudgetExceeded("invocation_budget");
    // One shared schedule spaces both initial requests and graph repairs.
    while (lastCallStarted !== null) {
      const remaining =
        lastCallStarted + bounds.minCallIntervalMs - performance.now();
      if (remaining <= 0) break;
      await delay(Math.ceil(remaining), undefined, { signal });
    }
    signal.throwIfAborted();
  };
  try {
    for (const item of cases) {
      const caseStarted = performance.now();
      const input = fixtureInput(item);
      const rejection = fixtureRejection(input);
      let failure: CapturedEvaluationContext["failure"] = null;
      let result: unknown = null;
      let adapter: ReturnType<typeof createFixtureTools> | null = null;
      if (!rejection) {
        if (!options.model)
          failure = options.noModelReason ?? "configuration_missing";
        else if (stopReason) failure = "not_executed";
        else if (runSignal.aborted)
          failure = timedOut ? "run_timeout" : "cancelled";
        else {
          adapter = createFixtureTools(input, options.index, createdAt);
          const measuredModel: IntegratedDiagnosisModel = {
            close: async () => {},
            generate: async (prompt, signal) => {
              signal.throwIfAborted();
              if (invocations.length >= bounds.maxInvocations)
                throw new ExperimentBudgetExceeded("invocation_budget");
              // Conservatively reserve UTF-8 input/schema bytes + the capped output
              // tokens before a call. Unknown usage retains its entire reservation.
              const reservation =
                Buffer.byteLength(prompt.input + prompt.instructions) +
                Buffer.byteLength(JSON.stringify(GEMINI_DIAGNOSIS_SCHEMA)) +
                bounds.maxOutputTokens;
              if (remainingTokens < reservation)
                throw new ExperimentBudgetExceeded("token_budget");
              remainingTokens -= reservation;
              const record: ModelExperiment["invocations"][number] = {
                case_id: item.case_id,
                invocation: invocations.length + 1,
                repair_issue: prompt.repair?.issue ?? null,
                prompt_hash: fixtureHash(prompt),
                elapsed_ms: 0,
                usage: null,
                output: null,
                error_details: null,
                outcome: "provider_error",
              };
              invocations.push(record);
              const callStarted = performance.now();
              lastCallStarted = callStarted;
              try {
                const generation = await abortable(
                  options.model!.generate(prompt, signal),
                  signal,
                );
                const measured = ModelUsageSchema.safeParse(generation.usage);
                record.usage = measured.success ? measured.data : null;
                const parsed = IntegratedModelOutputSchema.safeParse(
                  generation.output,
                );
                record.output = parsed.success ? sanitize(parsed.data) : null;
                record.outcome = parsed.success
                  ? "completed"
                  : "invalid_output";
                return generation;
              } catch (error) {
                if (error instanceof ModelProviderError)
                  record.usage = error.usage;
                record.outcome = signal.aborted
                  ? runSignal.aborted && !timedOut
                    ? "cancelled"
                    : "timeout"
                  : "provider_error";
                if (record.outcome === "provider_error") {
                  const details = ProviderErrorDetailsSchema.safeParse(
                    error instanceof ModelProviderError ? error.details : null,
                  );
                  record.error_details = details.success
                    ? details.data
                    : { category: "unknown", http_status: null };
                  const status = record.error_details.http_status;
                  if (status === 401 || status === 403 || status === 404 || status === 429)
                    stopReason = `provider_http_${status}`;
                }
                throw error;
              } finally {
                record.elapsed_ms = performance.now() - callStarted;
                if (record.usage)
                  remainingTokens += reservation - record.usage.total_tokens;
              }
            },
          };
          try {
            result = sanitize(
              await buildDiagnosisService(adapter.tools, measuredModel, {
                allowSimulatedEvidence: true,
                signal: runSignal,
                modelName: options.modelId,
                modelTimeoutMs: bounds.callTimeoutMs,
                beforeModelInvocation: waitForModelSlot,
                investigationTimeoutMs: bounds.runTimeoutMs,
                maxModelTokens: bounds.maxCaseTokens,
                maxPromptCharacters: bounds.maxPromptCharacters,
                maxRepairAttempts: bounds.maxRepairs,
              }).diagnose(),
            );
          } catch (error) {
            failure = runSignal.aborted
              ? timedOut
                ? "run_timeout"
                : "cancelled"
              : error instanceof ExperimentBudgetExceeded
                ? error.code
                : error instanceof ModelTimeout ||
                    error instanceof InvestigationTimeout ||
                    (error instanceof DOMException &&
                      error.name === "AbortError")
                  ? "model_timeout"
                  : error instanceof TokenBudgetExceeded
                    ? "token_budget"
                    : error instanceof InvalidModelOutput
                      ? "invalid_output"
                      : error instanceof ModelProviderError ||
                          invocations.some(
                            (call) =>
                              call.case_id === item.case_id &&
                              call.outcome === "provider_error",
                          )
                        ? "provider_error"
                        : "graph_error";
          }
        }
      }
      const calls = invocations.filter((call) => call.case_id === item.case_id);
      const observation = EvaluationObservationSchema.parse({
        case_id: item.case_id,
        result,
        model_invocations: calls.length,
        usage: sumUsage(calls),
        cost_usd: calls.length ? null : 0,
        latency_ms: performance.now() - caseStarted,
      });
      const context = CapturedEvaluationContextSchema.parse({
        context_version: 1,
        case_id: item.case_id,
        evidence: adapter?.bundle ?? null,
        retrieval: adapter?.getRetrieval() ?? null,
        rejection,
        failure,
      });
      observations.push(observation);
      contexts.push(context);
      await options.onCase?.({ observation, context, invocations: calls });
    }
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  const corpus = options.index.map((section) => ({
    ...section,
    headingTerms: [...section.headingTerms],
    contentTerms: [...section.contentTerms],
  }));
  return validateExperiment({
    manifest: {
      manifest_version: 1,
      ...(options.acceptanceContract ? { acceptance_contract: options.acceptanceContract } : {}),
      experiment_id: randomUUID(),
      created_at: createdAt,
      split,
      selected_case_ids: cases.map((item) => item.case_id),
      dataset_version: 1,
      dataset_file_hash:
        options.datasetFileHash ?? fixtureHash(options.allCases),
      selected_cases_hash: fixtureHash(cases),
      corpus_hash: fixtureHash(corpus),
      model: options.modelId,
      execution: options.model ? "explicit-model" : "no-model",
      stop_reason: stopReason,
      model_settings: {
        endpoint: geminiEndpoint(options.modelId, options.modelApi),
        store: false,
        max_output_tokens: bounds.maxOutputTokens,
        response_schema_hash: fixtureHash(GEMINI_DIAGNOSIS_SCHEMA),
        unspecified_generation_settings: "provider_defaults",
      },
      bounds,
      graph_version: "phase-6-v1",
      prompt_version: DIAGNOSIS_PROMPT_VERSION,
      fixture_contract_version: 1,
      ...metadata,
      elapsed_ms: performance.now() - started,
      captured_cases: observations.length,
      cost_rate_source: null,
      cost_rate_date: null,
      artifact_hashes: {},
    },
    cases,
    corpus,
    observations,
    contexts,
    invocations,
  });
}

function thawCorpus(corpus: ModelExperiment["corpus"]): RunbookIndex {
  return corpus.map((section) => ({
    ...section,
    headingTerms: new Set(section.headingTerms),
    contentTerms: new Set(section.contentTerms),
  }));
}
export function validateExperiment(raw: unknown): ModelExperiment {
  const run = ExperimentSchema.parse(raw);
  if (
    run.manifest.stop_reason &&
    run.manifest.stop_reason !==
      `provider_http_${run.invocations.at(-1)?.error_details?.http_status}`
  )
    throw new Error("Provider stop reason does not match final invocation");
  if (
    JSON.stringify(Object.keys(run.manifest.source_hashes).sort()) !==
      JSON.stringify([...sourcePaths].sort()) ||
    run.manifest.model_settings.max_output_tokens !==
      run.manifest.bounds.maxOutputTokens ||
    run.manifest.model_settings.endpoint !==
      geminiEndpoint(
        run.manifest.model,
        run.manifest.model_settings.endpoint === endpoint
          ? "interactions"
          : "generate-content",
      ) ||
    (run.manifest.execution === "no-model" && run.invocations.length)
  )
    throw new Error("Incomplete or inconsistent source/model settings");
  const ids = run.cases.map((item) => item.case_id);
  const unique = (values: readonly string[]) =>
    new Set(values).size === values.length;
  if (
    !unique(ids) ||
    JSON.stringify(ids) !== JSON.stringify(run.manifest.selected_case_ids) ||
    run.cases.some((item) => item.split !== run.manifest.split) ||
    run.manifest.selected_cases_hash !== fixtureHash(run.cases) ||
    run.manifest.corpus_hash !== fixtureHash(run.corpus)
  )
    throw new Error("Experiment selection or dataset/corpus hash mismatch");
  if (
    run.observations.length !== ids.length ||
    run.contexts.length !== ids.length ||
    run.manifest.captured_cases !== ids.length ||
    !unique(run.observations.map((item) => item.case_id)) ||
    !unique(run.contexts.map((item) => item.case_id))
  )
    throw new Error("Incomplete or duplicate capture records");
  if (
    run.invocations.length > run.manifest.bounds.maxInvocations ||
    run.invocations.some(
      (call, i) => call.invocation !== i + 1 || !ids.includes(call.case_id),
    )
  )
    throw new Error("Invalid invocation accounting");
  const index = thawCorpus(run.corpus);
  for (const section of run.corpus) {
    if (
      createHash("sha256")
        .update(`${section.heading}\n${section.content}`)
        .digest("hex") !== section.contentHash
    )
      throw new Error("Frozen runbook content hash mismatch");
  }
  for (const item of run.cases) {
    const observation = run.observations.find(
      (row) => row.case_id === item.case_id,
    );
    const context = run.contexts.find((row) => row.case_id === item.case_id);
    if (!observation || !context) throw new Error("Capture case mismatch");
    const calls = run.invocations.filter(
      (call) => call.case_id === item.case_id,
    );
    if (
      observation.model_invocations !== calls.length ||
      JSON.stringify(observation.usage) !== JSON.stringify(sumUsage(calls))
    )
      throw new Error("Invocation usage mismatch");
    if (
      calls.length > run.manifest.bounds.maxRepairs + 1 ||
      calls.some((call, i) =>
        i === 0 ? call.repair_issue !== null : call.repair_issue === null,
      )
    )
      throw new Error("Invalid repair accounting");
    if (
      context.rejection !== fixtureRejection(fixtureInput(item)) ||
      (context.rejection && (calls.length || observation.result !== null))
    )
      throw new Error("Invalid deterministic rejection");
    if (context.evidence) {
      const expected = createFixtureTools(
        fixtureInput(item),
        index,
        context.evidence.failureContext.observed_at,
      ).bundle;
      if (fixtureHash(expected) !== fixtureHash(context.evidence))
        throw new Error("Fixture evidence mapping mismatch");
    }
    if (context.retrieval) {
      if (
        !context.evidence ||
        fixtureHash(context.retrieval.input) !==
          fixtureHash(retrievalInput(context.evidence))
      )
        throw new Error("Captured query does not match graph evidence");
      if (
        fixtureHash(context.retrieval.matches) !==
        fixtureHash(searchRunbooks(index, context.retrieval.input))
      )
        throw new Error(
          "Captured retrieval does not match frozen query/corpus",
        );
    }
    for (const call of calls) {
      if (
        !context.evidence ||
        !context.retrieval ||
        call.prompt_hash !==
          fixtureHash(
            buildDiagnosisPrompt(
              context.evidence,
              context.retrieval.matches,
              call.repair_issue ? { issue: call.repair_issue } : undefined,
              run.manifest.prompt_version,
            ),
          )
      )
        throw new Error(
          "Invocation prompt does not match captured evidence/retrieval",
        );
    }
    if (
      !context.failure &&
      !context.rejection &&
      !IntegratedDiagnosisResultSchema.safeParse(observation.result).success
    )
      throw new Error("Successful capture has no valid diagnosis");
    if (!context.failure && !context.rejection) {
      const final = calls.at(-1);
      if (
        !final?.output ||
        final.outcome !== "completed" ||
        fixtureHash(observation.result) !==
          fixtureHash({
            contract_version: 1,
            graph_version: run.manifest.graph_version,
            prompt_version: run.manifest.prompt_version,
            ...final.output,
            proposal: { ...final.output.proposal, not_before: null },
          })
      )
        throw new Error("Diagnosis does not match final completed invocation");
    }
    if (context.failure && observation.result !== null)
      throw new Error("Failure cannot substitute a diagnosis");
  }
  return run;
}

export async function evaluateExperiment(raw: ModelExperiment) {
  const run = validateExperiment(raw);
  return runEvaluation(run.cases, thawCorpus(run.corpus), {
    observations: run.observations,
    contexts: run.contexts,
    model: run.manifest.model,
    acceptanceContract: run.manifest.acceptance_contract,
  });
}
const artifactFields = [
  "cases",
  "corpus",
  "observations",
  "contexts",
  "invocations",
] as const;
export async function saveExperiment(directory: string, raw: ModelExperiment) {
  const run = validateExperiment(raw);
  await mkdir(directory, { recursive: true });
  // Exclusive creation prevents accidental overwriting of a frozen experiment.
  await writeFile(join(directory, "manifest.json"), "", { flag: "wx" });
  const artifact_hashes: Record<string, string> = {};
  for (const field of artifactFields) {
    const text = JSON.stringify(run[field], null, 2) + "\n";
    artifact_hashes[`${field}.json`] = createHash("sha256")
      .update(text)
      .digest("hex");
    await writeFile(join(directory, `${field}.json`), text, { flag: "wx" });
  }
  const report = await evaluateExperiment(run);
  for (const [name, text] of [
    ["report.json", JSON.stringify(report, null, 2) + "\n"],
    ["report.md", renderEvaluationReport(report)],
  ] as const) {
    artifact_hashes[name] = createHash("sha256").update(text).digest("hex");
    await writeFile(join(directory, name), text, { flag: "wx" });
  }
  await writeFile(
    join(directory, "manifest.json"),
    JSON.stringify({ ...run.manifest, artifact_hashes }, null, 2) + "\n",
  );
  return report;
}
export async function loadExperiment(
  directory: string,
): Promise<ModelExperiment> {
  const manifest = ManifestSchema.parse(
    JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")),
  );
  const expected = [
    ...artifactFields.map((field) => `${field}.json`),
    "report.json",
    "report.md",
  ];
  if (
    JSON.stringify(Object.keys(manifest.artifact_hashes).sort()) !==
    JSON.stringify(expected.sort())
  )
    throw new Error("Incomplete artifact manifest");
  const data: Record<string, unknown> = { manifest };
  for (const name of expected) {
    const text = await readFile(join(directory, name), "utf8");
    if (
      createHash("sha256").update(text).digest("hex") !==
      manifest.artifact_hashes[name]
    )
      throw new Error(`Artifact hash mismatch: ${name}`);
    if (name.endsWith(".json") && name !== "report.json")
      data[name.slice(0, -5)] = JSON.parse(text);
  }
  const run = validateExperiment(data);
  if (
    JSON.stringify(await evaluateExperiment(run)) !==
    JSON.stringify(
      JSON.parse(await readFile(join(directory, "report.json"), "utf8")),
    )
  )
    throw new Error(
      "Frozen report does not reproduce with the current evaluator",
    );
  return run;
}

export async function compareExperiments(
  previous: ModelExperiment,
  current: ModelExperiment,
) {
  const [before, after] = await Promise.all([
    evaluateExperiment(previous),
    evaluateExperiment(current),
  ]);
  return compareExperimentReports(previous, current, before, after);
}

// For changed prompts/rankers, reproduce each report with its matching source
// before comparing. This function does not claim to validate either capture.
export function compareExperimentReports(
  previous: Pick<ModelExperiment, "manifest">,
  current: Pick<ModelExperiment, "manifest">,
  before: Awaited<ReturnType<typeof evaluateExperiment>>,
  after: Awaited<ReturnType<typeof evaluateExperiment>>,
) {
  const changedSettings = [
    ...Object.keys(current.manifest.bounds).filter(
      (key) =>
        previous.manifest.bounds[
          key as keyof typeof previous.manifest.bounds
        ] !==
        current.manifest.bounds[key as keyof typeof current.manifest.bounds],
    ),
    ...(previous.manifest.model !== current.manifest.model ? ["model"] : []),
    ...(fixtureHash(previous.manifest.source_hashes) !==
    fixtureHash(current.manifest.source_hashes)
      ? ["source_hashes"]
      : []),
    ...(fixtureHash(previous.manifest.model_settings) !==
    fixtureHash(current.manifest.model_settings)
      ? ["model_settings"]
      : []),
  ];
  const incompatible = (
    [
      "dataset_file_hash",
      "selected_cases_hash",
      "corpus_hash",
      "split",
    ] as const
  ).filter((key) => previous.manifest[key] !== current.manifest[key]) as string[];
  if ((previous.manifest.acceptance_contract ?? "frozen-v1") !==
      (current.manifest.acceptance_contract ?? "frozen-v1")) incompatible.push("acceptance_contract");
  const rows = after.rows.map((row) => {
    const old = before.rows.find((item) => item.caseId === row.caseId);
    return {
      caseId: row.caseId,
      before: old
        ? {
            accepted: old.accepted,
            retrievalHit: old.retrievalHit,
            issues: old.issues,
          }
        : null,
      after: {
        accepted: row.accepted,
        retrievalHit: row.retrievalHit,
        issues: row.issues,
      },
      regression:
        !!old &&
        ((old.accepted && !row.accepted) ||
          (old.retrievalHit && !row.retrievalHit) ||
          row.safetyIssues.length > old.safetyIssues.length ||
          (row.issues.some((issue) => issue.startsWith("capture_failure:")) &&
            !old.issues.some((issue) => issue.startsWith("capture_failure:")))),
    };
  });
  return {
    comparison_version: 1,
    previous: previous.manifest.experiment_id,
    current: current.manifest.experiment_id,
    comparable: incompatible.length === 0,
    incompatible,
    changedSettings,
    regressions: rows.filter((row) => row.regression).map((row) => row.caseId),
    aggregate: { before: before.splits, after: after.splits },
    rows,
    limitations: [
      "Different dataset, split, case selection or corpus invalidates aggregate quality comparison.",
      "Small samples and stochastic model output do not establish statistical release confidence.",
      "Review explanation text manually; deterministic acceptance is not semantic adjudication.",
    ],
  };
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      live: { type: "boolean", default: false },
      "held-out": { type: "boolean", default: false },
      output: { type: "string" },
      experiment: { type: "string" },
      previous: { type: "string" },
      model: { type: "string" },
      api: { type: "string" },
      "acceptance-contract": { type: "string" },
      cases: { type: "string" },
      "max-invocations": { type: "string" },
      "max-tokens": { type: "string" },
      "call-timeout-ms": { type: "string" },
      "run-timeout-ms": { type: "string" },
      "min-call-interval-ms": { type: "string" },
    },
  });
  const command = positionals[0] ?? "capture";
  if (
    positionals.length > 1 ||
    !["capture", "evaluate", "compare"].includes(command)
  )
    throw new Error("Expected capture, evaluate or compare");
  if (command !== "capture") {
    if (values.live)
      throw new Error("Offline commands cannot enable live calls");
    if (!values.experiment)
      throw new Error("--experiment <frozen-directory> is required");
    const run = await loadExperiment(resolve(values.experiment));
    if (command === "evaluate") {
      const report = await evaluateExperiment(run);
      if (values.output) {
        await writeFile(
          resolve(`${values.output}.json`),
          JSON.stringify(report, null, 2) + "\n",
          { flag: "wx" },
        );
        await writeFile(
          resolve(`${values.output}.md`),
          renderEvaluationReport(report),
          { flag: "wx" },
        );
      }
      console.log(
        JSON.stringify({
          experiment: run.manifest.experiment_id,
          reproduced: true,
          safety: report.safety,
          splits: report.splits,
        }),
      );
      if (!report.safety.passed) process.exitCode = 1;
    } else {
      if (!values.previous || !values.output)
        throw new Error("compare requires --previous and --output");
      const comparison = await compareExperiments(
        await loadExperiment(resolve(values.previous)),
        run,
      );
      await writeFile(
        resolve(values.output),
        JSON.stringify(comparison, null, 2) + "\n",
        { flag: "wx" },
      );
      console.log(
        JSON.stringify({
          comparable: comparison.comparable,
          incompatible: comparison.incompatible,
          regressions: comparison.regressions,
        }),
      );
    }
  } else {
    if (!values.output)
      throw new Error(
        "capture requires --output <experiment-parent-directory>",
      );
    const allCases = await loadEvaluationCases(
      join(root, "apps/ai_agent/evaluation/cases.jsonl"),
      { includeHeldOut: true },
    );
    const issues = checkEvaluationDataset(allCases);
    if (issues.length) throw new Error(issues.join("\n"));
    const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
    const settings = ExperimentSettingsSchema.parse({
      ...(values["min-call-interval-ms"]
        ? { minCallIntervalMs: Number(values["min-call-interval-ms"]) }
        : {}),
      ...(values["max-invocations"]
        ? { maxInvocations: Number(values["max-invocations"]) }
        : {}),
      ...(values["max-tokens"]
        ? { maxTokens: Number(values["max-tokens"]) }
        : {}),
      ...(values["call-timeout-ms"]
        ? { callTimeoutMs: Number(values["call-timeout-ms"]) }
        : {}),
      ...(values["run-timeout-ms"]
        ? { runTimeoutMs: Number(values["run-timeout-ms"]) }
        : {}),
    });
    const modelId = values.model ?? process.env.GEMINI_MODEL;
    const acceptanceContract = AcceptanceContractSchema.parse(values["acceptance-contract"] ?? "frozen-v1");
    const modelApi = z
      .enum(["interactions", "generate-content"])
      .parse(values.api ?? "interactions");
    const configured = !!process.env.GEMINI_API_KEY && !!modelId;
    const adapter =
      values.live && configured
        ? new GeminiDiagnosisModel({
            apiKey: process.env.GEMINI_API_KEY!,
            model: modelId!,
            api: modelApi,
            maxOutputTokens: settings.maxOutputTokens,
          })
        : undefined;
    const selected = selectCases(
      allCases,
      values["held-out"] ? "held_out" : "development",
      values.cases?.split(","),
    );
    console.log(
      JSON.stringify({
        execution: adapter ? "LIVE DIAGNOSIS MODEL ONLY" : "NO MODEL CALLS",
        model: modelId ?? null,
        api: modelApi,
        acceptanceContract,
        split: values["held-out"] ? "held_out" : "development",
        cases: selected.length,
        bounds: settings,
        cost: "unknown; no rates configured",
        configurationMissing: values.live && !configured,
      }),
    );
    const directory = resolve(
      values.output,
      `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`,
    );
    await mkdir(directory, { recursive: true });
    const controller = new AbortController();
    const cancel = () => controller.abort();
    process.once("SIGINT", cancel);
    process.once("SIGTERM", cancel);
    try {
      const run = await runModelExperiment({
        allCases,
        index,
        model: adapter,
        modelId: modelId ?? "configured-model-unavailable",
        modelApi,
        acceptanceContract,
        noModelReason: values.live ? "configuration_missing" : "not_executed",
        split: values["held-out"] ? "held_out" : "development",
        caseIds: values.cases?.split(","),
        settings,
        signal: controller.signal,
        datasetFileHash: createHash("sha256")
          .update(
            await readFile(join(root, "apps/ai_agent/evaluation/cases.jsonl")),
          )
          .digest("hex"),
        onCase: async (record) => {
          await appendFile(
            join(directory, "progress.jsonl"),
            JSON.stringify(record) + "\n",
          );
        },
      });
      const report = await saveExperiment(directory, run);
      console.log(
        JSON.stringify({
          directory,
          experiment: run.manifest.experiment_id,
          invocations: run.invocations.length,
          stopReason: run.manifest.stop_reason,
          safety: report.safety.passed,
          complete: report.safety.complete,
          splits: report.splits,
        }),
      );
      if (!report.safety.passed) process.exitCode = 1;
    } finally {
      process.removeListener("SIGINT", cancel);
      process.removeListener("SIGTERM", cancel);
      await adapter?.close();
    }
  }
}
