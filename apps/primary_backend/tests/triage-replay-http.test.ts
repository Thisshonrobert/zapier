import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET ??= "phase-16f-replay-http-secret";
process.env.REPLAY_INTENT_ENABLED = "true";

const { createTriageRouter } = await import("../route/triage.ts");
const { TriageOperatorDenied, TriageOperatorCaseNotFound } = await import("../services/triage-operator.ts");
const { buildReplayEligibility } = await import("../services/replay-eligibility.ts");
const { replayReasons, replayPolicyDenial } = await import("../../../packages/triage-contracts/replay.ts");

const caseId = "f0100000-0000-4000-8000-000000000001";
const approvalId = "22222222-2222-4222-8222-222222222222";
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

const token = (id: number) => jwt.sign({ id }, process.env.JWT_SECRET!);

type ReplayCalls = { dryRun: unknown[]; request: unknown[] };

function startTestServer(options: {
  isOperator?: boolean; capabilities?: unknown; replayCalls?: ReplayCalls;
} = {}) {
  const app = express();
  app.use(express.json());
  const isOperator = options.isOperator ?? true;
  const calls = options.replayCalls ?? { dryRun: [], request: [] };
  const fakeOperator: any = {
    resolveCase: async (actorId: number, cId: string) => {
      if (!isOperator) throw new TriageOperatorDenied("Support operator permission required");
      if (cId !== caseId) throw new TriageOperatorCaseNotFound(cId);
      return { case_id: caseId, subject_owner_id: 9, zap_run_id: "11111111-1111-4111-8111-111111111111", stage: 0 };
    },
  };
  const fakeReplay: any = {
    dryRun: async (value: unknown) => { calls.dryRun.push(value);
      return { status: "requires_approval", reasons: [], replayEnabled: false }; },
    request: async (value: unknown) => { calls.request.push(value);
      return { id: (value as { requestId: string }).requestId, replayEnabled: false }; },
  };
  app.use("/api/v1/triage", createTriageRouter({ evidence: {} as never, operator: fakeOperator,
    replay: fakeReplay, replayCapability: () => options.capabilities as never }));
  const server = createServer(app);
  servers.push(server);
  return new Promise<number>(resolve => server.listen(0, "127.0.0.1", () => {
    resolve((server.address() as { port: number }).port);
  }));
}

const capabilities = { investigation: false, replayIntent: true, replayExecution: true,
  releaseReady: true, labProfile: "triage-lab-v1", reasons: [] };

describe("Phase 16F replay capability and operator controls", () => {
  test("capability is server-reported and requires authentication", async () => {
    const port = await startTestServer({ capabilities });
    const read = await fetch(`http://127.0.0.1:${port}/api/v1/triage/replay/capabilities`,
      { headers: { authorization: `Bearer ${token(4)}` } });
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual({ capabilities });
    expect(read.headers.get("cache-control")).toBe("no-store");
    const anonymous = await fetch(`http://127.0.0.1:${port}/api/v1/triage/replay/capabilities`);
    expect(anonymous.status).toBe(401);
  });

  test("the capability projection reports denied execution with bounded reasons", async () => {
    const port = await startTestServer({ capabilities: { ...capabilities, replayExecution: false,
      releaseReady: false, labProfile: null, reasons: ["release_not_ready", "replay_switch_off"] } });
    const read = await fetch(`http://127.0.0.1:${port}/api/v1/triage/replay/capabilities`,
      { headers: { authorization: `Bearer ${token(4)}` } });
    expect((await read.json()).capabilities).toMatchObject({ replayExecution: false,
      reasons: ["release_not_ready", "replay_switch_off"] });
  });

  test("an operator dry run and an explicit request are separate calls with an idempotency key", async () => {
    const replayCalls: ReplayCalls = { dryRun: [], request: [] };
    const port = await startTestServer({ replayCalls });
    const base = `http://127.0.0.1:${port}/api/v1/triage/operator/cases/${caseId}/replay`;
    const body = JSON.stringify({ approvalId, proposalVersion: 1 });
    const dry = await fetch(`${base}/dry-run`, { method: "POST",
      headers: { authorization: `Bearer ${token(4)}`, "content-type": "application/json" }, body });
    expect(dry.status).toBe(200);
    const requestId = "33333333-3333-4333-8333-333333333333";
    const requested = await fetch(`${base}/requests`, { method: "POST",
      headers: { authorization: `Bearer ${token(4)}`, "content-type": "application/json", "idempotency-key": requestId }, body });
    expect(requested.status).toBe(201);
    expect(await requested.json()).toMatchObject({ id: requestId, replayEnabled: false });
    expect(replayCalls.dryRun).toHaveLength(1);
    expect(replayCalls.request).toHaveLength(1);
    expect((replayCalls.request[0] as { requestId: string }).requestId).toBe(requestId);
  });

  test("a non-operator and a missing idempotency key are refused before any replay work", async () => {
    const replayCalls: ReplayCalls = { dryRun: [], request: [] };
    const port = await startTestServer({ isOperator: false, replayCalls });
    const base = `http://127.0.0.1:${port}/api/v1/triage/operator/cases/${caseId}/replay`;
    const denied = await fetch(`${base}/dry-run`, { method: "POST",
      headers: { authorization: `Bearer ${token(4)}`, "content-type": "application/json" },
      body: JSON.stringify({ approvalId, proposalVersion: 1 }) });
    expect(denied.status).toBe(403);
    expect(replayCalls.dryRun).toHaveLength(0);
    const noKeyPort = await startTestServer({ replayCalls });
    const missingKey = await fetch(`http://127.0.0.1:${noKeyPort}/api/v1/triage/operator/cases/${caseId}/replay/requests`,
      { method: "POST", headers: { authorization: `Bearer ${token(4)}`, "content-type": "application/json" },
        body: JSON.stringify({ approvalId, proposalVersion: 1 }) });
    expect(missingKey.status).toBe(422);
    expect(replayCalls.request).toHaveLength(0);
  });
});

describe("Phase 16F eligibility projection", () => {
  test("an eligible policy result requires operator approval and is reported as grounded", () => {
    expect(buildReplayEligibility({ status: "requires_approval", reasons: [], notBefore: "2026-10-17T00:00:01.000Z",
      candidateGrounded: true })).toEqual({ status: "eligible", reasons: [], notBefore: "2026-10-17T00:00:01.000Z",
      requiresOperatorApproval: true, candidateGrounded: true });
  });

  test("a denied policy result keeps its concrete bounded reason", () => {
    const denied = buildReplayEligibility({ status: "blocked", reasons: ["changed_fingerprint", "replay_limit"],
      notBefore: null, candidateGrounded: false });
    expect(denied.status).toBe("blocked");
    expect(denied.reasons).toEqual(["changed_fingerprint", "replay_limit"]);
    expect(denied.requiresOperatorApproval).toBe(false);
    expect(denied.candidateGrounded).toBe(false);
  });

  test("an ungrounded candidate never becomes eligible and is never silently dropped", () => {
    const ungrounded = buildReplayEligibility({ status: "blocked", reasons: ["ungrounded_candidate"],
      notBefore: null, candidateGrounded: false });
    expect(ungrounded).toMatchObject({ status: "blocked", reasons: ["ungrounded_candidate"], candidateGrounded: false });
  });

  test("a missing or unreadable policy fails closed to an unknown status with a reason", () => {
    for (const policy of [null, undefined, "not-a-policy", { status: "unexpected" }]) {
      const result = buildReplayEligibility(policy);
      expect(result.status).toBe("unknown");
      expect(result.reasons).toEqual(["missing_evidence"]);
      expect(result.requiresOperatorApproval).toBe(false);
    }
  });

  test("uncapped or unrecognised policy reasons are bounded and fail closed", () => {
    const parsed = buildReplayEligibility({ status: "blocked",
      reasons: ["changed_fingerprint", "changed_fingerprint", "model_said_yes", ...Array.from({ length: 30 }, (_, index) => `r${index}`)],
      candidateGrounded: false });
    expect(parsed.reasons.length).toBeLessThanOrEqual(16);
    expect(parsed.reasons).toContain("changed_fingerprint");
    expect(parsed.reasons).not.toContain("model_said_yes");
    expect(replayReasons(["a".repeat(65), "replay_limit"])).toEqual(["missing_evidence", "replay_limit"]);
    expect(replayPolicyDenial([])).toEqual({ reasons: ["missing_evidence"] });
  });
});
