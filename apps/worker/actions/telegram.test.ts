import assert from "node:assert/strict";
import { ActionExecutionError } from "../types";
import { resolveChatId, sendTelegram, type FetchTransport } from "./telegram";

const response = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function captureFailure(run: () => Promise<unknown>) {
  try {
    await run();
    assert.fail("expected Telegram operation to fail");
  } catch (error) {
    assert.ok(error instanceof ActionExecutionError);
    return error;
  }
}

async function main() {
  let calls = 0;
  const neverFetch: FetchTransport = async () => {
    calls++;
    throw new Error("numeric IDs must not call Telegram");
  };
  assert.equal(
    await resolveChatId("-100123", "bot-secret", neverFetch),
    "-100123",
  );
  assert.equal(calls, 0);

  const resolutionFailure = await captureFailure(() =>
    resolveChatId("@private-channel", "bot-secret", async () =>
      response(404, { ok: false, description: "raw private-channel detail" }),
    ),
  );
  assert.deepEqual(resolutionFailure.evidence, {
    provider: "telegram",
    phase: "resolve_destination",
    outcome: "not_attempted",
    safeCode: "telegram_resolution_rejected",
    status: 404,
  });

  const resolutionTransport = await captureFailure(() =>
    resolveChatId("@private-channel", "bot-secret", async () => {
      throw new Error("raw network detail");
    }),
  );
  assert.equal(
    resolutionTransport.evidence.safeCode,
    "telegram_resolution_transport_error",
  );

  const resolved = await resolveChatId("@channel", "bot-secret", async () =>
    response(200, { ok: true, result: { id: -100456 } }),
  );
  assert.equal(resolved, "-100456");

  const accepted = await sendTelegram(
    "-100456",
    "secret message",
    "bot-secret",
    async () => response(200, { ok: true, result: { message_id: 42 } }),
  );
  assert.deepEqual(accepted, {
    provider: "telegram",
    phase: "send",
    outcome: "accepted",
    safeReceiptId: "42",
  });

  const rateLimited = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () =>
      response(429, {
        ok: false,
        error_code: 429,
        description: "raw rate-limit detail",
        parameters: { retry_after: 30 },
      }),
    ),
  );
  assert.deepEqual(rateLimited.evidence, {
    provider: "telegram",
    phase: "send",
    outcome: "rejected",
    safeCode: "telegram_http_429",
    status: 429,
    retryAfterSeconds: 30,
  });

  const unavailable = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () =>
      response(503, { ok: false, description: "raw provider body" }),
    ),
  );
  assert.equal(unavailable.evidence.outcome, "unknown");

  const timeout = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () => {
      throw new Error("raw timeout detail");
    }),
  );
  assert.equal(timeout.evidence.safeCode, "telegram_transport_error");

  const malformed = await captureFailure(() =>
    sendTelegram(
      "-100456",
      "secret message",
      "bot-secret",
      async () => new Response("not json", { status: 200 }),
    ),
  );
  assert.equal(malformed.evidence.safeCode, "telegram_response_invalid");

  const missingReceipt = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () =>
      response(200, { ok: true, result: {} }),
    ),
  );
  assert.equal(missingReceipt.evidence.safeCode, "telegram_receipt_missing");

  const serialized = JSON.stringify([
    resolutionFailure.evidence,
    resolutionTransport.evidence,
    rateLimited.evidence,
    unavailable.evidence,
    timeout.evidence,
    malformed.evidence,
    missingReceipt.evidence,
  ]);
  for (const secret of [
    "bot-secret",
    "private-channel",
    "secret message",
    "raw provider body",
    "raw timeout detail",
  ]) {
    assert.equal(serialized.includes(secret), false);
  }

  console.log("telegram.test.ts OK");
}

main();
