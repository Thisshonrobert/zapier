import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { hash, metrics } from "./retrieval-r21.ts";
import { validateSelectionR25 } from "./r25-analysis.ts";
import { generateR25, generationSettingsR25, instructionsR25 } from "./r25-gemini.ts";

export const recoveryPolicyR25 = Object.freeze({ version: "r25-recovery-v1", maxAttempts: 72,
  maxHttpRequests: 144, maxTokensPerAttempt: 20000, maxReservedTokens: 1440000,
  spacingMs: 30000, retrySpacingMs: 60000, deadlineMs: 3600000,
  maxAttemptsPerNewQuestion: 2, maxAdditionalAttemptsPerHistoricalFailure: 1,
  maxFailureAttempts: 6, quotaPolicy: "Stop on any HTTP 429; no retry, fallback or automatic continuation",
  retryable: ["Gemini HTTP 500", "Gemini HTTP 502", "Gemini HTTP 503", "Gemini HTTP 504", "Gemini network error or deadline"],
  historicalPolicy: "36 successes reused unchanged; each of the two historical failures gets at most one explicit recovery attempt",
  httpPolicy: "At most two HTTP requests per attempt, countTokens then generateContent; 60s combined request deadline",
  costUsd: null, billing: "User-declared free tier, unverified billing; no billing or model changes" });
type Query = { id: string; query: string; candidates: string[]; passages: Record<string, string> };
type RecordR25 = Awaited<ReturnType<typeof generateR25>>;
type Attempt = { id: string; attempt: number; success: boolean; category?: string; latencyMs: number };
const safeCategory = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  return /^Gemini HTTP \d+$/.test(message) || recoveryPolicyR25.retryable.includes(message) ||
    ["Gemini incomplete selection", "Gemini malformed selection", "Gemini malformed response", "Gemini response too large",
      "Gemini per-call token budget exhausted", "Invalid candidate selection"].includes(message) ? message : "invalid response or bounded failure";
};

export async function recoverR25(queries: Query[], prior: Record<string, RecordR25>, historicalFailures: string[],
  generate: (q: Query) => Promise<RecordR25>,
  clock = { now: Date.now, sleep: (ms: number) => new Promise<void>(r => setTimeout(r, ms)) },
  capture: (a: Attempt, record?: RecordR25) => Promise<void> = async () => {},
) {
  const records = { ...prior }, attempts: Attempt[] = [], started = clock.now();
  let lastStart = started, reservedTokens = 0, failures = 0;
  const finish = (stopReason: string) => ({ records, attempts, reservedTokens, stopReason, elapsedMs: clock.now() - started });
  for (const q of queries.filter(q => !records[q.id])) {
    const limit = historicalFailures.includes(q.id) ? 1 : 2;
    for (let attempt = 1; attempt <= limit; attempt++) {
      if (attempts.length >= recoveryPolicyR25.maxAttempts || reservedTokens + 20000 > recoveryPolicyR25.maxReservedTokens)
        return finish("attempt/token budget exhausted");
      const spacing = attempt === 1 ? recoveryPolicyR25.spacingMs : recoveryPolicyR25.retrySpacingMs;
      await clock.sleep(Math.max(0, spacing - (clock.now() - lastStart)));
      if (clock.now() - started + 60000 > recoveryPolicyR25.deadlineMs) return finish("deadline exhausted");
      lastStart = clock.now(); reservedTokens += 20000;
      let record: RecordR25 | undefined, category: string | undefined;
      try { record = await generate(q); validateSelectionR25({ selected: record.selected }, q.candidates); }
      catch (error) { category = safeCategory(error); record = undefined; }
      const a = { id: q.id, attempt, success: !!record, ...(category ? { category } : {}), latencyMs: clock.now() - lastStart };
      attempts.push(a);
      // Persist before the next request. Capture errors propagate and stop all inference.
      await capture(a, record);
      if (record) { records[q.id] = record; break; }
      failures++;
      if (category === "Gemini HTTP 429") return finish("quota exhausted");
      if (!recoveryPolicyR25.retryable.includes(category!)) return finish("non-retryable failure");
      if (failures >= recoveryPolicyR25.maxFailureAttempts) return finish("failure budget exhausted");
      if (attempt === limit) return finish("retry limit exhausted");
    }
  }
  return finish("complete");
}

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const base = join(root, "apps/ai_agent/evaluation/r25/runs");
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
async function prepareR25() {
  const first = await json(join(base, "reasoning-v1/failure.json"));
  const second = await json(join(base, "reasoning-continuation-v1/failure.json"));
  const manifest = await json(join(base, "reasoning-continuation-v1/manifest.json"));
  const partial = await json(join(base, "reasoning-partial-report-v3/report.json"));
  const { inputHash, ...input } = await json(join(base, "exhaustive-v2/inference-inputs.json"));
  const preview = await json(join(base, "reasoning-continuation-v1/inference-inputs.json"));
  if (hash(input) !== inputHash || manifest.inputHash !== inputHash || partial.inputHash !== inputHash ||
      hash(first) !== manifest.priorFailureHash || hash(second) !== partial.sourceCaptureHashes.second ||
      hash(first) !== partial.sourceCaptureHashes.first || hash(second.records) !== partial.recordsHash ||
      hash(manifest.generationConfig) !== manifest.generationConfigHash ||
      hash(instructionsR25) !== manifest.promptHash || hash(manifest.generationSettings) !== hash(generationSettingsR25) ||
      hash(preview.queries) !== hash(input.queries) || preview.instructions !== instructionsR25 ||
      second.category !== "Gemini HTTP 503" || second.firstFailedQuery !== first.id || !second.incomplete ||
      Object.keys(second.records).length !== 36 || partial.generationAttemptsUpperBound !== 38)
    throw new Error("Historical capture or method provenance changed");
  for (const [name, expected] of Object.entries(manifest.sourceHashes)) {
    if (createHash("sha256").update(await readFile(new URL(name, import.meta.url))).digest("hex") !== expected)
      throw new Error("Frozen method source changed");
  }
  if (createHash("sha256").update(await readFile(new URL("r25-continue.ts", import.meta.url))).digest("hex") !== manifest.continuationHash)
    throw new Error("Original continuation guard changed");
  const firstProgress = (await readFile(join(base, "reasoning-v1/progress.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const nextProgress = (await readFile(join(base, "reasoning-continuation-v1/progress.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const progressRecords = Object.fromEntries([...firstProgress, ...nextProgress].map(({ id, ...r }) => [id, r]));
  if (hash(progressRecords) !== hash(second.records) || firstProgress.length !== 29 || nextProgress.length !== 7)
    throw new Error("Progress journal changed");
  for (const [id, record] of Object.entries(first.records)) if (hash(record) !== hash(second.records[id])) throw new Error("First successes changed");
  const queries: Query[] = input.queries;
  if (queries.length !== 96 || new Set(queries.map(q => q.id)).size !== 96 ||
      Object.keys(second.records).some(id => !queries.some(q => q.id === id)) ||
      [first.id, second.id].some(id => second.records[id] || !queries.some(q => q.id === id))) throw new Error("Query accounting changed");
  for (const q of queries) if (second.records[q.id]) validateSelectionR25({ selected: second.records[q.id].selected }, q.candidates);
  const control = await json(join(base, "exhaustive-v2/report.json"));
  if (hash(control) !== manifest.exhaustiveReportHash) throw new Error("Control capture changed");
  for (const result of control.results) {
    const rows = result.controls.find((c: any) => c.cutoff === 0.001).rows;
    if (rows.length !== queries.length || queries.some(q => hash(q.candidates) !== hash(rows.find((r: any) => r.id === q.id)?.candidates)))
      throw new Error("Candidate comparison changed");
  }
  return { manifest, partial, queries, records: second.records as Record<string, RecordR25>, historicalFailures: [first.id, second.id],
    provenance: { manifestHash: hash(manifest), partialReportHash: hash(partial), firstFailureHash: hash(first), secondFailureHash: hash(second),
      progressHash: hash(progressRecords), inferenceHash: inputHash } };
}

async function main() {
  const { values } = parseArgs({ options: { output: { type: "string" }, live: { type: "boolean" }, prepared: { type: "string" }, replay: { type: "string" } }, strict: true });
  if (!values.output || !/^[a-zA-Z0-9-]+$/.test(values.output)) throw new Error("Provide a new run name with --output");
  const prepared = await prepareR25();
  const sourceHash = createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex");
  const manifest = { ...prepared.manifest, recoveryPolicy: recoveryPolicyR25, recoverySourceHash: sourceHash,
    provenance: prepared.provenance, inheritedAttemptsUpperBound: 38, inheritedHttpRequestsUpperBound: 76,
    cumulativeAttemptsUpperBound: 110, cumulativeHttpRequestsUpperBound: 220, cumulativeTokenReservationUpperBound: 2200000,
    missingQueries: prepared.queries.filter(q => !prepared.records[q.id]).map(q => q.id), productionReady: false };
  if (values.replay) {
    if (values.live || !/^[a-zA-Z0-9-]+$/.test(values.replay)) throw new Error("Replay is offline only");
    const run = join(base, values.replay), savedManifest = await json(join(run, "manifest.json"));
    const saved = await json(join(run, "report.json")), selections = await json(join(run, "selections.json"));
    const attempts: Attempt[] = (await readFile(join(run, "attempts.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
    if (hash(savedManifest) !== hash(manifest) || hash(selections) !== saved.selectionsHash ||
        attempts.length !== saved.newAttempts || attempts.length > recoveryPolicyR25.maxAttempts ||
        saved.newReservedTokens !== attempts.length * 20000) throw new Error("Recovery accounting or provenance changed");
    const http = (await readFile(join(run, "http.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
    if (http.filter(r => r.state === "started").length !== saved.newHttpRequests || saved.newHttpRequests > attempts.length * 2)
      throw new Error("HTTP accounting changed");
    const progressPath = join(run, "progress.jsonl");
    const journal = attempts.some(a => a.success) ? (await readFile(progressPath, "utf8")).trim().split("\n").map(line => JSON.parse(line)) : [];
    const replayRecords = { ...prepared.records, ...Object.fromEntries(journal.map(({ id, ...r }) => [id, r])) };
    if (hash(replayRecords) !== hash(selections.records) || journal.length !== attempts.filter(a => a.success).length ||
        attempts.some(a => !prepared.queries.some(q => q.id === a.id)) ||
        journal.some(r => prepared.records[r.id])) throw new Error("Recovery journal changed");
    for (const q of prepared.queries) if (replayRecords[q.id]) validateSelectionR25({ selected: replayRecords[q.id].selected }, q.candidates);
    const report = await scoreRecoveryR25(manifest, { records: replayRecords, attempts, reservedTokens: saved.newReservedTokens,
      stopReason: saved.stopReason, elapsedMs: saved.elapsedMs }, saved.newHttpRequests, hash(selections), prepared.queries, new Set(Object.keys(prepared.records)));
    if (hash(report) !== hash(saved)) throw new Error("Recovery score replay changed");
    console.log("Recovery provenance, journals, accounting and metrics reproduced; zero API calls"); return;
  }
  if (values.live) {
    if (!values.prepared || !/^[a-zA-Z0-9-]+$/.test(values.prepared)) throw new Error("Live recovery requires a verified --prepared preview");
    if (hash(await json(join(base, values.prepared, "manifest.json"))) !== hash(manifest)) throw new Error("Prepared policy or provenance changed");
    if (process.env.GEMINI_MODEL !== manifest.model || !process.env.GEMINI_API_KEY) throw new Error("Exact configured Gemini model and API key required");
  }
  const out = join(base, values.output); await mkdir(out);
  const save = (name: string, data: unknown) => writeFile(join(out, name), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  await save("manifest.json", manifest);
  await save("inference-inputs.json", { queries: prepared.queries, instructions: instructionsR25 });
  if (!values.live) { console.log("Recovery preview verified: 36 preserved, 60 missing, zero API calls"); return; }
  let httpRequests = 0;
  const fetcher = async (url: string, init: RequestInit) => {
    if (httpRequests >= recoveryPolicyR25.maxHttpRequests) throw new Error("HTTP budget exhausted");
    const number = ++httpRequests, started = Date.now(), operation = url.endsWith(":countTokens") ? "countTokens" : "generateContent";
    await appendFile(join(out, "http.jsonl"), JSON.stringify({ number, operation, startedAt: new Date(started).toISOString(), state: "started" }) + "\n");
    try {
      const response = await fetch(url, init);
      await appendFile(join(out, "http.jsonl"), JSON.stringify({ number, operation, status: response.status, latencyMs: Date.now() - started, state: "response" }) + "\n");
      return response;
    } catch {
      await appendFile(join(out, "http.jsonl"), JSON.stringify({ number, operation, latencyMs: Date.now() - started, state: "network failure" }) + "\n");
      throw new Error("Gemini network error or deadline");
    }
  };
  const result = await recoverR25(prepared.queries, prepared.records, prepared.historicalFailures,
    q => generateR25(manifest.model, process.env.GEMINI_API_KEY!, JSON.stringify({ question: q.query,
      sections: q.candidates.map(citation => ({ citation, text: q.passages[citation] })) }), q.candidates, fetcher),
    undefined, async (attempt, record) => {
      await appendFile(join(out, "attempts.jsonl"), JSON.stringify(attempt) + "\n");
      if (record) await appendFile(join(out, "progress.jsonl"), JSON.stringify({ id: attempt.id, ...record }) + "\n");
      console.log(`R2.5 recovery: ${attempt.id}, ${attempt.success ? "success" : attempt.category}`);
    });
  const selections = { inputHash: manifest.inputHash, model: manifest.model, promptHash: manifest.promptHash, records: result.records,
    failures: result.attempts.filter(a => !a.success), historicalFailures: prepared.partial.failures };
  await save("selections.json", selections);
  // Labels and MiniLM scores enter only offline scoring, after inference has stopped.
  const report = await scoreRecoveryR25(manifest, result, httpRequests, hash(selections), prepared.queries, new Set(Object.keys(prepared.records)));
  await save("report.json", report);
  console.log(JSON.stringify({ stopReason: result.stopReason, complete: report.complete, successfulQueries: Object.keys(result.records).length,
    newAttempts: result.attempts.length, httpRequests, costUsd: null }));
}

async function scoreRecoveryR25(manifest: any, result: Awaited<ReturnType<typeof recoverR25>>, httpRequests: number, selectionsHash: string,
  queries: Query[], inheritedIds: Set<string>) {
  const control = await json(join(base, "exhaustive-v2/report.json"));
  const datasets = await Promise.all(["dataset-original.json", "dataset-audited.json"].map(p => json(join(base, "exhaustive-v2", p))));
  if (hash(control) !== manifest.exhaustiveReportHash || hash(datasets[0]) !== manifest.originalDatasetHash || hash(datasets[1]) !== manifest.auditedDatasetHash)
    throw new Error("Frozen scoring provenance changed");
  const results = datasets.map(dataset => ({ labelVersion: dataset.version, splits: ["development", "held_out"].map(split => {
    const all = dataset.queries.filter((q: any) => q.split === split), successful = all.filter((q: any) => result.records[q.id]);
    const baseline = control.results.find((r: any) => r.labelVersion === dataset.version).controls.find((r: any) => r.cutoff === 0.001).rows;
    for (const q of all) {
      const b = baseline.find((r: any) => r.id === q.id);
      if (!b || hash(b.candidates) !== hash(queries.find(input => input.id === q.id)?.candidates)) throw new Error("Candidate comparison changed");
    }
    const rows = successful.map((q: any) => ({ relevant: q.relevantCitations, returned: result.records[q.id]!.selected, latencyMs: result.records[q.id]!.latencyMs }));
    const m = metrics(rows), positive = all.filter((q: any) => q.relevantCitations.length).length;
    const missing = all.filter((q: any) => !result.records[q.id]).map((q: any) => q.id);
    return { split, expected: all.length, successful: successful.length, unavailableIds: missing, availability: successful.length / all.length,
      completeMetrics: missing.length ? null : m, successfulOnlyMetrics: m,
      availabilityAdjustedRecall: positive ? (m.recallAt3 ?? 0) * m.positiveQueryCount / positive : null,
      miniLMAllMetrics: metrics(all.map((q: any) => baseline.find((r: any) => r.id === q.id))),
      miniLMPairedSuccessfulMetrics: metrics(successful.map((q: any) => baseline.find((r: any) => r.id === q.id))) };
  }) }));
  const records = Object.values(result.records), newRecords = Object.entries(result.records).filter(([id]) => !inheritedIds.has(id)).map(([, r]) => r);
  const tokens = (rs: RecordR25[]) => rs.every(r => r.usage.totalTokenCount !== undefined) ? rs.reduce((sum, r) => sum + r.usage.totalTokenCount!, 0) : null;
  return { ...manifest, selectionsHash, complete: result.stopReason === "complete", stopReason: result.stopReason, results,
    newAttempts: result.attempts.length, newHttpRequests: httpRequests, newFailedAttempts: result.attempts.filter(a => !a.success),
    attemptsUpperBound: 38 + result.attempts.length, httpRequestsUpperBound: 76 + httpRequests,
    newReservedTokens: result.reservedTokens, measuredSuccessfulTokens: tokens(records), measuredNewSuccessfulTokens: tokens(newRecords),
    failedUsage: null, costUsd: null, elapsedMs: result.elapsedMs,
    attemptLatency: result.attempts.map(a => ({ id: a.id, success: a.success, latencyMs: a.latencyMs })),
    limitations: ["Reused held-out labels are diagnostic; synthetic labels await human adjudication.",
      "Provider failures and unattempted questions are unavailable, never retrieval abstentions. Failure token usage and billing are unknown.",
      "Successful latencies exclude pacing and any prior failed attempts; attempt latencies and total elapsed time are also recorded.",
      "Existing fresh labels were not loaded, and the MiniLM freeze is unchanged. Downstream contract checks do not measure semantic diagnosis."] };
}
if (import.meta.main) await main();
