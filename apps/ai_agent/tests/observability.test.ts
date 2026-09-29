import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createLangfuseExporter,
  InvestigationTracer,
} from "../src/observability.ts";

test("Langfuse OTLP exporter sends only allowlisted trace fields", async () => {
  let sent: RequestInit | undefined;
  const exporter = createLangfuseExporter({
    baseUrl: "https://cloud.langfuse.com",
    publicKey: "public-test",
    secretKey: "secret-test",
    fetch: async (_url, init) => {
      sent = init;
      return new Response(null, { status: 200 });
    },
  });
  const tracer = new InvestigationTracer(
    { export: (trace) => exporter.export(trace) },
    "phase-6-v1",
    "phase-6-v1",
  );
  await tracer.observe(
    "model.generate",
    "generation",
    async () => ({
      secret: "customer payload",
      usage: { input: 7, output: 2, total: 9 },
    }),
    ({ usage }) => ({ model: "gemini-test", usage }),
  );
  tracer.finish(new Error("customer@example.com secret-key"));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const body = String(sent?.body);
  const payload = JSON.parse(body);
  const spans = payload.resourceSpans[0].scopeSpans[0].spans;
  assert.equal(spans.length, 2);
  assert.equal(spans[1].parentSpanId, spans[0].spanId);
  assert.match(body, /phase-6-v1/);
  assert.deepEqual(
    JSON.parse(
      spans[1].attributes.find(
        (item: { key: string }) =>
          item.key === "langfuse.observation.usage_details",
      ).value.stringValue,
    ),
    { input: 7, output: 2, total: 9 },
  );
  assert.doesNotMatch(
    body,
    /customer payload|customer@example.com|secret-key|public-test|secret-test/,
  );
  assert.equal(
    (sent?.headers as Record<string, string>)["x-langfuse-ingestion-version"],
    "4",
  );
});

test("rejected export is detached from investigation result", async () => {
  const tracer = new InvestigationTracer(
    {
      export: async () => {
        throw new Error("offline");
      },
    },
    "phase-6-v1",
    "phase-6-v1",
  );
  const result = await tracer.observe(
    "getFailureContext",
    "tool",
    async () => "safe result",
  );
  tracer.finish();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(result, "safe result");
});
