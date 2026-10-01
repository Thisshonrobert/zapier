import assert from "node:assert/strict";
import { test } from "node:test";

import { pollInvestigation, requestTriage } from "./triage-client";

test("passes request cancellation through to the operator request", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;

  const pending = requestTriage({
    baseUrl: "http://triage.test",
    token: "support-jwt",
    path: "/cases",
    signal: controller.signal,
    fetchImpl: async (_input, init) => {
      receivedSignal = init?.signal ?? undefined;
      return await new Promise<Response>((_resolve, reject) => {
        controller.signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    },
  });

  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(receivedSignal, controller.signal);
  assert.equal(receivedSignal?.aborted, true);
});

test("polls saved reads sequentially with a finite bound", async () => {
  let reads = 0;
  let updates = 0;
  await pollInvestigation({ signal: new AbortController().signal,
    read: async () => { reads++; return { id: "saved", status: "queued", result: null, authority: null }; },
    onSnapshot: () => { updates++; }, attempts: 3, intervalMs: 0 });
  assert.equal(reads, 3);
  assert.equal(updates, 3);
});

test("cancellation during the polling delay prevents later reads", async () => {
  const controller = new AbortController();
  let reads = 0;
  await assert.rejects(pollInvestigation({ signal: controller.signal,
    read: async () => { reads++; return { id: "saved", status: "queued", result: null, authority: null }; },
    onSnapshot: () => { setTimeout(() => controller.abort(), 0); }, intervalMs: 60_000 }), { name: "AbortError" });
  assert.equal(reads, 1);
});
