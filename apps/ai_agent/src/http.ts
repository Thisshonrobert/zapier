import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import express, { type ErrorRequestHandler } from "express";

import { PreviewRequestSchema, type DiagnosisModel } from "./contracts.ts";
import {
  GraphStepLimitExceeded,
  InvestigationTimeout,
  InvalidModelOutput,
  ModelTimeout,
  type PreviewOptions,
  ToolBudgetExceeded,
  buildPreviewService,
} from "./graph.ts";
import {
  FixtureFailureContextTool,
  FixtureNotFound,
} from "./tools/failure-context.ts";

type HttpServerOptions = {
  fixtureDirectory: string;
  model: DiagnosisModel;
  previewOptions?: PreviewOptions;
};

export type RunningHttpServer = {
  baseUrl: string;
  close(): Promise<void>;
};

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export function createHttpServer({
  fixtureDirectory,
  model,
  previewOptions,
}: HttpServerOptions) {
  const app = express();
  const previewService = buildPreviewService(
    new FixtureFailureContextTool(fixtureDirectory),
    model,
    previewOptions,
  );
  app.use(express.json({ limit: "16kb" }));

  app.post("/investigations/preview", async (request, response) => {
    const parsed = PreviewRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(422).json({ detail: "Invalid request" });
      return;
    }

    try {
      response.json(await previewService.preview(parsed.data.fixture_id));
    } catch (error) {
      if (error instanceof FixtureNotFound) {
        response.status(404).json({ detail: "Fixture not found" });
      } else if (error instanceof ModelTimeout) {
        response.status(504).json({ detail: "Diagnosis timed out" });
      } else if (error instanceof InvestigationTimeout) {
        response.status(504).json({ detail: "Investigation timed out" });
      } else if (error instanceof InvalidModelOutput) {
        response.status(502).json({ detail: "Diagnosis output was invalid" });
      } else if (error instanceof ToolBudgetExceeded) {
        response.status(503).json({ detail: "Tool budget exhausted" });
      } else if (error instanceof GraphStepLimitExceeded) {
        response.status(503).json({ detail: "Graph step limit exhausted" });
      } else {
        response.status(500).json({ detail: "Internal server error" });
      }
    }
  });

  const jsonErrorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    next,
  ) => {
    if (error && typeof error === "object" && "type" in error) {
      if (error.type === "entity.too.large") {
        response.status(413).json({ detail: "Request body too large" });
        return;
      }
      if (error.type === "entity.parse.failed") {
        response.status(400).json({ detail: "Malformed JSON" });
        return;
      }
    }
    next(error);
  };
  app.use(jsonErrorHandler);

  return {
    async start(port: number): Promise<RunningHttpServer> {
      const server = createServer(app);
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
      });
      const address = server.address() as AddressInfo;
      let closed = false;
      return {
        baseUrl: `http://127.0.0.1:${address.port}`,
        async close() {
          if (closed) return;
          closed = true;
          await closeServer(server);
          await model.close();
        },
      };
    },
  };
}
