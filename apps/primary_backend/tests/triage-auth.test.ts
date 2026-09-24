import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import express from "express";

import { createServiceScope } from "../../../packages/triage-contracts/index.ts";
import { createTriageRouter } from "../route/triage.ts";

const servers: Server[] = [];
const contractFixture = JSON.parse(
  await readFile(join(import.meta.dir, "../../../packages/triage-contracts/fixtures/evidence-contracts.json"), "utf8"),
) as { valid: { failure_context: unknown } };
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function startRouter() {
  const app = express();
  const evidence = {
    getFailureContext: async () => contractFixture.valid.failure_context,
    listCases: async () => [],
    assertOwnedCase: async () => {},
  };
  app.use("/api/v1/triage", createTriageRouter({
    evidence: evidence as never,
    agent: { read: async () => ({}) } as never,
    serviceSecret: secret,
  }));
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing address");
  return `http://127.0.0.1:${address.port}`;
}

const secret = "phase-4-test-secret-that-is-long-enough";
const caseId = "11111111-1111-4111-8111-111111111111";
const correlationId = "33333333-3333-4333-8333-333333333333";
const token = (input: { caseId?: string; operations?: ["failure_context"] | ["execution_evidence"]; now?: Date; ttlSeconds?: number } = {}) =>
  createServiceScope({
    secret,
    ownerId: 7,
    caseId: input.caseId ?? caseId,
    investigationId: "22222222-2222-4222-8222-222222222222",
    correlationId,
    operations: input.operations ?? ["failure_context"],
    now: input.now,
    ttlSeconds: input.ttlSeconds,
  });

describe("Phase 4 private backend boundary", () => {
  test("accepts the exact server-bound case and correlation", async () => {
    const baseUrl = await startRouter();
    const response = await fetch(`${baseUrl}/api/v1/triage/internal/cases/${caseId}/failure-context`, {
      headers: { authorization: `Bearer ${token()}`, "x-correlation-id": correlationId },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(contractFixture.valid.failure_context);
  });

  test("rejects forged case IDs, scopes, correlations and expired tokens", async () => {
    const baseUrl = await startRouter();
    const otherCase = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const expired = token({ now: new Date(Date.now() - 120_000), ttlSeconds: 1 });
    const requests = [
      [`${baseUrl}/api/v1/triage/internal/cases/${otherCase}/failure-context`, token()],
      [`${baseUrl}/api/v1/triage/internal/cases/${caseId}/failure-context`, token({ operations: ["execution_evidence"] })],
      [`${baseUrl}/api/v1/triage/internal/cases/${caseId}/failure-context`, expired],
    ] as const;
    for (const [url, scope] of requests) {
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${scope}`, "x-correlation-id": correlationId },
      });
      expect(response.status).toBe(401);
    }
    const badCorrelation = await fetch(`${baseUrl}/api/v1/triage/internal/cases/${caseId}/failure-context`, {
      headers: { authorization: `Bearer ${token()}`, "x-correlation-id": otherCase },
    });
    expect(badCorrelation.status).toBe(401);
  });
});
