import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { prisma } from "../../../packages/db/prisma/db.ts";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { CaseWorkflowService, type TransactionDb } from "../services/case-workflow.ts";
import { TriageEngineeringCaseNotFound, TriageEngineeringDenied, TriageEngineeringService } from "../services/triage-engineering.ts";
import { TriageViewerService } from "../services/triage-viewer.ts";

/**
 * Phase 16E against real PostgreSQL: the engineering workspace claims that a support
 * escalation is durable and reviewable after a restart, that only the routed case is
 * visible, and that returning findings puts the case back in the support queue with
 * its history intact. Those claims are only meaningful against persisted rows, so this
 * suite runs on the live schema through fresh service instances.
 */

const suffix = randomUUID();
const triggerTypeId = `phase16e-trigger-${suffix}`;

const escalatedCaseId = randomUUID();
const unroutedCaseId = randomUUID();
const escalatedRunId = randomUUID();
const unroutedRunId = randomUUID();

let engineerId = 0;
let ownerId = 0;
let supportOperatorId = 0;
let escalatedZapId = "";
let unroutedZapId = "";

let service: TriageEngineeringService;

function buildService() {
  const db = prisma as unknown as TransactionDb;
  return new TriageEngineeringService(db, new CaseWorkflowService(db));
}

beforeAll(async () => {
  const engineer = await prisma.user.create({
    data: { name: "phase16e-engineer", email: `phase16e-engineer-${suffix}@example.invalid`, isEngineer: true },
  });
  const owner = await prisma.user.create({
    data: { name: "phase16e-owner", email: `phase16e-owner-${suffix}@example.invalid` },
  });
  const operator = await prisma.user.create({
    data: { name: "phase16e-operator", email: `phase16e-operator-${suffix}@example.invalid`, isSupportOperator: true },
  });
  engineerId = engineer.id;
  ownerId = owner.id;
  supportOperatorId = operator.id;

  await prisma.availableTriggerType.create({
    data: { id: triggerTypeId, name: "Catch Hook", imageUrl: "https://example.invalid/hook.png" },
  });

  const escalatedZap = await prisma.zap.create({ data: { userId: ownerId, name: "Escalated zap" } });
  const unroutedZap = await prisma.zap.create({ data: { userId: ownerId, name: "Unrouted zap" } });
  escalatedZapId = escalatedZap.id;
  unroutedZapId = unroutedZap.id;

  await prisma.trigger.createMany({ data: [
    { zapId: escalatedZap.id, typeId: triggerTypeId },
    { zapId: unroutedZap.id, typeId: triggerTypeId },
  ] });

  await prisma.zapRun.createMany({ data: [
    { id: escalatedRunId, zapId: escalatedZap.id, metadata: {} },
    { id: unroutedRunId, zapId: unroutedZap.id, metadata: {} },
  ] });

  await prisma.zapRunRetry.createMany({ data: [
    { id: escalatedCaseId, zapRunId: escalatedRunId, stage: 1, requiresHuman: true, evidenceSource: "captured",
      providerOutcome: "unknown", safeCode: "telegram_transport_throw" },
    { id: unroutedCaseId, zapRunId: unroutedRunId, stage: 1, requiresHuman: true, evidenceSource: "captured",
      providerOutcome: "not_attempted", safeCode: "invalid_action_inputs" },
  ] });

  await prisma.triageCaseWorkflow.createMany({ data: [
    { caseId: escalatedCaseId, subjectOwnerId: ownerId, queue: "support", status: "needing_support", version: 1 },
    { caseId: unroutedCaseId, subjectOwnerId: ownerId, queue: "support", status: "needing_support", version: 1 },
  ] });

  // The escalation itself is the support-operator handoff from 16C, so the queue,
  // status, assignment and append-only event come from the real transition path.
  const workflow = new CaseWorkflowService(prisma as unknown as TransactionDb);
  await workflow.transition({
    caseId: escalatedCaseId,
    subjectOwnerId: ownerId,
    actorId: supportOperatorId,
    action: "escalate",
    toQueue: "engineering",
    toStatus: "escalated",
    escalationReason: "Send uncertainty after two retries",
    assignedEngineerId: engineerId,
    notes: "Handing to engineering after two failed reruns",
  });

  service = buildService();
});

afterAll(async () => {
  const caseIds = [escalatedCaseId, unroutedCaseId];
  await prisma.triageCaseWorkflowEvent.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.triageAccessAudit.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.triageCaseWorkflow.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.zapRunRetry.deleteMany({ where: { id: { in: caseIds } } });
  await prisma.zapRun.deleteMany({ where: { id: { in: [escalatedRunId, unroutedRunId] } } });
  await prisma.trigger.deleteMany({ where: { zapId: { in: [escalatedZapId, unroutedZapId] } } });
  await prisma.zap.deleteMany({ where: { userId: ownerId } });
  await prisma.availableTriggerType.deleteMany({ where: { id: triggerTypeId } });
  await prisma.user.deleteMany({ where: { id: { in: [engineerId, ownerId, supportOperatorId] } } });
  await prisma.$disconnect();
});

describe("Phase 16E PostgreSQL engineering workspace journey", () => {
  test("a fresh service instance reads the persisted escalation", async () => {
    const restarted = buildService();
    const cases = await restarted.listCases(engineerId);
    const escalated = cases.find((item) => item.case_id === escalatedCaseId);

    expect(escalated).toBeDefined();
    expect(escalated?.workflow.queue).toBe("engineering");
    expect(escalated?.workflow.status).toBe("escalated");
    expect(escalated?.workflow.escalationReason).toBe("Send uncertainty after two retries");
    expect(escalated?.workflow.assignedEngineerId).toBe(engineerId);
    expect(escalated?.safe_code).toBe("telegram_transport_throw");

    // Only the routed case is listed; the support-queue case stays out of reach.
    expect(cases.map((item) => item.case_id)).not.toContain(unroutedCaseId);
    await expect(restarted.resolveCase(engineerId, unroutedCaseId)).rejects.toBeInstanceOf(TriageEngineeringCaseNotFound);
  });

  test("the handoff history survives a restart and audits the authorized read", async () => {
    const restarted = buildService();
    const history = await restarted.readHistory(engineerId, escalatedCaseId);

    expect(history.case.case_id).toBe(escalatedCaseId);
    const escalation = history.events.find((event) => event.action === "escalate");
    expect(escalation).toBeDefined();
    expect(escalation?.actorId).toBe(supportOperatorId);
    expect(escalation?.fromQueue).toBe("support");
    expect(escalation?.toQueue).toBe("engineering");
    expect(escalation?.notes).toBe("Handing to engineering after two failed reruns");
    expect(escalation?.metadata).toBeNull();

    const audits = await prisma.triageAccessAudit.findMany({
      where: { caseId: escalatedCaseId, action: "engineering_read_case" },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[0]?.outcome).toBe("allowed");
    expect(audits[0]?.actorId).toBe(engineerId);
    expect(audits[0]?.subjectOwnerId).toBe(ownerId);
  });

  test("returning findings routes the case back to support with the full history", async () => {
    const restarted = buildService();
    const result = await restarted.returnFindings({
      actorId: engineerId,
      caseId: escalatedCaseId,
      findings: "Telegram transport threw after the send started; treat delivery as uncertain",
      notes: "Checked broker and provider logs",
    });

    expect(result.workflow.queue).toBe("support");
    expect(result.workflow.status).toBe("findings_returned");
    expect(result.workflow.version).toBe(3);    expect(result.event.action).toBe("return_findings");
    expect(result.event.fromQueue).toBe("engineering");
    expect(result.event.toQueue).toBe("support");

    // Support sees the findings, and the escalation trail is not rewritten.
    const afterReturn = await buildService().listCases(engineerId);
    expect(afterReturn.map((item) => item.case_id)).not.toContain(escalatedCaseId);

    const persisted = await prisma.triageCaseWorkflow.findUnique({ where: { caseId: escalatedCaseId } });
    expect(persisted?.queue).toBe("support");
    expect(persisted?.status).toBe("findings_returned");
    expect(persisted?.findings).toBe("Telegram transport threw after the send started; treat delivery as uncertain");
    expect(persisted?.escalationReason).toBe("Send uncertainty after two retries");

    const events = await prisma.triageCaseWorkflowEvent.findMany({
      where: { caseId: escalatedCaseId },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((event) => event.action)).toEqual(["escalate", "return_findings"]);
    expect(events[1]?.actorId).toBe(engineerId);

    const audits = await prisma.triageAccessAudit.findMany({
      where: { caseId: escalatedCaseId, action: "engineering_return_findings" },
    });
    expect(audits.some((audit) => audit.outcome === "allowed")).toBe(true);
  });

  test("a returned case is read-only for the engineer until support routes it again", async () => {
    await expect(buildService().readHistory(engineerId, escalatedCaseId)).rejects.toBeInstanceOf(TriageEngineeringCaseNotFound);
    await expect(buildService().returnFindings({ actorId: engineerId, caseId: escalatedCaseId, findings: "again" }))
      .rejects.toBeInstanceOf(TriageEngineeringCaseNotFound);
  });

  test("revocation takes effect on the next read against the real permission row", async () => {
    await prisma.$executeRaw(Prisma.sql`UPDATE "User" SET "isEngineer" = false WHERE id = ${engineerId}`);
    try {
      await expect(buildService().listCases(engineerId)).rejects.toBeInstanceOf(TriageEngineeringDenied);
      const viewer = new TriageViewerService(prisma);
      expect(await viewer.readCapabilities(engineerId)).toEqual({ isSupportOperator: false, isEngineer: false });
    } finally {
      await prisma.$executeRaw(Prisma.sql`UPDATE "User" SET "isEngineer" = true WHERE id = ${engineerId}`);
    }
    const cases = await buildService().listCases(engineerId);
    expect(Array.isArray(cases)).toBe(true);
  });
});
