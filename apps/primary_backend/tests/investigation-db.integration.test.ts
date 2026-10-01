import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { InvestigationAuthority } from "../services/investigation-authority.ts";
import { InvestigationNotifications } from "../services/investigation-notifications.ts";
import { createPostgresFixture, setOperator } from "./postgres-fixture.ts";

let fixture: Awaited<ReturnType<typeof createPostgresFixture>>;
beforeAll(async () => { fixture = await createPostgresFixture(); });
afterAll(async () => { if (fixture) await fixture.close(); });

async function setup(disposition = "replay_candidate", expiresAt = new Date(Date.now() + 60_000)) {
  const db = fixture.db;
  const owner = await db.user.create({ data: { name: "owner", email: `${randomUUID()}@example.invalid` } });
  const actor = await db.user.create({ data: { name: "operator", email: `${randomUUID()}@example.invalid` } });
  await setOperator(db, actor.id, true);
  const zap = await db.zap.create({ data: { userId: owner.id } });
  const run = await db.zapRun.create({ data: { zapId: zap.id, metadata: {} } });
  const retry = await db.zapRunRetry.create({ data: { zapRunId: run.id, stage: 0 } });
  const id = randomUUID(), investigationId = randomUUID();
  await db.$executeRaw(Prisma.sql`INSERT INTO "TriageProposal"
    (id, "investigationId", "caseId", "subjectOwnerId", version, disposition, status,
     proposal, policy, "evidenceHash", "expiresAt")
    VALUES (${id}, ${investigationId}, ${retry.id}, ${owner.id}, 1, ${disposition},
      ${disposition === "replay_candidate" ? "requires_approval" : "no_action"}, '{}'::jsonb,
      '{}'::jsonb, ${"a".repeat(64)}, ${expiresAt})`);
  return { proposalId: id, investigationId, caseId: retry.id, subjectOwnerId: owner.id,
    actorId: actor.id, decisionId: randomUUID(), decision: "approve" as const };
}

test("PostgreSQL serializes competing decisions and deduplicates a committed decision", async () => {
  const input = await setup();
  const authority = new InvestigationAuthority(fixture.db, async () => ({ status: "requires_approval" }));
  const attempts = await Promise.allSettled([authority.decide(input), authority.decide({ ...input, decisionId: randomUUID() })]);
  expect(attempts.filter(x => x.status === "fulfilled")).toHaveLength(1);
  const decision = attempts.find(x => x.status === "fulfilled")! as PromiseFulfilledResult<{ id: string }>;
  expect(await authority.decide({ ...input, decisionId: decision.value.id })).toMatchObject(decision.value);
  const rows = await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "TriageApproval" WHERE "proposalId" = ${input.proposalId}`);
  expect(rows).toHaveLength(1);
});

test("permission, subject/case mismatch, expiry and disposition fail closed in PostgreSQL", async () => {
  const input = await setup();
  const authority = new InvestigationAuthority(fixture.db, async () => ({ status: "requires_approval" }));
  await expect(authority.decide({ ...input, subjectOwnerId: input.subjectOwnerId + 1 })).rejects.toThrow("binding mismatch");
  await expect(authority.decide({ ...input, caseId: randomUUID() })).rejects.toThrow("binding mismatch");
  await expect(authority.decide({ ...input, actorId: input.subjectOwnerId })).rejects.toThrow("permission revoked");
  await setOperator(fixture.db, input.actorId, false);
  await expect(authority.decide(input)).rejects.toThrow("permission revoked");
  await expect(authority.decide(await setup("replay_candidate", new Date(0)))).rejects.toThrow("expired");
  for (const disposition of ["owner_action_required", "engineering_escalation_required", "resolved_without_replay"]) {
    const manual = await setup(disposition);
    await expect(authority.decide(manual)).rejects.toThrow("conflicts");
    const decision = disposition === "owner_action_required" ? "mark_owner_action_required"
      : disposition === "engineering_escalation_required" ? "escalate_to_engineering" : "resolve_without_replay";
    expect(await authority.decide({ ...manual, decision })).toMatchObject({ decision });
  }
  const rejected = await setup();
  expect(await authority.decide({ ...rejected, decision: "reject" })).toMatchObject({ decision: "reject" });
});

test("audit failure rolls back approval and notification in the real database", async () => {
  const input = await setup();
  await fixture.db.$executeRawUnsafe(`CREATE FUNCTION fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'test audit unavailable'; END; $$`);
  await fixture.db.$executeRawUnsafe(`CREATE TRIGGER fail_test_audit BEFORE INSERT ON "TriageAccessAudit"
    FOR EACH ROW EXECUTE FUNCTION fail_test_audit()`);
  try {
    await expect(new InvestigationAuthority(fixture.db, async () => ({ status: "requires_approval" })).decide(input))
      .rejects.toThrow();
    expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "TriageApproval" WHERE id = ${input.decisionId}`)).toHaveLength(0);
    expect(await fixture.db.$queryRaw<unknown[]>(Prisma.sql`SELECT * FROM "TriageDecisionNotification" WHERE "decisionId" = ${input.decisionId}`)).toHaveLength(0);
  } finally { await fixture.db.$executeRawUnsafe('DROP TRIGGER fail_test_audit ON "TriageAccessAudit"'); }
});

test("commit before notification survives a new delivery service and a lost acknowledgement", async () => {
  const input = await setup();
  await new InvestigationAuthority(fixture.db, async () => ({ status: "requires_approval" })).decide(input);
  let calls = 0;
  const notify = async () => { calls++; if (calls === 1) throw new Error("lost response"); };
  expect(await new InvestigationNotifications(fixture.db, notify).deliver(input.decisionId)).toBe(false);
  expect(await new InvestigationNotifications(fixture.db, notify).deliver(input.decisionId)).toBe(true);
  expect(await new InvestigationNotifications(fixture.db, notify).deliver(input.decisionId)).toBe(true);
  expect(calls).toBe(2);
});

test("saved authority survives reload and blocks revoked actors, ownership changes and expiry", async () => {
  const input = await setup();
  const authority = () => new InvestigationAuthority(fixture.db, async () => ({ status: "requires_approval", reasons: [] }));
  expect(await authority().snapshot(input)).toMatchObject({ version: 1, decision: null,
    allowedDecisions: ["approve", "reject"], replay: null, replayEnabled: false });
  await expect(authority().decide({ ...input, proposalVersion: 2 })).rejects.toThrow("stale proposal version");
  await authority().decide({ ...input, proposalVersion: 1 });
  expect(await authority().snapshot(input)).toMatchObject({ decision: { decision: "approve", approvedBy: input.actorId },
    allowedDecisions: [], replay: null });
  await expect(authority().snapshot({ ...input, subjectOwnerId: input.subjectOwnerId + 1 })).rejects.toThrow("binding changed");
  await setOperator(fixture.db, input.actorId, false);
  await expect(authority().snapshot(input)).rejects.toThrow("permission revoked");
  const expired = await setup("replay_candidate", new Date(0));
  expect(await authority().snapshot(expired)).toMatchObject({ allowedDecisions: [], reasons: ["proposal_expired"] });
});
