import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { Kafka, logLevel } from "kafkajs";
import { main } from "./triage-lab.ts";
import { assertLabDatabase, assertLabBrokers, type LabMarker } from "./triage-lab-config.ts";
import { checkOwnership, labSqlTypes } from "./triage-lab-store.ts";

const integration = process.env.TRIAGE_LAB_PIPELINE_INTEGRATION === "true" ? test : test.skip;

integration("real matrix, same-batch reconciliation and duplicate Kafka delivery preserve single attempts", async () => {
  const url = new URL(process.env.TRIAGE_LAB_DATABASE_URL ?? process.env.DATABASE_URL!);
  if (!process.env.TRIAGE_LAB_DATABASE_URL) url.pathname = "/triage_lab";
  assertLabDatabase(url.toString()); url.searchParams.delete("schema");
  const state = JSON.parse(await readFile(new URL("../../.tmp-turbo-user/triage-lab/local-state.json", import.meta.url), "utf8")) as { marker: LabMarker };
  const pool = new pg.Pool({ connectionString: url.toString(), types: labSqlTypes, connectionTimeoutMillis: 5000, query_timeout: 5000 });
  const client = await pool.connect();
  const batch = `integration-${randomUUID()}`;
  const producer = new Kafka({ clientId: "lab-duplicate-test", brokers: assertLabBrokers(process.env.TRIAGE_LAB_KAFKA_BROKERS ?? "127.0.0.1:9092"), logLevel: logLevel.ERROR }).producer();
  async function snapshot() {
    const runs = (await client.query(`SELECT * FROM "ZapRun" WHERE metadata->'_lab'->>'batchId'=$1 ORDER BY id`, [batch])).rows;
    const ids = runs.map(r => r.id);
    const executions = (await client.query('SELECT * FROM "ZapRunExecution" WHERE "zapRunId"=ANY($1::text[]) ORDER BY id', [ids])).rows;
    const attempts = (await client.query('SELECT * FROM "ZapRunExecutionAttempt" WHERE "executionId"=ANY($1::text[]) ORDER BY id', [executions.map(e => e.id)])).rows;
    const failures = (await client.query('SELECT * FROM "ZapRunRetry" WHERE "zapRunId"=ANY($1::text[]) ORDER BY id', [ids])).rows;
    const operations = (await client.query('SELECT * FROM triage_lab.provider_operation WHERE run_id=ANY($1::text[]) ORDER BY run_id,stage', [ids])).rows;
    return { runs, executions, attempts, failures, operations };
  }
  try {
    await checkOwnership(client, state.marker);
    await main(["run", "--scenario", "all", "--batch", batch]);
    const before = await snapshot();
    expect(before.runs).toHaveLength(33);
    expect(before.executions).toHaveLength(39);
    expect(before.attempts).toHaveLength(39);
    expect(before.failures).toHaveLength(30);
    expect(before.operations).toHaveLength(36);
    expect(new Set(before.operations.map(o => o.provider))).toEqual(new Set(["telegram", "email"]));
    expect(before.operations.every(o => o.invocations === 1 && !o.replay)).toBe(true);
    await main(["run", "--scenario", "all", "--batch", batch]);
    expect(await snapshot()).toEqual(before);
    await producer.connect();
    await producer.send({ topic: state.marker.eventsTopic, messages: before.runs.map(r => ({ value: JSON.stringify({ zapRunId: r.id, stage: 0 }) })) });
    // Wait for the worker group's committed offset, rather than assuming a fixed sleep consumed duplicates.
    const admin = new Kafka({ clientId: "lab-offset-test", brokers: assertLabBrokers(process.env.TRIAGE_LAB_KAFKA_BROKERS ?? "127.0.0.1:9092"), logLevel: logLevel.ERROR }).admin();
    try {
      await admin.connect();
      const targets = await admin.fetchTopicOffsets(state.marker.eventsTopic);
      const deadline = Date.now() + 15000;
      while (true) {
        const offsets = await admin.fetchOffsets({ groupId: state.marker.workerGroup, topics: [state.marker.eventsTopic] });
        if (targets.every(t => offsets[0]?.partitions.some(p => p.partition === t.partition && BigInt(p.offset) >= BigInt(t.offset)))) break;
        if (Date.now() >= deadline) throw new Error("Duplicate delivery was not consumed");
        await Bun.sleep(100);
      }
    } finally { await admin.disconnect(); }
    await main(["verify", "--batch", batch]);
    expect(await snapshot()).toEqual(before);
    await expect(main(["verify", "--batch", "unknown-batch"])).rejects.toThrow("Unknown lab batch");
  } finally { await producer.disconnect(); client.release(); await pool.end(); }
}, 180000);
