import { randomUUID } from "node:crypto";
import { Prisma } from "../../packages/db/generated/prisma/client.ts";
import type { ProposalRow, SqlClient } from "../primary_backend/services/investigation-authority.ts";
import { revalidateProposalPolicy } from "../primary_backend/services/replay-policy-facts.ts";
import { liveReplayEnabled } from "../primary_backend/services/replay-dispatcher.ts";
import { normalizeFailure, type DurableFailureEvidence, type Fingerprints } from "./execution-store.ts";
import { parse } from "./parse.ts";
import type { MessageResolution, ZapEvent } from "./orchestration.ts";
import { ActionExecutionError, type ActionHandler, type ActionResult } from "./types.ts";

type Database = SqlClient & { $transaction<T>(fn: (tx: SqlClient) => Promise<T>,
  options?: { isolationLevel: "Serializable" }): Promise<T> };
type RequestRow = { id: string; approvalId: string; caseId: string; subjectOwnerId: number;
  approvedBy: number; requestedBy: number; zapRunId: string; stage: number; originalExecutionId: string;
  generation: number; proposalVersion: number; handlerVersion: string; actionFingerprint: string;
  requestFingerprint: string; evidenceHash: string; notBefore: Date; expiresAt: Date };
type SelectedAction = { id: string; typeId: string; metadata: Record<string, unknown>; zapRunMetadata: Record<string, unknown>;
  telegramInputs?: { botToken: string; destination: string; message: string } };
type Claimed = { kind: "CLAIMED"; request: RequestRow; claimToken: string; selected: SelectedAction; nextStage: number | null };
type Claim = Claimed | { kind: "SUCCESS"; nextStage: number | null } | { kind: "TERMINAL" | "BUSY" | "DISABLED" };
const unknown = (): DurableFailureEvidence => ({ provider: "telegram", phase: "send",
  providerOutcome: "unknown", safeCode: "outcome_unknown", requiresHuman: true });

export function createReplayStore(db: Database, options: { enabled?: boolean; handlerVersion?: string } = {}) {
  const enabled = () => options.enabled ?? liveReplayEnabled();
  async function transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await db.$transaction(fn, { isolationLevel: "Serializable" }); }
      catch (error) {
        const failure = error as { code?: string; meta?: { code?: string } };
        if (attempt >= 2 || !(failure.code === "P2034" || (failure.code === "P2010" &&
          ["40001", "40P01"].includes(failure.meta?.code ?? "")))) throw error;
      }
    }
  }

  async function record(tx: SqlClient, request: RequestRow, evidence: ActionResult | DurableFailureEvidence) {
    const accepted = "outcome" in evidence;
    const outcome = accepted ? "accepted" : evidence.providerOutcome;
    const safeReceiptId = evidence.safeReceiptId && evidence.safeReceiptId.length <= 128 ? evidence.safeReceiptId : null;
    const failure = accepted ? null : evidence;
    const at = new Date();
    const attempt = await tx.$executeRaw(Prisma.sql`UPDATE "ReplayExecutionAttempt" SET status = ${outcome.toUpperCase()},
      provider = ${evidence.provider}, phase = ${evidence.phase}, "safeCode" = ${failure?.safeCode ?? null},
      "providerStatus" = ${failure?.providerStatus ?? null}, "retryAfterSeconds" = ${failure?.retryAfterSeconds ?? null},
      "safeReceiptId" = ${safeReceiptId}, "completedAt" = ${at}
      WHERE "requestId" = ${request.id} AND "attemptNumber" = 1 AND status = 'STARTED'`);
    if (attempt !== 1) throw new Error("replay attempt persistence missing");
    if (!accepted) await tx.$executeRaw(Prisma.sql`INSERT INTO "ReplayFailure"
      (id, "requestId", "providerOutcome", provider, phase, "safeCode", "providerStatus", "retryAfterSeconds", "safeReceiptId", "actionFingerprint", "requestFingerprint")
      VALUES (${randomUUID()}, ${request.id}, ${outcome}, ${evidence.provider}, ${evidence.phase},
        ${failure!.safeCode}, ${failure!.providerStatus ?? null}, ${failure!.retryAfterSeconds ?? null},
        ${safeReceiptId}, ${request.actionFingerprint}, ${request.requestFingerprint})`);
    await tx.$executeRaw(Prisma.sql`UPDATE "ReplayExecution" SET status = ${accepted ? "SUCCESS" : outcome === "unknown" ? "UNKNOWN" : "FAILED"},
      "completedAt" = ${at}, "claimToken" = NULL, "leaseUntil" = NULL WHERE "requestId" = ${request.id}`);
  }

  async function deny(tx: SqlClient, request: RequestRow, safeCode: string) {
    await tx.$executeRaw(Prisma.sql`INSERT INTO "ReplayExecutionAttempt"
      (id, "requestId", "attemptNumber", status, provider, "actionFingerprint", "requestFingerprint")
      VALUES (${randomUUID()}, ${request.id}, 1, 'STARTED', 'telegram', ${request.actionFingerprint}, ${request.requestFingerprint})`);
    await record(tx, request, { provider: "telegram", phase: "send", providerOutcome: "not_attempted", safeCode, requiresHuman: true });
    return { kind: "TERMINAL" } as const;
  }

  async function claim(event: ZapEvent): Promise<Claim> {
    if (!enabled()) return { kind: "DISABLED" };
    return transaction(async tx => {
      const [request] = await tx.$queryRaw<RequestRow[]>(Prisma.sql`SELECT * FROM "ReplayRequest"
        WHERE id = ${event.replayRequestId ?? ""} AND "zapRunId" = ${event.zapRunId} AND stage = ${event.stage}`);
      if (!request) return { kind: "TERMINAL" };
      const [execution] = await tx.$queryRaw<{ status: string; leaseUntil: Date | null; nextStage: number | null }[]>(Prisma.sql`
        SELECT * FROM "ReplayExecution" WHERE "requestId" = ${request.id} FOR UPDATE`);
      if (!execution) return { kind: "TERMINAL" };
      if (execution.status === "SUCCESS") return { kind: "SUCCESS", nextStage: execution.nextStage };
      if (["FAILED", "UNKNOWN"].includes(execution.status)) return { kind: "TERMINAL" };
      if (execution.status === "RUNNING") {
        if (execution.leaseUntil && execution.leaseUntil > new Date()) return { kind: "BUSY" };
        await record(tx, request, unknown());
        return { kind: "TERMINAL" };
      }
      if (execution.status !== "RESERVED") return { kind: "TERMINAL" };
      // Hold the same mutable rows used by 9A policy until selected inputs and ownership commit.
      const operators = await tx.$queryRaw<{ id: number; isSupportOperator: boolean }[]>(Prisma.sql`
        SELECT id, "isSupportOperator" FROM "User" WHERE id IN (${request.approvedBy}, ${request.requestedBy}) FOR SHARE`);
      const [approval] = await tx.$queryRaw<{ proposalId: string; caseId: string; subjectOwnerId: number;
        approvedBy: number; decision: string; proposalVersion: number; expiresAt: Date }[]>(Prisma.sql`
        SELECT * FROM "TriageApproval" WHERE id = ${request.approvalId} FOR SHARE`);
      const [proposal] = await tx.$queryRaw<(ProposalRow & { evidenceHash: string })[]>(Prisma.sql`
        SELECT * FROM "TriageProposal" WHERE id = ${approval?.proposalId ?? ""} FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT retry.id FROM "ZapRunRetry" retry JOIN "ZapRun" run ON run.id = retry."zapRunId"
        JOIN "Zap" zap ON zap.id = run."zapId" WHERE retry.id = ${request.caseId} FOR SHARE OF retry, run, zap`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Action" WHERE "zapId" =
        (SELECT "zapId" FROM "ZapRun" WHERE id = ${request.zapRunId}) FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "ZapRunExecution" WHERE "zapRunId" = ${request.zapRunId} FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "ZapRunExecutionAttempt" WHERE "executionId" = ${request.originalExecutionId} FOR SHARE`);
      const [binding] = await tx.$queryRaw<{ executionId: string; subjectOwnerId: number; zapRunId: string; stage: number }[]>(Prisma.sql`
        SELECT retry."executionId", zap."userId" AS "subjectOwnerId", retry."zapRunId", retry.stage FROM "ZapRunRetry" retry
        JOIN "ZapRun" run ON run.id = retry."zapRunId" JOIN "Zap" zap ON zap.id = run."zapId" WHERE retry.id = ${request.caseId}`);
      const [latest] = await tx.$queryRaw<{ version: number }[]>(Prisma.sql`SELECT max(version)::int AS version
        FROM "TriageProposal" WHERE "investigationId" = ${proposal?.investigationId ?? ""}`);
      const at = new Date();
      const authorized = [request.approvedBy, request.requestedBy].every(id => operators.some(row => row.id === id && row.isSupportOperator));
      if (!authorized || !approval || !proposal || !binding || binding.subjectOwnerId !== request.subjectOwnerId ||
        binding.executionId !== request.originalExecutionId || binding.zapRunId !== event.zapRunId || binding.stage !== event.stage ||
        approval.caseId !== request.caseId || approval.subjectOwnerId !== request.subjectOwnerId || approval.approvedBy !== request.approvedBy ||
        approval.decision !== "approve" || approval.proposalVersion !== request.proposalVersion || approval.expiresAt <= at ||
        proposal.caseId !== request.caseId || proposal.subjectOwnerId !== request.subjectOwnerId || proposal.version !== request.proposalVersion ||
        latest?.version !== proposal.version || proposal.evidenceHash !== request.evidenceHash || proposal.expiresAt <= at ||
        proposal.status !== "requires_approval" || proposal.disposition !== "replay_candidate" || request.generation !== 1 ||
        request.expiresAt <= at || request.handlerVersion !== (options.handlerVersion ?? process.env.WORKER_HANDLER_VERSION)) {
        return deny(tx, request, "replay_authority_invalid");
      }
      if (request.notBefore > at) return { kind: "BUSY" };
      const policy = await revalidateProposalPolicy(tx, proposal, request.id);
      if (policy.status !== "requires_approval" || policy.actionFingerprint !== request.actionFingerprint ||
        policy.requestFingerprint !== request.requestFingerprint || policy.handlerVersion !== request.handlerVersion ||
        !policy.notBefore || new Date(policy.notBefore) > at) {
        return deny(tx, request, "replay_policy_changed");
      }
      const [selected] = await tx.$queryRaw<SelectedAction[]>(Prisma.sql`SELECT action.id,
        action."actionId" AS "typeId", action.metadata, run.metadata AS "zapRunMetadata" FROM "ZapRun" run
        JOIN "Action" action ON action."zapId" = run."zapId" AND action."sortingOrder" = ${request.stage}
        WHERE run.id = ${request.zapRunId}`);
      if (!selected || selected.typeId !== "telegram") throw new Error("validated replay action missing");
      // Resolve templates and the environment credential once; handlers receive only this selected snapshot.
      const metadata = structuredClone(selected.metadata);
      const telegramInputs = {
        destination: parse(metadata.channelUserName as string, selected.zapRunMetadata).trim(),
        message: parse(metadata.message as string, selected.zapRunMetadata).trim(),
        botToken: parse(metadata.botToken as string, selected.zapRunMetadata).trim(),
      };
      // Fingerprinted numeric destinations and explicit credentials prove identity. Usernames
      // can be reassigned and environment credentials can rotate without changing these hashes.
      if (!/^-?\d+$/.test(telegramInputs.destination) || !telegramInputs.botToken)
        return deny(tx, request, "replay_input_identity_unproven");
      const claimToken = randomUUID();
      const [sequence] = await tx.$queryRaw<{ lastStage: number }[]>(Prisma.sql`SELECT max("sortingOrder")::int AS "lastStage"
        FROM "Action" WHERE "zapId" = (SELECT "zapId" FROM "ZapRun" WHERE id = ${request.zapRunId})`);
      const nextStage = sequence!.lastStage > request.stage ? request.stage + 1 : null;
      await tx.$executeRaw(Prisma.sql`UPDATE "ReplayExecution" SET status = 'RUNNING', "claimToken" = ${claimToken},
        "leaseUntil" = ${new Date(at.getTime() + 120_000)}, "nextStage" = ${nextStage} WHERE "requestId" = ${request.id}`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO "ReplayExecutionAttempt"
        (id, "requestId", "attemptNumber", status, provider, "actionFingerprint", "requestFingerprint")
        VALUES (${randomUUID()}, ${request.id}, 1, 'STARTED', 'telegram', ${request.actionFingerprint}, ${request.requestFingerprint})`);
      return { kind: "CLAIMED", request, claimToken, nextStage, selected: { ...selected, metadata, telegramInputs,
        zapRunMetadata: structuredClone(selected.zapRunMetadata) } };
    });
  }

  async function complete(owner: Claimed, evidence: ActionResult | DurableFailureEvidence) {
    return transaction(async tx => {
      const [execution] = await tx.$queryRaw<{ status: string; claimToken: string | null; leaseUntil: Date | null }[]>(Prisma.sql`
        SELECT status, "claimToken", "leaseUntil" FROM "ReplayExecution" WHERE "requestId" = ${owner.request.id} FOR UPDATE`);
      if (execution?.status !== "RUNNING" || execution.claimToken !== owner.claimToken || !execution.leaseUntil || execution.leaseUntil <= new Date()) return false;
      await record(tx, owner.request, evidence);
      return true;
    });
  }

  // Ordinary duplicates can recover a lost next-stage publication without reopening FAILED.
  async function stageResolution(event: ZapEvent, fingerprints: Fingerprints): Promise<MessageResolution | null> {
    const [row] = await db.$queryRaw<{ status: string; nextStage: number | null }[]>(Prisma.sql`SELECT replay.status, replay."nextStage" FROM "ReplayExecution" replay
      JOIN "ReplayRequest" request ON request.id = replay."requestId"
      JOIN "ZapRunExecution" original ON original.id = request."originalExecutionId"
      WHERE request."zapRunId" = ${event.zapRunId} AND request.stage = ${event.stage}
        AND request."actionFingerprint" = ${fingerprints.actionFingerprint}
        AND request."requestFingerprint" = ${fingerprints.requestFingerprint} AND original.status = 'FAILED'`);
    if (row?.status === "SUCCESS") return { ack: true, advance: true, nextStage: row.nextStage };
    if (row?.status === "RUNNING") return { ack: false, advance: false };
    return null;
  }
  return { claim, complete, stageResolution };
}

export async function executeReplayStage(input: { event: ZapEvent; store: ReturnType<typeof createReplayStore>;
  getHandler: (type: string) => ActionHandler | undefined; timeoutMs?: number }): Promise<MessageResolution> {
  const claim = await input.store.claim(input.event);
  if (claim.kind === "SUCCESS") return { ack: true, advance: true, nextStage: claim.nextStage };
  if (claim.kind === "TERMINAL") return { ack: true, advance: false };
  if (claim.kind !== "CLAIMED") return { ack: false, advance: false };
  const controller = new AbortController();
  const timeoutMs = Math.min(30_000, Math.max(1, input.timeoutMs ?? 30_000));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let evidence: ActionResult | DurableFailureEvidence;
  try {
    const handler = input.getHandler(claim.selected.typeId);
    if (!handler || handler.type !== "telegram") throw new ActionExecutionError("unsupported replay handler", {
      provider: "telegram", phase: "send", outcome: "not_attempted", safeCode: "unsupported_action_type" });
    evidence = await Promise.race([handler.execute(claim.selected.metadata, {
      zapRunId: claim.request.zapRunId, stage: claim.request.stage,
      idempotencyKey: `zaprun_${claim.request.zapRunId}_stage_${claim.request.stage}`,
      zapRunMetadata: claim.selected.zapRunMetadata, signal: controller.signal,
      telegramInputs: claim.selected.telegramInputs,
    }), new Promise<never>((_, reject) => { timer = setTimeout(() => {
      controller.abort(); reject(new ActionExecutionError("provider deadline", {
        provider: "telegram", phase: "send", outcome: "unknown", safeCode: "provider_timeout" }));
    }, timeoutMs); })]);
    if (evidence.provider !== "telegram" || evidence.phase !== "send" || evidence.outcome !== "accepted") evidence = unknown();
  } catch (error) { evidence = normalizeFailure(error); }
  finally { if (timer) clearTimeout(timer); }
  const saved = await input.store.complete(claim, evidence);
  return saved && "outcome" in evidence
    ? { ack: true, advance: true, nextStage: claim.nextStage } : { ack: saved, advance: false };
}
