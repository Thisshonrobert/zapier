import { randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { parseEventCursor } from "../../../packages/triage-contracts/events.ts";

import { createServiceScope, verifyServiceScope } from "../../../packages/triage-contracts/index.ts";
import { authMiddleware } from "../middleware.ts";
import { TriageAgentClient } from "../services/triage-agent.ts";
import { TriageCaseNotFound, TriageEvidenceService } from "../services/triage-evidence.ts";
import { TriageOperatorCaseNotFound, TriageOperatorDenied, TriageOperatorService } from "../services/triage-operator.ts";
import { InvestigationAuthority, InvestigationDecisionDenied } from "../services/investigation-authority.ts";
import { InvestigationProposals } from "../services/investigation-proposals.ts";
import { InvestigationNotifications } from "../services/investigation-notifications.ts";
import { ReplayDenied, ReplayService } from "../services/replay.ts";
import type { EvidenceOperation, ServiceScope } from "../../../packages/triage-contracts/index.ts";

type TriageRouterOptions = {
  evidence: TriageEvidenceService;
  agent?: TriageAgentClient;
  operator?: TriageOperatorService;
  proposals?: InvestigationProposals;
  authority?: InvestigationAuthority;
  notifications?: InvestigationNotifications;
  replay?: ReplayService;
  serviceSecret?: string;
};

const bearer = (header: string | undefined) =>
  header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
const uuid = z.uuid();
const investigationEnabled = () => process.env.INVESTIGATION_ENABLED === "true";
const replayIntentEnabled = () => process.env.REPLAY_INTENT_ENABLED === "true";
const runnerBinding = z.object({
  id: uuid, caseId: uuid, zapRunId: uuid, stage: z.number().int().min(0).max(1000),
  subjectOwnerId: z.number().int().positive(), actorId: z.number().int().positive(),
  supportOperatorId: z.number().int().positive(),
}).strict();

export function createTriageRouter(options: TriageRouterOptions) {
  const router = Router();
  const evidence = options.evidence;
  const agent = options.agent ?? new TriageAgentClient(process.env.AI_AGENT_URL ?? "http://127.0.0.1:3004");
  const secret = options.serviceSecret ?? process.env.TRIAGE_SERVICE_SECRET ?? "";
  const operator = options.operator;
  const proposals = options.proposals;
  const authority = options.authority;
  const notifications = options.notifications;
  const decisionError = (response: Response, error: unknown) => {
    if (error instanceof InvestigationDecisionDenied)
      response.status(error.message.includes("permission") ? 403 : 409).json({ detail: error.message });
    else response.status(503).json({ detail: "Decision snapshot unavailable" });
  };
  for (const operation of ["dry-run", "requests"] as const) {
    router.post(`/operator/cases/:caseId/replay/${operation}`, authMiddleware, async (request, response) => {
      if (operation === "requests" && !replayIntentEnabled()) {
        response.status(503).json({ detail: "Replay intent disabled", replayEnabled: false }); return;
      }
      const parsed = z.object({ approvalId: uuid, proposalVersion: z.number().int().positive() }).strict().safeParse(request.body);
      const requestId = operation === "requests" ? request.headers["idempotency-key"] : randomUUID();
      if (!parsed.success || typeof requestId !== "string" || !uuid.safeParse(requestId).success) {
        response.status(422).json({ detail: "Invalid replay request" }); return;
      }
      let selected;
      try { selected = await operatorCase(request, "read_case"); }
      catch (error) { operatorError(response, error); return; }
      if (!options.replay) { response.status(503).json({ detail: "Replay intent unavailable" }); return; }
      try {
        const input = { ...parsed.data, requestId, actorId: request.id,
          caseId: selected.case_id, subjectOwnerId: selected.subject_owner_id };
        const result = operation === "requests" ? await options.replay.request(input) : await options.replay.dryRun(input);
        response.status(operation === "requests" ? 201 : 200).json(result);
      } catch (error) {
        if (error instanceof ReplayDenied) response.status(409).json({ detail: error.message, replayEnabled: false });
        else response.status(503).json({ detail: "Replay intent unavailable", replayEnabled: false });
      }
    });
  }
  const validServiceSecret = (value: string | undefined) => {
    if (!value || secret.length < 32) return false;
    const expected = Buffer.from(secret);
    const supplied = Buffer.from(value);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  };
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
    action: EvidenceOperation,
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
        operations: [action],
      });
      response.setHeader("x-correlation-id", correlationId);
      response.json(await agent.read(path(request), scope, correlationId, method));
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
  router.post("/operator/cases/:caseId/investigations", authMiddleware, async (request, response) => {
    if (!investigationEnabled()) { response.status(503).json({ detail: "Investigation disabled" }); return; }
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || !uuid.safeParse(idempotencyKey).success) {
      response.status(422).json({ detail: "Idempotency key required" }); return;
    }
    let selected;
    try { selected = await operatorCase(request, "diagnose"); }
    catch (error) { operatorError(response, error); return; }
    const id = randomUUID();
    const correlationId = randomUUID();
    try {
      const scope = createServiceScope({ secret, ownerId: selected.subject_owner_id,
        caseId: selected.case_id, investigationId: id, correlationId,
        operations: ["failure_context", "execution_evidence", "validate_action_inputs"] });
      response.setHeader("x-correlation-id", correlationId);
      const started = await agent.read("/private/v1/investigations", scope, correlationId, "POST", 5_000,
        { id, caseId: selected.case_id, zapRunId: selected.zap_run_id, stage: selected.stage,
          subjectOwnerId: selected.subject_owner_id, actorId: request.id,
          supportOperatorId: request.id, idempotencyKey }) as { id: string; status: string };
      response.json({ id: started.id, status: started.status });
    } catch { response.status(502).json({ detail: "Investigation service unavailable" }); }
  });

  router.get("/operator/cases/:caseId/investigations/:investigationId", authMiddleware,
    async (request, response) => {
      const id = request.params.investigationId;
      if (typeof id !== "string" || !uuid.safeParse(id).success) {
        response.status(404).json({ detail: "Investigation not found" }); return;
      }
      let selected;
      try { selected = await operatorCase(request, "read_case"); }
      catch (error) { operatorError(response, error); return; }
      const correlationId = randomUUID();
      try {
        const scope = createServiceScope({ secret, ownerId: selected.subject_owner_id,
          caseId: selected.case_id, investigationId: id, correlationId,
          operations: ["failure_context"] });
        response.setHeader("x-correlation-id", correlationId);
        const saved = await agent.read(`/private/v1/investigations/${id}`, scope, correlationId) as {
          id?: string; status?: string; binding?: { caseId: string; subjectOwnerId: number;
            zapRunId: string; stage: number }; result?: unknown; evidence?: unknown };
        if (saved.id !== id || saved.binding?.caseId !== selected.case_id ||
            saved.binding.subjectOwnerId !== selected.subject_owner_id ||
            saved.binding.zapRunId !== selected.zap_run_id || saved.binding.stage !== selected.stage) {
            response.status(409).json({ detail: "Investigation binding mismatch" }); return;
        }
        if (saved.status === "proposed" && proposals) {
          if (!saved.result || !saved.evidence) {
            response.status(409).json({ detail: "Investigation evidence unavailable" }); return;
          }
          await proposals.submit({ investigationId: id, caseId: selected.case_id,
            subjectOwnerId: selected.subject_owner_id, actorId: request.id,
            result: saved.result, evidence: saved.evidence });
        }
        if (!authority) throw new Error("Authority unavailable");
        const snapshot = await authority.snapshot({ investigationId: id, caseId: selected.case_id,
          subjectOwnerId: selected.subject_owner_id, actorId: request.id });
        response.json({ id, status: saved.status, result: saved.result ?? null, authority: snapshot });
      } catch (error) {
        if (error instanceof InvestigationDecisionDenied) decisionError(response, error);
        else response.status(502).json({ detail: "Investigation service unavailable" });
      }
    });

  router.get("/operator/cases/:caseId/investigations/:investigationId/events", authMiddleware,
    async (request, response) => {
      const id = request.params.investigationId;
      if (typeof id !== "string" || !uuid.safeParse(id).success) {
        response.status(404).json({ detail: "Investigation not found" }); return;
      }
      let cursor;
      try { cursor = parseEventCursor(request.headers["last-event-id"]); }
      catch { response.status(422).json({ detail: "Invalid event cursor" }); return; }
      let selected;
      try { selected = await operatorCase(request, "read_case"); }
      catch (error) { operatorError(response, error); return; }
      const controller = new AbortController();
      const closed = () => controller.abort();
      response.once("close", closed);
      request.once("aborted", closed);
      request.socket.once("close", closed);
      const timeout = setTimeout(closed, 30_000);
      try {
        const correlationId = randomUUID();
        const scope = createServiceScope({ secret, ownerId: selected.subject_owner_id,
          caseId: selected.case_id, investigationId: id, correlationId, operations: ["failure_context"] });
        const saved = await agent.read(`/private/v1/investigations/${id}`, scope, correlationId) as {
          id: string; binding?: { caseId: string; subjectOwnerId: number; zapRunId: string; stage: number } };
        if (saved.id !== id || saved.binding?.caseId !== selected.case_id ||
            saved.binding.subjectOwnerId !== selected.subject_owner_id ||
            saved.binding.zapRunId !== selected.zap_run_id || saved.binding.stage !== selected.stage) {
          response.status(409).json({ detail: "Investigation binding mismatch" }); return;
        }
        const upstream = await agent.stream(`/private/v1/investigations/${id}/events`, scope,
          correlationId, cursor === null ? undefined : String(cursor), controller.signal);
        response.set({ "content-type": "text/event-stream", "cache-control": "no-cache, no-transform",
          "x-accel-buffering": "no", "x-correlation-id": correlationId });
        response.flushHeaders();
        // Native pipeline propagates backpressure and cancels the private stream on browser disconnect.
        await pipeline(Readable.fromWeb(upstream.body as unknown as NodeReadableStream<Uint8Array>),
          response, { signal: controller.signal });
      } catch {
        if (!response.headersSent && !controller.signal.aborted)
          response.status(502).json({ detail: "Investigation stream unavailable" });
        else response.destroy();
      } finally {
        clearTimeout(timeout); response.off("close", closed);
        request.off("aborted", closed); request.socket.off("close", closed); controller.abort();
      }
    });

  router.post("/operator/cases/:caseId/investigations/:investigationId/decision", authMiddleware,
    async (request, response) => {
      const id = request.params.investigationId;
      const decisionId = request.headers["idempotency-key"];
      const parsed = z.object({ proposalId: uuid, proposalVersion: z.number().int().positive(), decision: z.enum(["approve", "reject",
        "mark_owner_action_required", "escalate_to_engineering", "resolve_without_replay"]) }).strict()
        .safeParse(request.body);
      if (typeof id !== "string" || !uuid.safeParse(id).success ||
        typeof decisionId !== "string" || !uuid.safeParse(decisionId).success || !parsed.success) {
        response.status(422).json({ detail: "Invalid decision" }); return;
      }
      let selected;
      try { selected = await operatorCase(request, "diagnose"); }
      catch (error) { operatorError(response, error); return; }
      try {
        if (!authority) throw new Error("Decision service unavailable");
        const decision = await authority.decide({ proposalId: parsed.data.proposalId,
          proposalVersion: parsed.data.proposalVersion,
          investigationId: id, caseId: selected.case_id, subjectOwnerId: selected.subject_owner_id,
          actorId: request.id, decisionId, decision: parsed.data.decision });
        try { if (notifications) await notifications.deliver(decision.id); }
        catch { /* The committed notification remains pending for the retry loop. */ }
        response.json(decision);
      } catch (error) {
        decisionError(response, error);
      }
    });

  router.post("/internal/investigations/:id/scope", async (request, response) => {
    if (!investigationEnabled()) { response.status(503).json({ detail: "Investigation disabled" }); return; }
    if (!validServiceSecret(bearer(request.headers.authorization))) {
      response.status(401).json({ detail: "Invalid service authentication" }); return;
    }
    const parsed = runnerBinding.safeParse(request.body);
    const correlationId = request.headers["x-correlation-id"];
    if (!parsed.success || parsed.data.id !== request.params.id ||
      parsed.data.actorId !== parsed.data.supportOperatorId ||
      typeof correlationId !== "string" || !uuid.safeParse(correlationId).success) {
      response.status(422).json({ detail: "Invalid investigation binding" }); return;
    }
    try {
      if (!operator) throw new Error("Operator service unavailable");
      const selected = await operator.resolveCase(parsed.data.actorId, parsed.data.caseId, "diagnose");
      if (selected.subject_owner_id !== parsed.data.subjectOwnerId ||
        selected.zap_run_id !== parsed.data.zapRunId || selected.stage !== parsed.data.stage) {
        response.status(403).json({ detail: "Investigation binding changed" }); return;
      }
      response.json({ scope: createServiceScope({ secret, ownerId: selected.subject_owner_id,
        caseId: selected.case_id, investigationId: parsed.data.id, correlationId,
        operations: ["failure_context", "execution_evidence", "validate_action_inputs"],
        ttlSeconds: 300 }) });
    } catch (error) { operatorError(response, error); }
  });

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

