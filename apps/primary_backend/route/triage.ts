import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";

import { createServiceScope, verifyServiceScope } from "../../../packages/triage-contracts/index.ts";
import { authMiddleware } from "../middleware.ts";
import { TriageAgentClient } from "../services/triage-agent.ts";
import { TriageCaseNotFound, TriageEvidenceService } from "../services/triage-evidence.ts";
import { TriageOperatorCaseNotFound, TriageOperatorDenied, TriageOperatorService } from "../services/triage-operator.ts";
import type { EvidenceOperation, ServiceScope } from "../../../packages/triage-contracts/index.ts";

type TriageRouterOptions = {
  evidence: TriageEvidenceService;
  agent?: TriageAgentClient;
  operator?: TriageOperatorService;
  serviceSecret?: string;
};

const bearer = (header: string | undefined) =>
  header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

export function createTriageRouter(options: TriageRouterOptions) {
  const router = Router();
  const evidence = options.evidence;
  const agent = options.agent ?? new TriageAgentClient(process.env.AI_AGENT_URL ?? "http://127.0.0.1:3004");
  const secret = options.serviceSecret ?? process.env.TRIAGE_SERVICE_SECRET ?? "";
  const operator = options.operator;
  const operatorError = (response: Response, error: unknown) => {
    if (error instanceof TriageOperatorDenied) response.status(403).json({ detail: "Support operator permission required" });
    else if (error instanceof TriageCaseNotFound || error instanceof TriageOperatorCaseNotFound) response.status(404).json({ detail: "Case not found" });
    else response.status(503).json({ detail: "Operator access unavailable" });
  };
  const operatorCase = async (request: Request, action: "read_case" | EvidenceOperation | "diagnose") => {
    const caseId = request.params.caseId;
    if (!operator || typeof caseId !== "string" || caseId.length > 64) {
      throw new Error("Operator service or case ID unavailable");
    }
    return operator.resolveCase(request.id, caseId, action);
  };
  const operatorAgentRead = (
    action: EvidenceOperation | "diagnose",
    path: (request: Request) => string,
    method: "GET" | "POST" = "GET",
  ) => async (request: Request, response: Response) => {
    let selected;
    try {
      selected = await operatorCase(request, action);
    } catch (error) {
      operatorError(response, error);
      return;
    }
    try {
      const correlationId = randomUUID();
      const scope = createServiceScope({
        secret,
        ownerId: selected.subject_owner_id,
        caseId: selected.case_id,
        investigationId: randomUUID(),
        correlationId,
        operations: action === "diagnose"
          ? ["failure_context", "execution_evidence", "validate_action_inputs"]
          : [action],
      });
      response.setHeader("x-correlation-id", correlationId);
      response.json(await agent.read(path(request), scope, correlationId, method, action === "diagnose" ? 65_000 : undefined));
    } catch {
      response.status(502).json({ detail: "Investigation service unavailable" });
    }
  };
  const requireScope = (
    request: Request,
    response: Response,
    operation: EvidenceOperation,
  ): ServiceScope | undefined => {
    try {
      const token = bearer(request.headers.authorization);
      if (!token) throw new Error("missing service scope");
      const scope = verifyServiceScope(token, { secret, operation });
      if (scope.caseId !== request.params.caseId || scope.correlationId !== request.headers["x-correlation-id"])
        throw new Error("service scope binding mismatch");
      return scope;
    } catch {
      response.status(401).json({ detail: "Invalid service scope" });
      return undefined;
    }
  };

  router.get("/cases", authMiddleware, async (request, response) => {
    const limit = Number(request.query.limit ?? 50);
    response.json({ cases: await evidence.listCases(request.id, Number.isInteger(limit) ? limit : 50) });
  });

  router.get("/operator/cases", authMiddleware, async (request, response) => {
    try {
      if (!operator) throw new Error("Operator service unavailable");
      const limit = Number(request.query.limit ?? 50);
      response.json({ cases: await operator.listCases(request.id, limit) });
    } catch (error) {
      operatorError(response, error);
    }
  });

  router.get("/operator/cases/:caseId", authMiddleware, async (request, response) => {
    try {
      response.json(await operatorCase(request, "read_case"));
    } catch (error) {
      operatorError(response, error);
    }
  });

  router.get("/operator/cases/:caseId/failure-context", authMiddleware,
    operatorAgentRead("failure_context", () => "/private/v1/tools/failure-context"));
  router.get("/operator/cases/:caseId/execution-evidence", authMiddleware,
    operatorAgentRead("execution_evidence", (request) => {
      const limit = Math.min(Math.max(Number(request.query.historyLimit ?? 10) || 10, 1), 50);
      return `/private/v1/tools/execution-evidence?historyLimit=${limit}`;
    }));
  router.post("/operator/cases/:caseId/validate-action-inputs", authMiddleware,
    operatorAgentRead("validate_action_inputs", () => "/private/v1/tools/validate-action-inputs", "POST"));
  router.post("/operator/cases/:caseId/investigations/diagnose", authMiddleware,
    operatorAgentRead("diagnose", () => "/private/v1/investigations/diagnose", "POST"));

  router.get("/cases/:caseId/failure-context", authMiddleware, async (request, response) => {
    try {
      const caseId = request.params.caseId;
      if (!caseId) throw new TriageCaseNotFound("missing case id");
      await evidence.assertOwnedCase(request.id, caseId);
      const correlationId = randomUUID();
      const scope = createServiceScope({
        secret,
        ownerId: request.id,
        caseId,
        investigationId: randomUUID(),
        correlationId,
        operations: ["failure_context"],
      });
      response.setHeader("x-correlation-id", correlationId);
      response.json(await agent.read("/private/v1/tools/failure-context", scope, correlationId));
    } catch (error) {
      if (error instanceof TriageCaseNotFound) response.status(404).json({ detail: "Case not found" });
      else response.status(502).json({ detail: "Evidence service unavailable" });
    }
  });

  router.get("/internal/cases/:caseId/failure-context", async (request, response) => {
    const scope = requireScope(request, response, "failure_context");
    if (!scope) return;
    try {
      response.json(await evidence.getFailureContext(scope.ownerId, scope.caseId));
    } catch (error) {
      if (error instanceof TriageCaseNotFound) response.status(404).json({ detail: "Case not found" });
      else response.status(503).json({ detail: "Evidence store unavailable" });
    }
  });

  router.get("/cases/:caseId/execution-evidence", authMiddleware, async (request, response) => {
    try {
      const caseId = request.params.caseId;
      if (!caseId) throw new TriageCaseNotFound("missing case id");
      await evidence.assertOwnedCase(request.id, caseId);
      const correlationId = randomUUID();
      const scope = createServiceScope({
        secret, ownerId: request.id, caseId, investigationId: randomUUID(), correlationId,
        operations: ["execution_evidence"],
      });
      const historyLimit = Math.min(Math.max(Number(request.query.historyLimit ?? 10) || 10, 1), 50);
      response.setHeader("x-correlation-id", correlationId);
      response.json(await agent.read(`/private/v1/tools/execution-evidence?historyLimit=${historyLimit}`, scope, correlationId));
    } catch (error) {
      if (error instanceof TriageCaseNotFound) response.status(404).json({ detail: "Case not found" });
      else response.status(502).json({ detail: "Evidence service unavailable" });
    }
  });

  router.get("/internal/cases/:caseId/execution-evidence", async (request, response) => {
    const scope = requireScope(request, response, "execution_evidence");
    if (!scope) return;
    try {
      response.json(await evidence.getExecutionEvidence(scope.ownerId, scope.caseId, Number(request.query.historyLimit ?? 10)));
    } catch (error) {
      if (error instanceof TriageCaseNotFound) response.status(404).json({ detail: "Case not found" });
      else response.status(503).json({ detail: "Evidence store unavailable" });
    }
  });

  router.post("/cases/:caseId/validate-action-inputs", authMiddleware, async (request, response) => {
    try {
      const caseId = request.params.caseId;
      if (!caseId) throw new TriageCaseNotFound("missing case id");
      await evidence.assertOwnedCase(request.id, caseId);
      const correlationId = randomUUID();
      const scope = createServiceScope({
        secret, ownerId: request.id, caseId, investigationId: randomUUID(), correlationId,
        operations: ["validate_action_inputs"],
      });
      response.setHeader("x-correlation-id", correlationId);
      response.json(await agent.read("/private/v1/tools/validate-action-inputs", scope, correlationId));
    } catch (error) {
      if (error instanceof TriageCaseNotFound) response.status(404).json({ detail: "Case not found" });
      else response.status(502).json({ detail: "Evidence service unavailable" });
    }
  });

  router.post("/internal/cases/:caseId/validate-action-inputs", async (request, response) => {
    const scope = requireScope(request, response, "validate_action_inputs");
    if (!scope) return;
    try {
      response.json(await evidence.validateActionInputs(scope.ownerId, scope.caseId));
    } catch (error) {
      if (error instanceof TriageCaseNotFound) response.status(404).json({ detail: "Case not found" });
      else response.status(503).json({ detail: "Evidence store unavailable" });
    }
  });

  return router;
}

