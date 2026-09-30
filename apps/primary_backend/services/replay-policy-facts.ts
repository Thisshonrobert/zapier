import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { z } from "zod";
import { createFingerprints } from "../../worker/execution-store.ts";
import {
  ActionInputValidationEvidenceSchema,
  ExecutionEvidenceSchema,
  FailureContextEvidenceSchema,
} from "../../ai_agent/src/contracts.ts";
import { TriageEvidenceService, type TriageEvidenceDb } from "./triage-evidence.ts";
import type { ReplayPolicyFacts } from "./replay-policy.ts";
import { evaluateReplayPolicy } from "./replay-policy.ts";
import type { ProposalRow, SqlClient } from "./investigation-authority.ts";

export type PolicyEvidence = {
  failureContext: ReturnType<typeof FailureContextEvidenceSchema.parse>;
  executionEvidence: ReturnType<typeof ExecutionEvidenceSchema.parse>;
  inputValidation: ReturnType<typeof ActionInputValidationEvidenceSchema.parse>;
};

export function parsePolicyEvidence(value: unknown): PolicyEvidence {
  if (!value || typeof value !== "object") throw new Error("Invalid investigation evidence");
  const record = value as Record<string, unknown>;
  return {
    failureContext: FailureContextEvidenceSchema.parse(record.failureContext),
    executionEvidence: ExecutionEvidenceSchema.parse(record.executionEvidence),
    inputValidation: ActionInputValidationEvidenceSchema.parse(record.inputValidation),
  };
}

type CurrentConfiguration = {
  actionFingerprint: string | null;
  requestFingerprint: string | null;
  handlerVersion: string | null;
  currentHandlerVersion: string | null;
  incompatibleSuccessor: boolean;
  activeReplay: boolean;
  previousReplayCount: number;
  providerEvidenceConsistent: boolean;
};

export function buildReplayPolicyFacts(input: {
  disposition: string;
  kind: string;
  taxonomyId: string;
  saved: PolicyEvidence;
  current: PolicyEvidence;
  config: CurrentConfiguration;
}): ReplayPolicyFacts {
  const { saved, current, config } = input;
  const source = saved.failureContext.source_ref;
  const sources = [saved.executionEvidence.source_ref, saved.inputValidation.source_ref,
    current.failureContext.source_ref, current.executionEvidence.source_ref,
    current.inputValidation.source_ref];
  const sameSource = sources.every((item) => item.case_id === source.case_id &&
    item.zap_run_id === source.zap_run_id && item.stage === source.stage);
  const sameEvidence = config.providerEvidenceConsistent && (Object.keys(saved) as (keyof PolicyEvidence)[]).every((key) =>
    saved[key].complete && current[key].complete &&
    saved[key].content_hash === current[key].content_hash);
  const failure = saved.failureContext.facts;
  const execution = current.executionEvidence.facts;
  const captured = saved.executionEvidence.facts;
  const validation = current.inputValidation.facts;
  return {
    disposition: input.disposition,
    kind: input.kind,
    taxonomyId: input.taxonomyId,
    source: failure.source_kind,
    provenance: captured.provenance,
    evidenceComplete: sameSource && sameEvidence,
    provider: failure.retry.provider ?? null,
    phase: failure.retry.phase ?? null,
    safeCode: failure.retry.safe_code ?? null,
    providerStatus: failure.retry.provider_status ?? null,
    providerOutcome: execution.current_execution?.provider_outcome === "unknown"
      ? "unknown" : failure.retry.provider_outcome ?? null,
    attempts: captured.attempts.map((attempt) => ({ outcome: attempt.provider_outcome,
      provider: attempt.provider, phase: attempt.phase, status: attempt.provider_status,
      retryAfterSeconds: attempt.retry_after_seconds, completedAt: attempt.completed_at })),
    historyTruncated: captured.history_truncated || execution.history_truncated,
    executionStatus: execution.current_execution?.status ?? null,
    leaseUntil: execution.current_execution?.lease_until ?? null,
    orderValid: execution.ordering.status === "valid" && captured.ordering.status === "valid",
    predecessorsSuccessful: execution.predecessors.every((item) => item.status === "SUCCESS"),
    incompatibleSuccessor: config.incompatibleSuccessor,
    activeReplay: config.activeReplay,
    previousReplayCount: config.previousReplayCount,
    inputValid: validation.validation_status === "valid" && validation.supported,
    actionFingerprint: captured.current_execution?.action_fingerprint ?? null,
    requestFingerprint: captured.current_execution?.request_fingerprint ?? null,
    currentActionFingerprint: config.actionFingerprint,
    currentRequestFingerprint: config.requestFingerprint,
    handlerVersion: config.handlerVersion,
    currentHandlerVersion: config.currentHandlerVersion,
  };
}

type ConfigurationRow = {
  zapRunId: string; stage: number; actionId: string; actionTypeId: string;
  actionMetadata: unknown; zapRunMetadata: unknown; handlerVersion: string | null;
  incompatibleSuccessor: boolean;
  providerEvidenceConsistent: boolean;
};

export async function loadCurrentPolicyState(
  db: TriageEvidenceDb,
  subjectOwnerId: number,
  caseId: string,
  currentHandlerVersion: string | null,
  excludeRequestId: string | null = null,
) {
  const evidence = new TriageEvidenceService(db);
  const [failureContext, executionEvidence, inputValidation, rows, history] = await Promise.all([
    evidence.getFailureContext(subjectOwnerId, caseId),
    evidence.getExecutionEvidence(subjectOwnerId, caseId, 50),
    evidence.validateActionInputs(subjectOwnerId, caseId),
    db.$queryRaw<ConfigurationRow[]>(Prisma.sql`
      SELECT retry."zapRunId" AS "zapRunId", retry.stage, action.id AS "actionId",
        action."actionId" AS "actionTypeId", action.metadata AS "actionMetadata",
        run.metadata AS "zapRunMetadata", execution."handlerVersion" AS "handlerVersion",
        (retry."executionId" = execution.id AND
          retry."providerOutcome" = execution."providerOutcome" AND
          retry."actionFingerprint" = execution."actionFingerprint" AND
          retry."requestFingerprint" = execution."requestFingerprint" AND
          NOT EXISTS (SELECT 1 FROM "ZapRunExecutionAttempt" attempt
            WHERE attempt."executionId" = execution.id AND
              (attempt."actionFingerprint" IS DISTINCT FROM execution."actionFingerprint" OR
               attempt."requestFingerprint" IS DISTINCT FROM execution."requestFingerprint" OR
               attempt."safeCode" IS DISTINCT FROM 'telegram_http_429')))
          IS TRUE AS "providerEvidenceConsistent",
        EXISTS(SELECT 1 FROM "ZapRunExecution" later
          WHERE later."zapRunId" = retry."zapRunId" AND later.stage > retry.stage)
          AS "incompatibleSuccessor"
      FROM "ZapRunRetry" retry
      JOIN "ZapRun" run ON run.id = retry."zapRunId"
      JOIN "Zap" zap ON zap.id = run."zapId"
      JOIN "ZapRunExecution" execution ON execution."zapRunId" = run.id AND execution.stage = retry.stage
      JOIN "Action" action ON action."zapId" = zap.id AND action."sortingOrder" = retry.stage
      WHERE retry.id = ${caseId} AND zap."userId" = ${subjectOwnerId}
      LIMIT 2
    `),
    db.$queryRaw<{ activeReplay: boolean; previousReplayCount: number }[]>(Prisma.sql`
      SELECT count(*)::int AS "previousReplayCount",
        coalesce(bool_or(execution.status IN ('RESERVED', 'RUNNING')), false) AS "activeReplay"
      FROM "ReplayRequest" request LEFT JOIN "ReplayExecution" execution ON execution."requestId" = request.id
      WHERE request."caseId" = ${caseId} AND (${excludeRequestId}::text IS NULL OR request.id <> ${excludeRequestId})
    `),
  ]);
  let actionFingerprint: string | null = null;
  let requestFingerprint: string | null = null;
  if (rows.length === 1) {
    try {
      const row = rows[0]!;
      const computed = createFingerprints({ zapRunId: row.zapRunId, stage: row.stage,
        actionId: row.actionId, actionTypeId: row.actionTypeId,
        actionMetadata: row.actionMetadata as Record<string, unknown>,
        zapRunMetadata: row.zapRunMetadata as Record<string, unknown> });
      actionFingerprint = computed.actionFingerprint;
      requestFingerprint = computed.requestFingerprint;
    } catch { /* malformed current configuration blocks policy */ }
  }
  return {
    current: parsePolicyEvidence({ failureContext, executionEvidence, inputValidation }),
    config: { actionFingerprint, requestFingerprint,
      handlerVersion: rows.length === 1 ? rows[0]!.handlerVersion : null,
      currentHandlerVersion, incompatibleSuccessor: rows.length !== 1 || rows[0]!.incompatibleSuccessor,
      activeReplay: history[0]?.activeReplay ?? true,
      previousReplayCount: history[0]?.previousReplayCount ?? 1,
      providerEvidenceConsistent: rows.length === 1 && rows[0]!.providerEvidenceConsistent },
  };
}

export async function revalidateProposalPolicy(tx: SqlClient, proposal: ProposalRow, excludeRequestId: string | null = null) {
  const stored = z.object({
    facts: z.record(z.string(), z.unknown()),
    sourceHashes: z.object({ failure: z.string(), execution: z.string(), validation: z.string() }),
  }).parse(proposal.policy);
  const { current, config } = await loadCurrentPolicyState(tx, proposal.subjectOwnerId,
    proposal.caseId, process.env.WORKER_HANDLER_VERSION ?? null, excludeRequestId);
  const execution = current.executionEvidence.facts;
  const failure = current.failureContext.facts;
  const facts: ReplayPolicyFacts = {
    ...stored.facts as ReplayPolicyFacts,
    evidenceComplete: config.providerEvidenceConsistent && config.handlerVersion === stored.facts.handlerVersion &&
      current.failureContext.complete && current.executionEvidence.complete &&
      current.inputValidation.complete &&
      current.failureContext.source_ref.case_id === proposal.caseId &&
      current.executionEvidence.source_ref.case_id === proposal.caseId &&
      current.inputValidation.source_ref.case_id === proposal.caseId &&
      current.failureContext.content_hash === stored.sourceHashes.failure &&
      current.executionEvidence.content_hash === stored.sourceHashes.execution &&
      current.inputValidation.content_hash === stored.sourceHashes.validation,
    source: failure.source_kind,
    provenance: execution.provenance,
    provider: failure.retry.provider ?? null,
    phase: failure.retry.phase ?? null,
    safeCode: failure.retry.safe_code ?? null,
    providerStatus: failure.retry.provider_status ?? null,
    providerOutcome: execution.current_execution?.provider_outcome === "unknown"
      ? "unknown" : failure.retry.provider_outcome ?? null,
    attempts: execution.attempts.map((attempt) => ({ outcome: attempt.provider_outcome,
      provider: attempt.provider, phase: attempt.phase, status: attempt.provider_status,
      retryAfterSeconds: attempt.retry_after_seconds, completedAt: attempt.completed_at })),
    historyTruncated: execution.history_truncated,
    executionStatus: execution.current_execution?.status ?? null,
    leaseUntil: execution.current_execution?.lease_until ?? null,
    orderValid: execution.ordering.status === "valid",
    predecessorsSuccessful: execution.predecessors.every((item) => item.status === "SUCCESS"),
    incompatibleSuccessor: config.incompatibleSuccessor,
    activeReplay: config.activeReplay,
    previousReplayCount: config.previousReplayCount,
    inputValid: current.inputValidation.facts.validation_status === "valid" &&
      current.inputValidation.facts.supported,
    currentActionFingerprint: config.actionFingerprint,
    currentRequestFingerprint: config.requestFingerprint,
    currentHandlerVersion: config.currentHandlerVersion,
  };
  return evaluateReplayPolicy(facts);
}
