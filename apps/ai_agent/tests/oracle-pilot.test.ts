import { expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  prepareOraclePilot,
  executeOraclePilot,
  pilotFetch,
} from "../src/evaluation/oracle-pilot.ts";
import { stubDiagnosis } from "../src/evaluation/agentic-experiment.ts";

test("pilot persists four single attempts in counterbalanced order, without repairing invalid output", async () => {
  const plan = await prepareOraclePilot();
  const out = await mkdtemp(join(tmpdir(), "oracle-pilot-"));
  let now = 100_000;
  const starts: number[] = [];
  const rows = await executeOraclePilot(plan, out, {
    model: {
      async close() {},
      async generate(p, s) {
        starts.push(now);
        const value = await stubDiagnosis.generate(p, s);
        return starts.length === 1 ? { ...value, output: {} } : value;
      },
    },
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
    lastRequestAt: 90_000,
    retryAfterMs: 70_000,
  });
  expect(rows.map((r) => `${r.caseId}/${r.variant}`)).toEqual([
    "f03-permission-ambiguous/baseline",
    "f03-permission-ambiguous/oracle",
    "f07-provider-response-lost/oracle",
    "f07-provider-response-lost/baseline",
  ]);
  expect(starts).toEqual([160_000, 170_000, 180_000, 190_000]);
  expect(rows[0]!.schemaValid).toBe(false);
  expect(rows.every((r) => r.attempts === 1)).toBe(true);
  expect(
    JSON.parse(await readFile(join(out, "attempt-1.json"), "utf8")).output,
  ).toEqual({});
  await expect(
    executeOraclePilot(plan, out, { model: stubDiagnosis }),
  ).rejects.toThrow("explicit resume");
  expect(
    await executeOraclePilot(plan, out, { model: stubDiagnosis, resume: true }),
  ).toEqual([]);
});

test("provider audit separates preflights, spaces actual generation starts and refuses a fifth generation", async () => {
  const out = await mkdtemp(join(tmpdir(), "oracle-pilot-fetch-"));
  let now = 100_000;
  const audit = await pilotFetch(out, {
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
    fetch: async () => new Response("{}", { status: 200 }),
  });
  const base =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:";
  for (let i = 0; i < 4; i++) {
    await audit(base + "countTokens");
    await audit(base + "generateContent");
  }
  await expect(audit(base + "generateContent")).rejects.toThrow(
    "four-generation",
  );
  const events = (await readFile(join(out, "requests.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  expect(
    events.filter((r) => r.phase === "start" && r.operation === "countTokens"),
  ).toHaveLength(4);
  expect(
    events
      .filter((r) => r.phase === "start" && r.operation === "generateContent")
      .map((r) => r.at),
  ).toEqual([100_000, 110_000, 120_000, 130_000]);
});

test("pilot stops on provider failure, retains safe audit and skips failed attempts on explicit resume", async () => {
  const { ModelProviderError } = await import("../src/gemini-model.ts");
  const plan = await prepareOraclePilot();
  const out = await mkdtemp(join(tmpdir(), "oracle-pilot-failure-"));
  const rows = await executeOraclePilot(plan, out, {
    model: {
      async close() {},
      async generate() {
        throw new ModelProviderError(
          "secret must not be logged",
          undefined,
          null,
          { category: "http_error", http_status: 429 },
        );
      },
    },
  });
  expect(rows).toHaveLength(1);
  expect(rows[0]!.providerError?.http_status).toBe(429);
  expect(await readFile(join(out, "attempt-1.json"), "utf8")).not.toContain(
    "secret must",
  );
  let now = Date.now() + 120_000;
  const resumed = await executeOraclePilot(plan, out, {
    model: stubDiagnosis,
    resume: true,
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
  });
  expect(resumed).toHaveLength(3);
  expect(resumed[0]!.variant).toBe("oracle");
});

test("a blocked token preflight stops the pilot without any generation request", async () => {
  const { GeminiDiagnosisModel } = await import("../src/gemini-model.ts");
  const out = await mkdtemp(join(tmpdir(), "oracle-pilot-preflight-"));
  const fetcher = await pilotFetch(out, {
    fetch: async () =>
      new Response("", { status: 429, headers: { "retry-after": "120" } }),
  });
  const model = new GeminiDiagnosisModel({
    apiKey: "offline-test-key",
    model: "gemini-3.5-flash-lite",
    api: "generate-content",
    maxTotalTokens: 64_000,
    fetch: fetcher,
  });
  const rows = await executeOraclePilot(await prepareOraclePilot(), out, {
    model,
  });
  expect(rows).toHaveLength(1);
  expect(rows[0]!.providerError?.http_status).toBe(429);
  const audit = await readFile(join(out, "requests.jsonl"), "utf8");
  expect(audit).not.toContain("generateContent");
  expect(audit).toContain('"retryAfterMs":120000');
});
