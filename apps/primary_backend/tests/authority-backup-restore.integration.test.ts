import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rmdir, unlink } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { agentDatabaseUrl } from "../../ai_agent/src/checkpoint.ts";
import { ReplayService } from "../services/replay.ts";
import { createPostgresFixture, setOperator } from "./postgres-fixture.ts";
import { setupReplay } from "./replay-fixture.ts";

const dump = process.env.PG_DUMP_PATH ?? "pg_dump";
const restore = process.env.PG_RESTORE_PATH ?? "pg_restore";
const dockerProject = process.env.PHASE14A_DOCKER_PROJECT;
const available = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const enabled = Boolean(process.env.DATABASE_URL) && (Boolean(dockerProject) || available(dump) && available(restore));
function run(command: string, args: string[], databaseUrl: string) {
  const url = new URL(agentDatabaseUrl(databaseUrl));
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432",
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password) };
  if (spawnSync(command, args, { stdio: "ignore", timeout: 30_000, env }).status !== 0)
    throw new Error("PostgreSQL backup or restore failed");
}

function dockerTool(command: "pg_dump" | "pg_restore", args: string[], databaseUrl: string, input?: Buffer) {
  const url = new URL(agentDatabaseUrl(databaseUrl));
  const result = spawnSync("docker", ["compose", "-f", "scripts/phases/phase14a/compose.yaml",
    "-p", dockerProject!, "exec", "-T", "postgres", command,
    "-U", decodeURIComponent(url.username), "-d", decodeURIComponent(url.pathname.slice(1)), ...args],
  { input, timeout: 30_000, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("Container PostgreSQL backup or restore failed");
  return result.stdout as Buffer;
}

test.skipIf(!enabled)("whole-schema backup/restore preserves approval authority, consumed replay and revocation", async () => {
  const fixture = await createPostgresFixture();
  const directory = await mkdtemp(join(tmpdir(), "phase14a-restore-"));
  const backup = join(directory, `${randomUUID()}.dump`);
  const previousHandler = process.env.WORKER_HANDLER_VERSION;
  try {
    process.env.WORKER_HANDLER_VERSION = "test-worker-v1";
    const { input } = await setupReplay(fixture.db);
    await new ReplayService(fixture.db).request(input);
    await setOperator(fixture.db, input.actorId, false);
    const authoritySql = Prisma.sql`
      SELECT to_jsonb(approval) AS approval, to_jsonb(request) AS request,
        to_jsonb(execution) AS execution, to_jsonb(audit) AS audit,
        to_jsonb(actor) AS actor
      FROM "TriageApproval" approval JOIN "ReplayRequest" request ON request."approvalId" = approval.id
        JOIN "ReplayExecution" execution ON execution."requestId" = request.id
        JOIN "TriageAccessAudit" audit ON audit.id = request."auditId"
        JOIN "User" actor ON actor.id = request."requestedBy"
      WHERE approval.id = ${input.approvalId}`;
    const before = await fixture.db.$queryRaw<Record<string, unknown>[]>(authoritySql);
    expect(before).toHaveLength(1);
    const url = process.env.DATABASE_URL!;
    if (dockerProject) writeFileSync(backup, dockerTool("pg_dump", ["--format=custom", `--schema=${fixture.schema}`], url));
    else run(dump, ["--format=custom", `--schema=${fixture.schema}`, `--file=${backup}`], url);
    await fixture.db.$disconnect();
    await fixture.pool.query(`DROP SCHEMA "${fixture.schema}" CASCADE`);
    if (dockerProject) dockerTool("pg_restore", ["--exit-on-error"], url, readFileSync(backup));
    else run(restore, ["--exit-on-error", `--dbname=${decodeURIComponent(new URL(url).pathname.slice(1))}`, backup], url);
    expect(await fixture.db.$queryRaw<Record<string, unknown>[]>(authoritySql)).toEqual(before);
    const [operator] = await fixture.db.$queryRaw<{ isSupportOperator: boolean }[]>(Prisma.sql`
      SELECT "isSupportOperator" FROM "User" WHERE id = ${input.actorId}`);
    expect(operator?.isSupportOperator).toBe(false);
    await expect(new ReplayService(fixture.db).request({ ...input, requestId: randomUUID() }))
      .rejects.toThrow("operator permission revoked");
    await setOperator(fixture.db, input.actorId, true);
    await expect(new ReplayService(fixture.db).request({ ...input, requestId: randomUUID() }))
      .rejects.toThrow("approval consumed or replay_limit");
    await expect(Promise.resolve(fixture.db.$executeRaw(Prisma.sql`
      UPDATE "ReplayRequest" SET "requestedBy" = 0 WHERE id = ${input.requestId}`))).rejects.toThrow();
  } finally {
    if (previousHandler === undefined) delete process.env.WORKER_HANDLER_VERSION;
    else process.env.WORKER_HANDLER_VERSION = previousHandler;
    await fixture.close();
    await unlink(backup).catch(() => undefined);
    await rmdir(directory);
  }
}, 30_000);
