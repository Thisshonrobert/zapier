import { randomUUID } from "node:crypto";
import { Kafka, logLevel } from "kafkajs";
import type { PoolClient } from "pg";
import { createFingerprints } from "../../apps/worker/execution-store.ts";
import { checkOwnership } from "./triage-lab-store.ts";
import { seedAccounts, type LabMarker } from "./triage-lab-config.ts";
import { selectScenarios, type LabScenario } from "./triage-lab-scenarios.ts";

type Row = Record<string, any>;
export type BrokerEvent = { topic: string; key: string | null; value: Row };
type RunEvidence = { labId: string; scenario: LabScenario; journal: Row; runs: Row[]; actions: Row[];
  executions: Row[]; attempts: Row[]; failures: Row[]; operations: Row[]; events: BrokerEvent[] };
const mismatch = (label: string): never => { throw new Error(`Lab evidence mismatch: ${label}`); };

export function verifyRunEvidence(input: RunEvidence): boolean {
  const { scenario, journal, runs, actions, executions, attempts, failures, operations, events } = input;
  if (runs.length > 1) throw new Error("Duplicate correlated lab runs");
  if (!runs.length) return false;
  const run = runs[0]!;
  const identity = run.metadata?._lab;
  if (run.id !== journal.run_id || run.zapId !== journal.zap_id || run.userId !== journal.owner_id ||
    identity?.labId !== input.labId || identity?.nonce !== journal.nonce || identity?.batchId !== journal.batch_id ||
    identity?.scenario !== journal.scenario || identity?.ownerKey !== journal.owner_key) mismatch("owner/run/scenario binding");
  const lastStage = scenario.failure?.stage ?? scenario.actions.length - 1;
  if (executions.some(e => e.stage > lastStage || e.stage < 0) || failures.length > (scenario.failure ? 1 : 0)) mismatch("unexpected stage/failure");
  for (let stage = 0; stage <= lastStage; stage++) {
    const selected = executions.filter(e => e.stage === stage);
    if (selected.length > 1) mismatch("duplicate execution");
    if (!selected.length) return false;
    const execution = selected[0]!;
    if (execution.status === "PENDING") return false;
    const failure = scenario.failure?.stage === stage ? scenario.failure : undefined;
    const outcome = failure?.providerOutcome ?? "accepted";
    if (execution.status !== (failure ? "FAILED" : "SUCCESS") || execution.providerOutcome !== outcome || execution.zapRunId !== run.id ||
      execution.handlerVersion !== "triage-lab-v1") mismatch("execution outcome/version");
    const selectedAttempts = attempts.filter(a => a.executionId === execution.id);
    if (selectedAttempts.length !== 1) mismatch("attempt count");
    const attempt = selectedAttempts[0]!;
    if (attempt.attemptNumber !== 1 || attempt.status !== outcome.toUpperCase() || attempt.provider !== scenario.actions[stage]!.type ||
      !attempt.completedAt || attempt.actionFingerprint !== execution.actionFingerprint || attempt.requestFingerprint !== execution.requestFingerprint)
      mismatch("attempt linkage/outcome");
    const stageOperations = operations.filter(o => o.stage === stage && !o.replay);
    const expectedOperation = scenario.key === "telegram-resolution" ? "getChat" : "send";
    const expectedCount = scenario.key === "telegram-missing-credentials" ? 0 : 1;
    if (stageOperations.length !== expectedCount || stageOperations.some(o => o.invocations !== 1 || o.attempt_id !== attempt.id ||
      o.operation !== expectedOperation || o.provider !== attempt.provider)) mismatch("provider operation identity/count");
    if (failure) {
      const row = failures[0];
      if (!row) return false;
      for (const field of ["provider", "phase", "safeCode", "providerStatus", "retryAfterSeconds"]) {
        const expected = failure[field as keyof typeof failure] ?? null;
        if ((row[field] ?? null) !== expected || (attempt[field] ?? null) !== expected) mismatch(`failure ${field}`);
      }
      if (row.executionId !== execution.id || row.zapRunId !== run.id || row.stage !== stage || row.attempt !== 1 ||
        row.providerOutcome !== outcome || row.requiresHuman !== true || row.evidenceSource !== "captured" ||
        row.actionFingerprint !== execution.actionFingerprint || row.requestFingerprint !== execution.requestFingerprint) mismatch("failure linkage/provenance");
      if (!row.dlqPublishedAt) return false;
      const dlq = events.filter(e => e.topic === "dlq" && (e.value.failureId === row.id || e.value.zapRunId === run.id));
      if (dlq.length > 1) mismatch("duplicate DLQ matches");
      if (!dlq.length) return false;
      const event = dlq[0]!;
      if (event.key !== row.id || event.value.failureId !== row.id || event.value.zapRunId !== run.id || event.value.stage !== stage ||
        event.value.attempt !== 1 || event.value.safeCode !== failure.safeCode || event.value.providerOutcome !== outcome ||
        event.value.evidenceSource !== "captured" || event.value.requiresHuman !== true || event.value.failedAt !== new Date(row.createdAt).toISOString()) mismatch("DLQ payload");
    } else if (attempt.phase !== "send" || !attempt.safeReceiptId) mismatch("accepted provider receipt");
    const action = actions.filter(a => a.sortingOrder === stage);
    if (action.length !== 1) mismatch("action stage identity");
    const expected = createFingerprints({ zapRunId: run.id, stage, actionId: action[0]!.id,
      actionTypeId: scenario.actions[stage]!.type, actionMetadata: scenario.actions[stage]!.metadata, zapRunMetadata: run.metadata });
    if (execution.actionFingerprint !== expected.actionFingerprint || execution.requestFingerprint !== expected.requestFingerprint) mismatch("execution input fingerprints");
    if (stage > 0 && new Date(attempt.startedAt).getTime() < new Date(executions.find(e => e.stage === stage - 1)!.completedAt).getTime()) mismatch("predecessor ordering");
    const publications = events.filter(e => e.topic === "events" && e.value.zapRunId === run.id && e.value.stage === stage && !e.value.replayRequestId);
    if (!publications.length) return false; // Kafka publication can repeat; the durable attempt must remain single.
  }
  if (events.some(e => e.topic === "events" && e.value.zapRunId === run.id && (e.value.stage > lastStage || e.value.replayRequestId)) ||
    events.some(e => e.topic === "dlq" && e.value.zapRunId === run.id && !scenario.failure) || operations.some(o => o.stage > lastStage || o.replay)) mismatch("unexpected publication/operation");
  return true;
}

// Read a finite broker snapshot, including records before a verifier restart.
// Every partition must reach its captured high-water offset; idle topics cannot hang verification.
export async function readBrokerSnapshot(brokers: string[], marker: LabMarker, timeout: number): Promise<BrokerEvent[]> {
  const kafka = new Kafka({ clientId: "triage-lab-verify", brokers, logLevel: logLevel.ERROR,
    connectionTimeout: 3000, requestTimeout: 5000, retry: { retries: 1 } });
  const admin = kafka.admin();
  const groupId = `triage-lab-${marker.labId}-verify-${randomUUID()}`;
  const consumer = kafka.consumer({ groupId });
  const targets = new Map<string, bigint>();
  const reached = new Set<string>();
  const events: BrokerEvent[] = [];
  let failure: unknown;
  const deadline = Date.now() + timeout;
  try {
    await admin.connect();
    for (const topic of [marker.eventsTopic, marker.dlqTopic]) {
      for (const offset of await admin.fetchTopicOffsets(topic)) {
        const key = `${topic}:${offset.partition}`;
        targets.set(key, BigInt(offset.offset));
        if (BigInt(offset.offset) === BigInt(offset.low)) reached.add(key);
      }
    }
    await consumer.connect();
    await consumer.subscribe({ topics: [marker.eventsTopic, marker.dlqTopic], fromBeginning: true });
    consumer.on(consumer.events.CRASH, event => { failure = event.payload.error; });
    await consumer.run({ eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
      try {
        const key = `${batch.topic}:${batch.partition}`, target = targets.get(key)!;
        for (const message of batch.messages) {
          if (BigInt(message.offset) < target) {
            if (!message.value) throw new Error("Empty lab broker event");
            events.push({ topic: batch.topic === marker.dlqTopic ? "dlq" : "events", key: message.key?.toString() ?? null, value: JSON.parse(message.value.toString()) });
          }
          resolveOffset(message.offset);
          if (BigInt(message.offset) + 1n >= target) reached.add(key);
        }
        await heartbeat();
      } catch (error) { failure = error; }
    } });
    while (reached.size !== targets.size) {
      if (failure) throw failure;
      if (Date.now() >= deadline) throw new Error("Lab broker snapshot timed out");
      await Bun.sleep(100);
    }
    if (failure) throw failure;
    return events;
  } finally {
    await consumer.disconnect();
    try { await admin.deleteGroups([groupId]); } finally { await admin.disconnect(); }
  }
}

export async function verifyLabBatch(client: PoolClient, marker: LabMarker, brokers: string[], batchId: string, timeout: number) {
  await checkOwnership(client, marker);
  const batch = (await client.query("SELECT scenarios FROM triage_lab.batch WHERE id=$1", [batchId])).rows[0];
  if (!batch) throw new Error("Unknown lab batch");
  const journals = (await client.query("SELECT * FROM triage_lab.run WHERE batch_id=$1 ORDER BY owner_key,scenario", [batchId])).rows;
  const ownerKeys = seedAccounts.filter(a => a.role === "owner").map(a => a.key);
  if (journals.length !== batch.scenarios.length * ownerKeys.length || journals.some(j => !ownerKeys.includes(j.owner_key) || !batch.scenarios.includes(j.scenario) || !j.run_id))
    throw new Error("Lab batch ingestion is incomplete; rerun the same batch to reconcile it");
  const deadline = Date.now() + timeout;
  let inputs: RunEvidence[];
  while (true) {
    inputs = [];
    let pending = false;
    for (const journal of journals) {
      const scenario = selectScenarios(journal.scenario)[0]!;
      const runs = (await client.query(`SELECT run.*,zap."userId" FROM "ZapRun" run JOIN "Zap" zap ON zap.id=run."zapId"
        WHERE run.metadata->'_lab'->>'nonce'=$1`, [journal.nonce])).rows;
      const actions = (await client.query('SELECT * FROM "Action" WHERE "zapId"=$1 ORDER BY "sortingOrder"', [journal.zap_id])).rows;
      const executions = (await client.query('SELECT * FROM "ZapRunExecution" WHERE "zapRunId"=$1 ORDER BY stage', [journal.run_id])).rows;
      const attempts = (await client.query('SELECT attempt.* FROM "ZapRunExecutionAttempt" attempt JOIN "ZapRunExecution" execution ON execution.id=attempt."executionId" WHERE execution."zapRunId"=$1', [journal.run_id])).rows;
      const failures = (await client.query('SELECT * FROM "ZapRunRetry" WHERE "zapRunId"=$1', [journal.run_id])).rows;
      const operations = (await client.query('SELECT * FROM triage_lab.provider_operation WHERE run_id=$1', [journal.run_id])).rows;
      const outbox = (await client.query('SELECT id FROM "ZapRunOutbox" WHERE "zapRunId"=$1', [journal.run_id])).rows;
      const input = { labId: marker.labId, journal, scenario, runs, actions, executions, attempts, failures, operations, events: [] };
      verifyRunEvidence(input); // Detect terminal mismatches immediately, even before broker observation.
      const count = (scenario.failure?.stage ?? scenario.actions.length - 1) + 1;
      if (executions.length !== count || executions.some(e => e.status === "PENDING") || outbox.length ||
        failures.length !== (scenario.failure ? 1 : 0) || failures.some(f => !f.dlqPublishedAt)) pending = true;
      inputs.push(input);
    }
    if (!pending) break;
    if (Date.now() >= deadline) throw new Error(`Batch ${batchId} pipeline/DLQ publication timed out`);
    await Bun.sleep(250);
  }
  const events = await readBrokerSnapshot(brokers, marker, Math.max(1000, deadline - Date.now()));
  for (const input of inputs!) if (!verifyRunEvidence({ ...input, events })) throw new Error(`Batch ${batchId} lacks matching broker evidence for ${input.journal.owner_key}/${input.scenario.key}`);
  const report = { batchId, providerMode: "simulated", verifiedRuns: journals.length, owners: ownerKeys.length,
    failures: inputs!.reduce((n, i) => n + i.failures.length, 0), executions: inputs!.reduce((n, i) => n + i.executions.length, 0),
    providerOperations: inputs!.reduce((n, i) => n + i.operations.length, 0), replayEnabled: false };
  console.log(JSON.stringify(report, null, 2));
  return report;
}
