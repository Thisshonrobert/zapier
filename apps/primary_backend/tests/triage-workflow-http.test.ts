import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET ??= "phase-10a-http-test-secret";
process.env.REPLAY_INTENT_ENABLED = "true";
process.env.INVESTIGATION_ENABLED = "true";

const { createTriageRouter } = await import("../route/triage.ts");
const { CaseWorkflowService } = await import("../services/case-workflow.ts");
const { TriageEngineeringService, TriageEngineeringDenied, TriageEngineeringCaseNotFound } = await import("../services/triage-engineering.ts");
const { TriageOperatorService, TriageOperatorDenied, TriageOperatorCaseNotFound } = await import("../services/triage-operator.ts");
const { TriageCaseNotFound } = await import("../services/triage-evidence.ts");
const caseId = "f0100000-0000-4000-8000-000000000001";
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

function token(id: number) {
  return jwt.sign({ id }, process.env.JWT_SECRET!);
}

function startTestServer(options: {
  isOperator?: boolean;
  isEngineer?: boolean;
  isOwner?: boolean;
  queue?: string;
  status?: string;
  workflowService?: InstanceType<typeof CaseWorkflowService>;
  engineeringService?: InstanceType<typeof TriageEngineeringService>;
  operatorService?: InstanceType<typeof TriageOperatorService>;
} = {}) {
  const app = express();
  app.use(express.json());

  const isOperator = options.isOperator ?? false;
  const isEngineer = options.isEngineer ?? false;
  const isOwner = options.isOwner ?? false;
  const currentQueue = options.queue ?? "support";
  const currentStatus = options.status ?? "needing_support";

  const fakeWorkflow: any = options.workflowService ?? {
    getWorkflow: async (cId: string) => ({
      id: "wf-1",
      caseId: cId,
      subjectOwnerId: 9,
      queue: currentQueue,
      status: currentStatus,
      assignedEngineerId: null,
      activeInvestigationId: null,
      activeProposalId: null,
      version: 1,
      customerInstructions: null,
      repairNote: null,
      escalationReason: null,
      findings: null,
      resolutionReason: null,
      resolvedAt: null,
      createdAt: new Date("2026-10-15T00:00:00Z"),
      updatedAt: new Date("2026-10-15T00:00:00Z"),
    }),
    getWorkflowWithEvents: async (cId: string) => ({
      workflow: {
        id: "wf-1",
        caseId: cId,
        subjectOwnerId: 9,
        queue: currentQueue,
        status: currentStatus,
        assignedEngineerId: null,
        activeInvestigationId: null,
        activeProposalId: null,
        version: 1,
        customerInstructions: null,
        repairNote: null,
        escalationReason: null,
        findings: null,
        resolutionReason: null,
        resolvedAt: null,
        createdAt: new Date("2026-10-15T00:00:00Z"),
        updatedAt: new Date("2026-10-15T00:00:00Z"),
      },
      events: [{
        id: "ev-1",
        workflowId: "wf-1",
        caseId: cId,
        subjectOwnerId: 9,
        actorId: 4,
        action: "decision_handoff",
        fromQueue: "support",
        toQueue: currentQueue,
        fromStatus: "needing_support",
        toStatus: currentStatus,
        notes: null,
        metadata: null,
        createdAt: new Date("2026-10-15T00:00:00Z"),
      }],
    }),
    transition: async (input: any) => ({
      workflow: {
        id: "wf-1",
        caseId: input.caseId,
        subjectOwnerId: input.subjectOwnerId,
        queue: input.toQueue,
        status: input.toStatus,
        assignedEngineerId: input.assignedEngineerId ?? null,
        activeInvestigationId: input.activeInvestigationId ?? null,
        activeProposalId: input.activeProposalId ?? null,
        version: 2,
        customerInstructions: input.customerInstructions ?? null,
        repairNote: input.repairNote ?? null,
        escalationReason: input.escalationReason ?? null,
        findings: input.findings ?? null,
        resolutionReason: input.resolutionReason ?? null,
        resolvedAt: input.toQueue === "resolved" ? new Date("2026-10-15T00:00:00Z") : null,
        createdAt: new Date("2026-10-15T00:00:00Z"),
        updatedAt: new Date("2026-10-15T00:00:00Z"),
      },
      event: {
        id: input.idempotencyKey ?? "ev-generated",
        workflowId: "wf-1",
        caseId: input.caseId,
        subjectOwnerId: input.subjectOwnerId,
        actorId: input.actorId,
        action: input.action,
        fromQueue: currentQueue,
        toQueue: input.toQueue,
        fromStatus: currentStatus,
        toStatus: input.toStatus,
        notes: input.notes ?? null,
        metadata: input.metadata ?? null,
        createdAt: new Date("2026-10-15T00:00:00Z"),
      },
    }),
  };

  const fakeEvidence: any = {
    assertOwnedCase: async (ownerId: number, cId: string) => {
      if (ownerId !== 9 || cId !== caseId) throw new TriageCaseNotFound("case not owned");
    },
  };

  const fakeOperator: any = options.operatorService ?? {
    listCases: async (actorId: number) => {
      if (!isOperator) throw new TriageOperatorDenied("Support operator permission required");
      return [];
    },
    resolveCase: async (actorId: number, cId: string) => {
      if (!isOperator) throw new TriageOperatorDenied("Support operator permission required");
      if (cId !== caseId) throw new TriageOperatorCaseNotFound(cId);
      return { case_id: caseId, subject_owner_id: 9, zap_run_id: "11111111-1111-4111-8111-111111111111", stage: 0 };
    },
  };

  const fakeEngineering: any = options.engineeringService ?? {
    listCases: async (actorId: number) => {
      if (!isEngineer) throw new TriageEngineeringDenied("Engineering permission required");
      if (currentQueue !== "engineering") return [];
      return [{
        case_id: caseId,
        zap_run_id: "11111111-1111-4111-8111-111111111111",
        stage: 0,
        subject_owner_id: 9,
        observed_at: "2026-10-15T00:00:00.000Z",
        provider_outcome: "rejected",
        safe_code: "telegram_http_429",
        source: "retry_row",
        workflow: {
          id: "wf-1",
          queue: "engineering",
          status: "escalated",
          assignedEngineerId: null,
          escalationReason: "Deep investigation needed",
          customerInstructions: null,
          findings: null,
          resolutionReason: null,
          version: 1,
          createdAt: "2026-10-15T00:00:00.000Z",
          updatedAt: "2026-10-15T00:00:00.000Z",
        },
      }];
    },
    resolveCase: async (actorId: number, cId: string) => {
      if (!isEngineer) throw new TriageEngineeringDenied("Engineering permission required");
      if (currentQueue !== "engineering" || cId !== caseId) throw new TriageEngineeringCaseNotFound(cId);
      return {
        case_id: caseId,
        zap_run_id: "11111111-1111-4111-8111-111111111111",
        stage: 0,
        subject_owner_id: 9,
        observed_at: "2026-10-15T00:00:00.000Z",
        provider_outcome: "rejected",
        safe_code: "telegram_http_429",
        source: "retry_row",
        workflow: {
          id: "wf-1",
          queue: "engineering",
          status: "escalated",
          assignedEngineerId: null,
          escalationReason: "Deep investigation needed",
          customerInstructions: null,
          findings: null,
          resolutionReason: null,
          version: 1,
          createdAt: "2026-10-15T00:00:00.000Z",
          updatedAt: "2026-10-15T00:00:00.000Z",
        },
      };
    },
    returnFindings: async (input: any) => {
      if (!isEngineer) throw new TriageEngineeringDenied("Engineering permission required");
      return fakeWorkflow.transition({
        caseId: input.caseId,
        subjectOwnerId: 9,
        actorId: input.actorId,
        action: "return_findings",
        toQueue: "support",
        toStatus: "findings_returned",
        findings: input.findings,
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
      });
    },
    resolve: async (input: any) => {
      if (!isEngineer) throw new TriageEngineeringDenied("Engineering permission required");
      return fakeWorkflow.transition({
        caseId: input.caseId,
        subjectOwnerId: 9,
        actorId: input.actorId,
        action: "resolve",
        toQueue: "resolved",
        toStatus: "resolved",
        resolutionReason: input.resolutionReason,
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
      });
    },
  };

  app.use("/api/v1/triage", createTriageRouter({
    evidence: fakeEvidence,
    operator: fakeOperator,
    workflow: fakeWorkflow,
    engineering: fakeEngineering,
  }));

  const server = createServer(app);
  servers.push(server);
  return new Promise<{ origin: string }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as { port: number };
      resolve({ origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

describe("Phase 16C Workflow & Roles HTTP API", () => {
  test("ordinary owner is denied privileged operator and engineering routes", async () => {
    const { origin } = await startTestServer({ isOperator: false, isEngineer: false, isOwner: true });
    const userToken = token(9);

    const opCasesRes = await fetch(`${origin}/api/v1/triage/operator/cases`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(opCasesRes.status).toBe(403);

    const opWfRes = await fetch(`${origin}/api/v1/triage/operator/cases/${caseId}/workflow`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(opWfRes.status).toBe(403);

    const engCasesRes = await fetch(`${origin}/api/v1/triage/engineering/cases`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(engCasesRes.status).toBe(403);

    const engCaseRes = await fetch(`${origin}/api/v1/triage/engineering/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(engCaseRes.status).toBe(403);
  });

  test("engineer is denied operator discovery and operator replay routes", async () => {
    const { origin } = await startTestServer({ isOperator: false, isEngineer: true });
    const engToken = token(42);

    const opCasesRes = await fetch(`${origin}/api/v1/triage/operator/cases`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    expect(opCasesRes.status).toBe(403);

    const replayRes = await fetch(`${origin}/api/v1/triage/operator/cases/${caseId}/replay/requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${engToken}`,
        "Content-Type": "application/json",
        "idempotency-key": "a0000000-0000-4000-8000-000000000001",
      },
      body: JSON.stringify({
        approvalId: "b0000000-0000-4000-8000-000000000001",
        proposalVersion: 1,
      }),
    });
    expect(replayRes.status).toBe(403);
  });

  test("engineer lists only cases routed to engineering queue and views routed case", async () => {
    const { origin } = await startTestServer({ isOperator: false, isEngineer: true, queue: "engineering", status: "escalated" });
    const engToken = token(42);

    const listRes = await fetch(`${origin}/api/v1/triage/engineering/cases`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.cases).toHaveLength(1);
    expect(listBody.cases[0].case_id).toBe(caseId);
    expect(listBody.cases[0].workflow.queue).toBe("engineering");

    const getRes = await fetch(`${origin}/api/v1/triage/engineering/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as any;
    expect(getBody.case_id).toBe(caseId);
    expect(getBody.workflow.queue).toBe("engineering");
  });

  test("engineer is denied access to unrouted case (queue is support)", async () => {
    const { origin } = await startTestServer({ isOperator: false, isEngineer: true, queue: "support" });
    const engToken = token(42);

    const listRes = await fetch(`${origin}/api/v1/triage/engineering/cases`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.cases).toHaveLength(0);

    const getRes = await fetch(`${origin}/api/v1/triage/engineering/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    expect(getRes.status).toBe(404);
  });

  test("engineer returns findings and resolves case", async () => {
    const { origin } = await startTestServer({ isOperator: false, isEngineer: true, queue: "engineering", status: "escalated" });
    const engToken = token(42);

    const findingsRes = await fetch(`${origin}/api/v1/triage/engineering/cases/${caseId}/findings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${engToken}`,
        "Content-Type": "application/json",
        "idempotency-key": "a0000000-0000-4000-8000-000000000002",
      },
      body: JSON.stringify({
        findings: "Identified provider rate limit reset bug",
        notes: "Checked server logs",
      }),
    });
    expect(findingsRes.status).toBe(200);
    const findingsBody = (await findingsRes.json()) as any;
    expect(findingsBody.workflow.queue).toBe("support");
    expect(findingsBody.workflow.status).toBe("findings_returned");
    expect(findingsBody.event.action).toBe("return_findings");

    const resolveRes = await fetch(`${origin}/api/v1/triage/engineering/cases/${caseId}/resolve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${engToken}`,
        "Content-Type": "application/json",
        "idempotency-key": "a0000000-0000-4000-8000-000000000003",
      },
      body: JSON.stringify({
        resolutionReason: "Issue resolved on upstream provider",
      }),
    });
    expect(resolveRes.status).toBe(200);
    const resolveBody = (await resolveRes.json()) as any;
    expect(resolveBody.workflow.queue).toBe("resolved");
    expect(resolveBody.workflow.status).toBe("resolved");
    expect(resolveBody.event.action).toBe("resolve");
  });

  test("operator can route case to owner repair, engineering, and resolve", async () => {
    const { origin } = await startTestServer({ isOperator: true });
    const opToken = token(4);

    // Operator requests repair
    const repairRes = await fetch(`${origin}/api/v1/triage/operator/cases/${caseId}/workflow/request-repair`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opToken}`,
        "Content-Type": "application/json",
        "idempotency-key": "a0000000-0000-4000-8000-000000000004",
      },
      body: JSON.stringify({
        customerInstructions: {
          missingFields: ["subject"],
          instructions: "Set the email subject field in step 2",
        },
      }),
    });
    expect(repairRes.status).toBe(200);
    const repairBody = (await repairRes.json()) as any;
    expect(repairBody.workflow.queue).toBe("owner");
    expect(repairBody.workflow.status).toBe("awaiting_owner");

    // Operator escalates
    const escRes = await fetch(`${origin}/api/v1/triage/operator/cases/${caseId}/workflow/escalate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opToken}`,
        "Content-Type": "application/json",
        "idempotency-key": "a0000000-0000-4000-8000-000000000005",
      },
      body: JSON.stringify({
        escalationReason: "Repeated Telegram 403 on valid bot token",
      }),
    });
    expect(escRes.status).toBe(200);
    const escBody = (await escRes.json()) as any;
    expect(escBody.workflow.queue).toBe("engineering");
    expect(escBody.workflow.status).toBe("escalated");

    // Operator views workflow
    const wfRes = await fetch(`${origin}/api/v1/triage/operator/cases/${caseId}/workflow`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    expect(wfRes.status).toBe(200);
    const wfBody = (await wfRes.json()) as any;
    expect(wfBody.workflow.caseId).toBe(caseId);
    expect(wfBody.events).toHaveLength(1);
  });

  test("owner can view workflow state and submit repair completion only when awaiting repair", async () => {
    // When awaiting owner:
    const { origin } = await startTestServer({ isOwner: true, queue: "owner", status: "awaiting_owner" });
    const ownerToken = token(9);
    const nonOwnerToken = token(99);

    // Non-owner is denied
    const nonOwnerGet = await fetch(`${origin}/api/v1/triage/cases/${caseId}/workflow`, {
      headers: { Authorization: `Bearer ${nonOwnerToken}` },
    });
    expect(nonOwnerGet.status).toBe(404);

    // Owner gets workflow state
    const ownerGet = await fetch(`${origin}/api/v1/triage/cases/${caseId}/workflow`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(ownerGet.status).toBe(200);
    const ownerGetBody = (await ownerGet.json()) as any;
    expect(ownerGetBody.workflow.queue).toBe("owner");
    expect(ownerGetBody.workflow.status).toBe("awaiting_owner");

    // Owner submits repair
    const ackRes = await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair-acknowledgement`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
        "idempotency-key": "a0000000-0000-4000-8000-000000000006",
      },
      body: JSON.stringify({
        repairNote: "Added subject 'Meeting Notice' to Zap action",
      }),
    });
    expect(ackRes.status).toBe(200);
    const ackBody = (await ackRes.json()) as any;
    expect(ackBody.workflow.queue).toBe("support");
    expect(ackBody.workflow.status).toBe("repair_submitted");
  });

  test("owner repair acknowledgement returns 409 if case is not in awaiting_owner state", async () => {
    const { origin } = await startTestServer({ isOwner: true, queue: "support", status: "needing_support" });
    const ownerToken = token(9);

    const ackRes = await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair-acknowledgement`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
        "idempotency-key": "a0000000-0000-4000-8000-000000000007",
      },
      body: JSON.stringify({}),
    });
    expect(ackRes.status).toBe(409);
    const body = (await ackRes.json()) as any;
    expect(body.detail).toBe("Case is not awaiting owner repair");
  });

  test("operator routing reports an optimistic-locking conflict as 409", async () => {
    const { WorkflowConcurrencyConflict } = await import("../services/case-workflow.ts");
    let calls = 0;
    const conflictingWorkflow: any = {
      getWorkflow: async (cId: string) => ({ caseId: cId, queue: "support", status: "needing_support" }),
      transition: async () => {
        calls += 1;
        if (calls > 1) throw new WorkflowConcurrencyConflict("Workflow version conflict: expected 1, current is 2");
        return {
          workflow: {
            id: "wf-1", caseId, subjectOwnerId: 9, queue: "engineering", status: "escalated",
            assignedEngineerId: null, activeInvestigationId: null, activeProposalId: null, version: 2,
            customerInstructions: null, repairNote: null, escalationReason: "Concurrent escalation",
            findings: null, resolutionReason: null, resolvedAt: null,
            createdAt: new Date("2026-10-15T00:00:00Z"), updatedAt: new Date("2026-10-15T00:00:00Z"),
          },
          event: {
            id: "ev-1", workflowId: "wf-1", caseId, subjectOwnerId: 9, actorId: 4, action: "escalate",
            fromQueue: "support", toQueue: "engineering", fromStatus: "needing_support",
            toStatus: "escalated", notes: null, metadata: null, createdAt: new Date("2026-10-15T00:00:00Z"),
          },
        };
      },
    };
    const { origin } = await startTestServer({ isOperator: true, workflowService: conflictingWorkflow });
    const opToken = token(4);
    const escalate = (key: string) => fetch(`${origin}/api/v1/triage/operator/cases/${caseId}/workflow/escalate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opToken}`,
        "Content-Type": "application/json",
        "idempotency-key": key,
      },
      body: JSON.stringify({ escalationReason: "Concurrent escalation" }),
    });

    expect((await escalate("a0000000-0000-4000-8000-000000000008")).status).toBe(200);
    const conflictRes = await escalate("a0000000-0000-4000-8000-000000000009");
    expect(conflictRes.status).toBe(409);
    const conflictBody = (await conflictRes.json()) as any;
    expect(conflictBody.detail).toContain("version conflict");
  });
});
