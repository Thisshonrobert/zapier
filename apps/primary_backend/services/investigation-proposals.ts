//Is this safe enough to present for approval?
import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { IntegratedDiagnosisResultSchema } from "../../ai_agent/src/contracts.ts";
import type { SqlClient } from "./investigation-authority.ts";
import { evaluateReplayPolicy, type ReplayPolicyFacts, type ReplayPolicyResult } from "./replay-policy.ts";
import { buildReplayPolicyFacts, loadCurrentPolicyState, parsePolicyEvidence } from "./replay-policy-facts.ts";

type Database = { $transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> };
type Submission = { investigationId: string; caseId: string; subjectOwnerId: number;
  actorId: number; result: unknown; evidence: unknown };
type PolicyRecord = { result: ReplayPolicyResult; facts: ReplayPolicyFacts;
  sourceHashes: { failure: string; execution: string; validation: string } };

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function evaluateSnapshotPolicy(tx: SqlClient, input: Submission): Promise<PolicyRecord> {
  const diagnosis = IntegratedDiagnosisResultSchema.parse(input.result);
  const saved = parsePolicyEvidence(input.evidence);
  const { current, config } = await loadCurrentPolicyState(tx, input.subjectOwnerId,
    input.caseId, process.env.WORKER_HANDLER_VERSION ?? null);
  const facts = buildReplayPolicyFacts({ disposition: diagnosis.proposal.disposition,
    kind: diagnosis.proposal.kind, taxonomyId: diagnosis.diagnosis.taxonomy_id,
    saved, current, config });
  return { result: evaluateReplayPolicy(facts), facts, sourceHashes: {
    failure: saved.failureContext.content_hash,
    execution: saved.executionEvidence.content_hash,
    validation: saved.inputValidation.content_hash,
  } };
}

export class InvestigationProposals {
  constructor(private readonly db: Database,
    private readonly evaluate: (tx: SqlClient, input: Submission) => Promise<PolicyRecord>) {}

  async submit(input: Submission, now = new Date()) {
    return this.db.$transaction(async (tx) => {
      const [operator] = await tx.$queryRaw<{ isSupportOperator: boolean }[]>(Prisma.sql`
        SELECT "isSupportOperator" FROM "User" WHERE id = ${input.actorId} FOR SHARE
      `);
      if (!operator?.isSupportOperator) throw new Error("Support operator permission required");
      const [binding] = await tx.$queryRaw<{ subjectOwnerId: number }[]>(Prisma.sql`
        SELECT zap."userId" AS "subjectOwnerId" FROM "ZapRunRetry" retry
        JOIN "ZapRun" run ON run.id = retry."zapRunId"
        JOIN "Zap" zap ON zap.id = run."zapId"
        WHERE retry.id = ${input.caseId} FOR SHARE OF retry, run, zap
      `);
      if (binding?.subjectOwnerId !== input.subjectOwnerId) throw new Error("Case binding changed");
      const evidenceHash = hash(input.evidence);
      const [existing] = await tx.$queryRaw<{ id: string; status: string; evidenceHash: string }[]>(Prisma.sql`
        SELECT id, status, "evidenceHash" FROM "TriageProposal"
        WHERE "investigationId" = ${input.investigationId} ORDER BY version DESC LIMIT 1 FOR UPDATE
      `);
      if (existing) {
        if (existing.evidenceHash !== evidenceHash) throw new Error("Investigation proposal conflict");
        return { id: existing.id, status: existing.status };
      }
      const policy = await this.evaluate(tx, input);
      const id = randomUUID();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
      const configurationHash = hash({ actionFingerprint: policy.facts.actionFingerprint,
        requestFingerprint: policy.facts.requestFingerprint,
        handlerVersion: policy.facts.handlerVersion });
      const proposal = (input.result as { proposal: unknown }).proposal;
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "TriageProposal" (id, "investigationId", "caseId", "subjectOwnerId",
          version, disposition, status, proposal, policy, "evidenceHash", "configurationHash", "expiresAt")
        VALUES (${id}, ${input.investigationId}, ${input.caseId}, ${input.subjectOwnerId},
          1, ${policy.facts.disposition}, ${policy.result.status}, ${JSON.stringify(proposal)}::jsonb,
          ${JSON.stringify({ ...policy, evaluated: policy.result })}::jsonb,
          ${evidenceHash}, ${configurationHash}, ${expiresAt})
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "TriageAccessAudit" (id, "actorId", "subjectOwnerId", "caseId", action, outcome)
        VALUES (${randomUUID()}, ${input.actorId}, ${input.subjectOwnerId}, ${input.caseId},
          'investigation_proposal', 'allowed')
      `);
      return { id, status: policy.result.status, policy: policy.result, expiresAt };
    });
  }
}
// investigation-proposals.ts takes the AI result and asks:

// What does the database say RIGHT NOW?

// It loads:

// saved evidence
// current evidence
// current execution state
// current fingerprints
// current handler version
// current configuration

// Then:

// buildReplayPolicyFacts()
//         ↓
// evaluateReplayPolicy()

// Example:

// AI says replay_candidate
//         ↓
// Policy:
//   Is failure actually Telegram 429?      YES
//   Attempts recorded?                     YES
//   Execution FAILED?                      YES
//   Active lease?                           NO
//   Inputs still valid?                     YES
//   Fingerprint unchanged?                  YES
//   Handler unchanged?                      YES
//   Cooldown finished?                      YES
//         ↓
// requires_approval 