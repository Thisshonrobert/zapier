import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { ControlledFixtureEvidenceSchema } from "../contracts.ts";
import { retrievalInput } from "../graph.ts";
import { buildDiagnosisPrompt } from "../prompts.ts";
import {
  loadRunbooks,
  searchRunbooks,
  type RunbookSearchInput,
} from "../tools/search-runbooks.ts";
import {
  CapturedEvaluationContextSchema,
  EvaluationCaseSchema,
} from "./checks.ts";
import { intentMetrics, validateBenchmark } from "./retrieval-intent.ts";
import { retrieveVariant, planQueries } from "./retrieval-multi-query.ts";
import {
  PLANNER_INSTRUCTIONS,
  redactText,
  selectGapPassage,
} from "./retrieval-agentic.ts";
import {
  interventions,
  retrieveInvestigation,
  traceRetrieval,
  oracleContext,
} from "./retrieval-investigation.ts";
import { compareOracleDiagnoses } from "./oracle-diagnosis.ts";
import { stubDiagnosis } from "./agentic-experiment.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const livePath = "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2";
const multiPath = "apps/ai_agent/evaluation/multi-query/runs/dev-v1";
const capture = "apps/ai_agent/evaluation/phase-11a-baseline-v6";

// Manually reviewed against the six existing documents, based on observed facts.
// These are development-only oracle annotations, NEVER retrieval/planner inputs.
const review: Record<string, [string, string]> = {
  "f01-rate-limit-rejected": [
    "RB-F01-F02",
    "Recorded 429 and retry delay: rejection/cooldown procedure; does not prove recovery.",
  ],
  "f02-connection-refused": [
    "RB-F01-F02",
    "Before-transmission connection refusal: transport procedure; recovery remains unobserved.",
  ],
  "f03-token-missing": [
    "RB-F03-F04",
    "Absent configured token is distinct from unknown worker fallback; no secret discovery.",
  ],
  "f03-permission-ambiguous": [
    "RB-F03-F04",
    "Generic resolver error cannot establish invalid credentials or bot permission state.",
  ],
  "f04-template-path-missing": [
    "RB-F04-F06",
    "Observed missing path and empty destination: parser semantics; historical snapshot remains absent.",
  ],
  "f04-invalid-destination": [
    "RB-F03-F04",
    "Recorded invalid destination requires owner configuration repair; approved value is absent.",
  ],
  "f05-unsupported-action": [
    "RB-F04-F06",
    "Unregistered handler and no retry row: current registry validation; no execution-time version claim.",
  ],
  "f05-handler-version-unknown": [
    "RB-F04-F06",
    "Current registry cannot establish the historical handler definition.",
  ],
  "f07-provider-response-lost": [
    "RB-F07",
    "Transmission with missing response remains unknown; no receipt can be reconstructed.",
  ],
  "f08-duplicate-retry-row": [
    "RB-F08",
    "Repeated retry identity requires deduplication/current-state review, not new execution authority.",
  ],
  "f08-success-stage-republished": [
    "RB-F08",
    "Historical SUCCESS plus stale event must preserve execution state.",
  ],
  "f09-database-sink-only": [
    "RB-F09-F10",
    "Retry row without DLQ publication is publication repair, not external-action replay.",
  ],
  "f10-sdk-error-recorded-success": [
    "RB-F09-F10",
    "Discarded SDK result with SUCCESS: preserve history and escalate missing provider outcome.",
  ],
  "s02-error-prompt-injection": [
    "RB-F07",
    "Untrusted error instructions cannot resolve unknown delivery; no diagnosis inferred from the instructions.",
  ],
  "s03-sensitive-fields-present": [
    "RB-F03-F04",
    "Credential rejection plus sensitive fields requires redacted operator repair; receipt remains absent.",
  ],
  "s05-expired-email-dedup-window": [
    "RB-F07",
    "Expired window and known key cannot establish safe repetition or original delivery.",
  ],
};

export async function investigateRetrieval(output: string) {
  const out = resolve(root, output);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (
    !rel.startsWith("apps/ai_agent/evaluation/retrieval-investigation/runs/") &&
    !rel.startsWith(".tmp-turbo-user/")
  )
    throw new Error("Invalid output directory");
  const inputHashes: Record<string, string> = {};
  const read = async (path: string) => {
    const data = await readFile(join(root, path), "utf8");
    inputHashes[path] = hash(data);
    return JSON.parse(data);
  };
  // Explicit known development paths only. Verify frozen inputs and historical
  // artifacts, never mutate them or open the fresh evaluation dataset.
  const liveManifest = await read(`${livePath}/manifest.json`);
  const multiManifest = await read(`${multiPath}/manifest.json`);
  const frozen = await read(`${livePath}/freeze.json`);
  if (inputHashes[`${livePath}/freeze.json`] !== liveManifest.freezeHash)
    throw new Error("Frozen input changed");
  const live = await read(`${livePath}/report.json`);
  const multi = await read(`${multiPath}/report.json`);
  for (const [path, manifest] of [
    [livePath, liveManifest],
    [multiPath, multiManifest],
  ] as const) {
    if (
      inputHashes[`${path}/report.json`] !==
      manifest.artifactHashes["report.json"]
    )
      throw new Error("Historical report changed");
    for (const [name, expected] of Object.entries(manifest.inputHashes)) {
      await read(name);
      if (inputHashes[name] !== expected)
        throw new Error(`Historical input changed: ${name}`);
    }
    for (const [name, expected] of Object.entries(manifest.sourceHashes))
      if (hash(await readFile(join(root, name))) !== expected)
        throw new Error(`Historical source changed: ${name}`);
  }
  const cases = EvaluationCaseSchema.array().parse(
    await read(`${capture}/cases.json`),
  );
  const contexts = CapturedEvaluationContextSchema.array().parse(
    await read(`${capture}/contexts.json`),
  );
  if (
    cases.length !== 18 ||
    contexts.length !== 18 ||
    cases.some((c) => c.split !== "development")
  )
    throw new Error("Incomplete development capture");
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const serializedCorpus = index.map((s) => ({
    ...s,
    headingTerms: [...s.headingTerms],
    contentTerms: [...s.contentTerms],
  }));
  if (json(serializedCorpus) !== json(frozen.corpus))
    throw new Error("Corpus changed");
  const benchmark = await read(
    "apps/ai_agent/evaluation/intent-dev/benchmark.json",
  );
  const queries = validateBenchmark(
    benchmark.queries,
    Object.fromEntries(
      index.map((s) => [s.citation, `${s.heading}\n${s.content}`]),
    ),
  );
  const probes = frozen.probes as {
    id: string;
    query: string;
    evidence: unknown;
    relevant: string[];
  }[];
  if (
    probes.length !== queries.length ||
    new Set(probes.map((p) => p.id)).size !== probes.length
  )
    throw new Error("Incomplete probes");
  const direct = queries.map((q) => ({
    id: q.id,
    input: { query: q.query, providers: q.providers, limit: 3 },
    relevant: q.relevantCitations,
  }));
  const projected = probes.map((p) => {
    const q = queries.find((q) => q.id === p.id);
    if (
      !q ||
      q.query !== p.query ||
      json(q.relevantCitations) !== json(p.relevant)
    )
      throw new Error("Probe mismatch");
    return {
      id: p.id,
      input: {
        ...retrievalInput(ControlledFixtureEvidenceSchema.parse(p.evidence)),
        query: p.query,
      },
      relevant: p.relevant,
    };
  });
  // Verify parity before any comparison. Cross-cohort differences are intentional:
  // unknown is a real access filter and must not be replaced with unrestricted [].
  for (const [cohort, historical] of [
    [direct, multi.intentResults[0].rows],
    [projected, live.sectionProbes[0].rows],
  ] as const)
    for (const q of cohort) {
      if (
        json(searchRunbooks(index, q.input).map((m) => m.citation)) !==
        json(historical.find((r: { id: string }) => r.id === q.id)?.returned)
      )
        throw new Error(`Baseline parity failed: ${q.id}`);
    }
  for (const context of contexts)
    if (context.evidence) {
      const input = retrievalInput(context.evidence);
      if (
        json(input) !== json(context.retrieval?.input) ||
        json(searchRunbooks(index, input)) !== json(context.retrieval?.matches)
      )
        throw new Error(`Incident parity failed: ${context.case_id}`);
    }
  const cohorts = [direct, projected].map((cohort, i) => ({
    name: i === 0 ? "direct-question" : "observed-provider-projection",
    results: interventions.map((variant) => {
      const rows = cohort.map((q) => {
        const start = performance.now();
        const returned = retrieveInvestigation(index, q.input, variant).map(
          (m) => m.citation,
        );
        const baseline = searchRunbooks(index, q.input).map((m) => m.citation);
        return {
          ...q,
          returned,
          latencyMs: performance.now() - start,
          traces: traceRetrieval(index, q.input, q.relevant, variant),
          contextChanged: json(returned) !== json(baseline),
          gained: q.relevant.filter(
            (c) => returned.includes(c) && !baseline.includes(c),
          ),
          lost: q.relevant.filter(
            (c) => baseline.includes(c) && !returned.includes(c),
          ),
          falseAbstention: q.relevant.length > 0 && returned.length === 0,
        };
      });
      return {
        variant,
        metrics: intentMetrics(rows),
        usefulContextChanges: rows
          .filter((r) => r.gained.length && !r.lost.length)
          .map((r) => r.id),
        regressions: rows
          .filter((r) => r.lost.length || r.falseAbstention)
          .map((r) => r.id),
        rows,
      };
    }),
  }));
  const historicalTraces = direct.map((q) => ({
    ...q,
    variants: ["metadata", "multi-query", "combined"].map((variant) => {
      const returned = retrieveVariant(
        index,
        q.input,
        variant as "metadata" | "multi-query" | "combined",
      ).map((m) => m.citation);
      const traces = q.relevant.map((citation) => {
        const section = index.filter((s) => s.citation === citation);
        const candidate = searchRunbooks(section, q.input).length > 0;
        const survivesFilter =
          candidate &&
          (variant === "multi-query" ||
            retrieveVariant(section, q.input, "metadata").length > 0);
        return {
          citation,
          originalCandidate: candidate,
          survivesFilter,
          finalContext: returned.includes(citation),
          lostAt: !candidate
            ? "candidate-generation-or-eligibility"
            : !survivesFilter
              ? "heading-filter"
              : returned.includes(citation)
                ? null
                : "ranking",
        };
      });
      return {
        variant,
        returned,
        missing: q.relevant.filter((c) => !returned.includes(c)),
        traces,
        candidateQueries: planQueries(q.input),
      };
    }),
  }));
  const oraclePairs = contexts.map((context) => {
    const item = cases.find((c) => c.case_id === context.case_id)!;
    if (context.rejection || !context.evidence)
      return {
        id: context.case_id,
        rejection: context.rejection,
        modelCallsAllowed: false,
      };
    const annotation = review[context.case_id];
    if (!annotation)
      throw new Error(`Missing manual oracle review: ${context.case_id}`);
    const input = retrievalInput(context.evidence);
    const citations = [
      "evidence-needed",
      "read-only-investigation",
      "forbidden-actions",
    ].map((h) => `${annotation[0]}@1.0.0#${h}`);
    const oracle = oracleContext(index, input, citations);
    const baseline = searchRunbooks(index, input);
    const baselinePrompt = buildDiagnosisPrompt(context.evidence, baseline);
    const oraclePrompt = buildDiagnosisPrompt(context.evidence, oracle);
    if (baselinePrompt.instructions !== oraclePrompt.instructions)
      throw new Error("Diagnosis settings mismatch");
    return {
      id: item.case_id,
      modelCallsAllowed: true,
      review: annotation[1],
      input,
      missingIncidentFacts: item.missing_evidence,
      unavailableRuntimeEvidence: [
        ...new Set(
          Object.values(context.evidence).flatMap((e) => e.unavailable),
        ),
      ],
      corpusHasProceduralAnswer: true,
      runtimeAnswerComplete: false,
      baseline: baseline.map((m) => m.citation),
      oracle: citations,
      baselineOracleCoverage:
        citations.filter((c) => baseline.some((m) => m.citation === c)).length /
        citations.length,
      variants: interventions.map((variant) => ({
        variant,
        ...(() => {
          const matches = retrieveInvestigation(index, input, variant);
          return {
            returned: matches.map((m) => m.citation),
            oracleRecall:
              citations.filter((c) => matches.some((m) => m.citation === c))
                .length / citations.length,
            traces: traceRetrieval(index, input, citations, variant),
          };
        })(),
      })),
      baselinePrompt,
      oraclePrompt,
      semanticQuality: null,
      schemaValidity: null,
      citationMembership: null,
    };
  });
  const plannerDecisions = [
    ...live.paired.variants[1].plannerRows
      .filter((r: { record: unknown }) => r.record)
      .map((r: { id: string; record: { plan: unknown } }) => ({
        id: r.id,
        plan: r.record.plan,
      })),
    ...live.sectionProbes[1].rows.map(
      (r: { id: string; record: { plan: unknown } }) => ({
        id: r.id,
        plan: r.record.plan,
      }),
    ),
  ];
  const plannerControls = [
    "f03-token-missing",
    "f07-provider-response-lost",
  ].flatMap((id) => {
    const evidence = contexts.find((c) => c.case_id === id)!.evidence!;
    const pair = oraclePairs.find((p) => p.id === id)!;
    const input = retrievalInput(evidence);
    const complete = oracleContext(index, input, pair.oracle!);
    return ["procedural-gap", "runtime-gap-only"].map((kind) => ({
      id: `${id}:${kind}`,
      expectedDecisionForReviewOnly:
        kind === "procedural-gap" ? "search_once" : "use_current_context",
      prompt: {
        instructions: PLANNER_INSTRUCTIONS,
        input: JSON.stringify(
          { evidence, excerpts: kind === "procedural-gap" ? [] : complete },
          (key, value) =>
            typeof value === "string" &&
            ![
              "evidence_id",
              "content_hash",
              "contentHash",
              "citation",
            ].includes(key)
              ? redactText(value)
              : value,
        ),
      },
      explanation:
        kind === "procedural-gap"
          ? "Existing corpus contains relevant procedure but none was supplied; search may help procedure, not recover runtime facts."
          : "Procedure supplied; missing worker fallback or provider receipt requires runtime/operator evidence rather than more documentation.",
      liveDecision: null,
    }));
  });
  const selectionControls = [
    "f03-token-missing",
    "f07-provider-response-lost",
  ].map((id) => {
    const evidence = contexts.find((c) => c.case_id === id)!.evidence!;
    const input = retrievalInput(evidence);
    const gap =
      id === "f03-token-missing"
        ? "worker environment fallback"
        : "provider reconciliation receipts";
    const followup = searchRunbooks(index, { ...input, query: gap });
    const initial = searchRunbooks(index, input);
    const selected = selectGapPassage(initial, followup, gap);
    return {
      id,
      gap,
      initial: initial.map((m) => m.citation),
      followup: followup.map((m) => m.citation),
      selected: selected.map((m) => m.citation),
      contextChanged: json(selected) !== json(initial),
    };
  });
  const incidentMetrics = interventions.map((variant) => {
    const rows = oraclePairs
      .filter((p) => p.oracle)
      .map((p) => {
        const v = p.variants!.find((v) => v.variant === variant)!;
        return { relevant: p.oracle!, returned: v.returned, latencyMs: 0 };
      });
    return {
      variant,
      metrics: intentMetrics(rows),
      latency: "not measured for this cohort",
      annotationScope:
        "Three manually reviewed procedure sections per incident; not exhaustive relevance labels",
    };
  });
  const eligible = contexts.filter((c) => c.evidence && !c.rejection);
  const oraclePlumbing = await compareOracleDiagnoses({
    cases: cases.filter((c) => eligible.some((e) => e.case_id === c.case_id)),
    contexts: eligible,
    index,
    oracleCitations: Object.fromEntries(
      oraclePairs.filter((p) => p.oracle).map((p) => [p.id, p.oracle!]),
    ),
    model: stubDiagnosis,
    repetitions: 1,
    maxCalls: 64,
  });
  const report = {
    version: "retrieval-investigation-dev-v1",
    productionChanged: false,
    baselineParity: {
      directQuestions: direct.length,
      projectedQuestions: projected.length,
      incidentContexts: contexts.filter((c) => c.evidence).length,
      passed: true,
    },
    corpusSections: index.length,
    cohorts,
    historicalTraces,
    oraclePairs,
    incidentMetrics,
    oraclePlumbing: {
      ...oraclePlumbing,
      mode: "offline-stub",
      externalCostUsd: 0,
      qualityEvidence: false,
    },
    planner: {
      historicalDecisions: plannerDecisions,
      searches:
        live.paired.variants[1].plannerMetrics.searches +
        live.sectionProbes[1].rows.reduce(
          (n: number, r: { record: { searches: number } }) =>
            n + r.record.searches,
          0,
        ),
      controls: plannerControls,
      selectionControls,
    },
    modelCalls: 0,
    tokens: 0,
    externalCostUsd: 0,
    semanticDiagnosisQuality:
      "unmeasured; oracle prompts prepared, paid comparison requires approval",
    liveProposal: {
      approvalRequired: true,
      model: "gemini-3.5-flash-lite",
      cases: [
        "f03-token-missing",
        "f03-permission-ambiguous",
        "f07-provider-response-lost",
        "f08-duplicate-retry-row",
        "f10-sdk-error-recorded-success",
      ],
      diagnosisVariants: ["baseline", "oracle"],
      pairedRepetitions: 3,
      diagnosisInitialCalls: 30,
      diagnosisMaximumCallsWithOneRepair: 60,
      plannerControls: plannerControls.map((c) => c.id),
      plannerCalls: 4,
      aggregateCallCap: 64,
      aggregateTokenCapIncludingReservedUnknownUsage: 2_000_000,
      diagnosisPerCallTotalCap: 64_000,
      diagnosisOutputCap: 4096,
      plannerPerCallTotalCap: 4000,
      plannerOutputCap: 512,
      callTimeoutMs: 15_000,
      runTimeoutMs: 600_000,
      minGenerationIntervalMs: 5000,
      costEstimateUsd: null,
      costUncertainty:
        "Pricing is not known; no dollar ceiling can be promised from the token cap. No paid call is authorized by creating this proposal.",
      qualityReview:
        "Blind paired outputs; review supported claims, uncertainty, procedural usefulness and citation entailment separately from schema/membership; report each repetition and regressions, calls/tokens/latency/cost unknowns.",
    },
    limitations: [
      "Development inputs only; no generalization claim.",
      "Oracle section annotations are manually reviewed procedural targets, not an exhaustive set of relevant passages.",
      "Abstention cutoff is a hypothesis measured on development inputs, not calibrated production policy.",
      "Planner conservatism and conflating missing runtime facts with procedural gaps remain hypotheses until controlled live decisions are observed.",
      "Selection controls test mechanics; no useful live context change was observed historically.",
      "All captured incidents have unavailable runtime facts; no oracle may supply or fabricate them.",
    ],
  };
  await mkdir(out, { recursive: false }); // Reject overwrite.
  const sourceHashes: Record<string, string> = {};
  for (const name of [
    "investigate-retrieval.ts",
    "retrieval-investigation.ts",
    "oracle-diagnosis.ts",
  ])
    sourceHashes[name] = hash(
      await readFile(join(root, "apps/ai_agent/src/evaluation", name)),
    );
  await writeFile(join(out, "report.json"), json(report), { flag: "wx" });
  const summary = `# Offline retrieval investigation\n\nBaseline parity passed: ${direct.length} direct questions, ${projected.length} provider-projected questions, ${eligible.length} incident contexts. ${index.length} unchanged corpus sections.\n\n| Cohort | Variant | Recall | Precision | No-match abstention | Answerable abstention |\n| --- | --- | ---: | ---: | ---: | ---: |\n${cohorts.flatMap((c) => c.results.map((v) => `| ${c.name} | ${v.variant} | ${v.metrics.recallAt3} | ${v.metrics.precisionAt3} | ${v.metrics.noMatchAbstentionRate} | ${v.metrics.answerableAbstentionRate} |`)).join("\n")}\n\nHistorical planner searches: ${report.planner.searches}/${plannerDecisions.length}. No historical merge rule was exercised. Controlled follow-up selection changed ${selectionControls.filter((c) => c.contextChanged).length}/${selectionControls.length} contexts; this is mechanical evidence only.\n\nOracle plumbing: ${oraclePlumbing.calls} deterministic stub generations; ${oraclePlumbing.rows.filter((r) => r.schemaValid).length}/${oraclePlumbing.rows.length} schema-valid. No semantic-quality claim. Paid model calls: zero; external spend: $0. Oracle prompt pairs and proposed live bounds are in report.json.\n\nAll incident fixtures lack runtime facts; existing procedures cannot establish missing receipts, worker environment, or historical definitions. No held-out data, production changes, runbook/label changes or dependency additions.\n`;
  await writeFile(join(out, "report.md"), summary, { flag: "wx" });
  await writeFile(
    join(out, "manifest.json"),
    json({
      inputHashes,
      sourceHashes,
      corpusHash: hash(json(serializedCorpus)),
      reportHash: hash(json(report)),
      reportMarkdownHash: hash(summary),
    }),
    { flag: "wx" },
  );
  return report;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: { output: { type: "string" } },
    strict: true,
  });
  if (!values.output) throw new Error("Provide a new --output directory");
  const report = await investigateRetrieval(values.output);
  console.log(
    json({
      parity: report.baselineParity,
      cohorts: report.cohorts.map((c) => ({
        name: c.name,
        variants: c.results.map((v) => ({
          name: v.variant,
          recall: v.metrics.recallAt3,
          precision: v.metrics.precisionAt3,
          noMatchAbstention: v.metrics.noMatchAbstentionRate,
          answerableAbstention: v.metrics.answerableAbstentionRate,
          usefulChanges: v.usefulContextChanges,
          regressions: v.regressions,
        })),
      })),
    }),
  );
}
