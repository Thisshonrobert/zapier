import { expect, test } from "bun:test";
import { verifyRunEvidence, verifyLabBatch } from "./triage-lab-verify.ts";
import { labScenarios } from "./triage-lab-scenarios.ts";
import { labSqlTypes } from "./triage-lab-store.ts";
import { labResources } from "./triage-lab-config.ts";

test("a pending pipeline reaches its deadline and fails instead of reporting success", async () => {
  const marker = { version: 1, database: "triage_lab", labId: "a".repeat(32), resourceFingerprint: "test", ...labResources("a".repeat(32)) };
  const db = { query: async (sql: string) => {
    if (sql.includes("SELECT marker")) return { rows: [{ marker }] };
    if (sql.includes("SELECT scenarios")) return { rows: [{ scenarios: ["telegram-rate-limit"] }] };
    if (sql.includes("FROM triage_lab.run")) return { rows: [1, 2, 3].map(n => ({ owner_key: `owner-${n}`, scenario: "telegram-rate-limit", run_id: `run-${n}` })) };
    return { rows: [] };
  } };
  await expect(verifyLabBatch(db as never, marker, ["127.0.0.1:1"], "pending", 1000)).rejects.toThrow("pipeline/DLQ publication timed out");
}, 5000);

test("lab SQL timestamps match Prisma UTC evidence regardless of host timezone", () => {
  const parse = labSqlTypes.getTypeParser(1114);
  expect(parse("2026-10-13 19:17:40.222").toISOString()).toBe("2026-10-13T19:17:40.222Z");
});

test("verification refuses fake completion without broker ACK or matching DLQ event", () => {
  const scenario = labScenarios.find(s => s.key === "telegram-missing-credentials")!;
  const journal = { run_id: "run", zap_id: "zap", owner_id: 1, nonce: "nonce", batch_id: "batch", scenario: scenario.key, owner_key: "owner-1" };
  const metadata = { _lab: { labId: "lab", nonce: "nonce", batchId: "batch", scenario: scenario.key, ownerKey: "owner-1" } };
  const row = { id: "run", zapId: "zap", userId: 1, metadata };
  const execution = { id: "execution", zapRunId: "run", stage: 0, status: "FAILED", providerOutcome: "not_attempted", actionFingerprint: "action", requestFingerprint: "request", handlerVersion: "triage-lab-v1" };
  const attempt = { id: "attempt", executionId: "execution", attemptNumber: 1, status: "NOT_ATTEMPTED", provider: "telegram", phase: "resolve_destination", safeCode: "telegram_credentials_missing", providerStatus: null, retryAfterSeconds: null, actionFingerprint: "action", requestFingerprint: "request", completedAt: new Date() };
  const failure = { ...attempt, id: "failure", zapRunId: "run", stage: 0, attempt: 1, providerOutcome: "not_attempted", requiresHuman: true, evidenceSource: "captured", dlqPublishedAt: null };
  const input = { labId: "lab", scenario, journal, runs: [row], executions: [execution], attempts: [attempt], failures: [failure], operations: [], actions: [], events: [{ topic: "events", key: null, value: { zapRunId: "run", stage: 0 } }] };
  expect(verifyRunEvidence(input)).toBe(false);
  expect(verifyRunEvidence({ ...input, failures: [{ ...failure, dlqPublishedAt: new Date() }] })).toBe(false);
  expect(() => verifyRunEvidence({ ...input, runs: [row, row] })).toThrow("Duplicate");
  expect(() => verifyRunEvidence({ ...input, failures: [{ ...failure, safeCode: "invented" }] })).toThrow("mismatch");
  expect(() => verifyRunEvidence({ ...input, operations: [{ stage: 0, attempt_id: "attempt", provider: "telegram", replay: false, operation: "send", invocations: 1 }] })).toThrow("operation");
});
