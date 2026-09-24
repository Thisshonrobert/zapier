import { Router } from "express";

import { verifyServiceScope } from "../../../packages/triage-contracts/index.ts";
import { BackendClient, BackendReadTimeout, BackendResponseError } from "./clients/backend.ts";
import { BackendFailureContextTool } from "./tools/failure-context.ts";
import { BackendExecutionEvidenceTool } from "./tools/execution-evidence.ts";
import { BackendValidateActionInputsTool } from "./tools/validate-action-inputs.ts";

const bearer = (header: string | undefined) =>
  header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

export function createPrivateToolsRouter(input: {
  backendBaseUrl: string;
  serviceSecret: string;
  timeoutMs?: number;
  now?: () => Date;
}) {
  const router = Router();
  router.get("/failure-context", async (request, response) => {
    try {
      const token = bearer(request.headers.authorization);
      if (!token) throw new Error("missing service scope");
      const scope = verifyServiceScope(token, {
        secret: input.serviceSecret,
        operation: "failure_context",
        now: input.now?.(),
      });
      if (scope.correlationId !== request.headers["x-correlation-id"])
        throw new Error("service scope binding mismatch");
      const client = new BackendClient({
        baseUrl: input.backendBaseUrl,
        scopeToken: token,
        serviceSecret: input.serviceSecret,
        timeoutMs: input.timeoutMs,
      });
      response.json(await new BackendFailureContextTool(client).get());
    } catch (error) {
      if (error instanceof BackendReadTimeout) response.status(504).json({ detail: "Evidence read timed out" });
      else if (error instanceof BackendResponseError) response.status(502).json({ detail: "Evidence backend unavailable" });
      else response.status(401).json({ detail: "Invalid service scope" });
    }
  });
  router.get("/execution-evidence", async (request, response) => {
    try {
      const token = bearer(request.headers.authorization);
      if (!token) throw new Error("missing service scope");
      const scope = verifyServiceScope(token, {
        secret: input.serviceSecret,
        operation: "execution_evidence",
        now: input.now?.(),
      });
      if (scope.correlationId !== request.headers["x-correlation-id"])
        throw new Error("service scope binding mismatch");
      const client = new BackendClient({
        baseUrl: input.backendBaseUrl,
        scopeToken: token,
        serviceSecret: input.serviceSecret,
        timeoutMs: input.timeoutMs,
      });
      const historyLimit = Number(request.query.historyLimit ?? 10);
      response.json(await new BackendExecutionEvidenceTool(client).get(historyLimit));
    } catch (error) {
      if (error instanceof BackendReadTimeout) response.status(504).json({ detail: "Evidence read timed out" });
      else if (error instanceof BackendResponseError) response.status(502).json({ detail: "Evidence backend unavailable" });
      else response.status(401).json({ detail: "Invalid service scope" });
    }
  });
  router.post("/validate-action-inputs", async (request, response) => {
    try {
      const token = bearer(request.headers.authorization);
      if (!token) throw new Error("missing service scope");
      const scope = verifyServiceScope(token, {
        secret: input.serviceSecret,
        operation: "validate_action_inputs",
        now: input.now?.(),
      });
      if (scope.correlationId !== request.headers["x-correlation-id"])
        throw new Error("service scope binding mismatch");
      const client = new BackendClient({
        baseUrl: input.backendBaseUrl,
        scopeToken: token,
        serviceSecret: input.serviceSecret,
        timeoutMs: input.timeoutMs,
      });
      response.json(await new BackendValidateActionInputsTool(client).validate());
    } catch (error) {
      if (error instanceof BackendReadTimeout) response.status(504).json({ detail: "Evidence read timed out" });
      else if (error instanceof BackendResponseError) response.status(502).json({ detail: "Evidence backend unavailable" });
      else response.status(401).json({ detail: "Invalid service scope" });
    }
  });
  return router;
}
