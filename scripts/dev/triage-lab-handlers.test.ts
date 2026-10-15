import { expect, test } from "bun:test";
import { telegramAction, createTelegramAction } from "../../apps/worker/actions/telegram.ts";
import { createEmailAction } from "../../apps/worker/actions/email.ts";
import { normalizeFailure } from "../../apps/worker/execution-store.ts";

const ctx = { zapRunId: "probe", stage: 0, idempotencyKey: "probe", zapRunMetadata: {} };

test("missing resolved Telegram credentials fail before any provider operation", async () => {
  const original = globalThis.fetch;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let calls = 0;
  process.env.TELEGRAM_BOT_TOKEN = "";
  globalThis.fetch = (async () => { calls++; throw new Error("network forbidden"); }) as unknown as typeof fetch;
  try {
    let evidence;
    try { await telegramAction.execute({ botToken: "", channelUserName: "-123", message: "probe" }, ctx); }
    catch (error) { evidence = normalizeFailure(error); }
    expect(evidence).toMatchObject({ provider: "telegram", phase: "resolve_destination", providerOutcome: "not_attempted", safeCode: "telegram_credentials_missing" });
    expect(calls).toBe(0);
  } finally {
    globalThis.fetch = original;
    if (token === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = token;
  }
});

test("injected Telegram handler preserves real parser and rejection normalization", async () => {
  const handler = createTelegramAction(() => async (_url, init) => {
    expect(JSON.parse(String(init?.body))).toEqual({ chat_id: "-123", text: "hello Ada" });
    return Response.json({ ok: false, parameters: { retry_after: 2 } }, { status: 429 });
  });
  let evidence;
  try { await handler.execute({ botToken: "fake", channelUserName: "-123", message: "hello {{name}}" }, { ...ctx, zapRunMetadata: { name: "Ada" } }); }
  catch (error) { evidence = normalizeFailure(error); }
  expect(evidence).toMatchObject({ providerOutcome: "rejected", safeCode: "telegram_http_429", providerStatus: 429, retryAfterSeconds: 2 });
});

test("injected email handler intercepts the SDK boundary and sends parsed missing subject", async () => {
  const handler = createEmailAction(() => async (payload, options) => {
    expect(payload.subject).toBe("");
    expect(new Headers(options?.headers).get("Idempotency-Key")).toBe("probe");
    return { data: null, error: { name: "missing_required_field", message: "subject required", statusCode: 422 }, headers: null };
  });
  let evidence;
  try { await handler.execute({ to: "owner@example.invalid", body: "probe", subject: "{{missing}}" }, ctx); }
  catch (error) { evidence = normalizeFailure(error); }
  expect(evidence).toMatchObject({ provider: "email", phase: "send", providerOutcome: "rejected", safeCode: "missing_required_field", providerStatus: 422 });
});
