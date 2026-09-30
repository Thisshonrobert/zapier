import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

import { verifyServiceScope } from "../../../packages/triage-contracts/index.ts";

process.env.JWT_SECRET = "phase-10a-http-test-secret";
const { createTriageRouter } = await import("../route/triage.ts");

const caseId = "f0100000-0000-4000-8000-000000000001";
const secret = "phase-10a-service-secret-long-enough";
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function start(options: { failAudit?: boolean } = {}) {
  const calls: { path: string; token: string; correlationId: string; method: string }[] = [];
  const app = express();
  app.use("/api/v1/triage", createTriageRouter({
    evidence: {} as never,
    operator: {
      listCases: async () => [],
      resolveCase: async () => {
        if (options.failAudit) throw new Error("audit write failed");
        return { case_id: caseId, subject_owner_id: 9, zap_run_id: "11111111-1111-4111-8111-111111111111", stage: 0 };
      },
    } as never,
    agent: {
      read: async (path: string, token: string, correlationId: string, method: string) => {
        calls.push({ path, token, correlationId, method });
        return { status: "completed" };
      },
    } as never,
    serviceSecret: secret,
  }));
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing address");
  return { baseUrl: `http://127.0.0.1:${address.port}/api/v1/triage`, calls };
}

describe("Phase 10A operator HTTP binding", () => {
  test("requires authentication", async () => {
    const { baseUrl } = await start();
    const response = await fetch(`${baseUrl}/operator/cases/${caseId}`);
    expect(response.status).toBe(401);
  });

  test("derives the subject owner for a read-only diagnosis scope", async () => {
    const { baseUrl, calls } = await start();
    const response = await fetch(`${baseUrl}/operator/cases/${caseId}/investigations/diagnose`, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt.sign({ id: 4 }, process.env.JWT_SECRET!)}` },
    });
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.path).toBe("/private/v1/investigations/diagnose");
    const scope = verifyServiceScope(calls[0]!.token, {
      secret,
      operation: "failure_context",
    });
    expect(scope.ownerId).toBe(9);
    expect(scope.caseId).toBe(caseId);
    expect(scope.correlationId).toBe(calls[0]!.correlationId);
  });

  test("fails closed before calling the agent if audit persistence fails", async () => {
    const { baseUrl, calls } = await start({ failAudit: true });
    const response = await fetch(`${baseUrl}/operator/cases/${caseId}/investigations/diagnose`, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt.sign({ id: 4 }, process.env.JWT_SECRET!)}` },
    });
    expect(response.status).toBe(503);
    expect(calls).toHaveLength(0);
  });
});
