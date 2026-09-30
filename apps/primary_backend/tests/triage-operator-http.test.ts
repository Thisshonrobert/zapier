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

async function start(options: { failAudit?: boolean; failNotify?: boolean; saved?: unknown } = {}) {
  const calls: { path: string; token: string; correlationId: string; method: string; body?: unknown }[] = [];
  const authorityCalls: unknown[] = [];
  const events: string[] = [];
  const app = express();
  app.use(express.json());
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
      read: async (path: string, token: string, correlationId: string, method: string, _timeout: number, body?: unknown) => {
        calls.push({ path, token, correlationId, method, body });
        return options.saved && path.includes("/private/v1/investigations/") ? options.saved : { status: "completed" };
      },
    } as never,
    proposals: { submit: async (value: unknown) => {
      authorityCalls.push({ proposal: value }); return { id: "99999999-9999-4999-8999-999999999999", status: "blocked" };
    } } as never,
    authority: { decide: async (value: unknown) => {
      events.push("commit");
      authorityCalls.push({ decision: value }); return { id: (value as { decisionId: string }).decisionId,
        decision: "reject" };
    } } as never,
    notifications: { deliver: async () => {
      events.push("notify");
      if (options.failNotify) throw new Error("agent offline");
      return true;
    } } as never,
    serviceSecret: secret,
  }));
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing address");
  return { baseUrl: `http://127.0.0.1:${address.port}/api/v1/triage`, calls, authorityCalls, events };
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

  test("renews a runner scope only for a currently authorized operator and matching case", async () => {
    const { baseUrl } = await start();
    const investigationId = "55555555-5555-4555-8555-555555555555";
    const binding = { id: investigationId, caseId, zapRunId: "11111111-1111-4111-8111-111111111111",
      stage: 0, subjectOwnerId: 9, actorId: 4, supportOperatorId: 4 };
    const correlationId = "66666666-6666-4666-8666-666666666666";
    const path = `${baseUrl}/internal/investigations/${investigationId}/scope`;
    const send = (body: unknown, authorization = `Bearer ${secret}`) => fetch(path, {
      method: "POST", headers: { authorization, "content-type": "application/json",
        "x-correlation-id": correlationId }, body: JSON.stringify(body),
    });
    expect((await send({ ...binding, subjectOwnerId: 10 })).status).toBe(403);
    expect((await send(binding, "Bearer wrong")).status).toBe(401);
    const response = await send(binding);
    expect(response.status).toBe(200);
    const { scope } = await response.json() as { scope: string };
    expect(verifyServiceScope(scope, { secret, operation: "execution_evidence" })).toMatchObject({
      ownerId: 9, caseId, investigationId, correlationId,
    });
  });

  test("starts and reads a saved investigation using the authorized case binding", async () => {
    const { baseUrl, calls } = await start();
    const auth = `Bearer ${jwt.sign({ id: 4 }, process.env.JWT_SECRET!)}`;
    const key = "77777777-7777-4777-8777-777777777777";
    const started = await fetch(`${baseUrl}/operator/cases/${caseId}/investigations`, {
      method: "POST", headers: { authorization: auth, "idempotency-key": key },
    });
    expect(started.status).toBe(200);
    expect(calls[0]?.path).toBe("/private/v1/investigations");
    expect(calls[0]?.body).toMatchObject({ caseId, subjectOwnerId: 9,
      actorId: 4, supportOperatorId: 4, idempotencyKey: key });
    const id = (calls[0]?.body as { id: string }).id;
    expect(verifyServiceScope(calls[0]!.token, { secret, operation: "failure_context" }).investigationId).toBe(id);
    const read = await fetch(`${baseUrl}/operator/cases/${caseId}/investigations/${id}`, {
      headers: { authorization: auth },
    });
    expect(read.status).toBe(200);
    expect(calls[1]?.path).toBe(`/private/v1/investigations/${id}`);
  });

  test("submits a saved proposal only after resolving the operator and source binding", async () => {
    const id = "88888888-8888-4888-8888-888888888888";
    const saved = { id, status: "proposed", binding: { caseId,
      zapRunId: "11111111-1111-4111-8111-111111111111", stage: 0, subjectOwnerId: 9,
      actorId: 4 }, result: { proposal: {} }, evidence: {} };
    const { baseUrl, authorityCalls } = await start({ saved });
    const response = await fetch(`${baseUrl}/operator/cases/${caseId}/investigations/${id}`, {
      headers: { authorization: `Bearer ${jwt.sign({ id: 4 }, process.env.JWT_SECRET!)}` },
    });
    expect(response.status).toBe(200);
    expect(authorityCalls[0]).toMatchObject({ proposal: { investigationId: id,
      caseId, subjectOwnerId: 9, actorId: 4 } });
  });

  test("decision route sends only typed, case-bound operator decisions", async () => {
    const { baseUrl, authorityCalls, events } = await start();
    const id = "88888888-8888-4888-8888-888888888888";
    const proposalId = "99999999-9999-4999-8999-999999999999";
    const decisionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const response = await fetch(`${baseUrl}/operator/cases/${caseId}/investigations/${id}/decision`, {
      method: "POST", headers: { authorization: `Bearer ${jwt.sign({ id: 4 }, process.env.JWT_SECRET!)}`,
        "content-type": "application/json", "idempotency-key": decisionId },
      body: JSON.stringify({ proposalId, decision: "reject" }),
    });
    expect(response.status).toBe(200);
    expect(authorityCalls[0]).toMatchObject({ decision: { proposalId, investigationId: id,
      caseId, subjectOwnerId: 9, actorId: 4, decisionId, decision: "reject" } });
    expect(events).toEqual(["commit", "notify"]);
  });

  test("notification outage does not change the committed decision response", async () => {
    const { baseUrl, events } = await start({ failNotify: true });
    const response = await fetch(`${baseUrl}/operator/cases/${caseId}/investigations/88888888-8888-4888-8888-888888888888/decision`, {
      method: "POST", headers: { authorization: `Bearer ${jwt.sign({ id: 4 }, process.env.JWT_SECRET!)}`,
        "content-type": "application/json", "idempotency-key": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      body: JSON.stringify({ proposalId: "99999999-9999-4999-8999-999999999999", decision: "reject" }),
    });
    expect(response.status).toBe(200);
    expect(events).toEqual(["commit", "notify"]);
  });
});
