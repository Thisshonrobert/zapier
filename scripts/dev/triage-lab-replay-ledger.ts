import pg from "pg";
import { assertLabMarker, labResources, type LabMarker } from "./triage-lab-config.ts";
import type { SqlClient } from "../../apps/primary_backend/services/investigation-authority.ts";
import type { ReplayRequestHistoryItem } from "../../packages/triage-contracts/replay.ts";

/**
 * Pure marker check: the durable ownership marker must match the environment it claims and
 * must own exactly the resource names derived from its own lab id.
 */
export function markerMatchesEnvironment(marker: unknown, env: Record<string, string | undefined>) {
  try {
    const resources = labResources(env.TRIAGE_LAB_ID ?? "");
    assertLabMarker(marker, { version: 1, database: "triage_lab", labId: env.TRIAGE_LAB_ID ?? "",
      resourceFingerprint: env.TRIAGE_LAB_RESOURCE_FINGERPRINT, ...resources });
  } catch {
    return false;
  }
  const parsed = marker as LabMarker;
  const resources = labResources(parsed.labId);
  return env.KAFKA_EVENTS_TOPIC === resources.eventsTopic && env.KAFKA_DLQ_TOPIC === resources.dlqTopic &&
    env.KAFKA_WORKER_GROUP === resources.workerGroup;
}

/**
 * Confirms the connection really is the marked lab database and that the durable ownership
 * marker still matches the environment. This is the verification the release gate accepts;
 * it runs no model, provider or policy decision of its own.
 */
export async function verifyLabIdentity(db: SqlClient, env: Record<string, string | undefined>) {
  const [row] = await db.$queryRaw<{ database: string; marker: unknown; migrations: number }[]>`
    SELECT current_database() AS database,
      (SELECT marker FROM triage_lab.ownership WHERE singleton = true) AS marker,
      (SELECT count(*)::int FROM triage_lab.migration) AS migrations`;
  if (!row || row.database !== "triage_lab") return false;
  // The tracked Prisma and agent migrations must already be journaled for this lab.
  if (!Number.isInteger(row.migrations) || row.migrations < 1) return false;
  return markerMatchesEnvironment(row.marker, env);
}

export type ReplayEvidence = {
  caseId: string; originalExecutionId: string; runId: string; stage: number; ownerId: number;
  requestId: string; approvalId: string;
  publication: "queued" | "published"; execution: ReplayRequestHistoryItem["execution"];
  outcome: ReplayRequestHistoryItem["outcome"]; providerOperations: number;
  originalAttempts: number; replayFailures: number;
};

/**
 * Reads the durable replay ledger for a case. Verified facts only: the immutable request
 * identity, publication and execution state, the recorded provider outcome and the count of
 * simulated provider operations attributed to the replay attempt. The recorded outcome comes
 * from the replay attempt itself — a `ReplayFailure` row only exists for a rejected or
 * unknown attempt, so acceptance is read from the attempt's own status. The original
 * execution row and its attempt are never a source for any of these.
 */
export async function readReplayEvidence(client: pg.PoolClient, caseId: string): Promise<ReplayEvidence | null> {
  const rows = await client.query(`SELECT request.id AS "requestId", request."approvalId",
      request."originalExecutionId", request."zapRunId" AS "runId", request.stage, request."subjectOwnerId" AS "ownerId",
      execution."publishedAt", execution.status AS "executionStatus", attempt.status AS "attemptStatus",
      failure."providerOutcome" AS "failureOutcome",
      (SELECT count(*)::int FROM triage_lab.provider_operation operation
        WHERE operation.run_id = request."zapRunId" AND operation.stage = request.stage AND operation.replay) AS "providerOperations",
      (SELECT count(*)::int FROM "ZapRunExecutionAttempt" attempt WHERE attempt."executionId" = request."originalExecutionId") AS "originalAttempts",
      (SELECT count(*)::int FROM "ReplayFailure" replayFailure WHERE replayFailure."requestId" = request.id) AS "replayFailures"
    FROM "ReplayRequest" request
    LEFT JOIN "ReplayExecution" execution ON execution."requestId" = request.id
    LEFT JOIN "ReplayExecutionAttempt" attempt ON attempt."requestId" = request.id AND attempt."attemptNumber" = 1
    LEFT JOIN "ReplayFailure" failure ON failure."requestId" = request.id
    WHERE request."caseId" = $1`, [caseId]);
  const row = rows.rows[0];
  if (!row) return null;
  const execution = ["RESERVED", "RUNNING", "SUCCESS", "FAILED", "UNKNOWN"].includes(row.executionStatus)
    ? row.executionStatus as ReplayEvidence["execution"] : "PENDING";
  const declared = row.failureOutcome ?? (row.attemptStatus === "ACCEPTED" ? "accepted"
    : row.attemptStatus === "REJECTED" ? "rejected" : row.attemptStatus === "UNKNOWN" ? "unknown"
    : row.attemptStatus === "NOT_ATTEMPTED" ? "not_attempted" : null);
  const outcome = ["accepted", "rejected", "unknown", "not_attempted"].includes(declared)
    ? declared as ReplayEvidence["outcome"] : "pending";
  return { caseId, originalExecutionId: row.originalExecutionId, runId: row.runId, stage: row.stage,
    ownerId: row.ownerId, requestId: row.requestId, approvalId: row.approvalId,
    publication: row.publishedAt ? "published" : "queued", execution, outcome,
    providerOperations: row.providerOperations, originalAttempts: row.originalAttempts,
    replayFailures: row.replayFailures };
}

export function verifyReplayEvidence(evidence: ReplayEvidence, expected: { requestId: string; originalAttempts: number }) {
  const mismatch = (label: string): never => { throw new Error(`Lab replay evidence mismatch: ${label}`); };
  if (evidence.requestId !== expected.requestId) mismatch("request identity");
  if (evidence.publication !== "published") mismatch("publication not confirmed");
  if (evidence.execution !== "SUCCESS") mismatch(`execution ${evidence.execution}`);
  if (evidence.outcome !== "accepted") mismatch(`provider outcome ${evidence.outcome}`);
  if (evidence.providerOperations !== 1) mismatch(`provider operations ${evidence.providerOperations}`);
  if (evidence.replayFailures !== 0) mismatch("unexpected replay failure ledger");
  if (evidence.originalAttempts !== expected.originalAttempts) mismatch("original history changed");
  return evidence;
}
