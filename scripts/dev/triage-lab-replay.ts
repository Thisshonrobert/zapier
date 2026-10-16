import { randomUUID } from "node:crypto";
import pg from "pg";
import type { LabMarker } from "./triage-lab-config.ts";
import { createReplayDispatcher } from "../../apps/primary_backend/services/replay-dispatcher.ts";
import { InvestigationAuthority } from "../../apps/primary_backend/services/investigation-authority.ts";
import { InvestigationProposals, evaluateSnapshotPolicy } from "../../apps/primary_backend/services/investigation-proposals.ts";
import { revalidateProposalPolicy } from "../../apps/primary_backend/services/replay-policy-facts.ts";
import { ReplayService } from "../../apps/primary_backend/services/replay.ts";
import { readReplayHistory } from "../../apps/primary_backend/services/replay-history.ts";
import { assertLabReplayRuntime } from "./triage-lab-replay-environment.ts";
import { readReplayEvidence, verifyLabIdentity, verifyReplayEvidence, type ReplayEvidence }
  from "./triage-lab-replay-ledger.ts";
import type { SqlClient } from "../../apps/primary_backend/services/investigation-authority.ts";

export { assertLabReplayRuntime } from "./triage-lab-replay-environment.ts";
export { readReplayEvidence, verifyReplayEvidence, type ReplayEvidence } from "./triage-lab-replay-ledger.ts";
type Sink = { send(message: { topic: string; messages: { key: string; value: string }[] }): Promise<unknown> };

// The lab app connects through whichever DATABASE_URL is loaded when the process starts.
// The replay runner receives its client explicitly so a caller cannot accidentally drive a
// different database than the one whose ownership marker it verified.
export type LabDatabase = SqlClient & {
  $transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>;
  $disconnect(): Promise<void>;
};

/** Opens a client bound to the verified lab database, not to whatever the shell exported. */
export async function openLabDatabase(url: string): Promise<LabDatabase> {
  // The datasource override binds this client even though the lab app modules read
  // DATABASE_URL at their own import time; nothing here depends on the ambient value.
  const { PrismaClient } = await import("../../packages/db/generated/prisma/client.ts");
  return new PrismaClient({ datasources: { db: { url } } }) as unknown as LabDatabase;
}

/**
 * The lab runs the production dispatcher against its marked Kafka topic. Dispatch only
 * happens when the verified replay profile is active, so the ordinary lab and every
 * production deployment keep the closed gate. The dispatcher publishes one replay event
 * per request identity; the worker then revalidates and records provider acceptance.
 */
export function startLabReplayDispatch(db: LabDatabase, sink: Sink, verify: () => boolean,
  env: Record<string, string | undefined> = process.env) {
  assertLabReplayRuntime(env, verify);
  const topic = env.KAFKA_EVENTS_TOPIC!;
  const dispatcher = createReplayDispatcher(db, {
    send: message => sink.send({ topic, messages: [message] }).then(() => undefined),
  });
  let stopped = false;
  const stop = () => { stopped = true; };
  const loop = (async () => {
    while (!stopped) {
      try { await dispatcher.dispatchOne(); }
      catch { /* the next iteration retries from the durable dispatch lease */ }
      await Bun.sleep(250);
    }
  })();
  return { stop, settled: loop };
}

/**
 * Verified start for the dispatch loop: the marked database is confirmed first, then the
 * release profile is asserted with that proof. A processor that cannot confirm the marker
 * refuses to dispatch rather than publishing a replay event optimistically.
 */
export async function startVerifiedLabReplayDispatch(db: LabDatabase, sink: Sink,
  env: Record<string, string | undefined> = process.env) {
  const verified = await verifyLabIdentity(db, env);
  if (!verified) throw new Error("Lab replay verification failed: ownership marker mismatch");
  return startLabReplayDispatch(db, sink, () => true, env);
}

const sleep = (ms: number) => Bun.sleep(ms);

/**
 * Drives the real interactive replay journey against the running lab: a captured eligible
 * Telegram 429 case, the application policy computing eligibility from the case's live
 * evidence, an operator approval, an explicit request, dispatcher publication and a worker
 * claim that records provider acceptance. It also asserts the denial cases that matter:
 * duplicate requests and dispatcher restarts create no second attempt, a second replay is
 * refused, and the request history survives across investigations.
 */
export async function runLabReplay(client: pg.PoolClient, db: LabDatabase, marker: LabMarker, input: {
  caseId?: string; runId?: string; timeout: number; databaseUrl: string;
}) {
  // The caller resolves the lab identity from the ownership manifest and has already
  // confirmed the running supervisor reports a verified replay profile. What remains is to
  // prove this connection really is that marked database before touching the ledger.
  const env = { ...process.env, DATABASE_URL: input.databaseUrl, TRIAGE_LAB: "true",
    TRIAGE_LAB_ID: marker.labId, TRIAGE_LAB_RESOURCE_FINGERPRINT: marker.resourceFingerprint,
    KAFKA_EVENTS_TOPIC: marker.eventsTopic, KAFKA_DLQ_TOPIC: marker.dlqTopic,
    KAFKA_WORKER_GROUP: marker.workerGroup, NODE_ENV: process.env.NODE_ENV ?? "development" };
  if (!await verifyLabIdentity(db, env))
    throw new Error("Lab replay verification failed: ownership marker or migration journal mismatch");
  const { TriageEvidenceService } = await import("../../apps/primary_backend/services/triage-evidence.ts");

  let caseId = input.caseId;
  if (!caseId) {
    if (!input.runId) throw new Error("Provide the captured run id, or a case id");
    const selected = await client.query(`SELECT retry.id, retry.stage FROM "ZapRunRetry" retry
      JOIN "ZapRunExecution" execution ON execution.id = retry."executionId"
      WHERE retry."zapRunId" = $1 AND retry."safeCode" = 'telegram_http_429'
        AND execution.status = 'FAILED' AND retry."providerOutcome" = 'rejected'
      ORDER BY retry.stage LIMIT 2`, [input.runId]);
    if (selected.rows.length !== 1) throw new Error("The selected run has no single captured eligible Telegram 429 case");
    caseId = selected.rows[0].id as string;
  }
  const [retry] = (await client.query(`SELECT retry.id, retry."zapRunId" AS "runId", retry.stage, retry."executionId",
      retry."actionFingerprint", retry."requestFingerprint", zap."userId" AS "ownerId"
    FROM "ZapRunRetry" retry JOIN "ZapRun" run ON run.id = retry."zapRunId"
    JOIN "Zap" zap ON zap.id = run."zapId" WHERE retry.id = $1`, [caseId])).rows;
  if (!retry) throw new Error("Unknown lab case");
  const [owner] = (await client.query(`SELECT id FROM "User" WHERE "isSupportOperator" = true ORDER BY id LIMIT 1`)).rows;
  if (!owner) throw new Error("Seed the lab support account before running replay");
  const actorId = Number(owner.id);

  const evidence = new TriageEvidenceService(db as never);
  const [failureContext, executionEvidence, inputValidation] = await Promise.all([
    evidence.getFailureContext(Number(retry.ownerId), caseId),
    evidence.getExecutionEvidence(Number(retry.ownerId), caseId, 50),
    evidence.validateActionInputs(Number(retry.ownerId), caseId),
  ]);
  const refs = [failureContext, executionEvidence, inputValidation].map(item => item.evidence_id);
  const investigationId = randomUUID();
  const proposals = new InvestigationProposals(db as never, evaluateSnapshotPolicy);
  // The lab runs no paid model, so the advisory diagnosis is the documented bounded F01
  // shape. Eligibility, approval, dispatch and execution below all run the real
  // application code path against the case's live evidence.
  const submitted = await proposals.submit({ investigationId, caseId,
    subjectOwnerId: Number(retry.ownerId), actorId,
    result: { contract_version: 1, graph_version: "phase-6-v1", prompt_version: "phase-6-v1",
      status: "completed",
      diagnosis: { taxonomy_id: "F01", summary: "Captured Telegram send-stage rate limit",
        confidence: "high", evidence_refs: refs, alternate_explanations: [], missing_evidence: [] },
      proposal: { disposition: "replay_candidate", kind: "wait_then_replay",
        summary: "Wait out the recorded cooldown, then revalidate and replay once",
        reasons: ["Captured explicit rejection"], evidence_refs: refs,
        runbook_citations: ["RB-F01-F02@1.1.0#replay-and-approval"], preconditions: [], not_before: null } },
    evidence: { failureContext, executionEvidence, inputValidation } });
  if (!submitted.policy) throw new Error("Lab replay proposal has no policy evaluation");
  // The durable status is the application's answer: `requires_approval` means the policy
  // resolved this candidacy on complete, unchanged, cooled-down facts.
  const policy = submitted.policy as { status: string; reasons?: string[]; notBefore?: string | null };
  console.log(`Lab replay proposal: ${submitted.id} (${policy.status})`);
  if (policy.status !== "requires_approval")
    throw new Error(`Lab case is not eligible: ${policy.status} ${(policy.reasons ?? []).join(",")}`);
  // Wait out the recorded cooldown so approval and request revalidate the same facts.
  const deadline = Date.now() + input.timeout;
  const notBefore = typeof policy.notBefore === "string" && Number.isFinite(Date.parse(policy.notBefore))
    ? Date.parse(policy.notBefore) : Date.now();
  while (Date.now() < notBefore) {
    if (Date.now() >= deadline) throw new Error("Lab replay cooldown timed out");
    await sleep(Math.min(1000, Math.max(1, notBefore - Date.now())));
  }

  const authority = new InvestigationAuthority(db as never, revalidateProposalPolicy);
  const approvalId = randomUUID();
  await authority.decide({ proposalId: submitted.id, proposalVersion: 1, investigationId, caseId,
    subjectOwnerId: Number(retry.ownerId), actorId, decisionId: approvalId, decision: "approve" });
  const replay = new ReplayService(db as never);
  const requestId = randomUUID(), requestInput = { requestId, approvalId, caseId,
    subjectOwnerId: Number(retry.ownerId), actorId, proposalVersion: 1 };
  const dryRun = await replay.dryRun(requestInput);
  if (dryRun.status !== "requires_approval")
    throw new Error(`Lab replay dry run refused: ${dryRun.reasons.join(",") || dryRun.status}`);
  const first = await replay.request(requestInput);
  if (first.id !== requestId) throw new Error("Lab replay request identity changed");
  console.log(`Lab replay request: ${requestId} (approved by ${approvalId})`);

  // Snapshot the original execution before the replay starts, from its own rows alone.
  const originalExecution = (await client.query(`SELECT execution.status, execution."providerOutcome",
      (SELECT count(*)::int FROM "ZapRunExecutionAttempt" attempt WHERE attempt."executionId" = $1) AS attempts
    FROM "ZapRunExecution" execution WHERE execution.id = $2`,
  [retry.executionId, retry.executionId])).rows[0];
  const originalAttempts = Number(originalExecution?.attempts ?? 0);

  const replayDeadline = Date.now() + input.timeout;
  let evidenceAfter: ReplayEvidence | null = null;
  while (Date.now() < replayDeadline) {
    const current = await readReplayEvidence(client, caseId);
    if (!current) throw new Error("Lab replay request disappeared");
    // The attempt outcome and the provider-operation journal commit in the same transaction
    // as the terminal execution state, so wait for both halves before judging the outcome.
    if (["FAILED", "UNKNOWN", "SUCCESS"].includes(current.execution) && current.outcome !== "pending" &&
      !(current.execution === "SUCCESS" && current.providerOperations === 0)) { evidenceAfter = current; break; }
    await sleep(250);
  }
  if (!evidenceAfter) throw new Error("Lab replay did not finish; inspect the worker and dispatch logs");
  verifyReplayEvidence(evidenceAfter, { requestId, originalAttempts });
  const unchanged = (await client.query(`SELECT execution.status, execution."providerOutcome",
      (SELECT count(*)::int FROM "ZapRunExecutionAttempt" attempt WHERE attempt."executionId" = $1) AS attempts
    FROM "ZapRunExecution" execution WHERE execution.id = $2`,
  [retry.executionId, retry.executionId])).rows[0];
  if (JSON.stringify(unchanged) !== JSON.stringify(originalExecution))
    throw new Error("Original failure history changed during replay");

  // Duplicate click: the same idempotency identity recovers the same durable intent.
  const duplicate = await replay.request(requestInput);
  if (duplicate.id !== requestId) throw new Error("Duplicate replay request created a new identity");
  // Restart/republish: an extra dispatch pass must not add a provider attempt.
  const dispatcher = createReplayDispatcher(db as never, { send: async () => {} }, { enabled: true });
  for (let pass = 0; pass < 3; pass++) await dispatcher.dispatchOne();
  const afterRestart = await readReplayEvidence(client, caseId);
  if (!afterRestart) throw new Error("Lab replay evidence disappeared");
  verifyReplayEvidence(afterRestart, { requestId, originalAttempts });

  // Second replay and the consumed approval are denied with concrete reasons.
  const second = await replay.request({ ...requestInput, requestId: randomUUID() })
    .then(() => null, (error: unknown) => error instanceof Error ? error.message : "denied");
  if (!second) throw new Error("A second replay was allowed");
  const history = await readReplayHistory(db as never, caseId);
  if (history.length !== 1 || history[0]!.requestId !== requestId)
    throw new Error("Cross-investigation replay history is missing the completed request");
  const requests = await client.query(`SELECT count(*)::int AS count FROM "ReplayRequest" WHERE "caseId" = $1`, [caseId]);

  // The recorded capture is still intact: the retry row keeps the explicit 429 rejection at
  // the same fingerprints, so a later request would face the same unchanged-input decision,
  // and any edit to the action or run metadata would invalidate it instead.
  const captured = (await client.query(`SELECT retry."safeCode", retry."providerStatus", retry."retryAfterSeconds",
      retry."evidenceSource", retry."actionFingerprint" = execution."actionFingerprint" AS "actionMatches",
      retry."requestFingerprint" = execution."requestFingerprint" AS "requestMatches"
    FROM "ZapRunRetry" retry JOIN "ZapRunExecution" execution ON execution.id = retry."executionId"
    WHERE retry.id = $1`, [caseId])).rows[0];
  if (captured?.safeCode !== "telegram_http_429" || captured.providerStatus !== 429 ||
    captured.evidenceSource !== "captured" || !captured.actionMatches || !captured.requestMatches)
    throw new Error("Lab case no longer carries its unchanged captured rejection");

  const report = { mode: "replay-simulated", simulatedProviders: true, caseId, investigationId,
    proposalId: submitted.id, approvalId, requestId,
    eligibility: { status: policy.status, reasons: policy.reasons ?? [], notBefore: policy.notBefore ?? null },
    publication: afterRestart.publication, execution: afterRestart.execution, providerOutcome: afterRestart.outcome,
    providerOperations: afterRestart.providerOperations, requests: requests.rows[0].count,
    historyInvestigations: history.map(item => item.investigationId), secondReplayDenied: second,
    originalExecution: { status: unchanged.status, providerOutcome: unchanged.providerOutcome, attempts: unchanged.attempts } };
  console.log(JSON.stringify(report, null, 2));
  return report;
}
