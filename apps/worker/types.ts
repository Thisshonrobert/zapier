/**
 * Execution context provided to each action handler during execution.
 * Contains execution IDs, stage progression, metadata payload, and the idempotency key.
 */
export interface ActionContext {
  zapRunId: string;
  stage: number;
  idempotencyKey: string;
  zapRunMetadata: Record<string, unknown>;
}

export type ActionProvider = "email" | "telegram";
export type ActionPhase = "resolve_destination" | "send";
export type ProviderOutcome =
  | "accepted"
  | "rejected"
  | "not_attempted"
  | "unknown";

export type ActionResult = {
  provider: ActionProvider;
  phase: "send";
  outcome: "accepted";
  safeReceiptId?: string;
};

export type ActionFailureEvidence = {
  provider: ActionProvider;
  phase: ActionPhase;
  outcome: Exclude<ProviderOutcome, "accepted">;
  safeCode: string;
  status?: number;
  retryAfterSeconds?: number;
};

export class ActionExecutionError extends Error {
  constructor(
    message: string,
    readonly evidence: ActionFailureEvidence,
  ) {
    super(message);
    this.name = "ActionExecutionError";
  }
}

export interface ActionHandler {
  type: string;
  execute: (
    metadata: Record<string, unknown>,
    ctx: ActionContext,
  ) => Promise<ActionResult>;
}
