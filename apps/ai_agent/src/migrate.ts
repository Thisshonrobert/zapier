import pg from "pg";
import { agentDatabaseUrl, migrateAgent } from "./checkpoint.ts";

const databaseUrl = process.env.AI_AGENT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("AI_AGENT_DATABASE_URL or DATABASE_URL is required");
const pool = new pg.Pool({ connectionString: agentDatabaseUrl(databaseUrl) });
try { await migrateAgent(pool, databaseUrl); }
finally { await pool.end(); }
