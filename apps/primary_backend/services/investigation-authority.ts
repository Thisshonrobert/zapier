//"Is this person authorized to make the decision?
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

const allowedDecisions = (proposal: ProposalRow): Decision[] => {
  if (proposal.disposition === "replay_candidate" && proposal.status === "requires_approval")
    return ["approve", "reject"];
  if (proposal.disposition === "owner_action_required") return ["mark_owner_action_required"];
  if (proposal.disposition === "engineering_escalation_required") return ["escalate_to_engineering"];
  if (proposal.disposition === "resolved_without_replay") return ["resolve_without_replay"];
  return [];
};

export class InvestigationDecisionDenied extends Error {}

export class InvestigationAuthority {
  constructor(private readonly db: TransactionDb,
    private readonly revalidate: (tx: SqlClient, proposal: ProposalRow) => Promise<{ status: string; reasons?: string[] }>) {}

  async snapshot(input: { investigationId: string; caseId: string; subjectOwnerId: number; actorId: number }, now = new Date()) {
    return this.db.$transaction(async (tx) => {
      const [binding] = await tx.$queryRaw<{ subjectOwnerId: number; isSupportOperator: boolean }[]>(Prisma.sql`
        SELECT zap."userId" AS "subjectOwnerId", actor."isSupportOperator"
        FROM "ZapRunRetry" retry JOIN "ZapRun" run ON run.id = retry."zapRunId"
        JOIN "Zap" zap ON zap.id = run."zapId" JOIN "User" actor ON actor.id = ${input.actorId}
        WHERE retry.id = ${input.caseId} FOR SHARE OF retry, run, zap, actor
      `);
      if (!binding?.isSupportOperator) throw new InvestigationDecisionDenied("operator permission revoked");
      if (binding.subjectOwnerId !== input.subjectOwnerId) throw new InvestigationDecisionDenied("case binding changed");
      const [proposal] = await tx.$queryRaw<ProposalRow[]>(Prisma.sql`
        SELECT id, "investigationId", "caseId", "subjectOwnerId", disposition, status, "expiresAt", version, policy
        FROM "TriageProposal" WHERE "investigationId" = ${input.investigationId}
          AND "caseId" = ${input.caseId} AND "subjectOwnerId" = ${input.subjectOwnerId}
        ORDER BY version DESC LIMIT 1
      `);
      if (!proposal) return null;
      const [decision] = await tx.$queryRaw<DecisionRow[]>(Prisma.sql`
        SELECT id, decision, "approvedBy" FROM "TriageApproval" WHERE "proposalId" = ${proposal.id}
      `);
      const [replay] = await tx.$queryRaw<{ id: string; status: string | null; publishedAt: Date | null; completedAt: Date | null }[]>(Prisma.sql`
        SELECT request.id, execution.status, execution."publishedAt", execution."completedAt"
        FROM "ReplayRequest" request LEFT JOIN "ReplayExecution" execution ON execution."requestId" = request.id
        WHERE request."approvalId" = ${decision?.id ?? ""} AND request."caseId" = ${input.caseId}
          AND request."subjectOwnerId" = ${input.subjectOwnerId} LIMIT 1
      `);
      const expired = proposal.expiresAt <= now;
      const policy = decision || expired ? null : await this.revalidate(tx, proposal);
      const reasons = expired ? ["proposal_expired"] : policy?.reasons ?? [];
      let choices = !decision && !expired ? allowedDecisions(proposal) : [];
      if (policy?.status !== "requires_approval") choices = choices.filter((choice) => choice !== "approve");
      return { id: proposal.id, version: proposal.version, status: proposal.status,
        expiresAt: proposal.expiresAt, reasons, allowedDecisions: choices, decision: decision ?? null,
        replay: replay ? { id: replay.id,
          publication: replay.publishedAt ? "published" : "queued",
          execution: ["SUCCESS", "FAILED", "UNKNOWN", "RUNNING"].includes(replay.status ?? "")
            ? replay.status : "PENDING",
          completedAt: replay.completedAt } : null,
        replayEnabled: false as const };
    });
  }

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
    proposalVersion?: number;
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

      if (input.proposalVersion !== undefined && input.proposalVersion !== proposal.version)
        throw new InvestigationDecisionDenied("stale proposal version");
      const [latest] = await tx.$queryRaw<{ version: number }[]>(Prisma.sql`
        SELECT version FROM "TriageProposal" WHERE "investigationId" = ${input.investigationId}
        ORDER BY version DESC LIMIT 1
      `);
      if (latest && latest.version !== proposal.version) throw new InvestigationDecisionDenied("stale proposal version");

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
      if (input.decision === "approve") {
        const policy = await this.revalidate(tx, proposal);
        if (policy.status !== "requires_approval")
          throw new InvestigationDecisionDenied(`current policy blocks approval: ${policy.reasons?.join(", ") || "unknown"}`);
      }
      if (!allowedDecisions(proposal).includes(input.decision))
        throw new InvestigationDecisionDenied("decision conflicts with proposal");

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
