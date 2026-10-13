import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import {
  ControlledFixtureEvidenceSchema,
  IntegratedDiagnosisResultSchema,
  ModelUsageSchema,
  type IntegratedDiagnosisModel,
  type ModelUsage,
} from "../contracts.ts";
import {
  buildDiagnosisService,
  retrievalInput,
  ModelTimeout,
  InvestigationTimeout,
  InvalidModelOutput,
  TokenBudgetExceeded,
  type IntegratedInvestigationTools,
} from "../graph.ts";
import {
  GeminiDiagnosisModel,
  GEMINI_DIAGNOSIS_SCHEMA,
  ModelProviderError,
} from "../gemini-model.ts";
import { DIAGNOSIS_PROMPT_VERSION } from "../prompts.ts";
import {
  loadRunbooks,
  searchRunbooks,
  type RunbookIndex,
} from "../tools/search-runbooks.ts";
import {
  CapturedEvaluationContextSchema,
  EvaluationCaseSchema,
  EvaluationObservationSchema,
  type CapturedEvaluationContext,
  type EvaluationCase,
  type EvaluationObservation,
} from "./checks.ts";
import {
  fixtureInput,
  fixtureRejection,
  createFixtureTools,
} from "./fixture-tools.ts";
import { runEvaluation } from "./experiment.ts";
import { intentMetrics, validateBenchmark } from "./retrieval-intent.ts";
import {
  planRetrieval,
  selectGapPassage,
  sanitizeSearchQuery,
  PlannerSchema,
  PLANNER_JSON_SCHEMA,
  redactText,
  type PlannerRecord,
} from "./retrieval-agentic.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const capture = "apps/ai_agent/evaluation/phase-11a-baseline-v6";
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const safeResult = (value: unknown) => {
  const result = IntegratedDiagnosisResultSchema.parse(value);
  const clean = (text: string) => redactText(text) || "redacted";
  return {
    ...result,
    diagnosis: {
      ...result.diagnosis,
      summary: clean(result.diagnosis.summary),
      missing_evidence: result.diagnosis.missing_evidence.map(clean),
      alternate_explanations:
        result.diagnosis.alternate_explanations.map(clean),
    },
    proposal: {
      ...result.proposal,
      summary: clean(result.proposal.summary),
      reasons: result.proposal.reasons.map(clean),
      preconditions: result.proposal.preconditions.map(clean),
    },
  };
};
export const SettingsSchema = z
  .object({
    callTimeoutMs: z.number().int().min(1).max(60_000).default(15_000),
    runTimeoutMs: z.number().int().min(1).max(1_800_000).default(600_000),
    maxInvocations: z.number().int().min(1).max(128).default(96),
    maxTokens: z.number().int().min(1).max(4_000_000).default(2_000_000),
    minCallIntervalMs: z.number().int().min(0).max(60_000).default(0),
  })
  .strict();
type Settings = z.infer<typeof SettingsSchema>;
type Call = {
  role: "planner" | "diagnosis";
  caseId: string | null;
  variant: string | null;
  usage: ModelUsage | null;
  latencyMs: number;
  promptHash: string;
  outcome: "completed" | "failed";
  errorDetails: { category: string; http_status: number | null } | null;
};

// The existing adapter handles transport, token preflight, parsing and usage. Only
// this offline planner's fetch rewrites its hard-coded diagnosis schema. No
// production adapter, endpoint, diagnosis prompt or diagnosis settings change.
type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
export function createPlannerGemini(
  apiKey: string,
  model: string,
  fetcher: FetchLike = globalThis.fetch,
) {
  const schema = JSON.stringify(PLANNER_JSON_SCHEMA);
  return new GeminiDiagnosisModel({
    apiKey,
    model,
    api: "generate-content",
    maxOutputTokens: 512,
    maxTotalTokens: 4_000,
    fetch: async (url, init) => {
      const body = JSON.parse(String(init?.body));
      const request = body.generateContentRequest ?? body;
      request.generationConfig.responseJsonSchema = PLANNER_JSON_SCHEMA;
      const suffix = JSON.stringify(GEMINI_DIAGNOSIS_SCHEMA);
      const text = request.systemInstruction.parts[0].text as string;
      if (!text.endsWith(suffix))
        throw new Error("Unexpected Gemini schema suffix");
      request.systemInstruction.parts[0].text =
        text.slice(0, -suffix.length) + schema;
      return fetcher(url, { ...init, body: JSON.stringify(body) });
    },
  });
}

export const stubPlanner: IntegratedDiagnosisModel = {
  close: async () => {},
  generate: async (prompt, signal) => {
    signal.throwIfAborted();
    const { evidence } = JSON.parse(prompt.input);
    return {
      output: {
        decision: "search_once",
        evidence_ids: [evidence.failureContext.evidence_id],
        gap: "verification rollback escalation",
        query: "verification rollback escalation",
      },
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    };
  },
};
export const stubDiagnosis: IntegratedDiagnosisModel = {
  close: async () => {},
  generate: async (prompt, signal) => {
    signal.throwIfAborted();
    const input = JSON.parse(prompt.input);
    const refs = [input.evidence.failureContext.evidence_id];
    return {
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      output: {
        status: "abstained",
        diagnosis: {
          taxonomy_id: "unknown",
          summary: "Offline stub: cause remains unmeasured.",
          confidence: "low",
          evidence_refs: refs,
          alternate_explanations: [],
          missing_evidence: input.required_missing_evidence,
        },
        proposal: {
          disposition:
            input.required_delivery_route?.disposition ??
            "insufficient_evidence",
          kind: "escalate",
          summary: "Collect read-only evidence.",
          reasons: ["Controlled stub does not infer a cause."],
          evidence_refs: refs,
          runbook_citations: [],
          preconditions: [],
        },
      },
    };
  },
};

function budgetModels(
  planner: IntegratedDiagnosisModel,
  diagnosis: IntegratedDiagnosisModel,
  bounds: Settings,
) {
  const controller = new AbortController();
  const deadlineAt = performance.now() + bounds.runTimeoutMs;
  const timer = setTimeout(() => controller.abort(), bounds.runTimeoutMs);
  const calls: Call[] = [];
  let remaining = bounds.maxTokens;
  let lastStarted = -Infinity;
  let stoppedBy: ModelProviderError | null = null;
  const waitForSlot = async (outerSignal: AbortSignal) => {
    if (stoppedBy || calls.length >= bounds.maxInvocations) return;
    const signal = AbortSignal.any([outerSignal, controller.signal]);
    while (performance.now() < lastStarted + bounds.minCallIntervalMs) {
      if (performance.now() >= deadlineAt) controller.abort();
      signal.throwIfAborted();
      await delay(
        Math.ceil(lastStarted + bounds.minCallIntervalMs - performance.now()),
        undefined,
        { signal },
      );
    }
    signal.throwIfAborted();
  };
  const wrap = (
    model: IntegratedDiagnosisModel,
    role: Call["role"],
  ): IntegratedDiagnosisModel => ({
    close: async () => {},
    generate: async (prompt, outerSignal) => {
      if (stoppedBy)
        throw new ModelProviderError(
          "Provider run stopped",
          undefined,
          null,
          stoppedBy.details,
        );
      // Timers can be delivered late or out of order under load. Never start a
      // new provider invocation after the absolute run deadline has elapsed.
      if (performance.now() >= deadlineAt) controller.abort();
      const signal = AbortSignal.any([
        outerSignal,
        controller.signal,
        AbortSignal.timeout(bounds.callTimeoutMs),
      ]);
      signal.throwIfAborted();
      if (calls.length >= bounds.maxInvocations)
        throw new Error("invocation_budget");
      const reservation =
        Buffer.byteLength(prompt.input + prompt.instructions) +
        Buffer.byteLength(
          JSON.stringify(
            role === "planner" ? PLANNER_JSON_SCHEMA : GEMINI_DIAGNOSIS_SCHEMA,
          ),
        ) +
        (role === "planner" ? 512 : 4096);
      if (remaining < reservation) throw new Error("token_budget");
      remaining -= reservation;
      const call: Call = {
        role,
        caseId: null,
        variant: null,
        usage: null,
        latencyMs: 0,
        promptHash: hash(json(prompt)),
        outcome: "failed",
        errorDetails: null,
      };
      calls.push(call);
      const start = performance.now();
      lastStarted = start;
      let listener: (() => void) | undefined;
      try {
        const aborted = new Promise<never>((_, reject) => {
          listener = () => reject(new Error("model_timeout"));
          signal.addEventListener("abort", listener, { once: true });
        });
        const generation = await Promise.race([
          model.generate(prompt, signal),
          aborted,
        ]);
        call.usage = ModelUsageSchema.parse(generation.usage);
        if (call.usage.total_tokens > reservation)
          throw new Error("token_budget");
        call.outcome = "completed";
        return generation;
      } catch (error) {
        if (error instanceof ModelProviderError) {
          call.usage = error.usage;
          call.errorDetails = {
            category: error.details.category,
            http_status: error.details.http_status,
          };
          if ([401, 403, 404, 429].includes(error.details.http_status ?? 0))
            stoppedBy = error;
        }
        throw error;
      } finally {
        if (listener) signal.removeEventListener("abort", listener);
        call.latencyMs = performance.now() - start;
        // Unknown usage reserves the entire amount; never silently treat it as zero.
        if (call.usage) remaining += reservation - call.usage.total_tokens;
      }
    },
  });
  return {
    planner: wrap(planner, "planner"),
    diagnosis: wrap(diagnosis, "diagnosis"),
    calls,
    signal: controller.signal,
    waitForSlot,
    finish: () => {
      clearTimeout(timer);
      controller.abort();
    },
  };
}
const sumUsage = (calls: Call[]): ModelUsage | null =>
  calls.some((c) => !c.usage)
    ? null
    : calls.reduce(
        (s, c) => ({
          input_tokens: s.input_tokens + c.usage!.input_tokens,
          output_tokens: s.output_tokens + c.usage!.output_tokens,
          total_tokens: s.total_tokens + c.usage!.total_tokens,
        }),
        { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      );

export async function compareCaptures(options: {
  cases: readonly EvaluationCase[];
  contexts: readonly CapturedEvaluationContext[];
  index: RunbookIndex;
  planner: IntegratedDiagnosisModel;
  diagnosis: IntegratedDiagnosisModel;
  settings?: z.input<typeof SettingsSchema>;
  sharedBudget?: ReturnType<typeof budgetModels>;
}) {
  const cases = EvaluationCaseSchema.array()
    .min(1)
    .max(18)
    .parse(options.cases);
  const captures = CapturedEvaluationContextSchema.array().parse(
    options.contexts,
  );
  if (
    cases.some((c) => c.split !== "development") ||
    new Set(cases.map((c) => c.case_id)).size !== cases.length ||
    new Set(captures.map((c) => c.case_id)).size !== captures.length ||
    captures.length !== cases.length
  )
    throw new Error("Incomplete or non-development inputs");
  for (const item of cases) {
    const context = captures.find((c) => c.case_id === item.case_id);
    if (
      !context ||
      context.rejection !== fixtureRejection(fixtureInput(item)) ||
      context.failure
    )
      throw new Error("Capture rejection or completeness mismatch");
    if (context.evidence) {
      const expected = createFixtureTools(
        fixtureInput(item),
        options.index,
        context.evidence.failureContext.observed_at,
      ).bundle;
      if (
        json(context.evidence) !== json(expected) ||
        json(context.retrieval?.input) !== json(retrievalInput(expected)) ||
        json(context.retrieval?.matches) !==
          json(searchRunbooks(options.index, retrievalInput(expected)))
      )
        throw new Error(
          "Capture evidence/retrieval differs from frozen input or corpus",
        );
    }
  }
  const bounds = SettingsSchema.parse(options.settings ?? {});
  const measured =
    options.sharedBudget ??
    budgetModels(options.planner, options.diagnosis, bounds);
  const variants = [];
  try {
    for (const name of ["baseline", "agentic"] as const) {
      const observations: EvaluationObservation[] = [];
      const contexts: CapturedEvaluationContext[] = [];
      const plannerRows: { id: string; record: PlannerRecord | null }[] = [];
      for (const context of captures) {
        const start = performance.now();
        const firstCall = measured.calls.length;
        let record: PlannerRecord | null = null;
        let result: unknown = null;
        let failure: CapturedEvaluationContext["failure"] = null;
        let retrieval: CapturedEvaluationContext["retrieval"] = null;
        const evidence = context.evidence;
        if (!context.rejection && evidence) {
          const read = async (value: unknown, signal: AbortSignal) => {
            signal.throwIfAborted();
            return structuredClone(value);
          };
          const tools: IntegratedInvestigationTools = {
            getFailureContext: (s) => read(evidence.failureContext, s),
            getExecutionEvidence: (limit, s) => {
              if (limit !== 10) throw new Error("Unexpected history limit");
              return read(evidence.executionEvidence, s);
            },
            validateActionInputs: (s) => read(evidence.inputValidation, s),
            searchRunbooks: async (input) => {
              const initial = searchRunbooks(options.index, input);
              if (name === "agentic") {
                await measured.waitForSlot(measured.signal);
                record = await planRetrieval(
                  evidence,
                  initial,
                  options.index,
                  measured.planner,
                  { signal: measured.signal, timeoutMs: bounds.callTimeoutMs },
                );
              }
              const matches = record?.matches ?? initial;
              retrieval = CapturedEvaluationContextSchema.shape.retrieval
                .unwrap()
                .parse({ input, matches });
              return matches;
            },
          };
          try {
            result = safeResult(
              await buildDiagnosisService(tools, measured.diagnosis, {
                allowSimulatedEvidence: true,
                signal: measured.signal,
                modelTimeoutMs: bounds.callTimeoutMs,
                investigationTimeoutMs: bounds.runTimeoutMs,
                maxModelTokens: 64_000,
                maxPromptCharacters: 48_000,
                maxRepairAttempts: 1,
                beforeModelInvocation: measured.waitForSlot,
              }).diagnose(),
            );
          } catch (error) {
            failure = measured.signal.aborted
              ? "run_timeout"
              : error instanceof Error && error.message === "invocation_budget"
                ? "invocation_budget"
                : error instanceof TokenBudgetExceeded ||
                    (error instanceof Error && error.message === "token_budget")
                  ? "token_budget"
                  : error instanceof ModelProviderError
                    ? "provider_error"
                    : error instanceof ModelTimeout ||
                        error instanceof InvestigationTimeout ||
                        (error instanceof Error &&
                          error.message === "model_timeout")
                      ? "model_timeout"
                      : error instanceof InvalidModelOutput
                        ? "invalid_output"
                        : "graph_error";
          }
        }
        const calls = measured.calls.slice(firstCall);
        for (const call of calls) {
          call.caseId = context.case_id;
          call.variant = name;
        }
        observations.push({
          case_id: context.case_id,
          result,
          model_invocations: calls.length,
          usage: sumUsage(calls),
          cost_usd: calls.length ? null : 0,
          latency_ms: performance.now() - start,
        });
        contexts.push(
          CapturedEvaluationContextSchema.parse({
            ...context,
            evidence,
            retrieval,
            failure,
          }),
        );
        plannerRows.push({ id: context.case_id, record });
      }
      const report = await runEvaluation(cases, options.index, {
        observations,
        contexts,
        model: "paired-experiment",
        acceptanceContract: "advisory-v2",
      });
      const planned = plannerRows.filter((r) => r.record);
      variants.push({
        name,
        observations,
        contexts,
        plannerRows,
        report,
        plannerMetrics: {
          eligibleCases: contexts.filter((c) => !c.rejection).length,
          attempts: planned.length,
          searches: planned.reduce((n, r) => n + r.record!.searches, 0),
          fallbacks: planned.filter((r) => r.record!.fallback).length,
          searchFrequency: planned.length
            ? planned.reduce((n, r) => n + r.record!.searches, 0) /
              planned.length
            : null,
          fallbackFrequency: planned.length
            ? planned.filter((r) => r.record!.fallback).length / planned.length
            : null,
        },
      });
    }
  } finally {
    if (!options.sharedBudget) measured.finish();
  }
  return { bounds, variants, calls: [...measured.calls] };
}

export async function runAgenticExperiment(output: string, live = false) {
  const started = performance.now();
  const out = resolve(output);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (
    !rel.startsWith(".tmp-turbo-user/") &&
    !rel.startsWith("apps/ai_agent/evaluation/agentic/runs/")
  )
    throw new Error(
      "Use a new output directory under .tmp-turbo-user or evaluation/agentic/runs",
    );
  const inputHashes: Record<string, string> = {};
  const read = async (path: string) => {
    const data = await readFile(join(root, path), "utf8");
    inputHashes[path] = hash(data);
    return JSON.parse(data);
  };
  const manifest = z
    .object({
      split: z.literal("development"),
      artifact_hashes: z.record(z.string(), z.string()),
    })
    .parse(await read(`${capture}/manifest.json`));
  const cases = EvaluationCaseSchema.array().parse(
    await read(`${capture}/cases.json`),
  );
  const contexts = CapturedEvaluationContextSchema.array().parse(
    await read(`${capture}/contexts.json`),
  );
  for (const name of ["cases.json", "contexts.json"])
    if (inputHashes[`${capture}/${name}`] !== manifest.artifact_hashes[name])
      throw new Error("Frozen input hash mismatch");
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const benchmark = await read(
    "apps/ai_agent/evaluation/intent-dev/benchmark.json",
  );
  const queries = validateBenchmark(
    benchmark.queries,
    Object.fromEntries(
      index.map((s) => [s.citation, `${s.heading}\n${s.content}`]),
    ),
  );
  const probes = queries.map((q) => ({
    id: q.id,
    evidence: createFixtureTools(
      {
        case_id: q.id,
        source_kind: "normal_dlq",
        missing_evidence: [],
        evidence: {
          provider: (q.providers[0] ?? "unknown") as
            | "telegram"
            | "email"
            | "unknown",
          execution_status: "UNKNOWN",
          delivery_outcome: "not_applicable",
          attempts: null,
          final_error: q.query,
          observed_facts: [],
          sensitive_fields_present: [],
        },
      },
      index,
      "2026-10-12T00:00:00Z",
    ).bundle,
    query: q.query,
    relevant: q.relevantCitations,
  }));
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (live && (!key || !model || !/^gemini-[a-z0-9.-]+$/.test(model)))
    throw new Error("--live requires GEMINI_API_KEY and GEMINI_MODEL");
  let providerRequests = 0;
  const fetcher: FetchLike = async (url, init) => {
    providerRequests++;
    return globalThis.fetch(url, init);
  };
  const planner = live
    ? createPlannerGemini(key!, model!, fetcher)
    : stubPlanner;
  const diagnosis = live
    ? new GeminiDiagnosisModel({
        apiKey: key!,
        model: model!,
        api: "generate-content",
        maxOutputTokens: 4096,
        maxTotalTokens: 64_000,
        fetch: fetcher,
      })
    : stubDiagnosis;
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out); // Never overwrite a previous run.
  // Freeze method, transformed development probes and gold labels BEFORE any call.
  const frozen = {
    version: "bounded-agentic-dev-v1",
    cases,
    contexts,
    probes,
    bounds: SettingsSchema.parse({ minCallIntervalMs: live ? 5_000 : 0 }),
    selection:
      "preserve-first-two; one-novel-passage; >=2-gap-terms; strictly-greater-coverage; replace-third-only",
    corpus: index.map((s) => ({
      ...s,
      headingTerms: [...s.headingTerms],
      contentTerms: [...s.contentTerms],
    })),
    plannerSchema: PLANNER_JSON_SCHEMA,
    diagnosisPromptVersion: DIAGNOSIS_PROMPT_VERSION,
  };
  await writeFile(join(out, "freeze.json"), json(frozen), { flag: "wx" });
  const measured = budgetModels(planner, diagnosis, frozen.bounds);
  try {
    const paired = await compareCaptures({
      cases,
      contexts,
      index,
      planner,
      diagnosis,
      sharedBudget: measured,
      settings: frozen.bounds,
    });
    const probeRows: {
      name: string;
      rows: {
        id: string;
        relevant: string[];
        returned: string[];
        latencyMs: number;
        record: PlannerRecord | null;
      }[];
    }[] = [];
    for (const name of ["baseline", "agentic"]) {
      const rows = [];
      for (const p of probes) {
        const start = performance.now();
        const firstCall = measured.calls.length;
        const initial = searchRunbooks(index, {
          query: p.query,
          providers: retrievalInput(p.evidence).providers,
          limit: 3,
        });
        // Filters come from the explicitly frozen observed provider projection.
        if (name === "agentic") await measured.waitForSlot(measured.signal);
        const record =
          name === "agentic"
            ? await planRetrieval(
                p.evidence,
                initial,
                index,
                measured.planner,
                { signal: measured.signal },
              )
            : null;
        for (const call of measured.calls.slice(firstCall)) {
          call.caseId = p.id;
          call.variant = "section-probe";
        }
        rows.push({
          id: p.id,
          relevant: p.relevant,
          returned: (record?.matches ?? initial).map((m) => m.citation),
          latencyMs: performance.now() - start,
          record,
        });
      }
      probeRows.push({ name, rows });
    }
    const calls = measured.calls;
    const report = {
      version: frozen.version,
      mode: live ? "live" : "stub",
      model: live ? model : "deterministic-stubs-v1",
      productionChanged: false,
      pairedDiagnosesComplete: paired.variants.every((v) =>
        v.contexts.every((c) => c.rejection !== null || c.failure === null),
      ),
      paired,
      sectionProbes: probeRows.map((v) => ({
        ...v,
        metrics: intentMetrics(v.rows),
      })),
      regressions: {
        noMatchAbstention: probeRows[1]!.rows
          .filter(
            (r) =>
              !r.relevant.length &&
              r.returned.length &&
              !probeRows[0]!.rows.find((o) => o.id === r.id)!.returned.length,
          )
          .map((r) => r.id),
        sectionPrecision: probeRows[1]!.rows
          .filter((r) => {
            const old = probeRows[0]!.rows.find((o) => o.id === r.id)!;
            const precision = (row: typeof r) =>
              row.returned.length
                ? row.returned.filter((c) => row.relevant.includes(c)).length /
                  row.returned.length
                : 0;
            return r.relevant.length && precision(r) < precision(old);
          })
          .map((r) => r.id),
        sectionRecall: probeRows[1]!.rows
          .filter((r) => {
            const old = probeRows[0]!.rows.find((o) => o.id === r.id)!;
            return (
              r.returned.filter((c) => r.relevant.includes(c)).length <
              old.returned.filter((c) => old.relevant.includes(c)).length
            );
          })
          .map((r) => r.id),
        familyCoverage: paired.variants[1]!.report.rows.filter(
          (r) =>
            !r.retrievalHit &&
            paired.variants[0]!.report.rows.find((o) => o.caseId === r.caseId)
              ?.retrievalHit,
        ).map((r) => r.caseId),
        diagnosisAcceptance: paired.variants[1]!.report.rows.filter(
          (r) =>
            !r.accepted &&
            paired.variants[0]!.report.rows.find((o) => o.caseId === r.caseId)
              ?.accepted,
        ).map((r) => r.caseId),
      },
      calls,
      totals: {
        modelInvocations: calls.length,
        plannerCalls: calls.filter((c) => c.role === "planner").length,
        diagnosisCalls: calls.filter((c) => c.role === "diagnosis").length,
        providerRequests,
        usage: sumUsage(calls),
        knownUsage: sumUsage(calls.filter((c) => c.usage !== null)),
        costUsd: live ? null : 0,
        elapsedMs: performance.now() - started,
      },
      recommendation: live
        ? "Keep production retrieval. Interpret only completed live diagnoses as quality evidence; planner fallbacks and provider failures are operational outcomes. Development results require manual review and independent validation, including regressions, cost and latency."
        : "Keep production retrieval. Stub results cannot establish LLM benefit; live development results require manual diagnosis review and independent validation, including regressions, cost and latency.",
      limitations: [
        "Existing development cases and section labels were previously inspected. No fresh held-out inputs were opened. No independent generalization claim.",
        "Section metrics use separate question-based retrieval probes; they do not measure diagnosis or identical incident evidence. Family coverage in the paired evaluator is coarse any-family coverage, not section relevance.",
        "Stub diagnosis acceptance/grounding are mechanical regression checks. Real grounded diagnosis quality, paid token/cost behavior and live end-to-end latency remain unmeasured in stub mode. No baseline diagnoses were loaded.",
        "Provider defaults are used for both fresh diagnosis variants, with 4096 output tokens, 64000 per-call total-token preflight, at most one repair. Planner: 512 output tokens, 4000 total tokens, one call. Aggregate run budgets are reserved conservatively before invocation; unknown failed-call usage remains null.",
        "Cost is null for live calls; no rate or pricing claim. Local wall-clock timings include graph and model wrappers and are single samples, not an SLO benchmark.",
        "Lexical gap coverage cannot prove semantic relevance. No adoption based on recall alone.",
      ],
    };
    const sourceHashes: Record<string, string> = {};
    for (const path of [
      "apps/ai_agent/src/evaluation/agentic-experiment.ts",
      "apps/ai_agent/src/evaluation/retrieval-agentic.ts",
      "apps/ai_agent/src/evaluation/checks.ts",
      "apps/ai_agent/src/evaluation/experiment.ts",
      "apps/ai_agent/src/evaluation/fixture-tools.ts",
      "apps/ai_agent/src/evaluation/retrieval-intent.ts",
      "apps/ai_agent/src/graph.ts",
      "apps/ai_agent/src/prompts.ts",
      "apps/ai_agent/src/contracts.ts",
      "apps/ai_agent/src/gemini-model.ts",
      "apps/ai_agent/src/tools/search-runbooks.ts",
    ])
      sourceHashes[path] = hash(await readFile(join(root, path)));
    const rows = report.sectionProbes.map(
      (v) =>
        `| ${v.name} | ${v.metrics.recallAt3} | ${v.metrics.precisionAt3} | ${v.metrics.noMatchAbstentionRate} |`,
    );
    const pairedText = paired.variants
      .map((v) => {
        const s = v.report.splits.development!;
        return `${v.name}: coarse family coverage ${s.retrievalRecallAt3.numerator}/${s.retrievalRecallAt3.denominator}; deterministic diagnosis acceptance ${s.diagnosisAcceptance.numerator}/${s.diagnosisAcceptance.denominator}; grounding-reference checks ${s.grounding.numerator}/${s.grounding.denominator}; safety violations ${v.report.safety.violations}; calls ${s.modelInvocations}; local end-to-end mean ${s.latencyMs.mean} ms; planner searches/fallbacks ${v.plannerMetrics.searches}/${v.plannerMetrics.fallbacks} of ${v.plannerMetrics.attempts} attempts.`;
      })
      .join("\n\n");
    const text = `# Bounded agentic development experiment\n\nMode: ${report.mode}; model: ${report.model}.\n\n${report.recommendation}\n\n| Variant | Section recall | Precision among returns | No-match abstention |\n| --- | ---: | ---: | ---: |\n${rows.join("\n")}\n\n${pairedText}\n\nRegressions: ${JSON.stringify(report.regressions)}. Per-case context, output, quality issues and timing: report.json. Calls: ${calls.length}; provider requests: ${providerRequests}; tokens: ${JSON.stringify(report.totals.usage)}; cost USD: ${report.totals.costUsd ?? "unmeasured"}.\n\n${report.limitations.map((l) => `- ${l}`).join("\n")}\n`;
    const artifacts = { "report.json": json(report), "report.md": text };
    for (const [name, data] of Object.entries(artifacts))
      await writeFile(join(out, name), data, { flag: "wx" });
    await writeFile(
      join(out, "manifest.json"),
      json({
        version: frozen.version,
        createdAt: new Date().toISOString(),
        runtime: process.versions,
        codeRevision: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: root,
          encoding: "utf8",
        }).trim(),
        dirty:
          execFileSync("git", ["status", "--porcelain"], {
            cwd: root,
            encoding: "utf8",
          }).length > 0,
        inputHashes,
        sourceHashes,
        freezeHash: hash(json(frozen)),
        artifactHashes: Object.fromEntries(
          Object.entries(artifacts).map(([name, data]) => [name, hash(data)]),
        ),
        modelSettings: {
          api: "generate-content",
          diagnosisMaxOutputTokens: 4096,
          plannerMaxOutputTokens: 512,
          generationSettings: "provider_defaults",
        },
        corpusHash: hash(json(frozen.corpus)),
      }),
      { flag: "wx" },
    );
    return report;
  } finally {
    measured.finish();
    await planner.close();
    await diagnosis.close();
  }
}

export async function replayAgentic(directory: string) {
  const out = resolve(directory);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (
    !rel.startsWith("apps/ai_agent/evaluation/agentic/runs/") &&
    !rel.startsWith(".tmp-turbo-user/agentic")
  )
    throw new Error("Not an agentic artifact directory");
  const manifest = z
    .object({
      version: z.literal("bounded-agentic-dev-v1"),
      freezeHash: z.string(),
      artifactHashes: z.record(z.string(), z.string()),
    })
    .parse(JSON.parse(await readFile(join(out, "manifest.json"), "utf8")));
  const freezeText = await readFile(join(out, "freeze.json"), "utf8");
  const reportText = await readFile(join(out, "report.json"), "utf8");
  if (
    hash(freezeText) !== manifest.freezeHash ||
    hash(reportText) !== manifest.artifactHashes["report.json"]
  )
    throw new Error("Artifact hash mismatch");
  const freeze = JSON.parse(freezeText);
  const cases = EvaluationCaseSchema.array().parse(freeze.cases);
  if (cases.some((c) => c.split !== "development"))
    throw new Error("Development-only replay");
  const index: RunbookIndex = freeze.corpus.map(
    (
      s: RunbookIndex[number] & {
        headingTerms: string[];
        contentTerms: string[];
      },
    ) => ({
      ...s,
      headingTerms: new Set(s.headingTerms),
      contentTerms: new Set(s.contentTerms),
    }),
  );
  const frozenReport = JSON.parse(reportText);
  const reports = [];
  for (const v of frozenReport.paired.variants) {
    const observations = EvaluationObservationSchema.array().parse(
      v.observations,
    );
    const contexts = CapturedEvaluationContextSchema.array().parse(v.contexts);
    const report = await runEvaluation(cases, index, {
      observations,
      contexts,
      model: "paired-experiment",
      acceptanceContract: "advisory-v2",
    });
    if (json(report) !== json(v.report))
      throw new Error("Re-evaluation differs from frozen report");
    reports.push(report);
  }
  for (const variant of frozenReport.sectionProbes) {
    const rows = [];
    for (const probe of freeze.probes) {
      const evidence = ControlledFixtureEvidenceSchema.parse(probe.evidence);
      const recorded = variant.rows.find(
        (r: { id: string }) => r.id === probe.id,
      );
      if (!recorded) throw new Error("Incomplete section probe capture");
      const initial = searchRunbooks(index, {
        query: probe.query,
        providers: retrievalInput(evidence).providers,
        limit: 3,
      });
      let matches = initial;
      if (
        variant.name === "agentic" &&
        recorded.record?.searches === 1 &&
        recorded.record.fallback === null
      ) {
        const plan = PlannerSchema.parse(recorded.record.plan);
        if (
          plan.decision !== "search_once" ||
          plan.evidence_ids.some(
            (id) => !Object.values(evidence).some((e) => e.evidence_id === id),
          )
        )
          throw new Error("Invalid recorded planner");
        const query = sanitizeSearchQuery(plan.query),
          gap = sanitizeSearchQuery(plan.gap);
        matches = selectGapPassage(
          initial,
          searchRunbooks(index, {
            query,
            providers: retrievalInput(evidence).providers,
            limit: 3,
          }),
          gap,
        );
      }
      if (
        json(matches.map((m) => m.citation)) !== json(recorded.returned) ||
        json(probe.relevant) !== json(recorded.relevant)
      )
        throw new Error("Section probe context differs from freeze");
      rows.push({
        relevant: probe.relevant,
        returned: recorded.returned,
        latencyMs: recorded.latencyMs,
      });
    }
    if (json(intentMetrics(rows)) !== json(variant.metrics))
      throw new Error("Section metrics differ from frozen report");
  }
  return reports;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: {
      output: { type: "string" },
      live: { type: "boolean", default: false },
      replay: { type: "string" },
    },
    strict: true,
  });
  if (values.replay) {
    if (values.live || values.output)
      throw new Error("--replay cannot be combined with --live or --output");
    await replayAgentic(values.replay);
    console.log("Frozen paired reports reproduced without model calls.");
    process.exit(0);
  }
  if (!values.output) throw new Error("--output is required");
  const report = await runAgenticExperiment(values.output, values.live);
  console.log(report.recommendation);
}
