import { Router } from "express";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";

import { verifyServiceScope } from "../../../packages/triage-contracts/index.ts";
import { InvestigationStore } from "./investigation-store.ts";
import type { InvestigationDecision } from "./graph.ts";
import { parseEventCursor } from "../../../packages/triage-contracts/events.ts";
import { streamInvestigationEvents } from "./events.ts";

const startSchema = z.object({
  id: z.uuid(), caseId: z.uuid(), zapRunId: z.uuid(), stage: z.number().int().min(0).max(1000),
  subjectOwnerId: z.number().int().positive(), actorId: z.number().int().positive(),
  supportOperatorId: z.number().int().positive(), idempotencyKey: z.uuid(),
}).strict();
const bearer = (header: string | undefined) =>
  header?.startsWith("Bearer ") ? header.slice(7) : undefined;

export function createInvestigationRouter(input: { serviceSecret: string; store: InvestigationStore;
  enabled?: () => boolean;
  resumeDecision?: (threadId: string, decision: InvestigationDecision) => Promise<unknown> }) {
  const router = Router();
  router.get("/status", async (request, response) => {
    const supplied = bearer(request.headers.authorization);
    const actual = Buffer.from(supplied ?? "");
    const expected = Buffer.from(input.serviceSecret);
    if (expected.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      response.status(401).json({ detail: "Invalid service authentication" }); return;
    }
    try { response.json(await input.store.status()); }
    catch { response.status(503).json({ detail: "Investigation store unavailable" }); }
  });
  const scopeFor = (request: { headers: Record<string, unknown> }, id: string) => {
    const token = bearer(request.headers.authorization as string | undefined);
    if (!token) throw new Error("missing scope");
    const scope = verifyServiceScope(token, { secret: input.serviceSecret, operation: "failure_context" });
    if (scope.investigationId !== id || scope.correlationId !== request.headers["x-correlation-id"])
      throw new Error("scope binding mismatch");
    return scope;
  };

  router.post("/", async (request, response) => {
    if (input.enabled && !input.enabled()) {
      response.status(503).json({ detail: "Investigation disabled" }); return;
    }
    const parsed = startSchema.safeParse(request.body);
    if (!parsed.success) { response.status(422).json({ detail: "Invalid job" }); return; }
    let scope;
    try { scope = scopeFor(request, parsed.data.id); }
    catch { response.status(401).json({ detail: "Invalid service scope" }); return; }
    if (scope.caseId !== parsed.data.caseId || scope.ownerId !== parsed.data.subjectOwnerId ||
      parsed.data.actorId !== parsed.data.supportOperatorId) {
      response.status(401).json({ detail: "Invalid service scope" }); return;
    }
    try { response.json(await input.store.start(parsed.data)); }
    catch { response.status(409).json({ detail: "Investigation conflict" }); }
  });

  router.get("/:id/events", async (request, response) => {
    const id = request.params.id;
    if (typeof id !== "string" || !z.uuid().safeParse(id).success) {
      response.status(404).json({ detail: "Investigation not found" }); return;
    }
    let scope;
    try { scope = scopeFor(request, id); }
    catch { response.status(401).json({ detail: "Invalid service scope" }); return; }
    let cursor;
    try { cursor = parseEventCursor(request.headers["last-event-id"]); }
    catch { response.status(422).json({ detail: "Invalid event cursor" }); return; }
    try { await input.store.read(id, scope.caseId, scope.ownerId); }
    catch { response.status(404).json({ detail: "Investigation not found" }); return; }
    const controller = new AbortController();
    const closed = () => controller.abort();
    response.once("close", closed);
    request.once("aborted", closed);
    request.socket.once("close", closed);
    response.set({ "content-type": "text/event-stream", "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no" });
    response.flushHeaders();
    try {
      await streamInvestigationEvents({ response, store: input.store, id, caseId: scope.caseId,
        ownerId: scope.ownerId, cursor, signal: controller.signal,
        expiresAt: Math.min(Date.now() + 25_000, scope.expiresAt * 1000) });
      response.end();
    } catch { response.destroy(); }
    finally {
      response.off("close", closed); request.off("aborted", closed); request.socket.off("close", closed);
      controller.abort();
    }
  });

  router.get("/:id/history", async (request, response) => {
    const id = request.params.id;
    if (typeof id !== "string" || !z.uuid().safeParse(id).success) {
      response.status(404).json({ detail: "Investigation not found" }); return;
    }
    let scope;
    try { scope = scopeFor(request, id); }
    catch { response.status(401).json({ detail: "Invalid service scope" }); return; }
    try { response.json(await input.store.history(id, scope.caseId, scope.ownerId)); }
    catch { response.status(404).json({ detail: "Investigation history unavailable" }); }
  });

  router.get("/:id", async (request, response) => {
    const id = request.params.id;
    if (typeof id !== "string" || !z.uuid().safeParse(id).success) {
      response.status(404).json({ detail: "Investigation not found" }); return;
    }
    let scope;
    try { scope = scopeFor(request, id); }
    catch { response.status(401).json({ detail: "Invalid service scope" }); return; }
    try { response.json(await input.store.read(id, scope.caseId, scope.ownerId)); }
    catch { response.status(404).json({ detail: "Investigation not found" }); }
  });

  router.post("/:id/decision", async (request, response) => {
    const id = request.params.id;
    const parsed = z.object({ decisionId: z.uuid(), decision: z.enum(["approve", "reject",
      "mark_owner_action_required", "escalate_to_engineering", "resolve_without_replay", "blocked"]) })
      .strict().safeParse(request.body);
    if (typeof id !== "string" || !z.uuid().safeParse(id).success || !parsed.success) {
      response.status(422).json({ detail: "Invalid decision" }); return;
    }
    let scope;
    try { scope = scopeFor(request, id); }
    catch { response.status(401).json({ detail: "Invalid service scope" }); return; }
    try {
      const job = await input.store.read(id, scope.caseId, scope.ownerId);
      if (!input.resumeDecision) throw new Error("Decision resume unavailable");
      const applied = await input.store.applyDecision(id, scope.caseId, scope.ownerId,
        parsed.data.decisionId, parsed.data.decision);
      await input.resumeDecision(job.checkpointThreadId,
        { id: parsed.data.decisionId, decision: parsed.data.decision });
      response.json(applied);
    } catch { response.status(409).json({ detail: "Decision could not be applied" }); }
  });
  return router;
}
