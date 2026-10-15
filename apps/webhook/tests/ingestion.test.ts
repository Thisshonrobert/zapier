import { afterEach, expect, test } from "bun:test";
import type { Server } from "node:http";
import { createWebhookApp } from "../app.ts";

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
});

function fixture(owner = 1, failOutbox = false, configuredSecret: string | undefined = "test-secret") {
  const calls: string[] = [];
  const rows: string[] = [];
  const tx = {
    user: { findUnique: async () => ({ id: 1 }) },
    zap: { findFirst: async ({ where }: { where: { id: string; userId: number } }) => {
      calls.push(`owner:${where.userId}`);
      return where.userId === owner ? { id: where.id } : null;
    } },
    zapRun: { create: async () => { rows.push("run"); return { id: "run-1" }; } },
    zapRunOutbox: { create: async () => {
      if (failOutbox) throw new Error("outbox unavailable");
      rows.push("outbox");
      return { id: "outbox-1" };
    } },
  };
  const db = { $transaction: async (work: (client: typeof tx) => Promise<unknown>) => {
    calls.push("transaction");
    try { return await work(tx); } catch (error) { rows.length = 0; throw error; }
  } };
  const app = createWebhookApp(db as unknown as Parameters<typeof createWebhookApp>[0], configuredSecret === "" ? undefined : configuredSecret);
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  const address = server.address() as { port: number };
  return { calls, rows, post: (ownerId = "1", secret: string | undefined = "test-secret") => fetch(
    `http://127.0.0.1:${address.port}/hooks/catch/${ownerId}/zap-1`, {
      method: "POST", headers: { "content-type": "application/json", ...(secret ? { "x-zap-secret": secret } : {}) },
      body: JSON.stringify({ hello: "world" }),
    }) };
}

test("invalid webhook authentication returns an HTTP 401 before database access", async () => {
  const f = fixture();
  for (const secret of ["wrong", ""]) {
    expect((await f.post("1", secret)).status).toBe(401);
  }
  expect(f.calls).toEqual([]);
});

test("missing server secret fails closed even with a supplied header", async () => {
  const f = fixture(1, false, "");
  expect((await f.post()).status).toBe(401);
  expect(f.calls).toEqual([]);
});

test("malformed owner IDs are rejected without database writes", async () => {
  const f = fixture();
  for (const id of ["1junk", "0", "-1", "1.1", "9007199254740992"]) {
    expect((await f.post(id)).status).toBe(400);
  }
  expect(f.rows).toEqual([]);
});

test("a mismatched owner creates neither run nor outbox", async () => {
  const f = fixture(2);
  expect((await f.post()).status).toBe(404);
  expect(f.calls).toEqual(["transaction", "owner:1"]);
  expect(f.rows).toEqual([]);
});

test("matching owner creates the run and outbox together", async () => {
  const f = fixture();
  expect((await f.post()).status).toBe(200);
  expect(f.rows).toEqual(["run", "outbox"]);
});

test("failed outbox insertion rolls back and rejects the request", async () => {
  const f = fixture(1, true);
  expect((await f.post()).status).toBe(500);
  expect(f.rows).toEqual([]);
});
