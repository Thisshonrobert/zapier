import { afterEach, expect, test } from "bun:test";
import express from "express";
import { createServer, type Server } from "node:http";
import jwt from "jsonwebtoken";
import { verifyServiceScope } from "../../../packages/triage-contracts/index.ts";
import { TriageOperatorDenied } from "../services/triage-operator.ts";
import { TriageAgentClient } from "../services/triage-agent.ts";

process.env.JWT_SECRET ??= "phase-10c-http-test-secret";
const { createTriageRouter } = await import("../route/triage.ts");
const secret = "phase-10c-backend-service-secret-long-enough";
const caseId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers) server.closeAllConnections();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});
async function listen(app: express.Express) {
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing address");
  return `http://127.0.0.1:${address.port}`;
}
async function start(input: { denied?: boolean; wrongOwner?: boolean } = {}) {
  const calls: unknown[] = [];
  const app = express();
  app.use("/triage", createTriageRouter({ evidence: {} as never, serviceSecret: secret,
    operator: { resolveCase: async (actorId: number) => {
      calls.push(actorId);
      if (input.denied) throw new TriageOperatorDenied("denied");
      return { case_id: caseId, subject_owner_id: 9, zap_run_id: runId, stage: 0 };
    } } as never,
    agent: {
      read: async () => ({ id, binding: { caseId, subjectOwnerId: input.wrongOwner ? 10 : 9, zapRunId: runId, stage: 0 } }),
      stream: async (path: string, token: string, correlation: string, cursor: string, signal: AbortSignal) => {
        calls.push({ path, cursor, scope: verifyServiceScope(token, { secret, operation: "failure_context" }), correlation });
        return new Response(new ReadableStream({ start(controller) {
          controller.enqueue(new TextEncoder().encode('id: 2\nevent: milestone\ndata: {"sequence":2,"status":"proposed"}\n\n'));
          signal.addEventListener("abort", () => { calls.push("aborted"); controller.close(); }, { once: true });
        } }), { headers: { "content-type": "text/event-stream" } });
      },
    } as never,
  }));
  return { url: `${await listen(app)}/triage/operator/cases/${caseId}/investigations/${id}/events`, calls };
}
const auth = () => ({ authorization: `Bearer ${jwt.sign({ id: 4 }, process.env.JWT_SECRET!)}` });

test("public stream requires operator access, valid cursor and current owner binding", async () => {
  const plain = await start();
  expect((await fetch(plain.url)).status).toBe(401);
  expect((await fetch(plain.url, { headers: { ...auth(), "last-event-id": "NaN" } })).status).toBe(422);
  expect(plain.calls).toHaveLength(0);
  const denied = await start({ denied: true });
  expect((await fetch(denied.url, { headers: auth() })).status).toBe(403);
  const mismatch = await start({ wrongOwner: true });
  expect((await fetch(mismatch.url, { headers: auth() })).status).toBe(409);
  expect(mismatch.calls).toEqual([4]);
});

test("backend proxies frames immediately with bound scope and cancels upstream on disconnect", async () => {
  const { url, calls } = await start();
  const controller = new AbortController();
  const response = await fetch(url, { headers: { ...auth(), "last-event-id": "1" }, signal: controller.signal });
  expect(response.headers.get("content-type")).toStartWith("text/event-stream");
  expect(response.headers.get("x-accel-buffering")).toBe("no");
  const reader = response.body!.getReader();
  expect(new TextDecoder().decode((await reader.read()).value)).toContain("event: milestone");
  expect(calls[1]).toMatchObject({ path: `/private/v1/investigations/${id}/events`, cursor: "1",
    scope: { ownerId: 9, caseId, investigationId: id } });
  controller.abort();
  await reader.cancel().catch(() => {});
  await Bun.sleep(50);
  expect(calls).toContain("aborted");
});

test("agent client forwards cursor/auth headers without buffering the stream body", async () => {
  const app = express();
  let received: Record<string, unknown> = {};
  app.get("/events", (request, response) => {
    received = request.headers;
    response.set("content-type", "text/event-stream");
    response.write(": heartbeat\n\n");
  });
  const controller = new AbortController();
  const response = await new TriageAgentClient(await listen(app)).stream("/events", "scope", "correlation", "7", controller.signal);
  expect(received).toMatchObject({ authorization: "Bearer scope", "last-event-id": "7", "x-correlation-id": "correlation" });
  expect(new TextDecoder().decode((await response.body!.getReader().read()).value)).toBe(": heartbeat\n\n");
  controller.abort();
});
