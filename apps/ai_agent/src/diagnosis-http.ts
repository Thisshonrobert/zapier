import { Router } from "express";
import { z, ZodError } from "zod";

import {
  verifyServiceScope,
  type EvidenceOperation,
} from "../../../packages/triage-contracts/index.ts";
import {
  BackendClient,
  BackendReadTimeout,
  BackendResponseError,
} from "./clients/backend.ts";
import type { IntegratedDiagnosisModel } from "./contracts.ts";
import {
  GraphStepLimitExceeded,
  InvestigationTimeout,
  InvalidModelOutput,
  ModelTimeout,
  TokenBudgetExceeded,
  ToolBudgetExceeded,
  buildDiagnosisService,
  type DiagnosisOptions,
  type IntegratedInvestigationTools,
} from "./graph.ts";
import { ModelProviderError } from "./gemini-model.ts";
import { searchRunbooks, type RunbookIndex } from "./tools/search-runbooks.ts";

const EmptyDiagnosisRequestSchema = z.object({}).strict();
const requiredOperations: readonly EvidenceOperation[] = [
  "failure_context",
  "execution_evidence",
  "validate_action_inputs",
];
const bearer = (header: string | undefined) =>
  header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

export type DiagnosisRouterOptions = {
  backendBaseUrl: string;
  serviceSecret: string;
  model: IntegratedDiagnosisModel;
  runbookIndex: RunbookIndex;
  backendTimeoutMs?: number;
  diagnosisOptions?: DiagnosisOptions;
  now?: () => Date;
};

export function createDiagnosisRouter(options: DiagnosisRouterOptions) {
  const router = Router();
  router.post("/", async (request, response) => {
    const parsedRequest = EmptyDiagnosisRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(422).json({ detail: "Invalid request" });
      return;
    }

    const token = bearer(request.headers.authorization);
    if (!token) {
      response.status(401).json({ detail: "Invalid service scope" });
      return;
    }
    try {
      const scopes = requiredOperations.map((operation) =>
        verifyServiceScope(token, {
          secret: options.serviceSecret,
          operation,
          now: options.now?.(),
        }),
      );
      const scope = scopes[0]!;
      if (scope.correlationId !== request.headers["x-correlation-id"]) {
        throw new Error("service scope binding mismatch");
      }
    } catch {
      response.status(401).json({ detail: "Invalid service scope" });
      return;
    }

    try {
      const client = new BackendClient({
        baseUrl: options.backendBaseUrl,
        scopeToken: token,
        serviceSecret: options.serviceSecret,
        timeoutMs: options.backendTimeoutMs,
      });
      const tools: IntegratedInvestigationTools = {
        getFailureContext: (signal) => client.getFailureContext(signal),
        getExecutionEvidence: (historyLimit, signal) =>
          client.getExecutionEvidence(historyLimit, signal),
        validateActionInputs: (signal) => client.validateActionInputs(signal),
        searchRunbooks: (input) => searchRunbooks(options.runbookIndex, input),
      };
      response.json(
        await buildDiagnosisService(
          tools,
          options.model,
          options.diagnosisOptions,
        ).diagnose(),
      );
    } catch (error) {
      if (
        error instanceof ModelTimeout ||
        error instanceof InvestigationTimeout ||
        error instanceof BackendReadTimeout
      ) {
        response.status(504).json({ detail: "Diagnosis timed out" });
      } else if (
        error instanceof InvalidModelOutput ||
        error instanceof ModelProviderError ||
        error instanceof BackendResponseError ||
        error instanceof ZodError
      ) {
        response.status(502).json({ detail: "Diagnosis unavailable" });
      } else if (
        error instanceof ToolBudgetExceeded ||
        error instanceof TokenBudgetExceeded ||
        error instanceof GraphStepLimitExceeded
      ) {
        response.status(503).json({ detail: "Diagnosis budget exhausted" });
      } else {
        response.status(500).json({ detail: "Internal server error" });
      }
    }
  });
  return router;
}
