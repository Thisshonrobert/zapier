import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import {
  ReplayRequestHistoryItemSchema,
  type ReplayRequestHistoryItem,
} from "../../../packages/triage-contracts/replay.ts";
import type { SqlClient } from "./investigation-authority.ts";

type HistoryRow = {
  requestId: string; approvalId: string; proposalId: string; investigationId: string;
  proposalVersion: number; requestedBy: number; approvedBy: number;
  createdAt: Date; publishedAt: Date | null; executionStatus: string | null;
  completedAt: Date | null; providerOutcome: string | null;
};

export const REPLAY_HISTORY_LIMIT = 20;

function project(row: HistoryRow): ReplayRequestHistoryItem {
  const execution = ["RESERVED", "RUNNING", "SUCCESS", "FAILED", "UNKNOWN"].includes(row.executionStatus ?? "")
    ? row.executionStatus as ReplayRequestHistoryItem["execution"] : "PENDING";
  const outcome = row.providerOutcome === "accepted" || row.providerOutcome === "rejected" ||
    row.providerOutcome === "unknown" || row.providerOutcome === "not_attempted"
    ? row.providerOutcome : "pending";
  return ReplayRequestHistoryItemSchema.parse({
    requestId: row.requestId,
    approvalId: row.approvalId,
    proposalId: row.proposalId,
    investigationId: row.investigationId,
    proposalVersion: row.proposalVersion,
    publication: row.publishedAt ? "published" : "queued",
    execution,
    outcome,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  });
}

/**
 * Every replay request recorded for a case, across investigations, so a fresh
 * investigation cannot conceal a completed replay or let a second one look available.
 * The approval/proposal join identifies which proposal authorized each request, and only
 * bounded ledger metadata is projected — the stored original execution snapshot stays out.
 */
export async function readReplayHistory(db: SqlClient, caseId: string): Promise<ReplayRequestHistoryItem[]> {
  const rows = await db.$queryRaw<HistoryRow[]>(Prisma.sql`
    SELECT request.id AS "requestId", request."approvalId", approval."proposalId",
      proposal."investigationId", request."proposalVersion", request."requestedBy", request."approvedBy",
      request."createdAt", execution."publishedAt", execution.status AS "executionStatus",
      execution."completedAt", failure."providerOutcome"
    FROM "ReplayRequest" request
    JOIN "TriageApproval" approval ON approval.id = request."approvalId"
    JOIN "TriageProposal" proposal ON proposal.id = approval."proposalId"
    LEFT JOIN "ReplayExecution" execution ON execution."requestId" = request.id
    LEFT JOIN "ReplayFailure" failure ON failure."requestId" = request.id
    WHERE request."caseId" = ${caseId}
    ORDER BY request."createdAt" DESC, request.id DESC
    LIMIT ${REPLAY_HISTORY_LIMIT}`);
  return rows.map(project);
}
