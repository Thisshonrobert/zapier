import assert from "node:assert/strict";
import type { getActionHandler } from "./actions/index.ts";
import { ActionExecutionError, type ActionHandler } from "./types.ts";
import { executeStage, parseZapEvent, requireLoadedAction } from "./orchestration.ts";

assert.throws(() => parseZapEvent(null), /empty Kafka message/);
assert.throws(() => parseZapEvent(Buffer.from("{")), /malformed Kafka message/);
assert.throws(() => parseZapEvent(Buffer.from('{"zapRunId":"run-1"}')), /invalid Kafka event/);
assert.deepEqual(parseZapEvent(Buffer.from('{"zapRunId":"run-1","stage":0}')), { zapRunId: "run-1", stage: 0 });
assert.throws(() => requireLoadedAction(null), /action not found/);

type Call = { name: string; value?: unknown };

function harness(options: {
  claim?: any; start?: "STARTED" | "STALE"; success?: any; failure?: any;
  notAttempted?: any; handler?: ActionHandler; throwOnSuccess?: boolean; throwOnStart?: boolean;
}) {
  const calls: Call[] = [];
  const claimed = options.claim ?? {
    kind: "CLAIMED", executionId: "execution-1", claimToken: "token-1",
    actionFingerprint: "a".repeat(64), requestFingerprint: "b".repeat(64),
  };
  const store: any = {
    claim: async () => { calls.push({ name: "claim" }); return claimed; },
    startAttempt: async () => {
      calls.push({ name: "start" });
      if (options.throwOnStart) throw new Error("start persistence failed");
      return options.start ?? "STARTED";
    },
    finalizeSuccess: async () => {
      calls.push({ name: "success" });
      if (options.throwOnSuccess) throw new Error("finalization failed");
      return options.success ?? { kind: "FINALIZED" };
    },
    finalizeFailure: async (_owner: unknown, evidence: unknown) => {
      calls.push({ name: "failure", value: evidence });
      return options.failure ?? { kind: "FAILED", failureId: "failure-1" };
    },
    finalizeNotAttempted: async () => {
      calls.push({ name: "notAttempted" });
      return options.notAttempted ?? { kind: "FAILED", failureId: "failure-unsupported" };
    },
  };
  const handler = options.handler;
  const run = () => executeStage({
    event: { zapRunId: "run-1", stage: 0 },
    action: { id: "action-1", typeId: handler?.type ?? "unsupported-secret-type", metadata: { body: "secret body" } },
    zapRunMetadata: { recipient: "secret recipient" },
    store,
    getHandler: (() => handler) as typeof getActionHandler,
  });
  return { calls, run };
}

let providerCalls = 0;
const accepted: ActionHandler = {
  type: "email",
  execute: async () => {
    providerCalls++;
    return { provider: "email", phase: "send", outcome: "accepted", safeReceiptId: "receipt-1" };
  },
};
const acceptedRun = harness({ handler: accepted });
assert.deepEqual(await acceptedRun.run(), { ack: true, advance: true });
assert.equal(providerCalls, 1);
assert.deepEqual(acceptedRun.calls.map((call) => call.name), ["claim", "start", "success"]);

providerCalls = 0;
const rejected: ActionHandler = {
  type: "telegram",
  execute: async () => {
    providerCalls++;
    throw new ActionExecutionError("raw provider response", {
      provider: "telegram", phase: "send", outcome: "rejected", safeCode: "provider_rejected", status: 429,
    });
  },
};
const rejectedRun = harness({ handler: rejected });
assert.deepEqual(await rejectedRun.run(), { ack: true, advance: false });
assert.equal(providerCalls, 1);
assert.deepEqual(rejectedRun.calls.map((call) => call.name), ["claim", "start", "failure"]);
assert.equal(JSON.stringify(rejectedRun.calls).includes("raw provider response"), false);

providerCalls = 0;
const dbFailure = harness({ handler: accepted, throwOnSuccess: true });
await assert.rejects(dbFailure.run(), /finalization failed/);
assert.equal(providerCalls, 1, "provider is never retried after finalization failure");

for (const [claim, expected] of [
  [{ kind: "ACTIVE_PENDING" }, { ack: false, advance: false }],
  [{ kind: "UNRESOLVED" }, { ack: false, advance: false }],
  [{ kind: "SUCCESS" }, { ack: true, advance: true }],
  [{ kind: "FAILED", failureId: "failure-2" }, { ack: true, advance: false }],
] as const) {
  providerCalls = 0;
  const run = harness({ claim, handler: accepted });
  assert.deepEqual(await run.run(), expected);
  assert.equal(providerCalls, 0);
  assert.deepEqual(run.calls.map((call) => call.name), ["claim"]);
}

const unsupported = harness({});
assert.deepEqual(await unsupported.run(), { ack: true, advance: false });
assert.deepEqual(unsupported.calls.map((call) => call.name), ["claim", "notAttempted"]);

providerCalls = 0;
const staleStart = harness({ handler: accepted, start: "STALE" });
assert.deepEqual(await staleStart.run(), { ack: false, advance: false });
assert.equal(providerCalls, 0);

providerCalls = 0;
const staleFinal = harness({ handler: accepted, success: { kind: "STALE" } });
assert.deepEqual(await staleFinal.run(), { ack: false, advance: false });
assert.equal(providerCalls, 1);

providerCalls = 0;
const startFailure = harness({ handler: accepted, throwOnStart: true });
await assert.rejects(startFailure.run(), /start persistence failed/);
assert.equal(providerCalls, 0);

console.log("idempotency.test.ts OK");
