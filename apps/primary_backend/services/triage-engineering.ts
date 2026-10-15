import { randomUUID } from "node:crypto";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { CaseWorkflowService, type SqlClient, type TransactionDb } from "./case-workflow.ts";
import type { CustomerInstructions } from "../../../packages/triage-contracts/workflow.ts";

export class TriageEngineeringDenied extends Error {}
export class TriageEngineeringCaseNotFound extends Error {}

type EngineeringAccessAction =
  | "engineering_list_cases"
  | "engineering_read_case"
  | "engineering_return_findings"
  | "engineering_resolve"
  | "failure_context"
  | "execution_evidence";

export type EngineeringCaseRow = {
  caseId: string;
  zapRunId: string;
  stage: number;
  subjectOwnerId: number;
  observedAt: Date;
  providerOutcome: string | null;
  safeCode: string | null;
  evidenceSource: string | null;
  workflowId: string;
  queue: string;
  status: string;
  assignedEngineerId: number | null;
  escalationReason: string | null;
  customerInstructions: unknown;
  findings: string | null;
  resolutionReason: string | null;
  workflowVersion: number;
  workflowCreatedAt: Date;
  workflowUpdatedAt: Date;
};

export const projectEngineeringCase = (row: EngineeringCaseRow) => ({
  case_id: row.caseId,
  zap_run_id: row.zapRunId,
  stage: row.stage,
  subject_owner_id: row.subjectOwnerId,
  observed_at: row.observedAt.toISOString(),
  provider_outcome: row.providerOutcome,
  safe_code: row.safeCode,
  source: row.evidenceSource === "reconciled_execution" ? "reconciled_execution" : "retry_row",
  workflow: {
    id: row.workflowId,
    queue: row.queue,
    status: row.status,
    assignedEngineerId: row.assignedEngineerId,
    escalationReason: row.escalationReason,
    customerInstructions: (row.customerInstructions as CustomerInstructions) ?? null,
    findings: row.findings,
    resolutionReason: row.resolutionReason,
    version: row.workflowVersion,
    createdAt: row.workflowCreatedAt.toISOString(),
    updatedAt: row.workflowUpdatedAt.toISOString(),
  },
});

export class TriageEngineeringService {
  constructor(
    private readonly db: TransactionDb,
    private readonly workflow: CaseWorkflowService,
  ) {}

  private async audit(
    actorId: number,
    action: EngineeringAccessAction,
    outcome: "allowed" | "denied",
    caseId?: string,
    subjectOwnerId?: number,
  ) {
    await this.db.$executeRaw(Prisma.sql`
      INSERT INTO "TriageAccessAudit" (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
      VALUES (${randomUUID()}, ${actorId}, ${subjectOwnerId ?? null}, ${caseId ?? null}, ${action}, ${outcome})
    `);
  }

  async requirePermission(actorId: number, action: EngineeringAccessAction, caseId?: string) {
    const rows = await this.db.$queryRaw<{ isEngineer: boolean }[]>(Prisma.sql`
      SELECT "isEngineer" FROM "User" WHERE id = ${actorId}
    `);
    if (rows[0]?.isEngineer) return;
    await this.audit(actorId, action, "denied", caseId);
    throw new TriageEngineeringDenied("Engineering permission required");
  }

  async listCases(actorId: number, limit = 50) {
    await this.requirePermission(actorId, "engineering_list_cases");
    const boundedLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 50, 1), 50);

    const rows = await this.db.$queryRaw<EngineeringCaseRow[]>(Prisma.sql`
      SELECT retry.id AS "caseId", retry."zapRunId" AS "zapRunId", retry.stage,
        zap."userId" AS "subjectOwnerId", retry."createdAt" AS "observedAt",
        retry."providerOutcome" AS "providerOutcome", retry."safeCode" AS "safeCode",
        retry."evidenceSource" AS "evidenceSource",
        wf.id AS "workflowId", wf.queue, wf.status, wf."assignedEngineerId",
        wf."escalationReason", wf."customerInstructions", wf.findings, wf."resolutionReason",
        wf.version AS "workflowVersion", wf."createdAt" AS "workflowCreatedAt",
        wf."updatedAt" AS "workflowUpdatedAt"
      FROM "TriageCaseWorkflow" wf
      INNER JOIN "ZapRunRetry" retry ON retry.id = wf."caseId"
      INNER JOIN "ZapRun" run ON run.id = retry."zapRunId"
      INNER JOIN "Zap" zap ON zap.id = run."zapId"
      WHERE wf.queue = 'engineering'
      ORDER BY wf."updatedAt" DESC, retry.id DESC
      LIMIT ${boundedLimit}
    `);

    if (rows.length === 0) {
      await this.audit(actorId, "engineering_list_cases", "allowed");
    } else {
      await this.db.$executeRaw(Prisma.sql`
        INSERT INTO "TriageAccessAudit" (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
        VALUES ${Prisma.join(rows.map((row) => Prisma.sql`(${randomUUID()}, ${actorId}, ${row.subjectOwnerId}, ${row.caseId}, 'engineering_list_cases', 'allowed')`))}
      `);
    }

    return rows.map(projectEngineeringCase);
  }

  async resolveCase(actorId: number, caseId: string, action: EngineeringAccessAction = "engineering_read_case") {
    await this.requirePermission(actorId, action, caseId);

    const rows = await this.db.$queryRaw<EngineeringCaseRow[]>(Prisma.sql`
      SELECT retry.id AS "caseId", retry."zapRunId" AS "zapRunId", retry.stage,
        zap."userId" AS "subjectOwnerId", retry."createdAt" AS "observedAt",
        retry."providerOutcome" AS "providerOutcome", retry."safeCode" AS "safeCode",
        retry."evidenceSource" AS "evidenceSource",
        wf.id AS "workflowId", wf.queue, wf.status, wf."assignedEngineerId",
        wf."escalationReason", wf."customerInstructions", wf.findings, wf."resolutionReason",
        wf.version AS "workflowVersion", wf."createdAt" AS "workflowCreatedAt",
        wf."updatedAt" AS "workflowUpdatedAt"
      FROM "TriageCaseWorkflow" wf
      INNER JOIN "ZapRunRetry" retry ON retry.id = wf."caseId"
      INNER JOIN "ZapRun" run ON run.id = retry."zapRunId"
      INNER JOIN "Zap" zap ON zap.id = run."zapId"
      WHERE retry.id = ${caseId} AND wf.queue = 'engineering'
      LIMIT 2
    `);

    const row = rows[0];
    if (!row || rows.length !== 1) {
      await this.audit(actorId, action, "denied", caseId);
      throw new TriageEngineeringCaseNotFound(caseId);
    }

    await this.audit(actorId, action, "allowed", caseId, row.subjectOwnerId);
    return projectEngineeringCase(row);
  }

  async returnFindings(input: {
    actorId: number;
    caseId: string;
    findings: string;
    notes?: string;
    idempotencyKey?: string;
  }) {
    const selected = await this.resolveCase(input.actorId, input.caseId, "engineering_return_findings");
    return this.workflow.transition({
      caseId: selected.case_id,
      subjectOwnerId: selected.subject_owner_id,
      actorId: input.actorId,
      action: "return_findings",
      toQueue: "support",
      toStatus: "findings_returned",
      findings: input.findings,
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
      auditAction: "engineering_return_findings",
    });
  }

  async resolve(input: {
    actorId: number;
    caseId: string;
    resolutionReason: string;
    notes?: string;
    idempotencyKey?: string;
  }) {
    const selected = await this.resolveCase(input.actorId, input.caseId, "engineering_resolve");
    return this.workflow.transition({
      caseId: selected.case_id,
      subjectOwnerId: selected.subject_owner_id,
      actorId: input.actorId,
      action: "resolve",
      toQueue: "resolved",
      toStatus: "resolved",
      resolutionReason: input.resolutionReason,
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
      auditAction: "engineering_resolve",
    });
  }
}
