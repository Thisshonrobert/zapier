// What happens if the AI is halfway through investigation and the process crashes? 
//**diagnose -WAIT FOR HUMAN-checkpoint saved - server crashes -server restarts-resume from checkpoint */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg, { type Pool } from "pg";

export function agentDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.searchParams.delete("schema"); // Prisma-only URL option, not a PostgreSQL setting.
  return url.toString();
}

export function createCheckpoint(databaseUrl: string) {
  return new PostgresSaver(agentPool(databaseUrl), undefined, { schema: "ai_agent" });
}

export function agentPool(databaseUrl: string) {
  const pool = new pg.Pool({ connectionString: agentDatabaseUrl(databaseUrl), max: 4,
    connectionTimeoutMillis: 5_000, query_timeout: 10_000, statement_timeout: 10_000 });
  // PostgreSQL can drop an idle connection during an outage. Keep the service alive to retry.
  pool.on("error", () => console.error("Investigation database connection unavailable"));
  return pool;
}

// Run this controlled migration before starting the service. Request handlers never call setup().
export async function migrateAgent(pool: Pool, databaseUrl: string) {
  for (const filename of ["0001_investigations.sql", "0002_investigation_decisions.sql", "0003_investigation_events.sql", "0004_operational_budget.sql", "0005_investigation_trace.sql"]) {
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
