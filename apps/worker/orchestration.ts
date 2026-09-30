import type { getActionHandler } from "./actions/index.ts";
import {
  createExecutionStore,
  createFingerprints,
  normalizeFailure,
  type AttemptOwner,
} from "./execution-store.ts";

export type MessageResolution = { ack: boolean; advance: boolean; nextStage?: number | null };
export type ZapEvent = { zapRunId: string; stage: number; replayRequestId?: string };

export function parseZapEvent(value: Buffer | null): ZapEvent {
  if (!value || value.length === 0) throw new Error("empty Kafka message");
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.toString());
  } catch {
    throw new Error("malformed Kafka message");
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).zapRunId !== "string" ||
    (parsed as Record<string, unknown>).zapRunId === "" ||
    !Number.isInteger((parsed as Record<string, unknown>).stage) ||
    Number((parsed as Record<string, unknown>).stage) < 0 ||
    ("replayRequestId" in parsed && (typeof parsed.replayRequestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.replayRequestId)))
  ) throw new Error("invalid Kafka event");
  return parsed as ZapEvent;
}

export function requireLoadedAction<T>(value: T | null): T {
  if (value === null) throw new Error("action not found for Kafka event");
  return value;
}

const unresolved: MessageResolution = { ack: false, advance: false };

export async function executeStage(input: {
  event: { zapRunId: string; stage: number };
  action: { id: string; typeId: string; metadata: Record<string, unknown> };
  zapRunMetadata: Record<string, unknown>;
  store: ReturnType<typeof createExecutionStore>;
  getHandler: typeof getActionHandler;
}): Promise<MessageResolution> {
  const { event, action, zapRunMetadata, store } = input;
  const fingerprints = createFingerprints({
    zapRunId: event.zapRunId,
    stage: event.stage,
    actionId: action.id,
    actionTypeId: action.typeId,
    actionMetadata: action.metadata,
    zapRunMetadata,
  });
  const claim = await store.claim(event, fingerprints);

  if (claim.kind === "SUCCESS") return { ack: true, advance: true };
  if (claim.kind === "FAILED") return { ack: true, advance: false };
  if (claim.kind !== "CLAIMED") return unresolved;

  const handler = input.getHandler(action.typeId);
  if (!handler) {
    const finalized = await store.finalizeNotAttempted(claim, "unsupported_action_type");
    return finalized.kind === "FAILED" ? { ack: true, advance: false } : unresolved;
  }

  const owner: AttemptOwner = {
    executionId: claim.executionId,
    claimToken: claim.claimToken,
    attemptNumber: 1,
  };
  if (await store.startAttempt(owner, handler.type === "telegram" ? "telegram" : "email") === "STALE")
    return unresolved;

  let result;
  try {
    result = await handler.execute(action.metadata, {
      zapRunId: event.zapRunId,
      stage: event.stage,
      idempotencyKey: `zaprun_${event.zapRunId}_stage_${event.stage}`,
      zapRunMetadata,
    });
  } catch (error) {
    const finalized = await store.finalizeFailure(owner, normalizeFailure(error));
    return finalized.kind === "FAILED" ? { ack: true, advance: false } : unresolved;
  }
  const finalized = await store.finalizeSuccess(owner, result);
  return finalized.kind === "FINALIZED" ? { ack: true, advance: true } : unresolved;
}
