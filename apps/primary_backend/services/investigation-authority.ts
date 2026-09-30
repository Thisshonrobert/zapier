import { Prisma } from "../../../packages/db/generated/prisma/client.ts";

export type SqlClient = {
  $queryRaw<T>(query: unknown): Promise<T>;
  $executeRaw(query: unknown): Promise<number>;
};
type TransactionDb = SqlClient & { $transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> };
export type ProposalRow = {
  id: string;
  investigationId: string;
  caseId: string;
  subjectOwnerId: number;
  disposition: string;
  status: string;
  expiresAt: Date;
  version: number;
  policy: unknown;
};
type DecisionRow = { id: string; decision: string; approvedBy: number };
type Decision = "approve" | "reject" | "mark_owner_action_required" |
  "escalate_to_engineering" | "resolve_without_replay";

export class InvestigationDecisionDenied extends Error {}

export class InvestigationAuthority {
  constructor(private readonly db: TransactionDb,
    private readonly revalidate: (tx: SqlClient, proposal: ProposalRow) => Promise<{ status: string }>) {}

  async getCommittedDecision(investigationId: string, caseId: string, subjectOwnerId: number) {
    const [row] = await this.db.$queryRaw<DecisionRow[]>(Prisma.sql`
      SELECT approval.id, approval.decision, approval."approvedBy" FROM "TriageApproval" approval
      JOIN "TriageProposal" proposal ON proposal.id = approval."proposalId"
      WHERE proposal."investigationId" = ${investigationId} AND proposal."caseId" = ${caseId}
        AND proposal."subjectOwnerId" = ${subjectOwnerId}
      ORDER BY approval."createdAt" DESC LIMIT 1
    `);
    return row ?? null;
  }

  async decide(input: {
    proposalId: string;
    investigationId: string;
    caseId: string;
    subjectOwnerId: number;
    actorId: number;
    decisionId: string;
    decision: Decision;
  }, now = new Date()) {
    return this.db.$transaction(async (tx) => {
      const [proposal] = await tx.$queryRaw<ProposalRow[]>(Prisma.sql`
        SELECT id, "investigationId", "caseId", "subjectOwnerId", disposition, status,
          "expiresAt", version, policy FROM "TriageProposal" WHERE id = ${input.proposalId} FOR UPDATE
      `);
      if (!proposal || proposal.investigationId !== input.investigationId ||
        proposal.caseId !== input.caseId || proposal.subjectOwnerId !== input.subjectOwnerId)
        throw new InvestigationDecisionDenied("proposal binding mismatch");

      const [operator] = await tx.$queryRaw<{ isSupportOperator: boolean }[]>(Prisma.sql`
        SELECT "isSupportOperator" FROM "User" WHERE id = ${input.actorId} FOR SHARE
      `);
      if (!operator?.isSupportOperator) throw new InvestigationDecisionDenied("operator permission revoked");
      const [binding] = await tx.$queryRaw<{ subjectOwnerId: number }[]>(Prisma.sql`
        SELECT zap."userId" AS "subjectOwnerId" FROM "ZapRunRetry" retry
        JOIN "ZapRun" run ON run.id = retry."zapRunId"
        JOIN "Zap" zap ON zap.id = run."zapId"
        WHERE retry.id = ${input.caseId} FOR SHARE OF retry, run, zap
      `);
      if (binding?.subjectOwnerId !== proposal.subjectOwnerId)
        throw new InvestigationDecisionDenied("case binding changed");

      const [existing] = await tx.$queryRaw<DecisionRow[]>(Prisma.sql`
        SELECT id, decision, "approvedBy" FROM "TriageApproval"
        WHERE "proposalId" = ${proposal.id} FOR UPDATE
      `);
      if (existing) {
        if (existing.id === input.decisionId && existing.decision === input.decision && existing.approvedBy === input.actorId)
          return existing;
        throw new InvestigationDecisionDenied("proposal already decided");
      }
      if (proposal.expiresAt <= now) throw new InvestigationDecisionDenied("proposal expired");
      if (input.decision === "approve" && (await this.revalidate(tx, proposal)).status !== "requires_approval")
        throw new InvestigationDecisionDenied("current policy blocks approval");
      const allowed = input.decision === "approve"
        ? proposal.status === "requires_approval" && proposal.disposition === "replay_candidate"
        : input.decision === "reject"
          ? proposal.status === "requires_approval" && proposal.disposition === "replay_candidate"
          : input.decision === "mark_owner_action_required"
            ? proposal.disposition === "owner_action_required"
            : input.decision === "escalate_to_engineering"
              ? proposal.disposition === "engineering_escalation_required"
              : proposal.disposition === "resolved_without_replay";
      if (!allowed) throw new InvestigationDecisionDenied("decision conflicts with proposal");

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "TriageApproval" (id, "proposalId", "caseId", "subjectOwnerId", "approvedBy",
          decision, "proposalVersion", "expiresAt")
        VALUES (${input.decisionId}, ${proposal.id}, ${proposal.caseId}, ${proposal.subjectOwnerId},
          ${input.actorId}, ${input.decision}, ${proposal.version}, ${proposal.expiresAt})
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "TriageAccessAudit" (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
        VALUES (${input.decisionId}, ${input.actorId}, ${proposal.subjectOwnerId}, ${proposal.caseId},
          'investigation_decision', 'allowed')
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "TriageDecisionNotification" ("decisionId", "investigationId", "caseId",
          "subjectOwnerId", decision)
        VALUES (${input.decisionId}, ${input.investigationId}, ${proposal.caseId},
          ${proposal.subjectOwnerId}, ${input.decision})
      `);
      return { id: input.decisionId, decision: input.decision, approvedBy: input.actorId };
    });
  }
}
