import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Kafka, logLevel } from "kafkajs";

const project = process.env.PHASE14A_DOCKER_PROJECT;
const databaseUrl = process.env.AI_AGENT_DATABASE_URL;
if (project !== "zapier-phase14a" || !databaseUrl ||
  !new URL(databaseUrl).pathname.startsWith("/phase14a_"))
  throw new Error("Drills require the disposable Phase 14A project and database");
const compose = ["compose", "-f", "scripts/phases/phase14a/compose.yaml", "-p", project];
function docker(args, timeout = 45_000) {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout });
  if (result.status !== 0) throw new Error(`Phase 14A Docker command failed: ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const id = randomUUID().replaceAll("-", "");
const container = `phase14a-agent-${id}`;
const hostBun = process.env.BUN_PATH ?? `${process.env.APPDATA}/npm/node_modules/bun/bin/bun.exe`;
const migration = spawnSync(hostBun, ["apps/ai_agent/src/migrate.ts"],
  { env: { ...process.env, GEMINI_API_KEY: "", INVESTIGATION_ENABLED: "false" }, stdio: "inherit", timeout: 45_000 });
if (migration.status !== 0) throw new Error("Agent migration failed");

try {
  const dockerUrl = new URL(databaseUrl);
  dockerUrl.hostname = "postgres";
  dockerUrl.port = "5432";
  docker(["run", "-d", "--name", container, "--network", `${project}_default`,
    "-v", `${process.cwd()}:/work:ro`, "-w", "/work",
    "-e", `AI_AGENT_DATABASE_URL=${dockerUrl}`,
    "-e", "TRIAGE_SERVICE_SECRET=phase14a-local-service-secret-at-least-32-chars",
    "-e", "INVESTIGATION_ENABLED=false", "-e", "GEMINI_API_KEY=",
    "-e", "LANGFUSE_PUBLIC_KEY=", "-e", "LANGFUSE_SECRET_KEY=",
    "oven/bun:1", "bun", "apps/ai_agent/src/index.ts"]);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (docker(["logs", container]).includes("ai-agent running at")) { ready = true; break; }
    if (docker(["inspect", "-f", "{{.State.Running}}", container]) !== "true") break;
    await sleep(250);
  }
  if (!ready) throw new Error(`Linux agent did not start: ${docker(["logs", container])}`);
  docker(["stop", "-t", "15", container], 25_000);
  if (docker(["inspect", "-f", "{{.State.ExitCode}}", container]) !== "0" ||
    !docker(["logs", container]).includes("Investigation service shutdown complete"))
    throw new Error("Linux SIGTERM did not complete the service shutdown handler");
  console.log("PASS Linux SIGTERM invoked agent shutdown handler and exited zero");
} finally {
  docker(["rm", "-f", container]);
}

const topic = `phase14a-restart-${id}`;
const groupId = topic;
function client() {
  return new Kafka({ clientId: groupId, brokers: ["127.0.0.1:19092"], logLevel: logLevel.NOTHING,
    connectionTimeout: 3000, requestTimeout: 30000, retry: { retries: 5 } });
}
async function consumeOne(kafka) {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  let timer;
  try {
    await consumer.subscribe({ topic, fromBeginning: true });
    return await Promise.race([new Promise((resolve, reject) => {
      consumer.on(consumer.events.CRASH, event => reject(event.payload.error));
      void consumer.run({ autoCommit: false, eachMessage: async payload => {
        await consumer.commitOffsets([{ topic, partition: payload.partition,
          offset: (BigInt(payload.message.offset) + 1n).toString() }]);
        resolve(payload.message.value?.toString());
      } }).catch(reject);
    }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Broker delivery timed out")), 25_000); })]);
  } finally { if (timer) clearTimeout(timer); await consumer.disconnect(); }
}
const first = client(), admin = first.admin(), producer = first.producer();
await admin.connect();
await producer.connect();
try {
  await admin.createTopics({ waitForLeaders: true,
    topics: [{ topic, numPartitions: 1, replicationFactor: 1 }] });
  await producer.send({ topic, messages: [{ value: "before-restart" }] });
  if (await consumeOne(first) !== "before-restart") throw new Error("First broker delivery mismatch");
  await producer.disconnect(); await admin.disconnect();
  docker([...compose, "restart", "kafka"], 60_000);
  docker([...compose, "up", "-d", "--wait", "kafka"], 90_000);
  const second = client(), afterAdmin = second.admin(), afterProducer = second.producer();
  await afterAdmin.connect(); await afterProducer.connect();
  try {
    await afterProducer.send({ topic, messages: [{ value: "after-restart" }] });
    if (await consumeOne(second) !== "after-restart")
      throw new Error("Committed broker offset was not recovered after restart");
    console.log("PASS Kafka restart recovered committed offset and delivered next message once");
  } finally {
    await afterProducer.disconnect();
    await afterAdmin.deleteGroups([groupId]).catch(() => undefined);
    await afterAdmin.deleteTopics({ topics: [topic], timeout: 5000 }).catch(() => undefined);
    await afterAdmin.disconnect();
  }
} finally {
  await producer.disconnect().catch(() => undefined);
  await admin.disconnect().catch(() => undefined);
  docker([...compose, "up", "-d", "--wait", "kafka"], 90_000);
}
