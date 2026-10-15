import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET ??= "phase-10a-http-test-secret";

const { createTriageRouter } = await import("../route/triage.ts");
const { TriageOwnerService } = await import("../services/triage-owner.ts");
const { TriageCaseNotFound } = await import("../services/triage-evidence.ts");

const caseId = "f0100000-0000-4000-8000-000000000001";
const actionId = "33333333-3333-4333-8333-333333333333";
const zapId = "22222222-2222-4222-8222-222222222222";
const runId = "11111111-1111-4111-8111-111111111111";
const ownerId = 9;

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

function token(id: number) {
  return jwt.sign({ id }, process.env.JWT_SECRET!);
}

/**
 * In-memory stand-in for the Prisma-backed owner service. Only owner 9 owns the case,
 * so cross-owner reads and writes must come back as not-found.
 */
function fakeOwner() {
  const state = {
    ownedBy: ownerId,
    queue: "owner",
    status: "awaiting_owner",
    metadata: { to: "customer@example.invalid", subject: "", body: "Body" },
  };
  const writes: unknown[] = [];
  let actionToken = "";
  let service: InstanceType<typeof TriageOwnerService>;

  const row = () => ({
    caseId,
    zapRunId: runId,
    stage: 1,
    observedAt: new Date("2026-10-15T00:00:00Z"),
    providerOutcome: "not_attempted",
    safeCode: "invalid_action_inputs",
    actionTypeId: "email",
    actionMetadata: state.metadata,
    actionId,
    actionName: "Email",
    actionSortingOrder: 1,
    zapId,
    zapName: "Meeting reminder",
    triggerTypeName: "Catch Hook",
    workflowQueue: state.queue,
    workflowStatus: state.status,
    workflowVersion: 2,
    customerInstructions: {
      targetStep: 1,
      missingFields: ["subject"],
      instructions: "Add the email subject in step 1.",
    },
    repairNote: null,
    resolvedAt: null,
  });

  const db = {
    $queryRaw: async <T>(query: unknown): Promise<T> => {
      const values = (query as { values?: unknown[] }).values ?? [];
      if (values[0] !== state.ownedBy) return [] as T;
      if (typeof values[1] === "string" && values[1] !== caseId) return [] as T;
      if (typeof values[2] === "string" && values[2] !== actionId) return [] as T;
      return [row()] as T;
    },
    $transaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => fn({
      $executeRaw: async (query: any) => {
        const values = query.values ?? [];
        // values: [nextMetadata, actionId, zapId, sortingOrder, currentMetadata]
        writes.push({ next: values[0], current: values[4] });
        if (String(values[4]) !== JSON.stringify(state.metadata ?? {})) return 0;
        state.metadata = JSON.parse(String(values[0]));
        return 1;
      },
    }),
  };

  service = new TriageOwnerService(db as never);
  // Capture the token the service hands out so HTTP tests can replay or stale it.
  const original = service.getRepairCase.bind(service);
  service.getRepairCase = async (owner: number, id: string) => {
    const view = await original(owner, id);
    if (view.action) actionToken = view.action.actionToken;
    return view;
  };
  return { service, state, writes, tokenFor: () => actionToken };
}

function startTestServer(options: { owner?: unknown; ownerId?: number; workflowState?: { queue: string; status: string } | null } = {}) {
  const app = express();
  app.use(express.json());

  const authOwnerId = options.ownerId ?? ownerId;
  const fakeEvidence: any = {
    assertOwnedCase: async (owner: number, id: string) => {
      if (owner !== authOwnerId || id !== caseId) throw new TriageCaseNotFound("case not owned");
    },
  };
  const workflowState = options.workflowState === undefined
    ? { queue: "owner", status: "awaiting_owner" }
    : options.workflowState;
  const fakeWorkflow: any = {
    getWorkflow: async () => (workflowState === null ? null : { caseId, ...workflowState }),
    transition: async (input: any) => ({
      workflow: {
        id: "wf-1", caseId: input.caseId, subjectOwnerId: input.subjectOwnerId, queue: input.toQueue,
        status: input.toStatus, assignedEngineerId: null, activeInvestigationId: null, activeProposalId: null,
        version: 3, customerInstructions: null, repairNote: input.repairNote ?? null, escalationReason: null,
        findings: null, resolutionReason: null, resolvedAt: null,
        createdAt: new Date("2026-10-15T00:00:00Z"), updatedAt: new Date("2026-10-15T00:00:00Z"),
      },
      event: {
        id: "ev-1", workflowId: "wf-1", caseId: input.caseId, subjectOwnerId: input.subjectOwnerId,
        actorId: input.actorId, action: input.action, fromQueue: "owner", toQueue: input.toQueue,
        fromStatus: "awaiting_owner", toStatus: input.toStatus, notes: input.notes ?? null,
        metadata: null, createdAt: new Date("2026-10-15T00:00:00Z"),
      },
    }),
  };

  app.use("/api/v1/triage", createTriageRouter({
    evidence: fakeEvidence as never,
    workflow: fakeWorkflow as never,
    owner: (options.owner ?? fakeOwner().service) as never,
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

describe("Phase 16D owner failure and repair HTTP API", () => {
  test("requires authentication on every owner repair route", async () => {
    const { origin } = await startTestServer();
    for (const [path, init] of [
      ["/api/v1/triage/cases/failures", {}],
      [`/api/v1/triage/cases/${caseId}/repair`, {}],
      [`/api/v1/triage/cases/${caseId}/actions/${actionId}/repair`, { method: "POST", body: "{}" }],
    ] as const) {
      const response = await fetch(`${origin}${path}`, init);
      expect(response.status).toBe(401);
    }
  });

  test("lists only the caller's failures with Zap identity and step label", async () => {
    const fake = fakeOwner();
    const { origin } = await startTestServer({ owner: fake.service });

    const mine = await fetch(`${origin}/api/v1/triage/cases/failures`, {
      headers: { Authorization: `Bearer ${token(ownerId)}` },
    });
    expect(mine.status).toBe(200);
    const mineBody = (await mine.json()) as any;
    expect(mineBody.failures).toHaveLength(1);
    expect(mineBody.failures[0]).toMatchObject({
      caseId,
      zapId,
      zapName: "Meeting reminder",
      stepLabel: "Email (action 1)",
      status: "awaiting_owner",
    });

    const theirs = await fetch(`${origin}/api/v1/triage/cases/failures`, {
      headers: { Authorization: `Bearer ${token(99)}` },
    });
    expect(theirs.status).toBe(200);
    expect(((await theirs.json()) as any).failures).toEqual([]);
  });

  test("returns the owner-safe repair view without internal support state", async () => {
    const fake = fakeOwner();
    const { origin } = await startTestServer({ owner: fake.service });

    const response = await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair`, {
      headers: { Authorization: `Bearer ${token(ownerId)}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;

    expect(body.zap).toMatchObject({ id: zapId, name: "Meeting reminder", editorPath: `/zap/${zapId}` });
    expect(body.stepLabel).toBe("Email (action 1)");
    expect(body.workflow.customerInstructions.instructions).toBe("Add the email subject in step 1.");
    expect(body.workflow.awaitingOwnerRepair).toBe(true);
    expect(body.action.fields.map((field: any) => field.field)).toEqual(["to", "subject", "body", "from"]);
    expect(JSON.stringify(body)).not.toContain("escalation reason");
  });

  test("denies another owner's case and guessed ids as not found", async () => {
    const fake = fakeOwner();
    const { origin } = await startTestServer({ owner: fake.service });

    const otherOwner = await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair`, {
      headers: { Authorization: `Bearer ${token(99)}` },
    });
    expect(otherOwner.status).toBe(404);

    const guessed = await fetch(`${origin}/api/v1/triage/cases/ffffffff-ffff-4fff-8fff-ffffffffffff/repair`, {
      headers: { Authorization: `Bearer ${token(ownerId)}` },
    });
    expect(guessed.status).toBe(404);

    const malformed = await fetch(`${origin}/api/v1/triage/cases/not-a-uuid/repair`, {
      headers: { Authorization: `Bearer ${token(ownerId)}` },
    });
    expect(malformed.status).toBe(404);
  });

  test("saves a valid repair and rejects a stale token with 409 and no write", async () => {
    const fake = fakeOwner();
    const { origin } = await startTestServer({ owner: fake.service });
    const authorization = { Authorization: `Bearer ${token(ownerId)}`, "Content-Type": "application/json" };

    const view = await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair`, { headers: authorization });
    expect(view.status).toBe(200);

    const saved = await fetch(`${origin}/api/v1/triage/cases/${caseId}/actions/${actionId}/repair`, {
      method: "POST",
      headers: authorization,
      body: JSON.stringify({ actionToken: fake.tokenFor(), fields: [{ field: "subject", value: "Meeting notice" }] }),
    });
    expect(saved.status).toBe(200);
    const savedBody = (await saved.json()) as any;
    expect(savedBody.changedFields).toEqual(["subject"]);
    expect(savedBody.workflow.awaitingOwnerRepair).toBe(true);
    expect(fake.state.metadata.subject).toBe("Meeting notice");

    const writesBefore = fake.writes.length;
    const stale = await fetch(`${origin}/api/v1/triage/cases/${caseId}/actions/${actionId}/repair`, {
      method: "POST",
      headers: authorization,
      body: JSON.stringify({ actionToken: "0".repeat(64), fields: [{ field: "subject", value: "Stale edit" }] }),
    });
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as any).detail).toBe("Action changed since it was loaded");
    expect(fake.writes.length).toBe(writesBefore);
    expect(fake.state.metadata.subject).toBe("Meeting notice");
  });

  test("rejects malformed and unbounded repair payloads with 422", async () => {
    const fake = fakeOwner();
    const { origin } = await startTestServer({ owner: fake.service });
    const authorization = { Authorization: `Bearer ${token(ownerId)}`, "Content-Type": "application/json" };
    await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair`, { headers: authorization });

    for (const body of [
      {},
      { actionToken: fake.tokenFor() },
      { actionToken: fake.tokenFor(), fields: [] },
      { actionToken: fake.tokenFor(), fields: [{ field: "subject" }] },
      { actionToken: fake.tokenFor(), fields: [{ field: "subject", value: "x" }], extra: true },
    ]) {
      const response = await fetch(`${origin}/api/v1/triage/cases/${caseId}/actions/${actionId}/repair`, {
        method: "POST",
        headers: authorization,
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(422);
    }
    expect(fake.writes.length).toBe(0);
  });

  test("submitting repair completion returns the case to support and rechecks ownership", async () => {
    const fake = fakeOwner();
    const { origin } = await startTestServer({ owner: fake.service });

    const acknowledged = await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair-acknowledgement`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token(ownerId)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ repairNote: "Added subject 'Meeting notice' to step 1" }),
    });
    expect(acknowledged.status).toBe(200);
    const body = (await acknowledged.json()) as any;
    expect(body.workflow.queue).toBe("support");
    expect(body.workflow.status).toBe("repair_submitted");
    expect(body.event.action).toBe("submit_repair");

    const anotherOwner = await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair-acknowledgement`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token(99)}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(anotherOwner.status).toBe(404);
  });

  test("repair completion fails closed when the workflow is missing or not awaiting the owner", async () => {
    const authorization = { Authorization: `Bearer ${token(ownerId)}`, "Content-Type": "application/json" };
    for (const workflowState of [null, { queue: "support", status: "needing_support" }, { queue: "owner", status: "repair_submitted" }]) {
      const { origin } = await startTestServer({ owner: fakeOwner().service, workflowState });
      const response = await fetch(`${origin}/api/v1/triage/cases/${caseId}/repair-acknowledgement`, {
        method: "POST",
        headers: authorization,
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(409);
      expect(((await response.json()) as any).detail).toBe("Case is not awaiting owner repair");
    }
  });
});
