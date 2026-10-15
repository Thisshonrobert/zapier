import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { prisma } from "../../../packages/db/prisma/db.ts";
import { CaseWorkflowService, type TransactionDb } from "../services/case-workflow.ts";
import {
  TriageOwnerActionStale,
  TriageOwnerCaseNotFound,
  TriageOwnerRepairNotAllowed,
  TriageOwnerService,
  type TriageOwnerDb,
} from "../services/triage-owner.ts";

/**
 * Phase 16D against a real PostgreSQL instance: the owner joins, the repair window
 * and the bounded metadata write are only meaningful against real rows and a real
 * transaction, so these assertions run on the live schema rather than a fake.
 */

const suffix = randomUUID();
// The repair editor is bound to the worker's action registry, so the seeded action
// type ids must be the real handler keys ("email", "telegram"), not synthetic ones.
const emailActionTypeId = "email";
const triggerTypeId = `phase16d-trigger-${suffix}`;

const ownedRunId = randomUUID();
const foreignRunId = randomUUID();
const actionCaseId = randomUUID();
const triggerCaseId = randomUUID();
const foreignCaseId = randomUUID();
const emailActionId = randomUUID();

const originalActionMetadata = {
  to: "customer@example.invalid",
  from: "",
  subject: "",
  body: "Weekly reminder body",
  // Not a worker field: it must survive a repair untouched.
  internalNote: "keep-me",
};
const originalRunMetadata = { customer: { name: "Ada", email: "ada@example.invalid" } };

let ownerId = 0;
let foreignOwnerId = 0;
let ownedZapId = "";

let service: TriageOwnerService;

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { name: "phase16d-owner", email: `phase16d-owner-${suffix}@example.invalid` },
  });
  const foreignOwner = await prisma.user.create({
    data: { name: "phase16d-foreign", email: `phase16d-foreign-${suffix}@example.invalid` },
  });
  ownerId = owner.id;
  foreignOwnerId = foreignOwner.id;

  await prisma.availableAction.upsert({
    where: { id: emailActionTypeId },
    update: {},
    create: { id: emailActionTypeId, name: "Email", imageUrl: "https://example.invalid/email.png" },
  });
  await prisma.availableTriggerType.create({
    data: { id: triggerTypeId, name: "Catch Hook", imageUrl: "https://example.invalid/hook.png" },
  });

  const ownedZap = await prisma.zap.create({ data: { userId: ownerId, name: "Meeting reminder" } });
  const foreignZap = await prisma.zap.create({ data: { userId: foreignOwnerId, name: "Foreign zap" } });
  ownedZapId = ownedZap.id;

  await prisma.trigger.create({ data: { zapId: ownedZap.id, typeId: triggerTypeId } });
  await prisma.action.create({
    data: {
      id: emailActionId,
      actionId: emailActionTypeId,
      zapId: ownedZap.id,
      sortingOrder: 1,
      metadata: originalActionMetadata,
    },
  });

  await prisma.zapRun.createMany({ data: [
    { id: ownedRunId, zapId: ownedZap.id, metadata: originalRunMetadata },
    { id: foreignRunId, zapId: foreignZap.id, metadata: {} },
  ] });

  // Stage 0 is the trigger (no action row); stage 1 is the email action.
  await prisma.zapRunRetry.createMany({ data: [
    { id: actionCaseId, zapRunId: ownedRunId, stage: 1, requiresHuman: true, evidenceSource: "captured",
      providerOutcome: "not_attempted", safeCode: "invalid_action_inputs" },
    { id: triggerCaseId, zapRunId: ownedRunId, stage: 0, requiresHuman: true, evidenceSource: "captured" },
    { id: foreignCaseId, zapRunId: foreignRunId, stage: 0, requiresHuman: true, evidenceSource: "captured" },
  ] });

  await prisma.triageCaseWorkflow.createMany({ data: [
    { caseId: actionCaseId, subjectOwnerId: ownerId, queue: "owner", status: "awaiting_owner", version: 2,
      customerInstructions: { targetStep: 1, missingFields: ["subject"], instructions: "Add the email subject in step 1." },
      escalationReason: "internal escalation text", findings: "internal findings text" },
    { caseId: triggerCaseId, subjectOwnerId: ownerId, queue: "owner", status: "awaiting_owner", version: 2,
      customerInstructions: { missingFields: [], instructions: "Check the trigger." } },
    { caseId: foreignCaseId, subjectOwnerId: foreignOwnerId, queue: "owner", status: "awaiting_owner", version: 2 },
  ] });

  service = new TriageOwnerService(prisma as unknown as TriageOwnerDb);
});

afterAll(async () => {
  await prisma.triageCaseWorkflowEvent.deleteMany({ where: { caseId: { in: [actionCaseId, triggerCaseId, foreignCaseId] } } });
  await prisma.triageCaseWorkflow.deleteMany({ where: { caseId: { in: [actionCaseId, triggerCaseId, foreignCaseId] } } });
  await prisma.zapRunRetry.deleteMany({ where: { id: { in: [actionCaseId, triggerCaseId, foreignCaseId] } } });
  await prisma.zapRun.deleteMany({ where: { id: { in: [ownedRunId, foreignRunId] } } });
  await prisma.action.deleteMany({ where: { actionId: emailActionTypeId } });
  await prisma.trigger.deleteMany({ where: { zapId: ownedZapId } });
  await prisma.zap.deleteMany({ where: { userId: { in: [ownerId, foreignOwnerId] } } });
  // "email" and "telegram" are shared registry rows and are deliberately left in place.
  await prisma.availableTriggerType.deleteMany({ where: { id: triggerTypeId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, foreignOwnerId] } } });
  await prisma.$disconnect();
});

describe("Phase 16D PostgreSQL owner repair journey", () => {
  test("lists only the caller's cases and joins the real Zap, stage and workflow", async () => {
    const mine = await service.listFailures(ownerId);
    const ids = mine.map((failure) => failure.caseId);
    expect(ids).toContain(actionCaseId);
    expect(ids).toContain(triggerCaseId);
    expect(ids).not.toContain(foreignCaseId);

    const emailCase = mine.find((failure) => failure.caseId === actionCaseId);
    expect(emailCase?.zapId).toBe(ownedZapId);
    expect(emailCase?.zapName).toBe("Meeting reminder");
    expect(emailCase?.stepLabel).toBe("Email (action 1)");
    expect(emailCase?.status).toBe("awaiting_owner");
    expect(emailCase?.queue).toBe("owner");

    const triggerCase = mine.find((failure) => failure.caseId === triggerCaseId);
    expect(triggerCase?.stepLabel).toBe("Catch Hook (trigger)");

    // A foreign owner never sees the case even though it exists.
    const theirs = await service.listFailures(foreignOwnerId);
    expect(theirs.map((failure) => failure.caseId)).not.toContain(actionCaseId);
  });

  test("projects the owner-safe repair view from real rows without internal state", async () => {
    const view = await service.getRepairCase(ownerId, actionCaseId);

    expect(view.zap).toEqual({ id: ownedZapId, name: "Meeting reminder", editorPath: `/zap/${ownedZapId}` });
    expect(view.stepLabel).toBe("Email (action 1)");
    expect(view.workflow.queue).toBe("owner");
    expect(view.workflow.status).toBe("awaiting_owner");
    expect(view.workflow.awaitingOwnerRepair).toBe(true);
    expect(view.workflow.customerInstructions?.instructions).toBe("Add the email subject in step 1.");
    expect(view.workflow.customerInstructions?.missingFields).toEqual(["subject"]);
    expect(view.action?.actionId).toBe(emailActionId);
    expect(view.action?.actionTypeId).toBe("email");
    expect(view.action?.fields.map((field) => field.field)).toEqual(["to", "subject", "body", "from"]);
    expect(view.action?.fields.find((field) => field.field === "subject")?.value).toBe("");
    expect(view.unavailable).toEqual([]);

    // The workflow carries internal text that must not reach the owner projection.
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("internal escalation text");
    expect(serialized).not.toContain("internal findings text");
  });

  test("an unknown owner or case id is not found, never a partial read", async () => {
    await expect(service.getRepairCase(foreignOwnerId, actionCaseId)).rejects.toBeInstanceOf(TriageOwnerCaseNotFound);
    await expect(service.getRepairCase(ownerId, foreignCaseId)).rejects.toBeInstanceOf(TriageOwnerCaseNotFound);
    await expect(service.getRepairCase(ownerId, randomUUID())).rejects.toBeInstanceOf(TriageOwnerCaseNotFound);
  });

  test("a repair writes only the target action metadata and leaves the ledger untouched", async () => {
    const view = await service.getRepairCase(ownerId, actionCaseId);
    const before = {
      retry: await prisma.zapRunRetry.findUnique({ where: { id: actionCaseId } }),
      run: await prisma.zapRun.findUnique({ where: { id: ownedRunId } }),
    };

    const result = await service.saveActionRepair(ownerId, actionCaseId, emailActionId, {
      actionToken: view.action!.actionToken,
      fields: [{ field: "subject", value: "Meeting notice" }],
    });

    expect(result.changedFields).toEqual(["subject"]);
    expect(result.workflow.awaitingOwnerRepair).toBe(true);

    const action = await prisma.action.findUnique({ where: { id: emailActionId } });
    expect(action?.metadata).toEqual({ ...originalActionMetadata, subject: "Meeting notice" });

    // The original failure ledger is byte-for-byte unchanged.
    const after = {
      retry: await prisma.zapRunRetry.findUnique({ where: { id: actionCaseId } }),
      run: await prisma.zapRun.findUnique({ where: { id: ownedRunId } }),
    };
    expect(after).toEqual(before);

    // The token describes the durable persisted state, so a second save with it succeeds.
    const refreshed = await service.getRepairCase(ownerId, actionCaseId);
    expect(refreshed.action?.actionToken).toBe(result.actionToken);
  });

  test("replaying a stale token is rejected and performs no write", async () => {
    const view = await service.getRepairCase(ownerId, actionCaseId);
    const staleToken = view.action!.actionToken;

    const first = await service.saveActionRepair(ownerId, actionCaseId, emailActionId, {
      actionToken: staleToken,
      fields: [{ field: "body", value: "First writer" }],
    });
    expect(first.changedFields).toEqual(["body"]);

    await expect(service.saveActionRepair(ownerId, actionCaseId, emailActionId, {
      actionToken: staleToken,
      fields: [{ field: "body", value: "Second writer" }],
    })).rejects.toBeInstanceOf(TriageOwnerActionStale);

    const action = await prisma.action.findUnique({ where: { id: emailActionId } });
    expect((action?.metadata as Record<string, unknown>).body).toBe("First writer");
  });

  test("a credential field is never projected and is preserved by a repair", async () => {
    const telegramActionTypeId = "telegram";
    await prisma.availableAction.upsert({
      where: { id: telegramActionTypeId },
      update: {},
      create: { id: telegramActionTypeId, name: "Telegram", imageUrl: "https://example.invalid/tg.png" },
    });
    const telegramAction = await prisma.action.create({
      data: { id: randomUUID(), actionId: telegramActionTypeId, zapId: ownedZapId, sortingOrder: 2,
        metadata: { channelUserName: "@ops", message: "", botToken: "123456:super-secret" } },
    });
    const telegramCaseId = randomUUID();
    await prisma.zapRunRetry.create({
      data: { id: telegramCaseId, zapRunId: ownedRunId, stage: 2, requiresHuman: true, evidenceSource: "captured" },
    });
    await prisma.triageCaseWorkflow.create({
      data: { caseId: telegramCaseId, subjectOwnerId: ownerId, queue: "owner", status: "awaiting_owner", version: 2 },
    });

    try {
      const view = await service.getRepairCase(ownerId, telegramCaseId);
      const token = view.action!.fields.find((field) => field.field === "botToken");
      expect(token?.sensitive).toBe(true);
      expect(token?.value).toBe("");
      expect(JSON.stringify(view)).not.toContain("super-secret");

      await service.saveActionRepair(ownerId, telegramCaseId, telegramAction.id, {
        actionToken: view.action!.actionToken,
        fields: [
          { field: "message", value: "Fixed message" },
          { field: "botToken", value: "attacker-supplied" },
        ],
      });

      const saved = await prisma.action.findUnique({ where: { id: telegramAction.id } });
      expect(saved?.metadata).toEqual({
        channelUserName: "@ops",
        message: "Fixed message",
        botToken: "123456:super-secret",
      });
    } finally {
      await prisma.triageCaseWorkflow.deleteMany({ where: { caseId: telegramCaseId } });
      await prisma.zapRunRetry.deleteMany({ where: { id: telegramCaseId } });
      await prisma.action.deleteMany({ where: { id: telegramAction.id } });
    }
  });

  test("a trigger-stage case is honest that there is no repair target", async () => {
    const view = await service.getRepairCase(ownerId, triggerCaseId);
    expect(view.action).toBeNull();
    expect(view.unavailable).toContain("repair_target_action");
    expect(view.stepLabel).toBe("Catch Hook (trigger)");
  });

  test("a repair is refused once the case leaves the owner repair window", async () => {
    const view = await service.getRepairCase(ownerId, actionCaseId);
    await prisma.triageCaseWorkflow.update({
      where: { caseId: actionCaseId },
      data: { queue: "engineering", status: "escalated" },
    });
    try {
      await expect(service.saveActionRepair(ownerId, actionCaseId, emailActionId, {
        actionToken: view.action!.actionToken,
        fields: [{ field: "subject", value: "Too late" }],
      })).rejects.toBeInstanceOf(TriageOwnerRepairNotAllowed);

      const action = await prisma.action.findUnique({ where: { id: emailActionId } });
      expect((action?.metadata as Record<string, unknown>).subject).toBe("Meeting notice");
    } finally {
      await prisma.triageCaseWorkflow.update({
        where: { caseId: actionCaseId },
        data: { queue: "owner", status: "awaiting_owner" },
      });
    }
  });

  test("submitting completion moves the durable workflow back to support", async () => {
    const workflow = new CaseWorkflowService(prisma as unknown as TransactionDb);
    await workflow.transition({
      caseId: actionCaseId,
      subjectOwnerId: ownerId,
      actorId: ownerId,
      action: "submit_repair",
      toQueue: "support",
      toStatus: "repair_submitted",
      repairNote: "Added subject 'Meeting notice'",
      auditAction: "owner_repair_acknowledgement",
    });

    const view = await service.getRepairCase(ownerId, actionCaseId);
    expect(view.workflow.queue).toBe("support");
    expect(view.workflow.status).toBe("repair_submitted");
    expect(view.workflow.awaitingOwnerRepair).toBe(false);
    expect(view.workflow.repairNote).toBe("Added subject 'Meeting notice'");

    const events = await prisma.triageCaseWorkflowEvent.findMany({ where: { caseId: actionCaseId } });
    const submitted = events.filter((event) => event.action === "submit_repair");
    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.fromStatus).toBe("awaiting_owner");
    expect(submitted[0]?.toStatus).toBe("repair_submitted");
    expect(submitted[0]?.actorId).toBe(ownerId);

    const audits = await prisma.triageAccessAudit.findMany({
      where: { caseId: actionCaseId, action: "owner_repair_acknowledgement" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.outcome).toBe("allowed");
  });
});
