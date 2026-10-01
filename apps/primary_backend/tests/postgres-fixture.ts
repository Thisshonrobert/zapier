import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";
import { PrismaClient } from "../../../packages/db/generated/prisma/client.ts";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { agentDatabaseUrl } from "../../ai_agent/src/checkpoint.ts";

// Each suite uses its own schema, including immutable authority rows. Never delete shared cases.
export async function createPostgresFixture() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Explicitly load DATABASE_URL for PostgreSQL tests");
  const schema = `test_replay_${randomUUID().replaceAll("-", "")}`;
  const pool = new pg.Pool({ connectionString: agentDatabaseUrl(databaseUrl) });
  await pool.query(`CREATE SCHEMA "${schema}"`);
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schema}"`);
    const directory = "packages/db/prisma/migrations";
    const entries = await readdir(directory, { withFileTypes: true });
    const migrations = entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    for (const migration of migrations) await client.query(await readFile(`${directory}/${migration}/migration.sql`, "utf8"));
  } finally { client.release(); }
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  return { db, pool, schema, async close() {
    await db.$disconnect();
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pool.end();
  } };
}

export async function setOperator(db: PrismaClient, actorId: number, allowed: boolean) {
  await db.$executeRaw(Prisma.sql`UPDATE "User" SET "isSupportOperator" = ${allowed} WHERE id = ${actorId}`);
}
