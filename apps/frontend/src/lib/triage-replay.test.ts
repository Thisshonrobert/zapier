import { describe, expect, test } from "bun:test";

import { readReplayCapabilities, submitReplayAction } from "./triage-client.ts";
import { ReplayCapabilitiesSchema, ReplayEligibilitySchema, ReplayRequestHistoryItemSchema,
  replayPolicyDenial, replayReasons } from "../../../../packages/triage-contracts/replay.ts";
import type { ReplayCapabilities, ReplayEligibility, ReplayRequestHistoryItem } from "../types/triage";

type Call = { url: string; init: RequestInit | undefined };

function recordingFetch(body: unknown, status = 200) {
  const calls: Call[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
  return { calls, fetchImpl };
}

const caseId = "f0100000-0000-4000-8000-000000000001";
const approvalId = "22222222-2222-4222-8222-222222222222";
const signal = new AbortController().signal;

const capabilities: ReplayCapabilities = { investigation: false, replayIntent: true, replayExecution: false,
  releaseReady: true, labProfile: null, reasons: ["lab_environment_mismatch"] };
const eligibility: ReplayEligibility = { status: "eligible", reasons: [], notBefore: "2026-10-17T00:00:01.000Z",
  requiresOperatorApproval: true, candidateGrounded: true };
const history: ReplayRequestHistoryItem = { requestId: "11111111-1111-4111-8111-111111111111", approvalId,
  proposalId: "33333333-3333-4333-8333-333333333333", investigationId: "44444444-4444-4444-8444-444444444444",
  proposalVersion: 1, publication: "published", execution: "SUCCESS", outcome: "accepted", requestedBy: 4,
  approvedBy: 5, createdAt: "2026-10-17T00:00:00.000Z", completedAt: "2026-10-17T00:00:01.000Z" };

describe("Phase 16F replay client", () => {
  test("reads server-reported capability with the bearer token", async () => {
    const { calls, fetchImpl } = recordingFetch({ capabilities });
    expect(await readReplayCapabilities({ baseUrl: "http://backend/api/v1/triage", token: "test-token",
      signal, fetchImpl })).toEqual(capabilities);
    expect(calls[0]?.url).toBe("http://backend/api/v1/triage/replay/capabilities");
    expect((calls[0]?.init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    expect(calls[0]?.init?.method).toBe("GET");
  });

  test("a dry run sends the approval and proposal version without an idempotency key", async () => {
    const { calls, fetchImpl } = recordingFetch({ status: "requires_approval", notBefore: eligibility.notBefore });
    const result = await submitReplayAction({ baseUrl: "http://backend/api/v1/triage/operator", token: "test-token",
      caseId, action: "dry-run", approvalId, proposalVersion: 1, signal, fetchImpl });
    expect(result.status).toBe("requires_approval");
    expect(calls[0]?.url).toBe(`http://backend/api/v1/triage/operator/cases/${caseId}/replay/dry-run`);
    expect(calls[0]?.init?.headers).not.toHaveProperty("idempotency-key");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ approvalId, proposalVersion: 1 });
  });

  test("a request carries its own idempotency key so a repeated submit is the same intent", async () => {
    const requestId = "33333333-3333-4333-8333-333333333333";
    const { calls, fetchImpl } = recordingFetch({ id: requestId, replayEnabled: false }, 201);
    const result = await submitReplayAction({ baseUrl: "http://backend/api/v1/triage/operator", token: "test-token",
      caseId, action: "requests", approvalId, proposalVersion: 1, idempotencyKey: requestId, signal, fetchImpl });
    expect(result.id).toBe(requestId);
    expect(calls[0]?.url).toBe(`http://backend/api/v1/triage/operator/cases/${caseId}/replay/requests`);
    expect((calls[0]?.init?.headers as Record<string, string>)["idempotency-key"]).toBe(requestId);
  });

  test("a request without an idempotency key is refused before any network call", async () => {
    const { calls, fetchImpl } = recordingFetch({ id: "unused" });
    await expect(submitReplayAction({ baseUrl: "http://backend/api/v1/triage/operator", token: "test-token",
      caseId, action: "requests", approvalId, proposalVersion: 1, signal, fetchImpl }))
      .rejects.toThrow("idempotency key");
    expect(calls).toHaveLength(0);
  });

  test("an HTTP denial surfaces as an error instead of a fabricated outcome", async () => {
    const { fetchImpl } = recordingFetch({ detail: "replay_limit", replayEnabled: false }, 409);
    await expect(submitReplayAction({ baseUrl: "http://backend/api/v1/triage/operator", token: "test-token",
      caseId, action: "requests", approvalId, proposalVersion: 1,
      idempotencyKey: "55555555-5555-4555-8555-555555555555", signal, fetchImpl }))
      .rejects.toThrow("replay_limit");
  });
});

describe("Phase 16F shared contract parity", () => {
  test("frontend replay types stay in parity with the shared bounded contracts", () => {
    expect(ReplayCapabilitiesSchema.parse(capabilities)).toEqual(capabilities);
    expect(ReplayEligibilitySchema.parse(eligibility)).toEqual(eligibility);
    expect(ReplayRequestHistoryItemSchema.parse(history)).toEqual(history);
  });

  test("the denials the operator sees are the shared bounded vocabulary", () => {
    expect(replayPolicyDenial(["changed_fingerprint", "replay_limit"])).toEqual({ reasons: ["changed_fingerprint", "replay_limit"] });
    expect(replayPolicyDenial([])).toEqual({ reasons: ["missing_evidence"] });
    expect(replayReasons(["unsupported_failure", "not_a_policy_code"])).toEqual(["unsupported_failure", "missing_evidence"]);
  });
});
