import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const project = "zapier-phase14a";
const database = `phase14a_${randomBytes(6).toString("hex")}`;
const compose = ["compose", "-f", "scripts/phases/phase14a/compose.yaml", "-p", project,
  "exec", "-T", "postgres"];
function postgresTool(tool, args) {
  const result = spawnSync("docker", [...compose, tool, "-U", "phase14a", ...args],
    { stdio: "inherit", timeout: 30_000 });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`${tool} failed`);
}
const databaseUrl = `postgresql://phase14a:phase14a-local-only@127.0.0.1:54329/${database}`;
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  AI_AGENT_DATABASE_URL: databaseUrl,
  AI_AGENT_OPERATIONAL_TEST_DATABASE_URL: databaseUrl,
  KAFKA_TEST_BROKERS: "127.0.0.1:19092",
  PHASE14A_DOCKER_PROJECT: project,
  GEMINI_API_KEY: "",
  OPENAI_API_KEY: "",
  LANGFUSE_PUBLIC_KEY: "",
  LANGFUSE_SECRET_KEY: "",
  RESEND_API_KEY: "",
  TELEGRAM_BOT_TOKEN: "",
};
const requested = process.argv[2] ?? "bun";
const command = requested === "bun" && process.platform === "win32"
  ? process.env.BUN_PATH ?? join(process.env.APPDATA, "npm/node_modules/bun/bin/bun.exe")
  : requested;
postgresTool("createdb", [database]);
let status = 1;
try {
  const result = spawnSync(command, process.argv.slice(3), { env, stdio: "inherit", timeout: 600_000 });
  if (result.error) throw result.error;
  status = result.status ?? 1;
} finally {
  postgresTool("dropdb", ["--force", database]);
}
process.exit(status);
