import { expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { agentPool, migrateAgent } from "../../../apps/ai_agent/src/checkpoint.ts";
import { InvestigationStore } from "../../../apps/ai_agent/src/investigation-store.ts";
import { createInvestigationPoller } from "../../../apps/ai_agent/src/runner.ts";
import { createPostgresFixture } from "../../../apps/primary_backend/tests/postgres-fixture.ts";

const databaseUrl = process.env.AI_AGENT_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.startsWith("/phase14a_"))
  throw new Error("Operational drills require the disposable Phase 14A database");
const project = process.env.PHASE14A_DOCKER_PROJECT;
if (project !== "zapier-phase14a") throw new Error("Unexpected Docker project");
const docker = (...args: string[]) => {
  const result = spawnSync("docker", ["compose", "-f", "scripts/phases/phase14a/compose.yaml",
    "-p", project, ...args], { timeout: 45_000, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Phase 14A Docker command failed: ${args[0]}`);
};

async function freePort() {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}

test("runtime grants isolate authority and seven-day stream visibility preserves immutable history", async () => {
  const pool = agentPool(databaseUrl);
  const role = `phase14a_runtime_${randomUUID().replaceAll("-", "")}`;
  const authority = await createPostgresFixture();
  try {
    await migrateAgent(pool, databaseUrl);
    const store = new InvestigationStore(pool);
    const id = randomUUID(), caseId = randomUUID(), owner = 900001;
    await store.start({ id, caseId, zapRunId: randomUUID(), stage: 0,
      subjectOwnerId: owner, actorId: 900002, supportOperatorId: 900002, idempotencyKey: randomUUID() });
    await pool.query(`UPDATE ai_agent.investigation_event SET created_at = now() - interval '8 days' WHERE investigation_id = $1`, [id])
      .then(() => { throw new Error("immutable event update unexpectedly succeeded"); }, () => undefined);
    // Backdate with the trigger disabled only in this disposable fixture; restore it immediately.
    await pool.query("ALTER TABLE ai_agent.investigation_event DISABLE TRIGGER investigation_event_immutable");
    try { await pool.query("UPDATE ai_agent.investigation_event SET created_at = now() - interval '8 days' WHERE investigation_id = $1", [id]); }
    finally { await pool.query("ALTER TABLE ai_agent.investigation_event ENABLE TRIGGER investigation_event_immutable"); }
    const visible = await store.events(id, caseId, owner, 0);
    expect(visible.events).toEqual([]);
    expect(visible.snapshot?.sequence).toBe(1);
    const history = await pool.query("SELECT count(*)::int AS n FROM ai_agent.investigation_event WHERE investigation_id = $1", [id]);
    expect(history.rows[0].n).toBe(1);
    await pool.query("UPDATE ai_agent.investigation SET status = 'error' WHERE id = $1", [id]);
    await pool.query(`CREATE ROLE ${role}`);
    await pool.query(`GRANT USAGE ON SCHEMA ai_agent TO ${role}`);
    await pool.query(`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ai_agent TO ${role}`);
    await pool.query(`GRANT USAGE ON SCHEMA "${authority.schema}" TO ${role}`);
    const client = await pool.connect();
    try {
      await client.query(`SET ROLE ${role}`);
      expect((await client.query("SELECT count(*)::int AS n FROM ai_agent.investigation")).rows[0].n).toBe(1);
      expect((await client.query("UPDATE ai_agent.investigation SET updated_at = updated_at WHERE id = $1", [id])).rowCount).toBe(1);
      expect((await client.query("SELECT count(*)::int AS n FROM ai_agent.checkpoints")).rows[0].n).toBeGreaterThanOrEqual(0);
      for (const table of ["TriageApproval", "ReplayRequest", "TriageAccessAudit"]) {
        for (const sql of [`SELECT count(*) FROM "${authority.schema}"."${table}"`,
          `INSERT INTO "${authority.schema}"."${table}" DEFAULT VALUES`,
          `UPDATE "${authority.schema}"."${table}" SET id = id`]) {
          let denied = false;
          try { await client.query(sql); } catch (error) { denied = (error as { code?: string }).code === "42501"; }
          expect(denied).toBe(true);
        }
      }
    } finally { await client.query("RESET ROLE"); client.release(); }
  } finally {
    await pool.query(`DROP OWNED BY ${role}`).catch(() => undefined);
    await pool.query(`DROP ROLE IF EXISTS ${role}`).catch(() => undefined);
    await pool.end();
    await authority.close();
  }
}, 60_000);

test("shutdown drains a claimed stub investigation and refuses the next queued claim", async () => {
  const pool = agentPool(databaseUrl);
  try {
    await migrateAgent(pool, databaseUrl);
    const store = new InvestigationStore(pool);
    const actorId = 910002, subjectOwnerId = 910001;
    const jobs = [];
    for (let stage = 0; stage < 2; stage++) jobs.push(await store.start({
      id: randomUUID(), caseId: randomUUID(), zapRunId: randomUUID(), stage,
      actorId, supportOperatorId: actorId, subjectOwnerId, idempotencyKey: randomUUID(),
    }));
    let entered!: () => void, release!: () => void;
    const claimed = new Promise<void>(resolve => { entered = resolve; });
    const blocked = new Promise<void>(resolve => { release = resolve; });
    const poller = createInvestigationPoller(store, async job => {
      expect(job.id).toBe(jobs[0]!.id);
      entered();
      await blocked;
      return { evidence: { safe: true }, result: { status: "completed" } };
    }, () => true, () => { throw new Error("Stub poll failed"); });
    poller.start();
    await claimed;
    const stopping = poller.stop();
    expect(poller.accepting()).toBe(false);
    release();
    await stopping;
    expect((await store.read(jobs[0]!.id, jobs[0]!.binding.caseId, subjectOwnerId)).status).toBe("proposed");
    expect((await store.read(jobs[1]!.id, jobs[1]!.binding.caseId, subjectOwnerId)).status).toBe("queued");
  } finally { await pool.end(); }
}, 30_000);

test("disabled service survives database stop/restart and Windows forced signal exit", async () => {
  const pool = agentPool(databaseUrl);
  await migrateAgent(pool, databaseUrl);
  await pool.end();
  const port = await freePort();
  const secret = "phase14a-local-service-secret-at-least-32-chars";
  const bun = process.env.BUN_PATH ?? `${process.env.APPDATA}/npm/node_modules/bun/bin/bun.exe`;
  const env = { ...process.env, PORT: String(port), AI_AGENT_DATABASE_URL: databaseUrl,
    TRIAGE_SERVICE_SECRET: secret, INVESTIGATION_ENABLED: "false", GEMINI_API_KEY: "",
    LANGFUSE_PUBLIC_KEY: "", LANGFUSE_SECRET_KEY: "" };
  let child: ReturnType<typeof spawn> | undefined;
  const status = () => fetch(`http://127.0.0.1:${port}/private/v1/investigations/status`,
    { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15_000) });
  async function start() {
    child = spawn(bun, ["apps/ai_agent/src/index.ts"], { env, stdio: "ignore" });
    for (let attempt = 0; attempt < 60; attempt++) {
      try { if ((await status()).status === 200) return; } catch { /* startup */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error("Agent process did not become ready");
  }
  async function stop() {
    const active = child;
    if (!active) return;
    active.kill("SIGINT");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve =>
        active.once("exit", (code, signal) => resolve({ code, signal }))),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Agent shutdown timed out")), 15_000); }),
    ]).finally(() => { if (timer) clearTimeout(timer); });
    expect(result.code === 0 || result.signal === "SIGINT").toBe(true);
    child = undefined;
  }
  try {
    await start();
    expect((await status()).status).toBe(200);
    docker("stop", "postgres");
    expect((await status()).status).toBe(503);
    docker("start", "postgres");
    docker("up", "-d", "--wait", "postgres");
    expect((await status()).status).toBe(200);
    await stop();
    await start();
    expect((await status()).status).toBe(200);
    await stop();
  } finally {
    if (child) child.kill();
    docker("start", "postgres");
    docker("up", "-d", "--wait", "postgres");
  }
}, 120_000);
