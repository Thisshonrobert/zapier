import { afterEach, expect, test } from "bun:test";
import { createServer, get, type Server } from "node:http";
import express from "express";
import { createServiceScope } from "../../../packages/triage-contracts/index.ts";
import { createInvestigationRouter } from "../src/investigation-http.ts";

const secret = "phase-10c-private-service-secret-long-enough";
const id = "22222222-2222-4222-8222-222222222222";
const caseId = "11111111-1111-4111-8111-111111111111";
const correlationId = "44444444-4444-4444-8444-444444444444";
let server: Server | undefined;
afterEach(async () => {
  server?.closeAllConnections();
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  server = undefined;
});

async function start() {
  const calls: unknown[][] = [];
  const app = express();
  app.use("/private/v1/investigations", createInvestigationRouter({ serviceSecret: secret, store: {
    read: async (...args: unknown[]) => { calls.push(args); return { checkpointThreadId: "hidden", leaseToken: "secret" }; },
    events: async (...args: unknown[]) => {
      calls.push(args);
      return args[3] === 1 ? { snapshot: null, events: [{ sequence: 2, status: "proposed", reasoning: "hidden" }] }
        : { snapshot: { sequence: 2, status: "proposed", reasoning: "hidden" }, events: [] };
    },
  } as never }));
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing address");
  return { url: `http://127.0.0.1:${address.port}/private/v1/investigations/${id}/events`, calls };
}
const headers = (investigationId = id) => ({ authorization: `Bearer ${createServiceScope({
  secret, ownerId: 9, caseId, investigationId, correlationId, operations: ["failure_context"],
})}`, "x-correlation-id": correlationId });

test("private SSE rejects missing/wrong scopes and invalid cursors before reading", async () => {
  const { url, calls } = await start();
  expect((await fetch(url)).status).toBe(401);
  expect((await fetch(url, { headers: headers(caseId) })).status).toBe(401);
  expect((await fetch(url, { headers: { ...headers(), "last-event-id": "-1" } })).status).toBe(422);
  expect(calls).toHaveLength(0);
});

test("private SSE emits sanitized snapshot or resumed milestone promptly and disconnect stops reads", async () => {
  const { url, calls } = await start();
  for (const cursor of [undefined, "1"]) {
    const frame = await new Promise<string>((resolve, reject) => {
      const request = get(url, { headers: { ...headers(), ...(cursor ? { "last-event-id": cursor } : {}) } }, response => {
        expect(response.headers["x-accel-buffering"]).toBe("no");
        response.once("data", chunk => { request.destroy(); resolve(String(chunk)); });
      });
      request.once("error", reject);
    });
    expect(frame).toContain(cursor ? "event: milestone" : "event: snapshot");
    expect(frame).toContain('data: {"sequence":2,"status":"proposed"}');
    expect(frame).not.toContain("hidden");
    expect(calls).toContainEqual([id, caseId, 9, cursor ? 1 : null]);
  }
  await Bun.sleep(50);
  const count = calls.length;
  await Bun.sleep(1100);
  expect(calls).toHaveLength(count);
});
