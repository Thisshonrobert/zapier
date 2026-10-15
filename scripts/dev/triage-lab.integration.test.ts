import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { PrismaClient } from "../../packages/db/generated/prisma/client.ts";
import { createWebhookApp } from "../../apps/webhook/app.ts";
import { assertLabDatabase, assertLabMarker, type LabMarker } from "./triage-lab-config.ts";
import { checkOwnership, seedLab, seedLabScenarios } from "./triage-lab-store.ts";

const integration = process.env.TRIAGE_LAB_INTEGRATION === "true" ? test : test.skip;
async function fixture() {
  const url = new URL(process.env.TRIAGE_LAB_DATABASE_URL ?? process.env.DATABASE_URL ?? "");
  if (!process.env.TRIAGE_LAB_DATABASE_URL) url.pathname = "/triage_lab";
  assertLabDatabase(url.toString());
  url.searchParams.delete("schema");
  const state = JSON.parse(await readFile(new URL("../../.tmp-turbo-user/triage-lab/local-state.json", import.meta.url), "utf8")) as { marker: LabMarker };
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try { await checkOwnership(client, state.marker); } catch (error) { client.release(); await pool.end(); throw error; }
  return { url: url.toString(), pool, client, marker: state.marker };
}

integration("real PostgreSQL concurrent seeding is idempotent and preserves owner repairs", async () => {
  const { pool, client, marker } = await fixture();
  let other: pg.PoolClient | undefined;
  let actionId: string | undefined;
  let original: unknown;
  try {
    const users = await client.query('SELECT id,email,"isSupportOperator" FROM "User" ORDER BY id');
    const zaps = await client.query('SELECT id,"userId" FROM "Zap" ORDER BY id');
    expect(users.rows).toHaveLength(5);
    expect(zaps.rows).toHaveLength(39);
    expect(users.rows.find(row => row.email === "thisshonrobert0205@gmail.com").isSupportOperator).toBe(false);
    const action = await client.query('SELECT id,metadata FROM "Action" ORDER BY id LIMIT 1');
    actionId = action.rows[0].id; original = action.rows[0].metadata;
    const repaired = { subject: "owner repair must survive a seed" };
    await client.query('UPDATE "Action" SET metadata=$1::jsonb WHERE id=$2', [JSON.stringify(repaired), actionId]);
    other = await pool.connect();
    await Promise.all([seedLab(client, marker, "unused-existing-hash"), seedLab(other, marker, "unused-existing-hash")]);
    await Promise.all([seedLabScenarios(client, marker), seedLabScenarios(other, marker)]);
    expect((await client.query('SELECT id,email,"isSupportOperator" FROM "User" ORDER BY id')).rows).toEqual(users.rows);
    expect((await client.query('SELECT id,"userId" FROM "Zap" ORDER BY id')).rows).toEqual(zaps.rows);
    expect((await client.query('SELECT metadata FROM "Action" WHERE id=$1', [actionId])).rows[0].metadata).toEqual(repaired);
  } finally {
    if (actionId) await client.query('UPDATE "Action" SET metadata=$1::jsonb WHERE id=$2', [JSON.stringify(original), actionId]);
    other?.release(); client.release(); await pool.end();
  }
}, 30_000);

integration("real PostgreSQL webhook ownership mismatch creates no rows; accepted input creates an atomic pair", async () => {
  const { pool, client, url, marker } = await fixture();
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const server = createWebhookApp(prisma as never, "integration-secret").listen(0, "127.0.0.1");
  const nonce = randomUUID();
  try {
    assertLabMarker(marker, marker);
    const zaps = (await client.query('SELECT id,"userId" FROM "Zap" ORDER BY "userId",id')).rows;
    const zap = zaps[0]; const differentOwner = zaps.find(row => row.userId !== zap.userId).userId;
    const before = (await client.query('SELECT count(*)::int AS count FROM "ZapRun"')).rows[0].count;
    const port = (server.address() as { port: number }).port;
    const post = (owner: number, secret: string) => fetch(`http://127.0.0.1:${port}/hooks/catch/${owner}/${zap.id}`, {
      method: "POST", headers: { "content-type": "application/json", "x-zap-secret": secret },
      body: JSON.stringify({ phase16a_test: nonce }),
    });
    expect((await post(zap.userId, "wrong")).status).toBe(401);
    expect((await post(differentOwner, "integration-secret")).status).toBe(404);
    expect((await client.query('SELECT count(*)::int AS count FROM "ZapRun"')).rows[0].count).toBe(before);
    expect((await post(zap.userId, "integration-secret")).status).toBe(200);
    const pairs = await client.query('SELECT r.id FROM "ZapRun" r JOIN "ZapRunOutbox" o ON o."zapRunId"=r.id WHERE r.metadata->>\'phase16a_test\'=$1', [nonce]);
    expect(pairs.rows).toHaveLength(1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.$disconnect();
    await client.query('DELETE FROM "ZapRunOutbox" WHERE "zapRunId" IN (SELECT id FROM "ZapRun" WHERE metadata->>\'phase16a_test\'=$1)', [nonce]);
    await client.query('DELETE FROM "ZapRun" WHERE metadata->>\'phase16a_test\'=$1', [nonce]);
    client.release(); await pool.end();
  }
}, 30_000);
