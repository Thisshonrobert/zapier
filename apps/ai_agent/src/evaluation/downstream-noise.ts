import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";
import { hash } from "./retrieval-r21.ts";
import { rowsAtR24 } from "./r24-analysis.ts";
import { loadR2Corpus } from "./retrieval-r2.ts";
import {
  createFixtureTools,
  fixtureInput,
  type FixtureInput,
} from "./fixture-tools.ts";
import { EvaluationCaseSchema } from "./checks.ts";
import { buildDiagnosisService, RunbookMatchSchema } from "../graph.ts";
import { buildDiagnosisPrompt } from "../prompts.ts";
import {
  IntegratedModelOutputSchema,
  type IntegratedModelOutput,
  type DiagnosisEvidence,
  type ModelGeneration,
} from "../contracts.ts";
import { GeminiDiagnosisModel, ModelProviderError } from "../gemini-model.ts";

type Expected = {
  taxonomies: string[];
  disposition: string;
  kind: string;
  status: string;
};
export function assessDiagnosis(
  raw: unknown,
  expected: Expected,
  evidenceIds: string[],
  citations: string[],
  missing: string[],
) {
  const parsed = IntegratedModelOutputSchema.safeParse(raw);
  if (!parsed.success)
    return {
      schemaValid: false,
      rootCauseCorrect: false,
      referencesValid: false,
      actionCorrect: false,
      missingEvidenceDisclosed: false,
      passed: false,
    };
  const o = parsed.data;
  const rootCauseCorrect = expected.taxonomies.includes(
    o.diagnosis.taxonomy_id,
  );
  const referencesValid =
    [...o.diagnosis.evidence_refs, ...o.proposal.evidence_refs].every((id) =>
      evidenceIds.includes(id),
    ) && o.proposal.runbook_citations.every((c) => citations.includes(c));
  const actionCorrect =
    o.status === expected.status &&
    o.proposal.disposition === expected.disposition &&
    o.proposal.kind === expected.kind;
  const missingEvidenceDisclosed = missing.every((m) =>
    o.diagnosis.missing_evidence.includes(m),
  );
  return {
    schemaValid: true,
    rootCauseCorrect,
    referencesValid,
    actionCorrect,
    missingEvidenceDisclosed,
    passed:
      rootCauseCorrect &&
      referencesValid &&
      actionCorrect &&
      missingEvidenceDisclosed,
  };
}
export function comparePairs(
  rows: { pairId: string; arm: string; assessment: { passed: boolean } }[],
) {
  const result = {
    pairs: 0,
    bothPass: 0,
    cleanOnlyPass: 0,
    baselineOnlyPass: 0,
    bothFail: 0,
  };
  for (const pairId of new Set(
    rows.filter((r) => r.arm === "clean").map((r) => r.pairId),
  )) {
    const clean = rows.find((r) => r.pairId === pairId && r.arm === "clean"),
      baseline = rows.find((r) => r.pairId === pairId && r.arm === "baseline");
    if (!clean || !baseline) throw new Error("Incomplete paired comparison");
    result.pairs++;
    result[
      clean.assessment.passed
        ? baseline.assessment.passed
          ? "bothPass"
          : "cleanOnlyPass"
        : baseline.assessment.passed
          ? "baselineOnlyPass"
          : "bothFail"
    ]++;
  }
  return result;
}

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const directory = join(root, "apps/ai_agent/evaluation/downstream-noise");
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const fileHash = async (p: string) =>
  createHash("sha256")
    .update(await readFile(p))
    .digest("hex");
const selections = [
  [
    "f01-rate-limit-rejected",
    "intent-transient-1",
    ["F01"],
    "engineering_escalation_required",
    "escalate",
    "completed",
  ],
  [
    "f03-token-missing",
    "intent-credentials-1",
    ["F03"],
    "owner_action_required",
    "request_manual_fix",
    "completed",
  ],
  [
    "f04-template-path-missing",
    "intent-templates-1",
    ["F04"],
    "owner_action_required",
    "request_manual_fix",
    "completed",
  ],
  [
    "f07-provider-response-lost",
    "intent-unknown-1",
    ["F07"],
    "outcome_unknown",
    "escalate",
    "abstained",
  ],
  [
    "f08-duplicate-retry-row",
    "intent-stale-1",
    ["F08"],
    "duplicate_or_stale",
    "no_action",
    "completed",
  ],
  [
    "f09-database-sink-only",
    "intent-gaps-1",
    ["F09"],
    "outcome_unknown",
    "escalate",
    "abstained",
  ],
] as const;

async function prepare(modelId: string) {
  const base = join(root, "apps/ai_agent/evaluation");
  const frozen = await json(join(base, "r25/method-freeze.json"));
  if (frozen.method !== "minilm-original")
    throw new Error("Unexpected baseline");
  for (const [p, expected] of Object.entries(frozen.sourceHashes))
    if (
      (await fileHash(fileURLToPath(new URL(p, import.meta.url)))) !== expected
    )
      throw new Error("Frozen method changed");
  const index = await loadR2Corpus();
  if (
    hash(index.map(({ headingTerms, contentTerms, ...s }) => s)) !==
    frozen.corpusHash
  )
    throw new Error("Frozen corpus changed");
  const retrieval = await json(
    join(base, "intent-dev/runs/intent-v3/report.json"),
  );
  const capture = await json(
    join(base, "intent-dev/runs/intent-v3/scores.json"),
  );
  const input = await json(
    join(base, "intent-dev/runs/intent-v3/inference-inputs.json"),
  );
  const { inputHash, ...payload } = input;
  if (
    hash(payload) !== inputHash ||
    capture.inputHash !== inputHash ||
    retrieval.inputHash !== inputHash ||
    retrieval.scoresHash !== hash(capture) ||
    payload.freezeHash !== hash(frozen) ||
    hash(payload.config) !== hash(frozen.config)
  )
    throw new Error("Retrieval capture changed");
  const benchmark = await json(
    join(base, "intent-dev/runs/intent-v3/benchmark.json"),
  );
  if (hash(benchmark) !== payload.datasetHash)
    throw new Error("Retrieval labels changed");
  const baselineRows = retrieval.results.find(
    (r: any) => r.variant === "baseline",
  ).rows;
  for (const row of baselineRows) {
    const scored = input.queries.find(
      (q: any) => q.id === `${row.id}:baseline`,
    );
    if (!scored) throw new Error("Missing frozen baseline input");
    const reconstructed = rowsAtR24(
      [
        {
          split: "development",
          relevant: row.relevant,
          candidates: scored.candidates,
          logits: capture.records[scored.id].logits,
          latencyMs: 0,
        },
      ],
      frozen.config.cutoff,
    )[0]!.returned;
    if (hash(reconstructed) !== hash(row.returned))
      throw new Error("Frozen baseline ranking changed");
  }
  // The fresh dataset and prior held-out retrieval rows are never read here.
  const cases = (await readFile(join(base, "cases.jsonl"), "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line))
    .filter((c) => c.split === "development");
  const samples: {
    id: string;
    query: string;
    evidence: DiagnosisEvidence;
    expected: Expected;
    clean: ReturnType<typeof RunbookMatchSchema.parse>[];
    baseline: ReturnType<typeof RunbookMatchSchema.parse>[];
    noMatch: boolean;
  }[] = [];
  const matches = (citations: string[], qid: string) =>
    citations.map((c) => {
      const s = index.find((s) => s.citation === c);
      if (!s) throw new Error("Unknown citation");
      return RunbookMatchSchema.parse({
        runbookId: s.id,
        version: s.version,
        citation: c,
        heading: s.heading,
        content: s.content,
        contentHash: s.contentHash,
        taxonomy: s.taxonomy,
        providers: s.providers,
        simulated: true,
        authority: "untrusted_procedural_guidance",
        canChangePolicy: false,
        score:
          1 / (1 + Math.exp(-capture.records[`${qid}:baseline`].logits[c])),
      });
    });
  for (const [
    caseId,
    qid,
    taxonomies,
    disposition,
    kind,
    status,
  ] of selections) {
    const item = EvaluationCaseSchema.parse(
      cases.find((c) => c.case_id === caseId),
    );
    const q = benchmark.queries.find((q: any) => q.id === qid),
      row = baselineRows.find((r: any) => r.id === qid);
    if (
      q.split !== "development" ||
      !q.relevantCitations.every((c: string) => row.returned.includes(c)) ||
      !row.returned.some((c: string) => !q.relevantCitations.includes(c))
    )
      throw new Error("Expected gold plus noise");
    const adapter = createFixtureTools(
      fixtureInput(item),
      index,
      "2026-10-08T00:00:00.000Z",
    );
    samples.push({
      id: caseId,
      query: q.query,
      evidence: adapter.bundle,
      expected: { taxonomies: [...taxonomies], disposition, kind, status },
      clean: matches(q.relevantCitations, qid),
      baseline: matches(row.returned, qid),
      noMatch: false,
    });
  }
  for (const q of benchmark.queries.filter(
    (q: any) => !q.relevantCitations.length,
  )) {
    const row = baselineRows.find((r: any) => r.id === q.id);
    if (row.returned.length) continue; // Only actual frozen-baseline abstentions qualify.
    const fixture: FixtureInput = {
      case_id: q.id,
      source_kind: "normal_dlq",
      evidence: {
        provider: "unknown",
        execution_status: "FAILED",
        delivery_outcome: "not_applicable",
        attempts: 0,
        final_error: q.query,
        observed_facts: [],
        sensitive_fields_present: [],
      },
      missing_evidence: [
        "supported_provider",
        "incident_outcome",
        "root_cause_evidence",
      ],
    };
    const adapter = createFixtureTools(
      fixture,
      index,
      "2026-10-08T00:00:00.000Z",
    );
    samples.push({
      id: q.id,
      query: q.query,
      evidence: adapter.bundle,
      expected: {
        taxonomies: ["unknown"],
        disposition: "insufficient_evidence",
        kind: "escalate",
        status: "abstained",
      },
      clean: [],
      baseline: [],
      noMatch: true,
    });
  }
  if (samples.filter((s) => s.noMatch).length !== 3)
    throw new Error("Expected three actual abstaining controls");
  const settings = {
    model: modelId,
    api: "generate-content",
    repetitions: 2,
    maxCalls: 30,
    maxOutputTokens: 2048,
    maxTotalTokensPerCall: 8000,
    maxReservedTokens: 240000,
    timeoutMs: 60000,
    repairAttempts: 0,
    minCallIntervalMs: 6500,
  } as const;
  const sources = [
    "downstream-noise.ts",
    "../prompts.ts",
    "../graph.ts",
    "../gemini-model.ts",
    "fixture-tools.ts",
  ];
  const sourceHashes = Object.fromEntries(
    await Promise.all(
      sources.map(async (p) => [
        p,
        await fileHash(fileURLToPath(new URL(p, import.meta.url))),
      ]),
    ),
  );
  const jobs = Array.from({ length: 2 }, (_, repetition) =>
    samples.flatMap((s, i) =>
      (s.noMatch
        ? ["no_match"]
        : (repetition + i) % 2
          ? ["baseline", "clean"]
          : ["clean", "baseline"]
      ).map((arm) => {
        const runbooks = arm === "clean" ? s.clean : s.baseline;
        return {
          id: `${s.id}:${repetition + 1}:${arm}`,
          pairId: `${s.id}:${repetition + 1}`,
          sampleId: s.id,
          arm,
          repetition: repetition + 1,
          evidence: s.evidence,
          expected: s.expected,
          runbooks,
          prompt: buildDiagnosisPrompt(s.evidence, runbooks),
        };
      }),
    ),
  ).flat();
  return {
    version: "downstream-noise-v1",
    settings,
    sourceHashes,
    freezeHash: hash(frozen),
    retrievalReportHash: hash(retrieval),
    samples,
    jobs,
    limitations: [
      "Author-selected synthetic development cases; no fresh scenario dataset access.",
      "Uses frozen intent-v3 baseline retrieval for operational evidence questions, not freshly scored graph-generated retrieval queries.",
      "Two repetitions per context; configured provider model is not a dated model snapshot.",
      "Reference validity and taxonomy/route scoring are deterministic proxies; prose grounding requires qualitative audit.",
      "Evidence is incomplete and simulated: no replay candidates are allowed.",
    ],
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: "string" },
      live: { type: "boolean" },
      prepare: { type: "boolean" },
      capture: { type: "string" },
    },
    strict: true,
  });
  if (!values.output) throw new Error("Provide new --output directory");
  const out = resolve(root, values.output),
    rel = relative(root, out).replaceAll("\\", "/");
  if (
    isAbsolute(rel) ||
    !rel.startsWith("apps/ai_agent/evaluation/downstream-noise/runs/")
  )
    throw new Error("Output must stay in apps/ai_agent evaluation");
  const env = parseEnv(
    await readFile(join(root, "apps/ai_agent/.env"), "utf8"),
  );
  const modelId = process.env.GEMINI_MODEL ?? env.GEMINI_MODEL;
  const apiKey = process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY;
  if (!modelId || (values.live && !apiKey))
    throw new Error("Diagnosis model configuration unavailable");
  const manifest = await prepare(modelId),
    manifestHash = hash(manifest);
  await mkdir(resolve(out, ".."), { recursive: true });
  await mkdir(out);
  const save = (name: string, data: unknown) =>
    writeFile(join(out, name), JSON.stringify(data, null, 2) + "\n", {
      flag: "wx",
    });
  await save("manifest.json", { ...manifest, manifestHash });
  if (values.prepare) {
    console.log(
      JSON.stringify({
        prepared: true,
        jobs: manifest.jobs.length,
        manifestHash,
      }),
    );
    return;
  }
  if (!values.live && !values.capture)
    throw new Error("Use --live or a complete --capture");
  const prior = values.capture
    ? await json(resolve(root, values.capture))
    : null;
  if (
    prior &&
    (prior.manifestHash !== manifestHash ||
      prior.rows.length !== manifest.jobs.length)
  )
    throw new Error("Replay provenance mismatch");
  const model = values.live
    ? new GeminiDiagnosisModel({
        model: modelId,
        apiKey: apiKey!,
        api: "generate-content",
        maxOutputTokens: manifest.settings.maxOutputTokens,
        maxTotalTokens: manifest.settings.maxTotalTokensPerCall,
      })
    : null;
  const rows: any[] = [];
  let calls = 0,
    reservedTokens = 0;
  let previousCall = 0;
  try {
    for (const job of manifest.jobs) {
      const ids = [
        job.evidence.failureContext.evidence_id,
        job.evidence.executionEvidence.evidence_id,
        job.evidence.inputValidation.evidence_id,
      ];
      const missing = [
        ...new Set(
          [
            job.evidence.failureContext,
            job.evidence.executionEvidence,
            job.evidence.inputValidation,
          ].flatMap((e) => e.unavailable),
        ),
      ];
      let generation: ModelGeneration | null = null,
        result = null,
        graphAccepted = false,
        error: string | null = null;
      const start = performance.now();
      const replay = prior?.rows.find((r: any) => r.id === job.id);
      try {
        const service = buildDiagnosisService(
          {
            getFailureContext: async () =>
              structuredClone(job.evidence.failureContext),
            getExecutionEvidence: async () =>
              structuredClone(job.evidence.executionEvidence),
            validateActionInputs: async () =>
              structuredClone(job.evidence.inputValidation),
            searchRunbooks: () => structuredClone(job.runbooks),
          },
          {
            close: async () => {},
            generate: async (prompt, signal) => {
              if (hash(prompt) !== hash(job.prompt))
                throw new Error("Diagnosis prompt changed");
              if (prior) {
                if (!replay?.generation)
                  throw new Error("Recorded model failure");
                generation = replay.generation;
                return generation!;
              }
              if (
                ++calls > manifest.settings.maxCalls ||
                (reservedTokens += manifest.settings.maxTotalTokensPerCall) >
                  manifest.settings.maxReservedTokens
              )
                throw new Error("Run budget exhausted");
              const delay =
                manifest.settings.minCallIntervalMs -
                (Date.now() - previousCall);
              if (delay > 0)
                await new Promise((resolve) => setTimeout(resolve, delay));
              previousCall = Date.now();
              generation = await model!.generate(prompt, signal);
              return generation;
            },
          },
          {
            modelName: modelId,
            allowSimulatedEvidence: true,
            maxRepairAttempts: 0,
            modelTimeoutMs: manifest.settings.timeoutMs,
            investigationTimeoutMs: manifest.settings.timeoutMs + 10000,
            maxModelTokens: 8000,
          },
        );
        result = await service.diagnose();
        graphAccepted = true;
      } catch (e) {
        error =
          e instanceof ModelProviderError
            ? `provider:${e.details.category}:${e.details.http_status ?? "none"}`
            : e instanceof Error
              ? e.name
              : "unknown_error";
        if (e instanceof ModelProviderError) {
          await save("failure.json", {
            id: job.id,
            error,
            completed: rows.length,
            manifestHash,
          });
          throw e; // Stop on quota/network/provider failure; never score missing calls as successes.
        }
      }
      const assessment = assessDiagnosis(
        (generation as ModelGeneration | null)?.output,
        job.expected,
        ids,
        job.runbooks.map((r) => r.citation),
        missing,
      );
      const row = {
        id: job.id,
        sampleId: job.sampleId,
        pairId: job.pairId,
        arm: job.arm,
        generation,
        result,
        graphAccepted,
        error,
        assessment,
        latencyMs: performance.now() - start,
      };
      rows.push(row);
      await appendFile(join(out, "progress.jsonl"), JSON.stringify(row) + "\n");
      console.log(
        JSON.stringify({
          id: job.id,
          passed: assessment.passed,
          graphAccepted,
        }),
      );
    }
  } finally {
    await model?.close();
  }
  const report = {
    manifestHash,
    rows,
    paired: comparePairs(rows),
    controls: rows
      .filter((r) => r.arm === "no_match")
      .map((r) => ({
        id: r.id,
        passed: r.assessment.passed,
        graphAccepted: r.graphAccepted,
      })),
    calls,
    reservedTokens,
    totalTokens: rows.reduce(
      (n, r) => n + (r.generation?.usage.total_tokens ?? 0),
      0,
    ),
    costUsd: null,
    productionReady: false,
    semanticAdjudication: "pending qualitative audit",
    limitations: manifest.limitations,
  };
  await save("report.json", report);
  console.log(
    JSON.stringify({
      paired: report.paired,
      controlsPassed: report.controls.filter((r) => r.passed).length,
      controls: report.controls.length,
      calls,
      totalTokens: report.totalTokens,
    }),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
