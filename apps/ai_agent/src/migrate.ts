import { agentPool, migrateAgent } from "./checkpoint.ts";

const databaseUrl = process.env.AI_AGENT_DATABASE_URL;
if (!databaseUrl) throw new Error("AI_AGENT_DATABASE_URL is required");
const pool = agentPool(databaseUrl);
try { await migrateAgent(pool, databaseUrl); }
finally { await pool.end(); }
