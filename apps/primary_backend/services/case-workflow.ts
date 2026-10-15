import { randomUUID } from "node:crypto";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import type {
  WorkflowQueue,
  WorkflowStatus,
  WorkflowAction,
  CustomerInstructions,
  WorkflowCaseView,
  WorkflowEventView,
} from "../../../packages/triage-contracts/workflow.ts";

export type SqlClient = {
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
  $executeRaw(query: unknown): Promise<number>;
};

export type TransactionDb = SqlClient & {
  $transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>;
};

export type WorkflowRow = {
  id: string;
  caseId: string;
  subjectOwnerId: number;
  queue: WorkflowQueue;
  status: WorkflowStatus;
  assignedEngineerId: number | null;
  activeInvestigationId: string | null;
  activeProposalId: string | null;
  version: number;
  customerInstructions: unknown;
  repairNote: string | null;
  escalationReason: string | null;
  findings: string | null;
  resolutionReason: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowEventRow = {
  id: string;
  workflowId: string;
  caseId: string;
  subjectOwnerId: number;
  actorId: number;
  action: WorkflowAction;
  fromQueue: WorkflowQueue;
  toQueue: WorkflowQueue;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  notes: string | null;
  metadata: unknown;
  createdAt: Date;
};

export class WorkflowNotFound extends Error {}
export class WorkflowConcurrencyConflict extends Error {}
export class WorkflowDenied extends Error {}

export function projectWorkflow(row: WorkflowRow, zapRunId = "", stage = 0): WorkflowCaseView {
  return {
    caseId: row.caseId,
    zapRunId,
    stage,
    subjectOwnerId: row.subjectOwnerId,
    queue: row.queue,
    status: row.status,
    assignedEngineerId: row.assignedEngineerId,
    activeInvestigationId: row.activeInvestigationId,
    activeProposalId: row.activeProposalId,
    version: row.version,
    customerInstructions: (row.customerInstructions as CustomerInstructions) ?? null,
    repairNote: row.repairNote,
    escalationReason: row.escalationReason,
    findings: row.findings,
    resolutionReason: row.resolutionReason,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function projectEvent(row: WorkflowEventRow): WorkflowEventView {
  return {
    id: row.id,
    workflowId: row.workflowId,
    caseId: row.caseId,
    subjectOwnerId: row.subjectOwnerId,
    actorId: row.actorId,
    action: row.action,
    fromQueue: row.fromQueue,
    toQueue: row.toQueue,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    notes: row.notes,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class CaseWorkflowService {
  constructor(private readonly db: TransactionDb) {}

  async getOrCreateWorkflow(
    tx: SqlClient,
    caseId: string,
    subjectOwnerId: number,
    forUpdate = false,
  ): Promise<WorkflowRow> {
    const lockClause = forUpdate ? Prisma.sql`FOR UPDATE` : Prisma.empty;
    const existing = await tx.$queryRaw<WorkflowRow[]>(Prisma.sql`
      SELECT id, "caseId", "subjectOwnerId", queue, status, "assignedEngineerId",
             "activeInvestigationId", "activeProposalId", version,
             "customerInstructions", "repairNote", "escalationReason",
             findings, "resolutionReason", "resolvedAt", "createdAt", "updatedAt"
      FROM "TriageCaseWorkflow"
      WHERE "caseId" = ${caseId}
      ${lockClause}
    `);

    if (existing[0]) return existing[0];

    const id = randomUUID();
    const now = new Date();
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "TriageCaseWorkflow" (
        id, "caseId", "subjectOwnerId", queue, status, version, "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${caseId}, ${subjectOwnerId}, 'support', 'needing_support', 1, ${now}, ${now}
      ) ON CONFLICT ("caseId") DO NOTHING
    `);

    const created = await tx.$queryRaw<WorkflowRow[]>(Prisma.sql`
      SELECT id, "caseId", "subjectOwnerId", queue, status, "assignedEngineerId",
             "activeInvestigationId", "activeProposalId", version,
             "customerInstructions", "repairNote", "escalationReason",
             findings, "resolutionReason", "resolvedAt", "createdAt", "updatedAt"
      FROM "TriageCaseWorkflow"
      WHERE "caseId" = ${caseId}
      ${lockClause}
    `);

    if (!created[0]) throw new WorkflowNotFound(`Failed to create workflow for case ${caseId}`);
    return created[0];
  }

  async getWorkflow(caseId: string): Promise<WorkflowRow | null> {
    const rows = await this.db.$queryRaw<WorkflowRow[]>(Prisma.sql`
      SELECT id, "caseId", "subjectOwnerId", queue, status, "assignedEngineerId",
             "activeInvestigationId", "activeProposalId", version,
             "customerInstructions", "repairNote", "escalationReason",
             findings, "resolutionReason", "resolvedAt", "createdAt", "updatedAt"
      FROM "TriageCaseWorkflow"
      WHERE "caseId" = ${caseId}
    `);
    return rows[0] ?? null;
  }

  async getWorkflowWithEvents(caseId: string) {
    const workflow = await this.getWorkflow(caseId);
    if (!workflow) return null;

    const events = await this.db.$queryRaw<WorkflowEventRow[]>(Prisma.sql`
      SELECT id, "workflowId", "caseId", "subjectOwnerId", "actorId",
             action, "fromQueue", "toQueue", "fromStatus", "toStatus",
             notes, metadata, "createdAt"
      FROM "TriageCaseWorkflowEvent"
      WHERE "caseId" = ${caseId}
      ORDER BY "createdAt" ASC, id ASC
    `);

    return {
      workflow,
      events,
    };
  }

  async transition(
    input: {
      caseId: string;
      subjectOwnerId: number;
      actorId: number;
      action: WorkflowAction;
      toQueue: WorkflowQueue;
      toStatus: WorkflowStatus;
      expectedVersion?: number;
      notes?: string;
      metadata?: Record<string, unknown>;
      customerInstructions?: CustomerInstructions;
      repairNote?: string;
      escalationReason?: string;
      assignedEngineerId?: number | null;
      findings?: string;
      resolutionReason?: string;
      activeInvestigationId?: string;
      activeProposalId?: string;
      idempotencyKey?: string;
      auditAction?: string;
    },
    client?: SqlClient,
  ): Promise<{ workflow: WorkflowRow; event: WorkflowEventRow }> {
    const runInTx = async (tx: SqlClient) => {
      // If idempotencyKey provided, check if event already recorded
      if (input.idempotencyKey) {
        const existingEvent = await tx.$queryRaw<WorkflowEventRow[]>(Prisma.sql`
          SELECT id, "workflowId", "caseId", "subjectOwnerId", "actorId",
                 action, "fromQueue", "toQueue", "fromStatus", "toStatus",
                 notes, metadata, "createdAt"
          FROM "TriageCaseWorkflowEvent"
          WHERE id = ${input.idempotencyKey}
        `);
        if (existingEvent[0]) {
          const currentWf = await this.getOrCreateWorkflow(tx, input.caseId, input.subjectOwnerId, false);
          return { workflow: currentWf, event: existingEvent[0] };
        }
      }

      // Lock workflow row for update
      const current = await this.getOrCreateWorkflow(tx, input.caseId, input.subjectOwnerId, true);

      if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
        throw new WorkflowConcurrencyConflict(
          `Workflow version conflict: expected ${input.expectedVersion}, current is ${current.version}`,
        );
      }

      const eventId = input.idempotencyKey ?? randomUUID();
      const now = new Date();
      const nextVersion = current.version + 1;
      const isResolved = input.toQueue === "resolved" || input.toStatus === "resolved";
      const resolvedAt = isResolved ? now : null;

      const customerInstructionsJson = input.customerInstructions !== undefined
        ? JSON.stringify(input.customerInstructions)
        : current.customerInstructions !== null
          ? JSON.stringify(current.customerInstructions)
          : null;

      const repairNote = input.repairNote !== undefined ? input.repairNote : current.repairNote;
      const escalationReason = input.escalationReason !== undefined ? input.escalationReason : current.escalationReason;
      const findings = input.findings !== undefined ? input.findings : current.findings;
      const resolutionReason = input.resolutionReason !== undefined ? input.resolutionReason : current.resolutionReason;
      const assignedEngineerId = input.assignedEngineerId !== undefined ? input.assignedEngineerId : current.assignedEngineerId;
      const activeInvestigationId = input.activeInvestigationId !== undefined ? input.activeInvestigationId : current.activeInvestigationId;
      const activeProposalId = input.activeProposalId !== undefined ? input.activeProposalId : current.activeProposalId;
      const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

      // 1. Insert workflow event
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "TriageCaseWorkflowEvent" (
          id, "workflowId", "caseId", "subjectOwnerId", "actorId",
          action, "fromQueue", "toQueue", "fromStatus", "toStatus",
          notes, metadata, "createdAt"
        ) VALUES (
          ${eventId}, ${current.id}, ${input.caseId}, ${input.subjectOwnerId}, ${input.actorId},
          ${input.action}, ${current.queue}, ${input.toQueue}, ${current.status}, ${input.toStatus},
          ${input.notes ?? null}, ${metadataJson}::jsonb, ${now}
        )
      `);

      // 2. Update workflow record
      await tx.$executeRaw(Prisma.sql`
        UPDATE "TriageCaseWorkflow"
        SET queue = ${input.toQueue},
            status = ${input.toStatus},
            version = ${nextVersion},
            "customerInstructions" = ${customerInstructionsJson}::jsonb,
            "repairNote" = ${repairNote},
            "escalationReason" = ${escalationReason},
            findings = ${findings},
            "resolutionReason" = ${resolutionReason},
            "assignedEngineerId" = ${assignedEngineerId},
            "activeInvestigationId" = ${activeInvestigationId},
            "activeProposalId" = ${activeProposalId},
            "resolvedAt" = ${resolvedAt},
            "updatedAt" = ${now}
        WHERE id = ${current.id} AND version = ${current.version}
      `);

      // 3. Log access audit if requested
      if (input.auditAction) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "TriageAccessAudit" (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
          VALUES (${randomUUID()}, ${input.actorId}, ${input.subjectOwnerId}, ${input.caseId}, ${input.auditAction}, 'allowed')
        `);
      }

      const updated = await this.getOrCreateWorkflow(tx, input.caseId, input.subjectOwnerId, false);
      const savedEvents = await tx.$queryRaw<WorkflowEventRow[]>(Prisma.sql`
        SELECT id, "workflowId", "caseId", "subjectOwnerId", "actorId",
               action, "fromQueue", "toQueue", "fromStatus", "toStatus",
               notes, metadata, "createdAt"
        FROM "TriageCaseWorkflowEvent"
        WHERE id = ${eventId}
      `);

      const savedEvent = savedEvents[0];
      if (!savedEvent) throw new WorkflowNotFound(`Workflow event ${eventId} was not persisted`);

      return { workflow: updated, event: savedEvent };
    };

    if (client) {
      return runInTx(client);
    }
    return this.db.$transaction(runInTx);
  }
}
