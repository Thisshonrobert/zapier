import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import type { ProposalRow, SqlClient } from "./investigation-authority.ts";
import { revalidateProposalPolicy } from "./replay-policy-facts.ts";

const requestSchema = z.object({ requestId: z.uuid(), approvalId: z.uuid(), caseId: z.uuid(),
  subjectOwnerId: z.number().int().positive(), actorId: z.number().int().positive(),
  proposalVersion: z.number().int().positive() }).strict();
export type ReplayInput = z.infer<typeof requestSchema>;
type Database = SqlClient & {
  $transaction<T>(fn: (tx: SqlClient) => Promise<T>, options?: { isolationLevel: "Serializable" }): Promise<T>;
};
type Approval = { id: string; proposalId: string; caseId: string; subjectOwnerId: number;
  approvedBy: number; decision: string; proposalVersion: number; expiresAt: Date };
type Binding = { zapRunId: string; stage: number; executionId: string };
type Request = { id: string; approvalId: string; caseId: string; subjectOwnerId: number;
  requestedBy: number; proposalVersion: number };
export class ReplayDenied extends Error {}

// Phase 9A has no dispatcher or provider dependency. RESERVED is never executable here.
export class ReplayService {
  constructor(private readonly db: Database) {}

  private async transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.db.$transaction(fn, { isolationLevel: "Serializable" }); }
      catch (error) {
        const failure = error as { code?: string; meta?: { code?: string } };
        const conflict = failure.code === "P2034" || (failure.code === "P2010" &&
          ["40001", "40P01"].includes(failure.meta?.code ?? ""));
        if (attempt >= 2 || !conflict) throw error;
      }
    }
  }

  private async validate(tx: SqlClient, input: ReplayInput) {
    const [operator] = await tx.$queryRaw<{ isSupportOperator: boolean }[]>(Prisma.sql`
      SELECT "isSupportOperator" FROM "User" WHERE id = ${input.actorId} FOR SHARE`);
    if (!operator?.isSupportOperator) throw new ReplayDenied("operator permission revoked");
    const [approval] = await tx.$queryRaw<Approval[]>(Prisma.sql`
      SELECT * FROM "TriageApproval" WHERE id = ${input.approvalId} FOR UPDATE`);
    if (!approval || approval.caseId !== input.caseId || approval.subjectOwnerId !== input.subjectOwnerId)
      throw new ReplayDenied("approval binding mismatch");
    const [approver] = await tx.$queryRaw<{ isSupportOperator: boolean }[]>(Prisma.sql`
      SELECT "isSupportOperator" FROM "User" WHERE id = ${approval.approvedBy} FOR SHARE`);
    if (!approver?.isSupportOperator) throw new ReplayDenied("approver permission revoked");
    const [proposal] = await tx.$queryRaw<(ProposalRow & { evidenceHash: string })[]>(Prisma.sql`
      SELECT * FROM "TriageProposal" WHERE id = ${approval.proposalId} FOR SHARE`);
    if (!proposal || proposal.caseId !== input.caseId || proposal.subjectOwnerId !== input.subjectOwnerId)
      throw new ReplayDenied("proposal binding mismatch");
    const [latest] = await tx.$queryRaw<{ version: number }[]>(Prisma.sql`
      SELECT max(version)::int AS version FROM "TriageProposal" WHERE "investigationId" = ${proposal.investigationId}`);
    if (input.proposalVersion !== proposal.version || approval.proposalVersion !== proposal.version || latest?.version !== proposal.version)
      throw new ReplayDenied("stale proposal version");
    const [binding] = await tx.$queryRaw<Binding[]>(Prisma.sql`
      SELECT retry."zapRunId", retry.stage, retry."executionId"
      FROM "ZapRunRetry" retry JOIN "ZapRun" run ON run.id = retry."zapRunId"
      JOIN "Zap" zap ON zap.id = run."zapId"
      WHERE retry.id = ${input.caseId} AND zap."userId" = ${input.subjectOwnerId}
      FOR UPDATE OF retry FOR SHARE OF run, zap`);
    if (!binding?.executionId) throw new ReplayDenied("case binding mismatch");
    // Serializable predicate reads also fence inserted actions/successors and evidence changes.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Action" WHERE "zapId" =
      (SELECT "zapId" FROM "ZapRun" WHERE id = ${binding.zapRunId}) FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "ZapRunExecution" WHERE "zapRunId" = ${binding.zapRunId} FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "ZapRunExecutionAttempt" WHERE "executionId" = ${binding.executionId} FOR SHARE`);
    return { approval, proposal, binding };
  }

  async dryRun(value: ReplayInput) {
    const input = requestSchema.parse(value);
    return this.transaction(async tx => {
      const { approval, proposal } = await this.validate(tx, input);
      const policy = await revalidateProposalPolicy(tx, proposal);
      const now = new Date();
      if (approval.decision !== "approve" || proposal.status !== "requires_approval" || proposal.disposition !== "replay_candidate")
        policy.reasons.push("approval_required");
      if (approval.expiresAt <= now || proposal.expiresAt <= now) policy.reasons.push("approval_expired");
      if (policy.reasons.length) policy.status = "blocked";
      await tx.$executeRaw(Prisma.sql`INSERT INTO "TriageAccessAudit"
        (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
        VALUES (${randomUUID()}, ${input.actorId}, ${input.subjectOwnerId}, ${input.caseId}, 'replay_dry_run', 'allowed')`);
      return { ...policy, replayEnabled: false as const };
    });
  }

  async request(value: ReplayInput) {
    const input = requestSchema.parse(value);
    return this.transaction(async tx => {
      const { approval, proposal, binding } = await this.validate(tx, input);
      const [existing] = await tx.$queryRaw<Request[]>(Prisma.sql`
        SELECT * FROM "ReplayRequest" WHERE id = ${input.requestId} OR "approvalId" = ${input.approvalId} OR "caseId" = ${input.caseId}`);
      if (existing) {
        if (existing.id === input.requestId && existing.approvalId === input.approvalId &&
          existing.caseId === input.caseId && existing.subjectOwnerId === input.subjectOwnerId &&
          existing.requestedBy === input.actorId && existing.proposalVersion === input.proposalVersion)
          return { id: existing.id, replayEnabled: false as const };
        throw new ReplayDenied("approval consumed or replay_limit");
      }
      const now = new Date();
      if (approval.decision !== "approve" || proposal.status !== "requires_approval" || proposal.disposition !== "replay_candidate")
        throw new ReplayDenied("approval_required");
      if (approval.expiresAt <= now || proposal.expiresAt <= now) throw new ReplayDenied("approval_expired");
      const policy = await revalidateProposalPolicy(tx, proposal);
      if (policy.status !== "requires_approval" || !policy.notBefore || !policy.actionFingerprint ||
        !policy.requestFingerprint || !policy.handlerVersion) throw new ReplayDenied(policy.reasons.join(",") || "missing_evidence");
      const expiresAt = new Date(Math.min(approval.expiresAt.getTime(), proposal.expiresAt.getTime()));
      const [original] = await tx.$queryRaw<{ snapshot: unknown }[]>(Prisma.sql`
        SELECT to_jsonb(execution) AS snapshot FROM "ZapRunExecution" execution WHERE id = ${binding.executionId}`);
      const auditId = randomUUID();
      await tx.$executeRaw(Prisma.sql`INSERT INTO "TriageAccessAudit"
        (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
        VALUES (${auditId}, ${input.actorId}, ${input.subjectOwnerId}, ${input.caseId}, 'replay_request', 'allowed')`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO "ReplayRequest"
        (id, "approvalId", "proposalVersion", "caseId", "subjectOwnerId", "approvedBy", "requestedBy",
          "zapRunId", stage, "originalExecutionId", generation, "actionFingerprint", "requestFingerprint",
          "handlerVersion", "evidenceHash", "notBefore", "expiresAt", "auditId", "originalExecution")
        VALUES (${input.requestId}, ${approval.id}, ${proposal.version}, ${input.caseId}, ${input.subjectOwnerId},
          ${approval.approvedBy}, ${input.actorId}, ${binding.zapRunId}, ${binding.stage}, ${binding.executionId}, 1,
          ${policy.actionFingerprint}, ${policy.requestFingerprint}, ${policy.handlerVersion}, ${proposal.evidenceHash},
          ${new Date(policy.notBefore)}, ${expiresAt}, ${auditId}, ${JSON.stringify(original!.snapshot)}::jsonb)`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO "ReplayExecution" ("requestId") VALUES (${input.requestId})`);
      return { id: input.requestId, replayEnabled: false as const };
    });
  }
}
