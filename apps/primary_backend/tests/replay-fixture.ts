import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import { InvestigationAuthority } from "../services/investigation-authority.ts";
import { InvestigationProposals, evaluateSnapshotPolicy } from "../services/investigation-proposals.ts";
import { loadCurrentPolicyState, revalidateProposalPolicy } from "../services/replay-policy-facts.ts";
import { createFingerprints } from "../../worker/execution-store.ts";
import { type createPostgresFixture, setOperator } from "./postgres-fixture.ts";

export async function setupReplay(db: Awaited<ReturnType<typeof createPostgresFixture>>["db"], storedFacts: Record<string, unknown> = {}, completedAt = new Date(Date.now() - 120_000), extraStage = false,
  telegramMetadata: Record<string, string> = {}, stage = 0) {
  const owner = await db.user.create({ data: { name: "owner", email: `${randomUUID()}@example.invalid` } });
  const actor = await db.user.create({ data: { name: "operator", email: `${randomUUID()}@example.invalid` } });
  await setOperator(db, actor.id, true);
  await db.availableAction.upsert({ where: { id: "telegram" }, update: {}, create: { id: "telegram", name: "Telegram", imageUrl: "test" } });
  const zap = await db.zap.create({ data: { userId: owner.id } });
  const metadata = { channelUserName: "-100123", message: "No send", botToken: "0:test", ...telegramMetadata };
  const action = await db.action.create({ data: { zapId: zap.id, actionId: "telegram", metadata, sortingOrder: stage } });
  if (extraStage) await db.action.create({ data: { zapId: zap.id, actionId: "telegram", metadata, sortingOrder: stage + 1 } });
  const run = await db.zapRun.create({ data: { zapId: zap.id, metadata: {} } });
  for (let predecessor = 0; predecessor < stage; predecessor++) {
    await db.action.create({ data: { zapId: zap.id, actionId: "telegram", metadata, sortingOrder: predecessor } });
    await db.zapRunExecution.create({ data: { zapRunId: run.id, stage: predecessor, status: "SUCCESS", completedAt } });
  }
  const fingerprints = createFingerprints({ zapRunId: run.id, stage, actionId: action.id,
    actionTypeId: "telegram", actionMetadata: metadata, zapRunMetadata: {} });
  const execution = await db.zapRunExecution.create({ data: { zapRunId: run.id, stage, status: "FAILED",
    providerOutcome: "rejected", requiresHuman: true, completedAt, ...fingerprints } });
  await db.$executeRaw(Prisma.sql`UPDATE "ZapRunExecution" SET "handlerVersion" = 'test-worker-v1' WHERE id = ${execution.id}`);
  await db.zapRunExecutionAttempt.create({ data: { executionId: execution.id, attemptNumber: 1,
    status: "REJECTED", provider: "telegram", phase: "send", safeCode: "telegram_http_429", providerStatus: 429,
    retryAfterSeconds: 1, completedAt, ...fingerprints } });
  const retry = await db.zapRunRetry.create({ data: { zapRunId: run.id, stage, executionId: execution.id,
    attempt: 1, provider: "telegram", phase: "send", providerOutcome: "rejected", safeCode: "telegram_http_429",
    providerStatus: 429, retryAfterSeconds: 1, evidenceSource: "captured", ...fingerprints } });
  const { current } = await loadCurrentPolicyState(db, owner.id, retry.id, "test-worker-v1");
  const refs = Object.values(current).map(x => x.evidence_id);
  const result = { contract_version: 1, graph_version: "phase-6-v1", prompt_version: "phase-6-v1",
    status: "completed", diagnosis: { taxonomy_id: "F01", summary: "Captured rejection",
    confidence: "high", evidence_refs: refs, alternate_explanations: [], missing_evidence: [] },
    proposal: { disposition: "replay_candidate", kind: "wait_then_replay", summary: "Wait and revalidate",
      reasons: ["Explicit rejection"], evidence_refs: refs, runbook_citations: [], preconditions: [], not_before: null } };
  const investigationId = randomUUID();
  const submitted = await new InvestigationProposals(db, async (tx, value) => {
    const policy = await evaluateSnapshotPolicy(tx, value);
    return { ...policy, result: { ...policy.result, status: "requires_approval" }, facts: { ...policy.facts, ...storedFacts } };
  }).submit({ investigationId,
    caseId: retry.id, subjectOwnerId: owner.id, actorId: actor.id, result, evidence: current });
  assert.equal(submitted.status, "requires_approval");
  const approvalId = randomUUID();
  if (Object.keys(storedFacts).length || completedAt > new Date()) {
    // A synthetic corrupt/stale authority fixture: production replay must distrust saved eligibility.
    await db.$executeRaw(Prisma.sql`INSERT INTO "TriageApproval"
      (id, "proposalId", "caseId", "subjectOwnerId", "approvedBy", decision, "proposalVersion", "expiresAt")
      VALUES (${approvalId}, ${submitted.id}, ${retry.id}, ${owner.id}, ${actor.id}, 'approve', 1, ${new Date(Date.now() + 60_000)})`);
  } else {
    await new InvestigationAuthority(db, revalidateProposalPolicy).decide({ proposalId: submitted.id, investigationId,
      caseId: retry.id, subjectOwnerId: owner.id, actorId: actor.id, decisionId: approvalId, decision: "approve" });
  }
  return { input: { requestId: randomUUID(), approvalId, proposalVersion: 1, caseId: retry.id,
    subjectOwnerId: owner.id, actorId: actor.id }, execution, retry, action, run, zap };
}

