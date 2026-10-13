import { expect, test } from "bun:test";
import type pg from "pg";
import { readFile } from "node:fs/promises";
import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { executeTaskC, prepareTaskCExecution, reserveTaskCSlot } from "../src/evaluation/task-c-execute.ts";

const identity = "a".repeat(64);
function budgetPool(priorReservations: number, priorRequests = priorReservations) {
  const statements: string[] = [];
  const client = {
    async query(sql: string) {
      statements.push(sql);
      if (sql.includes("SELECT 1 FROM ai_agent.task_c_evaluation_reservation"))
        return { rowCount: 0, rows: [] };
      if (sql.includes("AS tokens,")) return { rows: [{ tokens: String(priorReservations * 64000),
        cents: String(priorReservations * 16), requests: priorRequests, active: 0,
        eval_in_progress: 0, stopped: 0, last_provider_started_at: null }] };
      return { rows: [] };
    },
    release() {},
  };
  return { statements, pool: { connect: async () => client } as unknown as pg.Pool };
}

test("the fourth global reservation is admitted atomically, while the fifth is refused", async () => {
  const fourth = budgetPool(3);
  expect(await reserveTaskCSlot(fourth.pool, identity, 4)).toMatchObject({ state: "reserved" });
  expect(fourth.statements.join("\n")).toContain("pg_advisory_xact_lock(812084)");
  expect(fourth.statements.join("\n")).toContain("INSERT INTO ai_agent.task_c_evaluation_reservation");
  expect(fourth.statements.at(-1)).toBe("COMMIT");

  const fifth = budgetPool(4);
  expect(await reserveTaskCSlot(fifth.pool, identity, 5)).toBe("allowance_unavailable");
  expect(fifth.statements.join("\n")).not.toContain("INSERT INTO ai_agent.task_c_evaluation_reservation");
  expect(fifth.statements.at(-1)).toBe("ROLLBACK");
});

test("a failed prior attempt still consumes its full conservative reservation", async () => {
  const priorFailure = budgetPool(4);
  expect(await reserveTaskCSlot(priorFailure.pool, identity, 6)).toBe("allowance_unavailable");
  expect(priorFailure.statements.join("\n")).toContain("reserved_tokens");
  expect(priorFailure.statements.join("\n")).toContain("reserved_cents");
});

test("production admission reads the same evaluation reservation table and fails closed when absent", async () => {
  const source = await readFile("apps/ai_agent/src/investigation-store.ts", "utf8");
  const migration = await readFile("apps/ai_agent/migrations/0006_task_c_evaluation_reservation.sql", "utf8");
  expect(source).toContain("pg_advisory_xact_lock(812084)");
  expect(source.match(/FROM ai_agent\.task_c_evaluation_reservation/g)?.length).toBeGreaterThanOrEqual(6);
  expect(source).not.toContain("to_regclass('ai_agent.task_c_evaluation_reservation')");
  expect(migration).toContain("PRIMARY KEY (source_manifest_hash, slot)");
});

test("a countTokens 429 stops before generation and leaves one durable failed slot", async () => {
  const directory = join(process.cwd(), "apps/ai_agent/evaluation/production-selection/runs",
    `task-c-execute-test-${randomUUID()}`);
  const mock = budgetPool(0);
  (mock.pool as any).query = async () => ({ rows: [] });
  try {
    await prepareTaskCExecution(directory);
    const endpoints: string[] = [];
    const rows = await executeTaskC(directory, mock.pool, "offline-key", async url => {
      endpoints.push(String(url));
      return new Response("{}", { status: 429 });
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.requestStatuses).toEqual([429]);
    expect(rows[0]?.failure).toBe("generation_failed");
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEndWith(":countTokens");
    const request = JSON.parse(await readFile(join(directory, "request-1-1.json"), "utf8"));
    const result = JSON.parse(await readFile(join(directory, "result-1.json"), "utf8"));
    expect(request.status).toBe(429);
    expect(result.semanticReview).toBeNull();
    expect(mock.statements.join("\n")).toContain("INSERT INTO ai_agent.task_c_evaluation_reservation");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

