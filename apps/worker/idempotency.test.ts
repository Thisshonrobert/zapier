import assert from "node:assert";
import { getActionHandler } from "./actions";
import type { ActionContext, ActionHandler } from "./types";
import { withRetry } from "./retry";
import { deadLetter } from "./deadletter";

type ExecutionRecord = {
  status: "PENDING" | "SUCCESS" | "FAILED";
  leaseUntil?: Date | null;
  completedAt?: Date | null;
};

const LEASE_DURATION_MS = 60_000;

/**
 * Pure test harness simulating the worker's atomic lease claim, crash recovery,
 * and idempotency logic without needing a live Postgres instance.
 */
async function processActionWithLeaseClaim(params: {
  zapRunId: string;
  stage: number;
  handler: ActionHandler;
  metadata: Record<string, unknown>;
  zapRunMetadata: Record<string, unknown>;
  executionsStore: Map<string, ExecutionRecord>;
  retrySink: any[];
  dlqSink: any[];
  currentTime?: Date;
}) {
  const {
    zapRunId,
    stage,
    handler,
    metadata,
    zapRunMetadata,
    executionsStore,
    retrySink,
    dlqSink,
    currentTime = new Date(),
  } = params;

  const key = `${zapRunId}_${stage}`;
  const leaseUntil = new Date(currentTime.getTime() + LEASE_DURATION_MS);

  let executionClaimed = false;
  let alreadySucceeded = false;

  // 1. Atomic Create or Lease Reclaim
  if (!executionsStore.has(key)) {
    executionsStore.set(key, {
      status: "PENDING",
      leaseUntil,
    });
    executionClaimed = true;
  } else {
    const existing = executionsStore.get(key)!;

    if (existing.status === "SUCCESS") {
      alreadySucceeded = true;
    } else if (existing.status === "FAILED") {
      // Terminal failure
    } else if (existing.status === "PENDING") {
      if (existing.leaseUntil && existing.leaseUntil > currentTime) {
        // Active lease held by another worker
      } else {
        // Expired lease from crashed worker: reclaim
        executionsStore.set(key, {
          ...existing,
          leaseUntil,
        });
        executionClaimed = true;
      }
    }
  }

  let succeeded = alreadySucceeded;

  if (executionClaimed) {
    const idempotencyKey = `zaprun_${zapRunId}_stage_${stage}`;
    const ctx: ActionContext = {
      zapRunId,
      stage,
      idempotencyKey,
      zapRunMetadata,
    };

    try {
      await withRetry(() => handler.execute(metadata, ctx), 3, async () => {});

      executionsStore.set(key, {
        status: "SUCCESS",
        leaseUntil: null,
        completedAt: new Date(),
      });
      succeeded = true;
    } catch (error) {
      succeeded = false;
      executionsStore.set(key, {
        status: "FAILED",
        leaseUntil: null,
        completedAt: new Date(),
      });

      await deadLetter(
        {
          send: async (p) => {
            dlqSink.push(p);
          },
          record: async (r) => {
            retrySink.push(r);
          },
        },
        zapRunId,
        stage,
        3,
        error
      );
    }
  }

  return { skipped: !executionClaimed, succeeded };
}

/**
 * Test suite for Action Registry, Lease-Based Atomic Claims, Crash Recovery, and DLQ.
 */
async function main() {
  // Test 1: Action Registry verification
  assert(getActionHandler("email"), "email handler should be registered");
  assert(getActionHandler("telegram"), "telegram handler should be registered");
  assert.equal(
    getActionHandler("unknown_action"),
    undefined,
    "unregistered handler returns undefined"
  );

  // Test 2 (Scenario A): Normal first execution acquires lease, executes, and marks SUCCESS
  const executions = new Map<string, ExecutionRecord>();
  const dlqMessages: any[] = [];
  const retryRows: any[] = [];

  let handlerCalls = 0;
  let receivedIdempotencyKey = "";

  const mockHandler: ActionHandler = {
    type: "test",
    execute: async (meta, ctx) => {
      handlerCalls++;
      receivedIdempotencyKey = ctx.idempotencyKey;
    },
  };

  const run1 = await processActionWithLeaseClaim({
    zapRunId: "run-1",
    stage: 0,
    handler: mockHandler,
    metadata: {},
    zapRunMetadata: {},
    executionsStore: executions,
    retrySink: retryRows,
    dlqSink: dlqMessages,
  });

  assert.equal(run1.skipped, false, "first run should execute");
  assert.equal(run1.succeeded, true, "first run should succeed");
  assert.equal(handlerCalls, 1, "handler called once");
  assert.equal(receivedIdempotencyKey, "zaprun_run-1_stage_0", "idempotency key matches pattern");
  assert.equal(executions.get("run-1_0")?.status, "SUCCESS", "status should be SUCCESS");
  assert.equal(executions.get("run-1_0")?.leaseUntil, null, "lease should be cleared on success");

  // Test 3 (Scenario B & D): Kafka redelivery after SUCCESS -> skips side effect completely
  const redeliveredRun = await processActionWithLeaseClaim({
    zapRunId: "run-1",
    stage: 0,
    handler: mockHandler,
    metadata: {},
    zapRunMetadata: {},
    executionsStore: executions,
    retrySink: retryRows,
    dlqSink: dlqMessages,
  });

  assert.equal(redeliveredRun.skipped, true, "redelivery after SUCCESS must be skipped");
  assert.equal(redeliveredRun.succeeded, true, "succeeded run remains succeeded");
  assert.equal(handlerCalls, 1, "handler must NOT be called again on redelivery");

  // Test 4 (Scenario A): Concurrent Worker Race with active lease -> skipped
  const now = new Date();
  executions.set("run-active_0", {
    status: "PENDING",
    leaseUntil: new Date(now.getTime() + 30_000), // active for 30 more seconds
  });

  const concurrentRun = await processActionWithLeaseClaim({
    zapRunId: "run-active",
    stage: 0,
    handler: mockHandler,
    metadata: {},
    zapRunMetadata: {},
    executionsStore: executions,
    retrySink: retryRows,
    dlqSink: dlqMessages,
    currentTime: now,
  });

  assert.equal(concurrentRun.skipped, true, "active lease cannot be claimed by concurrent worker");

  // Test 5 (Scenario C): Worker Crashed after PENDING (Expired Lease Recovery)
  executions.set("run-crashed_0", {
    status: "PENDING",
    leaseUntil: new Date(now.getTime() - 10_000), // expired 10 seconds ago
  });

  const recoveryRun = await processActionWithLeaseClaim({
    zapRunId: "run-crashed",
    stage: 0,
    handler: mockHandler,
    metadata: {},
    zapRunMetadata: {},
    executionsStore: executions,
    retrySink: retryRows,
    dlqSink: dlqMessages,
    currentTime: now,
  });

  assert.equal(recoveryRun.skipped, false, "expired lease must be reclaimed by recovery worker");
  assert.equal(recoveryRun.succeeded, true, "recovered execution succeeds");
  assert.equal(executions.get("run-crashed_0")?.status, "SUCCESS", "status transitioned to SUCCESS after recovery");

  // Test 6 (Scenario E): Action fails all retries -> FAILED + DLQ + ZapRunRetry
  const failingHandler: ActionHandler = {
    type: "fail",
    execute: async () => {
      throw new Error("SMTP connection refused");
    },
  };

  const failedRun = await processActionWithLeaseClaim({
    zapRunId: "run-fail",
    stage: 0,
    handler: failingHandler,
    metadata: {},
    zapRunMetadata: {},
    executionsStore: executions,
    retrySink: retryRows,
    dlqSink: dlqMessages,
  });

  assert.equal(failedRun.succeeded, false, "failing run should report failed");
  assert.equal(executions.get("run-fail_0")?.status, "FAILED", "status marked FAILED");
  assert.equal(dlqMessages.length, 1, "sent to DLQ");
  assert.equal(retryRows.length, 1, "written to retry table");

  console.log("idempotency.test.ts OK");
}

main();
