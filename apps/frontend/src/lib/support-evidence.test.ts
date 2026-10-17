import { describe, expect, test } from "bun:test";

import {
  SupportEvidenceError,
  readSupportEvidence,
  type EvidenceFetch,
} from "./support-evidence";

/**
 * The evidence client has one contract that matters: a payload it cannot trust becomes an
 * `unavailable` reason, never a partial fact, and a missing authorization is an error the
 * caller must not swallow into "no evidence".
 */

const caseId = "f0100000-0000-4000-8000-000000000001";

const failureContext = {
  contract_version: 1,
  evidence_id: "failure-context:1",
  type: "failure_context",
  source_ref: { case_id: caseId, zap_run_id: caseId, stage: 1 },
  observed_at: "2026-10-17T00:00:00.000Z",
  content_hash: "a".repeat(64),
  facts: {
    source_kind: "retry_row",
    current_action_type: "email",
    retry: {
      provider: "resend",
      phase: "send",
      provider_outcome: "not_attempted",
      safe_code: "invalid_action_inputs",
      provider_status: null,
      retry_after_seconds: null,
      requires_human: false,
      final_error: null,
    },
    action_metadata: { paths: [{ path: "to", type: "string" }], truncated: false },
    payload: { paths: [], truncated: false },
  },
  unavailable: [],
  complete: true,
  simulated: false,
};

const execution = {
  contract_version: 1,
  evidence_id: "execution:1",
  type: "execution_evidence",
  source_ref: { case_id: caseId, zap_run_id: caseId, stage: 1 },
  observed_at: "2026-10-17T00:00:00.000Z",
  content_hash: "b".repeat(64),
  facts: {
    provenance: "captured",
    current_execution: {
      execution_id: caseId,
      status: "FAILED",
      lease_until: null,
      completed_at: "2026-10-17T00:00:01.000Z",
      provider_outcome: "rejected",
      requires_human: true,
      action_fingerprint: "c".repeat(64),
      request_fingerprint: "d".repeat(64),
    },
    attempts: [
      {
        attempt_number: 1,
        status: "REJECTED",
        provider: "telegram",
        phase: "send",
        provider_outcome: "rejected",
        safe_code: "telegram_http_429",
        provider_status: 429,
        retry_after_seconds: 30,
        started_at: "2026-10-17T00:00:00.000Z",
        completed_at: "2026-10-17T00:00:01.000Z",
        provenance: "captured",
      },
    ],
    history_limit: 10,
    history_truncated: false,
    predecessors: [{ stage: 0, status: "SUCCESS", provider_outcome: "accepted", completed_at: null }],
    ordering: { status: "valid", missing_predecessor_stages: [] },
  },
  unavailable: [],
  complete: true,
  simulated: false,
};

const validation = {
  contract_version: 1,
  evidence_id: "validation:1",
  type: "action_input_validation",
  source_ref: { case_id: caseId, zap_run_id: caseId, stage: 1 },
  observed_at: "2026-10-17T00:00:00.000Z",
  content_hash: "e".repeat(64),
  facts: {
    action_type: "email",
    validation_status: "invalid",
    supported: true,
    missing_required_fields: ["subject"],
    invalid_field_types: [],
    missing_template_paths: [],
    credential_presence: [{ field: "from", present: false, source: "action_metadata" }],
    blocked_reasons: [],
    input_fingerprint: "f".repeat(64),
  },
  unavailable: [],
  complete: true,
  simulated: false,
};

const respond = (bodies: Record<string, unknown>, status = 200): EvidenceFetch => async (input) => {
  const url = String(input);
  const key = url.includes("failure-context")
    ? "failure"
    : url.includes("execution-evidence")
      ? "execution"
      : "validation";
  const body = bodies[key];
  return new Response(body === undefined ? "{}" : JSON.stringify(body), {
    status: body === undefined ? 404 : status,
    headers: { "content-type": "application/json" },
  });
};

/** The client reads the token from localStorage, so the test provides the browser surface it needs. */
const withToken = (token: string | null) => {
  (globalThis as { window?: unknown }).window = {
    localStorage: { getItem: () => token },
  };
};

describe("support evidence client", () => {
  test("normalises the three reads into bounded evidence", async () => {
    withToken("token");
    const evidence = await readSupportEvidence(caseId, new AbortController().signal, respond({
      failure: failureContext,
      execution,
      validation,
    }));
    expect(evidence.failureContext.data?.facts.current_action_type).toBe("email");
    expect(evidence.failureContext.data?.facts.retry.provider_outcome).toBe("not_attempted");
    expect(evidence.execution.data?.facts.attempts[0]?.provider_outcome).toBe("rejected");
    expect(evidence.execution.data?.facts.attempts[0]?.provider_status).toBe(429);
    expect(evidence.execution.data?.facts.ordering.status).toBe("valid");
    expect(evidence.validation.data?.facts.missing_required_fields).toEqual(["subject"]);
    expect(evidence.validation.data?.facts.credential_presence[0]?.present).toBe(false);
  });

  test("a malformed payload becomes a named unavailable reason, not a partial fact", async () => {
    withToken("token");
    const evidence = await readSupportEvidence(caseId, new AbortController().signal, respond({
      failure: { facts: "not an object" },
      execution: { unrelated: true },
      validation: null,
    }));
    expect(evidence.failureContext.data).toBeNull();
    expect(evidence.failureContext.unavailable).toEqual(["failure_context_unreadable"]);
    expect(evidence.execution.unavailable).toEqual(["execution_evidence_unreadable"]);
    expect(evidence.validation.unavailable).toEqual(["input_validation_unreadable"]);
  });

  test("a failed read reports the reason instead of throwing a blank panel", async () => {
    withToken("token");
    const evidence = await readSupportEvidence(caseId, new AbortController().signal, respond({ execution }));
    expect(evidence.failureContext.data).toBeNull();
    expect(evidence.failureContext.unavailable).toEqual(["failure_context_unavailable"]);
    expect(evidence.execution.data).not.toBeNull();
  });

  test("an unrecognised attempt outcome fails closed to unknown", async () => {
    withToken("token");
    const tampered = {
      ...execution,
      facts: {
        ...execution.facts,
        attempts: [{ ...execution.facts.attempts[0], provider_outcome: "probably_fine" }],
      },
    };
    const evidence = await readSupportEvidence(caseId, new AbortController().signal, respond({
      failure: failureContext,
      execution: tampered,
      validation,
    }));
    expect(evidence.execution.data?.facts.attempts[0]?.provider_outcome).toBe("unknown");
  });

  test("a missing token is an authorization error the caller must surface", async () => {
    withToken(null);
    await expect(readSupportEvidence(caseId, new AbortController().signal, respond({}))).rejects.toThrow(
      SupportEvidenceError,
    );
  });

  test("the engineering scope reads its own routes and never claims input validation", async () => {
    withToken("token");
    const seen: string[] = [];
    const fetchImpl: EvidenceFetch = async (input) => {
      seen.push(String(input));
      const url = String(input);
      return new Response(JSON.stringify(url.includes("failure-context") ? failureContext : execution), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const { EVIDENCE_SCOPES } = await import("./support-evidence");
    const evidence = await readSupportEvidence(
      caseId,
      new AbortController().signal,
      fetchImpl,
      EVIDENCE_SCOPES.engineering,
    );
    expect(seen.every((url) => url.includes("/api/v1/triage/engineering/cases/"))).toBe(true);
    expect(seen.some((url) => url.includes("validate-action-inputs"))).toBe(false);
    expect(evidence.validation.data).toBeNull();
    expect(evidence.validation.unavailable).toEqual(["input_validation_not_authorized_here"]);
  });
});
