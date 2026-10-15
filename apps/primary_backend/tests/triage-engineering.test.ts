import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  TriageEngineeringDenied,
  TriageEngineeringCaseNotFound,
  TriageEngineeringService,
  type EngineeringCaseRow,
} from "../services/triage-engineering.ts";
import { CaseWorkflowService, type SqlClient } from "../services/case-workflow.ts";

const caseId = "f0100000-0000-4000-8000-000000000001";
const runId = "11111111-1111-4111-8111-111111111111";

function createMockEngineeringDb(options: { isEngineer?: boolean; queue?: string } = {}) {
  const isEngineer = options.isEngineer ?? true;
  const queue = options.queue ?? "engineering";
  const audits: any[] = [];
  const events: any[] = [];

  const client: SqlClient = {
    $queryRaw: async <T>(query: unknown): Promise<T> => {
      const sql = String((query as { sql?: string }).sql);
      const values = (query as { values?: unknown[] }).values ?? [];

      if (sql.includes('"isEngineer"')) {
        return [{ isEngineer }] as T;
      }

      if (sql.includes('FROM "TriageCaseWorkflow" wf') && sql.includes("wf.queue = 'engineering'")) {
        if (queue !== "engineering") {
          return [] as T;
        }
        const row: EngineeringCaseRow = {
          caseId,
          zapRunId: runId,
          stage: 1,
          subjectOwnerId: 9,
          observedAt: new Date("2026-10-15T00:00:00Z"),
          providerOutcome: "rejected",
          safeCode: "telegram_http_429",
          evidenceSource: "captured",
          workflowId: "wf-1",
          queue: "engineering",
          status: "escalated",
          assignedEngineerId: 42,
          escalationReason: "Need deep network inspection",
          customerInstructions: null,
          findings: null,
          resolutionReason: null,
          workflowVersion: 2,
          workflowCreatedAt: new Date("2026-10-15T00:00:00Z"),
          workflowUpdatedAt: new Date("2026-10-15T00:00:00Z"),
        };
        return [row] as T;
      }

      if (sql.includes('"TriageCaseWorkflow"') && sql.includes('"caseId" =')) {
        return [{
          id: "wf-1",
          caseId,
          subjectOwnerId: 9,
          queue,
          status: queue === "engineering" ? "escalated" : "needing_support",
          assignedEngineerId: 42,
          activeInvestigationId: null,
          activeProposalId: null,
          version: 2,
          customerInstructions: null,
          repairNote: null,
          escalationReason: "Need deep network inspection",
          findings: null,
          resolutionReason: null,
          resolvedAt: null,
          createdAt: new Date("2026-10-15T00:00:00Z"),
          updatedAt: new Date("2026-10-15T00:00:00Z"),
        }] as T;
      }

      if (sql.includes('"TriageCaseWorkflowEvent"') && sql.includes("WHERE id =")) {
        const id = String(values[0]);
        const found = events.find((e) => e.id === id);
        return (found ? [found] : []) as T;
      }

      throw new Error(`Unexpected query: ${sql}`);
    },

    $executeRaw: async (query: unknown): Promise<number> => {
      const sql = String((query as { sql?: string }).sql);
      const values = (query as { values?: unknown[] }).values ?? [];

      if (sql.includes('INSERT INTO "TriageAccessAudit"')) {
        audits.push({ sql, values });
        return 1;
      }

      if (sql.includes('INSERT INTO "TriageCaseWorkflowEvent"')) {
        const [
          id, workflowId, caseId, subjectOwnerId, actorId,
          action, fromQueue, toQueue, fromStatus, toStatus,
          notes, metadata, createdAt
        ] = values;
        events.push({
          id: String(id),
          workflowId: String(workflowId),
          caseId: String(caseId),
          subjectOwnerId: Number(subjectOwnerId),
          actorId: Number(actorId),
          action,
          fromQueue,
          toQueue,
          fromStatus,
          toStatus,
          notes: notes as string | null,
          metadata: metadata ? JSON.parse(String(metadata)) : null,
          createdAt: createdAt as Date,
        });
        return 1;
      }

      if (sql.includes('UPDATE "TriageCaseWorkflow"')) {
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

  const workflow = new CaseWorkflowService(db);
  const engineering = new TriageEngineeringService(db, workflow);

  return { db, workflow, engineering, audits, events };
}

/**
 * Builds a mutable engineering service whose `isEngineer` permission can be flipped between
 * calls, so revocation-on-the-next-request can be asserted without cache or session state.
 */
function createEngineeringService(options: {
  permitted: { isEngineer: boolean };
  audits: { action: string; outcome: string }[];
}) {
  const client = {
    $queryRaw: async <T>(query: unknown): Promise<T> => {
      const sql = String((query as { sql?: string }).sql);

      if (sql.includes('"isEngineer"')) return [{ isEngineer: options.permitted.isEngineer }] as T;

      if (sql.includes('FROM "TriageCaseWorkflow" wf') && sql.includes("wf.queue = 'engineering'")) {
        return [{
          caseId, zapRunId: runId, stage: 1, subjectOwnerId: 9,
          observedAt: new Date("2026-10-15T00:00:00Z"), providerOutcome: "rejected",
          safeCode: "telegram_http_429", evidenceSource: "captured",
          workflowId: "wf-1", queue: "engineering", status: "escalated",
          assignedEngineerId: 42, escalationReason: "Need deep network inspection",
          customerInstructions: null, findings: null, resolutionReason: null,
          workflowVersion: 2, workflowCreatedAt: new Date("2026-10-15T00:00:00Z"),
          workflowUpdatedAt: new Date("2026-10-15T00:00:00Z"),
        }] as T;
      }

      throw new Error(`Unexpected query: ${sql}`);
    },
    $executeRaw: async (query: unknown): Promise<number> => {
      const sql = String((query as { sql?: string }).sql);
      if (sql.includes('INSERT INTO "TriageAccessAudit"')) {
        const values = (query as { values?: unknown[] }).values ?? [];
        options.audits.push({ action: String(values[4]), outcome: String(values[5]) });
        return 1;
      }
      throw new Error(`Unexpected execute: ${sql}`);
    },
  };
  const db = {
    ...client,
    $transaction: async <T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> => fn(client),
  };

  return new TriageEngineeringService(db, new CaseWorkflowService(db));
}

describe("TriageEngineeringService", () => {
  test("denies non-engineer and logs denied access audit", async () => {
    const { engineering, audits } = createMockEngineeringDb({ isEngineer: false });

    await assert.rejects(
      async () => {
        await engineering.listCases(42);
      },
      (err: any) => err instanceof TriageEngineeringDenied,
    );

    assert.equal(audits.length, 1);
    assert.match(audits[0].sql + JSON.stringify(audits[0].values), /denied/);
  });

  test("lists cases routed to engineering queue and logs audit", async () => {
    const { engineering, audits } = createMockEngineeringDb({ isEngineer: true, queue: "engineering" });

    const cases = await engineering.listCases(42);
    assert.equal(cases.length, 1);
    assert.equal(cases[0]?.case_id, caseId);
    assert.equal(cases[0]?.workflow.queue, "engineering");
    assert.equal(cases[0]?.workflow.status, "escalated");

    assert.equal(audits.length, 1);
    assert.match(audits[0].sql + JSON.stringify(audits[0].values), /allowed/);
    assert.match(audits[0].sql + JSON.stringify(audits[0].values), /engineering_list_cases/);
  });

  test("resolves a case in engineering queue; denies unrouted case", async () => {
    const routed = createMockEngineeringDb({ isEngineer: true, queue: "engineering" });
    const selected = await routed.engineering.resolveCase(42, caseId);
    assert.equal(selected.case_id, caseId);
    assert.equal(selected.workflow.queue, "engineering");

    const unrouted = createMockEngineeringDb({ isEngineer: true, queue: "support" });
    await assert.rejects(
      async () => {
        await unrouted.engineering.resolveCase(42, caseId);
      },
      (err: any) => err instanceof TriageEngineeringCaseNotFound,
    );
  });

  test("returns findings and transitions workflow back to support", async () => {
    const { engineering, audits, events } = createMockEngineeringDb({ isEngineer: true, queue: "engineering" });

    const result = await engineering.returnFindings({
      actorId: 42,
      caseId,
      findings: "Root cause: network firewall dropped Telegram packets",
      notes: "Reviewed firewall rules",
    });

    assert.equal(result.event.action, "return_findings");
    assert.equal(result.event.fromQueue, "engineering");
    assert.equal(result.event.toQueue, "support");
    assert.equal(result.event.toStatus, "findings_returned");

    assert.ok(audits.some((a) => JSON.stringify(a).includes("engineering_return_findings")));
  });

  test("resolves case and transitions workflow to resolved", async () => {
    const { engineering, audits } = createMockEngineeringDb({ isEngineer: true, queue: "engineering" });

    const result = await engineering.resolve({
      actorId: 42,
      caseId,
      resolutionReason: "Platform bug fixed in commit abc1234",
    });

    assert.equal(result.event.action, "resolve");
    assert.equal(result.event.toQueue, "resolved");
    assert.equal(result.event.toStatus, "resolved");

    assert.ok(audits.some((a) => JSON.stringify(a).includes("engineering_resolve")));
  });

  test("revocation takes effect on the next read and is audited", async () => {
    const permitted = { isEngineer: true };
    const audits: any[] = [];
    const engineering = createEngineeringService({ permitted, audits });

    // A revoked engineer is denied before any case read is attempted.
    permitted.isEngineer = false;
    await assert.rejects(async () => { await engineering.listCases(42); },
      (err: any) => err instanceof TriageEngineeringDenied);

    permitted.isEngineer = true;
    const cases = await engineering.listCases(42);
    assert.equal(cases.length, 1);

    // Revocation takes effect on the next read without any cache or session state.
    permitted.isEngineer = false;
    await assert.rejects(async () => { await engineering.resolveCase(42, caseId, "engineering_read_case"); },
      (err: any) => err instanceof TriageEngineeringDenied);
    assert.equal(audits.filter((a) => a.outcome === "denied").length, 2);
  });

  test("revocation takes effect on the next write and is audited", async () => {
    const audits: any[] = [];
    const engineering = createEngineeringService({ permitted: { isEngineer: false }, audits });

    await assert.rejects(async () => { await engineering.returnFindings({ actorId: 42, caseId, findings: "findings" }); },
      (err: any) => err instanceof TriageEngineeringDenied);
    await assert.rejects(async () => { await engineering.resolve({ actorId: 42, caseId, resolutionReason: "revoked" }); },
      (err: any) => err instanceof TriageEngineeringDenied);

    assert.equal(audits.length, 2);
    assert.ok(audits.every((a) => a.outcome === "denied"));
    assert.deepEqual(audits.map((a) => a.action), ["engineering_return_findings", "engineering_resolve"]);
  });
});
