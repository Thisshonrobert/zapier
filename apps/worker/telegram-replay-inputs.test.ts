import { expect, test } from "bun:test";
import { telegramAction } from "./actions/telegram.ts";

test("Telegram executes selected inputs exactly, without re-interpolating payload braces", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  let body: unknown;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    expect(init?.signal).toBe(controller.signal);
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }));
  }) as typeof fetch;
  try {
    await telegramAction.execute({ message: "changed", channelUserName: "changed", botToken: "changed" }, {
      zapRunId: "run", stage: 0, idempotencyKey: "key", zapRunMetadata: {}, signal: controller.signal,
      telegramInputs: { botToken: "test", destination: "123", message: "literal {{value}}" },
    });
    expect(body).toEqual({ chat_id: "123", text: "literal {{value}}" });
  } finally { globalThis.fetch = original; }
});

test("aborted destination resolution cannot start a Telegram send", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  let sends = 0;
  globalThis.fetch = (async (url: unknown) => {
    if (String(url).includes("sendMessage")) sends++;
    controller.abort();
    return new Response(JSON.stringify({ ok: true, result: { id: 123 } }));
  }) as typeof fetch;
  try {
    await expect(telegramAction.execute({}, { zapRunId: "run", stage: 0, idempotencyKey: "key",
      zapRunMetadata: {}, signal: controller.signal,
      telegramInputs: { botToken: "test", destination: "@test", message: "test" } })).rejects.toThrow();
    expect(sends).toBe(0);
  } finally { globalThis.fetch = original; }
});
