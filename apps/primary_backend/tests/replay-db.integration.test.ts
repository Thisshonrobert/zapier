import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { InvestigationAuthority } from "../services/investigation-authority.ts";
import { revalidateProposalPolicy } from "../services/replay-policy-facts.ts";
import { ReplayService } from "../services/replay.ts";
import { createFingerprints } from "../../worker/execution-store.ts";
import { createPostgresFixture, setOperator } from "./postgres-fixture.ts";
import { createReplayDispatcher } from "../services/replay-dispatcher.ts";
import { createReplayStore, executeReplayStage } from "../../worker/replay.ts";
import { ActionExecutionError } from "../../worker/types.ts";

import { setupReplay } from "./replay-fixture.ts";

let fixture: Awaited<ReturnType<typeof createPostgresFixture>>;
const previousHandler = process.env.WORKER_HANDLER_VERSION;
beforeAll(async () => { process.env.WORKER_HANDLER_VERSION = "test-worker-v1"; fixture = await createPostgresFixture(); });
afterAll(async () => {
  if (previousHandler === undefined) delete process.env.WORKER_HANDLER_VERSION;
  else process.env.WORKER_HANDLER_VERSION = previousHandler;
  if (fixture) await fixture.close();
});

const setup = (...args: Parameters<typeof setupReplay> extends [unknown, ...infer Rest] ? Rest : never) => setupReplay(fixture.db, ...args);

test("dry run leaves authority untouched; competing requests persist one immutable intent and preserve history", async () => {
  const { input, execution, retry } = await setup();
  const service = new ReplayService(fixture.db);
  expect(await service.dryRun(input)).toMatchObject({ status: "requires_approval", replayEnabled: false });
  expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayRequest"`)).toHaveLength(0);
  const before = await fixture.db.zapRunExecution.findUnique({ where: { id: execution.id }, include: { attempts: true, failure: true } });
  const attempts = await Promise.allSettled([service.request(input), service.request({ ...input, requestId: randomUUID() })]);
  expect(attempts.filter(x => x.status === "fulfilled")).toHaveLength(1);
  const winner = (attempts.find(x => x.status === "fulfilled") as PromiseFulfilledResult<{ id: string }>).value;
  expect(await service.request({ ...input, requestId: winner.id })).toMatchObject(winner);
  expect(await fixture.db.zapRunExecution.findUnique({ where: { id: execution.id }, include: { attempts: true, failure: true } })).toEqual(before);
  const rows = await fixture.db.$queryRaw<{ approvedBy: number; subjectOwnerId: number; generation: number; caseId: string }[]>(Prisma.sql`
    SELECT "approvedBy", "subjectOwnerId", generation, "caseId" FROM "ReplayRequest" WHERE "caseId" = ${retry.id}`);
  expect(rows).toEqual([{ approvedBy: input.actorId, subjectOwnerId: input.subjectOwnerId, generation: 1, caseId: input.caseId }]);
  await expect(Promise.resolve(fixture.db.$executeRaw(Prisma.sql`UPDATE "ReplayRequest" SET "approvedBy" = 0 WHERE id = ${winner.id}`))).rejects.toThrow();
  expect(await service.dryRun(input)).toMatchObject({ status: "blocked", reasons: expect.arrayContaining(["active_replay", "replay_limit"]) });
  // Represent a failed replay without touching Phase 3's unique attempt/failure rows.
  await fixture.db.$executeRaw(Prisma.sql`INSERT INTO "ReplayExecutionAttempt"
    (id, "requestId", "attemptNumber", status, provider, phase, "safeCode", "providerStatus", "retryAfterSeconds",
      "actionFingerprint", "requestFingerprint", "completedAt")
    SELECT ${randomUUID()}, id, 1, 'REJECTED', 'telegram', 'send', 'telegram_http_429', 429, 1,
      "actionFingerprint", "requestFingerprint", now() FROM "ReplayRequest" WHERE id = ${winner.id}`);
  await fixture.db.$executeRaw(Prisma.sql`INSERT INTO "ReplayFailure"
    (id, "requestId", "providerOutcome", provider, phase, "safeCode", "providerStatus", "actionFingerprint", "requestFingerprint")
    SELECT ${randomUUID()}, id, 'rejected', 'telegram', 'send', 'telegram_http_429', 429,
      "actionFingerprint", "requestFingerprint" FROM "ReplayRequest" WHERE id = ${winner.id}`);
  await fixture.db.$executeRaw(Prisma.sql`UPDATE "ReplayExecution" SET status = 'FAILED', "completedAt" = now() WHERE "requestId" = ${winner.id}`);
  await expect(Promise.resolve(fixture.db.$executeRaw(Prisma.sql`INSERT INTO "ReplayExecutionAttempt"
    (id, "requestId", "attemptNumber", status, "actionFingerprint", "requestFingerprint")
    SELECT ${randomUUID()}, id, 2, 'REJECTED', "actionFingerprint", "requestFingerprint" FROM "ReplayRequest" WHERE id = ${winner.id}`))).rejects.toThrow();
  await expect(service.request({ ...input, requestId: randomUUID() })).rejects.toThrow("replay_limit");
  expect(await service.dryRun(input)).toMatchObject({ status: "blocked", reasons: expect.arrayContaining(["replay_limit"]) });
  expect(await fixture.db.zapRunExecution.findUnique({ where: { id: execution.id }, include: { attempts: true, failure: true } })).toEqual(before);
});

test.each([
  ["missing_evidence", "UPDATE \"ZapRunRetry\" SET \"evidenceSource\" = 'reconciled_execution' WHERE id = $1"],
  ["missing_attempt", "DELETE FROM \"ZapRunExecutionAttempt\" WHERE \"executionId\" = $1"],
  ["unknown_outcome", "UPDATE \"ZapRunRetry\" SET \"providerOutcome\" = 'unknown' WHERE id = $1"],
  ["unsafe_attempt", "UPDATE \"ZapRunExecutionAttempt\" SET \"retryAfterSeconds\" = NULL WHERE \"executionId\" = $1"],
  ["unsupported_failure", "UPDATE \"ZapRunRetry\" SET \"providerStatus\" = 500 WHERE id = $1"],
  ["stale_execution", "UPDATE \"ZapRunExecution\" SET status = 'SUCCESS' WHERE id = $1"],
  ["active_lease", "UPDATE \"ZapRunExecution\" SET \"leaseUntil\" = now() + interval '1 hour' WHERE id = $1"],
  ["invalid_order", "UPDATE \"Action\" SET \"sortingOrder\" = 2 WHERE id = $1"],
  ["invalid_inputs", "UPDATE \"Action\" SET metadata = '{}'::jsonb WHERE id = $1"],
  ["changed_fingerprint", "UPDATE \"Action\" SET metadata = jsonb_set(metadata, '{message}', '\"changed\"') WHERE id = $1"],
] as const)("PostgreSQL request blocks %s after approval", async (reason, sql) => {
  const { input, execution, action } = await setup();
  const target = sql.includes('"ZapRunExecutionAttempt"') || sql.includes('"ZapRunExecution"') ? execution.id
    : sql.includes('"Action"') ? action.id : input.caseId;
  const client = await fixture.pool.connect();
  try { await client.query(`SET search_path TO "${fixture.schema}"`); await client.query(sql, [target]); }
  finally { client.release(); }
  const service = new ReplayService(fixture.db);
  expect(await service.dryRun(input)).toMatchObject({ status: "blocked", reasons: expect.arrayContaining([reason]) });
  await expect(service.request(input)).rejects.toThrow();
  expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayRequest" WHERE "caseId" = ${input.caseId}`)).toHaveLength(0);
});

test("unsupported taxonomy, cooldown and contradictory captured identities block durable intent", async () => {
  const unsupported = await setup({ taxonomyId: "F02" });
  await expect(new ReplayService(fixture.db).request(unsupported.input)).rejects.toThrow("unsupported_proposal");
  const cooldown = await setup({}, new Date(Date.now() + 60_000));
  await expect(new ReplayService(fixture.db).request(cooldown.input)).rejects.toThrow("cooldown_pending");
  const contradiction = await setup();
  await fixture.db.zapRunExecution.update({ where: { id: contradiction.execution.id }, data: { providerOutcome: "unknown" } });
  await expect(new ReplayService(fixture.db).request(contradiction.input)).rejects.toThrow("unknown_outcome");
  const mismatched = await setup();
  await fixture.db.zapRunExecutionAttempt.updateMany({ where: { executionId: mismatched.execution.id }, data: { requestFingerprint: "f".repeat(64) } });
  await expect(new ReplayService(fixture.db).request(mismatched.input)).rejects.toThrow("missing_evidence");
});

test("request denies revoked permission, owner mismatch, stale version and changed handler", async () => {
  const { input } = await setup();
  const service = new ReplayService(fixture.db);
  await expect(service.request({ ...input, subjectOwnerId: input.subjectOwnerId + 1 })).rejects.toThrow("binding");
  await expect(service.request({ ...input, proposalVersion: 2 })).rejects.toThrow("version");
  await setOperator(fixture.db, input.actorId, false);
  await expect(service.request(input)).rejects.toThrow("permission");
  await setOperator(fixture.db, input.actorId, true);
  process.env.WORKER_HANDLER_VERSION = "test-worker-v2";
  try { await expect(service.request(input)).rejects.toThrow("changed_handler"); }
  finally { process.env.WORKER_HANDLER_VERSION = "test-worker-v1"; }
});

test("simultaneous duplicate request IDs recover the same durable intent", async () => {
  const { input } = await setup();
  const service = new ReplayService(fixture.db);
  const responses = await Promise.all([service.request(input), service.request(input)]);
  expect(responses[0]).toEqual(responses[1]);
  expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayRequest" WHERE "approvalId" = ${input.approvalId}`)).toHaveLength(1);
});

test("canonical owner, unique contiguous stages, predecessors and incompatible successors are mandatory", async () => {
  const moved = await setup();
  await fixture.db.zap.update({ where: { id: moved.zap.id }, data: { userId: moved.input.actorId } });
  await expect(new ReplayService(fixture.db).request(moved.input)).rejects.toThrow("case binding mismatch");
  const duplicate = await setup();
  await fixture.db.action.create({ data: { zapId: duplicate.zap.id, actionId: "telegram", sortingOrder: 0, metadata: duplicate.action.metadata! } });
  await expect(new ReplayService(fixture.db).request(duplicate.input)).rejects.toThrow("invalid_order");
  const predecessor = await setup();
  await fixture.db.action.update({ where: { id: predecessor.action.id }, data: { sortingOrder: 1 } });
  await fixture.db.action.create({ data: { zapId: predecessor.zap.id, actionId: "telegram", sortingOrder: 0, metadata: predecessor.action.metadata! } });
  await fixture.db.zapRunExecution.update({ where: { id: predecessor.execution.id }, data: { stage: 1 } });
  await fixture.db.zapRunRetry.update({ where: { id: predecessor.input.caseId }, data: { stage: 1 } });
  await fixture.db.zapRunExecution.create({ data: { zapRunId: predecessor.run.id, stage: 0, status: "FAILED" } });
  await expect(new ReplayService(fixture.db).request(predecessor.input)).rejects.toThrow("invalid_order");
  const successor = await setup();
  await fixture.db.zapRunExecution.create({ data: { zapRunId: successor.run.id, stage: 1, status: "SUCCESS" } });
  await expect(new ReplayService(fixture.db).request(successor.input)).rejects.toThrow("invalid_order");
});

test("new proposal revision invalidates the old approval", async () => {
  const { input } = await setup();
  await fixture.db.$executeRaw(Prisma.sql`INSERT INTO "TriageProposal"
    (id, "investigationId", "caseId", "subjectOwnerId", version, disposition, status, proposal, policy,
      "evidenceHash", "configurationHash", "expiresAt")
    SELECT ${randomUUID()}, "investigationId", "caseId", "subjectOwnerId", version + 1, disposition,
      status, proposal, policy, "evidenceHash", "configurationHash", "expiresAt"
    FROM "TriageProposal" WHERE id = (SELECT "proposalId" FROM "TriageApproval" WHERE id = ${input.approvalId})`);
  await expect(new ReplayService(fixture.db).request(input)).rejects.toThrow("stale proposal version");
});

test("request rolls back intent, generation and audit together when generation persistence fails", async () => {
  const { input } = await setup();
  await fixture.db.$executeRawUnsafe(`CREATE FUNCTION fail_test_generation() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'test generation unavailable'; END; $$`);
  await fixture.db.$executeRawUnsafe(`CREATE TRIGGER fail_test_generation BEFORE INSERT ON "ReplayExecution"
    FOR EACH ROW EXECUTE FUNCTION fail_test_generation()`);
  try {
    await expect(new ReplayService(fixture.db).request(input)).rejects.toThrow();
    expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayRequest" WHERE "caseId" = ${input.caseId}`)).toHaveLength(0);
    expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "TriageAccessAudit" WHERE "caseId" = ${input.caseId} AND action = 'replay_request'`)).toHaveLength(0);
  } finally { await fixture.db.$executeRawUnsafe('DROP TRIGGER fail_test_generation ON "ReplayExecution"'); }
  expect(await new ReplayService(fixture.db).request(input)).toMatchObject({ id: input.requestId });
});

test("expired and non-approve authority cannot create a request; original approver must still have permission", async () => {
  const { input } = await setup();
  const [approval] = await fixture.db.$queryRaw<{ proposalId: string }[]>(Prisma.sql`SELECT "proposalId" FROM "TriageApproval" WHERE id = ${input.approvalId}`);
  // Separate synthetic authorities against cloned proposals exercise expiry/rejection without mutating approvals.
  for (const decision of ["approve", "reject"]) {
    const proposalId = randomUUID(), approvalId = randomUUID();
    await fixture.db.$executeRaw(Prisma.sql`INSERT INTO "TriageProposal"
      (id, "investigationId", "caseId", "subjectOwnerId", version, disposition, status, proposal, policy, "evidenceHash", "expiresAt")
      SELECT ${proposalId}, ${randomUUID()}, "caseId", "subjectOwnerId", 1, disposition, status, proposal, policy, "evidenceHash", "expiresAt"
      FROM "TriageProposal" WHERE id = ${approval!.proposalId}`);
    await fixture.db.$executeRaw(Prisma.sql`INSERT INTO "TriageApproval"
      (id, "proposalId", "caseId", "subjectOwnerId", "approvedBy", decision, "proposalVersion", "expiresAt")
      VALUES (${approvalId}, ${proposalId}, ${input.caseId}, ${input.subjectOwnerId}, ${input.actorId}, ${decision}, 1,
        ${decision === "approve" ? new Date(0) : new Date(Date.now() + 60_000)})`);
    await expect(new ReplayService(fixture.db).request({ ...input, approvalId }))
      .rejects.toThrow(decision === "approve" ? "approval_expired" : "approval_required");
  }
  const requester = await fixture.db.user.create({ data: { name: "second operator", email: `${randomUUID()}@example.invalid` } });
  await setOperator(fixture.db, requester.id, true);
  await setOperator(fixture.db, input.actorId, false);
  await expect(new ReplayService(fixture.db).request({ ...input, actorId: requester.id })).rejects.toThrow("approver permission revoked");
});

const replayEvent = (input: { requestId: string }, run: { id: string }) =>
  ({ zapRunId: run.id, stage: 0, replayRequestId: input.requestId });
const replayStore = () => createReplayStore(fixture.db, { enabled: true, handlerVersion: "test-worker-v1" });
const acceptedHandler = { type: "telegram", execute: async () =>
  ({ provider: "telegram" as const, phase: "send" as const, outcome: "accepted" as const, safeReceiptId: "receipt" }) };

test("9B is disabled by default and forged/mismatched envelopes cannot invoke a provider", async () => {
  const { input, run } = await setup();
  await new ReplayService(fixture.db).request(input);
  let sends = 0;
  const handler = { ...acceptedHandler, execute: async () => { sends++; return acceptedHandler.execute(); } };
  const event = replayEvent(input, run);
  expect(await executeReplayStage({ event, store: createReplayStore(fixture.db), getHandler: () => handler }))
    .toEqual({ ack: false, advance: false });
  for (const invalid of [{ ...event, replayRequestId: randomUUID() }, { ...event, zapRunId: randomUUID() }, { ...event, stage: 1 }]) {
    expect(await executeReplayStage({ event: invalid, store: replayStore(), getHandler: () => handler }))
      .toEqual({ ack: true, advance: false });
  }
  expect(sends).toBe(0);
  expect(await createReplayDispatcher(fixture.db, { send: async () => { sends++; } }).dispatchOne()).toBe(false);
  expect(sends).toBe(0);
});

test("dispatcher retries with the same request identity, records broker ACK, and preserves immutable authority", async () => {
  const { input, run } = await setup();
  await new ReplayService(fixture.db).request(input);
  const before = await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayRequest" WHERE id = ${input.requestId}`);
  const messages: string[] = [];
  let now = new Date();
  const dispatcher = createReplayDispatcher(fixture.db, { send: async ({ value }) => {
    if (JSON.parse(value).replayRequestId !== input.requestId) return;
    messages.push(value); if (messages.length === 1) throw new Error("broker unavailable");
  } }, { enabled: true, now: () => now });
  // Earlier cases intentionally leave queued intents in this suite's isolated schema.
  for (let count = 0; messages.length === 0 && count < 100; count++) await dispatcher.dispatchOne();
  const [failed] = await fixture.db.$queryRaw<{ publishedAt: Date | null; dispatchAttempts: number }[]>(Prisma.sql`
    SELECT "publishedAt", "dispatchAttempts" FROM "ReplayExecution" WHERE "requestId" = ${input.requestId}`);
  expect(failed).toEqual({ publishedAt: null, dispatchAttempts: 1 });
  while (await dispatcher.dispatchOne()) { /* drain other due fixture intents */ }
  now = new Date(now.getTime() + 65_000);
  while (await dispatcher.dispatchOne()) { /* includes the delayed identity */ }
  expect(messages.map(value => JSON.parse(value))).toEqual([replayEvent(input, run), replayEvent(input, run)]);
  expect(await dispatcher.dispatchOne()).toBe(false);
  expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayRequest" WHERE id = ${input.requestId}`)).toEqual(before);
});

test("competing worker deliveries select one immutable input snapshot and one provider attempt", async () => {
  const { input, execution, action, run } = await setup();
  await new ReplayService(fixture.db).request(input);
  const before = await fixture.db.zapRunExecution.findUnique({ where: { id: execution.id }, include: { attempts: true, failure: true } });
  let sends = 0;
  const handler = { ...acceptedHandler, execute: async (metadata: Record<string, unknown>, ctx: { idempotencyKey: string }) => {
    sends++;
    await fixture.db.action.update({ where: { id: action.id }, data: { metadata: { message: "changed" } } });
    expect(metadata.message).toBe("No send");
    expect(ctx.idempotencyKey).toBe(`zaprun_${run.id}_stage_0`);
    return acceptedHandler.execute();
  } };
  const store = replayStore(), event = replayEvent(input, run);
  const results = await Promise.all([executeReplayStage({ event, store, getHandler: () => handler }),
    executeReplayStage({ event, store, getHandler: () => handler })]);
  expect(results.some(result => result.advance)).toBe(true);
  expect(sends).toBe(1);
  expect(await executeReplayStage({ event, store, getHandler: () => handler })).toEqual({ ack: true, advance: true, nextStage: null });
  expect(sends).toBe(1);
  expect(await fixture.db.zapRunExecution.findUnique({ where: { id: execution.id }, include: { attempts: true, failure: true } })).toEqual(before);
  expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "ReplayExecutionAttempt" WHERE "requestId" = ${input.requestId}`)).toHaveLength(1);
  const fingerprints = createFingerprints({ zapRunId: run.id, stage: 0, actionId: action.id,
    actionTypeId: "telegram", actionMetadata: action.metadata as Record<string, unknown>, zapRunMetadata: {} });
  expect(await store.stageResolution({ zapRunId: run.id, stage: 0 }, fingerprints)).toEqual({ ack: true, advance: true, nextStage: null });
  expect(await store.stageResolution({ zapRunId: run.id, stage: 0 }, { ...fingerprints, requestFingerprint: "f".repeat(64) })).toBeNull();
});

test.each(["SUCCESS", "permission", "fingerprint", "handler", "revision"])("worker revalidation refuses %s after request creation", async kind => {
  const { input, execution, action, run } = await setup();
  await new ReplayService(fixture.db).request(input);
  if (kind === "SUCCESS") await fixture.db.zapRunExecution.update({ where: { id: execution.id }, data: { status: "SUCCESS" } });
  if (kind === "permission") await setOperator(fixture.db, input.actorId, false);
  if (kind === "fingerprint") await fixture.db.action.update({ where: { id: action.id }, data: { metadata: { message: "changed" } } });
  if (kind === "revision") await fixture.db.$executeRaw(Prisma.sql`INSERT INTO "TriageProposal"
    (id, "investigationId", "caseId", "subjectOwnerId", version, disposition, status, proposal, policy, "evidenceHash", "expiresAt")
    SELECT ${randomUUID()}, "investigationId", "caseId", "subjectOwnerId", version + 1, disposition, status, proposal, policy, "evidenceHash", "expiresAt"
    FROM "TriageProposal" WHERE id = (SELECT "proposalId" FROM "TriageApproval" WHERE id = ${input.approvalId})`);
  let sends = 0;
  const store = kind === "handler" ? createReplayStore(fixture.db, { enabled: true, handlerVersion: "other" }) : replayStore();
  expect(await executeReplayStage({ event: replayEvent(input, run), store, getHandler: () => ({ ...acceptedHandler,
    execute: async () => { sends++; return acceptedHandler.execute(); } }) })).toEqual({ ack: true, advance: false });
  expect(sends).toBe(0);
});

test.each(["rejected", "timeout", "expired lease"])("failed/unknown replay %s is terminal and preserves original history", async kind => {
  const { input, execution, run } = await setup();
  await new ReplayService(fixture.db).request(input);
  const before = await fixture.db.zapRunExecution.findUnique({ where: { id: execution.id }, include: { attempts: true, failure: true } });
  const event = replayEvent(input, run), store = replayStore();
  let sends = 0;
  const handler = { ...acceptedHandler, execute: async () => {
    sends++;
    if (kind === "timeout") return new Promise<never>(() => {});
    throw new ActionExecutionError("private error", { provider: "telegram", phase: "send", outcome: "rejected", safeCode: "telegram_http_429", status: 429, retryAfterSeconds: 1 });
  } };
  if (kind === "expired lease") {
    const claim = await store.claim(event);
    expect(claim.kind).toBe("CLAIMED");
    await fixture.db.$executeRaw(Prisma.sql`UPDATE "ReplayExecution" SET "leaseUntil" = now() - interval '1 second' WHERE "requestId" = ${input.requestId}`);
    expect(await executeReplayStage({ event, store, getHandler: () => handler })).toEqual({ ack: true, advance: false });
    if (claim.kind === "CLAIMED") expect(await store.complete(claim, await acceptedHandler.execute())).toBe(false);
  } else expect(await executeReplayStage({ event, store, getHandler: () => handler, timeoutMs: 10 })).toEqual({ ack: true, advance: false });
  expect(await executeReplayStage({ event, store, getHandler: () => handler })).toEqual({ ack: true, advance: false });
  expect(sends).toBe(kind === "expired lease" ? 0 : 1);
  const [failure] = await fixture.db.$queryRaw<{ providerOutcome: string }[]>(Prisma.sql`SELECT "providerOutcome" FROM "ReplayFailure" WHERE "requestId" = ${input.requestId}`);
  expect(failure?.providerOutcome).toBe(kind === "rejected" ? "rejected" : "unknown");
  expect(await fixture.db.zapRunExecution.findUnique({ where: { id: execution.id }, include: { attempts: true, failure: true } })).toEqual(before);
  await expect(new ReplayService(fixture.db).request({ ...input, requestId: randomUUID() })).rejects.toThrow("replay_limit");
});

test("successful replay and duplicate delivery retain the validated successor after mutable configuration changes", async () => {
  const { input, run, zap } = await setup({}, new Date(Date.now() - 120_000), true);
  await new ReplayService(fixture.db).request(input);
  const store = replayStore(), event = replayEvent(input, run);
  let sends = 0;
  const handler = { ...acceptedHandler, execute: async () => {
    sends++;
    await fixture.db.action.deleteMany({ where: { zapId: zap.id, sortingOrder: 1 } });
    return acceptedHandler.execute();
  } };
  expect(await executeReplayStage({ event, store, getHandler: () => handler })).toEqual({ ack: true, advance: true, nextStage: 1 });
  expect(await executeReplayStage({ event, store, getHandler: () => handler })).toEqual({ ack: true, advance: true, nextStage: 1 });
  expect(sends).toBe(1);
});

test("failed outcome persistence rolls back together and redelivery quarantines without resending", async () => {
  const { input, run } = await setup();
  await new ReplayService(fixture.db).request(input);
  const store = replayStore(), event = replayEvent(input, run);
  await fixture.db.$executeRawUnsafe(`CREATE FUNCTION fail_test_replay_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'test replay failure unavailable'; END; $$`);
  await fixture.db.$executeRawUnsafe(`CREATE TRIGGER fail_test_replay_failure BEFORE INSERT ON "ReplayFailure"
    FOR EACH ROW EXECUTE FUNCTION fail_test_replay_failure()`);
  let sends = 0;
  const handler = { ...acceptedHandler, execute: async () => {
    sends++;
    throw new ActionExecutionError("rejected", { provider: "telegram", phase: "send", outcome: "rejected", safeCode: "telegram_http_429", status: 429 });
  } };
  try {
    await expect(executeReplayStage({ event, store, getHandler: () => handler })).rejects.toThrow();
    const [state] = await fixture.db.$queryRaw<{ status: string; attemptStatus: string }[]>(Prisma.sql`
      SELECT execution.status, attempt.status AS "attemptStatus" FROM "ReplayExecution" execution
      JOIN "ReplayExecutionAttempt" attempt ON attempt."requestId" = execution."requestId"
      WHERE execution."requestId" = ${input.requestId}`);
    expect(state).toEqual({ status: "RUNNING", attemptStatus: "STARTED" });
    expect(await executeReplayStage({ event, store, getHandler: () => handler })).toEqual({ ack: false, advance: false });
  } finally { await fixture.db.$executeRawUnsafe('DROP TRIGGER fail_test_replay_failure ON "ReplayFailure"'); }
  await fixture.db.$executeRaw(Prisma.sql`UPDATE "ReplayExecution" SET "leaseUntil" = now() - interval '1 second' WHERE "requestId" = ${input.requestId}`);
  expect(await executeReplayStage({ event, store, getHandler: () => handler })).toEqual({ ack: true, advance: false });
  expect(sends).toBe(1);
  const [failure] = await fixture.db.$queryRaw<{ providerOutcome: string }[]>(Prisma.sql`SELECT "providerOutcome" FROM "ReplayFailure" WHERE "requestId" = ${input.requestId}`);
  expect(failure?.providerOutcome).toBe("unknown");
});

test.each(["username", "environment credential"])("replay blocks unproven same-input %s", async kind => {
  const { input, run } = await setup({}, new Date(Date.now() - 120_000), false,
    kind === "username" ? { channelUserName: "@reassigned" } : { botToken: "" });
  await new ReplayService(fixture.db).request(input);
  const previous = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = "rotated:token";
  let sends = 0;
  try {
    expect(await executeReplayStage({ event: replayEvent(input, run), store: replayStore(), getHandler: () => ({
      ...acceptedHandler, execute: async () => { sends++; return acceptedHandler.execute(); },
    }) })).toEqual({ ack: true, advance: false });
    expect(sends).toBe(0);
  } finally {
    if (previous === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previous;
  }
});
