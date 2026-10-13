// No credentials or live CLI. Callers must separately obtain paid-run approval.
import {
  ModelUsageSchema,
  IntegratedDiagnosisResultSchema,
  type IntegratedDiagnosisModel,
} from "../contracts.ts";
import {
  buildDiagnosisService,
  retrievalInput,
  type IntegratedInvestigationTools,
} from "../graph.ts";
import { searchRunbooks, type RunbookIndex } from "../tools/search-runbooks.ts";
import {
  CapturedEvaluationContextSchema,
  EvaluationCaseSchema,
  type CapturedEvaluationContext,
  type EvaluationCase,
} from "./checks.ts";
import { oracleContext } from "./retrieval-investigation.ts";
import { redactText } from "./retrieval-agentic.ts";

export async function compareOracleDiagnoses(options: {
  cases: readonly EvaluationCase[];
  contexts: readonly CapturedEvaluationContext[];
  index: RunbookIndex;
  oracleCitations: Readonly<Record<string, readonly string[]>>;
  model: IntegratedDiagnosisModel;
  repetitions?: number;
  maxCalls?: number;
  maxTotalTokens?: number;
}) {
  const repetitions = options.repetitions ?? 3;
  const maxCalls = options.maxCalls ?? 60;
  const maxTotalTokens = options.maxTotalTokens ?? 2_000_000;
  if (
    !Number.isInteger(repetitions) ||
    repetitions < 1 ||
    repetitions > 3 ||
    !Number.isInteger(maxCalls) ||
    maxCalls < 1 ||
    maxCalls > 96 ||
    !Number.isInteger(maxTotalTokens) ||
    maxTotalTokens < 1 ||
    maxTotalTokens > 2_000_000
  )
    throw new Error("Invalid oracle bounds");
  const cases = EvaluationCaseSchema.array()
    .min(1)
    .max(18)
    .parse(options.cases);
  const contexts = CapturedEvaluationContextSchema.array().parse(
    options.contexts,
  );
  if (
    cases.some((c) => c.split !== "development") ||
    new Set(cases.map((c) => c.case_id)).size !== cases.length ||
    new Set(contexts.map((c) => c.case_id)).size !== contexts.length ||
    contexts.length !== cases.length
  )
    throw new Error("Development inputs required");
  // Validate every pair before the first model invocation.
  const pairs = cases.map((item) => {
    const context = contexts.find((c) => c.case_id === item.case_id);
    if (!context || context.rejection || context.failure || !context.evidence)
      throw new Error(
        "Oracle comparison requires complete authorized evidence captures",
      );
    const input = retrievalInput(context.evidence);
    const baseline = searchRunbooks(options.index, input);
    if (
      JSON.stringify(baseline) !== JSON.stringify(context.retrieval?.matches) ||
      JSON.stringify(input) !== JSON.stringify(context.retrieval?.input)
    )
      throw new Error("Baseline parity failed");
    const citations = options.oracleCitations[item.case_id];
    if (!citations?.length)
      throw new Error("Manually reviewed oracle required");
    return {
      context,
      baseline,
      oracle: oracleContext(options.index, input, citations),
    };
  });
  let calls = 0,
    usedTokens = 0;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 600_000);
  const usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  }[] = [];
  const bounded: IntegratedDiagnosisModel = {
    async close() {}, // The caller owns the supplied model lifecycle.
    async generate(prompt, signal) {
      // Reserve the entire approved per-call preflight allowance, including the
      // provider schema. Failed calls retain this reservation; known usage refunds
      // the difference. Live callers must configure the adapter with these caps.
      const reservation = 64_000;
      if (calls >= maxCalls) throw new Error("oracle_invocation_budget");
      if (usedTokens + reservation > maxTotalTokens)
        throw new Error("oracle_token_budget");
      calls++;
      usedTokens += reservation;
      const generated = await options.model.generate(prompt, signal);
      const actual = ModelUsageSchema.parse(generated.usage);
      if (
        actual.total_tokens > reservation ||
        actual.total_tokens > 64_000 ||
        actual.output_tokens > 4096
      )
        throw new Error("Oracle model exceeded approved per-call bounds");
      usedTokens += actual.total_tokens - reservation;
      usage.push(actual);
      return generated;
    },
  };
  const rows = [];
  try {
    for (let repeat = 0; repeat < repetitions; repeat++)
      for (const pair of pairs) {
        // Alternate paired order to reduce systematic ordering effects.
        for (const variant of repeat % 2
          ? (["oracle", "baseline"] as const)
          : (["baseline", "oracle"] as const)) {
          const evidence = pair.context.evidence!;
          const matches = pair[variant];
          const read = async (value: unknown, signal: AbortSignal) => {
            signal.throwIfAborted();
            return structuredClone(value);
          };
          const tools: IntegratedInvestigationTools = {
            getFailureContext: (signal) =>
              read(evidence.failureContext, signal),
            getExecutionEvidence: (_limit, signal) =>
              read(evidence.executionEvidence, signal),
            validateActionInputs: (signal) =>
              read(evidence.inputValidation, signal),
            searchRunbooks: async () => matches,
          };
          const start = performance.now(),
            firstCall = calls,
            firstUsage = usage.length;
          let result: unknown = null,
            failure: string | null = null;
          try {
            result = await buildDiagnosisService(tools, bounded, {
              allowSimulatedEvidence: true,
              signal: controller.signal,
              modelTimeoutMs: 15_000,
              investigationTimeoutMs: 600_000,
              maxModelTokens: 64_000,
              maxPromptCharacters: 48_000,
              maxRepairAttempts: 1,
            }).diagnose();
          } catch (error) {
            failure = controller.signal.aborted
              ? "run_timeout"
              : error instanceof Error &&
                  ["oracle_invocation_budget", "oracle_token_budget"].includes(
                    error.message,
                  )
                ? "budget_exhausted"
                : "diagnosis_failed";
          }
          const parsed = IntegratedDiagnosisResultSchema.safeParse(result);
          rows.push({
            id: pair.context.case_id,
            repeat,
            variant,
            result: parsed.success
              ? JSON.parse(
                  JSON.stringify(parsed.data, (_key, value) =>
                    typeof value === "string" ? redactText(value) : value,
                  ),
                )
              : null,
            failure,
            schemaValid: parsed.success,
            citationMembership: parsed.success
              ? parsed.data.proposal.runbook_citations.every((c) =>
                  matches.some((m) => m.citation === c),
                )
              : null,
            semanticQuality: null,
            calls: calls - firstCall,
            knownUsage: usage.slice(firstUsage),
            unknownUsageCalls: calls - firstCall - (usage.length - firstUsage),
            costUsd: null,
            latencyMs: performance.now() - start,
          });
        }
      }
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  return {
    rows,
    calls,
    usage,
    actualKnownTokens: usage.reduce((n, u) => n + u.total_tokens, 0),
    chargedOrReservedTokens: usedTokens,
    costUsd: null,
    semanticQuality:
      "Requires separate blinded review of claims, uncertainty and procedure usefulness",
  };
}
