import assert from "node:assert/strict";
import { test } from "node:test";

import { requestTriage } from "./triage-client";

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
