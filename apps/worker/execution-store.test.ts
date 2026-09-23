import assert from "node:assert/strict";
import { ActionExecutionError } from "./types.ts";
import {
  createExecutionStore,
  createFingerprints,
  normalizeFailure,
  type AttemptOwner,
} from "./execution-store.ts";

type Row = Record<string, any>;

const matches = (row: Row, where: Row): boolean =>
  Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return expected.some((part: Row) => matches(row, part));
    if (expected && typeof expected === "object" && "lte" in expected)
      return row[key] != null && row[key] <= expected.lte;
    return row[key] === expected;
  });

function fakeDb() {
  const state = {
    executions: new Map<string, Row>(),
    attempts: new Map<string, Row>(),
    failures: new Map<string, Row>(),
    failNextTransaction: false,
  };
  let id = 0;
  const delegates = () => ({
    zapRunExecution: {
      create: async ({ data }: any) => {
        if ([...state.executions.values()].some((row) => row.zapRunId === data.zapRunId && row.stage === data.stage))
          throw Object.assign(new Error("unique"), { code: "P2002" });
        const row = { id: `execution-${++id}`, createdAt: new Date(), completedAt: null, ...data };
        state.executions.set(row.id, row);
        return { ...row };
      },
      findUnique: async ({ where }: any) => {
        const row = where.id
          ? state.executions.get(where.id)
          : [...state.executions.values()].find((item) => item.zapRunId === where.zapRunId_stage.zapRunId && item.stage === where.zapRunId_stage.stage);
        if (!row) return null;
        const failure = [...state.failures.values()].find((item) => item.executionId === row.id) ?? null;
        return { ...row, failure: failure && { ...failure } };
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [key, row] of state.executions) if (matches(row, where)) {
          state.executions.set(key, { ...row, ...data });
          count++;
        }
        return { count };
      },
    },
    zapRunExecutionAttempt: {
      create: async ({ data }: any) => {
        const key = `${data.executionId}:${data.attemptNumber}`;
        if (state.attempts.has(key)) throw Object.assign(new Error("unique"), { code: "P2002" });
        const row = { id: `attempt-${++id}`, startedAt: new Date(), completedAt: null, ...data };
        state.attempts.set(key, row);
        return { ...row };
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [key, row] of state.attempts) if (matches(row, where)) {
          state.attempts.set(key, { ...row, ...data });
          count++;
        }
        return { count };
      },
    },
    zapRunRetry: {
      create: async ({ data }: any) => {
        if ([...state.failures.values()].some((row) => row.executionId === data.executionId))
          throw Object.assign(new Error("unique"), { code: "P2002" });
        const row = { id: `failure-${++id}`, createdAt: new Date(), ...data };
        state.failures.set(row.id, row);
        return { ...row };
      },
    },
  });
  const db: any = delegates();
  db.$transaction = async (fn: any) => {
    const snapshot = structuredClone(state);
    try {
      const result = await fn(delegates());
      if (state.failNextTransaction) {
        state.failNextTransaction = false;
        throw new Error("injected transaction failure");
      }
      return result;
    } catch (error) {
      state.executions = snapshot.executions;
      state.attempts = snapshot.attempts;
      state.failures = snapshot.failures;
      throw error;
    }
  };
  return { db, state };
}

const fingerprints = createFingerprints({
  zapRunId: "run-1", stage: 0, actionId: "action-1", actionTypeId: "email",
  actionMetadata: { z: 1, secret: "never-store-raw" }, zapRunMetadata: { a: [2, 1] },
});

assert.equal(fingerprints.actionFingerprint.length, 64);
assert.deepEqual(
  fingerprints,
  createFingerprints({
    zapRunId: "run-1", stage: 0, actionId: "action-1", actionTypeId: "email",
    actionMetadata: { secret: "never-store-raw", z: 1 }, zapRunMetadata: { a: [2, 1] },
  }),
);
assert.throws(() => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  createFingerprints({ zapRunId: "r", stage: 0, actionId: "a", actionTypeId: "email", actionMetadata: cyclic, zapRunMetadata: {} });
});
assert.throws(() => createFingerprints({
  zapRunId: "r", stage: 0, actionId: "a", actionTypeId: "email",
  actionMetadata: { when: new Date() }, zapRunMetadata: {},
}));

const now = new Date("2026-09-22T00:00:00.000Z");
const { db, state } = fakeDb();
let token = 0;
const store = createExecutionStore(db, { now: () => now, randomUUID: () => `token-${++token}` });
const first = await store.claim({ zapRunId: "run-1", stage: 0 }, fingerprints);
assert.equal(first.kind, "CLAIMED");
assert.equal(first.kind === "CLAIMED" && first.claimToken, "token-1");
const active = await store.claim({ zapRunId: "run-1", stage: 0 }, fingerprints);
assert.deepEqual(active, { kind: "ACTIVE_PENDING" });

assert.equal(first.kind, "CLAIMED");
const owner: AttemptOwner = { executionId: first.executionId, claimToken: first.claimToken, attemptNumber: 1 };
assert.equal(await store.startAttempt(owner, "email"), "STARTED");
assert.equal(await store.startAttempt({ ...owner, claimToken: "stale" }, "email"), "STALE");
assert.deepEqual(await store.finalizeSuccess(owner, { provider: "email", phase: "send", outcome: "accepted", safeReceiptId: "receipt-1" }), { kind: "FINALIZED" });
assert.equal(state.executions.get(owner.executionId)?.status, "SUCCESS");
assert.equal(state.attempts.get(`${owner.executionId}:1`)?.status, "ACCEPTED");
assert.deepEqual(await store.claim({ zapRunId: "run-1", stage: 0 }, fingerprints), { kind: "SUCCESS" });

const failedClaim = await store.claim({ zapRunId: "run-2", stage: 0 }, fingerprints);
assert.equal(failedClaim.kind, "CLAIMED");
assert.equal(failedClaim.kind, "CLAIMED");
const failedOwner: AttemptOwner = { executionId: failedClaim.executionId, claimToken: failedClaim.claimToken, attemptNumber: 1 };
await store.startAttempt(failedOwner, "telegram");
const normalized = normalizeFailure(new ActionExecutionError("contains bot token and recipient", {
  provider: "telegram", phase: "send", outcome: "rejected", safeCode: "provider_rejected", status: 429, retryAfterSeconds: 30,
}));
const failed = await store.finalizeFailure(failedOwner, normalized);
assert.equal(failed.kind, "FAILED");
assert.equal(state.failures.size, 1);
assert.equal(state.executions.get(failedOwner.executionId)?.status, "FAILED");
assert.deepEqual(await store.claim({ zapRunId: "run-2", stage: 0 }, fingerprints), failed);

const rollbackClaim = await store.claim({ zapRunId: "run-3", stage: 0 }, fingerprints);
assert.equal(rollbackClaim.kind, "CLAIMED");
const rollbackOwner: AttemptOwner = { executionId: rollbackClaim.executionId, claimToken: rollbackClaim.claimToken, attemptNumber: 1 };
await store.startAttempt(rollbackOwner, "email");
state.failNextTransaction = true;
await assert.rejects(store.finalizeFailure(rollbackOwner, normalizeFailure(new Error("raw sdk response secret stack"))));
assert.equal(state.executions.get(rollbackOwner.executionId)?.status, "PENDING");
assert.equal([...state.failures.values()].some((row) => row.executionId === rollbackOwner.executionId), false);

const expiredExecution = state.executions.get(rollbackOwner.executionId)!;
expiredExecution.leaseUntil = new Date(now.getTime() - 1);
const quarantined = await store.claim({ zapRunId: "run-3", stage: 0 }, fingerprints);
assert.equal(quarantined.kind, "FAILED");
assert.equal(state.executions.get(rollbackOwner.executionId)?.providerOutcome, "unknown");
assert.equal(state.attempts.get(`${rollbackOwner.executionId}:1`)?.status, "UNKNOWN");
assert.deepEqual(await store.claim({ zapRunId: "run-3", stage: 0 }, fingerprints), quarantined);

const quarantineRollback = await store.claim({ zapRunId: "run-quarantine-rollback", stage: 0 }, fingerprints);
assert.equal(quarantineRollback.kind, "CLAIMED");
assert.equal(quarantineRollback.kind, "CLAIMED");
const quarantineOwner: AttemptOwner = {
  executionId: quarantineRollback.executionId,
  claimToken: quarantineRollback.claimToken,
  attemptNumber: 1,
};
await store.startAttempt(quarantineOwner, "email");
state.executions.get(quarantineOwner.executionId)!.leaseUntil = null;
state.failNextTransaction = true;
await assert.rejects(store.claim({ zapRunId: "run-quarantine-rollback", stage: 0 }, fingerprints));
assert.equal(state.executions.get(quarantineOwner.executionId)?.status, "PENDING");
assert.equal(state.attempts.get(`${quarantineOwner.executionId}:1`)?.status, "STARTED");
assert.equal([...state.failures.values()].some((row) => row.executionId === quarantineOwner.executionId), false);

const unsupported = await store.claim({ zapRunId: "run-4", stage: 0 }, fingerprints);
assert.equal(unsupported.kind, "CLAIMED");
assert.equal(unsupported.kind, "CLAIMED");
const unsupportedResult = await store.finalizeNotAttempted(unsupported, "unsupported_action_type");
assert.equal(unsupportedResult.kind, "FAILED");
assert.equal(state.attempts.get(`${unsupported.executionId}:0`)?.status, "NOT_ATTEMPTED");

const serialized = JSON.stringify({ attempts: [...state.attempts.values()], failures: [...state.failures.values()] });
for (const forbidden of ["never-store-raw", "bot token", "recipient", "raw sdk response", "stack"]) assert.equal(serialized.includes(forbidden), false);

const invalid = normalizeFailure(new ActionExecutionError("secret", {
  provider: "email", phase: "send", outcome: "rejected", safeCode: "NOT SAFE!", status: 999, retryAfterSeconds: 999999,
}));
assert.equal(invalid.safeCode, "unclassified_action_error");
assert.equal("providerStatus" in invalid, false);

console.log("execution-store.test.ts OK");
