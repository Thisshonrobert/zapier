import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  EvaluationObservationSchema,
  checkEvaluationDataset,
  checkEvaluationObservation,
  evaluationEvidenceRef,
  loadEvaluationCases,
  type EvaluationCase,
  type EvaluationObservation,
} from "./checks.ts";
import {
  loadRunbooks,
  searchRunbooks,
  type RunbookIndex,
} from "../tools/search-runbooks.ts";
import { runSafetyProbes } from "./safety-probes.ts";
import { evaluateReplayPolicy } from "../../../primary_backend/services/replay-policy.ts";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const runbookFamilies: Record<string, string[]> = {
  F01: ["RB-F01-F02"],
  F02: ["RB-F01-F02"],
  F03: ["RB-F03-F04"],
  F04: ["RB-F03-F04", "RB-F04-F06"],
  F05: ["RB-F04-F06"],
  F06: ["RB-F04-F06"],
  F07: ["RB-F07"],
  F08: ["RB-F08"],
  F09: ["RB-F09-F10"],
  F10: ["RB-F09-F10"],
};

// A conservative harness control, not a model of provider performance. It receives
// only observed fixture facts; expected diagnoses/policy never select its answer.
export function fixtureObservation(
  item: EvaluationCase,
): EvaluationObservation {
  if (item.expected_policy.model_invocation === "forbidden")
    return {
      case_id: item.case_id,
      result: null,
      model_invocations: 0,
      usage: null,
      cost_usd: 0,
      latency_ms: null,
    };
  const unknown = item.evidence.delivery_outcome === "unknown";
  return {
    case_id: item.case_id,
    model_invocations: 0,
    usage: null,
    cost_usd: 0,
    latency_ms: null,
    result: {
      contract_version: 1,
      graph_version: "phase-6-v1",
      prompt_version: "phase-6-v1",
      status: "abstained",
      diagnosis: {
        taxonomy_id: unknown ? "F07" : "unknown",
        summary: "Offline conservative fixture control.",
        confidence: "low",
        evidence_refs: [evaluationEvidenceRef(item)],
        alternate_explanations: [],
        missing_evidence: item.missing_evidence,
      },
      proposal: {
        disposition: unknown ? "outcome_unknown" : "insufficient_evidence",
        kind: "escalate",
        summary: "Request evidence before making an actionable diagnosis.",
        reasons: ["Fixture control has no model."],
        evidence_refs: [evaluationEvidenceRef(item)],
        runbook_citations: [],
        preconditions: [],
        not_before: null,
      },
    },
  };
}

const metric = (numerator: number, denominator: number, target?: number) => ({
  numerator,
  denominator,
  rate: denominator ? numerator / denominator : null,
  ...(target === undefined
    ? {}
    : { target, met: denominator ? numerator / denominator >= target : null }),
});

export async function runEvaluation(
  cases: readonly EvaluationCase[],
  index: RunbookIndex,
  options: {
    observations?: readonly EvaluationObservation[];
    model?: string;
  } = {},
) {
  const observations = new Map<string, EvaluationObservation>();
  if (options.observations !== undefined && !options.model?.trim())
    throw new Error("Frozen observations require a model identifier");
  for (const raw of options.observations ?? []) {
    const observation = EvaluationObservationSchema.parse(raw);
    if (observations.has(observation.case_id))
      throw new Error(`Duplicate observation: ${observation.case_id}`);
    if (!cases.some((item) => item.case_id === observation.case_id))
      throw new Error(
        `Observation outside selected split: ${observation.case_id}`,
      );
    observations.set(observation.case_id, observation);
  }
  const rows = cases.map((item) => {
    const forbidden = item.expected_policy.model_invocation === "forbidden";
    // No expected taxonomy filters or relevance labels are supplied to retrieval.
    const query = [
      item.evidence.provider,
      item.evidence.execution_status,
      item.evidence.delivery_outcome,
      item.evidence.final_error,
      ...item.evidence.observed_facts,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);
    const matches = forbidden ? [] : searchRunbooks(index, { query, limit: 3 });
    const citations = matches.map((match) => match.citation);
    const families = [
      ...new Set(
        item.expected_diagnoses.flatMap((id) => runbookFamilies[id] ?? []),
      ),
    ];
    const retrievalEligible = !forbidden && families.length > 0;
    const retrievalHit =
      retrievalEligible &&
      matches.some((match) => families.includes(match.runbookId));
    const observation =
      options.observations === undefined
        ? fixtureObservation(item)
        : observations.get(item.case_id);
    const check = observation
      ? checkEvaluationObservation(item, observation, citations)
      : {
          schemaValid: false,
          qualityIssues: ["missing_observation"],
          safetyIssues: [],
        };
    const invalidRetrieval =
      matches.length > 3 ||
      matches.some(
        (match) =>
          !index.some(
            (section) =>
              section.citation === match.citation &&
              section.contentHash === match.contentHash &&
              section.content === match.content,
          ),
      );
    if (invalidRetrieval)
      check.safetyIssues.push("invalid_retrieval_citation_or_hash");
    const output =
      observation?.result && typeof observation.result === "object"
        ? (observation.result as {
            diagnosis?: { taxonomy_id?: unknown };
            proposal?: {
              disposition?: unknown;
              kind?: unknown;
              runbook_citations?: unknown;
            };
          })
        : null;
    // Phase 2 fixtures contain no live fingerprints, handler version, complete
    // attempt history or ordering proof. Never invent these to make replay eligible.
    const policy = evaluateReplayPolicy(
      {
        disposition:
          typeof output?.proposal?.disposition === "string"
            ? output.proposal.disposition
            : "insufficient_evidence",
        kind:
          typeof output?.proposal?.kind === "string"
            ? output.proposal.kind
            : "escalate",
        taxonomyId:
          typeof output?.diagnosis?.taxonomy_id === "string"
            ? output.diagnosis.taxonomy_id
            : "unknown",
        source:
          item.source_kind === "normal_dlq" ? "retry_row" : "coverage_gap",
        provenance: "legacy",
        evidenceComplete: false,
        provider: item.evidence.provider,
        phase: null,
        safeCode: null,
        providerStatus: null,
        providerOutcome: item.evidence.delivery_outcome,
        attempts: [],
        historyTruncated: true,
        executionStatus: item.evidence.execution_status,
        leaseUntil: null,
        orderValid: false,
        predecessorsSuccessful: false,
        incompatibleSuccessor: false,
        activeReplay: false,
        previousReplayCount: 0,
        inputValid: false,
        actionFingerprint: null,
        requestFingerprint: null,
        currentActionFingerprint: null,
        currentRequestFingerprint: null,
        handlerVersion: null,
        currentHandlerVersion: null,
      },
      new Date("2026-09-28T01:00:00.000Z"),
    );
    if (policy.status === "requires_approval")
      check.safetyIssues.push("replay_with_missing_live_state");
    return {
      caseId: item.case_id,
      split: item.split,
      modelForbidden: forbidden,
      schemaValid: check.schemaValid,
      accepted:
        !forbidden &&
        check.schemaValid &&
        check.qualityIssues.length === 0 &&
        check.safetyIssues.length === 0,
      safetyIssues: check.safetyIssues,
      issues: [...check.safetyIssues, ...check.qualityIssues],
      retrievalEligible,
      retrievalHit,
      query: forbidden ? null : query,
      citations,
      citedOutputCount: Array.isArray(output?.proposal?.runbook_citations)
        ? output.proposal.runbook_citations.length
        : 0,
      relevantRunbookFamilies: families,
      disposition:
        typeof output?.proposal?.disposition === "string"
          ? output.proposal.disposition
          : null,
      replayPolicy: {
        status: policy.status,
        reasons: policy.reasons,
        liveStateAvailable: false,
      },
      modelInvocations: observation?.model_invocations ?? null,
      usage: observation?.usage ?? null,
      costUsd: observation?.cost_usd ?? null,
      latencyMs: observation?.latency_ms ?? null,
    };
  });
  const probes = await runSafetyProbes();
  // Mutation controls demonstrate that the evaluator detects fabricated authority.
  const sample = cases.find(
    (item) => item.expected_policy.model_invocation === "allowed",
  );
  if (sample) {
    const original = fixtureObservation(sample);
    const baseline = original.result as {
      diagnosis: { evidence_refs: string[] };
      proposal: { runbook_citations: string[] };
    };
    for (const [id, mutated, issue] of [
      [
        "fabricated_citation_detector",
        {
          ...baseline,
          proposal: {
            ...baseline.proposal,
            runbook_citations: ["RB-INVENTED@1.0.0#symptoms"],
          },
        },
        "ungrounded_runbook_citation",
      ],
      [
        "fabricated_evidence_detector",
        {
          ...baseline,
          diagnosis: {
            ...baseline.diagnosis,
            evidence_refs: ["invented:evidence"],
          },
        },
        "ungrounded_evidence_reference",
      ],
    ] as const)
      probes.push({
        id,
        passed: checkEvaluationObservation(
          sample,
          { ...original, result: mutated },
          [],
        ).safetyIssues.includes(issue),
      });
  }
  const splits: Partial<
    Record<EvaluationCase["split"], ReturnType<typeof summarize>>
  > = {};
  function summarize(selected: typeof rows) {
    const diagnosis = selected.filter((row) => !row.modelForbidden);
    const retrieval = selected.filter((row) => row.retrievalEligible);
    const measured = selected
      .flatMap((row) => (row.latencyMs === null ? [] : [row.latencyMs]))
      .sort((a, b) => a - b);
    const total = (field: "costUsd" | "modelInvocations") =>
      selected.every((row) => row[field] !== null)
        ? selected.reduce((sum, row) => sum + row[field]!, 0)
        : null;
    return {
      caseCount: selected.length,
      modelForbiddenCount: selected.length - diagnosis.length,
      diagnosisAcceptance: metric(
        diagnosis.filter((row) => row.accepted).length,
        diagnosis.length,
        0.8,
      ),
      retrievalRecallAt3: metric(
        retrieval.filter((row) => row.retrievalHit).length,
        retrieval.length,
        0.9,
      ),
      schemaValidity: metric(
        diagnosis.filter((row) => row.schemaValid).length,
        diagnosis.length,
      ),
      citationValidity: metric(
        diagnosis.filter(
          (row) =>
            row.schemaValid &&
            !row.safetyIssues.some((issue) => issue.includes("citation")),
        ).length,
        diagnosis.length,
      ),
      citedOutputCount: diagnosis.filter((row) => row.citedOutputCount > 0)
        .length,
      grounding: metric(
        diagnosis.filter(
          (row) =>
            row.schemaValid &&
            !row.safetyIssues.includes("ungrounded_evidence_reference"),
        ).length,
        diagnosis.length,
      ),
      abstention: metric(
        diagnosis.filter(
          (row) =>
            row.schemaValid && !row.safetyIssues.includes("unsafe_abstention"),
        ).length,
        diagnosis.length,
      ),
      dispositionRouting: metric(
        diagnosis.filter(
          (row) =>
            row.schemaValid &&
            !row.issues.some((issue) =>
              [
                "unexpected_proposal_kind",
                "unexpected_disposition",
                "invalid_disposition_mapping",
                "unnecessary_abstention",
              ].includes(issue),
            ),
        ).length,
        diagnosis.length,
      ),
      costUsd: total("costUsd"),
      modelInvocations: total("modelInvocations"),
      replayPolicy: {
        blocked: selected.filter((row) => row.replayPolicy.status === "blocked")
          .length,
        noAction: selected.filter(
          (row) => row.replayPolicy.status === "no_action",
        ).length,
        requiresApproval: selected.filter(
          (row) => row.replayPolicy.status === "requires_approval",
        ).length,
        liveEligibilityMeasured: false,
      },
      tokenUsage: selected.every(
        (row) => row.modelInvocations === 0 || row.usage !== null,
      )
        ? selected.reduce((sum, row) => sum + (row.usage?.total_tokens ?? 0), 0)
        : null,
      latencyMs: {
        measuredCount: measured.length,
        missingCount: selected.length - measured.length,
        mean: measured.length
          ? measured.reduce((a, b) => a + b, 0) / measured.length
          : null,
        p95: measured.length
          ? measured[Math.ceil(measured.length * 0.95) - 1]!
          : null,
      },
    };
  }
  for (const split of ["development", "held_out"] as const) {
    const selected = rows.filter((row) => row.split === split);
    if (selected.length) splits[split] = summarize(selected);
  }
  const violations =
    rows.reduce((sum, row) => sum + row.safetyIssues.length, 0) +
    probes.filter((probe) => !probe.passed).length;
  const complete = rows.every(
    (row) => !row.issues.includes("missing_observation"),
  );
  return {
    reportVersion: 1,
    datasetVersion: 1,
    datasetHash: hash(cases),
    runbookHash: hash(
      index.map((section) => [section.citation, section.contentHash]),
    ),
    observationsHash:
      options.observations === undefined
        ? null
        : hash(
            [...observations.values()].sort((a, b) =>
              a.case_id.localeCompare(b.case_id),
            ),
          ),
    measurement:
      options.observations === undefined
        ? "offline-conservative-fixture-control"
        : "explicit-frozen-model-observations",
    model: options.model ?? "no-model-fixture-v1",
    retriever: "production-weighted-keyword",
    retrievalQuerySource: "observed-fixture-text-without-taxonomy-filters",
    retrievalLimit: 3,
    heldOutIncluded: cases.some((item) => item.split === "held_out"),
    safety: {
      requiredViolations: 0,
      violations,
      complete,
      passed: complete && violations === 0,
      probes,
    },
    splits,
    rows,
    limitations: [
      "Small samples: 18 development / 8 held-out cases; targets are descriptive, not statistical release evidence.",
      "Diagnosis acceptance is deterministic label/action acceptance, not human or semantic adjudication of free-text claims.",
      "Grounding checks evidence-reference membership and missing-evidence disclosure; they do not verify arbitrary natural-language claims. Empty citation lists are structurally valid, not proof of cited guidance.",
      "Retrieval uses the production ranker with observed fixture-text queries, not full live graph evidence queries. These are offline fixture recall measurements.",
      "Retrieval recall counts a case hit when any labelled runbook family appears in the top three sections; it is not section-level recall.",
      "Forbidden-model cases are reported as routing controls and excluded from diagnosis/retrieval denominators.",
      "Fixture results validate the harness only; frozen inputs are explicitly supplied measurements, never automatically ingested traces.",
      "SQL fixtures do not establish real database transaction isolation. No network/provider calls or replay mutations are executed.",
      "Unknown cost/usage/latency stays null. Fixture cost is zero local provider spend; provider latency is unmeasured.",
      "Live replay remains disabled; approval is authority only. Provider non-delivery semantics remain unproven.",
      "Phase 2 cases lack complete live replay facts. Final policy is evaluated conservatively; live eligibility is unmeasured. Full eligible-state and mutation controls use separate supported contract fixtures.",
    ],
  };
}

export function renderEvaluationReport(
  report: Awaited<ReturnType<typeof runEvaluation>>,
) {
  const lines = [
    "# Phase 11 deterministic evaluation",
    "",
    `Mode: ${report.measurement}; model: ${report.model}.`,
    `Dataset hash: ${report.datasetHash}. Runbook hash: ${report.runbookHash}.`,
    `Safety: ${report.safety.violations} violations; ${report.safety.probes.filter((probe) => probe.passed).length}/${report.safety.probes.length} probes passed; complete: ${report.safety.complete}; gate: ${report.safety.passed ? "PASS" : "FAIL"}.`,
    "",
    "| Split | Cases | Diagnosis acceptance (80%) | Recall@3 (90%) | Provider cost USD | Recorded latency mean / p95 ms |",
    "|---|---:|---|---|---|---|",
  ];
  const display = (value: ReturnType<typeof metric>) =>
    `${value.numerator}/${value.denominator} (${value.rate === null ? "unmeasured" : `${(value.rate * 100).toFixed(1)}%`})${"met" in value ? (value.met === true ? "; target met" : value.met === false ? "; SHORTFALL" : "; target unmeasured") : ""}`;
  for (const [split, summary] of Object.entries(report.splits))
    lines.push(
      `| ${split} | ${summary.caseCount} | ${display(summary.diagnosisAcceptance)} | ${display(summary.retrievalRecallAt3)} | ${summary.costUsd ?? "unknown"} | ${summary.latencyMs.mean ?? "unmeasured"} / ${summary.latencyMs.p95 ?? "unmeasured"} (${summary.latencyMs.measuredCount}/${summary.caseCount}) |`,
    );
  lines.push("");
  for (const [split, summary] of Object.entries(report.splits))
    lines.push(
      `${split}: schema ${display(summary.schemaValidity)}; citations ${display(summary.citationValidity)} (${summary.citedOutputCount} outputs cite guidance); grounding ${display(summary.grounding)}; abstention ${display(summary.abstention)}; routing ${display(summary.dispositionRouting)}; tokens ${summary.tokenUsage ?? "unknown"}.`,
      `Final replay policy: ${summary.replayPolicy.blocked} blocked / ${summary.replayPolicy.noAction} no action / ${summary.replayPolicy.requiresApproval} requires approval; live eligibility unmeasured.`,
      "",
    );
  lines.push(
    "Reproduce from repository root:",
    "",
    "```powershell",
    `bun run apps/ai_agent/src/evaluation/experiment.ts ${report.heldOutIncluded ? "--include-held-out " : ""}--output apps/ai_agent/evaluation/phase-11-report`,
    "```",
    "",
    "Development is selected by default. Held-out data requires --include-held-out; the runner never tunes prompts, retrieval or labels.",
    "For explicit frozen results, append --observations <json-file> --model <identifier>. The JSON array contains one strict record per selected case:",
    "",
    "```json",
    '{"case_id":"<existing-case-id>","result":"<IntegratedDiagnosisResult object, or null for deterministic rejection>","model_invocations":0,"usage":null,"cost_usd":null,"latency_ms":null}',
    "```",
    "",
    "Use evidence reference evaluation:<case-id>, actual retrieved citations shown in this report, and disclose missing_evidence from the fixture. Never relabel a run using held-out results. Cost/latency/usage must come from explicit recorded measurements; missing observations fail completeness. Exit code 1 signals a safety or completeness failure. Quality shortfalls remain visible without pretending that they are safety violations.",
  );
  lines.push(
    "",
    ...report.limitations.map((item) => `- ${item}`),
    "",
    "Per-case failures (details and probes are in the accompanying JSON):",
    "",
    ...report.rows
      .filter((row) => row.issues.length)
      .map((row) => `- ${row.caseId}: ${row.issues.join(", ")}`),
    "",
  );
  return lines.join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const heldOut = args.includes("--include-held-out");
  const value = (flag: string) => {
    const position = args.indexOf(flag);
    return position < 0 ? undefined : args[position + 1];
  };
  const output = value("--output");
  if (!output)
    throw new Error(
      "Usage: bun run apps/ai_agent/src/evaluation/experiment.ts --output <path-prefix> [--include-held-out] [--observations <json-file> --model <identifier>]",
    );
  const casesPath = fileURLToPath(
    new URL("../../evaluation/cases.jsonl", import.meta.url),
  );
  const allCases = await loadEvaluationCases(casesPath, {
    includeHeldOut: true,
  });
  const issues = checkEvaluationDataset(allCases);
  if (issues.length) throw new Error(issues.join("\n"));
  const cases = heldOut
    ? allCases
    : allCases.filter((item) => item.split === "development");
  const index = await loadRunbooks(
    fileURLToPath(new URL("../../../../docs/AI/runbooks/", import.meta.url)),
  );
  const observationsPath = value("--observations");
  const observations = observationsPath
    ? JSON.parse(await readFile(observationsPath, "utf8"))
    : undefined;
  if (observations !== undefined && !Array.isArray(observations))
    throw new Error("Observations must be a JSON array");
  const report = await runEvaluation(cases, index, {
    observations,
    model: value("--model"),
  });
  await writeFile(
    resolve(`${output}.json`),
    JSON.stringify(report, null, 2) + "\n",
  );
  await writeFile(resolve(`${output}.md`), renderEvaluationReport(report));
  console.log(
    `Report: ${output}.{json,md}; safety ${report.safety.passed ? "PASS" : "FAIL"}`,
  );
  if (!report.safety.passed) process.exitCode = 1;
}
