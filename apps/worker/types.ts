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

/**
 * Common interface that every integration handler (Email, Telegram, Slack, etc.) must satisfy.
 * Decouples individual action execution from the worker's queue consumption loop.
 */
export interface ActionHandler {
  type: string;
  execute: (metadata: Record<string, unknown>, ctx: ActionContext) => Promise<void>;
}
