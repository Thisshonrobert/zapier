// R3.5r.3 development screening. This module reads only the recovery cohort
// (development v2), builds the frozen profile from observed evidence, and
// scores the candidate and keyword control against the frozen labels. It never
// reads the sealed R3.5 holdout and never changes the candidate.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { z } from "zod";

import {
  ControlledFixtureEvidenceSchema,
  type DiagnosisEvidence,
} from "../contracts.ts";
import {
  buildStructuredRetrievalInput,
  deriveSignals,
  faultSignalKeys,
  type EvidenceSignals,
  type StructuredRunbookSearchInput,
} from "../tools/retrieval-profile.ts";
import {
  eligibleRunbookSections,
  loadRunbooks,
  scoredRunbookSections,
  type RunbookIndex,
} from "../tools/search-runbooks.ts";
import { rankStructured, routeCandidates } from "../tools/structured-ranking.ts";
import { hash } from "./retrieval-r21.ts";
import {
  corpusHash,
  loadFrozenCorpus,
  loadTargetCases,
  loadTargetLabels,
  rationaleLines,
  scoreTarget,
  targetLabelHash,
  type TargetCase,
  type TargetLabelFile,
  type TargetOutput,
} from "./retrieval-target.ts";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const r3Dir = join(repoRoot, "apps/ai_agent/evaluation/r3");
const recoveryDir = join(r3Dir, "recovery");
const reviewPath = join(
  repoRoot,
  "apps/ai_agent/evaluation/production-selection/development-review-v3.json",
);
const casesPath = join(recoveryDir, "development-cases-v2.json");
const labelsPath = join(recoveryDir, "development-labels-v3.json");
const evidencePath = join(recoveryDir, "development-evidence-v2.json");
const corpusPath = join(r3Dir, "corpus-v1.json");
const protocolPath = join(recoveryDir, "protocol-r3.5r.json");
const r23ConfigPath = join(repoRoot, "apps/ai_agent/evaluation/r23/config.json");
const scoreScript = join(repoRoot, "apps/ai_agent/src/evaluation/recovery-score.mjs");
const defaultOutDir = join(recoveryDir, "runs", "dev-20261020-v1");

// Frozen values from protocol-r3.5r.json. A mismatch is a freeze-integrity
// failure, never a warning.
const expected = {
  corpusSections: "45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440",
  labels: "cb4b9caecd5243a31eca57abbb6d452311a84ad3983a42a73a8c91e2c0545793",
  cases: "57557fa3c41df2a1aa3af2e8fc9cd446efff125c617b53c3e14e2b7d32544adf",
  protocol: "f4ee2f19cf13a40ad20211fac71ae297715bfd277fbb618f8dcc18b0935f20ad",
  model: "Xenova/ms-marco-MiniLM-L-6-v2",
  modelRevision: "a09144355adeed5f58c8ed011d209bf8ee5a1fec",
} as const;

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const jsonHash = (value: unknown) => sha256(JSON.stringify(value));
const sha256File = async (path: string) => sha256(await readFile(path));

const EvidenceFileSchema = z
  .object({
    artifact: z.literal("development-evidence-v2"),
    version: z.literal(1),
    status: z.string(),
    authoredAt: z.string(),
    purpose: z.string(),
    pinnedSource: z
      .object({
        path: z.string(),
        fileBytesHash: z.string(),
        cases: z.number().int().positive(),
      })
      .strict(),
    extension: z
      .object({
        cases: z.array(
          z
            .object({
              id: z.string().min(1),
              evidence: ControlledFixtureEvidenceSchema,
            })
            .strict(),
        ),
      })
      .strict(),
    notes: z.array(z.string()),
  })
  .strict();

export type RecoveryEvidenceFile = z.infer<typeof EvidenceFileSchema>;

type ReviewFile = {
  cases: Array<{ id: string; evidence: DiagnosisEvidence }>;
};

export type RecoveryRow = {
  case: TargetCase;
  label: TargetLabelFile["cases"][number];
  evidence: DiagnosisEvidence;
  profile: StructuredRunbookSearchInput;
  signals: EvidenceSignals;
  eligible: string[];
  routed: string[];
  routeExcluded: string[];
  accepted: string[];
  routeCoverage: number;
  facetInvariant: boolean;
  typedRoute: boolean;
  equivalenceProvenance: boolean;
};

export type RecoveryContext = {
  index: RunbookIndex;
  cases: TargetCase[];
  labels: TargetLabelFile;
  rows: RecoveryRow[];
  hashes: {
    corpus: string;
    cases: string;
    labels: string;
    protocol: string;
    evidence: string;
    review: string;
  };
};

const uniq = <T>(values: readonly T[]): T[] => [...new Set(values)];

const typedReason =
  /^(?:final_error_transport|final_error|provider_status|retry_after_seconds|fixture_fact|credential_presence|validation_status|missing_required_fields|invalid_field_types|missing_template_paths|supported|ordering|missing_predecessor_stages|delivery_outcome|execution_status|source_kind|safe_code):/;

// The labels file is the single scored source of accepted citations. The cases
// file remains the source of each case's identity, kind, and input; nothing in
// the scored path reads requiredFacets from it.
export function scoredCasesFromLabels(
  cases: readonly TargetCase[],
  labels: TargetLabelFile,
): TargetCase[] {
  const labelById = new Map(labels.cases.map((item) => [item.id, item]));
  return cases.map((item) => {
    const label = labelById.get(item.id);
    if (!label) throw new Error(`Missing label for ${item.id}`);
    return {
      ...item,
      requiredFacets: label.requiredFacets.map((facet) => ({
        facet: facet.facet,
        accepted: [...facet.accepted],
      })),
      supporting: [...label.supporting],
      missingRuntimeFacts: [...label.missingRuntimeFacts],
    };
  });
}

export async function loadRecoveryContext(): Promise<RecoveryContext> {
  const [index, cases, labels, frozen, evidenceFileRaw, protocolHash, reviewRaw] =
    await Promise.all([
      loadRunbooks(join(repoRoot, "docs/AI/runbooks")),
      loadTargetCases(casesPath),
      loadTargetLabels(labelsPath),
      loadFrozenCorpus(corpusPath),
      readFile(evidencePath, "utf8"),
      sha256File(protocolPath),
      readFile(reviewPath, "utf8"),
    ]);
  const evidenceFile = EvidenceFileSchema.parse(JSON.parse(evidenceFileRaw));
  const review = JSON.parse(reviewRaw) as ReviewFile;

  const actualCorpus = corpusHash(frozen.sections);
  const actualCases = jsonHash(cases);
  const actualLabels = targetLabelHash(labels);
  const reviewHash = sha256(reviewRaw);
  if (actualCorpus !== expected.corpusSections)
    throw new Error("Freeze integrity: corpus sections hash changed");
  if (actualCases !== expected.cases)
    throw new Error("Freeze integrity: development cases v2 hash changed");
  if (actualLabels !== expected.labels)
    throw new Error("Freeze integrity: development labels v2 hash changed");
  if (protocolHash !== expected.protocol)
    throw new Error("Freeze integrity: recovery protocol hash changed");
  if (evidenceFile.pinnedSource.fileBytesHash !== reviewHash)
    throw new Error("Freeze integrity: pinned review source hash changed");
  if (frozen.corpusHash !== expected.corpusSections)
    throw new Error("Freeze integrity: frozen corpus artifact hash changed");

  const labelsById = new Map(labels.cases.map((item) => [item.id, item]));
  if (labelsById.size !== labels.cases.length)
    throw new Error("Duplicate label case id");
  if (labelsById.size !== cases.length)
    throw new Error("Label set does not match the cohort");
  const scoredCases = scoredCasesFromLabels(cases, labels);

  const pinnedById = new Map(review.cases.map((item) => [item.id, item.evidence]));
  const extensionById = new Map(
    evidenceFile.extension.cases.map((item) => [item.id, item.evidence]),
  );
  const evidenceById = new Map<string, DiagnosisEvidence>();
  const caseIds = new Set(scoredCases.map((item) => item.id));
  if (pinnedById.size !== 24)
    throw new Error(`Pinned evidence must contain 24 cases, got ${pinnedById.size}`);
  if (extensionById.size !== 8)
    throw new Error(`Extension evidence must contain 8 cases, got ${extensionById.size}`);
  for (const id of [...pinnedById.keys(), ...extensionById.keys()])
    if (!caseIds.has(id)) throw new Error(`Evidence for unknown case ${id}`);
  for (const item of scoredCases) {
    const evidence = pinnedById.get(item.id) ?? extensionById.get(item.id);
    if (!evidence) throw new Error(`Missing observed evidence for ${item.id}`);
    // Every cohort case is a controlled fixture. Validating here catches a
    // malformed extension bundle before any profile or score is produced.
    ControlledFixtureEvidenceSchema.parse(evidence);
    evidenceById.set(item.id, evidence);
  }
  if (evidenceById.size !== scoredCases.length)
    throw new Error("Evidence set does not match the cohort");

  const rows: RecoveryRow[] = scoredCases.map((item) => {
    const label = labelsById.get(item.id);
    if (!label) throw new Error(`Missing label for ${item.id}`);
    const evidence = evidenceById.get(item.id)!;
    const profile = buildStructuredRetrievalInput(evidence);
    const signals = deriveSignals(evidence);
    const { candidates, routeExcluded } = routeCandidates(index, profile);
    const eligible = eligibleRunbookSections(index, profile).map(
      (section) => section.citation,
    );
    const accepted = uniq(
      item.requiredFacets.flatMap((facet) => facet.accepted),
    );
    const eligibleAccepted = accepted.filter((citation) =>
      eligible.includes(citation),
    );
    const routedAccepted = eligibleAccepted.filter((citation) =>
      candidates.some((section) => section.citation === citation),
    );
    const routeCoverage = eligibleAccepted.length
      ? routedAccepted.length / eligibleAccepted.length
      : 1;
    const facets = profile.requestedFacets ?? [];
    const faultPresent = faultSignalKeys.some((signal) => signals[signal]);
    const facetInvariant =
      !faultPresent ||
      (facets.includes("verification") && facets.length === 3);
    const typedRoute =
      !profile.route?.confident ||
      (profile.route.reasons.length > 0 &&
        profile.route.reasons.every((reason) => typedReason.test(reason)));
    const equivalenceProvenance = label.requiredFacets.every((facet) => {
      if (facet.accepted.length < 2) return true;
      const lines = rationaleLines(facet.rationale);
      return (
        lines.length === facet.accepted.length &&
        facet.accepted.every((citation) =>
          lines.some((line) => line.startsWith(citation)),
        )
      );
    });
    return {
      case: item,
      label,
      evidence,
      profile,
      signals,
      eligible,
      routed: candidates.map((section) => section.citation),
      routeExcluded,
      accepted,
      routeCoverage,
      facetInvariant,
      typedRoute,
      equivalenceProvenance,
    };
  });

  return {
    index,
    cases: scoredCases,
    labels,
    rows,
    hashes: {
      corpus: actualCorpus,
      cases: actualCases,
      labels: actualLabels,
      protocol: protocolHash,
      evidence: jsonHash(evidenceFile),
      review: reviewHash,
    },
  };
}

export type RecoveryArmMetrics = {
  hitAt3: number;
  macroSectionRecallAt3: number;
  directPrecisionAt3: number;
  noMatchAbstention: number;
  falseAbstention: number;
  strictHitAt3: number;
  strictMacroSectionRecallAt3: number;
  strictLabelGap: number;
  routeCoverage: number;
  reliability: number;
  p95LatencyMs: number;
  counts: {
    scheduled: number;
    eligibleAnswerable: number;
    noMatch: number;
    unavailable: number;
    providerExcluded: number;
  };
};

const armMetrics = (report: ReturnType<typeof scoreTarget>): RecoveryArmMetrics => ({
  hitAt3: report.metrics.sufficientGuidanceHitAt3 ?? 0,
  macroSectionRecallAt3: report.metrics.macroSectionRecallAt3 ?? 0,
  directPrecisionAt3: report.metrics.directPrecisionAt3 ?? 0,
  noMatchAbstention: report.noMatchAbstention.rate ?? 0,
  falseAbstention: report.falseAbstention.rate ?? 0,
  strictHitAt3: report.metrics.strictSufficientGuidanceHitAt3 ?? 0,
  strictMacroSectionRecallAt3:
    report.metrics.strictMacroSectionRecallAt3 ?? 0,
  strictLabelGap: report.metrics.strictLabelGap ?? 0,
  routeCoverage: report.metrics.routeCoverage ?? 0,
  reliability: report.reliability.rate ?? 0,
  p95LatencyMs: report.p95LatencyMs ?? 0,
  counts: {
    scheduled: report.counts.scheduled,
    eligibleAnswerable: report.counts.eligibleAnswerable,
    noMatch: report.counts.noMatch,
    unavailable: report.counts.unavailable,
    providerExcluded: report.counts.providerExcluded,
  },
});

export type ScreeningCheck = {
  value: number | boolean | null;
  threshold: number | boolean | string;
  pass: boolean;
  detail?: string;
};

export type ScreeningGate = {
  status: "passed" | "failed";
  checks: Record<string, ScreeningCheck>;
  failing: string[];
};

export function evaluateDevelopmentGate(input: {
  dev24: RecoveryArmMetrics;
  dev24Keyword: RecoveryArmMetrics;
  dev32: RecoveryArmMetrics;
  dev32Keyword: RecoveryArmMetrics;
  facetInvariant: boolean;
  typedRoute: boolean;
  equivalenceProvenance: boolean;
  routeCoverage: number;
}): ScreeningGate {
  const checks: Record<string, ScreeningCheck> = {
    dev24SufficientGuidanceHitAt3: {
      value: input.dev24.hitAt3,
      threshold: 0.8,
      pass: input.dev24.hitAt3 >= 0.8,
    },
    dev24MacroSectionRecallAt3: {
      value: input.dev24.macroSectionRecallAt3,
      threshold: 0.8,
      pass: input.dev24.macroSectionRecallAt3 >= 0.8,
    },
    dev32SufficientGuidanceHitAt3: {
      value: input.dev32.hitAt3,
      threshold: 0.8,
      pass: input.dev32.hitAt3 >= 0.8,
    },
    dev32MacroSectionRecallAt3: {
      value: input.dev32.macroSectionRecallAt3,
      threshold: 0.8,
      pass: input.dev32.macroSectionRecallAt3 >= 0.8,
    },
    dev32NoMatchAbstention: {
      value: input.dev32.noMatchAbstention,
      threshold: 0.9,
      pass: input.dev32.noMatchAbstention >= 0.9,
    },
    dev32FalseAbstention: {
      value: input.dev32.falseAbstention,
      threshold: 0.05,
      pass: input.dev32.falseAbstention <= 0.05,
    },
    directPrecisionDev24: {
      value: input.dev24.directPrecisionAt3,
      threshold: input.dev24Keyword.directPrecisionAt3,
      pass: input.dev24.directPrecisionAt3 >= input.dev24Keyword.directPrecisionAt3,
    },
    directPrecisionDev32: {
      value: input.dev32.directPrecisionAt3,
      threshold: input.dev32Keyword.directPrecisionAt3,
      pass: input.dev32.directPrecisionAt3 >= input.dev32Keyword.directPrecisionAt3,
    },
    facetInvariant: {
      value: input.facetInvariant,
      threshold: true,
      pass: input.facetInvariant,
    },
    typedRouteAudit: {
      value: input.typedRoute,
      threshold: true,
      pass: input.typedRoute,
    },
    equivalenceProvenance: {
      value: input.equivalenceProvenance,
      threshold: true,
      pass: input.equivalenceProvenance,
    },
    routeCoverage: {
      value: input.routeCoverage,
      threshold: 1,
      pass: input.routeCoverage === 1,
    },
  };
  const failing = Object.entries(checks)
    .filter(([, check]) => !check.pass)
    .map(([name]) => name);
  return {
    status: failing.length ? "failed" : "passed",
    checks,
    failing,
  };
}

type ProfileScoreRecord = {
  original: { logits: Record<string, number>; rerankMs: number };
};

export type RecoveryScores = {
  inputHash: string;
  records: Record<string, ProfileScoreRecord>;
};

export async function buildRecoveryInference(
  context: RecoveryContext,
  outDir: string,
): Promise<{ inputHash: string; inferencePath: string }> {
  const r23 = JSON.parse(await readFile(r23ConfigPath, "utf8")) as {
    models: { reranker: unknown };
  };
  const config = {
    models: { reranker: r23.models.reranker },
    variants: ["original"],
    batchSize: 8,
    maxLength: 512,
  };
  const queries = context.rows.map((row) => {
    const eligible = [...eligibleRunbookSections(context.index, row.profile)].sort(
      (left, right) => left.citation.localeCompare(right.citation),
    );
    const passages: Record<string, string> = {};
    for (const section of eligible)
      passages[section.citation] = `${section.heading}\n${section.content}`;
    return {
      id: row.case.id,
      query: row.profile.query,
      candidates: eligible.map((section) => section.citation),
      passages: { original: passages },
    };
  });
  const payload = { config, queries };
  const inputHash = hash(payload);
  const inferencePath = join(outDir, "inference-original.json");
  await writeFile(
    inferencePath,
    JSON.stringify({ inputHash, ...payload }, null, 2) + "\n",
    { flag: "wx" },
  );
  return { inputHash, inferencePath };
}

export async function scoreRecovery(input: {
  inferencePath: string;
  scoresPath: string;
  cacheDir: string;
}): Promise<RecoveryScores> {
  const node = "node";
  execFileSync(
    node,
    [scoreScript, input.inferencePath, input.scoresPath, input.cacheDir],
    { cwd: repoRoot, stdio: "inherit", timeout: 900_000 },
  );
  return JSON.parse(await readFile(input.scoresPath, "utf8")) as RecoveryScores;
}

const outputFor = (
  item: TargetCase,
  returned: string[],
  latencyMs: number,
  candidates: string[],
  routeExcluded: string[],
): TargetOutput => ({
  id: item.id,
  returned,
  latencyMs,
  candidates,
  routeExcluded,
});

export function rankRecovery(
  context: RecoveryContext,
  scores: RecoveryScores,
): {
  candidate: TargetOutput[];
  keyword: TargetOutput[];
  detail: Array<{
    id: string;
    supportReason: string;
    abstained: boolean;
    facetsRequested: string[];
    facetsCovered: string[];
    missingFacets: string[];
    matchedAnchors: string[];
    routeHints: string[];
    routeReasons: string[];
    requestedFacets: string[];
    anchors: string[];
  }>;
} {
  const candidate: TargetOutput[] = [];
  const keyword: TargetOutput[] = [];
  const detail: Array<{
    id: string;
    supportReason: string;
    abstained: boolean;
    facetsRequested: string[];
    facetsCovered: string[];
    missingFacets: string[];
    matchedAnchors: string[];
    routeHints: string[];
    routeReasons: string[];
    requestedFacets: string[];
    anchors: string[];
  }> = [];

  for (const row of context.rows) {
    const record = scores.records[row.case.id]?.original;
    if (!record) throw new Error(`Missing scores for ${row.case.id}`);
    const acceptance = new Map(
      row.case.requiredFacets.map(
        (facet) => [facet.facet, facet.accepted] as const,
      ),
    );
    const packed = rankStructured(
      context.index,
      row.profile,
      record.logits,
      { minAnchorHits: 1 },
      acceptance,
    );
    const returned = packed.matches.map((match) => match.citation);
    const missingFacets = row.case.requiredFacets
      .filter(
        (facet) =>
          !facet.accepted.some((citation) => returned.includes(citation)),
      )
      .map((facet) => facet.facet);
    candidate.push(
      outputFor(
        row.case,
        returned,
        record.rerankMs,
        row.eligible,
        packed.route.hints.length ? row.routeExcluded : [],
      ),
    );
    detail.push({
      id: row.case.id,
      supportReason: packed.supportReason,
      abstained: packed.abstained,
      facetsRequested: [...packed.facetsRequested],
      facetsCovered: [...packed.facetsCovered],
      missingFacets,
      matchedAnchors: [...packed.matchedAnchors],
      routeHints: [...(row.profile.route?.hints ?? [])],
      routeReasons: [...(row.profile.route?.reasons ?? [])],
      requestedFacets: [...(row.profile.requestedFacets ?? [])],
      anchors: [...(row.profile.anchors ?? [])],
    });

    const started = performance.now();
    const keywordScored = scoredRunbookSections(context.index, row.case.input);
    const keywordReturned = keywordScored
      .slice(0, row.case.input.limit ?? 3)
      .map((entry) => entry.section.citation);
    keyword.push(
      outputFor(
        row.case,
        keywordReturned,
        performance.now() - started,
        eligibleRunbookSections(context.index, row.case.input).map(
          (section) => section.citation,
        ),
        [],
      ),
    );
  }
  return { candidate, keyword, detail };
}

const cohortReports = (
  context: RecoveryContext,
  candidate: TargetOutput[],
  keyword: TargetOutput[],
) => {
  const dev24Cases = context.cases.slice(0, 24);
  const dev24Ids = new Set(dev24Cases.map((item) => item.id));
  const dev24Candidate = candidate.filter((item) => dev24Ids.has(item.id));
  const dev24Keyword = keyword.filter((item) => dev24Ids.has(item.id));
  return {
    dev24: armMetrics(scoreTarget(context.index, dev24Cases, dev24Candidate)),
    dev24Keyword: armMetrics(
      scoreTarget(context.index, dev24Cases, dev24Keyword),
    ),
    dev32: armMetrics(scoreTarget(context.index, context.cases, candidate)),
    dev32Keyword: armMetrics(
      scoreTarget(context.index, context.cases, keyword),
    ),
  };
};

const familyOf = (id: string) => {
  const match = /^f(0[1-9]|10)-/.exec(id);
  if (match) return `F${match[1]}`;
  if (id.startsWith("s")) return "S";
  return "NM";
};

const failureLedger = (
  context: RecoveryContext,
  report: ReturnType<typeof scoreTarget>,
  detail: ReturnType<typeof rankRecovery>["detail"],
) => {
  const detailById = new Map(detail.map((item) => [item.id, item]));
  const caseById = new Map(context.cases.map((item) => [item.id, item]));
  const bucket = (row: (typeof report.rows)[number]) => {
    const info = detailById.get(row.id);
    if (row.kind !== "answerable")
      return info?.routeHints.length ? "route_false_positive" : "abstained";
    if (!row.available) return "unavailable";
    const item = caseById.get(row.id);
    if (
      info?.requestedFacets.length &&
      item?.requiredFacets.some(
        (facet) => !info.requestedFacets.includes(facet.facet),
      )
    )
      return "facet_derivation";
    if (info?.routeHints.length === 0)
      return "transport_signal_missed";
    return "label_equivalence";
  };
  return report.rows
    .filter(
      (row) =>
        (row.kind === "answerable" && !row.sufficient) ||
        (row.kind === "no_match" && row.available && row.returned.length > 0),
    )
    .map((row) => {
      const info = detailById.get(row.id);
      return {
        id: row.id,
        family: familyOf(row.id),
        kind: row.kind,
        bucket: bucket(row),
        returned: row.returned,
        missingFacets: info?.missingFacets ?? [],
        requestedFacets: info?.requestedFacets ?? [],
        routeHints: info?.routeHints ?? [],
      };
    });
};

const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? "n/a" : `${(value * 100).toFixed(2)}%`;

const table = (rows: string[][]) => {
  const header = rows[0];
  if (!header) return "";
  return [header, header.map(() => "---"), ...rows.slice(1)]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");
};

const buildScreeningMarkdown = (input: {
  gate: ScreeningGate;
  metrics: ReturnType<typeof cohortReports>;
  context: RecoveryContext;
  integrity: Record<string, boolean>;
  ledger: ReturnType<typeof failureLedger>;
  evidenceLimitations: string[];
}) => {
  const { gate, metrics, context, integrity, ledger } = input;
  const rows = [
    ["Gate", "Value", "Threshold", "Result"],
    ...Object.entries(gate.checks).map(([name, check]) => [
      name,
      typeof check.value === "boolean"
        ? String(check.value)
        : typeof check.value === "number"
          ? percent(check.value)
          : String(check.value),
      typeof check.threshold === "boolean"
        ? String(check.threshold)
        : typeof check.threshold === "number"
          ? percent(check.threshold)
          : String(check.threshold),
      check.pass ? "pass" : "**FAIL**",
    ]),
  ];
  return `# R3.5r.3 — development screening

**Status: \`${gate.status}\`.**

Generated from the frozen recovery protocol revision 3 and the development v2
cohort. This is screening, not release acceptance. No candidate behavior was
changed to produce this report.

## Gate

${table(rows)}

Failing checks: ${gate.failing.length ? gate.failing.map((name) => `\`${name}\``).join(", ") : "none"}.

## Cohort results

| Cohort | Arm | hit@3 | Macro recall | Direct precision | No-match abstention | False abstention | Strict hit@3 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| dev-24 | candidate | ${percent(metrics.dev24.hitAt3)} | ${percent(metrics.dev24.macroSectionRecallAt3)} | ${percent(metrics.dev24.directPrecisionAt3)} | ${percent(metrics.dev24.noMatchAbstention)} | ${percent(metrics.dev24.falseAbstention)} | ${percent(metrics.dev24.strictHitAt3)} |
| dev-24 | keyword | ${percent(metrics.dev24Keyword.hitAt3)} | ${percent(metrics.dev24Keyword.macroSectionRecallAt3)} | ${percent(metrics.dev24Keyword.directPrecisionAt3)} | ${percent(metrics.dev24Keyword.noMatchAbstention)} | ${percent(metrics.dev24Keyword.falseAbstention)} | ${percent(metrics.dev24Keyword.strictHitAt3)} |
| dev-32 | candidate | ${percent(metrics.dev32.hitAt3)} | ${percent(metrics.dev32.macroSectionRecallAt3)} | ${percent(metrics.dev32.directPrecisionAt3)} | ${percent(metrics.dev32.noMatchAbstention)} | ${percent(metrics.dev32.falseAbstention)} | ${percent(metrics.dev32.strictHitAt3)} |
| dev-32 | keyword | ${percent(metrics.dev32Keyword.hitAt3)} | ${percent(metrics.dev32Keyword.macroSectionRecallAt3)} | ${percent(metrics.dev32Keyword.directPrecisionAt3)} | ${percent(metrics.dev32Keyword.noMatchAbstention)} | ${percent(metrics.dev32Keyword.falseAbstention)} | ${percent(metrics.dev32Keyword.strictHitAt3)} |

Strict-label sensitivity is reported beside the primary metric; a primary minus
strict gap above 0.10 is a labelling risk (dev-32 gap:
${percent(metrics.dev32.strictLabelGap)}).

## Integrity

| Check | Result |
| --- | ---: |
| Facet invariant | ${integrity.facetInvariant ? "pass" : "**FAIL**"} |
| Typed-route audit | ${integrity.typedRouteAudit ? "pass" : "**FAIL**"} |
| Equivalence provenance | ${integrity.equivalenceProvenance ? "pass" : "**FAIL**"} |
| Freeze integrity | ${integrity.freezeIntegrity ? "pass" : "**FAIL**"} |
| No consumed holdout data | ${integrity.noConsumedData ? "pass" : "**FAIL**"} |

## Failure ledger

${ledger.length ? table([
    ["Case", "Family", "Kind", "Bucket", "Returned", "Missing facets", "Requested facets"],
    ...ledger.map((item) => [
      `\`${item.id}\``,
      item.family,
      item.kind,
      item.bucket,
      item.returned.join(", ") || "—",
      item.missingFacets.join(", ") || "—",
      item.requestedFacets.join(", ") || "—",
    ]),
  ]) : "No misses or false positives."}

## Frozen inputs

| Artifact | SHA-256 |
| --- | --- |
| corpus sections | \`${context.hashes.corpus}\` |
| development cases v2 | \`${context.hashes.cases}\` |
| development labels v2 | \`${context.hashes.labels}\` |
| recovery protocol | \`${context.hashes.protocol}\` |
| development evidence v2 | \`${context.hashes.evidence}\` |
| pinned review source | \`${context.hashes.review}\` |

## Limitations

${input.evidenceLimitations.map((line) => `- ${line}`).join("\n")}
- The development cohort is exposed and may be tuned on; these values screen the
  candidate and are not release acceptance.
- The 80% development gate is a screening gate. It is not the 90% release gate.
`;
};

export async function runRecoveryScreening(input: {
  outDir: string;
  cacheDir: string;
  scoresPath?: string;
}): Promise<{ gate: ScreeningGate; reportPath: string }> {
  const context = await loadRecoveryContext();
  await mkdir(input.outDir, { recursive: true });
  const { inputHash, inferencePath } = await buildRecoveryInference(
    context,
    input.outDir,
  );
  const scoresPath = join(input.outDir, "scores-original.json");
  if (input.scoresPath) {
    if (resolve(input.scoresPath) !== resolve(scoresPath))
      await copyFile(input.scoresPath, scoresPath);
  } else {
    await scoreRecovery({
      inferencePath,
      scoresPath,
      cacheDir: input.cacheDir,
    });
  }
  const scores = JSON.parse(await readFile(scoresPath, "utf8")) as RecoveryScores;
  if (scores.inputHash !== inputHash)
    throw new Error("Scores do not belong to this recovery inference input");

  const ranked = rankRecovery(context, scores);
  const metrics = cohortReports(context, ranked.candidate, ranked.keyword);
  const routeCoverage =
    context.rows.filter((row) => row.case.kind === "answerable").length > 0
      ? context.rows
          .filter((row) => row.case.kind === "answerable")
          .reduce((sum, row) => sum + row.routeCoverage, 0) /
        context.rows.filter((row) => row.case.kind === "answerable").length
      : 1;
  const integrity = {
    facetInvariant: context.rows.every((row) => row.facetInvariant),
    typedRouteAudit: context.rows.every((row) => row.typedRoute),
    equivalenceProvenance: context.rows.every(
      (row) => row.equivalenceProvenance,
    ),
    freezeIntegrity: true,
    noConsumedData: ![
      casesPath,
      labelsPath,
      evidencePath,
      corpusPath,
      protocolPath,
      reviewPath,
    ].some((path) => path.includes(`${join("r3", "holdout")}`)),
  };
  const gate = evaluateDevelopmentGate({
    dev24: metrics.dev24,
    dev24Keyword: metrics.dev24Keyword,
    dev32: metrics.dev32,
    dev32Keyword: metrics.dev32Keyword,
    facetInvariant: integrity.facetInvariant,
    typedRoute: integrity.typedRouteAudit,
    equivalenceProvenance: integrity.equivalenceProvenance,
    routeCoverage,
  });

  const report = {
    run: input.outDir.split(/[\\/]/).pop(),
    phase: "R3.5r.3",
    generatedAt: new Date().toISOString(),
    status: gate.status,
    profileVersion: "r3.5r-v1",
    candidateArm: "profile-route-facets-support-r3.5r",
    support: { minAnchorHits: 1 },
    packingVersion: "r3.3-v1",
    corpusHash: context.hashes.corpus,
    casesHash: context.hashes.cases,
    labelHash: context.hashes.labels,
    protocolHash: context.hashes.protocol,
    evidenceHash: context.hashes.evidence,
    reviewHash: context.hashes.review,
    inputHash,
    scoresHash: await sha256File(scoresPath),
    counts: {
      dev24: metrics.dev24.counts,
      dev32: metrics.dev32.counts,
    },
    metrics,
    gate,
    integrity,
    evidenceLimitations: [
      "Pinned evidence is the reviewed production-selection capture; extension evidence was authored at R3.5r.3 to close the missing-evidence gap in R3.5r.1 and was not part of that independent review.",
      "The extension evidence was written after the extension labels were frozen and before any extension ranking or score existed.",
      "The evaluation remains a development screening; it does not establish holdout transfer.",
    ],
    routeAudit: context.rows.map((row) => ({
      id: row.case.id,
      kind: row.case.kind,
      hints: row.profile.route?.hints ?? [],
      confident: row.profile.route?.confident ?? false,
      reasons: row.profile.route?.reasons ?? [],
      requestedFacets: row.profile.requestedFacets ?? [],
      anchors: row.profile.anchors ?? [],
      eligible: row.eligible.length,
      routed: row.routed.length,
      routeExcluded: row.routeExcluded,
      accepted: row.accepted,
      routeCoverage: row.routeCoverage,
      facetInvariant: row.facetInvariant,
      typedRoute: row.typedRoute,
      signals: row.signals,
    })),
    detail: ranked.detail,
    ledger: failureLedger(
      context,
      scoreTarget(context.index, context.cases, ranked.candidate),
      ranked.detail,
    ),
    arms: {
      candidate: {
        dev24: scoreTarget(context.index, context.cases.slice(0, 24), ranked.candidate.filter((item) => context.cases.slice(0, 24).some((c) => c.id === item.id))),
        dev32: scoreTarget(context.index, context.cases, ranked.candidate),
      },
      keyword: {
        dev24: scoreTarget(context.index, context.cases.slice(0, 24), ranked.keyword.filter((item) => context.cases.slice(0, 24).some((c) => c.id === item.id))),
        dev32: scoreTarget(context.index, context.cases, ranked.keyword),
      },
    },
    notes: {
      candidate:
        "The candidate is the frozen R3.5r profile with typed transport routing, per-signal facets, facet packing, and the R3.4 support gate.",
      keyword:
        "Keyword control uses the frozen case input query and the same corpus.",
      noTuning:
        "No route, facet, packer, support, corpus, label, or gate was changed while producing this report.",
    },
  };

  const reportPath = join(input.outDir, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });
  const screeningPath = join(input.outDir, "screening.md");
  await writeFile(
    screeningPath,
    buildScreeningMarkdown({
      gate,
      metrics,
      context,
      integrity,
      ledger: report.ledger,
      evidenceLimitations: report.evidenceLimitations,
    }),
    { flag: "wx" },
  );
  const manifest = {
    run: report.run,
    generatedAt: report.generatedAt,
    files: {
      "inference-original.json": await sha256File(inferencePath),
      "scores-original.json": await sha256File(scoresPath),
      "report.json": await sha256File(reportPath),
      "screening.md": await sha256File(screeningPath),
    },
    counts: report.counts,
    gate: { status: gate.status, failing: gate.failing },
  };
  await writeFile(
    join(input.outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { flag: "wx" },
  );
  return { gate, reportPath };
}

async function main() {
  const { values } = parseArgs({
    options: {
      out: { type: "string" },
      scores: { type: "string" },
      "cache-dir": { type: "string" },
    },
    strict: true,
  });
  const result = await runRecoveryScreening({
    outDir: resolve(values.out ?? defaultOutDir),
    cacheDir: resolve(
      values["cache-dir"] ??
        process.env.RUNBOOK_MINILM_CACHE_DIR ??
        join(repoRoot, ".tmp-turbo-user/r2-models"),
    ),
    ...(values.scores ? { scoresPath: resolve(values.scores) } : {}),
  });
  console.log(`phaseGate=${result.gate.status}`);
  console.log(`report=${relative(repoRoot, result.reportPath)}`);
  if (result.gate.status !== "passed")
    process.exitCode = 1;
}

if (import.meta.main) await main();
