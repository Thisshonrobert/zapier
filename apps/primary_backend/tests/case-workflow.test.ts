import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CaseWorkflowService,
  WorkflowConcurrencyConflict,
  type WorkflowRow,
  type WorkflowEventRow,
  type SqlClient,
} from "../services/case-workflow.ts";

function createMockDb() {
  const workflows = new Map<string, WorkflowRow>();
  const events: WorkflowEventRow[] = [];
  const audits: unknown[] = [];

  const client: SqlClient = {
    $queryRaw: async <T>(query: unknown): Promise<T> => {
      const sql = String((query as { sql?: string }).sql);
      const values = (query as { values?: unknown[] }).values ?? [];

      if (sql.includes('"TriageCaseWorkflowEvent"') && sql.includes("WHERE id =")) {
        const id = String(values[0]);
        const found = events.filter((e) => e.id === id);
        return found as T;
      }

      if (sql.includes('"TriageCaseWorkflowEvent"') && sql.includes('"caseId" =')) {
        const caseId = String(values[0]);
        const found = events.filter((e) => e.caseId === caseId);
        return found as T;
      }

      if (sql.includes('"TriageCaseWorkflow"') && sql.includes('"caseId" =')) {
        const caseId = String(values[0]);
        const wf = workflows.get(caseId);
        return (wf ? [wf] : []) as T;
      }

      throw new Error(`Unexpected query: ${sql}`);
    },

    $executeRaw: async (query: unknown): Promise<number> => {
      const sql = String((query as { sql?: string }).sql);
      const values = (query as { values?: unknown[] }).values ?? [];

      if (sql.includes('INSERT INTO "TriageCaseWorkflow"')) {
        const [id, caseId, subjectOwnerId, createdAt, updatedAt] = values;
        if (!workflows.has(String(caseId))) {
          workflows.set(String(caseId), {
            id: String(id),
            caseId: String(caseId),
            subjectOwnerId: Number(subjectOwnerId),
            queue: "support",
            status: "needing_support",
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
            createdAt: createdAt as Date,
            updatedAt: updatedAt as Date,
          });
        }
        return 1;
      }

      if (sql.includes('UPDATE "TriageCaseWorkflow"')) {
        const [
          toQueue,
          toStatus,
          nextVersion,
          customerInstructions,
          repairNote,
          escalationReason,
          findings,
          resolutionReason,
          assignedEngineerId,
          activeInvestigationId,
          activeProposalId,
          resolvedAt,
          updatedAt,
          id,
          expectedVersion,
        ] = values;

        for (const wf of workflows.values()) {
          if (wf.id === id && wf.version === Number(expectedVersion)) {
            wf.queue = toQueue as any;
            wf.status = toStatus as any;
            wf.version = Number(nextVersion);
            wf.customerInstructions = customerInstructions ? JSON.parse(String(customerInstructions)) : null;
            wf.repairNote = repairNote as string | null;
            wf.escalationReason = escalationReason as string | null;
            wf.findings = findings as string | null;
            wf.resolutionReason = resolutionReason as string | null;
            wf.assignedEngineerId = assignedEngineerId !== undefined ? (assignedEngineerId as number | null) : null;
            wf.activeInvestigationId = activeInvestigationId as string | null;
            wf.activeProposalId = activeProposalId as string | null;
            wf.resolvedAt = resolvedAt as Date | null;
            wf.updatedAt = updatedAt as Date;
            return 1;
          }
        }
        return 0;
      }

      if (sql.includes('INSERT INTO "TriageCaseWorkflowEvent"')) {
        const [
          id,
          workflowId,
          caseId,
          subjectOwnerId,
          actorId,
          action,
          fromQueue,
          toQueue,
          fromStatus,
          toStatus,
          notes,
          metadata,
          createdAt,
        ] = values;
        events.push({
          id: String(id),
          workflowId: String(workflowId),
          caseId: String(caseId),
          subjectOwnerId: Number(subjectOwnerId),
          actorId: Number(actorId),
          action: action as any,
          fromQueue: fromQueue as any,
          toQueue: toQueue as any,
          fromStatus: fromStatus as any,
          toStatus: toStatus as any,
          notes: notes as string | null,
          metadata: metadata ? JSON.parse(String(metadata)) : null,
          createdAt: createdAt as Date,
        });
        return 1;
      }

      if (sql.includes('INSERT INTO "TriageAccessAudit"')) {
        audits.push(values);
        return 1;
      }

      throw new Error(`Unexpected execute: ${sql}`);
    },
  };

  const db = {
    ...client,
    $transaction: async <T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> => {
      return fn(client);
    },
  };

  return { db, workflows, events, audits };
}

describe("CaseWorkflowService", () => {
  const caseId = "f0100000-0000-4000-8000-000000000001";
  const subjectOwnerId = 9;

  test("lazily creates workflow with default support queue and needing_support status", async () => {
    const { db } = createMockDb();
    const service = new CaseWorkflowService(db);

    const wf = await service.getOrCreateWorkflow(db, caseId, subjectOwnerId);
    assert.equal(wf.caseId, caseId);
    assert.equal(wf.subjectOwnerId, subjectOwnerId);
    assert.equal(wf.queue, "support");
    assert.equal(wf.status, "needing_support");
    assert.equal(wf.version, 1);
  });

  test("transitions workflow state and records event atomically", async () => {
    const { db, events } = createMockDb();
    const service = new CaseWorkflowService(db);

    const result = await service.transition({
      caseId,
      subjectOwnerId,
      actorId: 4,
      action: "request_owner_repair",
      toQueue: "owner",
      toStatus: "awaiting_owner",
      customerInstructions: {
        missingFields: ["subject"],
        instructions: "Please fill in email subject in the Zap editor",
      },
      notes: "Missing email subject",
    });

    assert.equal(result.workflow.queue, "owner");
    assert.equal(result.workflow.status, "awaiting_owner");
    assert.equal(result.workflow.version, 2);
    assert.deepEqual(result.workflow.customerInstructions, {
      missingFields: ["subject"],
      instructions: "Please fill in email subject in the Zap editor",
    });

    assert.equal(events.length, 1);
    assert.equal(events[0]?.action, "request_owner_repair");
    assert.equal(events[0]?.fromQueue, "support");
    assert.equal(events[0]?.toQueue, "owner");
  });

  test("detects version conflict when optimistic lock version differs", async () => {
    const { db } = createMockDb();
    const service = new CaseWorkflowService(db);

    await service.getOrCreateWorkflow(db, caseId, subjectOwnerId);

    await assert.rejects(
      async () => {
        await service.transition({
          caseId,
          subjectOwnerId,
          actorId: 4,
          expectedVersion: 99,
          action: "escalate",
          toQueue: "engineering",
          toStatus: "escalated",
        });
      },
      (err: any) => err instanceof WorkflowConcurrencyConflict,
    );
  });

  test("idempotently returns previous event and workflow when idempotencyKey repeats", async () => {
    const { db, events } = createMockDb();
    const service = new CaseWorkflowService(db);

    const key = "e0000000-0000-4000-8000-000000000001";
    const first = await service.transition({
      caseId,
      subjectOwnerId,
      actorId: 4,
      idempotencyKey: key,
      action: "escalate",
      toQueue: "engineering",
      toStatus: "escalated",
      escalationReason: "SDK 500 error",
    });

    const second = await service.transition({
      caseId,
      subjectOwnerId,
      actorId: 4,
      idempotencyKey: key,
      action: "escalate",
      toQueue: "engineering",
      toStatus: "escalated",
      escalationReason: "SDK 500 error",
    });

    assert.equal(events.length, 1);
    assert.equal(first.workflow.version, second.workflow.version);
    assert.equal(first.event.id, second.event.id);
  });

  test("sets resolvedAt timestamp on resolved transition, and retrieves workflow with events", async () => {
    const { db } = createMockDb();
    const service = new CaseWorkflowService(db);

    await service.transition({
      caseId,
      subjectOwnerId,
      actorId: 4,
      action: "resolve",
      toQueue: "resolved",
      toStatus: "resolved",
      resolutionReason: "Issue resolved without replay",
    });

    const full = await service.getWorkflowWithEvents(caseId);
    assert.ok(full);
    assert.equal(full.workflow.queue, "resolved");
    assert.equal(full.workflow.status, "resolved");
    assert.ok(full.workflow.resolvedAt);
    assert.equal(full.events.length, 1);
    assert.equal(full.events[0]?.action, "resolve");
  });
});
