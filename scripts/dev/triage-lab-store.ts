import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import pg from "pg";
import { assertLabMarker, seedAccounts, type LabMarker } from "./triage-lab-config.ts";
import { labScenarios } from "./triage-lab-scenarios.ts";

// Prisma timestamp columns store UTC without an offset. pg otherwise interprets
// them in the host timezone, making the same DLQ evidence appear several hours apart.
export const labSqlTypes = { getTypeParser: (oid: number) => oid === 1114
  ? (value: string) => new Date(`${value.replace(" ", "T")}Z`)
  : pg.types.getTypeParser(oid) };

export async function checkOwnership(client: PoolClient, marker: LabMarker) {
  const result = await client.query("SELECT marker FROM triage_lab.ownership WHERE singleton = true");
  assertLabMarker(result.rows[0]?.marker, marker);
}

export async function initializeOwnership(client: PoolClient, marker: LabMarker) {
  await client.query("BEGIN");
  try {
    await client.query(`CREATE SCHEMA triage_lab;
      CREATE TABLE triage_lab.ownership (singleton boolean PRIMARY KEY CHECK (singleton), marker jsonb NOT NULL);
      CREATE TABLE triage_lab.seed (key text PRIMARY KEY, resource_id text NOT NULL, desired_role text);
      CREATE TABLE triage_lab.migration (name text PRIMARY KEY, digest text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());`);
    await client.query("INSERT INTO triage_lab.ownership VALUES (true, $1::jsonb)", [JSON.stringify(marker)]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

export async function migrateLabAgent(client: PoolClient, migrations: Array<{ name: string; digest: string }>,
  setup: () => Promise<void>) {
  await client.query("SELECT pg_advisory_lock(16001)");
  try {
    const pending: typeof migrations = [];
    for (const migration of migrations) {
      const existing = await client.query("SELECT digest FROM triage_lab.migration WHERE name = $1", [migration.name]);
      if (existing.rows.length && existing.rows[0].digest !== migration.digest)
        throw new Error(`Lab migration content changed: ${migration.name}`);
      if (!existing.rows.length) pending.push(migration);
    }
    if (!pending.length) return;
    // Existing agent tooling is idempotent. Journal only after checkpoint setup succeeds;
    // a crash may repeat setup safely rather than falsely recording an incomplete migration.
    await setup();
    await client.query("BEGIN");
    try {
      for (const migration of pending) await client.query(
        "INSERT INTO triage_lab.migration (name, digest) VALUES ($1, $2)", [migration.name, migration.digest]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
  } finally { await client.query("SELECT pg_advisory_unlock(16001)"); }
}

export function resourceId(labId: string, key: string) {
  const hex = createHash("sha256").update(`${labId}:${key}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function seedLabScenarios(client: PoolClient, marker: LabMarker) {
  await checkOwnership(client, marker);
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(16002)");
    await client.query(`CREATE TABLE IF NOT EXISTS triage_lab.batch (
      id text PRIMARY KEY, scenarios jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS triage_lab.run (
        nonce text PRIMARY KEY, batch_id text NOT NULL REFERENCES triage_lab.batch(id), scenario text NOT NULL,
        owner_key text NOT NULL, owner_id integer NOT NULL, zap_id text NOT NULL,
        status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','posting','posted')),
        run_id text UNIQUE, UNIQUE (batch_id,scenario,owner_key));
      CREATE TABLE IF NOT EXISTS triage_lab.provider_operation (
        run_id text NOT NULL, stage integer NOT NULL, attempt_id text NOT NULL, operation text NOT NULL,
        provider text NOT NULL, replay boolean NOT NULL, invocations integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(run_id,stage,attempt_id,operation));`);
    for (const account of seedAccounts.filter(a => a.role === "owner")) {
      const owner = await client.query("SELECT resource_id FROM triage_lab.seed WHERE key=$1", [`account:${account.key}`]);
      if (owner.rows.length !== 1) throw new Error("Seed lab accounts before scenarios");
      const ownerId = Number(owner.rows[0].resource_id);
      for (const scenario of labScenarios) {
        const key = `scenario:${account.key}:${scenario.key}`;
        const id = resourceId(marker.labId, key);
        const saved = await client.query("SELECT resource_id FROM triage_lab.seed WHERE key=$1", [key]);
        const existing = await client.query('SELECT "userId" FROM "Zap" WHERE id=$1', [id]);
        if (saved.rows.length) {
          if (saved.rows[0].resource_id !== id || existing.rows[0]?.userId !== ownerId) throw new Error("Lab scenario ownership changed");
          continue; // Seed never overwrites an owner repair or any history.
        }
        if (existing.rows.length) throw new Error("Refusing unowned lab scenario Zap");
        await client.query('INSERT INTO "Zap" (id,name,"userId") VALUES ($1,$2,$3)', [id, `[LAB] ${account.name}: ${scenario.key}`, ownerId]);
        for (const [stage, action] of scenario.actions.entries()) {
          await client.query('INSERT INTO "Action" (id,"actionId",metadata,"zapId","sortingOrder") VALUES ($1,$2,$3::jsonb,$4,$5)',
            [resourceId(marker.labId, `action:${key}:${stage}`), action.type, JSON.stringify(action.metadata), id, stage]);
        }
        await client.query("INSERT INTO triage_lab.seed (key,resource_id) VALUES ($1,$2)", [key, id]);
      }
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

export async function seedLab(client: PoolClient, marker: LabMarker, passwordHash: string) {
  await checkOwnership(client, marker);
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(16002)");
    for (const account of seedAccounts) {
      const key = `account:${account.key}`;
      const owned = await client.query("SELECT resource_id FROM triage_lab.seed WHERE key = $1", [key]);
      const existing = await client.query('SELECT id, email, "isSupportOperator", "isEngineer" FROM "User" WHERE email = $1', [account.email]);
      let id: number;
      if (owned.rows.length) {
        if (!existing.rows.length || String(existing.rows[0].id) !== owned.rows[0].resource_id ||
          existing.rows[0].isSupportOperator !== account.isSupportOperator ||
          existing.rows[0].isEngineer !== account.isEngineer)
          throw new Error(`Lab account ownership/permission changed: ${account.key}`);
        id = existing.rows[0].id;
      } else {
        if (existing.rows.length) throw new Error(`Refusing unowned account: ${account.key}`);
        const inserted = await client.query(
          'INSERT INTO "User" (name,email,password,"isSupportOperator","isEngineer") VALUES ($1,$2,$3,$4,$5) RETURNING id',
          [account.name, account.email, passwordHash, account.isSupportOperator, account.isEngineer]);
        id = inserted.rows[0].id;
        await client.query("INSERT INTO triage_lab.seed (key,resource_id,desired_role) VALUES ($1,$2,$3)",
          [key, String(id), account.role]);
      }
      if (account.role !== "owner") continue;
      for (const provider of ["telegram", "email"]) {
        const zapKey = `zap:${account.key}:${provider}`;
        const zapId = resourceId(marker.labId, zapKey);
        const saved = await client.query("SELECT resource_id FROM triage_lab.seed WHERE key = $1", [zapKey]);
        if (saved.rows.length) {
          const zap = await client.query('SELECT "userId" FROM "Zap" WHERE id = $1', [zapId]);
          if (saved.rows[0].resource_id !== zapId || zap.rows[0]?.userId !== id)
            throw new Error(`Lab Zap ownership changed: ${zapKey}`);
          continue; // Preserve repairs and all original execution history.
        }
        await client.query('INSERT INTO "AvailableAction" (id,name,"imageUrl") VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',
          [provider, provider === "email" ? "Email" : "Telegram", `/${provider}.svg`]);
        await client.query('INSERT INTO "Zap" (id,name,"userId") VALUES ($1,$2,$3)',
          [zapId, `[LAB] ${account.name} ${provider}`, id]);
        // Placeholders only: 16B installs scenario definitions and provider-isolated workers.
        const metadata = provider === "email" ? { to: "owner@example.invalid", subject: "[LAB] Placeholder", body: "Lab only" }
          : { channelUserName: "-100123456", message: "[LAB] Placeholder", botToken: "" };
        await client.query('INSERT INTO "Action" (id,"actionId",metadata,"zapId","sortingOrder") VALUES ($1,$2,$3::jsonb,$4,0)',
          [resourceId(marker.labId, `action:${zapKey}`), provider, JSON.stringify(metadata), zapId]);
        await client.query("INSERT INTO triage_lab.seed (key,resource_id) VALUES ($1,$2)", [zapKey, zapId]);
      }
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}
