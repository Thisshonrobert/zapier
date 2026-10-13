import { randomBytes, randomUUID } from "node:crypto";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Kafka, logLevel } from "kafkajs";
import { PrismaClient } from "../../packages/db/generated/prisma/client.ts";
import { createFingerprints } from "../../apps/worker/execution-store.ts";
import { agentPool, migrateAgent } from "../../apps/ai_agent/src/checkpoint.ts";
import { scenarios, assertDemoDatabase } from "./scenarios.ts";

const mode = Bun.argv[2];
if (mode !== "verify" && mode !== "serve") throw new Error("Usage: triage-demo.ts verify|serve");
const backendPort = mode === "verify" ? 3101 : 3001;
const webhookPort = mode === "verify" ? 3102 : 3002;
const agentPort = mode === "verify" ? 3104 : 3004;
const root = resolve(import.meta.dir, "../..");
const suffix = randomBytes(6).toString("hex");
const database = `triage_demo_${suffix}`;
const base = new URL(process.env.DATABASE_URL ?? "");
if (!['postgres:', 'postgresql:'].includes(base.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
  throw new Error("Load a local DATABASE_URL from apps/primary_backend/.env");
base.searchParams.delete("schema");
const url = new URL(base);
url.pathname = `/${database}`;
assertDemoDatabase(url.toString());
const adminPool = new pg.Pool({ connectionString: base.toString(), connectionTimeoutMillis: 5000 });
const output = resolve(root, ".tmp-turbo-user", `triage-demo-${suffix}`);
await mkdir(output, { recursive: true });
const env = { ...process.env, DATABASE_URL: url.toString(), AI_AGENT_DATABASE_URL: url.toString(),
  TRIAGE_DEMO: "true", NODE_ENV: "development", TELEGRAM_BOT_TOKEN: "", RESEND_API_KEY: "",
  JWT_SECRET: randomBytes(32).toString("hex"), ZAP_SECRET: randomBytes(32).toString("hex"),
  TRIAGE_SERVICE_SECRET: randomBytes(32).toString("hex"),
  PRIMARY_BACKEND_URL: `http://127.0.0.1:${backendPort}`, AI_AGENT_URL: `http://127.0.0.1:${agentPort}`,
  TRIAGE_ALLOWED_ORIGINS: "http://localhost:3000", INVESTIGATION_ENABLED: mode === "serve" ? "true" : "false",
  REPLAY_ENABLED: "false", REPLAY_RELEASE_READY: "false",
  KAFKA_BROKERS: process.env.KAFKA_BROKERS ?? "127.0.0.1:9092",
  KAFKA_EVENTS_TOPIC: `triage-demo-events-${suffix}`, KAFKA_DLQ_TOPIC: `triage-demo-dlq-${suffix}`,
  KAFKA_WORKER_GROUP: `triage-demo-worker-${suffix}`,
  // Five cases need more than the normal four-attempt token allowance. This applies only to this disposable stack.
  INVESTIGATION_OWNER_TOKEN_BUDGET_PER_DAY: "640000", INVESTIGATION_OPERATOR_TOKEN_BUDGET_PER_DAY: "640000",
  INVESTIGATION_OWNER_SPEND_CENTS_PER_DAY: "160", INVESTIGATION_OPERATOR_SPEND_CENTS_PER_DAY: "160",
};
const kafka = new Kafka({ clientId: `triage-demo-${suffix}`, brokers: env.KAFKA_BROKERS.split(","), logLevel: logLevel.ERROR });
const admin = kafka.admin();
const consumer = kafka.consumer({ groupId: `triage-demo-proof-${suffix}` });
const children: Bun.Subprocess[] = [];
let created = false;
let topicsCreated = false;
let connected = false;
let db: PrismaClient | undefined;
let pool: pg.Pool | undefined;
const dlqIds = new Set<string>();
function start(name: string, args: string[], port?: number, cwd = root) {
  const child = Bun.spawn([process.execPath, ...args], { cwd,
    env: { ...env, ...(port ? { PORT: String(port) } : {}) },
    stdout: Bun.file(resolve(output, `${name}.log`)), stderr: Bun.file(resolve(output, `${name}-error.log`)),
    windowsHide: true });
  children.push(child);
  return child;
}
async function until(check: () => Promise<boolean>, label: string, timeout = 60000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (children.some(child => child.exitCode !== null)) throw new Error(`${label}: a service exited; inspect ${output}`);
    try { if (await check()) return; } catch { /* Wait for service readiness. */ }
    await Bun.sleep(300);
  }
  throw new Error(`${label} timed out; inspect ${output}`);
}
try {
  // Refuse to replace any already-running stack.
  for (const port of [backendPort, webhookPort, agentPort, ...(mode === "serve" ? [3000] : [])]) {
    const { createConnection } = await import("node:net");
    const busy = await new Promise<boolean>(resolvePort => {
      const socket = createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => { socket.destroy(); resolvePort(true); });
      socket.once("error", () => resolvePort(false));
    });
    if (busy) throw new Error(`Port ${port} is in use; stop that stack before starting the demo`);
  }
  if (mode === "serve" && !process.env.GEMINI_API_KEY) throw new Error("Serve requires apps/ai_agent/.env with Gemini configuration");
  await adminPool.query(`CREATE DATABASE "${database}"`);
  created = true;
  pool = agentPool(url.toString());
  const directory = resolve(root, "packages/db/prisma/migrations");
  for (const entry of (await readdir(directory, { withFileTypes: true })).filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)))
    await pool.query(await readFile(resolve(directory, entry.name, "migration.sql"), "utf8"));
  await migrateAgent(pool, url.toString());
  db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const operator = await db.user.create({ data: { name: "Local demo operator", email: "triage-demo@example.invalid",
    password: await bcrypt.hash("TriageDemo-LocalOnly-2026!", 10), isSupportOperator: true } });
  await db.availableAction.create({ data: { id: "telegram", name: "Telegram", imageUrl: "/telegram.svg" } });
  const cases: Array<{ key: string; source: string; title: string; zapId: string; runId?: string; caseId?: string }> = [];
  for (const scenario of scenarios) {
    const zap = await db.zap.create({ data: { name: scenario.title, userId: operator.id,
      actions: { create: { actionId: "telegram", sortingOrder: 0, metadata: scenario.metadata } } }, include: { actions: true } });
    const entry = { key: scenario.key, source: scenario.source, title: scenario.title, zapId: zap.id } as typeof cases[number];
    cases.push(entry);
    if (scenario.source === "pipeline") continue;
    const run = await db.zapRun.create({ data: { zapId: zap.id, metadata: { demo: true, source: "seeded", scenario: scenario.key } } });
    const fingerprints = createFingerprints({ zapRunId: run.id, stage: 0, actionId: zap.actions[0]!.id,
      actionTypeId: "telegram", actionMetadata: scenario.metadata, zapRunMetadata: { demo: true, source: "seeded", scenario: scenario.key } });
    const now = new Date();
    const execution = await db.zapRunExecution.create({ data: { zapRunId: run.id, stage: 0, status: "FAILED",
      providerOutcome: scenario.outcome, completedAt: now, requiresHuman: true, ...fingerprints } });
    await db.zapRunExecutionAttempt.create({ data: { executionId: execution.id, attemptNumber: 1,
      status: scenario.outcome.toUpperCase(), provider: "telegram", phase: scenario.phase, safeCode: scenario.code,
      providerStatus: "status" in scenario ? scenario.status : null, retryAfterSeconds: "retryAfter" in scenario ? scenario.retryAfter : null,
      completedAt: now, ...fingerprints } });
    const failure = await db.zapRunRetry.create({ data: { zapRunId: run.id, stage: 0, attempt: 1, executionId: execution.id,
      provider: "telegram", phase: scenario.phase, providerOutcome: scenario.outcome, safeCode: scenario.code,
      providerStatus: "status" in scenario ? scenario.status : null, retryAfterSeconds: "retryAfter" in scenario ? scenario.retryAfter : null,
      lastError: scenario.title, evidenceSource: "captured", dlqPublishedAt: now, requiresHuman: true, ...fingerprints } });
    entry.runId = run.id;
    entry.caseId = failure.id;
  }
  await admin.connect();
  await admin.createTopics({ topics: [env.KAFKA_EVENTS_TOPIC, env.KAFKA_DLQ_TOPIC].map(topic => ({ topic, numPartitions: 1, replicationFactor: 1 })) });
  topicsCreated = true;
  await consumer.connect();
  connected = true;
  await consumer.subscribe({ topic: env.KAFKA_DLQ_TOPIC, fromBeginning: true });
  await consumer.run({ eachMessage: async ({ message }) => { if (message.value) dlqIds.add(JSON.parse(message.value.toString()).failureId); } });
  start("backend", ["run", "index.ts"], backendPort, resolve(root, "apps/primary_backend"));
  start("webhook", ["run", "index.ts"], webhookPort, resolve(root, "apps/webhook"));
  start("worker", ["run", "--preload", resolve(root, "scripts/demo/provider-preload.ts"), "index.ts"], undefined, resolve(root, "apps/worker"));
  start("processor", ["run", "index.ts"], undefined, resolve(root, "apps/processor"));
  start("dlq", ["run", "dlq-publisher-index.ts"], undefined, resolve(root, "apps/worker"));
  start("agent", ["run", "src/index.ts"], agentPort, resolve(root, "apps/ai_agent"));
  const auth = { authorization: `Bearer ${jwt.sign({ id: operator.id }, env.JWT_SECRET, { expiresIn: "8h" })}` };
  const backend = `http://127.0.0.1:${backendPort}/api/v1/triage/operator`;
  await until(async () => (await fetch(`${backend}/cases`, { headers: auth })).ok, "Backend startup");
  await until(async () => (await fetch(`http://127.0.0.1:${agentPort}/private/v1/investigations/status`,
    { headers: { authorization: `Bearer ${env.TRIAGE_SERVICE_SECRET}` } })).ok, "Agent startup", 120000);
  await until(async () => (await fetch(`http://127.0.0.1:${webhookPort}/`)).status === 404, "Webhook startup");
  for (const entry of cases.filter(c => c.source === "pipeline")) {
    const response = await fetch(`http://127.0.0.1:${webhookPort}/hooks/catch/${operator.id}/${entry.zapId}`, {
      method: "POST", headers: { "content-type": "application/json", "x-zap-secret": env.ZAP_SECRET },
      body: JSON.stringify({ demo: true, source: "pipeline", scenario: entry.key }) });
    if (!response.ok) throw new Error(`Webhook failed for ${entry.key}`);
    await until(async () => {
      const run = await db!.zapRun.findFirst({ where: { zapId: entry.zapId } });
      if (!run) return false;
      const failure = await db!.zapRunRetry.findFirst({ where: { zapRunId: run.id } });
      if (!failure?.dlqPublishedAt || !dlqIds.has(failure.id)) return false;
      const expected = scenarios.find(s => s.key === entry.key)!;
      if (failure.safeCode !== expected.code || failure.providerOutcome !== expected.outcome) throw new Error("Unexpected pipeline failure evidence");
      entry.caseId = failure.id;
      entry.runId = run.id;
      return true;
    }, `Webhook → outbox → worker → DLQ: ${entry.key}`);
  }
  const listed = await (await fetch(`${backend}/cases`, { headers: auth })).json() as { cases: Array<{ case_id: string }> };
  if (listed.cases.length !== 5 || cases.some(c => !listed.cases.some(row => row.case_id === c.caseId)))
    throw new Error("Operator case listing did not return exactly the five demo cases");
  for (const entry of cases) {
    const response = await fetch(`${backend}/cases/${entry.caseId}/failure-context`, { headers: auth });
    if (!response.ok) throw new Error(`Agent → backend evidence read failed for ${entry.key}: ${response.status}`);
  }
  const manifest = { mode, simulatedProviders: true, replayEnabled: false, cases, dlqObserved: dlqIds.size,
    verified: ["three seeded cases", "two webhook/outbox/Kafka/worker failures", "two broker-observed DLQ messages",
      "operator lists all five cases", "all five agent-to-backend evidence reads"], paidDiagnosisCalls: 0 };
  await writeFile(resolve(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Five demo cases ready. Manifest and service logs: ${output}`);
  console.table(cases.map(({ key, source, caseId }) => ({ key, source, caseId })));
  if (mode === "serve") {
    start("frontend", ["run", "dev"], 3000, resolve(root, "apps/frontend"));
    console.log("Open http://localhost:3000/login — triage-demo@example.invalid / TriageDemo-LocalOnly-2026!");
    console.log("Then open /triage without old case/investigation query parameters. Click Investigate to use the configured model.");
    console.log("Keep this terminal running. Ctrl+C removes only this disposable database and its Kafka topics.");
    await new Promise<void>(resolveStop => {
      process.once("SIGINT", resolveStop); process.once("SIGTERM", resolveStop);
      for (const child of children) void child.exited.then(() => resolveStop());
    });
  }
} finally {
  for (const child of children) if (child.exitCode === null) child.kill();
  await Promise.allSettled(children.map(child => child.exited));
  if (connected) await consumer.disconnect();
  if (topicsCreated) await admin.deleteTopics({ topics: [env.KAFKA_EVENTS_TOPIC, env.KAFKA_DLQ_TOPIC] });
  await admin.disconnect();
  await db?.$disconnect();
  await pool?.end();
  if (created) {
    assertDemoDatabase(url.toString());
    await adminPool.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  }
  await adminPool.end();
}
