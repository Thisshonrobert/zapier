import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { prisma } from "../../../packages/db/prisma/db.ts";
import {
  TriageCaseNotFound,
  TriageEvidenceService,
  type TriageEvidenceDb,
} from "../services/triage-evidence.ts";
import {
  ActionInputValidationEvidenceSchema,
  ExecutionEvidenceSchema,
  FailureContextEvidenceSchema,
} from "../../ai_agent/src/contracts.ts";

const suffix = randomUUID();
const ownedRunId = randomUUID();
const foreignRunId = randomUUID();
const orphanRunId = randomUUID();
const ownedCaseId = randomUUID();
const foreignCaseId = randomUUID();
const orphanCaseId = randomUUID();
const actionTypeId = `phase4-action-${suffix}`;
const executionId = randomUUID();
let ownerId = 0;
let foreignOwnerId = 0;

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { name: "phase4-owner", email: `phase4-owner-${suffix}@example.invalid` },
  });
  const foreignOwner = await prisma.user.create({
    data: { name: "phase4-foreign", email: `phase4-foreign-${suffix}@example.invalid` },
  });
  ownerId = owner.id;
  foreignOwnerId = foreignOwner.id;
  await prisma.availableAction.create({
    data: { id: actionTypeId, name: "Phase 4 test action", imageUrl: "https://example.invalid/action.png" },
  });
  const ownedZap = await prisma.zap.create({ data: { userId: ownerId } });
  const foreignZap = await prisma.zap.create({ data: { userId: foreignOwnerId } });
  await prisma.action.createMany({ data: [
    { id: randomUUID(), actionId: actionTypeId, zapId: ownedZap.id, sortingOrder: 0, metadata: { nested: { botToken: "never-return-this" }, message: "{{customer.name}}" } },
    { id: randomUUID(), actionId: actionTypeId, zapId: foreignZap.id, sortingOrder: 0, metadata: {} },
  ] });
  await prisma.zapRun.createMany({ data: [
    { id: ownedRunId, zapId: ownedZap.id, metadata: { customer: { name: "Ada", email: "ada@example.invalid" } } },
    { id: foreignRunId, zapId: foreignZap.id, metadata: {} },
  ] });
  await prisma.zapRunExecution.create({ data: {
    id: executionId,
    zapRunId: ownedRunId,
    stage: 0,
    status: "FAILED",
    completedAt: new Date("2026-09-24T00:00:01.000Z"),
    providerOutcome: "rejected",
    actionFingerprint: "a".repeat(64),
    requestFingerprint: "b".repeat(64),
    requiresHuman: true,
  } });
  await prisma.zapRunExecutionAttempt.create({ data: {
    executionId,
    attemptNumber: 1,
    status: "REJECTED",
    provider: "telegram",
    phase: "send",
    safeCode: "telegram_http_429",
    providerStatus: 429,
    actionFingerprint: "a".repeat(64),
    requestFingerprint: "b".repeat(64),
    completedAt: new Date("2026-09-24T00:00:01.000Z"),
  } });
  await prisma.zapRunRetry.createMany({ data: [
    { id: ownedCaseId, zapRunId: ownedRunId, stage: 0, executionId, providerOutcome: "rejected", safeCode: "telegram_http_429", requiresHuman: true, evidenceSource: "captured", lastError: "Bearer this-must-never-leak" },
    { id: foreignCaseId, zapRunId: foreignRunId, stage: 0, requiresHuman: true, evidenceSource: "captured" },
    { id: orphanCaseId, zapRunId: orphanRunId, stage: 0, requiresHuman: true, evidenceSource: "captured" },
  ] });
});

afterAll(async () => {
  await prisma.zapRunRetry.deleteMany({ where: { id: { in: [ownedCaseId, foreignCaseId, orphanCaseId] } } });
  await prisma.zapRunExecutionAttempt.deleteMany({ where: { executionId } });
  await prisma.zapRunExecution.deleteMany({ where: { id: executionId } });
  await prisma.zapRun.deleteMany({ where: { id: { in: [ownedRunId, foreignRunId] } } });
  await prisma.action.deleteMany({ where: { actionId: actionTypeId } });
  await prisma.zap.deleteMany({ where: { userId: { in: [ownerId, foreignOwnerId] } } });
  await prisma.availableAction.deleteMany({ where: { id: actionTypeId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, foreignOwnerId] } } });
  await prisma.$disconnect();
});

describe("Phase 4A PostgreSQL ownership join", () => {
  const service = new TriageEvidenceService(prisma as unknown as TriageEvidenceDb);

  test("lists only joined owner cases and excludes foreign and orphan rows", async () => {
    const cases = await service.listCases(ownerId);
    expect(cases.map((item) => item.case_id)).toContain(ownedCaseId);
    expect(cases.map((item) => item.case_id)).not.toContain(foreignCaseId);
    expect(cases.map((item) => item.case_id)).not.toContain(orphanCaseId);
  });

  test("rechecks ownership for evidence and returns only structural payload facts", async () => {
    const evidence = await service.getFailureContext(ownerId, ownedCaseId);
    FailureContextEvidenceSchema.parse(evidence);
    expect(evidence.source_ref.case_id).toBe(ownedCaseId);
    expect(evidence.facts.payload.paths).toContainEqual({ path: "customer.name", type: "string" });
    expect(JSON.stringify(evidence)).not.toContain("Ada");
    expect(JSON.stringify(evidence)).not.toContain("this-must-never-leak");
    await expect(service.getFailureContext(ownerId, foreignCaseId)).rejects.toBeInstanceOf(
      TriageCaseNotFound,
    );
    await expect(service.getFailureContext(ownerId, orphanCaseId)).rejects.toBeInstanceOf(
      TriageCaseNotFound,
    );
  });

  test("owner-binds execution evidence and validation through the same join", async () => {
    const execution = await service.getExecutionEvidence(ownerId, ownedCaseId);
    ExecutionEvidenceSchema.parse(execution);
    expect(execution.facts.current_execution?.status).toBe("FAILED");
    expect(execution.facts.attempts[0]?.provider_outcome).toBe("rejected");
    const validation = await service.validateActionInputs(ownerId, ownedCaseId);
    ActionInputValidationEvidenceSchema.parse(validation);
    expect(validation.facts.validation_status).toBe("blocked");
    await expect(service.getExecutionEvidence(foreignOwnerId, ownedCaseId)).rejects.toBeInstanceOf(
      TriageCaseNotFound,
    );
    await expect(service.validateActionInputs(foreignOwnerId, ownedCaseId)).rejects.toBeInstanceOf(
      TriageCaseNotFound,
    );
  });
});
