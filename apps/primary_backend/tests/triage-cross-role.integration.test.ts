import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";

/**
 * Phase 16H cross-role acceptance journey (plan Section 9, steps 2-4).
 *
 * Every earlier role suite drives one service against rows it prepared itself, and the
 * 16C HTTP suites substitute fakes for all three role services. Neither proves that the
 * real authorization checks still line up when the *other* roles have acted: a repair
 * acknowledgement moves a case back to support, an escalation moves it to engineering,
 * and findings move it back again. This suite runs that single case end to end through
 * the mounted triage router, the real services and real PostgreSQL, and asserts what each
 * role is allowed to see and to do at each hop.
 *
 * The bearer identity is the only thing that changes; no request body carries a role.
 */

process.env.JWT_SECRET ??= "phase-16h-cross-role-secret";

const { createTriageRouter } = await import("../route/triage.ts");
const { CaseWorkflowService } = await import("../services/case-workflow.ts");
const { TriageEngineeringService } = await import("../services/triage-engineering.ts");
const { TriageEvidenceService } = await import("../services/triage-evidence.ts");
const { TriageOperatorService } = await import("../services/triage-operator.ts");
const { TriageOwnerService } = await import("../services/triage-owner.ts");
const { TriageViewerService } = await import("../services/triage-viewer.ts");
const { prisma } = await import("../../../packages/db/prisma/db.ts");
const { Prisma } = await import("../../../packages/db/generated/prisma/client.ts");

const integration = process.env.TRIAGE_CROSS_ROLE_INTEGRATION === "true" ? test : test.skip;

const suffix = randomUUID();
const emailActionTypeId = "email";
const triggerTypeId = `phase16h-trigger-${suffix}`;
const foreignTriggerTypeId = `phase16h-foreign-trigger-${suffix}`;

const ownerCaseId = randomUUID();
const foreignCaseId = randomUUID();
const ownerRunId = randomUUID();
const foreignRunId = randomUUID();
const ownerZapId = randomUUID();
const foreignZapId = randomUUID();
const emailActionId = randomUUID();
const foreignActionId = randomUUID();

const ownerEmail = `phase16h-owner-${suffix}@example.invalid`;
const foreignEmail = `phase16h-other-${suffix}@example.invalid`;
const operatorEmail = `phase16h-operator-${suffix}@example.invalid`;
const engineerEmail = `phase16h-engineer-${suffix}@example.invalid`;

/** What the owner is asked to supply, and what support publishes as the safe instruction. */
const repairedSubject = "Weekly reminder";
const originalEmailMetadata = {
  to: "customer@example.invalid",
  from: "",
  subject: "",
  body: "Weekly reminder body",
  internalNote: "not a worker field; must survive the repair",
};

let ownerId = 0;
let foreignOwnerId = 0;
let operatorId = 0;
let engineerId = 0;
let origin = "";
const servers: Server[] = [];

function token(id: number) {
  return jwt.sign({ id }, process.env.JWT_SECRET!);
}

function request(path: string, actorId: number, init: RequestInit = {}) {
  return fetch(`${origin}/api/v1/triage${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token(actorId)}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function post(path: string, actorId: number, body: unknown, headers: Record<string, string> = {}) {
  return request(path, actorId, { method: "POST", body: JSON.stringify(body), headers });
}

async function startServer() {
  const workflow = new CaseWorkflowService(prisma as never);
  const evidence = new TriageEvidenceService(prisma as never);
  const app = express();
  app.use(express.json());
  app.use("/api/v1/triage", createTriageRouter({
    evidence,
    operator: new TriageOperatorService(prisma as never),
    workflow,
    engineering: new TriageEngineeringService(prisma as never, workflow),
    owner: new TriageOwnerService(prisma as never),
    viewer: new TriageViewerService(prisma as never),
  }));
  const server = createServer(app);
  servers.push(server);
  return new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      resolve();
    });
  });
}

beforeAll(async () => {
  const [owner, foreignOwner, operator, engineer] = await Promise.all([
    prisma.user.create({ data: { name: "phase16h-owner", email: ownerEmail } }),
    prisma.user.create({ data: { name: "phase16h-other", email: foreignEmail } }),
    prisma.user.create({ data: { name: "phase16h-operator", email: operatorEmail, isSupportOperator: true } }),
    prisma.user.create({ data: { name: "phase16h-engineer", email: engineerEmail, isEngineer: true } }),
  ]);
  ownerId = owner.id;
  foreignOwnerId = foreignOwner.id;
  operatorId = operator.id;
  engineerId = engineer.id;

  await prisma.availableAction.upsert({
    where: { id: emailActionTypeId },
    update: {},
    create: { id: emailActionTypeId, name: "Email", imageUrl: "https://example.invalid/email.png" },
  });
  await prisma.availableTriggerType.createMany({ data: [
    { id: triggerTypeId, name: "Catch Hook", imageUrl: "https://example.invalid/hook.png" },
    { id: foreignTriggerTypeId, name: "Catch Hook", imageUrl: "https://example.invalid/hook.png" },
  ] });

  await prisma.zap.create({ data: { id: ownerZapId, userId: ownerId, name: "Meeting reminder" } });
  await prisma.zap.create({ data: { id: foreignZapId, userId: foreignOwnerId, name: "Another owner's zap" } });
  await prisma.trigger.create({ data: { zapId: ownerZapId, typeId: triggerTypeId } });
  await prisma.trigger.create({ data: { zapId: foreignZapId, typeId: foreignTriggerTypeId } });
  // The repair target is the stage the run failed at, so stage 1 holds the email action.
  await prisma.action.create({ data: { id: emailActionId, actionId: emailActionTypeId, zapId: ownerZapId,
    sortingOrder: 1, metadata: originalEmailMetadata } });
  await prisma.action.create({ data: { id: foreignActionId, actionId: emailActionTypeId, zapId: foreignZapId,
    sortingOrder: 1, metadata: { to: "other@example.invalid", subject: "Other", body: "Other body" } } });

  await prisma.zapRun.createMany({ data: [
    { id: ownerRunId, zapId: ownerZapId, metadata: { customer: { name: "Ada" } } },
    { id: foreignRunId, zapId: foreignZapId, metadata: {} },
  ] });
  await prisma.zapRunExecution.createMany({ data: [
    { zapRunId: ownerRunId, stage: 0, status: "SUCCESS", completedAt: new Date("2026-10-18T00:00:00.000Z") } as never,
    { zapRunId: foreignRunId, stage: 0, status: "SUCCESS", completedAt: new Date("2026-10-18T00:00:00.000Z") } as never,
  ] });

  // The missing email subject is a real captured send-boundary rejection, not a fabricated row.
  await prisma.zapRunRetry.create({ data: { id: ownerCaseId, zapRunId: ownerRunId, stage: 1, attempt: 1,
    provider: "email", phase: "send", providerOutcome: "rejected", safeCode: "email_invalid_inputs",
    providerStatus: 422, requiresHuman: true, evidenceSource: "captured", lastError: "subject is required" } });
  await prisma.zapRunRetry.create({ data: { id: foreignCaseId, zapRunId: foreignRunId, stage: 1, attempt: 1,
    provider: "email", phase: "send", providerOutcome: "rejected", safeCode: "email_invalid_inputs",
    providerStatus: 422, requiresHuman: true, evidenceSource: "captured" } });

  // The case starts where the pipeline left it: discovered, unowned by any workflow row.
  await startServer();
});

afterAll(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  const caseIds = [ownerCaseId, foreignCaseId];
  await prisma.triageCaseWorkflowEvent.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.triageCaseWorkflow.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.triageAccessAudit.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.zapRunRetry.deleteMany({ where: { id: { in: caseIds } } });
  await prisma.zapRunExecution.deleteMany({ where: { zapRunId: { in: [ownerRunId, foreignRunId] } } });
  await prisma.zapRun.deleteMany({ where: { id: { in: [ownerRunId, foreignRunId] } } });
  await prisma.action.deleteMany({ where: { id: { in: [emailActionId, foreignActionId] } } });
  await prisma.trigger.deleteMany({ where: { zapId: { in: [ownerZapId, foreignZapId] } } });
  await prisma.zap.deleteMany({ where: { id: { in: [ownerZapId, foreignZapId] } } });
  await prisma.availableTriggerType.deleteMany({ where: { id: { in: [triggerTypeId, foreignTriggerTypeId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, foreignOwnerId, operatorId, engineerId] } } });
  await prisma.$disconnect();
});

describe("Phase 16H cross-role journey on real PostgreSQL", () => {
  // The journey is one case moving through four roles; the steps are ordered on purpose.
  test("step 2: the owner sees only their own failure, at the named Zap and step, with the missing field", async () => {
    const listed = await request("/cases/failures", ownerId);
    expect(listed.status).toBe(200);
    const failures = (await listed.json() as { failures: { caseId: string }[] }).failures;
    expect(failures.map((failure) => failure.caseId)).toContain(ownerCaseId);
    expect(failures.map((failure) => failure.caseId)).not.toContain(foreignCaseId);

    // Another owner's case id is not a denial oracle: it is simply not found.
    expect((await request(`/cases/${foreignCaseId}/repair`, ownerId)).status).toBe(404);
    expect((await request(`/cases/${foreignCaseId}/workflow`, ownerId)).status).toBe(404);
    expect((await post(`/cases/${foreignCaseId}/repair-acknowledgement`, ownerId, {})).status).toBe(404);

    // Privileged APIs are denied for an ordinary owner before any case is read.
    expect((await request("/operator/cases", ownerId)).status).toBe(403);
    expect((await request(`/operator/cases/${ownerCaseId}`, ownerId)).status).toBe(403);
    expect((await request("/engineering/cases", ownerId)).status).toBe(403);
    expect((await request(`/engineering/cases/${ownerCaseId}`, ownerId)).status).toBe(403);

    const viewer = await request("/viewer", ownerId);
    expect(await viewer.json()).toEqual({ capabilities: { isSupportOperator: false, isEngineer: false } });

    // Support has not published instructions yet, so no repair window is open.
    const beforeRouting = await request(`/cases/${ownerCaseId}/repair`, ownerId);
    expect(beforeRouting.status).toBe(200);
    const projected = await beforeRouting.json() as {
      stepLabel: string; zap: { id: string; editorPath: string }; workflow: { queue: string; status: string };
      action: unknown; unavailable: string[];
    };
    expect(projected.zap.id).toBe(ownerZapId);
    expect(projected.zap.editorPath).toBe(`/zap/${ownerZapId}`);
    expect(projected.stepLabel).toBe("Email (action 1)");
    expect(projected.workflow).toMatchObject({ queue: "support", status: "needing_support" });
    expect(projected.action).toBeNull();
  });

  test("step 3: support sees every owner's case, publishes the repair request, and the routing survives a reload", async () => {
    const listed = await request("/operator/cases", operatorId);
    expect(listed.status).toBe(200);
    const caseIds = (await listed.json() as { cases: { case_id: string }[] }).cases.map((item) => item.case_id);
    expect(caseIds).toEqual(expect.arrayContaining([ownerCaseId, foreignCaseId]));

    const selected = await request(`/operator/cases/${ownerCaseId}`, operatorId);
    expect(selected.status).toBe(200);
    expect(await selected.json()).toMatchObject({
      case_id: ownerCaseId, zap_run_id: ownerRunId, stage: 1, subject_owner_id: ownerId, safe_code: "email_invalid_inputs",
    });

    const routed = await post(`/operator/cases/${ownerCaseId}/workflow/request-repair`, operatorId, {
      customerInstructions: { targetStep: 1, missingFields: ["subject"],
        instructions: "Add the email subject in step 1.", editorPath: `/zap/${ownerZapId}` },
      notes: "Published to the owner",
    }, { "idempotency-key": randomUUID() });
    expect(routed.status).toBe(200);
    expect(await routed.json()).toMatchObject({
      workflow: { queue: "owner", status: "awaiting_owner", subjectOwnerId: ownerId },
      event: { action: "request_owner_repair", fromQueue: "support", toQueue: "owner" },
    });

    // "Reload/restart": a fresh read of the same case from a new request must agree,
    // and the append-only trail must still show where the case came from.
    const reloaded = await request(`/operator/cases/${ownerCaseId}/workflow`, operatorId);
    expect(reloaded.status).toBe(200);
    const trail = await reloaded.json() as { workflow: { queue: string; status: string };
      events: { action: string; toQueue: string }[] };
    expect(trail.workflow).toMatchObject({ queue: "owner", status: "awaiting_owner" });
    expect(trail.events.map((event) => event.action)).toEqual(["request_owner_repair"]);
    expect(trail.events[0]!.toQueue).toBe("owner");

    // Support activity is audited, and the operator-only case id is still denied to the owner.
    expect(await prisma.triageAccessAudit.count({ where: { caseId: ownerCaseId, actorId: operatorId,
      action: "operator_route_case", outcome: "allowed" } })).toBeGreaterThan(0);
    expect((await request(`/operator/cases/${ownerCaseId}`, ownerId)).status).toBe(403);
  });

  test("step 2: the owner saves the requested field through the real editor contract and submits the repair", async () => {
    const opened = await request(`/cases/${ownerCaseId}/repair`, ownerId);
    expect(opened.status).toBe(200);
    const view = await opened.json() as {
      workflow: { queue: string; status: string; awaitingOwnerRepair: boolean;
        customerInstructions: { missingFields: string[]; instructions: string; targetStep?: number } };
      action: { actionId: string; actionTypeId: string; actionToken: string;
        fields: { field: string; value: string; required: boolean; sensitive: boolean }[] } | null;
      unavailable: string[];
    };
    expect(view.workflow).toMatchObject({ queue: "owner", status: "awaiting_owner", awaitingOwnerRepair: true });
    expect(view.workflow.customerInstructions).toMatchObject({ missingFields: ["subject"], targetStep: 1 });
    expect(view.action?.actionId).toBe(emailActionId);

    const subject = view.action!.fields.find((field) => field.field === "subject");
    expect(subject).toMatchObject({ required: true, sensitive: false, value: "" });

    // A stale or guessed token is refused and writes nothing.
    expect((await post(`/cases/${ownerCaseId}/actions/${emailActionId}/repair`, ownerId,
      { actionToken: "0".repeat(64), fields: [{ field: "subject", value: "stale" }] })).status).toBe(409);

    const saved = await post(`/cases/${ownerCaseId}/actions/${emailActionId}/repair`, ownerId,
      { actionToken: view.action!.actionToken, fields: [{ field: "subject", value: repairedSubject }] });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ changedFields: ["subject"], actionId: emailActionId,
      workflow: { queue: "owner", status: "awaiting_owner", awaitingOwnerRepair: true } });
    expect(await prisma.action.findUnique({ where: { id: emailActionId } })).toMatchObject({
      metadata: { to: "customer@example.invalid", subject: repairedSubject,
        body: "Weekly reminder body", internalNote: "not a worker field; must survive the repair" },
    });

    // The original failure ledger is immutable: editing configuration never rewrites it.
    expect(await prisma.zapRunRetry.findUnique({ where: { id: ownerCaseId } })).toMatchObject({
      safeCode: "email_invalid_inputs", providerStatus: 422, evidenceSource: "captured",
    });

    const acknowledged = await post(`/cases/${ownerCaseId}/repair-acknowledgement`, ownerId,
      { repairNote: "Subject saved" }, { "idempotency-key": randomUUID() });
    expect(acknowledged.status).toBe(200);
    expect(await acknowledged.json()).toMatchObject({
      workflow: { queue: "support", status: "repair_submitted", repairNote: "Subject saved" },
      event: { action: "submit_repair", fromQueue: "owner", toQueue: "support" },
    });

    // The acknowledgement returns the case to support; it does not certify a fix.
    expect((await request(`/cases/${ownerCaseId}/repair`, ownerId)).status).toBe(200);
    expect(await (await request(`/cases/${ownerCaseId}/workflow`, ownerId)).json()).toMatchObject({
      workflow: { queue: "support", status: "repair_submitted" },
    });
    // Another owner still cannot reach the repaired case, and still cannot ack it.
    expect((await request(`/cases/${ownerCaseId}/repair`, foreignOwnerId)).status).toBe(404);
    expect((await post(`/cases/${ownerCaseId}/repair-acknowledgement`, foreignOwnerId, {})).status).toBe(404);
  });

  test("step 3/4: support escalates the submitted repair, the engineer sees it after a reload and returns findings", async () => {
    // The owner already acknowledged; support can still escalate from `repair_submitted`.
    expect(await (await request(`/operator/cases/${ownerCaseId}/workflow`, operatorId)).json())
      .toMatchObject({ workflow: { queue: "support", status: "repair_submitted" } });

    const escalated = await post(`/operator/cases/${ownerCaseId}/workflow/escalate`, operatorId, {
      escalationReason: "Send boundary rejects the repaired input", assignedEngineerId: engineerId,
    }, { "idempotency-key": randomUUID() });
    expect(escalated.status).toBe(200);
    expect(await escalated.json()).toMatchObject({
      workflow: { queue: "engineering", status: "escalated", assignedEngineerId: engineerId },
      event: { action: "escalate", fromQueue: "support", toQueue: "engineering" },
    });

    // The owner's case left the owner surface with it; support keeps full visibility.
    expect((await request(`/operator/cases/${ownerCaseId}/workflow`, operatorId)).status).toBe(200);
    expect(await (await request(`/operator/cases/${ownerCaseId}/workflow`, operatorId)).json())
      .toMatchObject({ workflow: { queue: "engineering", status: "escalated" } });

    // A reload of the engineering queue proves the routing is durable, not request-local.
    const queue = await request("/engineering/cases", engineerId);
    expect(queue.status).toBe(200);
    expect((await queue.json() as { cases: { case_id: string }[] }).cases.map((item) => item.case_id))
      .toContain(ownerCaseId);

    const detail = await request(`/engineering/cases/${ownerCaseId}`, engineerId);
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({
      case_id: ownerCaseId, subject_owner_id: ownerId, safe_code: "email_invalid_inputs",
      workflow: { queue: "engineering", status: "escalated", escalationReason: "Send boundary rejects the repaired input" },
    });

    // History is the authorized handoff trail: escalation is visible, metadata is not forwarded.
    const history = await request(`/engineering/cases/${ownerCaseId}/history`, engineerId);
    expect(history.status).toBe(200);
    const trail = await history.json() as { events: { action: string; toQueue: string; metadata: unknown }[] };
    expect(trail.events.map((event) => event.action)).toEqual(["request_owner_repair", "submit_repair", "escalate"]);
    expect(trail.events.every((event) => event.metadata === null)).toBe(true);

    // An engineer is not an operator and not an owner: replay and owner surfaces stay shut.
    expect((await request("/operator/cases", engineerId)).status).toBe(403);
    expect((await request(`/operator/cases/${ownerCaseId}/workflow`, engineerId)).status).toBe(403);
    expect((await request(`/cases/${ownerCaseId}/repair`, engineerId)).status).toBe(404);
    expect((await request(`/cases/${ownerCaseId}/workflow`, engineerId)).status).toBe(404);
    // Input validation is operator-only; an engineer gets no route rather than a smuggled call.
    expect((await post(`/engineering/cases/${ownerCaseId}/validate-action-inputs`, engineerId, {})).status).toBe(404);

    // Findings that are empty are refused, then the real findings return the case to support.
    expect((await post(`/engineering/cases/${ownerCaseId}/findings`, engineerId, { findings: "" })).status).toBe(422);

    const findings = "Provider rejects an empty subject at the send boundary";
    const returned = await post(`/engineering/cases/${ownerCaseId}/findings`, engineerId,
      { findings, notes: "Repair verified in the editor" }, { "idempotency-key": randomUUID() });
    expect(returned.status).toBe(200);
    expect(await returned.json()).toMatchObject({
      workflow: { queue: "support", status: "findings_returned", findings },
      event: { action: "return_findings", fromQueue: "engineering", toQueue: "support" },
    });

    // The engineering queue is empty again, and the case is back with support.
    expect((await (await request("/engineering/cases", engineerId)).json() as { cases: unknown[] }).cases).toHaveLength(0);
    expect(await (await request(`/operator/cases/${ownerCaseId}/workflow`, operatorId)).json())
      .toMatchObject({ workflow: { queue: "support", status: "findings_returned", findings } });
  });

  test("step 4: the owner sees only the published customer-safe status, never internal notes", async () => {
    const view = await (await request(`/cases/${ownerCaseId}/workflow`, ownerId)).json() as {
      workflow: Record<string, unknown>;
    };
    expect(view.workflow).toMatchObject({ queue: "support", status: "findings_returned" });
    // The owner projection is deliberately narrow: no escalation reason, no findings.
    expect(view.workflow).not.toHaveProperty("escalationReason");
    expect(view.workflow).not.toHaveProperty("findings");
    expect(view.workflow).not.toHaveProperty("assignedEngineerId");

    // The published instruction that the owner already acted on is still their own record.
    const repair = await (await request(`/cases/${ownerCaseId}/repair`, ownerId)).json() as {
      workflow: { customerInstructions: unknown; repairNote: string | null };
    };
    expect(repair.workflow.customerInstructions).toMatchObject({ missingFields: ["subject"], targetStep: 1 });
    expect(repair.workflow.repairNote).toBe("Subject saved");
  });

  test("the access trail records each role's real actor, and a revoked role loses access immediately", async () => {
    const actions = await prisma.triageAccessAudit.findMany({ where: { caseId: ownerCaseId },
      select: { actorId: true, action: true, outcome: true } });
    expect(actions).toEqual(expect.arrayContaining([
      { actorId: operatorId, action: "read_case", outcome: "allowed" },
      { actorId: operatorId, action: "operator_route_case", outcome: "allowed" },
      { actorId: engineerId, action: "engineering_list_cases", outcome: "allowed" },
      { actorId: engineerId, action: "engineering_read_case", outcome: "allowed" },
      { actorId: ownerId, action: "owner_repair_acknowledgement", outcome: "allowed" },
    ]));
    // A denied privileged read is audited too, so an attempted escalation is not silent.
    expect(actions.some((entry) => entry.actorId === ownerId && entry.outcome === "denied")).toBe(true);

    await prisma.$executeRaw(Prisma.sql`UPDATE "User" SET "isEngineer" = false WHERE id = ${engineerId}`);
    try {
      expect((await request("/engineering/cases", engineerId)).status).toBe(403);
      expect((await request(`/engineering/cases/${ownerCaseId}`, engineerId)).status).toBe(403);
      expect((await post(`/engineering/cases/${ownerCaseId}/findings`, engineerId, { findings: "after revocation" })).status)
        .toBe(403);
      // Revocation is scoped to the engineering capability; support still works and still sees the case.
      expect((await request("/operator/cases", operatorId)).status).toBe(200);
    } finally {
      await prisma.$executeRaw(Prisma.sql`UPDATE "User" SET "isEngineer" = true WHERE id = ${engineerId}`);
    }
  });
});
