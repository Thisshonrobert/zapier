// Development-only, resumable Task C diagnosis. Never writes production investigations.
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { IntegratedModelOutputSchema, type DiagnosisPrompt } from "../contracts.ts";
import { buildDiagnosisService } from "../graph.ts";
import { GeminiDiagnosisModel, ModelProviderError } from "../gemini-model.ts";
import { operationalLimits } from "../operational-limits.ts";
import { loadRunbooks } from "../tools/search-runbooks.ts";
import { buildDiagnosisPrompt } from "../prompts.ts";
import { redactText } from "./retrieval-agentic.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const source = join(root, "apps/ai_agent/evaluation/production-selection/runs/task-c-20261013-final-v3");
const outputRoot = join(root, "apps/ai_agent/evaluation/production-selection/runs");
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
type FetchLike = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;
type Slot = { slot: number; caseId: string; arm: "keyword-production" | "minilm-procedure-question";
  repetition: number; promptHash: string; retrievalHash: string; countedInputTokens: number;
  preflightRecord: string; preflightRecordSha256: string };
type Capture = { caseId: string; evidence: any; arms: Record<string, { matches: any[] }>;
  prompts: Record<string, DiagnosisPrompt> };

export async function readTaskCFreeze() {
  const manifestText = await readFile(join(source, "result-manifest.json"), "utf8");
  const manifest = JSON.parse(manifestText);
  for (const [name, expected] of Object.entries(manifest.artifacts as Record<string, string>))
    if (sha(await readFile(join(source, name))) !== expected)
      throw new Error(`Frozen Task C artifact changed: ${name}`);
  const freeze = JSON.parse(await readFile(join(source, "method-freeze.json"), "utf8"));
  if (freeze.scheduledAttempts !== 72 || freeze.retries !== 0 ||
      freeze.taskBDecision !== "no_candidate_passes" || freeze.releaseEligible !== false ||
      freeze.diagnosis.model !== "gemini-3.5-flash-lite" ||
      freeze.diagnosis.maxOutputTokens !== 2048 || freeze.diagnosis.maxTotalTokensPreflight !== 64000 ||
      freeze.budget.monetaryCeilingUsd !== 0 ||
      freeze.freeTierEvidence.exactCredentialProjectAndCurrentTierVerified !== true)
    throw new Error("Task C generation freeze is ineligible");
  let commentOnlySourceChange: { name: string; originalHash: string; currentHash: string;
    exactChange: string } | null = null;
  for (const [name, expected] of Object.entries(freeze.sourceHashes as Record<string, string>)) {
    if (!name.startsWith("apps/ai_agent/src/")) continue;
    const current = await readFile(join(root, name), "utf8");
    if (sha(current) === expected) continue;
    if (name === "apps/ai_agent/src/tools/search-runbooks.ts" &&
        current.split("// provides procedural guidance \r\n").length === 2 &&
        sha(current.replace("// provides procedural guidance \r\n", "")) === expected) {
      commentOnlySourceChange = { name, originalHash: expected,
        currentHash: sha(current), exactChange: "one added procedural-guidance comment at line 2" };
      continue;
    }
    throw new Error(`Serving source changed: ${name}`);
  }
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const currentCorpusHash = sha(json(index.map(({ headingTerms, contentTerms, ...section }) => section)));
  if (currentCorpusHash !== freeze.corpusHash)
    throw new Error("Serving runbook corpus changed since Task C count preflight");
  for (const [name, expected] of Object.entries(freeze.modelAssetHashes as Record<string, string>))
    if (sha(await readFile(join(root, name))) !== expected)
      throw new Error(`MiniLM asset changed: ${name}`);
  const captures = JSON.parse(await readFile(join(source, "captures.json"), "utf8")) as Capture[];
  const schedule = (await readFile(join(source, "schedule.jsonl"), "utf8"))
    .trim().split(/\r?\n/).map(line => JSON.parse(line) as Slot);
  if (captures.length !== 12 || schedule.length !== 72 ||
      new Set(schedule.map(row => row.slot)).size !== 72 ||
      schedule.some((row, index) => row.slot !== index + 1))
    throw new Error("Task C slot denominator changed");
  for (const row of schedule) {
    const capture = captures.find(item => item.caseId === row.caseId);
    if (!capture || !["keyword-production", "minilm-procedure-question"].includes(row.arm) ||
        !Number.isInteger(row.countedInputTokens) || row.countedInputTokens + 2048 > 64000 ||
        sha(json(capture.prompts[row.arm])) !== row.promptHash ||
        json(buildDiagnosisPrompt(capture.evidence, capture.arms[row.arm]!.matches)) !==
          json(capture.prompts[row.arm]) ||
        sha(json(capture.arms[row.arm])) !== row.retrievalHash ||
        sha(await readFile(join(source, "../task-c-20261013-v7", row.preflightRecord))) !== row.preflightRecordSha256)
      throw new Error(`Frozen Task C slot changed: ${row.slot}`);
  }
  return { manifestHash: sha(manifestText), freeze, captures, schedule,
    commentOnlySourceChange, currentCorpusHash };
}

export async function prepareTaskCExecution(directory: string) {
  directory = resolve(directory);
  if (!directory.startsWith(outputRoot + "\\") && !directory.startsWith(outputRoot + "/"))
    throw new Error("Task C execution output must be inside production-selection runs");
  const frozen = await readTaskCFreeze();
  await mkdir(directory);
  const policy = {
    status: "development_diagnostic_only", sourceManifestHash: frozen.manifestHash,
    sourceDirectory: source, scheduledSlots: 72, maxAttemptsIncludingFailures: 72,
    noAutomaticRetry: true, model: "gemini-3.5-flash-lite", monetaryCeilingUsd: 0,
    credentialProjectTier: "user_attested_gen-lang-client-0124525712_Free_2026-10-13",
    successorSourceFreeze: { originalManifestHash: frozen.manifestHash,
      commentOnlySourceChange: frozen.commentOnlySourceChange,
      corpusHash: frozen.currentCorpusHash,
      capturesHash: sha(await readFile(join(source, "captures.json"))),
      scheduleHash: sha(await readFile(join(source, "schedule.jsonl"))),
      countedPayloads: "24 immutable successful v7 count records, exact prompt hashes rechecked" },
    reservation: { tokens: 64000, cents: 16, rollingHours: 24,
      admission: "all production reservations plus all Task C evaluation reservations, globally",
      maxTokens: 256000, maxCents: 100, maxRequests: 20,
      activeProductionInvestigationMustBeZero: true,
      sameProductionAdvisoryLock: 812084, maxNewSlotsThisInvocation: 4,
      productionClaimsIncludeEvaluationReservations: true },
    provider: { perAttempt: "serving countTokens then generateContent, at most two HTTP calls",
      minimumAttemptStartSpacingMs: 65000, modelDeadlineMs: 15000,
      stopOnProviderFailureOr429: true, continueAfterValidationRejection: true,
      noPaidFallback: true },
    acceptance: "schema and service validation are separate from pending semantic and human release review",
    controlledSources: {
      executor: sha(await readFile(join(root, "apps/ai_agent/src/evaluation/task-c-execute.ts"))),
      store: sha(await readFile(join(root, "apps/ai_agent/src/investigation-store.ts"))),
      migration: sha(await readFile(join(root, "apps/ai_agent/migrations/0006_task_c_evaluation_reservation.sql"))),
      redaction: sha(await readFile(join(root, "apps/ai_agent/src/evaluation/retrieval-agentic.ts"))),
    },
  };
  await writeFile(join(directory, "execution-freeze.json"), json(policy), { flag: "wx" });
  return policy;
}

export async function reserveTaskCSlot(pool: pg.Pool, manifestHash: string, slot: number) {
  if (!/^[0-9a-f]{64}$/.test(manifestHash) || !Number.isInteger(slot) || slot < 1 || slot > 72)
    throw new Error("Invalid frozen Task C reservation identity");
  const limits = operationalLimits("gemini-3.5-flash-lite");
  const capTokens = Math.min(256000, limits.ownerTokenBudgetPerDay, limits.operatorTokenBudgetPerDay);
  const capCents = Math.min(100, limits.ownerSpendCentsPerDay || 100,
    limits.operatorSpendCentsPerDay || 100);
  const capRequests = Math.min(20, limits.ownerRequestsPerDay, limits.operatorRequestsPerDay);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(812084)");
    const existing = await client.query(`SELECT 1 FROM ai_agent.task_c_evaluation_reservation
      WHERE source_manifest_hash=$1 AND slot=$2`, [manifestHash, slot]);
    if (existing.rowCount) { await client.query("ROLLBACK"); return "already_reserved" as const; }
    const { rows: [budget] } = await client.query<{ tokens: string; cents: string;
      requests: number; active: number; eval_in_progress: number; stopped: number;
      last_provider_started_at: Date | null }>(`
      SELECT
        (SELECT coalesce(sum(reserved_tokens),0) FROM ai_agent.investigation_budget WHERE created_at>now()-interval '24 hours')
          + (SELECT coalesce(sum(reserved_tokens),0) FROM ai_agent.task_c_evaluation_reservation WHERE started_at>now()-interval '24 hours') AS tokens,
        (SELECT coalesce(sum(reserved_cents),0) FROM ai_agent.investigation_budget WHERE created_at>now()-interval '24 hours')
          + (SELECT coalesce(sum(reserved_cents),0) FROM ai_agent.task_c_evaluation_reservation WHERE started_at>now()-interval '24 hours') AS cents,
        (SELECT count(*)::int FROM ai_agent.investigation WHERE created_at>now()-interval '24 hours')
          + (SELECT count(*)::int FROM ai_agent.task_c_evaluation_reservation WHERE started_at>now()-interval '24 hours') AS requests,
        (SELECT count(*)::int FROM ai_agent.investigation WHERE status IN ('queued','investigating')) AS active,
        (SELECT count(*)::int FROM ai_agent.task_c_evaluation_reservation WHERE state='reserved') AS eval_in_progress,
        (SELECT count(*)::int FROM ai_agent.task_c_evaluation_reservation
          WHERE source_manifest_hash=$1 AND stop_reason IS NOT NULL) AS stopped,
        (SELECT max(provider_first_started_at) FROM ai_agent.task_c_evaluation_reservation)
          AS last_provider_started_at`, [manifestHash]);
    if (!budget || Number(budget.tokens) + 64000 > capTokens ||
        Number(budget.cents) + 16 > capCents || budget.requests + 1 > capRequests ||
        budget.active > 0 || budget.eval_in_progress > 0 || budget.stopped > 0) {
      await client.query("ROLLBACK"); return "allowance_unavailable" as const;
    }
    await client.query(`INSERT INTO ai_agent.task_c_evaluation_reservation
      (source_manifest_hash,slot,reserved_tokens,reserved_cents,state) VALUES ($1,$2,64000,16,'reserved')`,
    [manifestHash, slot]);
    await client.query("COMMIT");
    return { state: "reserved" as const,
      notBefore: Math.max(Date.now(), budget.last_provider_started_at
        ? new Date(budget.last_provider_started_at).getTime() + 65000 : 0) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function executeTaskC(directory: string, pool: pg.Pool, key: string,
  fetcher: FetchLike = globalThis.fetch, sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms)),
  now = Date.now) {
  directory = resolve(directory);
  const frozen = await readTaskCFreeze();
  const policy = JSON.parse(await readFile(join(directory, "execution-freeze.json"), "utf8"));
  if (policy.sourceManifestHash !== frozen.manifestHash || policy.scheduledSlots !== 72 ||
      policy.model !== "gemini-3.5-flash-lite" || policy.monetaryCeilingUsd !== 0 ||
      policy.provider.minimumAttemptStartSpacingMs !== 65000)
    throw new Error("Execution policy differs from frozen Task C source");
  if (JSON.stringify(policy.successorSourceFreeze?.commentOnlySourceChange) !==
      JSON.stringify(frozen.commentOnlySourceChange) ||
      policy.successorSourceFreeze?.corpusHash !== frozen.currentCorpusHash)
    throw new Error("Task C successor source freeze changed");
  for (const [name, expected] of Object.entries({
    "apps/ai_agent/src/evaluation/task-c-execute.ts": policy.controlledSources?.executor,
    "apps/ai_agent/src/investigation-store.ts": policy.controlledSources?.store,
    "apps/ai_agent/migrations/0006_task_c_evaluation_reservation.sql": policy.controlledSources?.migration,
    "apps/ai_agent/src/evaluation/retrieval-agentic.ts": policy.controlledSources?.redaction,
  })) if (typeof expected !== "string" || sha(await readFile(join(root, name))) !== expected)
    throw new Error(`Task C execution control changed: ${name}`);
  if (!key) throw new Error("Configured Gemini credential unavailable");
  const names = await readdir(directory);
  const priorStarts = names.filter(name => /^started-\d+\.json$/.test(name));
  let lastStart = 0;
  for (const name of priorStarts) lastStart = Math.max(lastStart,
    JSON.parse(await readFile(join(directory, name), "utf8")).startedAt);
  const results = [];
  for (const slot of frozen.schedule) {
    if (results.length >= 4) break;
    const reservation = await reserveTaskCSlot(pool, frozen.manifestHash, slot.slot);
    if (reservation === "already_reserved") continue;
    if (reservation === "allowance_unavailable") break;
    const capture = frozen.captures.find(item => item.caseId === slot.caseId)!;
    const prompt = capture.prompts[slot.arm]!;
    const matches = capture.arms[slot.arm]!.matches;
    const wait = Math.max(lastStart + 65000, reservation.notBefore) - now();
    if (wait > 0) await sleep(wait);
    lastStart = now();
    const row = { slot: slot.slot, caseId: slot.caseId, arm: slot.arm,
      repetition: slot.repetition, startedAt: lastStart, reservation: "64000 tokens; 16 cents",
      countedInputTokens: null as number | null, output: null as unknown,
      usage: null as unknown, latencyMs: null as number | null,
      schemaValid: null as boolean | null, serviceAccepted: null as boolean | null,
      semanticReview: null, humanReleaseAcceptance: null,
      failure: null as string | null, providerError: null as unknown,
      requestStatuses: [] as (number | null)[] };
    await writeFile(join(directory, `started-${slot.slot}.json`), json(row), { flag: "wx" });
    let requestNumber = 0;
    const measuredFetch: FetchLike = async (url, init) => {
      const operation = String(url).endsWith(":countTokens") ? "countTokens" : "generateContent";
      if (++requestNumber > 2) throw new Error("Task C provider request budget exceeded");
      if (operation === "countTokens") await pool.query(`UPDATE ai_agent.task_c_evaluation_reservation
        SET provider_first_started_at=now() WHERE source_manifest_hash=$1 AND slot=$2
          AND provider_first_started_at IS NULL`, [frozen.manifestHash, slot.slot]);
      const request = { slot: slot.slot, requestNumber, operation, startedAt: now(),
        status: null as number | null, latencyMs: null as number | null,
        countedInputTokens: null as number | null, state: "started" };
      const path = join(directory, `request-${slot.slot}-${requestNumber}.json`);
      await writeFile(path, json(request), { flag: "wx" });
      const started = performance.now();
      try {
        const response = await fetcher(url, init);
        request.status = response.status;
        if (operation === "countTokens" && response.ok) {
          try { const body = await response.clone().json() as { totalTokens?: unknown };
            if (Number.isInteger(body.totalTokens)) request.countedInputTokens = Number(body.totalTokens);
          } catch { /* Adapter rejects invalid count responses. */ }
        }
        return response;
      } finally {
        request.latencyMs = performance.now() - started;
        request.state = "finished";
        row.requestStatuses.push(request.status);
        if (operation === "countTokens") row.countedInputTokens = request.countedInputTokens;
        await writeFile(path, json(request));
      }
    };
    const model = new GeminiDiagnosisModel({ apiKey: key, model: "gemini-3.5-flash-lite",
      api: "generate-content", maxOutputTokens: 2048, maxTotalTokens: 64000, fetch: measuredFetch });
    const started = performance.now();
    try {
      const generated = await model.generate(prompt, AbortSignal.timeout(15000));
      row.output = JSON.parse(JSON.stringify(generated.output,
        (_key, value) => typeof value === "string" ? redactText(value) : value));
      row.usage = generated.usage;
      row.schemaValid = IntegratedModelOutputSchema.safeParse(generated.output).success;
      try {
        const read = async <T>(value: T) => structuredClone(value);
        await buildDiagnosisService({
          getFailureContext: () => read(capture.evidence.failureContext),
          getExecutionEvidence: () => read(capture.evidence.executionEvidence),
          validateActionInputs: () => read(capture.evidence.inputValidation),
          searchRunbooks: async () => matches,
        }, { close: async () => {}, generate: async () => generated }, {
          allowSimulatedEvidence: true, maxRepairAttempts: 0,
          modelTimeoutMs: 15000, investigationTimeoutMs: 60000,
          maxModelTokens: 8000, maxPromptCharacters: 16000,
        }).diagnose();
        row.serviceAccepted = true;
      } catch { row.serviceAccepted = false; row.failure = "service_validation_rejected"; }
    } catch (error) {
      row.failure = "generation_failed";
      if (error instanceof ModelProviderError) {
        row.providerError = error.details;
        row.usage = error.usage;
      }
    } finally { row.latencyMs = performance.now() - started; await model.close(); }
    await writeFile(join(directory, `result-${slot.slot}.json`), json(row), { flag: "wx" });
    await pool.query(`UPDATE ai_agent.task_c_evaluation_reservation SET state='finished',
      stop_reason=$3
      WHERE source_manifest_hash=$1 AND slot=$2`, [frozen.manifestHash, slot.slot,
      row.failure === "generation_failed" ? "provider_failure_manual_review" : null]);
    results.push(row);
    if (row.failure === "generation_failed" || row.requestStatuses.includes(429)) break;
  }
  return results;
}

if (import.meta.main) {
  const directory = process.argv[2];
  if (!directory) throw new Error("Task C execution directory required");
  const config = Object.fromEntries((await readFile(join(root, "apps/ai_agent/.env"), "utf8"))
    .split(/\r?\n/).filter(line => line && !line.startsWith("#") && line.includes("="))
    .map(line => { const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
  if (config.GEMINI_MODEL !== "gemini-3.5-flash-lite" || !config.AI_AGENT_DATABASE_URL ||
      !config.GEMINI_API_KEY) throw new Error("Exact configured Task C credential, model, and DB required");
  const pool = new pg.Pool({ connectionString: config.AI_AGENT_DATABASE_URL, max: 1,
    connectionTimeoutMillis: 5000, query_timeout: 5000, statement_timeout: 5000 });
  try {
    if (process.argv[3] === "prepare") console.log(JSON.stringify(await prepareTaskCExecution(directory)));
    else if (process.argv[3] === "execute") {
      const result = await executeTaskC(directory, pool, config.GEMINI_API_KEY);
      console.log(JSON.stringify({ started: result.length, failures: result.filter(row => row.failure).length,
        http429: result.some(row => row.requestStatuses.includes(429)) }));
    } else throw new Error("Use prepare or execute");
  } finally { await pool.end(); }
}
