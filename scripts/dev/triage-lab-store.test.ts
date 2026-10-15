import { expect, test } from "bun:test";
import { seedLab, checkOwnership, migrateLabAgent } from "./triage-lab-store.ts";
import { labResources } from "./triage-lab-config.ts";

const marker = { version: 1, database: "triage_lab", labId: "a".repeat(32),
  resourceFingerprint: "test", ...labResources("a".repeat(32)) };

test("existing database marker must match before any seed or migration writes", async () => {
  const calls: string[] = [];
  const db = { query: async (sql: string) => { calls.push(sql); return { rows: [{ marker: { ...marker, labId: "b".repeat(32) } }] }; } };
  await expect(checkOwnership(db as never, marker)).rejects.toThrow("marker mismatch");
  expect(calls).toHaveLength(1);
  expect(calls[0]).toContain("SELECT");
});

test("seed refuses to adopt an unowned account and rolls back", async () => {
  const sql: string[] = [];
  const db = { query: async (query: string) => {
    sql.push(query);
    if (query.includes("SELECT marker")) return { rows: [{ marker }] };
    if (query.includes('FROM "User"')) return { rows: [{ id: 77 }] };
    return { rows: [] };
  } };
  await expect(seedLab(db as never, marker, "hashed-password")).rejects.toThrow("unowned account");
  expect(sql).toContain("ROLLBACK");
  expect(sql.some(query => query.includes('INSERT INTO "User"'))).toBe(false);
});

test("agent migrations are journaled, serialized and skip completed setup", async () => {
  let calls = 0;
  const queries: string[] = [];
  const db = { query: async (sql: string) => {
    queries.push(sql);
    return { rows: sql.includes("SELECT digest") ? [{ digest: "same" }] : [] };
  } };
  await migrateLabAgent(db as never, [{ name: "agent-v1", digest: "same" }], async () => { calls++; });
  expect(calls).toBe(0);
  expect(queries.some(q => q.includes("pg_advisory_lock"))).toBe(true);
  expect(queries.some(q => q.includes("pg_advisory_unlock"))).toBe(true);
  await expect(migrateLabAgent(db as never, [{ name: "agent-v1", digest: "changed" }], async () => {}))
    .rejects.toThrow("migration content changed");
});

test("failed agent setup is never journaled and releases its migration lock", async () => {
  const queries: string[] = [];
  const db = { query: async (sql: string) => { queries.push(sql); return { rows: [] }; } };
  await expect(migrateLabAgent(db as never, [{ name: "agent-v1", digest: "same" }], async () => {
    throw new Error("checkpoint setup failed");
  })).rejects.toThrow("checkpoint setup failed");
  expect(queries.some(query => query.includes("INSERT"))).toBe(false);
  expect(queries.at(-1)).toContain("pg_advisory_unlock");
});
