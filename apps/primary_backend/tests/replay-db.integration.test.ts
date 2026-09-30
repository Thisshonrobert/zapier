import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { InvestigationAuthority } from "../services/investigation-authority.ts";
import { InvestigationProposals, evaluateSnapshotPolicy } from "../services/investigation-proposals.ts";
import { loadCurrentPolicyState, revalidateProposalPolicy } from "../services/replay-policy-facts.ts";
import { ReplayService } from "../services/replay.ts";
import { createFingerprints } from "../../worker/execution-store.ts";
import { createPostgresFixture, setOperator } from "./postgres-fixture.ts";

let fixture: Awaited<ReturnType<typeof createPostgresFixture>>;
const previousHandler = process.env.WORKER_HANDLER_VERSION;
beforeAll(async () => { process.env.WORKER_HANDLER_VERSION = "test-worker-v1"; fixture = await createPostgresFixture(); });
afterAll(async () => {
  if (previousHandler === undefined) delete process.env.WORKER_HANDLER_VERSION;
  else process.env.WORKER_HANDLER_VERSION = previousHandler;
  if (fixture) await fixture.close();
});

async function setup(storedFacts: Record<string, unknown> = {}, completedAt = new Date(Date.now() - 120_000)) {
  const db = fixture.db;
  const owner = await db.user.create({ data: { name: "owner", email: `${randomUUID()}@example.invalid` } });
  const actor = await db.user.create({ data: { name: "operator", email: `${randomUUID()}@example.invalid` } });
  await setOperator(db, actor.id, true);
  await db.availableAction.upsert({ where: { id: "telegram" }, update: {}, create: { id: "telegram", name: "Telegram", imageUrl: "test" } });
  const zap = await db.zap.create({ data: { userId: owner.id } });
  const metadata = { channelUserName: "test", message: "No send", botToken: "0:test" };
  const action = await db.action.create({ data: { zapId: zap.id, actionId: "telegram", metadata, sortingOrder: 0 } });
  const run = await db.zapRun.create({ data: { zapId: zap.id, metadata: {} } });
  const fingerprints = createFingerprints({ zapRunId: run.id, stage: 0, actionId: action.id,
    actionTypeId: "telegram", actionMetadata: metadata, zapRunMetadata: {} });
  const execution = await db.zapRunExecution.create({ data: { zapRunId: run.id, stage: 0, status: "FAILED",
    providerOutcome: "rejected", requiresHuman: true, completedAt, ...fingerprints } });
  await db.$executeRaw(Prisma.sql`UPDATE "ZapRunExecution" SET "handlerVersion" = 'test-worker-v1' WHERE id = ${execution.id}`);
  await db.zapRunExecutionAttempt.create({ data: { executionId: execution.id, attemptNumber: 1,
    status: "REJECTED", provider: "telegram", phase: "send", safeCode: "telegram_http_429", providerStatus: 429,
    retryAfterSeconds: 1, completedAt, ...fingerprints } });
  const retry = await db.zapRunRetry.create({ data: { zapRunId: run.id, stage: 0, executionId: execution.id,
    attempt: 1, provider: "telegram", phase: "send", providerOutcome: "rejected", safeCode: "telegram_http_429",
    providerStatus: 429, retryAfterSeconds: 1, evidenceSource: "captured", ...fingerprints } });
  const { current } = await loadCurrentPolicyState(db, owner.id, retry.id, "test-worker-v1");
  const refs = Object.values(current).map(x => x.evidence_id);
  const result = { contract_version: 1, graph_version: "phase-6-v1", prompt_version: "phase-6-v1",
    status: "completed", diagnosis: { taxonomy_id: "F01", summary: "Captured rejection",
    confidence: "high", evidence_refs: refs, alternate_explanations: [], missing_evidence: [] },
    proposal: { disposition: "replay_candidate", kind: "wait_then_replay", summary: "Wait and revalidate",
      reasons: ["Explicit rejection"], evidence_refs: refs, runbook_citations: [], preconditions: [], not_before: null } };
  const investigationId = randomUUID();
  const submitted = await new InvestigationProposals(db, async (tx, value) => {
    const policy = await evaluateSnapshotPolicy(tx, value);
    return { ...policy, result: { ...policy.result, status: "requires_approval" }, facts: { ...policy.facts, ...storedFacts } };
  }).submit({ investigationId,
    caseId: retry.id, subjectOwnerId: owner.id, actorId: actor.id, result, evidence: current });
  expect(submitted.status).toBe("requires_approval");
  const approvalId = randomUUID();
  if (Object.keys(storedFacts).length || completedAt > new Date()) {
    // A synthetic corrupt/stale authority fixture: production replay must distrust saved eligibility.
    await db.$executeRaw(Prisma.sql`INSERT INTO "TriageApproval"
      (id, "proposalId", "caseId", "subjectOwnerId", "approvedBy", decision, "proposalVersion", "expiresAt")
      VALUES (${approvalId}, ${submitted.id}, ${retry.id}, ${owner.id}, ${actor.id}, 'approve', 1, ${new Date(Date.now() + 60_000)})`);
  } else {
    await new InvestigationAuthority(db, revalidateProposalPolicy).decide({ proposalId: submitted.id, investigationId,
      caseId: retry.id, subjectOwnerId: owner.id, actorId: actor.id, decisionId: approvalId, decision: "approve" });
  }
  return { input: { requestId: randomUUID(), approvalId, proposalVersion: 1, caseId: retry.id,
    subjectOwnerId: owner.id, actorId: actor.id }, execution, retry, action, run, zap };
}

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
