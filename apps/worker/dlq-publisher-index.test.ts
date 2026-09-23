import assert from "node:assert/strict";
import { runDlqProcess } from "./dlq-publisher-index.ts";

const calls: string[] = [];
let stopping = false;
let cycle = 0;

await runDlqProcess({
  reconciler: {
    reconcileNext: async () => {
      calls.push("reconcile");
      return cycle++ === 0 ? "QUARANTINED" : "EMPTY";
    },
  },
  publisher: {
    publishNext: async () => {
      calls.push("publish");
      return cycle === 1 ? "PUBLISHED" : "EMPTY";
    },
  },
  isStopping: () => stopping,
  sleep: async (milliseconds) => {
    calls.push(`sleep:${milliseconds}`);
    stopping = true;
  },
  idleDelayMs: 250,
});

assert.deepEqual(calls, [
  "reconcile",
  "publish",
  "reconcile",
  "publish",
  "sleep:250",
]);
console.log("dlq-publisher-index.test.ts OK");
