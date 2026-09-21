import {
  END,
  GraphRecursionError,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import { z } from "zod";

import {
  EvidenceSchema,
  PreviewResultSchema,
  type DiagnosisModel,
  type PreviewResult,
} from "./contracts.ts";

// ============================================================================
// Custom Domain Errors
// Allows API layer (http.ts) to map specific failures to HTTP status codes.
// ============================================================================
export class InvalidModelOutput extends Error {}
export class ModelTimeout extends Error {}
export class InvestigationTimeout extends Error {}
export class ToolBudgetExceeded extends Error {}
export class GraphStepLimitExceeded extends Error {}

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
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new InvestigationTimeout("Investigation timed out"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
    controller.abort();
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

