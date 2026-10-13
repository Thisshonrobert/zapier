// Development-only pilot. No planner, judge, repair, retry or model fallback.
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  appendFile,
} from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  IntegratedModelOutputSchema,
  type IntegratedDiagnosisModel,
  type DiagnosisPrompt,
} from "../contracts.ts";
import {
  buildDiagnosisService,
  retrievalInput,
  type IntegratedInvestigationTools,
} from "../graph.ts";
import { buildDiagnosisPrompt } from "../prompts.ts";
import {
  GeminiDiagnosisModel,
  ModelProviderError,
  GEMINI_DIAGNOSIS_SCHEMA,
} from "../gemini-model.ts";
import { loadRunbooks, searchRunbooks } from "../tools/search-runbooks.ts";
import {
  CapturedEvaluationContextSchema,
  EvaluationCaseSchema,
} from "./checks.ts";
import { oracleContext } from "./retrieval-investigation.ts";
import { redactText } from "./retrieval-agentic.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const frozen =
  "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4";
const capture = "apps/ai_agent/evaluation/phase-11a-baseline-v6";
const ids = ["f03-permission-ambiguous", "f07-provider-response-lost"] as const;
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
export const pilotHash = (v: unknown) =>
  createHash("sha256").update(json(v)).digest("hex");
const fileHash = (v: string) => createHash("sha256").update(v).digest("hex");
const safe = (v: unknown) =>
  JSON.parse(
    JSON.stringify(v, (_k, x) => (typeof x === "string" ? redactText(x) : x)),
  );
const settings = {
  model: "gemini-3.5-flash-lite",
  api: "generate-content" as const,
  maxOutputTokens: 4096,
  maxTotalTokens: 64_000,
  maxRepairAttempts: 0 as const,
  modelTimeoutMs: 15_000,
  maxPromptCharacters: 48_000,
  providerDefaults: true,
  schemaHash: pilotHash(GEMINI_DIAGNOSIS_SCHEMA),
};

export async function prepareOraclePilot() {
  const manifest = JSON.parse(
    await readFile(join(root, frozen, "manifest.json"), "utf8"),
  );
  const reportText = await readFile(join(root, frozen, "report.json"), "utf8");
  if (fileHash(reportText) !== manifest.reportHash)
    throw new Error("Frozen report changed");
  const report = JSON.parse(reportText);
  const readFrozen = async (name: string) => {
    const text = await readFile(join(root, name), "utf8");
    if (fileHash(text) !== manifest.inputHashes[name])
      throw new Error("Frozen input changed");
    return JSON.parse(text);
  };
  const cases = EvaluationCaseSchema.array().parse(
    await readFrozen(`${capture}/cases.json`),
  );
  const contexts = CapturedEvaluationContextSchema.array().parse(
    await readFrozen(`${capture}/contexts.json`),
  );
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const serialized = index.map((s) => ({
    ...s,
    headingTerms: [...s.headingTerms],
    contentTerms: [...s.contentTerms],
  }));
  if (fileHash(json(serialized)) !== manifest.corpusHash)
    throw new Error("Frozen corpus changed");
  const pairs = ids.map((caseId) => {
    const item = cases.find((c) => c.case_id === caseId);
    const context = contexts.find((c) => c.case_id === caseId);
    const reviewed = report.oraclePairs.find(
      (p: { id: string }) => p.id === caseId,
    );
    if (
      item?.split !== "development" ||
      !context?.evidence ||
      context.failure ||
      context.rejection ||
      !reviewed?.modelCallsAllowed
    )
      throw new Error(`Invalid pilot pair: ${caseId}`);
    const input = retrievalInput(context.evidence);
    const baseline = searchRunbooks(index, input);
    const oracle = oracleContext(index, input, reviewed.oracle);
    const baselinePrompt = buildDiagnosisPrompt(context.evidence, baseline);
    const oraclePrompt = buildDiagnosisPrompt(context.evidence, oracle);
    if (
      json(input) !== json(context.retrieval?.input) ||
      json(baseline) !== json(context.retrieval?.matches) ||
      json(baselinePrompt) !== json(reviewed.baselinePrompt) ||
      json(oraclePrompt) !== json(reviewed.oraclePrompt)
    )
      throw new Error(`Frozen prompt parity failed: ${caseId}`);
    if (
      baselinePrompt.instructions !== oraclePrompt.instructions ||
      baselinePrompt.input === oraclePrompt.input
    )
      throw new Error(`Invalid or identical pilot pair: ${caseId}`);
    return {
      caseId,
      evidence: context.evidence,
      baseline,
      oracle,
      baselinePrompt,
      oraclePrompt,
      providerEligible: true,
      differs: true,
      review: reviewed.review,
    };
  });
  return {
    settings,
    sourceReportHash: manifest.reportHash,
    sourceInputHashes: {
      cases: manifest.inputHashes[`${capture}/cases.json`],
      contexts: manifest.inputHashes[`${capture}/contexts.json`],
      corpus: manifest.corpusHash,
    },
    pairs,
  };
}
type Plan = Awaited<ReturnType<typeof prepareOraclePilot>>;
type PilotRow = {
  caseId: string;
  variant: "baseline" | "oracle";
  attempts: number;
  startedAt: number;
  promptHash: string;
  configHash: string;
  output: unknown;
  usage: unknown;
  latencyMs: number;
  schemaValid: boolean;
  citationMembership: boolean | null;
  serviceValid: boolean;
  providerError: ModelProviderError["details"] | null;
  failure: string | null;
};

type FetchLike = (
  url: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
export async function pilotFetch(
  out: string,
  options: {
    generationLimit?: number;
    fetch?: FetchLike;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<FetchLike> {
  const generationLimit = options.generationLimit ?? 4;
  if (generationLimit !== 4 && generationLimit !== 6) throw new Error("Unsupported pilot generation limit");
  const path = join(out, "requests.jsonl");
  const events = (await readdir(out)).includes("requests.jsonl")
    ? (await readFile(path, "utf8"))
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l))
    : [];
  let count = events.filter(
    (r) => r.phase === "start" && r.operation === "generateContent",
  ).length;
  let lastStart = Math.max(
    0,
    ...events
      .filter((r) => r.phase === "start" && r.operation === "generateContent")
      .map((r) => r.at),
  );
  let blocked = false;
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  return async (url, init) => {
    const operation = String(url).endsWith(":countTokens")
      ? "countTokens"
      : String(url).endsWith(":generateContent")
        ? "generateContent"
        : null;
    if (
      !operation ||
      String(url) !==
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:${operation}`
    )
      throw new Error("Unexpected provider endpoint");
    if (blocked)
      throw new Error("Pilot provider blocked; explicit follow-up required");
    if (operation === "generateContent") {
      if (count >= generationLimit) throw new Error(`Pilot ${generationLimit === 4 ? "four" : "six"}-generation limit`);
      const wait = lastStart + 10_000 - now();
      if (wait > 0) await sleep(wait);
      count++;
      lastStart = now();
    }
    const at = now(),
      requestId = events.length + 1;
    const event = { phase: "start", requestId, operation, at };
    await appendFile(path, JSON.stringify(event) + "\n");
    events.push(event);
    try {
      const response = await (options.fetch ?? fetch)(url, init);
      const retry = response.headers.get("retry-after");
      const delay = retry
        ? Math.max(
            0,
            Number.isFinite(Number(retry))
              ? Number(retry) * 1000
              : Date.parse(retry) - now(),
          )
        : 0;
      blocked = !response.ok;
      await appendFile(
        path,
        JSON.stringify({
          phase: "finish",
          requestId,
          operation,
          at: now(),
          status: response.status,
          retryAfterMs: delay,
          latencyMs: now() - at,
        }) + "\n",
      );
      return response;
    } catch {
      blocked = true;
      await appendFile(
        path,
        JSON.stringify({
          phase: "finish",
          requestId,
          operation,
          at: now(),
          status: null,
          latencyMs: now() - at,
        }) + "\n",
      );
      throw new Error("Provider network failure");
    }
  };
}

export async function executeOraclePilot(
  plan: Plan,
  out: string,
  options: {
    model: IntegratedDiagnosisModel;
    resume?: boolean;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    lastRequestAt?: number;
    retryAfterMs?: number;
  },
) {
  if (
    json(plan.settings) !== json(settings) ||
    json(plan.pairs.map((p) => p.caseId)) !== json(ids) ||
    plan.pairs.some((p) => !p.providerEligible || !p.differs)
  )
    throw new Error("Invalid pilot plan");
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const existing = await readdir(out);
  const prior = existing.filter((n) => /^slot-[1-4]\.started\.json$/.test(n));
  if (prior.length && !options.resume)
    throw new Error(
      "Unfinished/completed pilot requires explicit resume follow-up",
    );
  const binding = pilotHash(plan);
  if (existing.includes("binding.json")) {
    if (
      JSON.parse(await readFile(join(out, "binding.json"), "utf8")).planHash !==
      binding
    )
      throw new Error("Resume plan changed");
  } else
    await writeFile(join(out, "binding.json"), json({ planHash: binding }), {
      flag: "wx",
    });
  let lastStart = 0;
  let notBefore =
    options.lastRequestAt === undefined
      ? 0
      : options.lastRequestAt + Math.max(60_000, options.retryAfterMs ?? 0);
  for (const name of prior) {
    const start = JSON.parse(await readFile(join(out, name), "utf8"));
    lastStart = Math.max(lastStart, start.startedAt);
    // Unknown/interrupted attempts also get a conservative cooldown on explicit resume.
    notBefore = Math.max(notBefore, start.startedAt + 60_000);
  }
  const rows: PilotRow[] = [];
  let slot = 0;
  for (const [i, pair] of plan.pairs.entries()) {
    const order =
      i === 0
        ? (["baseline", "oracle"] as const)
        : (["oracle", "baseline"] as const);
    for (const variant of order) {
      slot++;
      if (prior.includes(`slot-${slot}.started.json`)) continue;
      const wait = Math.max(notBefore, lastStart + 10_000) - now();
      if (wait > 0) await sleep(wait);
      const prompt = pair[`${variant}Prompt`];
      const startedAt = now();
      lastStart = startedAt;
      const row: PilotRow = {
        caseId: pair.caseId,
        variant,
        attempts: 0,
        startedAt,
        promptHash: pilotHash(prompt),
        configHash: pilotHash(settings),
        output: null,
        usage: null,
        latencyMs: 0,
        schemaValid: false,
        citationMembership: null,
        serviceValid: false,
        providerError: null,
        failure: null,
      };
      await writeFile(join(out, `slot-${slot}.started.json`), json(row), {
        flag: "wx",
      });
      const matches = pair[variant];
      const read = async (value: unknown) => structuredClone(value);
      const tools: IntegratedInvestigationTools = {
        getFailureContext: () => read(pair.evidence.failureContext),
        getExecutionEvidence: () => read(pair.evidence.executionEvidence),
        validateActionInputs: () => read(pair.evidence.inputValidation),
        searchRunbooks: async () => matches,
      };
      const bounded: IntegratedDiagnosisModel = {
        async close() {},
        async generate(actual: DiagnosisPrompt, signal) {
          if (row.attempts || pilotHash(actual) !== row.promptHash)
            throw new Error("Pilot invocation or prompt changed");
          row.attempts++;
          const start = performance.now();
          try {
            const generated = await options.model.generate(actual, signal);
            row.output = safe(generated.output);
            row.usage = generated.usage;
            const parsed = IntegratedModelOutputSchema.safeParse(
              generated.output,
            );
            row.schemaValid = parsed.success;
            row.citationMembership = parsed.success
              ? parsed.data.proposal.runbook_citations.every((c) =>
                  matches.some((m) => m.citation === c),
                )
              : null;
            if (
              generated.usage.total_tokens > 64_000 ||
              generated.usage.output_tokens > 4096
            )
              throw new Error("Pilot token bounds exceeded");
            return generated;
          } catch (error) {
            row.failure = "generation_failed";
            if (error instanceof ModelProviderError) {
              row.providerError = error.details;
              row.usage = error.usage;
            }
            throw error;
          } finally {
            row.latencyMs = performance.now() - start;
            // Save raw output before service validation, even when semantic/schema guards reject it.
            await writeFile(join(out, `attempt-${slot}.json`), json(row), {
              flag: "wx",
            });
          }
        },
      };
      try {
        await buildDiagnosisService(tools, bounded, {
          allowSimulatedEvidence: true,
          maxRepairAttempts: 0,
          maxModelTokens: 64_000,
          maxPromptCharacters: 48_000,
          modelTimeoutMs: 15_000,
          investigationTimeoutMs: 600_000,
        }).diagnose();
        row.serviceValid = true;
      } catch {
        row.failure ??= "service_validation_or_deadline_failed";
      }
      await writeFile(join(out, `result-${slot}.json`), json(row), {
        flag: "wx",
      });
      rows.push(row);
      if (
        row.failure === "generation_failed" ||
        row.attempts !== 1 ||
        (row.failure === "service_validation_or_deadline_failed" &&
          row.output === null)
      )
        return rows;
    }
  }
  return rows;
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      output: { type: "string" },
      execute: { type: "boolean" },
      resume: { type: "boolean" },
      confirmation: { type: "string" },
    },
  });
  if (!values.output) throw new Error("New pilot output directory required");
  const out = resolve(root, values.output);
  const rel = relative(
    join(root, "apps/ai_agent/evaluation/retrieval-investigation/runs"),
    out,
  );
  if (!rel || rel.startsWith("..") || resolve(out) === root)
    throw new Error("Invalid pilot output directory");
  const plan = await prepareOraclePilot();
  if (!values.execute) {
    await mkdir(out); // Existing/frozen directories are never overwritten.
    await writeFile(join(out, "plan.json"), json(plan), { flag: "wx" });
    console.log("Pilot prepared offline; zero provider requests.");
  } else {
    if (
      json(JSON.parse(await readFile(join(out, "plan.json"), "utf8"))) !==
      json(plan)
    )
      throw new Error("Prepared plan changed");
    if (!values.confirmation)
      throw new Error("Free-tier project/key confirmation required");
    const confirmation = JSON.parse(
      await readFile(values.confirmation, "utf8"),
    );
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    if (
      !apiKey ||
      confirmation.keyHash !== pilotHash(apiKey) ||
      confirmation.project !== "gen-lang-client-0124525712" ||
      confirmation.freeTier !== true ||
      confirmation.freeGeneration !== true ||
      confirmation.model !== settings.model ||
      Date.now() - confirmation.verifiedAt > 3_600_000 ||
      confirmation.verifiedAt > Date.now()
    )
      throw new Error("Missing/current free-tier credential confirmation");
    const requestsPath = join(out, "requests.jsonl");
    const requests = (await readdir(out)).includes("requests.jsonl")
      ? (await readFile(requestsPath, "utf8"))
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l))
      : [];
    let lastRequestAt = confirmation.lastRateLimitRequestAt as
      | number
      | undefined;
    let retryAfterMs = confirmation.retryAfterMs as number | undefined;
    for (const r of requests)
      if (r.phase === "finish" && (r.status === 429 || r.status === null)) {
        lastRequestAt = Math.max(lastRequestAt ?? 0, r.at);
        retryAfterMs = Math.max(retryAfterMs ?? 0, r.retryAfterMs ?? 0);
      }
    const auditedFetch = await pilotFetch(out);
    const model = new GeminiDiagnosisModel({
      apiKey,
      ...settings,
      fetch: auditedFetch,
    });
    try {
      const rows = await executeOraclePilot(plan, out, {
        model,
        resume: values.resume,
        lastRequestAt,
        retryAfterMs,
      });
      console.log(
        json(
          rows.map(
            ({
              caseId,
              variant,
              schemaValid,
              serviceValid,
              failure,
              usage,
              latencyMs,
            }) => ({
              caseId,
              variant,
              schemaValid,
              serviceValid,
              failure,
              usage,
              latencyMs,
            }),
          ),
        ),
      );
    } finally {
      await model.close();
    }
  }
}
