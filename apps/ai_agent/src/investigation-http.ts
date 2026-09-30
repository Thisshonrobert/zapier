import { Router } from "express";
import { z } from "zod";

import { verifyServiceScope } from "../../../packages/triage-contracts/index.ts";
import { InvestigationStore } from "./investigation-store.ts";
import type { InvestigationDecision } from "./graph.ts";

const startSchema = z.object({
  id: z.uuid(), caseId: z.uuid(), zapRunId: z.uuid(), stage: z.number().int().min(0).max(1000),
  subjectOwnerId: z.number().int().positive(), actorId: z.number().int().positive(),
  supportOperatorId: z.number().int().positive(), idempotencyKey: z.uuid(),
}).strict();
const bearer = (header: string | undefined) =>
  header?.startsWith("Bearer ") ? header.slice(7) : undefined;

export function createInvestigationRouter(input: { serviceSecret: string; store: InvestigationStore;
  resumeDecision?: (threadId: string, decision: InvestigationDecision) => Promise<unknown> }) {
  const router = Router();
  const scopeFor = (request: { headers: Record<string, unknown> }, id: string) => {
    const token = bearer(request.headers.authorization as string | undefined);
    if (!token) throw new Error("missing scope");
    const scope = verifyServiceScope(token, { secret: input.serviceSecret, operation: "failure_context" });
    if (scope.investigationId !== id || scope.correlationId !== request.headers["x-correlation-id"])
      throw new Error("scope binding mismatch");
    return scope;
  };

  router.post("/", async (request, response) => {
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
