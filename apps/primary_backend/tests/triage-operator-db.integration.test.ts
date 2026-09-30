import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { prisma } from "../../../packages/db/prisma/db.ts";
import { TriageOperatorDenied, TriageOperatorService } from "../services/triage-operator.ts";

const suffix = randomUUID();
const caseId = randomUUID();
const runId = randomUUID();
let operatorId = 0;
let ownerId = 0;
let ordinaryId = 0;
let zapId = "";

beforeAll(async () => {
  const [operator, owner, ordinary] = await Promise.all([
    prisma.user.create({ data: { name: "triage-operator", email: `operator-${suffix}@example.invalid` } }),
    prisma.user.create({ data: { name: "triage-owner", email: `owner-${suffix}@example.invalid` } }),
    prisma.user.create({ data: { name: "triage-ordinary", email: `ordinary-${suffix}@example.invalid` } }),
  ]);
  operatorId = operator.id;
  ownerId = owner.id;
  ordinaryId = ordinary.id;
  await prisma.$executeRaw(Prisma.sql`UPDATE "User" SET "isSupportOperator" = true WHERE id = ${operatorId}`);
  const zap = await prisma.zap.create({ data: { userId: ownerId } });
  zapId = zap.id;
  await prisma.zapRun.create({ data: { id: runId, zapId, metadata: {} } });
  await prisma.zapRunRetry.create({ data: { id: caseId, zapRunId: runId, stage: 0 } });
});

afterAll(async () => {
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "TriageAccessAudit" WHERE "actorId" IN (${operatorId}, ${ordinaryId})`);
  await prisma.zapRunRetry.deleteMany({ where: { id: caseId } });
  await prisma.zapRun.deleteMany({ where: { id: runId } });
  await prisma.zap.deleteMany({ where: { id: zapId } });
  await prisma.user.deleteMany({ where: { id: { in: [operatorId, ownerId, ordinaryId] } } });
  await prisma.$disconnect();
});

describe("Phase 10A PostgreSQL operator boundary", () => {
  const service = new TriageOperatorService(prisma);

  test("operator discovers and binds a foreign owner's case with durable attribution", async () => {
    const cases = await service.listCases(operatorId, 50);
    expect(cases).toContainEqual(expect.objectContaining({ case_id: caseId, subject_owner_id: ownerId }));
    expect(await service.resolveCase(operatorId, caseId, "diagnose"))
      .toMatchObject({ case_id: caseId, zap_run_id: runId, subject_owner_id: ownerId, stage: 0 });
    const audit = await prisma.$queryRaw<{ actorId: number; subjectOwnerId: number; action: string }[]>(Prisma.sql`
      SELECT "actorId", "subjectOwnerId", action FROM "TriageAccessAudit"
      WHERE "actorId" = ${operatorId} AND "caseId" = ${caseId} AND outcome = 'allowed'
    `);
    expect(audit).toContainEqual({ actorId: operatorId, subjectOwnerId: ownerId, action: "diagnose" });
  });

  test("ordinary owner is denied and revocation takes effect on the next read", async () => {
    await expect(service.resolveCase(ordinaryId, caseId)).rejects.toBeInstanceOf(TriageOperatorDenied);
    await prisma.$executeRaw(Prisma.sql`UPDATE "User" SET "isSupportOperator" = false WHERE id = ${operatorId}`);
    await expect(service.resolveCase(operatorId, caseId)).rejects.toBeInstanceOf(TriageOperatorDenied);
    const denied = await prisma.$queryRaw<{ actorId: number }[]>(Prisma.sql`
      SELECT "actorId" FROM "TriageAccessAudit" WHERE "actorId" = ${operatorId} AND outcome = 'denied'
    `);
    expect(denied.length).toBeGreaterThan(0);
  });
});
