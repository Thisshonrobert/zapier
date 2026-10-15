import { expect, test } from "bun:test";
import { createActionRegistry } from "../../apps/worker/actions/index.ts";
import { normalizeFailure } from "../../apps/worker/execution-store.ts";
import { labScenarios, fakeTelegramToken } from "./triage-lab-scenarios.ts";
import { simulatedTransports, assertLabWorkerEnvironment } from "./triage-lab-transports.ts";

const wants = [
  ["telegram-rate-limit", "rejected", "telegram_http_429", "send", 429, 2],
  ["telegram-forbidden", "rejected", "telegram_http_403", "send", 403, undefined],
  ["telegram-resolution", "not_attempted", "telegram_resolution_rejected", "resolve_destination", 400, undefined],
  ["telegram-transport", "unknown", "telegram_transport_error", "send", undefined, undefined],
  ["telegram-missing-credentials", "not_attempted", "telegram_credentials_missing", "resolve_destination", undefined, undefined],
  ["email-rejection", "rejected", "validation_error", "send", 422, undefined],
  ["email-transport", "unknown", "email_transport_error", "send", undefined, undefined],
  ["email-missing-subject", "rejected", "missing_required_field", "send", 422, undefined],
  ["email-missing-template", "rejected", "missing_required_field", "send", 422, undefined],
] as const;

test("real handlers establish the exact scenario evidence without provider egress", async () => {
  const prior = process.env.TELEGRAM_BOT_TOKEN;
  const originalFetch = globalThis.fetch;
  let outbound = 0;
  globalThis.fetch = (async () => { outbound++; throw new Error("provider egress forbidden"); }) as unknown as typeof fetch;
  process.env.TELEGRAM_BOT_TOKEN = "";
  try {
    for (const [key, outcome, code, phase, status, retry] of wants) {
      const scenario = labScenarios.find(s => s.key === key)!;
      const operations: string[] = [];
      const transports = simulatedTransports(scenario, 0, false, async operation => { operations.push(operation); });
      const registry = createActionRegistry({ email: () => transports.email, telegram: () => transports.telegram });
      let evidence;
      try { await registry[scenario.actions[0]!.type]!.execute(scenario.actions[0]!.metadata,
        { zapRunId: key, stage: 0, idempotencyKey: `zaprun_${key}_stage_0`, zapRunMetadata: {} }); }
      catch (error) { evidence = normalizeFailure(error); }
      expect(evidence).toMatchObject({ providerOutcome: outcome, safeCode: code, phase });
      expect(evidence?.providerStatus).toBe(status);
      expect(evidence?.retryAfterSeconds).toBe(retry);
      expect(operations).toEqual(key === "telegram-missing-credentials" ? [] : [key === "telegram-resolution" ? "getChat" : "send"]);
    }
    expect(outbound).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (prior === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = prior;
  }
});

test("simulation is identity-based across restart and accepts only the eligible replay", async () => {
  const scenario = labScenarios.find(s => s.key === "telegram-rate-limit")!;
  const url = `https://api.telegram.org/bot${fakeTelegramToken}/sendMessage`;
  const init = { method: "POST", body: JSON.stringify({ chat_id: "-100123456", text: "[LAB] No external message" }) };
  for (let n = 0; n < 2; n++) {
    expect((await simulatedTransports(scenario, 0, false, async () => {}).telegram(url, init)).status).toBe(429);
    expect((await simulatedTransports(scenario, 0, true, async () => {}).telegram(url, init)).status).toBe(200);
  }
  await expect(simulatedTransports(labScenarios.find(s => s.key === "telegram-forbidden")!, 0, true, async () => {}).telegram(url, init)).rejects.toThrow();
});

test("unrecognized provider URLs and payloads fail closed before operation journal", async () => {
  const transports = simulatedTransports(labScenarios[0]!, 0, false, async () => { throw new Error("should not record invalid input"); });
  await expect(transports.telegram("https://example.com/sendMessage")).rejects.toThrow("Lab provider input refused");
  await expect(transports.telegram(`https://api.telegram.org/botREAL/sendMessage`)).rejects.toThrow("Lab provider input refused");
  await expect(transports.email({ to: "real@example.com", from: "real@example.com", subject: "", html: "" })).rejects.toThrow("Lab provider input refused");
});

test("lab worker refuses production, ordinary database, topics or real credentials", () => {
  const env = { TRIAGE_LAB: "true", NODE_ENV: "development", DATABASE_URL: "postgresql://user:pass@localhost:5432/triage_lab",
    TRIAGE_LAB_ID: "a".repeat(32), TRIAGE_LAB_RESOURCE_FINGERPRINT: "b".repeat(64), KAFKA_BROKERS: "localhost:9092",
    KAFKA_EVENTS_TOPIC: `triage-lab-${"a".repeat(32)}-events`, KAFKA_DLQ_TOPIC: `triage-lab-${"a".repeat(32)}-dlq`,
    KAFKA_WORKER_GROUP: `triage-lab-${"a".repeat(32)}-worker`, TELEGRAM_BOT_TOKEN: "", RESEND_API_KEY: "re_triage_lab_fake",
    REPLAY_ENABLED: "false", REPLAY_RELEASE_READY: "false" };
  expect(() => assertLabWorkerEnvironment(env)).not.toThrow();
  for (const patch of [{ NODE_ENV: "production" }, { DATABASE_URL: "postgresql://user:pass@localhost:5432/postgres" },
    { KAFKA_EVENTS_TOPIC: "zap-events" }, { TELEGRAM_BOT_TOKEN: "real" }, { RESEND_API_KEY: "real" }, { REPLAY_ENABLED: "true" }]) {
    expect(() => assertLabWorkerEnvironment({ ...env, ...patch })).toThrow();
  }
});
