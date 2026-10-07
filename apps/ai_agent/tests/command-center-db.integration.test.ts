import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { InvestigationStore } from "../src/investigation-store.ts";
import { agentDatabaseUrl } from "../src/checkpoint.ts";

const databaseUrl = process.env.AI_AGENT_DATABASE_URL;
const schema = `test_command_center_${randomUUID().replaceAll("-", "")}`;
const pool = databaseUrl ? new pg.Pool({ connectionString: agentDatabaseUrl(databaseUrl) }) : null;
const sql = (statement: string) => statement.replaceAll("ai_agent", schema);
const query = (statement: string, params?: unknown[]) => pool!.query(sql(statement), params);
const store = new InvestigationStore({ query, connect: async () => {
  const client = await pool!.connect();
  return { query: (statement: string, params?: unknown[]) => client.query(sql(statement), params), release: () => client.release() };
} } as never);

before(async () => {
  if (!pool) return;
  for (const name of ["0001_investigations.sql", "0002_investigation_decisions.sql", "0003_investigation_events.sql", "0004_operational_budget.sql", "0005_investigation_trace.sql"])
    await query(await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
});
after(async () => {
  if (pool) { await pool.query(`DROP SCHEMA "${schema}" CASCADE`); await pool.end(); }
});

test("durable history is ordered, tenant scoped and trace metadata stays fenced and immutable", { skip: !pool, timeout: 30_000 }, async () => {
  const id = randomUUID(), caseId = randomUUID(), lease = randomUUID();
  await query(`INSERT INTO ai_agent.investigation
    (id, case_id, zap_run_id, stage, subject_owner_id, actor_id, support_operator_id, idempotency_key, status, checkpoint_thread_id)
    VALUES ($1, $2, $3, 0, 9, 4, 4, $4, 'queued', $1)`, [id, caseId, randomUUID(), randomUUID()]);
  await query(`UPDATE ai_agent.investigation SET status = 'investigating', lease_token = $2,
    lease_until = now() + interval '1 minute' WHERE id = $1`, [id, lease]);
  await assert.rejects(store.finish(id, randomUUID(), {}, {}, "proposed", "a".repeat(32)), /lease lost/);
  await assert.rejects(store.finish(id, lease, {}, {}, "proposed", "not-a-trace"), /Invalid trace/);
  await store.finish(id, lease, { safe: true }, { status: "completed" }, "proposed", "a".repeat(32));
  assert.equal((await store.read(id, caseId, 9)).traceId, "a".repeat(32));
  const history = await new InvestigationStore({ query } as never).history(id, caseId, 9);
  assert.deepEqual(history.events.map(event => event.status), ["queued", "investigating", "proposed"]);
  assert.equal(history.currentSequence, 3);
  assert.equal(history.truncated, false);
  assert.ok(Number.isFinite(Date.parse(history.events[0]!.observedAt)));
  await assert.rejects(store.history(id, caseId, 10), /not found/);
  await assert.rejects(store.history(id, randomUUID(), 9), /not found/);
  await assert.rejects(query("UPDATE ai_agent.investigation_snapshot SET trace_id = NULL WHERE investigation_id = $1", [id]), /immutable/);
  await query("ALTER TABLE ai_agent.investigation_event DISABLE TRIGGER investigation_event_immutable");
  await query("UPDATE ai_agent.investigation_event SET created_at = now() - interval '8 days' WHERE investigation_id = $1", [id]);
  await query("ALTER TABLE ai_agent.investigation_event ENABLE TRIGGER investigation_event_immutable");
  assert.deepEqual(await store.history(id, caseId, 9), { currentSequence: 3, currentStatus: "proposed", truncated: true, events: [] });
});

test("timeline returns only the newest 64 retained milestones with a partial-history warning", { skip: !pool, timeout: 30_000 }, async () => {
  const id = randomUUID(), caseId = randomUUID();
  await query(`INSERT INTO ai_agent.investigation
    (id, case_id, zap_run_id, stage, subject_owner_id, actor_id, support_operator_id, idempotency_key, status, checkpoint_thread_id)
    VALUES ($1, $2, $3, 0, 9, 4, 4, $4, 'queued', $1)`, [id, caseId, randomUUID(), randomUUID()]);
  for (let index = 0; index < 66; index++)
    await query("UPDATE ai_agent.investigation SET status = $2 WHERE id = $1", [id, index % 2 ? "queued" : "investigating"]);
  const history = await store.history(id, caseId, 9);
  assert.equal(history.currentSequence, 67);
  assert.equal(history.events.length, 64);
  assert.equal(history.events[0]!.sequence, 4);
  assert.equal(history.events.at(-1)!.sequence, 67);
  assert.equal(history.truncated, true);
});
