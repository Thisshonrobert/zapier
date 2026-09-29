import { randomBytes } from "node:crypto";

import type { ModelUsage } from "./contracts.ts";

export type TraceSpan = {
  id: string;
  parentId?: string;
  name:
    | "investigation"
    | "getFailureContext"
    | "getExecutionEvidence"
    | "validateActionInputs"
    | "searchRunbooks"
    | "model.generate";
  kind: "agent" | "tool" | "retriever" | "generation";
  startedAt: number;
  endedAt: number;
  status: "ok" | "error";
  errorType?:
    | "timeout"
    | "invalid_output"
    | "budget"
    | "provider"
    | "tool"
    | "unknown";
  usage?: { input: number; output: number; total: number };
  model?: string;
  attempt?: number;
  graphVersion?: string;
  promptVersion?: string;
  runbookVersions?: string[];
};

export type InvestigationTrace = { id: string; spans: TraceSpan[] };
export interface TraceExporter {
  export(trace: InvestigationTrace): Promise<void> | void;
}

const safeVersion = (value: string) =>
  /^[a-zA-Z0-9._@-]{1,80}$/.test(value) ? value : "unknown";
const errorType = (error: unknown): TraceSpan["errorType"] => {
  const name = error instanceof Error ? error.constructor.name : "";
  if (/Timeout$/.test(name)) return "timeout";
  if (name === "InvalidModelOutput" || name === "ZodError")
    return "invalid_output";
  if (/BudgetExceeded$|GraphStepLimitExceeded/.test(name)) return "budget";
  if (name === "ModelProviderError") return "provider";
  if (name === "BackendResponseError" || name === "BackendReadTimeout")
    return "tool";
  return "unknown";
};

export class InvestigationTracer {
  readonly trace: InvestigationTrace = {
    id: randomBytes(16).toString("hex"),
    spans: [],
  };
  private readonly root: TraceSpan;
  private readonly exporter: TraceExporter;

  constructor(
    exporter: TraceExporter,
    graphVersion: string,
    promptVersion: string,
  ) {
    this.exporter = exporter;
    const now = Date.now();
    this.root = {
      id: randomBytes(8).toString("hex"),
      name: "investigation",
      kind: "agent",
      startedAt: now,
      endedAt: now,
      status: "ok",
      graphVersion: safeVersion(graphVersion),
      promptVersion: safeVersion(promptVersion),
    };
    this.trace.spans.push(this.root);
  }

  async observe<T>(
    name: TraceSpan["name"],
    kind: TraceSpan["kind"],
    operation: () => Promise<T> | T,
    details?: (
      value: T,
    ) => Partial<
      Pick<TraceSpan, "usage" | "model" | "attempt" | "runbookVersions">
    >,
  ): Promise<T> {
    const now = Date.now();
    const span: TraceSpan = {
      id: randomBytes(8).toString("hex"),
      parentId: this.root.id,
      name,
      kind,
      startedAt: now,
      endedAt: now,
      status: "ok",
    };
    this.trace.spans.push(span);
    try {
      const value = await operation();
      if (details) Object.assign(span, details(value));
      return value;
    } catch (error) {
      span.status = "error";
      span.errorType = errorType(error);
      throw error;
    } finally {
      span.endedAt = Date.now();
    }
  }

  finish(error?: unknown) {
    this.root.endedAt = Date.now();
    if (error !== undefined) {
      this.root.status = "error";
      this.root.errorType = errorType(error);
    }
    // Export is deliberately detached from diagnosis; neither a throw nor a rejected
    // promise can change the result or leak the exporter error into an API response.
    try {
      void Promise.resolve(
        this.exporter.export({
          id: this.trace.id,
          spans: this.trace.spans.map((span) => ({ ...span })),
        }),
      ).catch(() => {});
    } catch {
      /* observability is best effort */
    }
  }
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export function createLangfuseExporter(options: {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  fetch?: FetchLike;
}): TraceExporter {
  const endpoint = new URL("/api/public/otel/v1/traces", options.baseUrl);
  if (
    endpoint.protocol !== "https:" &&
    endpoint.hostname !== "127.0.0.1" &&
    endpoint.hostname !== "localhost"
  ) {
    throw new Error("Langfuse URL must use HTTPS outside localhost");
  }
  const send = options.fetch ?? globalThis.fetch;
  const attribute = (key: string, value: string) => ({
    key,
    value: { stringValue: value },
  });
  return {
    async export(trace) {
      const spans = trace.spans.map((span) => {
        const attributes = [attribute("langfuse.observation.type", span.kind)];
        if (span.graphVersion)
          attributes.push(
            attribute(
              "langfuse.observation.metadata.graph_version",
              span.graphVersion,
            ),
          );
        if (span.promptVersion)
          attributes.push(
            attribute(
              "langfuse.observation.metadata.prompt_version",
              span.promptVersion,
            ),
          );
        if (span.runbookVersions)
          attributes.push(
            attribute(
              "langfuse.observation.metadata.runbook_versions",
              JSON.stringify(span.runbookVersions),
            ),
          );
        if (span.model)
          attributes.push(
            attribute("langfuse.observation.model.name", span.model),
          );
        if (span.attempt !== undefined)
          attributes.push(
            attribute(
              "langfuse.observation.metadata.attempt",
              String(span.attempt),
            ),
          );
        if (span.usage)
          attributes.push(
            attribute(
              "langfuse.observation.usage_details",
              JSON.stringify(span.usage),
            ),
          );
        if (span.status === "error") {
          attributes.push(attribute("langfuse.observation.level", "ERROR"));
          attributes.push(
            attribute(
              "langfuse.observation.status_message",
              span.errorType ?? "unknown",
            ),
          );
        }
        return {
          traceId: trace.id,
          spanId: span.id,
          ...(span.parentId ? { parentSpanId: span.parentId } : {}),
          name: span.name,
          startTimeUnixNano: String(BigInt(span.startedAt) * 1_000_000n),
          endTimeUnixNano: String(BigInt(span.endedAt) * 1_000_000n),
          attributes,
        };
      });
      const response = await send(endpoint, {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${options.publicKey}:${options.secretKey}`).toString("base64")}`,
          "content-type": "application/json",
          "x-langfuse-ingestion-version": "4",
        },
        body: JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans }] }] }),
        signal: AbortSignal.timeout(1_000),
      });
      if (!response.ok) throw new Error("Langfuse export failed");
    },
  };
}

export const safeModelUsage = (usage: ModelUsage) => ({
  input: usage.input_tokens,
  output: usage.output_tokens,
  total: usage.total_tokens,
});
export const safeIdentifier = safeVersion;
