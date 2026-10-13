// Development-only paired initial generations. Production retrieval/prompt stay intact.
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { IntegratedModelOutputSchema, type IntegratedDiagnosisModel } from "../contracts.ts";
import { buildDiagnosisService, retrievalInput } from "../graph.ts";
import { buildDiagnosisPrompt } from "../prompts.ts";
import { GeminiDiagnosisModel, ModelProviderError } from "../gemini-model.ts";
import { loadRunbooks, searchRunbooks } from "../tools/search-runbooks.ts";
import { CapturedEvaluationContextSchema, EvaluationCaseSchema } from "./checks.ts";
import { prepareOraclePilot, pilotHash, pilotFetch } from "./oracle-pilot.ts";
import { redactText } from "./retrieval-agentic.ts";
import { buildCausalDiagnosisPrompt, buildCausalDiagnosisPromptV2, CAUSAL_PROMPT_VERSION, CAUSAL_V2_PROMPT_VERSION, diagnosisConsistencyIssues, repairEvidenceIssue } from "./causal-diagnosis.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const ids = ["f03-permission-ambiguous", "f04-invalid-destination"];
export async function prepareCausalPilot(version: "v1" | "v2" = "v1") {
  // Reuse the prior pilot's frozen source/corpus validation; no provider requests.
  const source = await prepareOraclePilot();
  const cases = EvaluationCaseSchema.array().parse(JSON.parse(await readFile(join(root, "apps/ai_agent/evaluation/phase-11a-baseline-v6/cases.json"), "utf8")));
  const contexts = CapturedEvaluationContextSchema.array().parse(JSON.parse(await readFile(join(root, "apps/ai_agent/evaluation/phase-11a-baseline-v6/contexts.json"), "utf8")));
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const selectedIds = version === "v2" ? [...ids, "f07-provider-response-lost"] : ids;
  const pairs = selectedIds.map(caseId => {
    if (cases.find(c => c.case_id === caseId)?.split !== "development") throw new Error("Only selected development cases are allowed");
    const context = contexts.find(c => c.case_id === caseId)!;
    if (!context.evidence || context.failure || context.rejection) throw new Error("Missing authorized development capture");
    const input = retrievalInput(context.evidence);
    const matches = searchRunbooks(index, input);
    if (json(input) !== json(context.retrieval?.input) || json(matches) !== json(context.retrieval?.matches)) throw new Error("Frozen retrieval parity failed");
    const current = buildDiagnosisPrompt(context.evidence, matches);
    const candidate = (version === "v2" ? buildCausalDiagnosisPromptV2 : buildCausalDiagnosisPrompt)(context.evidence, matches);
    if (current.input !== candidate.input) throw new Error("Candidate changed evidence/retrieval");
    return { caseId, evidence: context.evidence, retrieval: { input, matches }, current, candidate };
  });
  return { experiment: version === "v2" ? CAUSAL_V2_PROMPT_VERSION : CAUSAL_PROMPT_VERSION, settings: source.settings, sourceInputHashes: source.sourceInputHashes, pairs };
}
type Plan = Awaited<ReturnType<typeof prepareCausalPilot>>;

export function confirmFreeTier(value: unknown, key: string, now = Date.now(), reuseConfirmedAccess = false) {
  const c = value as Record<string, unknown> | null;
  if (!c || !key || c.keyHash !== pilotHash(key) || c.project !== "gen-lang-client-0124525712" ||
    c.model !== "gemini-3.5-flash-lite" || c.freeTier !== true || c.freeGeneration !== true ||
    typeof c.verifiedAt !== "number" || !Number.isFinite(c.verifiedAt) || c.verifiedAt > now || (!reuseConfirmedAccess && now - c.verifiedAt > 3_600_000)) {
    throw new Error("Current confirmation for the existing free-tier project/key required");
  }
}

export async function executeCausalPilot(plan: Plan, out: string, model: IntegratedDiagnosisModel, options: {
  now?: () => number; sleep?: (ms: number) => Promise<void>; resume?: boolean;
} = {}) {
  const v2 = plan.experiment === CAUSAL_V2_PROMPT_VERSION;
  if (v2 && options.resume) throw new Error("v2 cannot resume after a provider stop");
  if (pilotHash(plan) !== pilotHash(await prepareCausalPilot(v2 ? "v2" : "v1"))) throw new Error("Prepared plan changed");
  const existing = await readdir(out);
  const prior = existing.filter(n => /^started-\d+\.json$/.test(n));
  if (prior.length && !options.resume) throw new Error("Pilot already attempted; do not repeat generations");
  if (options.resume && existing.includes("requests.jsonl")) {
    const audit = (await readFile(join(out, "requests.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
    if (audit.some(event => event.phase === "finish" && (event.status === 429 || event.status === null))) throw new Error("Stopped provider audit cannot resume");
    if (audit.some(event => event.phase === "start" && !audit.some(finish => finish.phase === "finish" && finish.requestId === event.requestId))) throw new Error("Unfinished provider request cannot resume");
  }
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let lastStart = 0, slot = 0;
  for (const name of prior) lastStart = Math.max(lastStart, JSON.parse(await readFile(join(out, name), "utf8")).startedAt);
  const rows = [];
  try {
    for (const [i, pair] of plan.pairs.entries()) for (const variant of i % 2 === 0 ? ["current", "candidate"] as const : ["candidate", "current"] as const) {
      slot++;
      if (prior.includes(`started-${slot}.json`)) continue; // Never retry a started slot, including failures.
      controller.signal.throwIfAborted();
      const wait = lastStart + 10_000 - now();
      if (wait > 0) await sleep(wait);
      controller.signal.throwIfAborted();
      const prompt = pair[variant];
      if (prompt.instructions.length + prompt.input.length > 48_000) throw new Error("Prompt budget exceeded");
      lastStart = now();
      const row = {
        caseId: pair.caseId, variant, promptVersion: variant === "candidate" ? plan.experiment : "phase-11a-v3",
        promptHash: pilotHash(prompt), retrievalHash: pilotHash(pair.retrieval), settingsHash: pilotHash(plan.settings),
        startedAt: lastStart, output: null as unknown, usage: null as unknown, latencyMs: 0,
        schemaValid: false, serviceValid: false, repairEvidenceIssue: null as string | null,
        consistencyIssues: null as string[] | null,
        failure: null as string | null, providerError: null as unknown,
      };
      await writeFile(join(out, `started-${slot}.json`), json(row), { flag: "wx" });
      const start = performance.now();
      try {
        const generated = await model.generate(prompt, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]));
        row.latencyMs = performance.now() - start;
        row.output = JSON.parse(JSON.stringify(generated.output, (_key, v) => typeof v === "string" ? redactText(v) : v));
        row.usage = generated.usage;
        // Preserve the initial output even when schema/service/advisory gates reject it.
        await writeFile(join(out, `attempt-${slot}.json`), json(row), { flag: "wx" });
        if (generated.usage.total_tokens > 64_000 || generated.usage.output_tokens > 4096) throw new Error("Provider token budget exceeded");
        const parsed = IntegratedModelOutputSchema.safeParse(generated.output);
        row.schemaValid = parsed.success;
        if (parsed.success) {
          row.repairEvidenceIssue = repairEvidenceIssue(pair.evidence, parsed.data);
          row.consistencyIssues = diagnosisConsistencyIssues(pair.evidence, parsed.data);
        }
        const read = async <T>(value: T) => structuredClone(value);
        try {
          // Offline service validation of the already generated object, zero extra provider calls.
          await buildDiagnosisService({
            getFailureContext: () => read(pair.evidence.failureContext),
            getExecutionEvidence: () => read(pair.evidence.executionEvidence),
            validateActionInputs: () => read(pair.evidence.inputValidation),
            searchRunbooks: async () => pair.retrieval.matches,
          }, { close: async () => {}, generate: async () => generated }, {
            allowSimulatedEvidence: true, maxRepairAttempts: 0,
          }).diagnose();
          row.serviceValid = true;
        } catch { row.failure = "service_validation_failed"; }
      } catch (error) {
        row.latencyMs = performance.now() - start;
        row.failure = "generation_failed";
        if (error instanceof ModelProviderError) {
          row.providerError = error.details;
          row.usage = error.usage;
        }
      }
      await writeFile(join(out, `result-${slot}.json`), json(row), { flag: "wx" });
      rows.push(row);
      if (row.failure === "generation_failed") return rows;
    }
    return rows;
  } finally { clearTimeout(timer); controller.abort(); }
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { output: { type: "string" }, execute: { type: "boolean" }, confirmation: { type: "string" }, "candidate-v2": { type: "boolean" }, "reuse-confirmed-free-tier": { type: "boolean" } } });
  if (!values.output) throw new Error("New output directory required");
  const out = resolve(root, values.output);
  const rel = relative(join(root, "apps/ai_agent/evaluation/causal-diagnosis/runs"), out);
  if (!rel || rel.startsWith("..") || resolve(rel) === rel) throw new Error("Output outside experimental runs");
  const plan = await prepareCausalPilot(values["candidate-v2"] ? "v2" : "v1");
  if (!values.execute) {
    await mkdir(out, { recursive: true });
    await writeFile(join(out, "plan.json"), json(plan), { flag: "wx" });
    console.log(`Prepared ${plan.pairs.length * 2}-generation comparison offline; zero provider requests.`);
  } else {
    if (pilotHash(JSON.parse(await readFile(join(out, "plan.json"), "utf8"))) !== pilotHash(plan)) throw new Error("Saved plan changed");
    if (!values.confirmation) throw new Error("Free-tier confirmation required");
    const confirmation = JSON.parse(await readFile(values.confirmation, "utf8"));
    const key = process.env.GEMINI_API_KEY ?? "";
    confirmFreeTier(confirmation, key, Date.now(), values["reuse-confirmed-free-tier"]);
    await writeFile(join(out, "access.json"), json({
      recordedAt: Date.now(), project: confirmation.project, model: confirmation.model,
      confirmationHash: pilotHash(confirmation), originalVerifiedAt: confirmation.verifiedAt,
      reuseConfirmedAccess: values["reuse-confirmed-free-tier"] === true,
      availabilityCheck: "first planned generation; no extra smoke-test generation",
    }), { flag: "wx" });
    const model = new GeminiDiagnosisModel({ apiKey: key, ...plan.settings, fetch: await pilotFetch(out, { generationLimit: plan.pairs.length * 2 }) });
    try {
      const rows = await executeCausalPilot(plan, out, model);
      await writeFile(join(out, "report.json"), json({ experiment: plan.experiment, complete: rows.length === plan.pairs.length * 2 && rows.every(r => r.failure !== "generation_failed"), generations: rows.length, rows }), { flag: "wx" });
      console.log(json(rows.map(({ output: _output, ...row }) => row)));
    } finally { await model.close(); }
  }
}
