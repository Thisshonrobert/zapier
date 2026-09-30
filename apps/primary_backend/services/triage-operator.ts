import { randomUUID } from "node:crypto";

import { Prisma } from "../../../packages/db/generated/prisma/client.ts";

type OperatorDb = {
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
  $executeRaw(query: unknown): Promise<number>;
};

type CaseRow = {
  caseId: string;
  zapRunId: string;
  stage: number;
  subjectOwnerId: number;
  observedAt: Date;
  providerOutcome: string | null;
  safeCode: string | null;
  evidenceSource: string | null;
};

type AccessAction =
  | "list_cases"
  | "read_case"
  | "failure_context"
  | "execution_evidence"
  | "validate_action_inputs"
  | "diagnose";

export class TriageOperatorDenied extends Error {}
export class TriageOperatorCaseNotFound extends Error {}

const project = (row: CaseRow) => ({
  case_id: row.caseId,
  zap_run_id: row.zapRunId,
  stage: row.stage,
  subject_owner_id: row.subjectOwnerId,
  observed_at: row.observedAt.toISOString(),
  provider_outcome: row.providerOutcome,
  safe_code: row.safeCode,
  source: row.evidenceSource === "reconciled_execution" ? "reconciled_execution" : "retry_row",
});

export class TriageOperatorService {
  constructor(private readonly db: OperatorDb) {}

  private async audit(
    actorId: number,
    action: AccessAction,
    outcome: "allowed" | "denied",
    caseId?: string,
    subjectOwnerId?: number,
  ) {
    await this.db.$executeRaw(Prisma.sql`
      INSERT INTO "TriageAccessAudit" (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
      VALUES (${randomUUID()}, ${actorId}, ${subjectOwnerId ?? null}, ${caseId ?? null}, ${action}, ${outcome})
    `);
  }

  private async requirePermission(actorId: number, action: AccessAction, caseId?: string) {
    const rows = await this.db.$queryRaw<{ isSupportOperator: boolean }[]>(Prisma.sql`
      SELECT "isSupportOperator" FROM "User" WHERE id = ${actorId}
    `);
    if (rows[0]?.isSupportOperator) return;
    await this.audit(actorId, action, "denied", caseId);
    throw new TriageOperatorDenied("Support operator permission required");
  }

  private caseQuery(caseId: string | null, limit: number) {
    return Prisma.sql`
      SELECT retry.id AS "caseId", retry."zapRunId" AS "zapRunId", retry.stage,
        zap."userId" AS "subjectOwnerId", retry."createdAt" AS "observedAt",
        retry."providerOutcome" AS "providerOutcome", retry."safeCode" AS "safeCode",
        retry."evidenceSource" AS "evidenceSource"
      FROM "ZapRunRetry" retry
      INNER JOIN "ZapRun" run ON run.id = retry."zapRunId"
      INNER JOIN "Zap" zap ON zap.id = run."zapId"
      WHERE (${caseId}::text IS NULL OR retry.id = ${caseId}::text)
      ORDER BY retry."createdAt" DESC, retry.id DESC
      LIMIT ${limit}
    `;
  }

  async listCases(actorId: number, limit = 50) {
    await this.requirePermission(actorId, "list_cases");
    const rows = await this.db.$queryRaw<CaseRow[]>(
      this.caseQuery(null, Math.min(Math.max(Number.isInteger(limit) ? limit : 50, 1), 50)),
    );
    if (rows.length === 0) {
      await this.audit(actorId, "list_cases", "allowed");
    } else {
      await this.db.$executeRaw(Prisma.sql`
        INSERT INTO "TriageAccessAudit" (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
        VALUES ${Prisma.join(rows.map((row) => Prisma.sql`(${randomUUID()}, ${actorId}, ${row.subjectOwnerId}, ${row.caseId}, 'list_cases', 'allowed')`))}
      `);
    }
    return rows.map(project);
  }

  async resolveCase(actorId: number, caseId: string, action: AccessAction = "read_case") {
    await this.requirePermission(actorId, action, caseId);
    const rows = await this.db.$queryRaw<CaseRow[]>(this.caseQuery(caseId, 2));
    const row = rows[0];
    if (!row || row.caseId !== caseId || rows.length !== 1) {
      await this.audit(actorId, action, "denied", caseId);
      throw new TriageOperatorCaseNotFound(caseId);
    }
    await this.audit(actorId, action, "allowed", caseId, row.subjectOwnerId);
    return project(row);
  }
}
