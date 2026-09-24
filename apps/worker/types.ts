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
export type ActionPhase = "resolve_destination" | "send"; // at channel level, we can have multiple phases of execution. For example, resolving the destination and sending the message are two distinct phases.  
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
/**
 * Error thrown when an action fails to execute.
 * Error
├── human-readable message
└── structured evidence
 */
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
