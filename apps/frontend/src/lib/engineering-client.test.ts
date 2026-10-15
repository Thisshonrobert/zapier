import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  EngineeringError,
  listEngineeringCases,
  readEngineeringCaseHistory,
  readViewerCapabilities,
  resolveEngineeringCase,
  returnFindings,
  type EngineeringFetch,
} from "./engineering-client.ts";

const caseId = "f0100000-0000-4000-8000-000000000001";

type Call = { url: string; init: RequestInit | undefined };

function recordingFetch(responses: { status?: number; body: unknown }[]) {
  const calls: Call[] = [];
  let index = 0;
  const fetchImpl: EngineeringFetch = async (input, init) => {
    calls.push({ url: String(input), init });
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return new Response(JSON.stringify(next?.body ?? {}), {
      status: next?.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { calls, fetchImpl };
}

const originalLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
const originalWindow = (globalThis as { window?: unknown }).window;

/**
 * The client reads the bearer token from the browser's `localStorage`. Bun's test
 * runtime defines `window` without storage, so the test supplies both to reproduce a
 * signed-in browser rather than changing the client for testability.
 */
function setToken(token: string) {
  const store = new Map<string, string>([["token", token]]);
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage;
  (globalThis as { window?: unknown }).window = { localStorage: storage };
}

beforeEach(() => {
  setToken("test-token");
});

afterEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage;
  (globalThis as { window?: unknown }).window = originalWindow;
});

describe("Phase 16E engineering client", () => {
  test("lists the engineering queue with the bearer token and no actor parameter", async () => {
    const { calls, fetchImpl } = recordingFetch([{ body: { cases: [] } }]);
    const cases = await listEngineeringCases(25, fetchImpl);

    expect(cases).toEqual([]);
    expect(calls[0]?.url).toContain("/api/v1/triage/engineering/cases?limit=25");
    expect(calls[0]?.url).not.toContain("actorId");
    expect((calls[0]?.init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  test("reads a case history from the bounded endpoint", async () => {
    const { calls, fetchImpl } = recordingFetch([{ body: { case: { case_id: caseId }, events: [] } }]);
    const history = await readEngineeringCaseHistory(caseId, fetchImpl);

    expect(history.case.case_id).toBe(caseId);
    expect(calls[0]?.url).toContain(`/api/v1/triage/engineering/cases/${caseId}/history`);
  });

  test("returning findings posts bounded text with an idempotency key", async () => {
    const { calls, fetchImpl } = recordingFetch([{ body: { workflow: { caseId }, event: { id: caseId } } }]);
    await returnFindings({
      caseId,
      findings: "Transport threw after send",
      notes: "Checked logs",
      idempotencyKey: "a0000000-0000-4000-8000-000000000001",
    }, fetchImpl);

    expect(calls[0]?.url).toContain(`/cases/${caseId}/findings`);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      findings: "Transport threw after send",
      notes: "Checked logs",
    });
    expect((calls[0]?.init?.headers as Record<string, string>)["idempotency-key"])
      .toBe("a0000000-0000-4000-8000-000000000001");
  });

  test("the client never sends a role or an owner id", async () => {
    const { calls, fetchImpl } = recordingFetch([{ body: { workflow: { caseId }, event: { id: caseId } } }]);
    await resolveEngineeringCase({ caseId, resolutionReason: "Fixed upstream" }, fetchImpl);

    const body = String(calls[0]?.init?.body);
    expect(body).not.toContain("isEngineer");
    expect(body).not.toContain("subjectOwnerId");
    expect(body).not.toContain("replay");
  });

  test("a 403 surfaces the server detail and status", async () => {
    const { fetchImpl } = recordingFetch([{ status: 403, body: { detail: "Engineering permission required" } }]);
    const error = await listEngineeringCases(undefined, fetchImpl).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EngineeringError);
    expect((error as EngineeringError).status).toBe(403);
    expect((error as EngineeringError).message).toBe("Engineering permission required");
  });

  test("viewer capabilities degrade to null instead of guessing a role", async () => {
    const granted = recordingFetch([{ body: { capabilities: { isSupportOperator: false, isEngineer: true } } }]);
    expect(await readViewerCapabilities(granted.fetchImpl)).toEqual({ isSupportOperator: false, isEngineer: true });

    const failed = recordingFetch([{ status: 503, body: { detail: "unavailable" } }]);
    expect(await readViewerCapabilities(failed.fetchImpl)).toBeNull();
  });

  test("a signed-out viewer is told to sign in and no request is sent", async () => {
    setToken("");
    const { calls, fetchImpl } = recordingFetch([{ body: { cases: [] } }]);
    const error = await listEngineeringCases(undefined, fetchImpl).catch((caught: unknown) => caught);

    expect((error as EngineeringError).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
});
