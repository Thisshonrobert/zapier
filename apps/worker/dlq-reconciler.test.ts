import assert from "node:assert/strict";
import { createDlqReconciler } from "./dlq-reconciler.ts";

type Row = Record<string, any>;

function fakeDb(seed: Row[]) {
  const state = {
    executions: new Map(seed.map((row) => [row.id, { ...row }])),
    attempts: new Map<string, Row>(),
    failures: new Map<string, Row>(),
    failCreate: false,
  };
  let failureId = 0;

  const delegates = () => ({
    zapRunExecution: {
      findFirst: async ({ where }: any) => {
        const row = [...state.executions.values()].find((item) => {
          const hasFailure = [...state.failures.values()].some(
            (failure) => failure.executionId === item.id,
          );
          if (where.status === "PENDING")
            return (
              item.status === "PENDING" &&
              (item.leaseUntil == null ||
                item.leaseUntil <= where.OR[0].leaseUntil.lte)
            );
          return item.status === "FAILED" && !hasFailure;
        });
        return row ? { ...row } : null;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [id, row] of state.executions) {
          const hasFailure = [...state.failures.values()].some(
            (failure) => failure.executionId === id,
          );
          const leaseMatches =
            !where.OR ||
            row.leaseUntil == null ||
            row.leaseUntil <= where.OR[0].leaseUntil.lte;
          const failureMatches = !where.failure || !hasFailure;
          if (
            row.id === where.id &&
            row.status === where.status &&
            row.claimToken === where.claimToken &&
            leaseMatches &&
            failureMatches
          ) {
            state.executions.set(id, { ...row, ...data });
            count++;
          }
        }
        return { count };
      },
    },
    zapRunExecutionAttempt: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [id, row] of state.attempts) {
          if (
            row.executionId === where.executionId &&
            row.status === where.status
          ) {
            state.attempts.set(id, { ...row, ...data });
            count++;
          }
        }
        return { count };
      },
    },
    zapRunRetry: {
      create: async ({ data }: any) => {
        if (state.failCreate) throw new Error("injected failure");
        if (
          [...state.failures.values()].some(
            (row) => row.executionId === data.executionId,
          )
        )
          throw Object.assign(new Error("unique"), { code: "P2002" });
        const row = {
          id: `failure-${++failureId}`,
          createdAt: new Date(),
          ...data,
        };
        state.failures.set(row.id, row);
        return { ...row };
      },
    },
  });

  const db: any = delegates();
  let transactionTail = Promise.resolve();
  db.$transaction = async (fn: any) => {
    const previous = transactionTail;
    let release!: () => void;
    transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const snapshot = structuredClone(state);
    try {
      return await fn(delegates());
    } catch (error) {
      state.executions = snapshot.executions;
      state.attempts = snapshot.attempts;
      state.failures = snapshot.failures;
      throw error;
    } finally {
      release();
    }
  };
  return { db, state };
}

const now = new Date("2026-09-23T04:00:00.000Z");
const execution = {
  id: "execution-1",
  zapRunId: "run-1",
  stage: 3,
  status: "PENDING",
  claimToken: "old-claim",
  leaseUntil: new Date("2026-09-23T03:59:00.000Z"),
  actionFingerprint: "action-fingerprint",
  requestFingerprint: "request-fingerprint",
  requiresHuman: false,
  createdAt: new Date("2026-09-23T03:00:00.000Z"),
};

{
  const { db, state } = fakeDb([execution]);
  state.attempts.set("attempt-1", {
    id: "attempt-1",
    executionId: execution.id,
    attemptNumber: 1,
    status: "STARTED",
  });
  const reconciler = createDlqReconciler(db, { now: () => now });
  assert.equal(await reconciler.reconcileNext(), "QUARANTINED");
  assert.deepEqual(
    {
      status: state.executions.get(execution.id)?.status,
      providerOutcome: state.executions.get(execution.id)?.providerOutcome,
      requiresHuman: state.executions.get(execution.id)?.requiresHuman,
      attemptStatus: state.attempts.get("attempt-1")?.status,
    },
    {
      status: "FAILED",
      providerOutcome: "unknown",
      requiresHuman: true,
      attemptStatus: "UNKNOWN",
    },
  );
  const failure = [...state.failures.values()][0];
  assert.deepEqual(
    {
      executionId: failure?.executionId,
      providerOutcome: failure?.providerOutcome,
      safeCode: failure?.safeCode,
      evidenceSource: failure?.evidenceSource,
      requiresHuman: failure?.requiresHuman,
      actionFingerprint: failure?.actionFingerprint,
      requestFingerprint: failure?.requestFingerprint,
    },
    {
      executionId: "execution-1",
      providerOutcome: "unknown",
      safeCode: "lease_expired",
      evidenceSource: "reconciled_execution",
      requiresHuman: true,
      actionFingerprint: "action-fingerprint",
      requestFingerprint: "request-fingerprint",
    },
  );
}

{
  const { db, state } = fakeDb([
    { ...execution, status: "FAILED", leaseUntil: null },
  ]);
  const reconciler = createDlqReconciler(db, { now: () => now });
  assert.equal(await reconciler.reconcileNext(), "REPAIRED");
  const failure = [...state.failures.values()][0];
  assert.equal(failure?.safeCode, "missing_failure_record");
  assert.equal(failure?.providerOutcome, "unknown");
  assert.equal(failure?.evidenceSource, "reconciled_execution");
  assert.equal(failure?.requiresHuman, true);
}

{
  const { db, state } = fakeDb([
    {
      ...execution,
      id: "active",
      leaseUntil: new Date("2026-09-23T04:01:00.000Z"),
    },
    { ...execution, id: "success", status: "SUCCESS", leaseUntil: null },
  ]);
  const reconciler = createDlqReconciler(db, { now: () => now });
  assert.equal(await reconciler.reconcileNext(), "EMPTY");
  assert.equal(state.failures.size, 0);
  assert.equal(state.executions.get("active")?.status, "PENDING");
  assert.equal(state.executions.get("success")?.status, "SUCCESS");
}

{
  const { db, state } = fakeDb([execution]);
  state.failCreate = true;
  const reconciler = createDlqReconciler(db, { now: () => now });
  await assert.rejects(reconciler.reconcileNext(), /injected failure/);
  assert.equal(state.executions.get(execution.id)?.status, "PENDING");
  assert.equal(state.failures.size, 0);
}

{
  const { db, state } = fakeDb([execution]);
  const first = createDlqReconciler(db, { now: () => now });
  const second = createDlqReconciler(db, { now: () => now });
  const results = await Promise.all([
    first.reconcileNext(),
    second.reconcileNext(),
  ]);
  assert.deepEqual(results.sort(), ["QUARANTINED", "STALE"]);
  assert.equal(state.failures.size, 1);
}

console.log("dlq-reconciler.test.ts OK");
