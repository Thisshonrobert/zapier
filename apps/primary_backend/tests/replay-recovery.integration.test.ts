import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { createReplayDispatcher, liveReplayEnabled } from "../services/replay-dispatcher.ts";
import { ReplayService } from "../services/replay.ts";
import { createReplayStore, executeReplayStage } from "../../worker/replay.ts";
import { createExecutionStore, type ExecutionDb } from "../../worker/execution-store.ts";
import { executeStage, parseZapEvent, type MessageResolution, type ZapEvent } from "../../worker/orchestration.ts";
import { settleMessage } from "../../worker/message-resolution.ts";
import { ActionExecutionError, type ActionHandler } from "../../worker/types.ts";
import { createPostgresFixture } from "./postgres-fixture.ts";
import { setupReplay } from "./replay-fixture.ts";
import { createKafkaFixture } from "./kafka-fixture.ts";

let fixture: Awaited<ReturnType<typeof createPostgresFixture>>;
let broker: Awaited<ReturnType<typeof createKafkaFixture>>;
let seed: Awaited<ReturnType<typeof setupReplay>>;
let original: Awaited<ReturnType<typeof originalHistory>>, authority: unknown[];
let calls: number;
let initialized = false, hasDatabase = false, hasBroker = false;
const previousHandler = process.env.WORKER_HANDLER_VERSION;
const previousEnabled = process.env.REPLAY_ENABLED;
const previousToken = process.env.TELEGRAM_BOT_TOKEN;
const accepted = { provider: "telegram", phase: "send", outcome: "accepted", safeReceiptId: "stub-receipt" } as const;
const handler: ActionHandler = { type: "telegram", execute: async (_metadata, context) => {
  calls++;
  assert.equal(context.idempotencyKey, `zaprun_${seed.run.id}_stage_${context.stage}`);
  return accepted;
} };
const event = (): ZapEvent => ({ zapRunId: seed.run.id, stage: 0, replayRequestId: seed.input.requestId });
const store = () => createReplayStore(fixture.db, { enabled: true, handlerVersion: "test-worker-v1" });
const originalHistory = () => fixture.db.zapRunExecution.findUnique({
  where: { id: seed.execution.id }, include: { attempts: true, failure: true },
});
const requestHistory = () => fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayRequest" WHERE id = ${seed.input.requestId}`);
const state = async () => (await fixture.db.$queryRaw<{ status: string; publishedAt: Date | null;
  dispatchToken: string | null; claimToken: string | null; nextStage: number | null; dispatchAttempts: number }[]>(Prisma.sql`
    SELECT * FROM "ReplayExecution" WHERE "requestId" = ${seed.input.requestId}`))[0]!;
const expireLease = () => fixture.db.$executeRaw(Prisma.sql`UPDATE "ReplayExecution"
  SET "leaseUntil" = now() - interval '1 second' WHERE "requestId" = ${seed.input.requestId}`);
const retryDispatch = () => fixture.db.$executeRaw(Prisma.sql`UPDATE "ReplayExecution"
  SET "dispatchLeaseUntil" = now() - interval '1 second', "nextDispatchAt" = NULL
  WHERE "requestId" = ${seed.input.requestId}`);
const dispatch = () => createReplayDispatcher(fixture.db, { send: async message => { await broker.send(message); } }, { enabled: true });
const execute = (value: ZapEvent, selected = handler) => executeReplayStage({ event: value, store: store(), getHandler: () => selected });

async function deliver(resolve: (value: ZapEvent) => Promise<MessageResolution> = execute,
  failCommit = false, failPublication = false) {
  return broker.deliver(async ({ topic, partition, message }, consumer) => {
    const value = parseZapEvent(message.value);
    const resolution = await resolve(value);
    await settleMessage(resolution, value, null, topic, partition, message.offset, {
      send: async input => {
        await broker.producer.send(input);
        if (failPublication) throw new Error("crash after progression ACK");
      },
      commitOffsets: async input => {
        if (failCommit) throw new Error("crash before offset commit");
        await consumer.commitOffsets(input);
      },
    });
  });
}

beforeEach(async () => {
  initialized = false; hasDatabase = false; hasBroker = false;
  process.env.WORKER_HANDLER_VERSION = "test-worker-v1";
  calls = 0;
  fixture = await createPostgresFixture();
  hasDatabase = true;
  broker = await createKafkaFixture();
  hasBroker = true;
  seed = await setupReplay(fixture.db, {}, new Date(Date.now() - 120000), true);
  await new ReplayService(fixture.db).request(seed.input);
  original = await originalHistory(); authority = await requestHistory();
  initialized = true;
}, { timeout: 30000 });

afterEach(async () => {
  try {
    if (initialized) {
      assert.deepEqual(await originalHistory(), original);
      assert.deepEqual(await requestHistory(), authority);
      assert.equal((await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayRequest"
        WHERE "approvalId" = ${seed.input.approvalId}`)).length, 1);
      assert.equal((await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "TriageAccessAudit"
        WHERE "caseId" = ${seed.input.caseId} AND action = 'replay_request'`)).length, 1);
      assert.equal((await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayExecutionAttempt"
        WHERE "requestId" = ${seed.input.requestId}`)).length, (await state()).status === "RESERVED" ? 0 : 1);
    }
  } finally {
    try { if (hasBroker) await broker.close(); }
    finally {
      if (hasDatabase) await fixture.close();
      if (previousHandler === undefined) delete process.env.WORKER_HANDLER_VERSION;
      else process.env.WORKER_HANDLER_VERSION = previousHandler;
      if (previousEnabled === undefined) delete process.env.REPLAY_ENABLED;
      else process.env.REPLAY_ENABLED = previousEnabled;
      if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = previousToken;
    }
  }
}, { timeout: 30000 });

for (const window of ["before acceptance", "lost ACK after acceptance"]) test(`publish failure ${window} leaves queued authority available for retry`, { timeout: 60000 }, async () => {
  const failed = createReplayDispatcher(fixture.db, { send: async message => {
    if (window === "lost ACK after acceptance") await broker.send(message);
    throw new Error("before ACK");
  } }, { enabled: true });
  assert.equal(await failed.dispatchOne(), true);
  assert.partialDeepStrictEqual(await state(), { status: "RESERVED", publishedAt: null, dispatchToken: null, dispatchAttempts: 1 });
  assert.equal(await failed.dispatchOne(), false);
  assert.partialDeepStrictEqual(await broker.admin.fetchTopicOffsets(broker.topic), [{ high: window === "before acceptance" ? "0" : "1" }]);
  await retryDispatch();
  await dispatch().dispatchOne();
  await deliver();
  if (window === "lost ACK after acceptance") await deliver();
  assert.partialDeepStrictEqual(await state(), { status: "SUCCESS", dispatchAttempts: 2 });
  assert.equal(calls, 1); assert.equal(await broker.offset(), window === "before acceptance" ? "1" : "2");
});

test("broker ACK followed by dispatch persistence crash republishes the same identity without another provider attempt", { timeout: 60000 }, async () => {
  await fixture.db.$executeRawUnsafe(`CREATE FUNCTION fail_ack() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."publishedAt" IS NOT NULL THEN RAISE EXCEPTION 'ACK persistence crash'; END IF; RETURN NEW; END; $$`);
  await fixture.db.$executeRawUnsafe(`CREATE TRIGGER fail_ack BEFORE UPDATE ON "ReplayExecution" FOR EACH ROW EXECUTE FUNCTION fail_ack()`);
  await assert.rejects(dispatch().dispatchOne());
  assert.partialDeepStrictEqual(await state(), { status: "RESERVED", publishedAt: null, dispatchAttempts: 1 });
  await fixture.db.$executeRawUnsafe('DROP TRIGGER fail_ack ON "ReplayExecution"');
  await retryDispatch();
  await dispatch().dispatchOne();
  await deliver(async value => { assert.deepEqual(value, event()); return execute(value); });
  await deliver(async value => { assert.deepEqual(value, event()); return execute(value); });
  assert.partialDeepStrictEqual(await state(), { status: "SUCCESS", dispatchAttempts: 2 });
  assert.equal(calls, 1); assert.equal(await broker.offset(), "2");
});

for (const outcome of ["success", "failure"]) test(`expired dispatch owner returning ${outcome} cannot clear or back off a replacement owner's ACK`, { timeout: 60000 }, async () => {
  let release!: () => void, entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const stale = createReplayDispatcher(fixture.db, { send: async message => {
    entered(); await blocked;
    if (outcome === "failure") throw new Error("old producer lost ACK");
    await broker.send(message);
  } }, { enabled: true });
  const pending = stale.dispatchOne(); await started;
  await retryDispatch(); await dispatch().dispatchOne();
  const replacement = await state();
  release(); await pending;
  assert.deepEqual(await state(), replacement);
  await deliver();
  if (outcome === "success") await deliver();
  assert.equal(calls, 1);
});

for (const window of ["before provider", "after provider before persistence"]) test(`worker crash ${window} becomes terminal UNKNOWN on broker redelivery`, { timeout: 60000 }, async () => {
  await dispatch().dispatchOne();
  if (window === "after provider before persistence") {
    await fixture.db.$executeRawUnsafe(`CREATE FUNCTION fail_outcome() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'outcome persistence crash'; END; $$`);
    await fixture.db.$executeRawUnsafe(`CREATE TRIGGER fail_outcome BEFORE UPDATE ON "ReplayExecutionAttempt" FOR EACH ROW EXECUTE FUNCTION fail_outcome()`);
    await assert.rejects(deliver());
    await fixture.db.$executeRawUnsafe('DROP TRIGGER fail_outcome ON "ReplayExecutionAttempt"');
  } else {
    await assert.rejects(broker.deliver(async ({ message }) => {
      assert.equal((await store().claim(parseZapEvent(message.value))).kind, "CLAIMED");
      throw new Error("crash after claim");
    }), { message: "crash after claim" });
  }
  assert.partialDeepStrictEqual(await state(), { status: "RUNNING" });
  assert.equal(await broker.offset(), "-1");
  await assert.rejects(deliver(), { message: "stage remains unresolved" });
  await expireLease(); await deliver(); await broker.send({ value: JSON.stringify(event()) }); await deliver();
  assert.partialDeepStrictEqual(await state(), { status: "UNKNOWN", claimToken: null });
  assert.equal(calls, window === "before provider" ? 0 : 1);
  assert.deepEqual(await fixture.db.$queryRaw<{ providerOutcome: string; safeCode: string }[]>(Prisma.sql`SELECT "providerOutcome", "safeCode" FROM "ReplayFailure"
    WHERE "requestId" = ${seed.input.requestId}`), [{ providerOutcome: "unknown", safeCode: "outcome_unknown" }]);
  await assert.rejects(new ReplayService(fixture.db).request({ ...seed.input, requestId: randomUUID() }), /replay_limit/);
});

test("persisted success survives a crash before Kafka offset commit", { timeout: 60000 }, async () => {
  await dispatch().dispatchOne();
  await assert.rejects(deliver(execute, true), { message: "crash before offset commit" });
  assert.partialDeepStrictEqual(await state(), { status: "SUCCESS", nextStage: 1 });
  assert.equal(await broker.offset(), "-1");
  await deliver();
  assert.equal(calls, 1); assert.equal(await broker.offset(), "1");
});

test("lost successor ACK preserves ordering and ordinary duplicate delivery does not resend either stage", { timeout: 60000 }, async () => {
  await dispatch().dispatchOne();
  await assert.rejects(deliver(execute, false, true), { message: "crash after progression ACK" });
  assert.equal(await broker.offset(), "-1");
  await deliver();
  const ordinaryStore = createExecutionStore(fixture.db as unknown as ExecutionDb);
  for (let count = 0; count < 2; count++) await deliver(async value => {
    assert.deepEqual(value, { zapRunId: seed.run.id, stage: 1 });
    assert.partialDeepStrictEqual(await state(), { status: "SUCCESS" });
    const action = await fixture.db.action.findFirstOrThrow({ where: { zapId: seed.zap.id, sortingOrder: 1 } });
    const result = await executeStage({ event: value, action: { id: action.id, typeId: "telegram",
      metadata: action.metadata as Record<string, unknown> }, zapRunMetadata: {}, store: ordinaryStore, getHandler: () => handler });
    return { ...result, nextStage: null };
  });
  assert.equal(calls, 2); assert.equal(await broker.offset(), "3");
  assert.partialDeepStrictEqual(await fixture.db.zapRunExecution.findUnique({ where: { zapRunId_stage: { zapRunId: seed.run.id, stage: 1 } } }), { status: "SUCCESS" });
});

test("simultaneous duplicate deliveries claim one generation and fence stale completion after expiry", { timeout: 60000 }, async () => {
  await dispatch().dispatchOne(); await broker.send({ value: JSON.stringify(event()) });
  await broker.deliver(async ({ message }) => {
    const value = parseZapEvent(message.value), active = store();
    const outcomes = await Promise.all([active.claim(value), active.claim(value)]);
    assert.deepEqual(outcomes.map(result => result.kind).sort(), ["BUSY", "CLAIMED"]);
    const owner = outcomes.find(result => result.kind === "CLAIMED")!;
    if (owner.kind !== "CLAIMED") throw new Error("claim missing");
    assert.equal(await active.complete({ ...owner, claimToken: randomUUID() }, accepted), false);
    await expireLease();
    assert.equal(await active.complete(owner, accepted), false);
    assert.deepEqual(await execute(value), { ack: true, advance: false });
    assert.equal(await active.complete(owner, accepted), false);
  });
  await deliver(); await deliver();
  assert.partialDeepStrictEqual(await state(), { status: "UNKNOWN" }); assert.equal(calls, 0);
});

for (const kind of ["429 rejection", "timeout"]) test(`${kind} ends this release's replay allowance across Kafka duplicates`, { timeout: 60000 }, async () => {
  await dispatch().dispatchOne(); await broker.send({ value: JSON.stringify(event()) });
  const selected: ActionHandler = { type: "telegram", execute: async () => {
    calls++;
    if (kind === "timeout") return new Promise<never>(() => {});
    throw new ActionExecutionError("stub rejection", { provider: "telegram", phase: "send", outcome: "rejected",
      safeCode: "telegram_http_429", status: 429, retryAfterSeconds: 1 });
  } };
  const resolve = (value: ZapEvent) => executeReplayStage({ event: value, store: store(), getHandler: () => selected, timeoutMs: 10 });
  await deliver(resolve); await deliver(resolve);
  assert.partialDeepStrictEqual(await state(), { status: kind === "timeout" ? "UNKNOWN" : "FAILED" });
  assert.equal(calls, 1); assert.equal(await broker.offset(), "2");
  assert.partialDeepStrictEqual(await broker.admin.fetchTopicOffsets(broker.topic), [{ high: "2" }]);
  await assert.rejects(new ReplayService(fixture.db).request({ ...seed.input, requestId: randomUUID() }), /replay_limit/);
});

test("kill switch and unproven release gates leave queued authority and broker offsets untouched", { timeout: 60000 }, async () => {
  for (const enabled of ["false", "true"]) {
    process.env.REPLAY_ENABLED = enabled;
    assert.equal(liveReplayEnabled(), false);
    assert.equal(await createReplayDispatcher(fixture.db, { send: async message => { await broker.send(message); } }).dispatchOne(), false);
    assert.deepEqual(await executeReplayStage({ event: event(), store: createReplayStore(fixture.db), getHandler: () => handler }),
      { ack: false, advance: false });
  }
  await broker.send({ value: JSON.stringify(event()) });
  process.env.REPLAY_ENABLED = "false";
  await assert.rejects(deliver(value => executeReplayStage({ event: value,
    store: createReplayStore(fixture.db), getHandler: () => handler })), { message: "stage remains unresolved" });
  assert.equal(calls, 0); assert.partialDeepStrictEqual(await state(), { status: "RESERVED", publishedAt: null, dispatchAttempts: 0 });
  assert.equal(await broker.offset(), "-1");
});

test("kill switch allows an already claimed outcome to persist while refusing new execution", { timeout: 60000 }, async () => {
  await dispatch().dispatchOne();
  await broker.deliver(async ({ message }) => {
    const value = parseZapEvent(message.value), active = store(), owner = await active.claim(value);
    if (owner.kind !== "CLAIMED") throw new Error("claim missing");
    const result = await handler.execute(owner.selected.metadata, {
      zapRunId: seed.run.id, stage: 0, idempotencyKey: `zaprun_${seed.run.id}_stage_0`, zapRunMetadata: {},
    });
    process.env.REPLAY_ENABLED = "false";
    assert.deepEqual(await executeReplayStage({ event: value, store: createReplayStore(fixture.db), getHandler: () => handler }),
      { ack: false, advance: false });
    assert.equal(await active.complete(owner, result), true);
  });
  assert.partialDeepStrictEqual(await state(), { status: "SUCCESS" });
  assert.equal(calls, 1); assert.equal(await broker.offset(), "-1");
});

for (const kind of ["username", "environment token"]) test(`Kafka replay refuses unproven ${kind} identity`, { timeout: 60000 }, async () => {
  process.env.TELEGRAM_BOT_TOKEN = "stub:environment";
  seed = await setupReplay(fixture.db, {}, new Date(Date.now() - 120000), false,
    kind === "username" ? { channelUserName: "@reassigned" } : { botToken: "" });
  await new ReplayService(fixture.db).request(seed.input);
  original = await originalHistory(); authority = await requestHistory();
  await broker.send({ value: JSON.stringify(event()) }); await deliver();
  assert.equal(calls, 0);
  assert.deepEqual(await fixture.db.$queryRaw<{ providerOutcome: string; safeCode: string }[]>(Prisma.sql`
    SELECT "providerOutcome", "safeCode" FROM "ReplayFailure" WHERE "requestId" = ${seed.input.requestId}`),
  [{ providerOutcome: "not_attempted", safeCode: "replay_input_identity_unproven" }]);
});

test("replay after a successful predecessor preserves its history and publishes only the validated successor", { timeout: 60000 }, async () => {
  seed = await setupReplay(fixture.db, {}, new Date(Date.now() - 120000), true, {}, 1);
  await new ReplayService(fixture.db).request(seed.input);
  original = await originalHistory(); authority = await requestHistory();
  const predecessor = await fixture.db.zapRunExecution.findUnique({ where: { zapRunId_stage: { zapRunId: seed.run.id, stage: 0 } },
    include: { attempts: true, failure: true } });
  await broker.send({ value: JSON.stringify({ ...event(), stage: 1 }) });
  await deliver();
  assert.equal(calls, 1);
  assert.partialDeepStrictEqual(await state(), { status: "SUCCESS", nextStage: 2 });
  await broker.deliver(async ({ message }, consumer) => {
    assert.deepEqual(parseZapEvent(message.value), { zapRunId: seed.run.id, stage: 2 });
    await consumer.commitOffsets([{ topic: broker.topic, partition: 0, offset: (BigInt(message.offset) + 1n).toString() }]);
  });
  assert.deepEqual(await fixture.db.zapRunExecution.findUnique({ where: { zapRunId_stage: { zapRunId: seed.run.id, stage: 0 } },
    include: { attempts: true, failure: true } }), predecessor);
});
