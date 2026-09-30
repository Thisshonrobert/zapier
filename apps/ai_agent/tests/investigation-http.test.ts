import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import express from "express";

import { createServiceScope } from "../../../packages/triage-contracts/index.ts";
import { createInvestigationRouter } from "../src/investigation-http.ts";

const secret = "phase-8-agent-route-secret-long-enough";
const caseId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const correlationId = "44444444-4444-4444-8444-444444444444";
let server: Server | undefined;
afterEach(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined; });

async function start() {
  const calls: string[] = [];
  const app = express();
  app.use(express.json());
  app.use("/private/v1/investigations", createInvestigationRouter({
    serviceSecret: secret,
    store: {
      start: async (job: { id: string }) => { calls.push(`start:${job.id}`); return { id: job.id }; },
      read: async (jobId: string, selectedCase: string, owner: number) => {
        calls.push(`read:${jobId}:${selectedCase}:${owner}`);
        return { id: jobId, status: "proposed", checkpointThreadId: "thread" };
      },
      applyDecision: async (_jobId: string, _caseId: string, _owner: number,
        decisionId: string, decision: string) => { calls.push(`apply:${decisionId}:${decision}`); },
    } as never,
    resumeDecision: async (_thread: string, decision: { id: string; decision: string }) => {
      calls.push(`resume:${decision.id}:${decision.decision}`);
    },
  }));
  server = createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing address");
  return { url: `http://127.0.0.1:${address.port}/private/v1/investigations`, calls };
}

const token = (investigationId = id) => createServiceScope({
  secret, ownerId: 9, caseId, investigationId, correlationId,
  operations: ["failure_context", "execution_evidence", "validate_action_inputs"],
});
const headers = (authorization = token()) => ({ authorization: `Bearer ${authorization}`,
  "x-correlation-id": correlationId, "content-type": "application/json" });

describe("Phase 8 agent job API", () => {
  test("starts only the investigation bound by the signed scope", async () => {
    const { url, calls } = await start();
    const body = { id, caseId, zapRunId: runId, stage: 0, subjectOwnerId: 9,
      actorId: 4, supportOperatorId: 4, idempotencyKey: "55555555-5555-4555-8555-555555555555" };
    expect((await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) })).status).toBe(200);
    expect((await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify({ ...body, subjectOwnerId: 10 }) })).status).toBe(401);
    expect(calls).toEqual([`start:${id}`]);
  });

  test("scopes a saved read to the signed case and subject owner", async () => {
    const { url, calls } = await start();
    expect((await fetch(`${url}/${id}`, { headers: headers() })).status).toBe(200);
    expect((await fetch(`${url}/${id}`, { headers: headers(token(runId)) })).status).toBe(401);
    expect(calls).toEqual([`read:${id}:${caseId}:9`]);
  });

  test("claims the committed decision before resuming the checkpoint", async () => {
    const { url, calls } = await start();
    const decisionId = "66666666-6666-4666-8666-666666666666";
    const response = await fetch(`${url}/${id}/decision`, { method: "POST", headers: headers(),
      body: JSON.stringify({ decisionId, decision: "reject" }) });
    expect(response.status).toBe(200);
    expect(calls).toEqual([`read:${id}:${caseId}:9`, `apply:${decisionId}:reject`,
      `resume:${decisionId}:reject`]);
  });
});
