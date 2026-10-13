import { expect, test } from "bun:test";
import { countServingPrompt, runTaskCPreflight } from "../src/evaluation/task-c-preflight.ts";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const prompt = { instructions: "Investigate", input: "{}" };
test("preflight sends the serving count request without generation and records actual tokens", async () => {
  const endpoints: string[] = [];
  const result = await countServingPrompt(prompt, "offline-key", async (url) => {
    endpoints.push(String(url));
    return new Response(JSON.stringify({ totalTokens: 141 }), { status: 200 });
  });
  expect(result).toEqual({ status: 200, countedInputTokens: 141,
    tokenBudgetAccepted: true, failure: null, networkCode: null });
  expect(endpoints).toHaveLength(1);
  expect(endpoints[0]).toEndWith(":countTokens");
});

test("quota response fails closed and never sends generation", async () => {
  let calls = 0;
  const result = await countServingPrompt(prompt, "offline-key", async () => {
    calls++;
    return new Response("{}", { status: 429 });
  });
  expect(result.status).toBe(429);
  expect(result.countedInputTokens).toBeNull();
  expect(calls).toBe(1);
});

test("preflight rejects a counted payload outside the serving token ceiling", async () => {
  let calls = 0;
  const result = await countServingPrompt(prompt, "offline-key", async () => {
    calls++;
    return new Response(JSON.stringify({ totalTokens: 63_000 }), { status: 200 });
  });
  expect(result).toMatchObject({ countedInputTokens: 63_000,
    tokenBudgetAccepted: false, failure: "serving_token_budget_rejected" });
  expect(calls).toBe(1);
});

test("changed frozen source blocks preflight before any provider request", async () => {
  const directory = await mkdtemp(join(process.cwd(), "task-c-test-"));
  try {
    const freeze = JSON.stringify({ freeTierEvidence: { exactCredentialProjectAndCurrentTierVerified: true,
      countTokensPreflightAllowed: true }, budget: { monetaryCeilingUsd: 0 },
      diagnosis: { model: "gemini-3.5-flash-lite" },
      sourceHashes: { "apps/ai_agent/src/prompts.ts": "wrong" } });
    await writeFile(join(directory, "method-freeze.json"), freeze);
    await writeFile(join(directory, "result-manifest.json"), JSON.stringify({
      artifacts: { "method-freeze.json": createHash("sha256").update(freeze).digest("hex") } }));
    let calls = 0;
    await expect(runTaskCPreflight(directory, "offline-key", async () => {
      calls++; return new Response("{}", { status: 200 });
    })).rejects.toThrow("Serving source changed");
    expect(calls).toBe(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("a first-request quota response stops the 24-payload run with one durable failure", async () => {
  const directory = await mkdtemp(join(process.cwd(), "task-c-quota-"));
  try {
    const freeze = JSON.stringify({ freeTierEvidence: { exactCredentialProjectAndCurrentTierVerified: true,
      countTokensPreflightAllowed: true }, budget: { monetaryCeilingUsd: 0 },
      diagnosis: { model: "gemini-3.5-flash-lite" }, sourceHashes: {} });
    const captures = JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ caseId: `c${i}`,
      prompts: { "keyword-production": prompt, "minilm-procedure-question": prompt } })));
    await writeFile(join(directory, "method-freeze.json"), freeze);
    await writeFile(join(directory, "captures.json"), captures);
    const digest = (value: string) => createHash("sha256").update(value).digest("hex");
    await writeFile(join(directory, "result-manifest.json"), JSON.stringify({ artifacts: {
      "method-freeze.json": digest(freeze), "captures.json": digest(captures) } }));
    let calls = 0;
    const rows = await runTaskCPreflight(directory, "offline-key", async () => {
      calls++; return new Response("{}", { status: 429 });
    });
    expect(calls).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 429, failure: "quota_429_stop" });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
