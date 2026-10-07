import {
  Command,
  END,
  GraphRecursionError,
  START,
  StateGraph,
  StateSchema,
  interrupt,
  type BaseCheckpointSaver,
} from "@langchain/langgraph";
import { z } from "zod";

import {
  ActionInputValidationEvidenceSchema,
  EvidenceSchema,
  ExecutionEvidenceSchema,
  FailureContextEvidenceSchema,
  ControlledFixtureEvidenceSchema,
  IntegratedDiagnosisResultSchema,
  IntegratedModelOutputSchema,
  ModelUsageSchema,
  PreviewResultSchema,
  type DiagnosisModel,
  type DiagnosisPrompt,
  type IntegratedDiagnosisModel,
  type IntegratedDiagnosisResult,
  type IntegratedModelOutput,
  type ModelGeneration,
  type PreviewResult,
} from "./contracts.ts";
import { DIAGNOSIS_PROMPT_VERSION, buildDiagnosisPrompt } from "./prompts.ts";
import {
  InvestigationTracer,
  safeIdentifier,
  safeModelUsage,
  type TraceExporter,
} from "./observability.ts";
import type {
  RunbookMatch,
  RunbookSearchInput,
} from "./tools/search-runbooks.ts";

// ============================================================================
// Custom Domain Errors
// Allows API layer (http.ts) to map specific failures to HTTP status codes.
// ============================================================================
export class InvalidModelOutput extends Error {}
export class ModelTimeout extends Error {}
export class InvestigationTimeout extends Error {}
export class ToolBudgetExceeded extends Error {}
export class GraphStepLimitExceeded extends Error {}
export class TokenBudgetExceeded extends Error {}

// ============================================================================
// Failure Context Reader Interface
// Data access layer abstraction for reading failure evidence.
// ============================================================================
export interface FailureContextReader {
  get(
    fixtureId: string,
    signal?: AbortSignal,
  ): Promise<z.infer<typeof EvidenceSchema>>;
}

// ============================================================================
// LangGraph State Schema
// Defines the shared state object passed between nodes in the graph workflow.
// ============================================================================
const PreviewState = new StateSchema({
  fixtureId: z.string(),
  evidence: EvidenceSchema.optional(),
  result: PreviewResultSchema.optional(),
  toolCalls: z.number().int().nonnegative().default(0),
});

export type PreviewOptions = {
  modelTimeoutMs?: number;
  investigationTimeoutMs?: number;
  maxToolCalls?: number;
  maxGraphSteps?: number;
};

// ============================================================================
// Timeout Helpers (using Web AbortSignal & Promise.race)
// Ensures the LLM call or overall investigation halts if it takes too long.
// ============================================================================
async function diagnoseWithTimeout(
  model: DiagnosisModel,
  evidence: z.infer<typeof EvidenceSchema>,
  timeoutMs: number,
  investigationSignal: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const signal = AbortSignal.any([investigationSignal, controller.signal]);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new ModelTimeout("Diagnosis model timed out"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([model.diagnose(evidence, signal), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function withInvestigationDeadline<T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
  externalSignal?: AbortSignal,
): Promise<T> {
  externalSignal?.throwIfAborted();
  const controller = new AbortController();
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, controller.signal])
    : controller.signal;
  let onAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(new InvestigationTimeout("Investigation cancelled"));
    if (externalSignal?.aborted) onAbort();
    else externalSignal?.addEventListener("abort", onAbort, { once: true });
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new InvestigationTimeout("Investigation timed out"));
    }, timeoutMs);
  });

  try {
    signal.throwIfAborted();
    return await Promise.race([operation(signal), deadline, cancelled]);
  } finally {
    if (timeout) clearTimeout(timeout);
    controller.abort();
    if (onAbort) externalSignal?.removeEventListener("abort", onAbort);
  }
}

// ============================================================================
// Grounding & Deterministic Safety Guardrails
// Validates LLM outputs against strict domain rules to prevent hallucinations
// or unsafe automated replays.
// ============================================================================
function validateGrounding(
  evidence: z.infer<typeof EvidenceSchema>,
  result: PreviewResult,
) {
  // Guardrail 1: Hallucination Check
  // Ensures all cited evidence references were actually observed.
  const observedRefs = new Set([evidence.evidence_id]);
  if (!result.diagnosis.evidence_refs.every((ref) => observedRefs.has(ref))) {
    throw new InvalidModelOutput(
      "Diagnosis references evidence that was not observed",
    );
  }
  if (!result.proposal.evidence_refs.every((ref) => observedRefs.has(ref))) {
    throw new InvalidModelOutput(
      "Proposal references evidence that was not observed",
    );
  }

  const deliveryOutcome = evidence.facts.delivery_outcome;
  const allAttemptsRejected = evidence.facts.all_attempts_rejected;

  // Guardrail 2: F07 (Unknown Delivery) Rule
  // If delivery outcome is unknown (e.g. network timeout), replay MUST be blocked
  // and the proposal MUST escalate for human/provider reconciliation.
  if (
    deliveryOutcome === "unknown" &&
    (result.status !== "insufficient_evidence" ||
      result.diagnosis.taxonomy_id !== "F07" ||
      result.proposal.kind !== "escalate" ||
      !result.diagnosis.missing_evidence.includes("provider_delivery_receipt"))
  ) {
    throw new InvalidModelOutput(
      "Unknown delivery must remain blocked pending reconciliation",
    );
  }

  // Guardrail 3: F01 (Rate Limit) Rule
  // Explicit provider 429 rate-limiting MUST use taxonomy F01 and status 'completed'.
  if (
    deliveryOutcome === "rejected" &&
    allAttemptsRejected === true &&
    evidence.facts.retry_after_seconds !== undefined &&
    (result.status !== "completed" || result.diagnosis.taxonomy_id !== "F01")
  ) {
    throw new InvalidModelOutput(
      "Explicit rate limiting must use the F01 diagnosis",
    );
  }

  // Guardrail 4: Replay Safety Conditions
  // Replay is ONLY supported if all attempts were explicitly rejected by the provider,
  // human approval is explicitly required, and cooldown wait time is met.
  if (
    result.proposal.kind === "wait_then_replay" &&
    (deliveryOutcome !== "rejected" ||
      allAttemptsRejected !== true ||
      result.proposal.requires_human_approval !== true ||
      result.proposal.wait_seconds === undefined ||
      result.proposal.wait_seconds < evidence.facts.retry_after_seconds ||
      result.proposal.preconditions.length < 2)
  ) {
    throw new InvalidModelOutput(
      "Replay proposal is unsupported by delivery evidence",
    );
  }
}

// ============================================================================
// Service Factory: buildPreviewService
// Assembles the LangGraph JS StateGraph workflow and returns the preview service.
// ============================================================================
export function buildPreviewService(
  tool: FailureContextReader,
  model: DiagnosisModel,
  options: PreviewOptions = {},
) {
  const modelTimeoutMs = options.modelTimeoutMs ?? 5_000;
  const investigationTimeoutMs = options.investigationTimeoutMs ?? 10_000;
  const maxToolCalls = options.maxToolCalls ?? 1;
  const maxGraphSteps = options.maxGraphSteps ?? 4;

  // Build the LangGraph State Machine
  const workflow = new StateGraph(PreviewState)
    // Node 1: Fetch failure evidence from fixture/tool
    .addNode("loadFailureContext", async (state, config) => {
      if (state.toolCalls >= maxToolCalls) {
        throw new ToolBudgetExceeded("Failure-context tool budget exhausted");
      }
      return {
        evidence: await tool.get(state.fixtureId, config.signal),
        toolCalls: state.toolCalls + 1,
      };
    })
    // Node 2: Run diagnosis model and enforce safety guardrails
    .addNode("diagnose", async (state, config) => {
      if (!state.evidence)
        throw new InvalidModelOutput("Diagnosis requires evidence");
      const rawResult = await diagnoseWithTimeout(
        model,
        state.evidence,
        modelTimeoutMs,
        config.signal ?? AbortSignal.abort(),
      );
      const parsed = PreviewResultSchema.safeParse(rawResult);
      if (!parsed.success) {
        throw new InvalidModelOutput(
          "Diagnosis model returned an invalid result",
          {
            cause: parsed.error,
          },
        );
      }
      validateGrounding(state.evidence, parsed.data);
      return { result: parsed.data };
    })
    // Connect edges: START -> loadFailureContext -> diagnose -> END
    .addEdge(START, "loadFailureContext")
    .addEdge("loadFailureContext", "diagnose")
    .addEdge("diagnose", END)
    .compile();

  return {
    // Primary invocation method
    async preview(fixtureId: string): Promise<PreviewResult> {
      try {
        const state = await withInvestigationDeadline(
          investigationTimeoutMs,
          (signal) =>
            workflow.invoke(
              { fixtureId, toolCalls: 0 },
              { recursionLimit: maxGraphSteps, signal },
            ),
        );
        const result = PreviewResultSchema.safeParse(state.result);
        if (!result.success)
          throw new InvalidModelOutput("Graph returned an invalid result");
        return result.data;
      } catch (error) {
        if (error instanceof GraphRecursionError) {
          throw new GraphStepLimitExceeded("Graph step limit exhausted", {
            cause: error,
          });
        }
        throw error;
      }
    },
  };
}

export const RunbookMatchSchema = z
  .object({
    runbookId: z.string().min(1).max(64),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    citation: z
      .string()
      .min(1)
      .max(256)
      .regex(/^RB-[A-Z0-9-]+@\d+\.\d+\.\d+#[a-z0-9-]+$/),
    heading: z.string().min(1).max(256),
    content: z.string().min(1).max(4_000),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    taxonomy: z.array(z.string().regex(/^F(?:0[1-9]|10)$/)).max(10),
    providers: z.array(z.string().min(1).max(64)).max(10),
    simulated: z.literal(true),
    authority: z.literal("untrusted_procedural_guidance"),
    canChangePolicy: z.literal(false),
    score: z.number().finite().nonnegative(),
  })
  .strict();

const EvidenceBundleSchema = z
  .object({
    failureContext: FailureContextEvidenceSchema,
    executionEvidence: ExecutionEvidenceSchema,
    inputValidation: ActionInputValidationEvidenceSchema,
  })
  .strict();
const DiagnosisEvidenceBundleSchema = z.union([
  EvidenceBundleSchema,
  ControlledFixtureEvidenceSchema,
]);
const DecisionSchema = z.object({ id: z.string().min(1).max(128),
  decision: z.enum(["approve", "reject", "mark_owner_action_required",
    "escalate_to_engineering", "resolve_without_replay", "blocked"]) }).strict();
export type InvestigationDecision = z.infer<typeof DecisionSchema>;

const DiagnosisState = new StateSchema({
  evidence: DiagnosisEvidenceBundleSchema.optional(),
  runbooks: z.array(RunbookMatchSchema).max(3).default([]),
  result: IntegratedDiagnosisResultSchema.optional(),
  decision: DecisionSchema.optional(),
  toolCalls: z.number().int().nonnegative().default(0),
});

const DIAGNOSIS_GRAPH_VERSION = "phase-6-v1" as const;

export interface IntegratedInvestigationTools {
  getFailureContext(signal: AbortSignal): Promise<unknown>;
  getExecutionEvidence(
    historyLimit: number,
    signal: AbortSignal,
  ): Promise<unknown>;
  validateActionInputs(signal: AbortSignal): Promise<unknown>;
  searchRunbooks(input: RunbookSearchInput): RunbookMatch[];
}

export type DiagnosisOptions = {
  // Only the developer-run fixture experiment opts into simulated contracts.
  allowSimulatedEvidence?: boolean;
  signal?: AbortSignal;
  modelTimeoutMs?: number;
  // Optional experiment pacing uses the investigation signal, before the call deadline.
  beforeModelInvocation?: (signal: AbortSignal) => Promise<void>;
  investigationTimeoutMs?: number;
  maxToolCalls?: number;
  maxGraphSteps?: number;
  maxModelTokens?: number;
  maxPromptCharacters?: number;
  maxRepairAttempts?: 0 | 1;
  observability?: TraceExporter;
  modelName?: string;
  checkpointer?: BaseCheckpointSaver;
  threadId?: string;
  requireDecision?: boolean;
};

function assertSameCanonicalSource(
  evidence: z.infer<typeof DiagnosisEvidenceBundleSchema>,
) {
  const expected = evidence.failureContext.source_ref;
  for (const actual of [
    evidence.executionEvidence.source_ref,
    evidence.inputValidation.source_ref,
  ]) {
    if (
      actual.case_id !== expected.case_id ||
      actual.zap_run_id !== expected.zap_run_id ||
      actual.stage !== expected.stage
    ) {
      throw new InvalidModelOutput(
        "Evidence sources do not identify the same canonical case",
      );
    }
  }
}

// Error text is untrusted search data. Remove credential/PII-shaped values before
// truncation; keep only bounded observations, never expected evaluation labels.
function sanitizedQueryText(value: string): string {
  return value
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+={0,2}/gi, " ")
    .replace(/\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/g, " ")
    .replace(
      /\b(?:[a-z_]*token|[a-z_]*key|password|secret|authorization)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      " ",
    )
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function retrievalInput(
  evidence: z.infer<typeof DiagnosisEvidenceBundleSchema>,
): RunbookSearchInput {
  const failure = evidence.failureContext.facts;
  const execution = evidence.executionEvidence.facts;
  const validation = evidence.inputValidation.facts;
  const fixture = evidence.failureContext.simulated
    ? evidence.failureContext.fixture_observation
    : undefined;
  const attempts = execution.attempts.flatMap((attempt) => [
    attempt.provider,
    attempt.phase,
    attempt.provider_outcome,
    attempt.safe_code,
    attempt.provider_status?.toString(),
  ]);
  const values = [
    failure.current_action_type,
    failure.retry.provider,
    failure.retry.phase,
    failure.retry.provider_outcome,
    failure.retry.safe_code,
    failure.retry.provider_status?.toString(),
    execution.provenance,
    execution.current_execution?.status,
    execution.current_execution?.provider_outcome,
    execution.ordering.status,
    validation.action_type,
    validation.validation_status,
    validation.supported === null
      ? "support_unknown"
      : validation.supported
        ? "supported"
        : "unsupported",
    ...validation.blocked_reasons,
    ...validation.missing_required_fields,
    ...validation.missing_template_paths,
    fixture?.execution_status,
    ...attempts,
  ].filter((value): value is string => Boolean(value));
  const providers = new Set(
    [failure.retry.provider, ...execution.attempts.map((item) => item.provider)]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase()),
  );
  return {
    query:
      [
        sanitizedQueryText(failure.retry.final_error ?? "").slice(0, 180),
        sanitizedQueryText(fixture?.observed_facts.join(" ") ?? "").slice(
          0,
          180,
        ),
        sanitizedQueryText([...new Set(values)].join(" ")).slice(0, 138),
      ]
        .filter(Boolean)
        .join(" ") || "failure evidence",
    ...(providers.size > 0 ? { providers: [...providers] } : {}),
    limit: 3,
  };
}

// Observed platform faults cannot become customer repairs by changing the model's taxonomy.
export function requiresPlatformInvestigation(evidence: z.infer<typeof DiagnosisEvidenceBundleSchema>): boolean {
  const validation = evidence.inputValidation.facts;
  const retry = evidence.failureContext.facts.retry;
  const facts = evidence.failureContext.simulated
    ? evidence.failureContext.fixture_observation.observed_facts : [];
  if (validation.supported === false || retry.provider === "worker" || facts.includes("handler_not_registered")) return true;
  const customerInputFault = validation.validation_status === "invalid" && validation.supported === true;
  return !customerInputFault && (retry.provider_status === 429 ||
    facts.includes("retry_after_30_seconds") ||
    (facts.includes("failure_before_send") && facts.includes("all_attempts_not_delivered")));
}

function issueForOutput(
  evidence: z.infer<typeof DiagnosisEvidenceBundleSchema>,
  runbooks: readonly RunbookMatch[],
  output: IntegratedModelOutput,
): string | undefined {
  if (
    evidence.failureContext.facts.retry.provider === "telegram" &&
    evidence.failureContext.facts.retry.phase === "send" &&
    evidence.failureContext.facts.retry.provider_outcome === "rejected" &&
    evidence.failureContext.facts.retry.provider_status === 429 &&
    output.diagnosis.taxonomy_id !== "F01"
  ) {
    return "explicit_rate_limit_requires_f01";
  }
  const observedEvidence = new Set([
    evidence.failureContext.evidence_id,
    evidence.executionEvidence.evidence_id,
    evidence.inputValidation.evidence_id,
  ]);
  if (
    ![
      ...output.diagnosis.evidence_refs,
      ...output.proposal.evidence_refs,
    ].every((reference) => observedEvidence.has(reference))
  ) {
    return "ungrounded_evidence_reference";
  }

  const unavailable = new Set([
    ...evidence.failureContext.unavailable,
    ...evidence.executionEvidence.unavailable,
    ...evidence.inputValidation.unavailable,
  ]);
  if (
    ![...unavailable].every((item) =>
      output.diagnosis.missing_evidence.includes(item),
    )
  ) {
    return "unacknowledged_missing_evidence";
  }

  const observedCitations = new Set(
    runbooks.map((runbook) => runbook.citation),
  );
  if (
    new Set(output.proposal.runbook_citations).size !==
      output.proposal.runbook_citations.length ||
    !output.proposal.runbook_citations.every((reference) =>
      observedCitations.has(reference),
    )
  ) {
    return "ungrounded_runbook_citation";
  }

  const allowedKindByDisposition = {
    replay_candidate: "wait_then_replay",
    owner_action_required: "request_manual_fix",
    engineering_escalation_required: "escalate",
    insufficient_evidence: "escalate",
    outcome_unknown: "escalate",
    duplicate_or_stale: "no_action",
    resolved_without_replay: "no_action",
  } as const;
  if (
    output.proposal.kind !==
    allowedKindByDisposition[output.proposal.disposition]
  ) {
    return "invalid_disposition_mapping";
  }
  const abstained =
    output.proposal.disposition === "insufficient_evidence" ||
    output.proposal.disposition === "outcome_unknown";
  if ((output.status === "abstained") !== abstained) {
    return "invalid_abstention_status";
  }

  const observedOutcomes = new Set([
    evidence.failureContext.facts.retry.provider_outcome,
    evidence.executionEvidence.facts.current_execution?.provider_outcome,
    ...evidence.executionEvidence.facts.attempts.map(
      (attempt) => attempt.provider_outcome,
    ),
  ]);
  const contradictoryOutcomes =
    observedOutcomes.has("unknown") ||
    (observedOutcomes.has("rejected") && observedOutcomes.has("accepted"));
  if (
    contradictoryOutcomes &&
    output.proposal.disposition !== "outcome_unknown"
  ) {
    return "unsafe_delivery_disposition";
  }

  const customerInputFault =
    evidence.inputValidation.facts.validation_status === "invalid" &&
    evidence.inputValidation.facts.supported === true;
  if (
    output.proposal.disposition === "owner_action_required" &&
    (requiresPlatformInvestigation(evidence) || output.diagnosis.taxonomy_id === "F05" ||
      (["F01", "F02"].includes(output.diagnosis.taxonomy_id) && !customerInputFault))
  ) {
    return "platform_ownership_requires_escalation";
  }

  if (
    output.proposal.disposition === "replay_candidate" &&
    !supportsReplayCandidate(evidence)
  ) {
    return "unsafe_replay_candidate";
  }
  return undefined;
}

function supportsReplayCandidate(
  evidence: z.infer<typeof DiagnosisEvidenceBundleSchema>,
) {
  if (evidence.failureContext.simulated) return false;
  const failure = evidence.failureContext;
  const execution = evidence.executionEvidence;
  const validation = evidence.inputValidation;
  const current = execution.facts.current_execution;
  return (
    failure.complete &&
    execution.complete &&
    validation.complete &&
    failure.facts.source_kind === "retry_row" &&
    failure.facts.current_action_type === "telegram" &&
    failure.facts.retry.provider === "telegram" &&
    failure.facts.retry.phase === "send" &&
    failure.facts.retry.provider_outcome === "rejected" &&
    failure.facts.retry.provider_status === 429 &&
    failure.facts.retry.retry_after_seconds !== null &&
    failure.facts.retry.retry_after_seconds !== undefined &&
    execution.facts.provenance === "captured" &&
    current?.status === "FAILED" &&
    current.lease_until === null &&
    current.provider_outcome === "rejected" &&
    current.action_fingerprint !== null &&
    current.request_fingerprint !== null &&
    execution.facts.attempts.length > 0 &&
    execution.facts.attempts.every(
      (attempt) =>
        attempt.provenance === "captured" &&
        attempt.provider === "telegram" &&
        attempt.phase === "send" &&
        attempt.provider_outcome === "rejected" &&
        attempt.provider_status === 429 &&
        attempt.retry_after_seconds !== null &&
        attempt.completed_at !== null,
    ) &&
    !execution.facts.history_truncated &&
    execution.facts.ordering.status === "valid" &&
    execution.facts.predecessors.every(
      (predecessor) => predecessor.status === "SUCCESS",
    ) &&
    validation.facts.action_type === "telegram" &&
    validation.facts.validation_status === "valid" &&
    validation.facts.supported
  );
}

function replayNotBefore(
  evidence: z.infer<typeof DiagnosisEvidenceBundleSchema>,
  output: IntegratedModelOutput,
) {
  if (output.proposal.disposition !== "replay_candidate") return null;
  const completedAttempts = evidence.executionEvidence.facts.attempts.map(
    (attempt) => ({
      completedAt: Date.parse(attempt.completed_at!),
      retryAfterSeconds: attempt.retry_after_seconds!,
    }),
  );
  const notBefore = Math.max(
    ...completedAttempts.map(
      (attempt) => attempt.completedAt + attempt.retryAfterSeconds * 1_000,
    ),
  );
  return new Date(notBefore).toISOString();
}

async function generateWithTimeout(
  model: IntegratedDiagnosisModel,
  prompt: DiagnosisPrompt,
  timeoutMs: number,
  investigationSignal: AbortSignal,
): Promise<ModelGeneration> {
  const controller = new AbortController();
  const signal = AbortSignal.any([investigationSignal, controller.signal]);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new ModelTimeout("Diagnosis model timed out"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([model.generate(prompt, signal), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function buildDiagnosisService(
  tools: IntegratedInvestigationTools,
  model: IntegratedDiagnosisModel,
  options: DiagnosisOptions = {},
) {
  const modelTimeoutMs = options.modelTimeoutMs ?? 15_000;
  const investigationTimeoutMs = options.investigationTimeoutMs ?? 60_000;
  const maxToolCalls = options.maxToolCalls ?? 8;
  const maxGraphSteps = options.maxGraphSteps ?? 12;
  const maxModelTokens = options.maxModelTokens ?? 8_000;
  const maxPromptCharacters = options.maxPromptCharacters ?? 48_000;
  const maxRepairAttempts = options.maxRepairAttempts ?? 1;
  if (options.requireDecision && (!options.checkpointer || !options.threadId))
    throw new Error("Durable decision requires a checkpointer and thread ID");

  const workflow = (tracer?: InvestigationTracer) =>
    new StateGraph(DiagnosisState)
      .addNode("gatherEvidence", async (state, config) => {
        if (state.toolCalls + 3 > maxToolCalls) {
          throw new ToolBudgetExceeded("Evidence tool budget exhausted");
        }
        const signal = config.signal;
        if (!signal)
          throw new InvestigationTimeout("Missing investigation signal");
        const observe = <T>(
          name:
            | "getFailureContext"
            | "getExecutionEvidence"
            | "validateActionInputs",
          operation: () => Promise<T>,
        ) => (tracer ? tracer.observe(name, "tool", operation) : operation());
        const [failureContext, executionEvidence, inputValidation] =
          await Promise.all([
            observe("getFailureContext", () => tools.getFailureContext(signal)),
            observe("getExecutionEvidence", () =>
              tools.getExecutionEvidence(10, signal),
            ),
            observe("validateActionInputs", () =>
              tools.validateActionInputs(signal),
            ),
          ]);
        const evidence = (options.allowSimulatedEvidence
          ? DiagnosisEvidenceBundleSchema : EvidenceBundleSchema).parse({
          failureContext,
          executionEvidence,
          inputValidation,
        });
        assertSameCanonicalSource(evidence);
        return { evidence, toolCalls: state.toolCalls + 3 };
      })
      .addNode("retrieveGuidance", async (state) => {
        if (!state.evidence) {
          throw new InvalidModelOutput("Runbook retrieval requires evidence");
        }
        if (state.toolCalls >= maxToolCalls) {
          throw new ToolBudgetExceeded("Runbook tool budget exhausted");
        }
        const retrieve = () =>
          z
            .array(RunbookMatchSchema)
            .max(3)
            .parse(tools.searchRunbooks(retrievalInput(state.evidence!)));
        const runbooks = tracer
          ? await tracer.observe(
              "searchRunbooks",
              "retriever",
              retrieve,
              (matches) => ({
                runbookVersions: matches.map((match) =>
                  safeIdentifier(`${match.runbookId}@${match.version}`),
                ),
              }),
            )
          : retrieve();
        return { runbooks, toolCalls: state.toolCalls + 1 };
      })
      .addNode("diagnose", async (state, config) => {
        if (!state.evidence) {
          throw new InvalidModelOutput("Diagnosis requires evidence");
        }
        const signal = config.signal;
        if (!signal)
          throw new InvestigationTimeout("Missing investigation signal");
        let usedTokens = 0;
        let repair: { issue: string } | undefined;

        for (let attempt = 0; attempt <= maxRepairAttempts; attempt++) {
          const prompt = buildDiagnosisPrompt(
            state.evidence,
            state.runbooks,
            repair,
          );
          if (prompt.instructions.length + prompt.input.length > maxPromptCharacters) {
            throw new TokenBudgetExceeded("Diagnosis prompt budget exhausted");
          }
          const generate = async () => {
            await options.beforeModelInvocation?.(signal);
            return generateWithTimeout(model, prompt, modelTimeoutMs, signal);
          };
          const generation = tracer
            ? await tracer.observe(
                "model.generate",
                "generation",
                generate,
                (value) => ({
                  model: safeIdentifier(options.modelName ?? "unknown"),
                  attempt: attempt + 1,
                  ...(ModelUsageSchema.safeParse(value.usage).success
                    ? { usage: safeModelUsage(value.usage) }
                    : {}),
                }),
              )
            : await generate();
          const usage = ModelUsageSchema.safeParse(generation.usage);
          if (!usage.success) {
            throw new InvalidModelOutput(
              "Diagnosis model returned invalid usage",
            );
          }
          usedTokens += usage.data.total_tokens;
          if (usedTokens > maxModelTokens) {
            throw new TokenBudgetExceeded(
              "Diagnosis model token budget exhausted",
            );
          }

          const parsed = IntegratedModelOutputSchema.safeParse(
            generation.output,
          );
          const issue = parsed.success
            ? issueForOutput(state.evidence, state.runbooks, parsed.data)
            : "schema_validation_failed";
          if (!issue && parsed.success) {
            const result = IntegratedDiagnosisResultSchema.parse({
              contract_version: 1,
              graph_version: DIAGNOSIS_GRAPH_VERSION,
              prompt_version: DIAGNOSIS_PROMPT_VERSION,
              ...parsed.data,
              proposal: {
                ...parsed.data.proposal,
                not_before: replayNotBefore(state.evidence, parsed.data),
              },
            });
            return { result };
          }
          repair = { issue: issue! };
        }
        throw new InvalidModelOutput(
          "Diagnosis model returned invalid output after one repair attempt",
        );
      })
      .addNode("awaitDecision", () => options.requireDecision
        ? { decision: interrupt({ kind: "authoritative_decision" }, { responseSchema: DecisionSchema }) }
        : {})
      .addEdge(START, "gatherEvidence")
      .addEdge("gatherEvidence", "retrieveGuidance")
      .addEdge("retrieveGuidance", "diagnose")
      .addEdge("diagnose", "awaitDecision")
      .addEdge("awaitDecision", END)
      .compile(options.checkpointer ? { checkpointer: options.checkpointer } : {});

  const diagnoseWithEvidence = async () => {
      const tracer = options.observability
        ? new InvestigationTracer(
            options.observability,
            DIAGNOSIS_GRAPH_VERSION,
            DIAGNOSIS_PROMPT_VERSION,
          )
        : undefined;
      let traceError: unknown;
      try {
        const state = await withInvestigationDeadline(
          investigationTimeoutMs,
          (signal) =>
            workflow(tracer).invoke(
              { toolCalls: 0, runbooks: [] },
              { recursionLimit: maxGraphSteps, signal,
                ...(options.threadId ? { configurable: { thread_id: options.threadId } } : {}) },
            ),
          options.signal,
        );
        const result = IntegratedDiagnosisResultSchema.safeParse(state.result);
        if (!result.success) {
          throw new InvalidModelOutput("Graph returned an invalid diagnosis");
        }
        if (!state.evidence) throw new InvalidModelOutput("Graph returned no evidence");
        return { result: result.data, evidence: state.evidence, traceId: tracer?.trace.id ?? null };
      } catch (error) {
        traceError = error;
        if (error instanceof GraphRecursionError) {
          throw new GraphStepLimitExceeded("Graph step limit exhausted", {
            cause: error,
          });
        }
        throw error;
      } finally {
        tracer?.finish(traceError);
      }
  };
  return {
    diagnoseWithEvidence,
    async resumeDecision(value: z.infer<typeof DecisionSchema>) {
      if (!options.requireDecision || !options.threadId) throw new Error("Decision is not enabled");
      const decision = DecisionSchema.parse(value);
      const graph = workflow();
      const config = { configurable: { thread_id: options.threadId }, recursionLimit: maxGraphSteps };
      const before = await graph.getState(config);
      if (before.values.decision) {
        if (before.values.decision.id !== decision.id || before.values.decision.decision !== decision.decision)
          throw new Error("Conflicting graph decision");
        return before.values.decision;
      }
      if (!before.values.result || !before.next.includes("awaitDecision"))
        throw new Error("Graph is not awaiting a decision");
      const after = await graph.invoke(new Command({ resume: decision }), config);
      if (!after.decision) throw new Error("Graph decision did not persist");
      return after.decision;
    },
    async diagnose(): Promise<IntegratedDiagnosisResult> {
      return (await diagnoseWithEvidence()).result;
    },
  };
}

/**Worker
   ↓
ZapRunExecution
   ↓
ZapRunExecutionAttempt
   ↓
ZapRunRetry
   ↓
DLQ Publisher
   ↓
Kafka DLQ
   ↓
AI Investigation
   ↓
Load evidence
   ↓
LLM diagnosis
   ↓
Structured output validation
   ↓
Grounding / deterministic safety checks
   ↓
Safe investigation result */

/**PreviewRequestSchema
        ↓
   fixture_id
        ↓
FailureContextTool
        ↓
EvidenceSchema
        ↓
      LLM
        ↓
Diagnosis + RemediationProposal
        ↓
PreviewResultSchema
        ↓
validateGrounding()
        ↓
final safe result */
