import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import {
  redactEvidence,
  summarizeStructure,
} from "../services/triage-redaction.ts";
import {
  createServiceScope,
  verifyServiceScope,
} from "../../../packages/triage-contracts/index.ts";

const secret = "phase-4-test-secret-that-is-long-enough";
const caseId = "11111111-1111-4111-8111-111111111111";
const investigationId = "22222222-2222-4222-8222-222222222222";
const correlationId = "33333333-3333-4333-8333-333333333333";

describe("Phase 4A service scope", () => {
  test("binds owner, case, operation, audience, expiry and correlation ID", () => {
    const token = createServiceScope({
      secret,
      ownerId: 7,
      caseId,
      investigationId,
      correlationId,
      operations: ["failure_context"],
      now: new Date("2026-09-24T00:00:00.000Z"),
      ttlSeconds: 30,
    });

    expect(
      verifyServiceScope(token, {
        secret,
        operation: "failure_context",
        now: new Date("2026-09-24T00:00:29.000Z"),
      }),
    ).toMatchObject({ ownerId: 7, caseId, investigationId, correlationId });
    expect(() =>
      verifyServiceScope(token, {
        secret,
        operation: "execution_evidence",
        now: new Date("2026-09-24T00:00:01.000Z"),
      }),
    ).toThrow("scope operation not allowed");
    expect(() =>
      verifyServiceScope(`${token.slice(0, -1)}x`, {
        secret,
        operation: "failure_context",
        now: new Date("2026-09-24T00:00:01.000Z"),
      }),
    ).toThrow("invalid service scope");
    expect(() =>
      verifyServiceScope(token, {
        secret,
        operation: "failure_context",
        now: new Date("2026-09-24T00:00:31.000Z"),
      }),
    ).toThrow("service scope expired");
  });

  test("rejects signed scopes with unknown claims", () => {
    const valid = createServiceScope({
      secret, ownerId: 7, caseId, investigationId, correlationId,
      operations: ["failure_context"],
    });
    const [body] = valid.split(".");
    const payload = JSON.parse(Buffer.from(body!, "base64url").toString("utf8"));
    payload.ownerOverride = 99;
    const changedBody = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", secret).update(changedBody).digest("base64url");

    expect(() => verifyServiceScope(`${changedBody}.${signature}`, {
      secret, operation: "failure_context",
    })).toThrow("invalid service scope");
  });
});

describe("Phase 4A redaction and bounds", () => {
  test("redacts nested secrets and credential-like string fragments", () => {
    const redacted = redactEvidence({
      authorization: "Bearer abcdefghijklmnopqrstuvwxyz",
      nested: {
        botToken: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd",
        harmless: "provider rejected request for owner@example.com",
      },
    });

    expect(JSON.stringify(redacted)).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(JSON.stringify(redacted)).not.toContain("ABCDEFGHIJKLMNOPQRSTUVWXYZabcd");
    expect(JSON.stringify(redacted)).not.toContain("owner@example.com");
    expect(redacted).toEqual({
      authorization: "[REDACTED]",
      nested: { botToken: "[REDACTED]", harmless: "provider rejected request for [REDACTED]" },
    });
  });

  test("summarizes payload shape without returning values and caps output", () => {
    const summary = summarizeStructure({
      customer: { email: "owner@example.com", token: "secret" },
      items: Array.from({ length: 100 }, (_, index) => ({ index })),
    });

    expect(summary.paths).toContainEqual({ path: "customer.email", type: "string" });
    expect(summary.paths.length).toBeLessThanOrEqual(64);
    expect(JSON.stringify(summary)).not.toContain("owner@example.com");
    expect(summary.truncated).toBe(true);
  });
});
