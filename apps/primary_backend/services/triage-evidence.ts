import { createHash } from "node:crypto";

import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { redactEvidence, summarizeStructure } from "./triage-redaction.ts";
import { validateActionInputs as validateWorkerActionInputs } from "../../worker/validation.ts";

type OwnedCaseRow = {
  caseId: string;
  zapRunId: string;
  stage: number;
  attempt: number;
  createdAt: Date;
  evidenceSource: string | null;
  provider: string | null;
  phase: string | null;
  providerOutcome: string | null;
  safeCode: string | null;
  providerStatus: number | null;
  retryAfterSeconds: number | null;
  requiresHuman: boolean;
  lastError: string | null;
  actionTypeId: string | null;
  actionMetadata: unknown;
  runMetadata: unknown;
};

type ExecutionAttemptRow = {
  executionId: string;
  executionStatus: string;
  leaseUntil: Date | null;
  completedAt: Date | null;
  executionProviderOutcome: string | null;
  requiresHuman: boolean;
  actionFingerprint: string | null;
  requestFingerprint: string | null;
  attemptNumber: number | null;
  attemptStatus: string | null;
  attemptProvider: string | null;
  attemptPhase: string | null;
  attemptSafeCode: string | null;
  attemptProviderStatus: number | null;
  attemptRetryAfterSeconds: number | null;
  attemptStartedAt: Date | null;
  attemptCompletedAt: Date | null;
};

type PredecessorRow = { stage: number; status: string; providerOutcome: string | null; completedAt: Date | null };
type ActionOrderRow = { sortingOrder: number };

export type TriageEvidenceDb = {
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
};

function sourceKind(value: string | null) {
  return value === "reconciled_execution" ? "reconciled_execution" as const : "retry_row" as const;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export class TriageCaseNotFound extends Error {}

export class TriageEvidenceService {
  constructor(private readonly db: TriageEvidenceDb) {}

  private async ownedRows(ownerId: number, caseId?: string, limit = 50) {
    return this.db.$queryRaw<OwnedCaseRow[]>(Prisma.sql`
      SELECT
        retry.id AS "caseId",
        retry."zapRunId" AS "zapRunId",
        retry.stage,
        retry.attempt,
        retry."createdAt" AS "createdAt",
        retry."evidenceSource" AS "evidenceSource",
        retry.provider,
        retry.phase,
        retry."providerOutcome" AS "providerOutcome",
        retry."safeCode" AS "safeCode",
        retry."providerStatus" AS "providerStatus",
        retry."retryAfterSeconds" AS "retryAfterSeconds",
        retry."requiresHuman" AS "requiresHuman",
        retry."lastError" AS "lastError",
        action_type.id AS "actionTypeId",
        action.metadata AS "actionMetadata",
        run.metadata AS "runMetadata"
      FROM "ZapRunRetry" retry
      INNER JOIN "ZapRun" run ON run.id = retry."zapRunId"
      INNER JOIN "Zap" zap ON zap.id = run."zapId"
      LEFT JOIN "Action" action
        ON action."zapId" = zap.id AND action."sortingOrder" = retry.stage
      LEFT JOIN "AvailableAction" action_type ON action_type.id = action."actionId"
      WHERE zap."userId" = ${ownerId}
        AND (${caseId ?? null}::text IS NULL OR retry.id = ${caseId ?? null}::text)
      ORDER BY retry."createdAt" DESC, retry.id DESC
      LIMIT ${limit}
    `);
  }

  async listCases(ownerId: number, limit = 50) {
    const boundedLimit = Math.min(Math.max(limit, 1), 50);
    const rows = await this.ownedRows(ownerId, undefined, boundedLimit);
    const seen = new Set<string>();
    return rows.flatMap((row) => {
      if (seen.has(row.caseId)) return [];
      seen.add(row.caseId);
      return [{
        case_id: row.caseId,
        source: sourceKind(row.evidenceSource),
        zap_run_id: row.zapRunId,
        stage: row.stage,
        observed_at: row.createdAt.toISOString(),
        provider_outcome: row.providerOutcome,
        safe_code: row.safeCode,
      }];
    });
  }

  async assertOwnedCase(ownerId: number, caseId: string) {
    const rows = await this.ownedRows(ownerId, caseId, 2);
    if (rows.length === 0) throw new TriageCaseNotFound(caseId);
  }

  async getFailureContext(ownerId: number, caseId: string) {
    const rows = await this.ownedRows(ownerId, caseId, 2);
    const row = rows[0];
    if (!row) throw new TriageCaseNotFound(caseId);
    const orderingAmbiguous = rows.length > 1;
    const facts = {
      source_kind: sourceKind(row.evidenceSource),
      current_action_type: orderingAmbiguous ? null : row.actionTypeId,
      retry: {
        provider: row.provider,
        phase: row.phase,
        provider_outcome: row.providerOutcome,
        safe_code: row.safeCode,
        provider_status: row.providerStatus,
        retry_after_seconds: row.retryAfterSeconds,
        requires_human: row.requiresHuman,
        final_error: row.lastError === null ? null : redactEvidence(row.lastError),
      },
      action_metadata: summarizeStructure(row.actionMetadata ?? {}),
      payload: summarizeStructure(row.runMetadata ?? {}),
    };
    const unavailable = ["historical_action_snapshot"];
    if (row.actionTypeId === null) unavailable.push("current_action");
    if (orderingAmbiguous) unavailable.push("unambiguous_stage_order");
    const result = {
      contract_version: 1 as const,
      evidence_id: `failure:${row.caseId}`,
      type: "failure_context" as const,
      source_ref: { case_id: row.caseId, zap_run_id: row.zapRunId, stage: row.stage },
      observed_at: new Date().toISOString(),
      content_hash: "",
      facts,
      unavailable,
      complete: unavailable.length === 1,
      simulated: false as const,
    };
    result.content_hash = hash({ ...result, observed_at: undefined, content_hash: undefined });
    return result;
  }

  async getExecutionEvidence(ownerId: number, caseId: string, historyLimit = 10) {
    const limit = Math.min(Math.max(Number.isInteger(historyLimit) ? historyLimit : 10, 1), 50);
    const [row] = await this.ownedRows(ownerId, caseId, 1);
    if (!row) throw new TriageCaseNotFound(caseId);
    const attemptRows = await this.db.$queryRaw<ExecutionAttemptRow[]>(Prisma.sql`
      SELECT
        execution.id AS "executionId",
        execution.status AS "executionStatus",
        execution."leaseUntil" AS "leaseUntil",
        execution."completedAt" AS "completedAt",
        execution."providerOutcome" AS "executionProviderOutcome",
        execution."requiresHuman" AS "requiresHuman",
        execution."actionFingerprint" AS "actionFingerprint",
        execution."requestFingerprint" AS "requestFingerprint",
        attempt."attemptNumber" AS "attemptNumber",
        attempt.status AS "attemptStatus",
        attempt.provider AS "attemptProvider",
        attempt.phase AS "attemptPhase",
        attempt."safeCode" AS "attemptSafeCode",
        attempt."providerStatus" AS "attemptProviderStatus",
        attempt."retryAfterSeconds" AS "attemptRetryAfterSeconds",
        attempt."startedAt" AS "attemptStartedAt",
        attempt."completedAt" AS "attemptCompletedAt"
      FROM "ZapRunRetry" retry
      INNER JOIN "ZapRun" run ON run.id = retry."zapRunId"
      INNER JOIN "Zap" zap ON zap.id = run."zapId"
      INNER JOIN "ZapRunExecution" execution
        ON execution."zapRunId" = retry."zapRunId" AND execution.stage = retry.stage
      LEFT JOIN "ZapRunExecutionAttempt" attempt ON attempt."executionId" = execution.id
      WHERE zap."userId" = ${ownerId} AND retry.id = ${caseId}::text
      ORDER BY attempt."attemptNumber" DESC NULLS LAST
      LIMIT ${limit + 1}
    `);
    const predecessors = await this.db.$queryRaw<PredecessorRow[]>(Prisma.sql`
      SELECT execution.stage, execution.status,
        execution."providerOutcome" AS "providerOutcome",
        execution."completedAt" AS "completedAt"
      FROM "ZapRunRetry" retry
      INNER JOIN "ZapRun" run ON run.id = retry."zapRunId"
      INNER JOIN "Zap" zap ON zap.id = run."zapId"
      INNER JOIN "ZapRunExecution" execution
        ON execution."zapRunId" = retry."zapRunId" AND execution.stage < retry.stage
      WHERE zap."userId" = ${ownerId} AND retry.id = ${caseId}::text
      ORDER BY execution.stage ASC
      LIMIT 100
    `);
    const actionOrders = await this.db.$queryRaw<ActionOrderRow[]>(Prisma.sql`
      SELECT action."sortingOrder" AS "sortingOrder"
      FROM "ZapRunRetry" retry
      INNER JOIN "ZapRun" run ON run.id = retry."zapRunId"
      INNER JOIN "Zap" zap ON zap.id = run."zapId"
      INNER JOIN "Action" action ON action."zapId" = zap.id
      WHERE zap."userId" = ${ownerId} AND retry.id = ${caseId}::text
      ORDER BY action."sortingOrder" ASC
      LIMIT 100
    `);

    const execution = attemptRows[0];
    const historyTruncated = attemptRows.length > limit;
    const provenance = row.evidenceSource === "reconciled_execution"
      ? "reconciled_execution" as const
      : row.evidenceSource === null
        ? "legacy" as const
        : "captured" as const;
    const outcome = (status: string | null) => {
      switch (status) {
        case "ACCEPTED": return "accepted";
        case "REJECTED": return "rejected";
        case "NOT_ATTEMPTED": return "not_attempted";
        default: return "unknown";
      }
    };
    const attempts = attemptRows
      .slice(0, limit)
      .filter((item) => item.attemptNumber !== null)
      .map((item) => ({
        attempt_number: item.attemptNumber!,
        status: item.attemptStatus!,
        provider: item.attemptProvider,
        phase: item.attemptPhase,
        provider_outcome: outcome(item.attemptStatus),
        safe_code: item.attemptSafeCode,
        provider_status: item.attemptProviderStatus,
        retry_after_seconds: item.attemptRetryAfterSeconds,
        started_at: item.attemptStartedAt?.toISOString() ?? null,
        completed_at: item.attemptCompletedAt?.toISOString() ?? null,
        provenance,
      }));
    const predecessorStages = new Set(predecessors.map((item) => item.stage));
    const missingPredecessors = Array.from({ length: row.stage }, (_, stage) => stage)
      .filter((stage) => !predecessorStages.has(stage));
    const relevantOrders = actionOrders.map((item) => item.sortingOrder).filter((stage) => stage <= row.stage);
    const uniqueOrders = new Set(relevantOrders);
    const orderingStatus = actionOrders.length === 0
      ? "unknown" as const
      : relevantOrders.length !== uniqueOrders.size ||
          Array.from({ length: row.stage + 1 }, (_, stage) => stage).some((stage) => !uniqueOrders.has(stage))
        ? "invalid" as const
        : "valid" as const;
    const facts = {
      provenance,
      current_execution: execution ? {
        execution_id: execution.executionId,
        status: execution.executionStatus,
        lease_until: execution.leaseUntil?.toISOString() ?? null,
        completed_at: execution.completedAt?.toISOString() ?? null,
        provider_outcome: execution.executionProviderOutcome,
        requires_human: execution.requiresHuman,
        action_fingerprint: execution.actionFingerprint,
        request_fingerprint: execution.requestFingerprint,
      } : null,
      attempts,
      history_limit: limit,
      history_truncated: historyTruncated,
      predecessors: predecessors.map((item) => ({
        stage: item.stage,
        status: item.status,
        provider_outcome: item.providerOutcome,
        completed_at: item.completedAt?.toISOString() ?? null,
      })),
      ordering: { status: orderingStatus, missing_predecessor_stages: missingPredecessors },
    };
    const unavailable: string[] = [];
    if (!execution) unavailable.push("execution");
    if (attempts.length === 0) unavailable.push("attempt_history");
    if (orderingStatus === "unknown") unavailable.push("action_order");
    if (provenance !== "captured") unavailable.push("captured_attempt_provenance");
    const result = {
      contract_version: 1 as const,
      evidence_id: `execution:${row.caseId}`,
      type: "execution_evidence" as const,
      source_ref: { case_id: row.caseId, zap_run_id: row.zapRunId, stage: row.stage },
      observed_at: new Date().toISOString(),
      content_hash: "",
      facts,
      unavailable,
      complete: unavailable.length === 0 && !historyTruncated && orderingStatus === "valid",
      simulated: false as const,
    };
    result.content_hash = hash({ ...result, observed_at: undefined, content_hash: undefined });
    return result;
  }

  async validateActionInputs(ownerId: number, caseId: string) {
    const rows = await this.ownedRows(ownerId, caseId, 2);
    const row = rows[0];
    if (!row) throw new TriageCaseNotFound(caseId);
    const orderingAmbiguous = rows.length > 1;
    const validation = orderingAmbiguous || row.actionTypeId === null
      ? {
          validation_status: "blocked" as const,
          supported: false,
          missing_required_fields: [],
          invalid_field_types: [],
          missing_template_paths: [],
          credential_presence: [],
          blocked_reasons: [orderingAmbiguous ? "ambiguous_stage_order" : "missing_action"],
          input_fingerprint: hash({ action: row.actionMetadata, run: row.runMetadata }),
        }
      : validateWorkerActionInputs({
          actionType: row.actionTypeId,
          actionMetadata: (row.actionMetadata ?? {}) as Record<string, unknown>,
          zapRunMetadata: (row.runMetadata ?? {}) as Record<string, unknown>,
        });
    const unavailable: string[] = [];
    if (!validation.supported) unavailable.push("supported_action_handler");
    if (orderingAmbiguous) unavailable.push("unambiguous_stage_order");
    const facts = { action_type: row.actionTypeId, ...validation };
    const result = {
      contract_version: 1 as const,
      evidence_id: `validation:${row.caseId}`,
      type: "action_input_validation" as const,
      source_ref: { case_id: row.caseId, zap_run_id: row.zapRunId, stage: row.stage },
      observed_at: new Date().toISOString(),
      content_hash: "",
      facts,
      unavailable,
      complete: validation.validation_status !== "blocked" && unavailable.length === 0,
      simulated: false as const,
    };
    result.content_hash = hash({ ...result, observed_at: undefined, content_hash: undefined });
    return result;
  }
}
