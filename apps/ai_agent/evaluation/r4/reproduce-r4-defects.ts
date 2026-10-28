// R4.2a reproduction harness. It records the current working-tree behavior for
// the five fixtures in the R4 plan and writes
// `evaluation/r4/runs/reproduction-matrix.json`.
//
// Read-only: it does not import the retriever, the model, or the sealed
// holdout. Fixtures are synthetic and derived from the published failure
// ledger, starting from a real no-signal no-match evidence bundle so that a
// route can only come from the observation under test.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DiagnosisEvidence } from "../../src/contracts.ts";
import {
  TargetCaseSchema,
  scoreTarget,
} from "../../src/evaluation/retrieval-target.ts";
import { defaultRunbookDirectory } from "../../src/paths.ts";
import { loadRunbooks } from "../../src/tools/search-runbooks.ts";
import {
  buildStructuredRetrievalInput,
  deriveSignals,
  requestedFacetsForSignals,
  routeEvidence,
  selectRequestedFacets,
  type EvidenceSignals,
} from "../../src/tools/retrieval-profile.ts";

const evaluationDirectory = join(import.meta.dir, "..");

const taskA = JSON.parse(
  readFileSync(
    join(
      evaluationDirectory,
      "production-selection/runs/task-a-20261013-v1/development-inputs.json",
    ),
    "utf8",
  ),
) as Array<{ id: string; evidence: DiagnosisEvidence }>;

const review = JSON.parse(
  readFileSync(
    join(evaluationDirectory, "production-selection/development-review-v3.json"),
    "utf8",
  ),
) as { cases: Array<{ id: string; evidence: DiagnosisEvidence }> };

const evidenceFor = (id: string): DiagnosisEvidence =>
  taskA.find((item) => item.id === id)?.evidence ??
  review.cases.find((item) => item.id === id)!.evidence;

type TransportOverrides = {
  finalError: string;
  provider?: string | null;
  phase?: string | null;
  status?: number | null;
  fixtureFacts?: string[];
  providerOutcome?: string | null;
};

// Mirrors the retrieval-profile test helper, extended with a providerOutcome
// override so the no-match fixture can clear the provider rejection.
const transportEvidence = ({
  finalError,
  provider = null,
  phase = null,
  status = null,
  fixtureFacts = [],
  providerOutcome = "rejected",
}: TransportOverrides): DiagnosisEvidence => {
  const evidence = structuredClone(
    evidenceFor("nm05-email-invalid-region"),
  ) as DiagnosisEvidence & {
    failureContext: {
      facts: { retry: Record<string, unknown> };
      fixture_observation: Record<string, unknown>;
    };
    executionEvidence: { facts: Record<string, unknown> };
    inputValidation: { facts: Record<string, unknown> };
  };
  const retry = evidence.failureContext.facts.retry;
  retry.final_error = finalError;
  retry.provider = provider;
  retry.phase = phase;
  retry.provider_status = status;
  retry.provider_outcome = providerOutcome;
  retry.retry_after_seconds = null;
  retry.safe_code = null;
  evidence.failureContext.fixture_observation.final_error = finalError;
  evidence.failureContext.fixture_observation.provider = provider;
  evidence.failureContext.fixture_observation.observed_facts = fixtureFacts;
  evidence.failureContext.fixture_observation.delivery_outcome = "rejected";
  evidence.failureContext.fixture_observation.execution_status = "FAILED";
  evidence.executionEvidence.facts.attempts = [];
  evidence.executionEvidence.facts.current_execution = null;
  evidence.executionEvidence.facts.ordering = {
    status: "unknown",
    missing_predecessor_stages: [],
  };
  const validation = evidence.inputValidation.facts;
  validation.validation_status = "valid";
  validation.missing_required_fields = [];
  validation.invalid_field_types = [];
  validation.missing_template_paths = [];
  validation.credential_presence = [];
  validation.supported = null;
  return evidence;
};

type MatrixEntry = {
  id: string;
  defect: "F02" | "F09" | "F04" | "no-match";
  fixture: unknown;
  expected: string;
  observed: unknown;
  verdict: "already_fixed" | "still_broken" | "not_implemented";
  notes: string;
};

const entries: MatrixEntry[] = [];

const corroborators = (reasons: readonly string[]): string[] =>
  reasons
    .filter((reason) => reason.startsWith("final_error_transport:weak:"))
    .map((reason) => reason.split("+").slice(1).join("+"));

function routeFixture(
  id: string,
  defect: MatrixEntry["defect"],
  overrides: TransportOverrides,
  expectedHints: string[],
) {
  const evidence = transportEvidence(overrides);
  const route = routeEvidence(evidence);
  const input = buildStructuredRetrievalInput(evidence);
  const matched =
    JSON.stringify(route.hints) === JSON.stringify(expectedHints) &&
    route.confident === (expectedHints.length > 0);
  // A non-confident route with no anchors abstains on either
  // `no_procedural_section` or `no_observed_anchor`, whichever the candidate
  // set produces. The confident-route bypass is closed, which is the defect.
  const supportOutcome =
    route.confident || input.anchors.length > 0
      ? "depends_on_candidate_set"
      : "abstain(no_procedural_section|no_observed_anchor)";
  const weakCorroborators = corroborators(route.reasons);
  const transportCorroboratorPresent =
    ["pre_send", "connect", "dns", "resolve"].includes(
      (overrides.phase ?? "").toLowerCase(),
    ) ||
    (overrides.status ?? 0) >= 500 ||
    (overrides.fixtureFacts ?? []).some(
      (fact) =>
        fact === "failure_before_send" || fact === "all_attempts_not_delivered",
    );
  const providerOnly =
    route.hints.length > 0 &&
    weakCorroborators.length > 0 &&
    !transportCorroboratorPresent;
  entries.push({
    id,
    defect,
    fixture: {
      finalError: overrides.finalError,
      provider: overrides.provider ?? null,
      phase: overrides.phase ?? null,
      status: overrides.status ?? null,
      fixtureFacts: overrides.fixtureFacts ?? [],
      providerOutcome: overrides.providerOutcome ?? "rejected",
    },
    expected: `route.hints=${JSON.stringify(expectedHints)}, route.confident=${
      expectedHints.length > 0
    }; a weak token must not be corroborated by a provider name alone`,
    observed: {
      hints: route.hints,
      confident: route.confident,
      reasons: route.reasons,
      weakCorroborators,
      providerOnlyCorroboration: providerOnly,
      requestedFacets: input.requestedFacets,
      anchors: input.anchors,
      trace: input.trace,
      supportOutcome,
    },
    verdict:
      matched && !providerOnly ? "already_fixed" : "still_broken",
    notes: providerOnly
      ? "Routes only because the provider name is treated as a corroborator."
      : "",
  });
}

// F02: typed DNS token self-routes with no provider and no corroborator.
routeFixture(
  "f02-dns-presend",
  "F02",
  { finalError: "DNS lookup returned EAI_AGAIN", phase: "pre_send" },
  ["F02"],
);

// F02: weak token routed by the pre_send phase corroborator.
routeFixture(
  "f02-timeout-presend",
  "F02",
  { finalError: "timed out", provider: "smtp", phase: "pre_send" },
  ["F02"],
);

// F02: the phase alone must corroborate a weak token; no provider needed.
routeFixture(
  "f02-timeout-presend-no-provider",
  "F02",
  { finalError: "timed out", phase: "pre_send" },
  ["F02"],
);

// No-match guard: a provider name alone must not corroborate a weak token.
routeFixture(
  "f02-weak-provider-only",
  "no-match",
  { finalError: "timed out", provider: "smtp" },
  [],
);

// No-match published failure: worker admission text with a provider present.
routeFixture(
  "f02-no-match-worker-admission",
  "no-match",
  {
    finalError: "worker admission refused: local queue capacity",
    provider: "smtp",
    providerOutcome: null,
  },
  [],
);

// F09: the live development F09 case must keep `verification`, and the
// synthetic publication + bookkeeping-unknown combination must also keep it.
{
  const evidence = evidenceFor("f09-database-sink-only");
  const signals = deriveSignals(evidence);
  const liveFacets = buildStructuredRetrievalInput(evidence).requestedFacets;
  const emptySignals: EvidenceSignals = {
    dedupWindowExpired: false,
    deliveryUnknown: false,
    outcomeUnknown: false,
    rateLimited: false,
    transport: false,
    credential: false,
    validation: false,
    handler: false,
    ordering: false,
    duplicate: false,
    sdk: false,
    publication: false,
  };
  const syntheticFacets = requestedFacetsForSignals({
    ...emptySignals,
    publication: true,
    outcomeUnknown: true,
  });
  const syntheticSelection = selectRequestedFacets({
    ...emptySignals,
    publication: true,
    outcomeUnknown: true,
  });
  const matched =
    liveFacets.includes("verification") &&
    liveFacets.length === 3 &&
    syntheticFacets.includes("verification") &&
    syntheticFacets.length === 3;
  entries.push({
    id: "f09-publication-verification",
    defect: "F09",
    fixture: {
      developmentCase: "f09-database-sink-only",
      syntheticSignals: ["publication", "outcomeUnknown"],
    },
    expected:
      "verification retained in both, facets length 3, never evidence dropped",
    observed: {
      signals,
      liveFacets,
      liveTrace: buildStructuredRetrievalInput(evidence).trace,
      syntheticFacets,
      syntheticSelection,
    },
    verdict: matched ? "already_fixed" : "still_broken",
    notes:
      "Signal order also decides which non-verification facet fills the third slot.",
  });
}

// F04: label equivalence. The schema still caps accepted citations at two, so
// a three-way equivalent facet cannot be authored. Scoring already treats any
// accepted citation as covering the facet.
{
  const threeWay = {
    id: "synthetic-f04-equivalence",
    split: "development" as const,
    kind: "answerable" as const,
    input: { query: "missing template path", limit: 3 as const },
    requiredFacets: [
      {
        facet: "remediation" as const,
        accepted: ["RB-F01-F02@1.1.0#allowed-remediation", "RB-F01-F02@1.1.0#read-only-investigation", "RB-F01-F02@1.1.0#symptoms"],
      },
    ],
    supporting: [],
    missingRuntimeFacts: [],
  };
  const parsed = TargetCaseSchema.safeParse(threeWay);

  const index = await loadRunbooks(defaultRunbookDirectory());
  const twoWayCase = TargetCaseSchema.parse({
    ...threeWay,
    id: "synthetic-f04-two-way",
    requiredFacets: [
      {
        facet: "remediation",
        accepted: [
          "RB-F01-F02@1.1.0#allowed-remediation",
          "RB-F01-F02@1.1.0#read-only-investigation",
        ],
      },
    ],
  });
  const scored = scoreTarget(index, [twoWayCase], [
    {
      id: "synthetic-f04-two-way",
      returned: ["RB-F01-F02@1.1.0#read-only-investigation"],
      latencyMs: 0,
    },
  ]);

  entries.push({
    id: "f04-label-equivalence",
    defect: "F04",
    fixture: {
      acceptedCitationsInCase: 3,
      secondAcceptedReturned: "RB-F01-F02@1.1.0#read-only-investigation",
    },
    expected:
      "three accepted citations parse; scoring a non-first accepted citation is sufficient",
    observed: {
      threeWayParseSucceeded: parsed.success,
      threeWayParseError: parsed.success
        ? null
        : parsed.error.issues.map((issue) => issue.message),
      secondAcceptedSufficient: scored.rows[0]?.sufficient ?? null,
    },
    verdict:
      parsed.success && scored.rows[0]?.sufficient === true
        ? "already_fixed"
        : "not_implemented",
    notes:
      "R4.1 owns the label-schema fix; scoring already uses any accepted citation.",
  });
}

const workerAdmission = entries.find(
  (entry) => entry.id === "f02-no-match-worker-admission",
);
if (workerAdmission)
  workerAdmission.notes =
    "Route is not confident and there are no anchors, so support abstains for any candidate set.";

const matrix = {
  version: 1,
  phase: "R4.2b",
  createdAt: new Date().toISOString(),
  startingCommit: new TextDecoder()
    .decode(
      Bun.spawnSync(["git", "rev-parse", "HEAD"], {
        cwd: join(import.meta.dir, "../../.."),
      }).stdout,
    )
    .trim(),
  baselineProtocolHash:
    "2a750560b0c47a723094ef2d0bd5c112e5c464ee7f32bcf18d5951f91363c47c",
  scope:
    "Synthetic fixtures only. No retriever, model, R3.5 holdout, or R4 holdout was opened.",
  summary: {
    alreadyFixed: entries
      .filter((entry) => entry.verdict === "already_fixed")
      .map((entry) => entry.id),
    stillBroken: entries
      .filter((entry) => entry.verdict === "still_broken")
      .map((entry) => entry.id),
    notImplemented: entries
      .filter((entry) => entry.verdict === "not_implemented")
      .map((entry) => entry.id),
  },
  gaps: [],
  resolved: [
    {
      id: "trace-weak-token-rejection",
      requiredBy: "plan 3.3",
      resolved:
        "A rejected weak token is recorded on the input trace as weak_token_rejected:no_transport_corroborator (or :non_provider_subsystem); routeEvidence.reasons stays empty.",
    },
    {
      id: "trace-facet-selection-dropped",
      requiredBy: "plan 3.2",
      resolved:
        "trace.facetSelection records both the requested and the dropped facets.",
    },
    {
      id: "facet-drop-order",
      requiredBy: "plan 3.2",
      resolved:
        "selectRequestedFacets applies the drop order evidence, symptoms, replay, protects verification for a fault signal, and falls back to the lowest-priority tail.",
    },
    {
      id: "f04-label-schema",
      requiredBy: "plan 3.4",
      resolved:
        "Completed in R4.1: accepted citations cap at four and v2 labels parse.",
    },
  ],
  entries,
};

const target = join(import.meta.dir, "runs/reproduction-matrix.json");
await Bun.write(target, `${JSON.stringify(matrix, null, 2)}\n`);
console.log(JSON.stringify(matrix.summary, null, 2));
console.log(`wrote ${target}`);
