import { createHash, randomBytes } from "node:crypto";
import { link, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import bcrypt from "bcrypt";
import { Kafka, logLevel } from "kafkajs";
import { assertLabDatabase, assertLabBrokers, assertLabMarker, assertPortsFree, labPorts, labResources,
  seedAccounts, type LabMarker } from "./triage-lab-config.ts";
import { checkOwnership, initializeOwnership, migrateLabAgent, seedLab, seedLabScenarios, labSqlTypes } from "./triage-lab-store.ts";
import { readSupervisor, runSupervisor } from "./triage-lab-lifecycle.ts";
import { parsePipelineFlags, runLabBatch } from "./triage-lab-pipeline.ts";
import { verifyLabBatch } from "./triage-lab-verify.ts";
import { fakeEmailKey } from "./triage-lab-scenarios.ts";

const root = resolve(import.meta.dir, "../..");
const output = resolve(root, ".tmp-turbo-user/triage-lab");
const statePath = resolve(output, "local-state.json");
type LocalState = { marker: LabMarker; password: string; jwtSecret: string; zapSecret: string; serviceSecret: string; controlToken: string };

function configuration() {
  if (process.env.NODE_ENV === "production") throw new Error("Lab is forbidden in production");
  const url = new URL(process.env.TRIAGE_LAB_DATABASE_URL ?? process.env.DATABASE_URL ?? "");
  // DATABASE_URL supplies local connection credentials only. Never modify its ordinary database.
  if (!process.env.TRIAGE_LAB_DATABASE_URL) url.pathname = "/triage_lab";
  assertLabDatabase(url.toString());
  url.searchParams.delete("schema");
  const brokers = assertLabBrokers(process.env.TRIAGE_LAB_KAFKA_BROKERS ?? "127.0.0.1:9092");
  const fingerprint = createHash("sha256").update(JSON.stringify({
    host: url.hostname, port: url.port || "5432", user: url.username, database: "triage_lab", brokers,
  })).digest("hex");
  return { url, brokers, fingerprint };
}

async function localState(fingerprint: string, create: boolean): Promise<LocalState> {
  await mkdir(output, { recursive: true });
  try { await readFile(statePath, "utf8"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !create) throw new Error("Seed the lab first; local ownership manifest is unavailable");
    const labId = randomBytes(16).toString("hex");
    const secret = () => randomBytes(32).toString("hex");
    const state: LocalState = { marker: { version: 1, labId, database: "triage_lab", resourceFingerprint: fingerprint, ...labResources(labId) },
      password: process.env.TRIAGE_LAB_SUPPORT_PASSWORD || secret(), jwtSecret: secret(), zapSecret: secret(), serviceSecret: secret(), controlToken: secret() };
    if (state.password.length < 12) throw new Error("Lab support password requires at least 12 characters");
    // Publish a complete manifest atomically; concurrent seeds must never read a partial JSON write.
    const temporary = resolve(output, `state-${randomBytes(16).toString("hex")}.json`);
    await writeFile(temporary, JSON.stringify(state, null, 2), { flag: "wx", mode: 0o600 });
    try {
      try { await link(temporary, statePath); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    } finally { await unlink(temporary); }
  }
  const state: LocalState = JSON.parse(await readFile(statePath, "utf8"));
  assertLabMarker(state.marker, { ...state.marker, version: 1, database: "triage_lab", resourceFingerprint: fingerprint });
  if ([state.jwtSecret, state.zapSecret, state.serviceSecret, state.controlToken].some(value => !/^[a-f0-9]{64}$/.test(value)) ||
    typeof state.password !== "string" || state.password.length < 12) throw new Error("Invalid local lab credentials");
  return state;
}

async function withLab<T>(create: boolean, work: (context: {
  client: pg.PoolClient; admin: pg.PoolClient; state: LocalState; config: ReturnType<typeof configuration>;
  closeClient: () => void;
}) => Promise<T>) {
  const config = configuration();
  const state = await localState(config.fingerprint, create);
  const adminUrl = new URL(config.url); adminUrl.pathname = "/postgres";
  const options = { connectionTimeoutMillis: 5000, query_timeout: 30_000, statement_timeout: 30_000, max: 2, types: labSqlTypes };
  const adminPool = new pg.Pool({ ...options, connectionString: adminUrl.toString() });
  const pool = new pg.Pool({ ...options, connectionString: config.url.toString() });
  let admin: pg.PoolClient | undefined, client: pg.PoolClient | undefined;
  try {
    admin = await adminPool.connect();
    await admin.query("SELECT pg_advisory_lock(16000)");
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'triage_lab'");
    if (!exists.rows.length && !create) throw new Error("Lab database is absent; seed it first");
    if (!exists.rows.length) await admin.query('CREATE DATABASE "triage_lab"');
    client = await pool.connect();
    if (!exists.rows.length) await initializeOwnership(client, state.marker);
    // Existing ordinary databases are never adopted, including an interrupted unmarked creation.
    await checkOwnership(client, state.marker);
    return await work({ client, admin, state, config, closeClient: () => { client?.release(true); client = undefined; } });
  } finally {
    client?.release();
    if (admin) { await admin.query("SELECT pg_advisory_unlock(16000)").catch(() => {}); admin.release(); }
    await Promise.all([pool.end(), adminPool.end()]);
  }
}

async function provision(client: pg.PoolClient, state: LocalState, config: ReturnType<typeof configuration>) {
  await checkOwnership(client, state.marker);
  const migration = Bun.spawn([process.execPath, resolve(root, "node_modules/prisma/build/index.js"),
    "migrate", "deploy", "--schema", resolve(root, "packages/db/prisma/schema.prisma")], {
    cwd: root, env: { ...process.env, DATABASE_URL: config.url.toString() },
    stdout: Bun.file(resolve(output, "prisma-migrate.log")), stderr: Bun.file(resolve(output, "prisma-migrate-error.log")), windowsHide: true,
  });
  const timer = setTimeout(() => migration.kill("SIGKILL"), 90_000);
  let exit: number;
  try { exit = await migration.exited; } finally { clearTimeout(timer); }
  if (exit !== 0) throw new Error(`Prisma migration failed; inspect ${output}`);
  const directory = resolve(root, "apps/ai_agent/migrations");
  const files = (await readdir(directory)).filter(name => /^\d+.*\.sql$/.test(name)).sort();
  // migrateAgent currently owns these six migrations. Do not journal an unknown
  // migration as applied just because a new SQL file appears in the directory.
  if (files.join(",") !== ["0001_investigations.sql", "0002_investigation_decisions.sql", "0003_investigation_events.sql",
    "0004_operational_budget.sql", "0005_investigation_trace.sql", "0006_task_c_evaluation_reservation.sql"].join(","))
    throw new Error("Agent migration list changed; update lab migration integration before seeding");
  const migrations = await Promise.all(files.map(async name => ({ name,
    digest: createHash("sha256").update(await readFile(resolve(directory, name))).digest("hex") })));
  await migrateLabAgent(client, migrations, async () => {
    const { agentPool, migrateAgent } = await import("../../apps/ai_agent/src/checkpoint.ts");
    const agent = agentPool(config.url.toString());
    try { await migrateAgent(agent, config.url.toString()); } finally { await agent.end(); }
  });
  await seedLab(client, state.marker, await bcrypt.hash(state.password, 10));
  await seedLabScenarios(client, state.marker);
  const kafka = new Kafka({ clientId: `triage-lab-${state.marker.labId}`, brokers: config.brokers, logLevel: logLevel.ERROR,
    connectionTimeout: 5000, requestTimeout: 10_000, retry: { retries: 2 } });
  const broker = kafka.admin();
  try {
    await broker.connect();
    const existing = await broker.listTopics();
    for (const topic of [state.marker.eventsTopic, state.marker.dlqTopic]) {
      const owned = await client.query("SELECT resource_id FROM triage_lab.seed WHERE key = $1", [`topic:${topic}`]);
      if (owned.rows.length && owned.rows[0].resource_id !== topic) throw new Error("Lab topic ownership changed");
      if (!owned.rows.length) {
        if (existing.includes(topic)) throw new Error("Refusing to adopt an unowned Kafka topic");
        // Reserve the random lab-owned name durably before creation, allowing safe crash recovery.
        await client.query("INSERT INTO triage_lab.seed (key,resource_id) VALUES ($1,$2)", [`topic:${topic}`, topic]);
      }
      await broker.createTopics({ waitForLeaders: true, topics: [{ topic, numPartitions: 1, replicationFactor: 1 }] });
    }
  } finally { await broker.disconnect(); }
  await writeFile(resolve(output, "accounts.json"), JSON.stringify({ accounts: seedAccounts.map(account => ({
    email: account.email, password: state.password, desiredRole: account.role, isSupportOperator: account.isSupportOperator,
  })), frontend: `http://localhost:${labPorts.frontend}`, mode: "pipeline-simulated" }, null, 2), { mode: 0o600 });
}

export async function main(args = Bun.argv.slice(2)) {
  const [command, ...flags] = args;
  if (command === "run" || command === "verify") {
    const options = parsePipelineFlags(command, flags);
    await withLab(false, async ({ client, state, config }) => {
      let batch = options.batch;
      if (command === "run") {
        const identity = await readSupervisor(state.marker, state.controlToken) as { ready?: boolean; databaseAvailable?: boolean } | null;
        if (!identity?.ready || !identity.databaseAvailable) throw new Error("Start the healthy Phase 16B lab before running scenarios");
        batch = await runLabBatch({ client, marker: state.marker, zapSecret: state.zapSecret, ...options });
      }
      const report = await verifyLabBatch(client, state.marker, config.brokers, batch!, options.timeout);
      await writeFile(resolve(output, `batch-${batch}.json`), JSON.stringify(report, null, 2));
    });
    return;
  }
  if (!["seed", "start", "stop", "status", "reset"].includes(command ?? "") ||
    flags.some(flag => command !== "reset" || flag !== "--yes") || flags.length > 1)
    throw new Error("Usage: triage-lab.ts seed|start|stop|status|reset --yes|run --scenario <name|all> [--batch <id>]|verify --batch <id>");
  if (command === "reset" && !flags.includes("--yes")) throw new Error("Reset requires explicit --yes");
  // Stopping owned handles must remain possible during a database outage. This path
  // only authenticates the supervisor; it never touches database or broker resources.
  if (command === "stop" || command === "status") {
    const config = configuration();
    const state = await localState(config.fingerprint, false);
    const identity = await readSupervisor(state.marker, state.controlToken, command === "stop");
    if (command === "status") {
      console.log(JSON.stringify({ running: Boolean(identity), identity, labId: state.marker.labId, mode: "pipeline-simulated",
        executionEnabled: Boolean(identity), providerMode: "simulated", replayEnabled: false, ports: labPorts, credentials: resolve(output, "accounts.json") }, null, 2));
      return;
    }
    if (!identity) { console.log("Lab is already stopped; data retained"); return; }
    const response = await fetch(`http://127.0.0.1:${labPorts.control}/stop`, { method: "POST",
      headers: { authorization: `Bearer ${state.controlToken}` }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Lab stop refused");
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      try { await assertPortsFree(Object.values(labPorts)); console.log("Owned lab services stopped; database, topics and history retained"); return; }
      catch { await Bun.sleep(250); }
    }
    throw new Error("Lab stop timed out; no resources were deleted");
  }
  if (command === "seed") {
    await withLab(true, async ({ client, state, config }) => { await provision(client, state, config); });
    console.log(`Lab seeded; credentials and ownership manifest are in ${output}. No runs or failures were fabricated.`);
    return;
  }
  if (command === "start") {
    // Seed is explicit: start never creates/adopts resources or resets fixture definitions.
    const context = await withLab(false, async ({ client, state, config }) => {
      const identity = await readSupervisor(state.marker, state.controlToken);
      if (identity) {
        if (!(identity as { ready?: boolean; databaseAvailable?: boolean }).ready ||
          !(identity as { databaseAvailable?: boolean }).databaseAvailable) throw new Error("Matching lab is starting or unhealthy; inspect status/logs");
        return { running: true as const, state, config };
      }
      const count = await client.query("SELECT count(*)::int AS count FROM triage_lab.seed WHERE key LIKE 'account:%'");
      if (count.rows[0].count !== seedAccounts.length) throw new Error("Lab seeding is incomplete; run lab:seed");
      return { running: false as const, state, config };
    });
    if (context.running) { console.log("Matching lab stack is already running"); return; }
    const { state, config } = context;
    const verifyPool = new pg.Pool({ connectionString: config.url.toString(), connectionTimeoutMillis: 2000,
      query_timeout: 2000, statement_timeout: 2000, max: 2 });
    try {
      await runSupervisor({ marker: state.marker, token: state.controlToken, root, output,
        verifyOwnership: async () => {
          const client = await verifyPool.connect();
          try { await checkOwnership(client, state.marker); } finally { client.release(); }
        },
        env: { ...process.env, DATABASE_URL: config.url.toString(), AI_AGENT_DATABASE_URL: config.url.toString(),
          TRIAGE_LAB: "true", TRIAGE_DEMO: "false", NODE_ENV: "development", JWT_SECRET: state.jwtSecret,
          TRIAGE_LAB_ID: state.marker.labId, TRIAGE_LAB_RESOURCE_FINGERPRINT: state.marker.resourceFingerprint,
          TRIAGE_LAB_CONTROL_TOKEN: state.controlToken,
          ZAP_SECRET: state.zapSecret, TRIAGE_SERVICE_SECRET: state.serviceSecret,
          PRIMARY_BACKEND_URL: `http://127.0.0.1:${labPorts.backend}`, AI_AGENT_URL: `http://127.0.0.1:${labPorts.agent}`,
          NEXT_PUBLIC_BACKEND_URL: `http://localhost:${labPorts.backend}`, NEXT_PUBLIC_HOOKS_URL: `http://localhost:${labPorts.webhook}`,
          TRIAGE_ALLOWED_ORIGINS: `http://localhost:${labPorts.frontend}`,
          INVESTIGATION_ENABLED: "false", REPLAY_INTENT_ENABLED: "false", REPLAY_ENABLED: "false", REPLAY_RELEASE_READY: "false",
          GEMINI_API_KEY: "", GOOGLE_API_KEY: "", LANGFUSE_PUBLIC_KEY: "", LANGFUSE_SECRET_KEY: "", TELEGRAM_BOT_TOKEN: "", RESEND_API_KEY: fakeEmailKey,
          WORKER_HANDLER_VERSION: "triage-lab-v1",
          KAFKA_BROKERS: config.brokers.join(","), KAFKA_EVENTS_TOPIC: state.marker.eventsTopic,
          KAFKA_DLQ_TOPIC: state.marker.dlqTopic, KAFKA_WORKER_GROUP: state.marker.workerGroup },
      });
    } finally { await verifyPool.end(); }
    return;
  }
  await withLab(false, async ({ client, admin, state, config, closeClient }) => {
    if (command === "reset") {
      await assertPortsFree(Object.values(labPorts));
      await checkOwnership(client, state.marker);
      const connections = await client.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname='triage_lab' AND pid<>pg_backend_pid()");
      if (connections.rows[0].count) throw new Error("Lab database still has other clients; refusing reset");
      const broker = new Kafka({ clientId: `triage-lab-reset-${state.marker.labId}`, brokers: config.brokers,
        logLevel: logLevel.ERROR, retry: { retries: 2 } }).admin();
      try {
        await broker.connect();
        const existing = await broker.listTopics();
        for (const topic of [state.marker.eventsTopic, state.marker.dlqTopic]) {
          const owned = await client.query("SELECT resource_id FROM triage_lab.seed WHERE key = $1", [`topic:${topic}`]);
          if (existing.includes(topic) && owned.rows[0]?.resource_id !== topic) throw new Error("Refusing to delete unowned topic");
        }
        const topics = [state.marker.eventsTopic, state.marker.dlqTopic].filter(topic => existing.includes(topic));
        if (topics.length) {
          await broker.deleteTopics({ topics });
          const deadline = Date.now() + 30_000;
          while (true) {
            const remaining = await broker.listTopics();
            if (topics.every(topic => !remaining.includes(topic))) break;
            if (Date.now() >= deadline) throw new Error("Lab topic deletion has not completed; database retained, retry reset");
            await Bun.sleep(250);
          }
        }
      } finally { await broker.disconnect(); }
      // Do not force-disconnect unknown clients. Release only our own connection before drop.
      closeClient();
      await admin.query('DROP DATABASE "triage_lab"');
      await admin.query('CREATE DATABASE "triage_lab"');
      const resetPool = new pg.Pool({ connectionString: config.url.toString(), connectionTimeoutMillis: 5000, max: 1 });
      const resetClient = await resetPool.connect();
      try {
        await initializeOwnership(resetClient, state.marker);
        await provision(resetClient, state, config);
      } finally { resetClient.release(); await resetPool.end(); }
      console.log("Marked lab resources reset and reseeded; local identity and credentials retained.");
    }
  });
}

if (import.meta.main) {
  try { await main(); } catch (error) {
    // No URLs, environment dumps or credential-bearing database errors in terminal output.
    const message = error instanceof Error ? error.message : "Unknown failure";
    console.error(`Lab command failed: ${message.replace(/postgres(?:ql)?:\/\/\S+/g, "[database URL]")}`);
    process.exitCode = 1;
  }
}
