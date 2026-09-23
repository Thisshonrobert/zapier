import { createHash, randomUUID as nodeRandomUUID } from "node:crypto";
import { ActionExecutionError } from "./types.ts";
import type { ActionPhase, ActionProvider, ActionResult } from "./types.ts";

type Delegate = {
  create(args: any): Promise<any>;
  findUnique?(args: any): Promise<any>;
  updateMany?(args: any): Promise<{ count: number }>;
};

export type ExecutionDb = {
  zapRunExecution: Delegate;
  zapRunExecutionAttempt: Delegate;
  zapRunRetry: Delegate;
  $transaction<T>(fn: (tx: ExecutionDb) => Promise<T>): Promise<T>;
};

export type ExecutionKey = { zapRunId: string; stage: number };
export type Fingerprints = { actionFingerprint: string; requestFingerprint: string };
export type ClaimDecision =
  | ({ kind: "CLAIMED"; executionId: string; claimToken: string } & Fingerprints)
  | { kind: "SUCCESS" }
  | { kind: "FAILED"; failureId: string }
  | { kind: "ACTIVE_PENDING" }
  | { kind: "UNRESOLVED" };
export type AttemptOwner = { executionId: string; claimToken: string; attemptNumber: 1 };
export type DurableFailureEvidence = {
  provider: ActionProvider | null;
  phase: ActionPhase | null;
  providerOutcome: "rejected" | "not_attempted" | "unknown";
  safeCode: string;
  providerStatus?: number;
  retryAfterSeconds?: number;
  safeReceiptId?: string;
  requiresHuman: true;
};
export type FinalizeDecision =
  | { kind: "FINALIZED" }
  | { kind: "FAILED"; failureId: string }
  | { kind: "STALE" };

const LEASE_DURATION_MS = 2 * 60_000;
const STALE = Symbol("stale execution owner");

function canonicalJson(value: unknown, seen = new Set<object>()): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("fingerprint input must be JSON-compatible");
    return JSON.stringify(value);
  }
  if (typeof value !== "object") throw new TypeError("fingerprint input must be JSON-compatible");
  if (seen.has(value)) throw new TypeError("fingerprint input must not be cyclic");
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, seen)).join(",")}]`;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      throw new TypeError("fingerprint input must contain only JSON objects");
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key], seen)}`).join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

const fingerprint = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");

export function createFingerprints(input: {
  zapRunId: string;
  stage: number;
  actionId: string;
  actionTypeId: string;
  actionMetadata: Record<string, unknown>;
  zapRunMetadata: Record<string, unknown>;
}): Fingerprints {
  return {
    actionFingerprint: fingerprint({ actionId: input.actionId, actionTypeId: input.actionTypeId, stage: input.stage }),
    requestFingerprint: fingerprint({
      actionId: input.actionId,
      actionMetadata: input.actionMetadata,
      zapRunId: input.zapRunId,
      stage: input.stage,
      zapRunMetadata: input.zapRunMetadata,
    }),
  };
}

const unknownFailure = (): DurableFailureEvidence => ({
  provider: null,
  phase: null,
  providerOutcome: "unknown",
  safeCode: "unclassified_action_error",
  requiresHuman: true,
});

export function normalizeFailure(error: unknown): DurableFailureEvidence {
  if (!(error instanceof ActionExecutionError)) return unknownFailure();
  const evidence = error.evidence;
  if (
    !["email", "telegram"].includes(evidence.provider) ||
    !["resolve_destination", "send"].includes(evidence.phase) ||
    !["rejected", "not_attempted", "unknown"].includes(evidence.outcome) ||
    !/^[a-z0-9_]{1,64}$/.test(evidence.safeCode)
  ) return unknownFailure();

  const normalized: DurableFailureEvidence = {
    provider: evidence.provider,
    phase: evidence.phase,
    providerOutcome: evidence.outcome,
    safeCode: evidence.safeCode,
    requiresHuman: true,
  };
  if (Number.isInteger(evidence.status) && evidence.status! >= 100 && evidence.status! <= 599)
    normalized.providerStatus = evidence.status;
  if (Number.isInteger(evidence.retryAfterSeconds) && evidence.retryAfterSeconds! >= 1 && evidence.retryAfterSeconds! <= 86_400)
    normalized.retryAfterSeconds = evidence.retryAfterSeconds;
  return normalized;
}

const isUniqueError = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

const safeReceipt = (value: unknown) =>
  typeof value === "string" && value.length > 0 && value.length <= 128 ? value : undefined;

export function createExecutionStore(
  db: ExecutionDb,
  options: { now?: () => Date; randomUUID?: () => string } = {},
) {
  const now = options.now ?? (() => new Date());
  const randomUUID = options.randomUUID ?? nodeRandomUUID;

  const resolveExisting = async (key: ExecutionKey, fingerprints: Fingerprints): Promise<ClaimDecision> => {
    const existing = await db.zapRunExecution.findUnique!({
      where: { zapRunId_stage: key },
      include: { failure: true },
    });
    if (!existing) return { kind: "UNRESOLVED" };
    if (existing.status === "SUCCESS") return { kind: "SUCCESS" };
    if (existing.status === "FAILED")
      return existing.failure ? { kind: "FAILED", failureId: existing.failure.id } : { kind: "UNRESOLVED" };
    if (existing.status !== "PENDING") return { kind: "UNRESOLVED" };

    const timestamp = now();
    if (existing.leaseUntil && existing.leaseUntil > timestamp) return { kind: "ACTIVE_PENDING" };

    try {
      const failureId = await db.$transaction(async (tx) => {
        const fenced = await tx.zapRunExecution.updateMany!({
          where: {
            id: existing.id,
            status: "PENDING",
            claimToken: existing.claimToken,
            OR: [{ leaseUntil: { lte: timestamp } }, { leaseUntil: null }],
          },
          data: {
            status: "FAILED",
            leaseUntil: null,
            completedAt: timestamp,
            providerOutcome: "unknown",
            requiresHuman: true,
          },
        });
        if (fenced.count === 0) throw STALE;
        const attempts = await tx.zapRunExecutionAttempt.updateMany!({
          where: { executionId: existing.id, status: "STARTED" },
          data: { status: "UNKNOWN", safeCode: "lease_expired", completedAt: timestamp },
        });
        const failure = await tx.zapRunRetry.create({
          data: {
            zapRunId: existing.zapRunId,
            stage: existing.stage,
            attempt: attempts.count > 0 ? 1 : 0,
            executionId: existing.id,
            provider: null,
            phase: null,
            providerOutcome: "unknown",
            safeCode: "lease_expired",
            actionFingerprint: existing.actionFingerprint ?? fingerprints.actionFingerprint,
            requestFingerprint: existing.requestFingerprint ?? fingerprints.requestFingerprint,
            requiresHuman: true,
            evidenceSource: "captured",
          },
        });
        return failure.id as string;
      });
      return { kind: "FAILED", failureId };
    } catch (error) {
      if (error !== STALE && !isUniqueError(error)) throw error;
      const raced = await db.zapRunExecution.findUnique!({ where: { zapRunId_stage: key }, include: { failure: true } });
      if (raced?.status === "SUCCESS") return { kind: "SUCCESS" };
      if (raced?.status === "FAILED") return raced.failure ? { kind: "FAILED", failureId: raced.failure.id } : { kind: "UNRESOLVED" };
      return { kind: "ACTIVE_PENDING" };
    }
  };

  const claim = async (key: ExecutionKey, fingerprints: Fingerprints): Promise<ClaimDecision> => {
    const claimToken = randomUUID();
    try {
      const execution = await db.zapRunExecution.create({
        data: {
          ...key,
          status: "PENDING",
          leaseUntil: new Date(now().getTime() + LEASE_DURATION_MS),
          claimToken,
          ...fingerprints,
        },
      });
      return { kind: "CLAIMED", executionId: execution.id, claimToken, ...fingerprints };
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      return resolveExisting(key, fingerprints);
    }
  };

  const startAttempt = async (owner: AttemptOwner, provider: ActionProvider): Promise<"STARTED" | "STALE"> => {
    try {
      return await db.$transaction(async (tx) => {
        const fenced = await tx.zapRunExecution.updateMany!({
          where: { id: owner.executionId, status: "PENDING", claimToken: owner.claimToken },
          data: { claimToken: owner.claimToken },
        });
        if (fenced.count === 0) throw STALE;
        const execution = await tx.zapRunExecution.findUnique!({ where: { id: owner.executionId } });
        if (!execution) throw STALE;
        await tx.zapRunExecutionAttempt.create({
          data: {
            executionId: owner.executionId,
            attemptNumber: owner.attemptNumber,
            status: "STARTED",
            provider,
            actionFingerprint: execution.actionFingerprint,
            requestFingerprint: execution.requestFingerprint,
          },
        });
        return "STARTED" as const;
      });
    } catch (error) {
      if (error === STALE) return "STALE";
      throw error;
    }
  };

  const finalizeSuccess = async (owner: AttemptOwner, result: ActionResult): Promise<FinalizeDecision> => {
    try {
      return await db.$transaction(async (tx) => {
        const completedAt = now();
        const fenced = await tx.zapRunExecution.updateMany!({
          where: { id: owner.executionId, status: "PENDING", claimToken: owner.claimToken },
          data: { status: "SUCCESS", leaseUntil: null, completedAt, providerOutcome: "accepted", requiresHuman: false },
        });
        if (fenced.count === 0) throw STALE;
        const attempt = await tx.zapRunExecutionAttempt.updateMany!({
          where: { executionId: owner.executionId, attemptNumber: owner.attemptNumber, status: "STARTED" },
          data: { status: "ACCEPTED", phase: result.phase, safeReceiptId: safeReceipt(result.safeReceiptId), completedAt },
        });
        if (attempt.count !== 1) throw STALE;
        return { kind: "FINALIZED" } as const;
      });
    } catch (error) {
      if (error === STALE) return { kind: "STALE" };
      throw error;
    }
  };

  const persistFailure = async (
    owner: { executionId: string; claimToken: string; attemptNumber: 0 | 1 },
    evidence: DurableFailureEvidence,
    createAttempt: boolean,
  ): Promise<FinalizeDecision> => {
    try {
      const failureId = await db.$transaction(async (tx) => {
        const completedAt = now();
        const fenced = await tx.zapRunExecution.updateMany!({
          where: { id: owner.executionId, status: "PENDING", claimToken: owner.claimToken },
          data: {
            status: "FAILED",
            leaseUntil: null,
            completedAt,
            providerOutcome: evidence.providerOutcome,
            requiresHuman: true,
          },
        });
        if (fenced.count === 0) throw STALE;
        const execution = await tx.zapRunExecution.findUnique!({ where: { id: owner.executionId } });
        if (!execution) throw STALE;
        const attemptData = {
          status: evidence.providerOutcome.toUpperCase(),
          provider: evidence.provider,
          phase: evidence.phase,
          safeCode: evidence.safeCode,
          providerStatus: evidence.providerStatus,
          retryAfterSeconds: evidence.retryAfterSeconds,
          safeReceiptId: safeReceipt(evidence.safeReceiptId),
          completedAt,
        };
        if (createAttempt) {
          await tx.zapRunExecutionAttempt.create({
            data: {
              executionId: owner.executionId,
              attemptNumber: owner.attemptNumber,
              ...attemptData,
              actionFingerprint: execution.actionFingerprint,
              requestFingerprint: execution.requestFingerprint,
            },
          });
        } else {
          const attempt = await tx.zapRunExecutionAttempt.updateMany!({
            where: { executionId: owner.executionId, attemptNumber: owner.attemptNumber, status: "STARTED" },
            data: attemptData,
          });
          if (attempt.count !== 1) throw STALE;
        }
        const failure = await tx.zapRunRetry.create({
          data: {
            zapRunId: execution.zapRunId,
            stage: execution.stage,
            attempt: owner.attemptNumber,
            executionId: owner.executionId,
            provider: evidence.provider,
            phase: evidence.phase,
            providerOutcome: evidence.providerOutcome,
            safeCode: evidence.safeCode,
            providerStatus: evidence.providerStatus,
            retryAfterSeconds: evidence.retryAfterSeconds,
            safeReceiptId: safeReceipt(evidence.safeReceiptId),
            actionFingerprint: execution.actionFingerprint,
            requestFingerprint: execution.requestFingerprint,
            requiresHuman: true,
            evidenceSource: "captured",
          },
        });
        return failure.id as string;
      });
      return { kind: "FAILED", failureId };
    } catch (error) {
      if (error === STALE) return { kind: "STALE" };
      throw error;
    }
  };

  return {
    claim,
    startAttempt,
    finalizeSuccess,
    finalizeFailure: (owner: AttemptOwner, evidence: DurableFailureEvidence) => persistFailure(owner, evidence, false),
    finalizeNotAttempted: (
      claimed: Extract<ClaimDecision, { kind: "CLAIMED" }>,
      safeCode: "unsupported_action_type",
    ) => persistFailure(
      { executionId: claimed.executionId, claimToken: claimed.claimToken, attemptNumber: 0 },
      { provider: null, phase: null, providerOutcome: "not_attempted", safeCode, requiresHuman: true },
      true,
    ),
  };
}
