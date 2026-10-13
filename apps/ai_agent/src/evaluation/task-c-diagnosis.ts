// Offline preparation only. This file has no provider credential or generation path.
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDiagnosisPrompt, DIAGNOSIS_PROMPT_VERSION } from "../prompts.ts";
import { loadRunbooks, searchRunbooks } from "../tools/search-runbooks.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const source = "apps/ai_agent/evaluation/production-selection/runs/task-b-followup-20261013-v3";
const ids = ["f01-rate-limit-rejected", "f02-connection-refused", "f03-token-missing",
  "f03-permission-ambiguous", "f04-template-path-missing", "f04-invalid-destination",
  "f05-unsupported-action", "f07-provider-response-lost", "f08-success-stage-republished",
  "f10-sdk-error-recorded-success", "nm01-telegram-message-too-long", "nm03-email-invalid-sender-address"] as const;
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const objectHash = (value: unknown) => hash(json(value));

export function buildTaskCSchedule(ids: readonly string[]) {
  if (ids.length !== 12 || new Set(ids).size !== 12) throw new Error("Exactly 12 unique development incidents required");
  const rows: { slot: number; caseId: string; repetition: number;
    arm: "keyword-production" | "minilm-procedure-question"; state: "unavailable_not_dispatched" }[] = [];
  for (let repetition = 1; repetition <= 3; repetition++) for (const caseId of ids)
    for (const arm of repetition % 2 === 0
      ? ["minilm-procedure-question", "keyword-production"] as const
      : ["keyword-production", "minilm-procedure-question"] as const)
      rows.push({ slot: rows.length + 1, caseId, repetition, arm, state: "unavailable_not_dispatched" });
  return rows;
}

export async function prepareTaskCDiagnosis(output: string, countedRun?: string) {
  const directory = resolve(output);
  const allowed = resolve(root, "apps/ai_agent/evaluation/production-selection/runs");
  if (!directory.startsWith(allowed + "\\") && !directory.startsWith(allowed + "/"))
    throw new Error("Task C output must be a new production-selection run directory");
  const manifest = JSON.parse(await readFile(join(root, source, "result-manifest.json"), "utf8"));
  const sourceFiles = ["benchmark.json", "config.json", "followup-report.json", "query-variants.json",
    "freeze.json", "interventions-freeze.json"] as const;
  const inputs: Record<string, any> = {};
  const sourceHashes: Record<string, string> = {};
  for (const name of sourceFiles) {
    const text = await readFile(join(root, source, name), "utf8");
    if (manifest.artifacts[name] !== hash(text)) throw new Error(`Frozen Task B artifact changed: ${name}`);
    inputs[name] = JSON.parse(text);
    sourceHashes[name] = hash(text);
  }
  if (inputs["followup-report.json"].decision?.status !== "no_candidate_passes" &&
      inputs["followup-report.json"].decision?.status !== "no_candidate_passed") {
    // The source's exact wording is versioned, but any finalist is forbidden here.
    if (inputs["followup-report.json"].results.some((r: any) => r.matrix.decision.finalist))
      throw new Error("Task C diagnostic cannot promote a Task B finalist");
  }
  const benchmark = inputs["benchmark.json"];
  const report = inputs["followup-report.json"];
  const variants = inputs["query-variants.json"];
  const config = inputs["config.json"];
  const priorFreeze = inputs["freeze.json"];
  const graphSourceHash = hash(await readFile(join(root, "apps/ai_agent/src/graph.ts"), "utf8"));
  if (graphSourceHash !== priorFreeze.inputHashes["apps/ai_agent/src/graph.ts"])
    throw new Error("Serving retrievalInput source changed since Task B parity audit");
  for (const [name, expected] of Object.entries(priorFreeze.modelFileHashes as Record<string, string>))
    if (hash(await readFile(join(root, name))) !== expected)
      throw new Error(`Pinned MiniLM asset changed: ${name}`);
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const corpusHash = objectHash(index.map(({ headingTerms, contentTerms, ...section }) => section));
  if (corpusHash !== benchmark.corpusHash || corpusHash !== priorFreeze.corpusHash)
    throw new Error("Whole serving corpus changed since Task B freeze");
  const byCitation = new Map(index.map(section => [section.citation, section]));
  const keyword = report.results.find((r: any) => r.variant === "production")?.matrix.candidates.find((c: any) => c.method === "keyword");
  const candidate = report.results.find((r: any) => r.variant === "procedure-question")?.matrix.candidates.find((c: any) => c.method === "minilm-original" && c.cutoff === 0.001);
  if (!keyword || !candidate || config.originalCutoff !== 0.001 || config.batchSize !== 8 || config.maxLength !== 512)
    throw new Error("Frozen comparison configuration unavailable");
  const captures = ids.map(caseId => {
    const item = benchmark.cases.find((c: any) => c.id === caseId);
    const query = variants.find((v: any) => v.originalId === caseId && v.variant === "procedure-question");
    const baseline = keyword.captures.find((c: any) => c.id === caseId);
    const intervention = candidate.captures.find((c: any) => c.id === caseId);
    if (!item || !query || !baseline || !intervention || query.input.limit !== 3)
      throw new Error(`Missing frozen development pair: ${caseId}`);
    // Task B froze this graph.retrievalInput capture and checked evidence parity.
    // Recheck its exact keyword output against today's deployable corpus.
    const productionInput = item.input;
    const current = searchRunbooks(index, productionInput);
    if (json(current) !== json(baseline.matches))
      throw new Error(`Serving keyword/corpus parity failed: ${caseId}`);
    if (query.input.query === productionInput.query || json(query.input.providers) !== json(productionInput.providers))
      throw new Error(`Procedure query changed eligibility or intent: ${caseId}`);
    for (const match of intervention.matches) {
      const section = byCitation.get(match.citation);
      if (!section || match.contentHash !== section.contentHash ||
          !(section.providers.includes("generic") || section.providers.some(p => query.input.providers.includes(p))))
        throw new Error(`Ineligible or altered MiniLM section: ${caseId}`);
    }
    const arms = {
      "keyword-production": { input: productionInput, matches: baseline.matches },
      "minilm-procedure-question": { input: query.input, matches: intervention.matches },
    };
    const prompts = Object.fromEntries(Object.entries(arms).map(([arm, retrieval]) =>
      [arm, buildDiagnosisPrompt(item.evidence, retrieval.matches)]));
    if (Object.values(prompts).some(prompt => prompt.instructions.length + prompt.input.length > 16_000))
      throw new Error(`Serving prompt character limit exceeded: ${caseId}`);
    return { caseId, kind: item.kind, scenarioFamily: item.scenarioFamily, evidence: item.evidence,
      arms, prompts };
  });
  const schedule = buildTaskCSchedule(ids).map(row => {
    const capture = captures.find(c => c.caseId === row.caseId)!;
    return { ...row, retrievalHash: objectHash(capture.arms[row.arm]),
      promptHash: objectHash(capture.prompts[row.arm]), countedInputTokens: null,
      outputTokens: null, usage: null, latencyMs: null, schemaValid: null,
      serviceAccepted: null, semanticReview: null, failure: "durable_allowance_unavailable" };
  });
  let countedPreflight: unknown = null;
  const countedByPair = new Map<string, { tokens: number; record: string; sha256: string }>();
  if (countedRun) {
    const countedDirectory = resolve(countedRun);
    const prior = JSON.parse(await readFile(join(countedDirectory, "method-freeze.json"), "utf8"));
    const priorCaptures = await readFile(join(countedDirectory, "captures.json"), "utf8");
    if (hash(priorCaptures) !== objectHash(captures) || prior.corpusHash !== corpusHash ||
        prior.diagnosis.model !== "gemini-3.5-flash-lite" ||
        prior.diagnosis.promptSourceHash !== hash(await readFile(join(root, "apps/ai_agent/src/prompts.ts"), "utf8")) ||
        prior.diagnosis.retrievalInputSourceHash !== graphSourceHash ||
        prior.diagnosis.schemaSourceHash !== hash(await readFile(join(root, "apps/ai_agent/src/gemini-model.ts"), "utf8")))
      throw new Error("Counted preflight does not match current serving payloads and sources");
    const files = (await readdir(countedDirectory)).filter(name => name.startsWith("preflight-") && name.endsWith(".json"));
    const records = await Promise.all(files.map(async name => {
      const text = await readFile(join(countedDirectory, name), "utf8");
      return { name, sha256: hash(text), result: JSON.parse(text) };
    }));
    if (records.length !== 24 || new Set(records.map(({ result }) => `${result.caseId}:${result.arm}`)).size !== 24 ||
        records.some(({ result }) => result.state !== "finished" || result.status !== 200 ||
          result.failure !== null || result.tokenBudgetAccepted !== true ||
          !Number.isInteger(result.countedInputTokens) || result.countedInputTokens + 2048 > 64_000))
      throw new Error("Counted preflight is incomplete or failed");
    for (const { name, sha256, result } of records)
      countedByPair.set(`${result.caseId}:${result.arm}`, { tokens: result.countedInputTokens,
        record: name, sha256 });
    countedPreflight = { sourceDirectory: countedDirectory, sourceCapturesSha256: hash(priorCaptures),
      requests: records.length, minInputTokens: Math.min(...records.map(({ result }) => result.countedInputTokens)),
      maxInputTokens: Math.max(...records.map(({ result }) => result.countedInputTokens)),
      totalInputTokens: records.reduce((total, { result }) => total + result.countedInputTokens, 0),
      records: Object.fromEntries(records.map(({ name, sha256 }) => [name, sha256])),
      generationRequests: 0 };
  }
  for (const row of schedule) {
    const counted = countedByPair.get(`${row.caseId}:${row.arm}`);
    if (counted) Object.assign(row, { countedInputTokens: counted.tokens,
      preflightRecord: counted.record, preflightRecordSha256: counted.sha256 });
  }
  const freeze = {
    version: 1, status: "development_diagnostic_prepared_no_live_dispatch",
    taskBDecision: "no_candidate_passes", releaseEligible: false,
    scope: "Two-arm exposed development diagnosis; query-plus-retrieval candidate, not ranking-only attribution",
    incidentIds: ids, repetitionsPerArm: 3, scheduledAttempts: 72, retries: 0,
    sourceHashes: { ...sourceHashes,
      "apps/ai_agent/src/evaluation/task-c-diagnosis.ts": hash(await readFile(join(root, "apps/ai_agent/src/evaluation/task-c-diagnosis.ts"), "utf8")),
      "apps/ai_agent/src/evaluation/task-c-preflight.ts": hash(await readFile(join(root, "apps/ai_agent/src/evaluation/task-c-preflight.ts"), "utf8")),
      "apps/ai_agent/src/index.ts": hash(await readFile(join(root, "apps/ai_agent/src/index.ts"), "utf8")),
      "apps/ai_agent/src/operational-limits.ts": hash(await readFile(join(root, "apps/ai_agent/src/operational-limits.ts"), "utf8")),
      "apps/ai_agent/src/tools/search-runbooks.ts": hash(await readFile(join(root, "apps/ai_agent/src/tools/search-runbooks.ts"), "utf8")),
      "apps/ai_agent/src/prompts.ts": hash(await readFile(join(root, "apps/ai_agent/src/prompts.ts"), "utf8")),
      "apps/ai_agent/src/graph.ts": graphSourceHash,
      "apps/ai_agent/src/gemini-model.ts": hash(await readFile(join(root, "apps/ai_agent/src/gemini-model.ts"), "utf8")) },
    corpusHash, modelAssetHashes: priorFreeze.modelFileHashes,
    retrieval: { keyword: "unchanged production query and keyword scorer",
      candidate: "frozen procedure-question query plus original exhaustive MiniLM",
      model: config.models.reranker, cutoff: config.originalCutoff,
      batchSize: config.batchSize, maxLength: config.maxLength, resultLimit: 3,
      providerEligibility: "unchanged" },
    diagnosis: { model: "gemini-3.5-flash-lite", api: "generate-content",
      promptVersion: DIAGNOSIS_PROMPT_VERSION, promptSourceHash: hash(await readFile(join(root, "apps/ai_agent/src/prompts.ts"), "utf8")),
      retrievalInputSourceHash: graphSourceHash,
      schemaSourceHash: hash(await readFile(join(root, "apps/ai_agent/src/gemini-model.ts"), "utf8")),
      maxOutputTokens: 2048, maxTotalTokensPreflight: 64_000,
      maxModelTokensGraph: 8_000, maxPromptCharacters: 16_000,
      maxRepairAttempts: 0, modelDeadlineMs: 15_000, investigationDeadlineMs: 60_000 },
    budget: { monetaryCeilingUsd: 0, generationAttemptsMaximum: 72,
      operationalTokenReservationPerAttempt: 64_000, defaultOwnerDailyTokenAllowance: 256_000,
      defaultOperatorDailyTokenAllowance: 256_000, defaultDailyAttemptsBeforeOtherReservations: 4,
      inputRateUsdPerMillionForConservativeReservation: 0.30,
      outputRateUsdPerMillionForConservativeReservation: 2.50,
      conservativeCostCentsPerAttempt: 16,
      actualCountTokensPreflight: countedPreflight ? "linked_exact_count_evidence" : "pending_count_only_preflight",
      noAutomaticPaidFallback: true, requestPacingMinimumMs: 30_000,
      requestRateCeilingPerMinute: 2, stopOnHttp429: true,
      generationRequiresKnownDurableRemainingAllowance: true,
      durableRemainingAllowance: "unavailable_no_agent_database_url" },
    freeTierEvidence: { modelDocs: "https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite",
      pricing: "https://ai.google.dev/gemini-api/docs/pricing",
      rateLimits: "https://ai.google.dev/gemini-api/docs/rate-limits",
      modelFreeStandardGenerationListed: true,
      exactCredentialProjectAndCurrentTierVerified: true,
      verificationProvenance: "Direct user attestation on 2026-10-13: configured .env key belongs to gen-lang-client-0124525712; AI Studio current tier Free",
      projectShownInScreenshot: "gen-lang-client-0124525712",
      visibleModelLimit: { rpm: 15, tpm: 250000, rpd: 500 },
      countTokensPreflightAllowed: true, generationDispatchAllowed: false },
    countedPreflight,
    scenarioCoverage: {
      knownRejection: ["f01-rate-limit-rejected", "f03-permission-ambiguous"],
      unknownDelivery: ["f07-provider-response-lost"],
      supportedOwnerCorrection: ["f04-invalid-destination", "f04-template-path-missing"],
      unsupportedOwnerCorrection: ["f03-permission-ambiguous", "f03-token-missing"],
      ambiguousCause: ["f03-permission-ambiguous", "f10-sdk-error-recorded-success"],
      negativeNoDirectProcedure: ["nm01-telegram-message-too-long", "nm03-email-invalid-sender-address"] },
  };
  await mkdir(directory, { recursive: false });
  const write = (name: string, value: unknown) => writeFile(join(directory, name), json(value), { flag: "wx" });
  await write("method-freeze.json", freeze);
  await write("captures.json", captures);
  await writeFile(join(directory, "schedule.jsonl"), schedule.map(row => JSON.stringify(row)).join("\n") + "\n", { flag: "wx" });
  const armKey = schedule.map(row => ({ packetId: randomUUID(), slot: row.slot, arm: row.arm }));
  const masked = schedule.map((row, i) => {
    const capture = captures.find(c => c.caseId === row.caseId)!;
    return { packetId: armKey[i]!.packetId, caseId: row.caseId,
      repetition: row.repetition, evidence: capture.evidence,
      guidance: capture.arms[row.arm].matches.map(({ score: _score, ...match }: any) => match),
      output: null, schemaAcceptance: null, serviceAcceptance: null,
      rootCauseSupport: null, boundedUncertainty: null, ownerCorrectionSupport: null,
      deliveryStatus: null, evidenceAndActionQuality: null, citationIntegrity: null,
      inventedRepair: null, replaySafety: null, reviewer: "independent_human_pending" };
  });
  masked.sort((a, b) => a.packetId.localeCompare(b.packetId));
  await write("review-packet.json", masked);
  await write("review-arm-key.json", armKey);
  await writeFile(join(directory, "decision.md"), `# Task C development diagnosis decision\n\nNo diagnosis generation was dispatched. All 72 scheduled attempts are unavailable, including both arms of all 12 exposed development incidents. Direct user attestation binds the configured key to the shown Free-tier project. The checkout has no configured agent database URL, so current durable owner/operator reservations cannot be inspected; generation remains blocked by that operational allowance uncertainty. ${countedPreflight ? "The 24 distinct serving payloads completed exact countTokens preflight successfully; see the linked immutable counted run in method-freeze.json." : "Actual countTokens preflight is pending."} Schema/service acceptance and semantic quality denominators are unavailable, rather than zero-percent scores.\n\nTask B has no passing finalist. The MiniLM arm changes both query and retrieval, so future paired differences cannot be attributed to ranking alone. The historical release gates remain unmet. No independent holdout, human release acceptance, production promotion, replay, or Tasks D/E were performed.\n`);
  const artifacts = ["method-freeze.json", "captures.json", "schedule.jsonl", "review-packet.json", "review-arm-key.json", "decision.md"];
  await write("result-manifest.json", { version: 1, status: "prepared_generation_blocked",
    artifacts: Object.fromEntries(await Promise.all(artifacts.map(async name =>
      [name, hash(await readFile(join(directory, name), "utf8"))]))),
    scheduledAttempts: 72, dispatchedAttempts: 0, generationCostUsd: 0 });
  return { directory, scheduled: schedule.length, dispatched: 0 };
}

if (import.meta.main) {
  const output = process.argv[2];
  if (!output) throw new Error("New output directory required");
  console.log(await prepareTaskCDiagnosis(output));
}
