import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { InvestigationStore } from "../src/investigation-store.ts";
import { reserveTaskCSlot } from "../src/evaluation/task-c-execute.ts";

const url = process.env.AI_AGENT_OPERATIONAL_TEST_DATABASE_URL;
const isolated = process.env.PHASE14A_DOCKER_PROJECT === "zapier-phase14a" &&
  /^postgres(?:ql)?:\/\/[^/]+@127\.0\.0\.1:54329\/phase14a_[0-9a-f]{12}$/.test(url ?? "");

test.skipIf(!isolated)("Task C and production claims share the disposable database allowance", async () => {
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const previous = Object.fromEntries([
    "INVESTIGATION_ENABLED", "INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS",
    "INVESTIGATION_OUTPUT_USD_PER_MILLION_TOKENS",
  ].map(name => [name, process.env[name]]));
  try {
    for (const name of ["0001_investigations.sql", "0003_investigation_events.sql",
      "0004_operational_budget.sql", "0006_task_c_evaluation_reservation.sql"])
      await pool.query(await readFile(`apps/ai_agent/migrations/${name}`, "utf8"));
    process.env.INVESTIGATION_ENABLED = "true";
    process.env.INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS = "0.30";
    process.env.INVESTIGATION_OUTPUT_USD_PER_MILLION_TOKENS = "2.50";
    const run = randomUUID().replaceAll("-", "").padEnd(64, "a");
    for (let slot = 1; slot <= 4; slot++) {
      expect(await reserveTaskCSlot(pool, run, slot)).toMatchObject({ state: "reserved" });
      // Even a failed attempt has no refund; only its lifecycle status changes.
      await pool.query(`UPDATE ai_agent.task_c_evaluation_reservation SET state='finished'
        WHERE source_manifest_hash=$1 AND slot=$2`, [run, slot]);
    }
    expect(await reserveTaskCSlot(pool, run, 1)).toBe("already_reserved");
    expect(await reserveTaskCSlot(pool, run, 5)).toBe("allowance_unavailable");
    const { rows: [totals] } = await pool.query(`SELECT count(*)::int AS attempts,
      sum(reserved_tokens)::int AS tokens, sum(reserved_cents)::int AS cents
      FROM ai_agent.task_c_evaluation_reservation`);
    expect(totals).toMatchObject({ attempts: 4, tokens: 256000, cents: 64 });

    await pool.query(`INSERT INTO ai_agent.investigation
      (id,case_id,zap_run_id,stage,subject_owner_id,actor_id,support_operator_id,
        idempotency_key,status,checkpoint_thread_id)
      VALUES ($1,$2,$3,0,1,2,2,$4,'queued',$5)`,
    [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()]);
    expect(await new InvestigationStore(pool).claimNext()).toBeNull();
    const { rows: [production] } = await pool.query(`SELECT count(*)::int AS rows FROM ai_agent.investigation_budget`);
    expect(production.rows).toBe(0);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    await pool.end();
  }
});
