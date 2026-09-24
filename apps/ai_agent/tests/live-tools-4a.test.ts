import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type RequestListener, type Server } from "node:http";
import express from "express";

import { createServiceScope } from "../../../packages/triage-contracts/index.ts";
import { BackendClient, BackendReadTimeout } from "../src/clients/backend.ts";
import { BackendFailureContextTool } from "../src/tools/failure-context.ts";
import { createPrivateToolsRouter } from "../src/private-http.ts";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
});

async function listen(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing test address");
  return `http://127.0.0.1:${address.port}`;
}

const secret = "phase-4-test-secret-that-is-long-enough";
const scope = createServiceScope({
  secret,
  ownerId: 7,
  caseId: "11111111-1111-4111-8111-111111111111",
  investigationId: "22222222-2222-4222-8222-222222222222",
  correlationId: "33333333-3333-4333-8333-333333333333",
  operations: ["failure_context"],
});

describe("Phase 4A backend client", () => {
  test("uses only the bound case scope and propagates correlation ID", async () => {
    let authorization = "";
    let correlation = "";
    const baseUrl = await listen((request, response) => {
      authorization = request.headers.authorization ?? "";
      correlation = String(request.headers["x-correlation-id"] ?? "");
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        contract_version: 1,
        evidence_id: "failure:11111111-1111-4111-8111-111111111111",
        type: "failure_context",
        source_ref: {
          case_id: "11111111-1111-4111-8111-111111111111",
          zap_run_id: "44444444-4444-4444-8444-444444444444",
          stage: 0,
        },
        observed_at: "2026-09-24T00:00:00.000Z",
        content_hash: "a".repeat(64),
        facts: {
          source_kind: "retry_row",
          current_action_type: "telegram",
          retry: { provider_outcome: "rejected", requires_human: true },
          action_metadata: { paths: [], truncated: false },
          payload: { paths: [], truncated: false },
        },
        unavailable: ["historical_action_snapshot"],
        complete: false,
        simulated: false,
      }));
    });
    const client = new BackendClient({ baseUrl, scopeToken: scope, serviceSecret: secret, timeoutMs: 100 });

    const result = await new BackendFailureContextTool(client).get();

    expect(result.type).toBe("failure_context");
    expect(authorization).toBe(`Bearer ${scope}`);
    expect(correlation).toBe("33333333-3333-4333-8333-333333333333");
  });

  test("aborts backend reads at the configured deadline", async () => {
    const baseUrl = await listen(() => {});
    const client = new BackendClient({ baseUrl, scopeToken: scope, serviceSecret: secret, timeoutMs: 10 });

    await expect(new BackendFailureContextTool(client).get()).rejects.toBeInstanceOf(
      BackendReadTimeout,
    );
  });

  test("private boundary rejects expired or mismatched scopes before reading evidence", async () => {
    let backendCalls = 0;
    const backendBaseUrl = await listen((_request, response) => {
      backendCalls++;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        contract_version: 1,
        evidence_id: "failure:11111111-1111-4111-8111-111111111111",
        type: "failure_context",
        source_ref: { case_id: "11111111-1111-4111-8111-111111111111", zap_run_id: "44444444-4444-4444-8444-444444444444", stage: 0 },
        observed_at: "2026-09-24T00:00:00.000Z",
        content_hash: "a".repeat(64),
        facts: {
          source_kind: "retry_row", current_action_type: "telegram",
          retry: { provider_outcome: "rejected", requires_human: true },
          action_metadata: { paths: [], truncated: false }, payload: { paths: [], truncated: false },
        },
        unavailable: ["historical_action_snapshot"], complete: false, simulated: false,
      }));
    });
    const app = express();
    app.use("/private/v1/tools", createPrivateToolsRouter({ backendBaseUrl, serviceSecret: secret }));
    const agentBaseUrl = await listen(app);
    const valid = await fetch(`${agentBaseUrl}/private/v1/tools/failure-context`, {
      headers: { authorization: `Bearer ${scope}`, "x-correlation-id": "33333333-3333-4333-8333-333333333333" },
    });
    expect(valid.status).toBe(200);
    expect(backendCalls).toBe(1);

    const expired = createServiceScope({
      secret, ownerId: 7, caseId: "11111111-1111-4111-8111-111111111111",
      investigationId: "22222222-2222-4222-8222-222222222222",
      correlationId: "33333333-3333-4333-8333-333333333333",
      operations: ["failure_context"], now: new Date(Date.now() - 120_000), ttlSeconds: 1,
    });
    const rejected = await fetch(`${agentBaseUrl}/private/v1/tools/failure-context`, {
      headers: { authorization: `Bearer ${expired}`, "x-correlation-id": "33333333-3333-4333-8333-333333333333" },
    });
    expect(rejected.status).toBe(401);
    expect(backendCalls).toBe(1);
  });
});
