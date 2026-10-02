import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { InvestigationStore } from "../src/investigation-store.ts";
import { agentDatabaseUrl } from "../src/checkpoint.ts";

const url = process.env.AI_AGENT_DATABASE_URL ?? process.env.DATABASE_URL;
const schema = `test_events_${randomUUID().replaceAll("-", "")}`;
const pool = url ? new pg.Pool({ connectionString: agentDatabaseUrl(url), connectionTimeoutMillis: 5000 }) : null;
const sql = (statement: string) => statement.replaceAll("ai_agent", schema);
const query = (statement: string, params?: unknown[]) => pool!.query(sql(statement), params);
const store = new InvestigationStore({ query, connect: async () => {
  const client = await pool!.connect();
  return { query: (statement: string, params?: unknown[]) => client.query(sql(statement), params),
    release: () => client.release() };
} } as never);
before(async () => {
  if (!pool) return;
  for (const name of ["0001_investigations.sql", "0002_investigation_decisions.sql", "0003_investigation_events.sql"])
    await query(await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
}, { timeout: 30_000 });
after(async () => {
  if (pool) { await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await pool.end(); }
}, { timeout: 30_000 });

test("PostgreSQL events are atomic, durable, ordered and cursor recovery is scoped", { skip: !pool, timeout: 30_000 }, async () => {
  const input = { id: randomUUID(), caseId: randomUUID(), zapRunId: randomUUID(), stage: 0,
    subjectOwnerId: 9, actorId: 4, supportOperatorId: 4, idempotencyKey: randomUUID() };
  const job = await store.start(input);
  await store.start(input);
  assert.deepEqual(await store.events(job.id, input.caseId, 9, null), {
    snapshot: { sequence: 1, status: "queued" }, events: [],
  });
  const claimed = await store.claimNext();
  await store.finish(job.id, claimed!.leaseToken!, { redacted: true }, { status: "completed" }, "proposed");
  const decisionId = randomUUID();
  await Promise.all([store.applyDecision(job.id, input.caseId, 9, decisionId, "approve"),
    store.applyDecision(job.id, input.caseId, 9, decisionId, "approve")]);
  assert.deepEqual(await store.events(job.id, input.caseId, 9, 1), { snapshot: null, events: [
    { sequence: 2, status: "investigating" }, { sequence: 3, status: "proposed" }, { sequence: 4, status: "approved" },
  ] });
  await assert.rejects(store.events(job.id, randomUUID(), 9, 0), /not found/);
  await assert.rejects(store.events(job.id, input.caseId, 10, 0), /not found/);
  await assert.rejects(query("UPDATE ai_agent.investigation_event SET status = 'error' WHERE investigation_id = $1", [job.id]), /immutable/);
  // A rolled-back job transition must not leave a phantom event or advance the watermark.
  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql("UPDATE ai_agent.investigation SET status = 'error' WHERE id = $1"), [job.id]);
    await client.query("ROLLBACK");
  } finally { client.release(); }
  assert.deepEqual(await store.events(job.id, input.caseId, 9, 4), { snapshot: null, events: [] });
  // Simulate history aging while retaining immutable rows; all subsequent reads get the saved status watermark.
  await query("ALTER TABLE ai_agent.investigation_event DISABLE TRIGGER investigation_event_immutable");
  await query("UPDATE ai_agent.investigation_event SET created_at = now() - interval '8 days' WHERE investigation_id = $1", [job.id]);
  await query("ALTER TABLE ai_agent.investigation_event ENABLE TRIGGER investigation_event_immutable");
  for (const cursor of [0, 1, 99]) assert.deepEqual(await store.events(job.id, input.caseId, 9, cursor), {
    snapshot: { sequence: 4, status: "approved" }, events: [],
  });
});
