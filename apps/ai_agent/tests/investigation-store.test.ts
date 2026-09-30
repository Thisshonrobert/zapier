import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

import { agentDatabaseUrl, migrateAgent } from "../src/checkpoint.ts";
import { InvestigationStore } from "../src/investigation-store.ts";

const databaseUrl = process.env.AI_AGENT_DATABASE_URL ?? process.env.DATABASE_URL;
const pool = databaseUrl ? new pg.Pool({ connectionString: agentDatabaseUrl(databaseUrl) }) : undefined;
const store = pool ? new InvestigationStore(pool) : undefined;
const caseId = randomUUID();
const actorId = 491901;
const ownerId = 491902;

beforeAll(async () => {
  if (pool) {
    await migrateAgent(pool, databaseUrl!);
    await pool.query(`UPDATE ai_agent.investigation SET status = 'error', lease_token = NULL, lease_until = NULL
      WHERE actor_id = $1 AND status IN ('queued', 'investigating', 'proposed', 'awaiting_approval')`, [actorId]);
  }
});
afterAll(async () => {
  if (pool) {
    await pool.query(`UPDATE ai_agent.investigation SET status = 'error', lease_token = NULL, lease_until = NULL
      WHERE actor_id = $1 AND status IN ('queued', 'investigating', 'proposed', 'awaiting_approval')`, [actorId]);
    await pool.end();
  }
});

describe.skipIf(!store)("Phase 8 agent PostgreSQL jobs", () => {
  test("duplicate starts and concurrent claims preserve one active case", async () => {
    const first = await store!.start({ id: randomUUID(), caseId, zapRunId: randomUUID(), stage: 1,
      subjectOwnerId: ownerId, actorId, supportOperatorId: actorId, idempotencyKey: randomUUID() });
    const duplicate = await store!.start({ ...first.binding, id: randomUUID(), idempotencyKey: first.idempotencyKey });
    expect(duplicate.id).toBe(first.id);
    const competing = await store!.start({ ...first.binding, id: randomUUID(), idempotencyKey: randomUUID() });
    expect(competing.id).toBe(first.id);
    const claims = await Promise.all([store!.claimNext(1), store!.claimNext(1)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)?.id).toBe(first.id);
  });

  test("an expired lease can be reclaimed after restart without changing actor or owner", async () => {
    const otherCase = randomUUID();
    const job = await store!.start({ id: randomUUID(), caseId: otherCase, zapRunId: randomUUID(), stage: 0,
      subjectOwnerId: ownerId, actorId, supportOperatorId: actorId, idempotencyKey: randomUUID() });
    const first = await store!.claimNext(2);
    expect(first?.id).toBe(job.id);
    await pool!.query("UPDATE ai_agent.investigation SET lease_until = NOW() - INTERVAL '1 second' WHERE id = $1", [job.id]);
    const recovered = await new InvestigationStore(pool!).claimNext(2);
    expect(recovered?.id).toBe(job.id);
    expect(recovered?.binding).toEqual(job.binding);
    expect(recovered?.leaseToken).not.toBe(first?.leaseToken);
  });

  test("immutable result rows reject overwrite and scoped reads reject another owner", async () => {
    const otherCase = randomUUID();
    const job = await store!.start({ id: randomUUID(), caseId: otherCase, zapRunId: randomUUID(), stage: 0,
      subjectOwnerId: ownerId, actorId, supportOperatorId: actorId, idempotencyKey: randomUUID() });
    const claimed = await store!.claimNext(3);
    expect(claimed?.id).toBe(job.id);
    await store!.finish(job.id, claimed!.leaseToken!, { status: "completed" }, { diagnosis: "redacted" }, "proposed");
    expect(await store!.read(job.id, otherCase, ownerId)).toMatchObject({ status: "proposed", result: { diagnosis: "redacted" } });
    let denied = false;
    try { await store!.read(job.id, otherCase, ownerId + 1); }
    catch (error) { denied = (error as Error).message === "Investigation not found"; }
    expect(denied).toBe(true);
    let overwriteError: unknown;
    try {
      await store!.finish(job.id, claimed!.leaseToken!, { status: "changed" },
        { diagnosis: "changed" }, "proposed");
    } catch (error) { overwriteError = error; }
    expect(overwriteError).toBeInstanceOf(Error);
    expect((overwriteError as Error).message).toBe("Investigation lease lost");
    expect(await store!.read(job.id, otherCase, ownerId)).toMatchObject({
      evidence: { status: "completed" }, result: { diagnosis: "redacted" },
    });
  });
});
