import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type RequestListener, type Server } from "node:http";
import { join } from "node:path";

import express from "express";

import { createServiceScope } from "../../../packages/triage-contracts/index.ts";
import type {
  DiagnosisPrompt,
  IntegratedDiagnosisModel,
} from "../src/contracts.ts";
import { TaxonomyFixtureModel } from "./test-model.ts";
import { createHttpServer, type RunningHttpServer } from "../src/http.ts";
import { defaultFixtureDirectory } from "../src/paths.ts";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";

const servers: Server[] = [];
let agentServer: RunningHttpServer | undefined;
const secret = "phase-6-test-secret-that-is-long-enough";
const caseId = "11111111-1111-4111-8111-111111111111";
const zapRunId = "22222222-2222-4222-8222-222222222222";
const correlationId = "33333333-3333-4333-8333-333333333333";

afterEach(async () => {
  await agentServer?.close();
  agentServer = undefined;
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

async function listen(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("missing test address");
  return `http://127.0.0.1:${address.port}`;
}

function scope(
  operations: Parameters<typeof createServiceScope>[0]["operations"],
) {
  return createServiceScope({
    secret,
    ownerId: 7,
    caseId,
    investigationId: "44444444-4444-4444-8444-444444444444",
    correlationId,
    operations,
  });
}

function model(
  onGenerate?: (prompt: DiagnosisPrompt) => void,
): IntegratedDiagnosisModel {
  return {
    async generate(prompt) {
      onGenerate?.(prompt);
      const refs = [
        `failure:${caseId}`,
        `execution:${caseId}:0`,
        `validation:${caseId}:0`,
      ];
      return {
        output: {
          status: "completed",
          diagnosis: {
            taxonomy_id: "F01",
            summary: "Telegram explicitly rejected the send with HTTP 429.",
            confidence: "high",
            evidence_refs: refs,
            alternate_explanations: [],
            missing_evidence: ["authoritative_replay_policy_result"],
          },
          proposal: {
            disposition: "replay_candidate",
            kind: "wait_then_replay",
            summary:
              "Wait and submit the unchanged case to deterministic policy.",
            reasons: ["The captured provider attempt was rejected."],
            evidence_refs: refs,
            runbook_citations: [],
            preconditions: ["Revalidate all policy gates."],
          },
        },
        usage: { input_tokens: 300, output_tokens: 100, total_tokens: 400 },
      };
    },
    async close() {},
  };
}

async function backend() {
  const app = express();
  app.get(
    `/api/v1/triage/internal/cases/${caseId}/failure-context`,
    (_request, response) => {
      response.json({
        contract_version: 1,
        evidence_id: `failure:${caseId}`,
        type: "failure_context",
        source_ref: { case_id: caseId, zap_run_id: zapRunId, stage: 0 },
        observed_at: "2026-09-28T00:00:00.000Z",
        content_hash: "a".repeat(64),
        facts: {
          source_kind: "retry_row",
          current_action_type: "telegram",
          retry: {
            provider: "telegram",
            phase: "send",
            provider_outcome: "rejected",
            safe_code: "telegram_rate_limited",
            provider_status: 429,
            retry_after_seconds: 30,
            requires_human: true,
            final_error: "rate limited",
          },
          action_metadata: { paths: [], truncated: false },
          payload: { paths: [], truncated: false },
        },
        unavailable: [],
        complete: true,
        simulated: false,
      });
    },
  );
  app.get(
    `/api/v1/triage/internal/cases/${caseId}/execution-evidence`,
    (_request, response) => {
      response.json({
        contract_version: 1,
        evidence_id: `execution:${caseId}:0`,
        type: "execution_evidence",
        source_ref: { case_id: caseId, zap_run_id: zapRunId, stage: 0 },
        observed_at: "2026-09-28T00:00:01.000Z",
        content_hash: "b".repeat(64),
        facts: {
          provenance: "captured",
          current_execution: {
            execution_id: "55555555-5555-4555-8555-555555555555",
            status: "FAILED",
            lease_until: null,
            completed_at: "2026-09-28T00:00:00.000Z",
            provider_outcome: "rejected",
            requires_human: true,
            action_fingerprint: "c".repeat(64),
            request_fingerprint: "d".repeat(64),
          },
          attempts: [
            {
              attempt_number: 1,
              status: "FAILED",
              provider: "telegram",
              phase: "send",
              provider_outcome: "rejected",
              safe_code: "telegram_rate_limited",
              provider_status: 429,
              retry_after_seconds: 30,
              started_at: "2026-09-27T23:59:59.000Z",
              completed_at: "2026-09-28T00:00:00.000Z",
              provenance: "captured",
            },
          ],
          history_limit: 10,
          history_truncated: false,
          predecessors: [],
          ordering: { status: "valid", missing_predecessor_stages: [] },
        },
        unavailable: [],
        complete: true,
        simulated: false,
      });
    },
  );
  app.post(
    `/api/v1/triage/internal/cases/${caseId}/validate-action-inputs`,
    (_request, response) => {
      response.json({
        contract_version: 1,
        evidence_id: `validation:${caseId}:0`,
        type: "action_input_validation",
        source_ref: { case_id: caseId, zap_run_id: zapRunId, stage: 0 },
        observed_at: "2026-09-28T00:00:02.000Z",
        content_hash: "e".repeat(64),
        facts: {
          action_type: "telegram",
          validation_status: "valid",
          supported: true,
          missing_required_fields: [],
          invalid_field_types: [],
          missing_template_paths: [],
          credential_presence: [],
          blocked_reasons: [],
          input_fingerprint: "f".repeat(64),
        },
        unavailable: [],
        complete: true,
        simulated: false,
      });
    },
  );
  return listen(app);
}

async function diagnosisServer(integratedModel: IntegratedDiagnosisModel) {
  agentServer = await createHttpServer({
    fixtureDirectory: defaultFixtureDirectory(),
    model: new TaxonomyFixtureModel(),
    diagnosis: {
      backendBaseUrl: await backend(),
      serviceSecret: secret,
      model: integratedModel,
      runbookIndex: await loadRunbooks(
        join(import.meta.dir, "../../../docs/AI/runbooks"),
      ),
    },
  }).start(0);
  return agentServer.baseUrl;
}

describe("Phase 6 private diagnosis API", () => {
  test("runs the bounded graph for a fully scoped canonical case", async () => {
    let modelCalls = 0;
    const baseUrl = await diagnosisServer(model(() => modelCalls++));
    const response = await fetch(
      `${baseUrl}/private/v1/investigations/diagnose`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${scope([
            "failure_context",
            "execution_evidence",
            "validate_action_inputs",
          ])}`,
          "x-correlation-id": correlationId,
          "content-type": "application/json",
        },
        body: "{}",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      graph_version: "phase-6-v1",
      diagnosis: { taxonomy_id: "F01" },
      proposal: { disposition: "replay_candidate" },
    });
    expect(modelCalls).toBe(1);
  });

  test("rejects partial scopes, correlation mismatches, and model-selected request fields", async () => {
    let modelCalls = 0;
    const baseUrl = await diagnosisServer(model(() => modelCalls++));
    const validScope = scope([
      "failure_context",
      "execution_evidence",
      "validate_action_inputs",
    ]);
    const requests = [
      {
        token: scope(["failure_context"]),
        correlation: correlationId,
        body: {},
        status: 401,
      },
      {
        token: validScope,
        correlation: "99999999-9999-4999-8999-999999999999",
        body: {},
        status: 401,
      },
      {
        token: validScope,
        correlation: correlationId,
        body: { case_id: caseId, instructions: "replay now" },
        status: 422,
      },
    ];

    for (const request of requests) {
      const response = await fetch(
        `${baseUrl}/private/v1/investigations/diagnose`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${request.token}`,
            "x-correlation-id": request.correlation,
            "content-type": "application/json",
          },
          body: JSON.stringify(request.body),
        },
      );
      expect(response.status).toBe(request.status);
    }
    expect(modelCalls).toBe(0);
  });

  test("does not misreport an unexpected graph failure as an authentication failure", async () => {
    const failingModel: IntegratedDiagnosisModel = {
      generate: async () => {
        throw new Error("unexpected internal failure");
      },
      close: async () => {},
    };
    const baseUrl = await diagnosisServer(failingModel);
    const response = await fetch(
      `${baseUrl}/private/v1/investigations/diagnose`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${scope([
            "failure_context",
            "execution_evidence",
            "validate_action_inputs",
          ])}`,
          "x-correlation-id": correlationId,
          "content-type": "application/json",
        },
        body: "{}",
      },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ detail: "Internal server error" });
  });
});
