import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GeminiDiagnosisModel } from "../gemini-model.ts";
import type { DiagnosisPrompt } from "../contracts.ts";

type FetchLike = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

// Exercise the actual serving adapter's countTokens payload, intercepting its
// generateContent request locally. This function can never dispatch generation.
export async function countServingPrompt(prompt: DiagnosisPrompt, key: string,
  fetcher: FetchLike = globalThis.fetch): Promise<{ status: number | null;
    countedInputTokens: number | null; tokenBudgetAccepted: boolean;
    failure: string | null; networkCode: string | null }> {
  let status: number | null = null, countedInputTokens: number | null = null;
  let failure: string | null = null, networkCode: string | null = null;
  const model = new GeminiDiagnosisModel({ apiKey: key, model: "gemini-3.5-flash-lite",
    api: "generate-content", maxOutputTokens: 2048, maxTotalTokens: 64_000,
    fetch: async (url, init) => {
      if (!String(url).endsWith(":countTokens")) throw new Error("generation_dispatch_forbidden");
      const response = await fetcher(url, init);
      status = response.status;
      if (response.ok) {
        try {
          const parsed = await response.clone().json() as { totalTokens?: unknown };
          if (Number.isInteger(parsed.totalTokens) && Number(parsed.totalTokens) >= 0)
            countedInputTokens = Number(parsed.totalTokens);
        } catch { /* The serving adapter will reject the same malformed response. */ }
      }
      return response;
    } });
  try {
    await model.generate(prompt, AbortSignal.timeout(15_000));
    failure = "generation_intercept_missing";
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message !== "Gemini Interactions request failed" || countedInputTokens === null)
      failure = status === 429 ? "quota_429_stop" : "count_preflight_failed";
    const cause = error instanceof Error ? error.cause : null;
    const code = cause && typeof cause === "object" && "code" in cause ? cause.code :
      cause && typeof cause === "object" && "cause" in cause && cause.cause &&
      typeof cause.cause === "object" && "code" in cause.cause ? cause.cause.code : null;
    if (typeof code === "string" && /^[A-Z_]{2,32}$/.test(code)) networkCode = code;
  } finally { await model.close(); }
  const tokenBudgetAccepted = countedInputTokens !== null && countedInputTokens + 2048 <= 64_000;
  if (countedInputTokens !== null && !tokenBudgetAccepted) failure = "serving_token_budget_rejected";
  return { status, countedInputTokens, tokenBudgetAccepted, failure, networkCode };
}

export async function runTaskCPreflight(directory: string, key: string,
  fetcher: FetchLike = globalThis.fetch, sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms)),
  now = Date.now) {
  directory = resolve(directory);
  const manifest = JSON.parse(await readFile(join(directory, "result-manifest.json"), "utf8"));
  for (const [name, expected] of Object.entries(manifest.artifacts as Record<string, string>))
    if (sha(await readFile(join(directory, name))) !== expected)
      throw new Error(`Task C artifact changed before provider request: ${name}`);
  const freeze = JSON.parse(await readFile(join(directory, "method-freeze.json"), "utf8"));
  if (freeze.freeTierEvidence.exactCredentialProjectAndCurrentTierVerified !== true ||
      freeze.freeTierEvidence.countTokensPreflightAllowed !== true ||
      freeze.budget.monetaryCeilingUsd !== 0 ||
      freeze.diagnosis.model !== "gemini-3.5-flash-lite") throw new Error("Free-tier preflight freeze required");
  for (const [name, expected] of Object.entries(freeze.sourceHashes as Record<string, string>))
    if (name.startsWith("apps/ai_agent/src/") && sha(await readFile(join(root, name))) !== expected)
      throw new Error(`Serving source changed before provider request: ${name}`);
  const captures = JSON.parse(await readFile(join(directory, "captures.json"), "utf8"));
  if (captures.length !== 12 || new Set(captures.map((item: { caseId: string }) => item.caseId)).size !== 12)
    throw new Error("Exactly 24 frozen paired preflight payloads required");
  let lastStart = 0;
  const rows = [];
  for (const capture of captures) for (const arm of ["keyword-production", "minilm-procedure-question"] as const) {
    const wait = lastStart + 30_000 - now();
    if (wait > 0) await sleep(wait);
    lastStart = now();
    const row = { caseId: capture.caseId, arm, startedAt: lastStart,
      status: null as number | null, countedInputTokens: null as number | null,
      outputLimitTokens: 2048, totalLimitTokens: 64_000, latencyMs: null as number | null,
      failure: null as string | null, networkCode: null as string | null,
      tokenBudgetAccepted: false };
    const path = join(directory, `preflight-${capture.caseId}-${arm}.json`);
    await writeFile(path, JSON.stringify({ ...row, state: "started" }) + "\n", { flag: "wx" });
    const start = performance.now();
    try {
      Object.assign(row, await countServingPrompt(capture.prompts[arm], key, fetcher));
    } catch { row.failure = "count_preflight_failed"; }
    row.latencyMs = performance.now() - start;
    await writeFile(path, JSON.stringify({ ...row, state: "finished" }) + "\n");
    rows.push(row);
    if (row.failure || row.status === 429) return rows;
  }
  return rows;
}

export async function preflightConfiguredTaskC(directory: string) {
  const content = await readFile("apps/ai_agent/.env", "utf8");
  const line = content.split(/\r?\n/).find(value => value.startsWith("GEMINI_API_KEY="));
  const model = content.split(/\r?\n/).find(value => value.startsWith("GEMINI_MODEL="))
    ?.slice("GEMINI_MODEL=".length).trim();
  if (model !== "gemini-3.5-flash-lite") throw new Error("Configured model differs from Task C freeze");
  const key = line?.slice("GEMINI_API_KEY=".length).trim().replace(/^['"]|['"]$/g, "");
  if (!key) throw new Error("Configured GEMINI_API_KEY unavailable");
  const rows = await runTaskCPreflight(directory, key);
  return { preflights: rows.length, lastStatus: rows.at(-1)?.status ?? null,
    lastFailure: rows.at(-1)?.failure ?? null };
}
