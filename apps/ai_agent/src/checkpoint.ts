import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import type { Pool } from "pg";

export function agentDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.searchParams.delete("schema"); // Prisma-only URL option, not a PostgreSQL setting.
  return url.toString();
}

export function createCheckpoint(databaseUrl: string) {
  return PostgresSaver.fromConnString(agentDatabaseUrl(databaseUrl), { schema: "ai_agent" });
}

// Run this controlled migration before starting the service. Request handlers never call setup().
export async function migrateAgent(pool: Pool, databaseUrl: string) {
  for (const filename of ["0001_investigations.sql", "0002_investigation_decisions.sql"]) {
    const migration = await Bun.file(new URL(`../migrations/${filename}`, import.meta.url)).text();
    await pool.query(migration);
  }
  const checkpoint = createCheckpoint(databaseUrl);
  try {
    await checkpoint.setup();
  } finally {
    await checkpoint.end();
  }
}
