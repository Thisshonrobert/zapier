// R4.3 development screening and R4.4 sealed-holdout acceptance. The driver runs
// the frozen structured-minilm candidate and the keyword control on one cohort,
// scores both with the existing `scoreTarget`, and reports Wilson 95% intervals,
// per-family metrics, a staged failure ledger, and the stage decision.
//
// The development path reads only R4 development artifacts. The holdout path
// verifies `selected-retrieval-config.json` and every sealed hash before it
// opens the holdout, and writes exactly one immutable run directory.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { z } from "zod";

import {
  ControlledFixtureEvidenceSchema,
  type DiagnosisEvidence,
} from "../contracts.ts";
import {
  buildStructuredRetrievalInput,
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
  canonicalSections,
  corpusHash,
  loadFrozenCorpus,
  loadTargetCases,
  loadTargetLabelsV2,
  scoreTarget,
  targetLabelHash,
  type TargetCase,
  type TargetLabelCase,
  type TargetOutput,
} from "./retrieval-target.ts";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const r4Dir = join(repoRoot, "apps/ai_agent/evaluation/r4");
const r3Dir = join(repoRoot, "apps/ai_agent/evaluation/r3");
const protocolPath = join(r4Dir, "protocol.json");
const casesPath = join(r4Dir, "development-cases-v1.json");
const labelsPath = join(r4Dir, "development-labels-v2.json");
const evidencePath = join(r4Dir, "development-evidence-v1.json");
const holdoutDir = join(r4Dir, "holdout");
const holdoutCasesPath = join(holdoutDir, "cases-v1.json");
const holdoutLabelsPath = join(holdoutDir, "labels-v2.json");
const holdoutEvidencePath = join(holdoutDir, "evidence-v1.json");
const holdoutSealPath = join(holdoutDir, "seal.json");
const selectedConfigPath = join(r4Dir, "selected-retrieval-config.json");
const developmentRunManifestPath = join(
  r4Dir,
  "runs",
  "dev-20261021-v2",
  "manifest.json",
);
const corpusPath = join(r3Dir, "corpus-v1.json");
const r23ConfigPath = join(repoRoot, "apps/ai_agent/evaluation/r23/config.json");
const scoreScript = join(
  repoRoot,
  "apps/ai_agent/src/evaluation/recovery-score.mjs",
);
const defaultOutDir = join(r4Dir, "runs", "dev-20261021-v1");
const defaultHoldoutOutDir = join(r4Dir, "runs", "holdout-20261021-v1");

const candidateArm = "profile-route-facets-support";
const families = [
  "F01",
  "F02",
  "F03",
  "F04",
  "F05",
  "F06",
  "F07",
  "F08",
  "F09",
  "F10",
] as const;

export type RetrievalFamily = (typeof families)[number] | "S";

// ---------------------------------------------------------------------------
// Frozen input validation
// ---------------------------------------------------------------------------

const ProtocolSchema = z
  .object({
    version: z.literal(1),
    status: z.literal("frozen_before_measurement"),
    primaryMetric: z.literal("sufficientGuidanceHitAt3"),
    corpus: z
      .object({
        path: z.string(),
        sectionsHash: z.string().length(64),
        sections: z.number().int().positive(),
      })
      .passthrough(),
    development: z
      .object({
        cases: z.number().int().positive(),
        answerable: z.number().int().nonnegative(),
        noMatch: z.number().int().nonnegative(),
      })
      .passthrough(),
    holdout: z
      .object({
        cases: z.number().int().positive(),
        answerable: z.number().int().nonnegative(),
        noMatch: z.number().int().nonnegative(),
      })
      .passthrough(),
    gates: z
      .object({
        development: z
          .object({
            sufficientGuidanceHitAt3: z.number(),
            macroSectionRecallAt3: z.number(),
            noMatchAbstention: z.number(),
            falseAbstentionMax: z.number(),
            routeCoverage: z.number(),
            reliability: z.number(),
            p95LatencyMs: z.number(),
          })
          .passthrough(),
        acceptance: z
          .object({
            sufficientGuidanceHitAt3Point: z.number(),
            sufficientGuidanceHitAt3WilsonLower: z.number(),
            macroSectionRecallAt3Point: z.number(),
            macroSectionRecallAt3WilsonLower: z.number(),
            noMatchAbstentionPoint: z.number(),
            noMatchAbstentionWilsonLower: z.number(),
            falseAbstentionPointMax: z.number(),
            perFamilyHitAt3Min: z.number(),
            routeCoverage: z.number(),
            reliability: z.number(),
            p95LatencyMs: z.number(),
            safetyViolationsMax: z.number(),
          })
          .passthrough(),
      })
      .passthrough(),
    statistics: z
      .object({
        interval: z.literal("wilson"),
        confidence: z.number().gt(0).lt(1),
      })
      .passthrough(),
  })
  .passthrough();

export type R4Protocol = z.infer<typeof ProtocolSchema>;

const EvidenceFileSchema = z
  .object({
    artifact: z.string().min(1).optional(),
    version: z.literal(1),
    cases: z.array(
      z
        .object({
          id: z.string().min(1),
          evidence: ControlledFixtureEvidenceSchema,
        })
        .strict(),
    ),
  })
  .passthrough();

// Frozen candidate identity. R4.4 writes this before the holdout is opened and
// verifies every hash again before a single holdout case is read.
export const SelectedRetrievalConfigSchema = z
  .object({
    retrievalMethod: z.literal("structured-minilm"),
    profileVersion: z.literal("r4-v1"),
    packingVersion: z.literal("r3.3-v1"),
    supportVersion: z.literal("r3.4-v1"),
    support: z.object({ minAnchorHits: z.literal(1) }).strict(),
    corpusHash: z.string().length(64),
    developmentLabelHash: z.string().length(64),
    developmentRunHash: z.string().length(64),
    protocolHash: z.string().length(64),
    model: z
      .object({
        id: z.literal("Xenova/ms-marco-MiniLM-L-6-v2"),
        revision: z.literal("a09144355adeed5f58c8ed011d209bf8ee5a1fec"),
        quantization: z.literal("q8"),
      })
      .strict(),
    prompt: z
      .object({
        id: z.literal("diagnosis"),
        version: z.literal("phase-11a-v3"),
      })
      .strict(),
    holdoutSealHash: z.string().length(64),
  })
  .passthrough();

export type SelectedRetrievalConfig = z.infer<
  typeof SelectedRetrievalConfigSchema
>;

const HoldoutSealSchema = z
  .object({
    version: z.literal(1),
    hashMethod: z.string().min(1),
    corpus: z
      .object({
        path: z.string().min(1),
        hash: z.string().length(64),
      })
      .passthrough(),
    files: z.record(
      z.string(),
      z
        .object({
          path: z.string().min(1),
          hash: z.string().length(64),
          bytes: z.number().int().positive().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, "utf8")) as T;

const sha256Bytes = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const sha256File = async (path: string) => sha256Bytes(await readFile(path));

const repoPath = (path: string) =>
  relative(repoRoot, path).replaceAll("\\", "/");

// ---------------------------------------------------------------------------
// Wilson interval and metric rows
// ---------------------------------------------------------------------------

export type WilsonInterval = {
  lower: number | null;
  upper: number | null;
  confidence: number;
};

export type Metric = {
  numerator: number;
  denominator: number;
  rate: number | null;
  // The gated point estimate. For a proportion it equals `rate`; for an
  // averaged per-case metric it is the macro mean while numerator/denominator
  // carry the citation-level evidence used for the interval.
  point: number | null;
  wilson: WilsonInterval | null;
  basis: string;
};

const erf = (value: number): number => {
  // Abramowitz & Stegun 7.1.26; sufficient for a confidence-quantile search.
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
};

const normalCdf = (value: number) => 0.5 * (1 + erf(value / Math.SQRT2));

const normalQuantile = (probability: number): number => {
  if (!(probability > 0 && probability < 1))
    throw new Error("normalQuantile needs a probability inside (0, 1)");
  let low = -8;
  let high = 8;
  for (let step = 0; step < 200; step += 1) {
    const middle = (low + high) / 2;
    if (normalCdf(middle) < probability) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
};

export function wilsonInterval(
  numerator: number,
  denominator: number,
  confidence = 0.95,
): WilsonInterval {
  if (!Number.isInteger(numerator) || numerator < 0)
    throw new Error("Wilson numerator must be a non-negative integer");
  if (!Number.isInteger(denominator) || denominator < 0)
    throw new Error("Wilson denominator must be a non-negative integer");
  if (numerator > denominator)
    throw new Error("Wilson numerator cannot exceed the denominator");
  if (!(confidence > 0 && confidence < 1))
    throw new Error("Wilson confidence must be inside (0, 1)");
  if (denominator === 0) return { lower: null, upper: null, confidence };
  const z = normalQuantile(1 - (1 - confidence) / 2);
  const proportion = numerator / denominator;
  const zSquared = z * z;
  const center = (proportion + zSquared / (2 * denominator)) / (1 + zSquared / denominator);
  const margin =
    (z *
      Math.sqrt(
        (proportion * (1 - proportion)) / denominator +
          zSquared / (4 * denominator * denominator),
      )) /
    (1 + zSquared / denominator);
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    confidence,
  };
}

export function metricRow(
  numerator: number,
  denominator: number,
  options: {
    point?: number | null;
    basis?: string;
    confidence?: number;
  } = {},
): Metric {
  const rate = denominator ? numerator / denominator : null;
  return {
    numerator,
    denominator,
    rate,
    point: options.point === undefined ? rate : options.point,
    wilson: wilsonInterval(numerator, denominator, options.confidence ?? 0.95),
    basis: options.basis ?? "proportion",
  };
}

// ---------------------------------------------------------------------------
// Decision rule
// ---------------------------------------------------------------------------

export type RetrievalStage = "development" | "acceptance";

export type RetrievalDecisionInput = {
  stage: RetrievalStage;
  hitAt3: Metric;
  macroSectionRecallAt3: Metric;
  noMatchAbstention: Metric;
  falseAbstention: Metric;
  directPrecisionAt3: Metric;
  keywordDirectPrecisionAt3: Metric;
  perFamilyHitAt3: Partial<Record<RetrievalFamily, Metric>>;
  routeCoverage: number | null;
  reliability: number | null;
  p95LatencyMs: number | null;
  safetyViolations: number;
  credentialFailure?: boolean;
};

export type DecisionCheck = {
  name: string;
  value: number | boolean | null;
  threshold: number | boolean | string | null;
  pass: boolean;
};

export type RetrievalDecision = {
  status: "retrieval_accepted" | "retrieval_rejected" | "blocked";
  failing: string[];
  blockedReasons: string[];
  checks: DecisionCheck[];
};

const numberValue = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const atLeast = (
  name: string,
  value: number | null | undefined,
  threshold: number,
): DecisionCheck => ({
  name,
  value: numberValue(value),
  threshold,
  pass: value !== null && value !== undefined && Number.isFinite(value) && value >= threshold,
});

const atMost = (
  name: string,
  value: number | null | undefined,
  threshold: number,
): DecisionCheck => ({
  name,
  value: numberValue(value),
  threshold,
  pass: value !== null && value !== undefined && Number.isFinite(value) && value <= threshold,
});

const equals = (
  name: string,
  value: number | boolean | null,
  threshold: number | boolean,
): DecisionCheck => ({ name, value, threshold, pass: value === threshold });

export function evaluateRetrievalDecision(
  input: RetrievalDecisionInput,
): RetrievalDecision {
  const blockedChecks: DecisionCheck[] = [
    {
      name: "credentialFailure",
      value: Boolean(input.credentialFailure),
      threshold: false,
      pass: !input.credentialFailure,
    },
    atMost("safetyViolations", input.safetyViolations, 0),
    atLeast("reliability", input.reliability, 0.95),
  ];
  const blockedReasons = blockedChecks
    .filter((check) => !check.pass)
    .map((check) => check.name);

  const quality: DecisionCheck[] = [];
  if (input.stage === "development") {
    quality.push(
      atLeast("hitAt3", input.hitAt3.point, 0.8),
      atLeast("macroSectionRecallAt3", input.macroSectionRecallAt3.point, 0.8),
      atLeast(
        "directPrecisionAt3",
        input.directPrecisionAt3.point,
        numberValue(input.keywordDirectPrecisionAt3.point) ?? Number.POSITIVE_INFINITY,
      ),
      atLeast("noMatchAbstention", input.noMatchAbstention.point, 0.9),
      atMost("falseAbstention", input.falseAbstention.point, 0.05),
      equals("routeCoverage", input.routeCoverage, 1),
      atMost("p95LatencyMs", input.p95LatencyMs, 3000),
    );
  } else {
    quality.push(
      atLeast("hitAt3.point", input.hitAt3.point, 0.9),
      atLeast("hitAt3.wilsonLower95", input.hitAt3.wilson?.lower, 0.82),
      atLeast(
        "macroSectionRecallAt3.point",
        input.macroSectionRecallAt3.point,
        0.9,
      ),
      atLeast(
        "macroSectionRecallAt3.wilsonLower95",
        input.macroSectionRecallAt3.wilson?.lower,
        0.82,
      ),
      atLeast(
        "noMatchAbstention.point",
        input.noMatchAbstention.point,
        0.9,
      ),
      atLeast(
        "noMatchAbstention.wilsonLower95",
        input.noMatchAbstention.wilson?.lower,
        0.75,
      ),
      atMost("falseAbstention.point", input.falseAbstention.point, 0.05),
      atLeast(
        "directPrecisionAt3",
        input.directPrecisionAt3.point,
        numberValue(input.keywordDirectPrecisionAt3.point) ?? Number.POSITIVE_INFINITY,
      ),
      equals("routeCoverage", input.routeCoverage, 1),
      atMost("p95LatencyMs", input.p95LatencyMs, 3000),
    );
    for (const family of families)
      quality.push(
        atLeast(
          `perFamilyHitAt3.${family}`,
          input.perFamilyHitAt3[family]?.point,
          0.7,
        ),
      );
  }

  const failing = quality.filter((check) => !check.pass).map((check) => check.name);
  const status: RetrievalDecision["status"] = blockedReasons.length
    ? "blocked"
    : failing.length
      ? "retrieval_rejected"
      : "retrieval_accepted";
  return {
    status,
    failing,
    blockedReasons,
    checks: [...blockedChecks, ...quality],
  };
}

// ---------------------------------------------------------------------------
// Cohort loading
// ---------------------------------------------------------------------------

export type CohortRow = {
  case: TargetCase;
  label: TargetLabelCase;
  evidence: DiagnosisEvidence;
  profile: StructuredRunbookSearchInput;
  eligible: string[];
  routed: string[];
  routeExcluded: string[];
  accepted: string[];
  routeCoverage: number;
  eligibleAnswerable: boolean;
};

export type CohortContext = {
  protocol: R4Protocol;
  index: RunbookIndex;
  cases: TargetCase[];
  labels: Array<TargetLabelCase>;
  rows: CohortRow[];
  hashes: {
    protocol: string;
    corpus: string;
    cases: string;
    labels: string;
    evidence: string;
  };
};

const uniq = <T>(values: readonly T[]): T[] => [...new Set(values)];

// The label file is the scored source of accepted citations. The case file
// supplies identity, split, kind, and input. A drift between them fails closed.
export function scoredCasesFromLabels(
  cases: readonly TargetCase[],
  labels: readonly TargetLabelCase[],
): TargetCase[] {
  const labelById = new Map(labels.map((item) => [item.id, item]));
  if (labelById.size !== labels.length) throw new Error("Duplicate label case id");
  return cases.map((item) => {
    const label = labelById.get(item.id);
    if (!label) throw new Error(`Missing label for ${item.id}`);
    const caseFacets = JSON.stringify(
      item.requiredFacets.map((facet) => [facet.facet, [...facet.accepted].sort()]),
    );
    const labelFacets = JSON.stringify(
      label.requiredFacets.map((facet) => [facet.facet, [...facet.accepted].sort()]),
    );
    if (caseFacets !== labelFacets)
      throw new Error(`Case and label facets disagree for ${item.id}`);
    if (JSON.stringify(item.supporting) !== JSON.stringify(label.supporting))
      throw new Error(`Case and label supporting citations disagree for ${item.id}`);
    if (
      JSON.stringify(item.missingRuntimeFacts) !==
      JSON.stringify(label.missingRuntimeFacts)
    )
      throw new Error(`Case and label runtime facts disagree for ${item.id}`);
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

type CohortPaths = {
  split: "development" | "holdout";
  casesPath: string;
  labelsPath: string;
  evidencePath: string;
};

async function loadCohortContext(paths: CohortPaths): Promise<CohortContext> {
  const [
    protocolRaw,
    cases,
    labels,
    frozen,
    evidenceRaw,
    index,
    protocolHash,
    casesBytes,
    labelsBytes,
    evidenceBytes,
  ] = await Promise.all([
    readFile(protocolPath, "utf8"),
    loadTargetCases(paths.casesPath),
    loadTargetLabelsV2(paths.labelsPath),
    loadFrozenCorpus(corpusPath),
    readFile(paths.evidencePath, "utf8"),
    loadRunbooks(join(repoRoot, "docs/AI/runbooks")),
    sha256File(protocolPath),
    readFile(paths.casesPath),
    readFile(paths.labelsPath),
    readFile(paths.evidencePath),
  ]);
  const protocol = ProtocolSchema.parse(JSON.parse(protocolRaw));
  const evidenceFile = EvidenceFileSchema.parse(JSON.parse(evidenceRaw));
  const expected =
    paths.split === "development" ? protocol.development : protocol.holdout;

  if (protocol.corpus.sectionsHash !== frozen.corpusHash)
    throw new Error("Protocol corpus hash does not match the frozen corpus");
  const actualSections = canonicalSections(index);
  if (
    corpusHash(actualSections) !== frozen.corpusHash ||
    JSON.stringify(actualSections) !== JSON.stringify(frozen.sections)
  )
    throw new Error("Serving runbooks changed; the frozen corpus no longer matches");

  if (expected.cases !== cases.length)
    throw new Error(`Protocol ${paths.split} count does not match the case file`);
  if (new Set(cases.map((item) => item.id)).size !== cases.length)
    throw new Error(`Duplicate ${paths.split} case id`);
  if (cases.some((item) => item.split !== paths.split))
    throw new Error(`Non-${paths.split} case in the ${paths.split} cohort`);
  const answerable = cases.filter((item) => item.kind === "answerable").length;
  const noMatch = cases.filter((item) => item.kind === "no_match").length;
  if (answerable !== expected.answerable)
    throw new Error("Protocol answerable count does not match the cohort");
  if (noMatch !== expected.noMatch)
    throw new Error("Protocol no-match count does not match the cohort");

  const scoredCases = scoredCasesFromLabels(cases, labels.cases);
  if (labels.cases.length !== cases.length)
    throw new Error("Label set does not match the cohort");

  const evidenceById = new Map<string, DiagnosisEvidence>();
  for (const entry of evidenceFile.cases) {
    if (evidenceById.has(entry.id))
      throw new Error(`Duplicate ${paths.split} evidence: ${entry.id}`);
    evidenceById.set(entry.id, ControlledFixtureEvidenceSchema.parse(entry.evidence));
  }
  if (evidenceById.size !== scoredCases.length)
    throw new Error("Evidence set does not match the cohort");

  const rows: CohortRow[] = scoredCases.map((item) => {
    const label = labels.cases.find((candidate) => candidate.id === item.id);
    if (!label) throw new Error(`Missing label for ${item.id}`);
    const evidence = evidenceById.get(item.id);
    if (!evidence) throw new Error(`Missing observed evidence for ${item.id}`);
    const profile = buildStructuredRetrievalInput(evidence);
    const eligible = eligibleRunbookSections(index, profile).map(
      (section) => section.citation,
    );
    const { candidates, routeExcluded } = routeCandidates(index, profile);
    const routed = candidates.map((section) => section.citation);
    const accepted = uniq(item.requiredFacets.flatMap((facet) => facet.accepted));
    const eligibleAccepted = accepted.filter((citation) =>
      eligible.includes(citation),
    );
    const routedAccepted = eligibleAccepted.filter((citation) =>
      routed.includes(citation),
    );
    return {
      case: item,
      label,
      evidence,
      profile,
      eligible,
      routed,
      routeExcluded,
      accepted,
      routeCoverage: eligibleAccepted.length
        ? routedAccepted.length / eligibleAccepted.length
        : 1,
      eligibleAnswerable: item.requiredFacets.every((facet) =>
        facet.accepted.some((citation) => eligible.includes(citation)),
      ),
    };
  });

  return {
    protocol,
    index,
    cases: scoredCases,
    labels: labels.cases,
    rows,
    hashes: {
      protocol: protocolHash,
      corpus: frozen.corpusHash,
      cases: sha256Bytes(casesBytes),
      labels: targetLabelHash(labels),
      evidence: sha256Bytes(evidenceBytes),
    },
  };
}

export async function loadDevelopmentContext(): Promise<CohortContext> {
  return loadCohortContext({
    split: "development",
    casesPath,
    labelsPath,
    evidencePath,
  });
}

// ---------------------------------------------------------------------------
// R4.4 candidate freeze and holdout seal
// ---------------------------------------------------------------------------

export type HoldoutSealVerification = {
  sealHash: string;
  sealPath: string;
  corpusHash: string;
  files: Record<string, string>;
};

export async function verifyHoldoutSeal(input: {
  expectedSealHash: string;
  corpusHash: string;
  sealPath?: string;
}): Promise<HoldoutSealVerification> {
  const sealPath = input.sealPath ?? holdoutSealPath;
  const sealBytes = await readFile(sealPath);
  const sealHash = sha256Bytes(sealBytes);
  if (sealHash !== input.expectedSealHash)
    throw new Error(
      `Holdout seal hash mismatch: expected ${input.expectedSealHash}, got ${sealHash}`,
    );
  const seal = HoldoutSealSchema.parse(JSON.parse(sealBytes.toString("utf8")));
  if (seal.corpus.hash !== input.corpusHash)
    throw new Error("Holdout seal corpus hash does not match the frozen corpus");

  const files: Record<string, string> = {};
  for (const [name, entry] of Object.entries(seal.files)) {
    const filePath = resolve(repoRoot, entry.path);
    const bytes = await readFile(filePath);
    if (entry.bytes !== undefined && entry.bytes !== bytes.length)
      throw new Error(
        `Sealed file length mismatch for ${name}: expected ${entry.bytes}, got ${bytes.length}`,
      );
    const actual = sha256Bytes(bytes);
    if (actual !== entry.hash)
      throw new Error(
        `Sealed file hash mismatch for ${name}: expected ${entry.hash}, got ${actual}`,
      );
    files[name] = actual;
  }

  return {
    sealHash,
    sealPath: repoPath(sealPath),
    corpusHash: seal.corpus.hash,
    files,
  };
}

export async function loadSelectedRetrievalConfig(
  configPath: string,
): Promise<{ config: SelectedRetrievalConfig; configHash: string }> {
  const bytes = await readFile(configPath);
  return {
    config: SelectedRetrievalConfigSchema.parse(
      JSON.parse(bytes.toString("utf8")),
    ),
    configHash: sha256Bytes(bytes),
  };
}

export type HoldoutContext = {
  context: CohortContext;
  config: SelectedRetrievalConfig;
  configHash: string;
  seal: HoldoutSealVerification;
};

// The only function that opens the sealed holdout. It verifies the frozen
// candidate config and every sealed hash before the holdout cases, labels, and
// evidence are read.
export async function loadHoldoutContext(
  configPath: string,
): Promise<HoldoutContext> {
  const { config, configHash } =
    await loadSelectedRetrievalConfig(configPath);

  const [protocolRaw, protocolHash, developmentLabelHash, developmentRunHash] =
    await Promise.all([
      readFile(protocolPath, "utf8"),
      sha256File(protocolPath),
      sha256File(labelsPath),
      sha256File(developmentRunManifestPath),
    ]);
  const protocol = ProtocolSchema.parse(JSON.parse(protocolRaw));

  if (config.protocolHash !== protocolHash)
    throw new Error("Selected config protocol hash does not match the frozen protocol");
  if (config.developmentLabelHash !== developmentLabelHash)
    throw new Error(
      "Selected config development label hash does not match the label file",
    );
  if (config.developmentRunHash !== developmentRunHash)
    throw new Error(
      "Selected config development run hash does not match the accepted run",
    );
  if (config.corpusHash !== protocol.corpus.sectionsHash)
    throw new Error("Selected config corpus hash does not match the frozen corpus");

  const developmentRun = JSON.parse(
    await readFile(developmentRunManifestPath, "utf8"),
  ) as { gate?: { status?: string } };
  if (developmentRun.gate?.status !== "retrieval_accepted")
    throw new Error("The pinned development run is not retrieval_accepted");

  const r23 = await readJson<{
    models: { reranker: { id: string; revision: string; dtype: string } };
  }>(r23ConfigPath);
  const reranker = r23.models.reranker;
  if (
    reranker.id !== config.model.id ||
    reranker.revision !== config.model.revision ||
    reranker.dtype !== config.model.quantization
  )
    throw new Error("Selected config model does not match the frozen r23 config");

  const seal = await verifyHoldoutSeal({
    expectedSealHash: config.holdoutSealHash,
    corpusHash: config.corpusHash,
  });

  const context = await loadCohortContext({
    split: "holdout",
    casesPath: holdoutCasesPath,
    labelsPath: holdoutLabelsPath,
    evidencePath: holdoutEvidencePath,
  });
  if (context.hashes.protocol !== config.protocolHash)
    throw new Error("Protocol changed while opening the holdout");

  return { context, config, configHash, seal };
}

// ---------------------------------------------------------------------------
// Inference and ranking
// ---------------------------------------------------------------------------

type ProfileScoreRecord = {
  original: { logits: Record<string, number>; rerankMs: number };
};

export type R4Scores = {
  inputHash: string;
  records: Record<string, ProfileScoreRecord>;
};

export async function buildDevelopmentInference(
  context: CohortContext,
  outDir: string,
): Promise<{ inputHash: string; inferencePath: string }> {
  const r23 = await readJson<{ models: { reranker: unknown } }>(r23ConfigPath);
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

export function scoreDevelopment(input: {
  inferencePath: string;
  scoresPath: string;
  cacheDir: string;
}): R4Scores {
  execFileSync(
    "node",
    [scoreScript, input.inferencePath, input.scoresPath, input.cacheDir],
    { cwd: repoRoot, stdio: "inherit", timeout: 900_000 },
  );
  // The scorer wrote this file synchronously above.
  return JSON.parse(readFileSync(input.scoresPath, "utf8")) as R4Scores;
}

export type RankedCohort = {
  candidate: TargetOutput[];
  keyword: TargetOutput[];
  detail: Array<{
    id: string;
    returned: string[];
    scores: Record<string, number>;
    supportReason: string;
    abstained: boolean;
    facetsRequested: string[];
    facetsCovered: string[];
    facetsDropped: string[];
    missingFacets: string[];
    matchedAnchors: string[];
    routeHints: string[];
    routeConfident: boolean;
    routeReasons: string[];
    weakTokenRejected: string[];
    latencyMs: number;
  }>;
};

export function rankDevelopment(
  context: CohortContext,
  scores: R4Scores,
): RankedCohort {
  const candidate: TargetOutput[] = [];
  const keyword: TargetOutput[] = [];
  const detail: RankedCohort["detail"] = [];

  for (const row of context.rows) {
    const record = scores.records[row.case.id]?.original;
    if (!record) throw new Error(`Missing scores for ${row.case.id}`);
    const packed = rankStructured(context.index, row.profile, record.logits, {
      minAnchorHits: 1,
    });
    const returned = packed.matches.map((match) => match.citation);
    candidate.push({
      id: row.case.id,
      returned,
      latencyMs: record.rerankMs,
      candidates: row.routed,
      routeExcluded: row.routeExcluded,
    });
    const missingFacets = row.case.requiredFacets
      .filter(
        (facet) =>
          !facet.accepted.some((citation) => returned.includes(citation)),
      )
      .map((facet) => facet.facet);
    detail.push({
      id: row.case.id,
      returned,
      scores: Object.fromEntries(
        packed.matches.map((match) => [match.citation, match.score]),
      ),
      supportReason: packed.supportReason,
      abstained: packed.abstained,
      facetsRequested: [...packed.facetsRequested],
      facetsCovered: [...packed.facetsCovered],
      facetsDropped: [...(row.profile.trace?.facetSelection.dropped ?? [])],
      missingFacets,
      matchedAnchors: [...packed.matchedAnchors],
      routeHints: [...(row.profile.route?.hints ?? [])],
      routeConfident: row.profile.route?.confident ?? false,
      routeReasons: [...(row.profile.route?.reasons ?? [])],
      weakTokenRejected: [...(row.profile.trace?.weakTokenRejected ?? [])],
      latencyMs: record.rerankMs,
    });

    const started = performance.now();
    const keywordScored = scoredRunbookSections(context.index, row.case.input);
    const keywordLatency = performance.now() - started;
    keyword.push({
      id: row.case.id,
      returned: keywordScored
        .slice(0, row.case.input.limit ?? 3)
        .map((entry) => entry.section.citation),
      latencyMs: keywordLatency,
      candidates: eligibleRunbookSections(context.index, row.case.input).map(
        (section) => section.citation,
      ),
      routeExcluded: [],
    });
  }
  return { candidate, keyword, detail };
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export type ArmSummary = {
  hitAt3: Metric;
  macroSectionRecallAt3: Metric;
  directPrecisionAt3: Metric;
  noMatchAbstention: Metric;
  falseAbstention: Metric;
  reliability: Metric;
  routeCoverage: number | null;
  p95LatencyMs: number | null;
  counts: ReturnType<typeof scoreTarget>["counts"];
};

export function summarizeArm(
  cases: readonly TargetCase[],
  report: ReturnType<typeof scoreTarget>,
): ArmSummary {
  const positives = report.rows.filter((row) => row.eligibleAnswerable);
  const noMatchRows = report.rows.filter((row) => row.kind === "no_match");
  const hits = positives.filter((row) => row.sufficient).length;
  const abstentions = noMatchRows.filter(
    (row) => row.available && row.returned.length === 0,
  ).length;
  const falseAbstentions = positives.filter(
    (row) => row.available && row.returned.length === 0,
  ).length;
  const available = report.rows.filter((row) => row.available).length;
  const acceptedCitations = positives.reduce(
    (total, row) => total + row.accepted,
    0,
  );
  const acceptedHits = positives.reduce(
    (total, row) =>
      total + Math.round((row.sectionRecall ?? 0) * row.accepted),
    0,
  );
  const returnedCitations = positives.reduce(
    (total, row) => total + row.returned.length,
    0,
  );
  const returnedHits = positives.reduce(
    (total, row) =>
      total + Math.round(row.directPrecision * row.returned.length),
    0,
  );

  if (positives.length + noMatchRows.length !== report.rows.length) {
    // corpus_gap rows exist in the cohort; keep them out of both denominators.
    const scheduled = report.rows.length;
    const accounted =
      positives.length +
      noMatchRows.length +
      report.rows.filter((row) => row.kind === "corpus_gap").length;
    if (accounted !== scheduled) throw new Error("Unaccounted scoring rows");
  }
  if (cases.length !== report.rows.length)
    throw new Error("Case count does not match the scored rows");

  return {
    hitAt3: metricRow(hits, positives.length, { basis: "per eligible case" }),
    macroSectionRecallAt3: metricRow(acceptedHits, acceptedCitations, {
      point: report.metrics.macroSectionRecallAt3,
      basis:
        "point is the macro mean over eligible cases; interval is citation-weighted",
    }),
    directPrecisionAt3: metricRow(returnedHits, returnedCitations, {
      point: report.metrics.directPrecisionAt3,
      basis:
        "point is the mean per-case precision; interval is citation-weighted",
    }),
    noMatchAbstention: metricRow(abstentions, noMatchRows.length, {
      basis: "no-match cases with a successful empty return",
    }),
    falseAbstention: metricRow(falseAbstentions, positives.length, {
      basis: "eligible answerable cases with a successful empty return",
    }),
    reliability: metricRow(available, report.rows.length, {
      basis: "scheduled cases with a usable output",
    }),
    routeCoverage: report.metrics.routeCoverage,
    p95LatencyMs: report.p95LatencyMs ?? null,
    counts: report.counts,
  };
}

export function familyOf(id: string): RetrievalFamily | null {
  const match = /^f(0[1-9]|10)-/.exec(id);
  if (match) return `F${match[1]}` as RetrievalFamily;
  if (id.startsWith("s")) return "S";
  return null;
}

export type FamilySummary = {
  cases: number;
  answerable: number;
  noMatch: number;
  hitAt3: Metric | null;
  macroSectionRecallAt3: Metric | null;
  directPrecisionAt3: Metric | null;
};

export function perFamilySummary(
  cases: readonly TargetCase[],
  report: ReturnType<typeof scoreTarget>,
): Record<string, FamilySummary> {
  const caseById = new Map(cases.map((item) => [item.id, item]));
  const summary: Record<string, FamilySummary> = {};
  const keys = [...families, "S"] as const;
  for (const family of keys) {
    const familyRows = report.rows.filter((row) => {
      const item = caseById.get(row.id);
      return item ? familyOf(item.id) === family : false;
    });
    const answerable = familyRows.filter((row) => row.eligibleAnswerable);
    const noMatch = familyRows.filter((row) => row.kind === "no_match");
    if (!familyRows.length) continue;
    const acceptedCitations = answerable.reduce(
      (total, row) => total + row.accepted,
      0,
    );
    const acceptedHits = answerable.reduce(
      (total, row) =>
        total + Math.round((row.sectionRecall ?? 0) * row.accepted),
      0,
    );
    const returnedCitations = answerable.reduce(
      (total, row) => total + row.returned.length,
      0,
    );
    const returnedHits = answerable.reduce(
      (total, row) =>
        total + Math.round(row.directPrecision * row.returned.length),
      0,
    );
    summary[family] = {
      cases: familyRows.length,
      answerable: answerable.length,
      noMatch: noMatch.length,
      hitAt3: answerable.length
        ? metricRow(
            answerable.filter((row) => row.sufficient).length,
            answerable.length,
            { basis: "per eligible case" },
          )
        : null,
      macroSectionRecallAt3: answerable.length
        ? metricRow(acceptedHits, acceptedCitations, {
            point:
              answerable.reduce(
                (total, row) => total + (row.sectionRecall ?? 0),
                0,
              ) / answerable.length,
            basis:
              "point is the family macro mean; interval is citation-weighted",
          })
        : null,
      directPrecisionAt3: answerable.length
        ? metricRow(returnedHits, returnedCitations, {
            point:
              answerable.reduce(
                (total, row) => total + row.directPrecision,
                0,
              ) / answerable.length,
            basis:
              "point is the family mean per-case precision; interval is citation-weighted",
          })
        : null,
    };
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Paired keyword comparison
// ---------------------------------------------------------------------------

export type PairedComparison = {
  cases: number;
  bothHit: number;
  candidateOnly: number;
  keywordOnly: number;
  neither: number;
  candidateRate: number | null;
  keywordRate: number | null;
  difference: number | null;
  mcnemarExactP: number | null;
  bootstrap: {
    lower: number | null;
    upper: number | null;
    confidence: number;
    resamples: number;
    seed: number;
  } | null;
  basis: string;
};

const binomialPmf = (n: number, k: number): number => {
  let coefficient = 1;
  for (let index = 1; index <= k; index += 1)
    coefficient = (coefficient * (n - k + index)) / index;
  return coefficient / 2 ** n;
};

const mcnemarExactTwoSided = (candidateOnly: number, keywordOnly: number) => {
  const n = candidateOnly + keywordOnly;
  if (!n) return 1;
  const tail = Math.min(candidateOnly, keywordOnly);
  let probability = 0;
  for (let index = 0; index <= tail; index += 1)
    probability += binomialPmf(n, index);
  return Math.min(1, 2 * probability);
};

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const percentile = (sorted: readonly number[], fraction: number) => {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower] ?? null;
  const weight = position - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
};

export function pairedComparison(
  candidateReport: ReturnType<typeof scoreTarget>,
  keywordReport: ReturnType<typeof scoreTarget>,
  options: { resamples?: number; seed?: number; confidence?: number } = {},
): PairedComparison {
  const keywordById = new Map(keywordReport.rows.map((row) => [row.id, row]));
  const pairs = candidateReport.rows
    .filter((row) => row.eligibleAnswerable)
    .map((row) => {
      const keyword = keywordById.get(row.id);
      if (!keyword) throw new Error(`Keyword arm is missing ${row.id}`);
      return { candidate: row.sufficient, keyword: keyword.sufficient };
    });
  const bothHit = pairs.filter((pair) => pair.candidate && pair.keyword).length;
  const candidateOnly = pairs.filter(
    (pair) => pair.candidate && !pair.keyword,
  ).length;
  const keywordOnly = pairs.filter(
    (pair) => !pair.candidate && pair.keyword,
  ).length;
  const neither = pairs.filter(
    (pair) => !pair.candidate && !pair.keyword,
  ).length;
  const cases = pairs.length;
  const candidateRate = cases ? (bothHit + candidateOnly) / cases : null;
  const keywordRate = cases ? (bothHit + keywordOnly) / cases : null;
  const difference =
    candidateRate === null || keywordRate === null
      ? null
      : candidateRate - keywordRate;

  const resamples = options.resamples ?? 10_000;
  const seed = options.seed ?? 20261021;
  const confidence = options.confidence ?? 0.95;
  const random = mulberry32(seed);
  const differences: number[] = [];
  if (cases) {
    for (let resample = 0; resample < resamples; resample += 1) {
      let candidateHits = 0;
      let keywordHits = 0;
      for (let index = 0; index < cases; index += 1) {
        const pair = pairs[Math.floor(random() * cases)]!;
        if (pair.candidate) candidateHits += 1;
        if (pair.keyword) keywordHits += 1;
      }
      differences.push((candidateHits - keywordHits) / cases);
    }
  }
  differences.sort((left, right) => left - right);
  const alpha = (1 - confidence) / 2;

  return {
    cases,
    bothHit,
    candidateOnly,
    keywordOnly,
    neither,
    candidateRate,
    keywordRate,
    difference,
    mcnemarExactP: cases
      ? mcnemarExactTwoSided(candidateOnly, keywordOnly)
      : null,
    bootstrap: cases
      ? {
          lower: percentile(differences, alpha),
          upper: percentile(differences, 1 - alpha),
          confidence,
          resamples,
          seed,
        }
      : null,
    basis:
      "paired sufficient-guidance hits over eligible answerable cases; exact McNemar two-sided p; percentile bootstrap of the hit-rate difference",
  };
}

// ---------------------------------------------------------------------------
// Failure ledger
// ---------------------------------------------------------------------------

export type LedgerStage =
  | "no_corpus_guidance"
  | "query_observation_loss"
  | "candidate_omission"
  | "wrong_rank"
  | "cutoff_rejection"
  | "facet_dropped"
  | "support_abstention"
  | "label_equivalence"
  | "corpus_gap";

export type LedgerEntry = {
  id: string;
  family: RetrievalFamily | null;
  kind: TargetCase["kind"];
  stage: LedgerStage;
  countedAsMiss: boolean;
  detail: {
    returned: string[];
    missingFacets: string[];
    requestedFacets: string[];
    droppedFacets: string[];
    routeHints: string[];
    routeConfident: boolean;
    supportReason: string;
    abstained: boolean;
    unavailable: boolean;
    accepted: string[];
  };
};

const runbookOf = (citation: string) => citation.split("#")[0] ?? citation;

const facetByHeading: Record<string, string> = {
  symptoms: "symptoms",
  "evidence-needed": "evidence",
  "historical-snapshots-and-missing-evidence": "evidence",
  "read-only-investigation": "investigation",
  "allowed-remediation": "remediation",
  "forbidden-actions": "forbidden",
  "replay-and-approval": "replay",
  "verification-rollback-or-escalation": "verification",
};

const headingFacet = (citation: string) =>
  facetByHeading[citation.slice(citation.indexOf("#") + 1)] ?? null;

export function buildFailureLedger(
  context: CohortContext,
  report: ReturnType<typeof scoreTarget>,
  detail: RankedCohort["detail"],
): { entries: LedgerEntry[]; stages: Record<string, number>; counts: Record<string, number> } {
  const detailById = new Map(detail.map((item) => [item.id, item]));
  const caseById = new Map(context.cases.map((item) => [item.id, item]));
  const rowsById = new Map(context.rows.map((row) => [row.case.id, row]));
  const entries: LedgerEntry[] = [];

  for (const row of report.rows) {
    const item = caseById.get(row.id);
    const info = detailById.get(row.id);
    const contextRow = rowsById.get(row.id);
    if (!item || !info || !contextRow)
      throw new Error(`Ledger cannot attribute ${row.id}`);
    const base = {
      id: row.id,
      family: familyOf(row.id),
      kind: item.kind,
      detail: {
        returned: row.returned,
        missingFacets: info.missingFacets,
        requestedFacets: info.facetsRequested,
        droppedFacets: info.facetsDropped,
        routeHints: info.routeHints,
        routeConfident: info.routeConfident,
        supportReason: info.supportReason,
        abstained: info.abstained,
        unavailable: !row.available,
        accepted: contextRow.accepted,
      },
    };

    if (item.kind === "no_match") {
      if (!row.available || row.returned.length > 0)
        entries.push({
          ...base,
          stage: "cutoff_rejection",
          countedAsMiss: true,
        });
      continue;
    }

    if (item.kind === "corpus_gap" || !row.eligibleAnswerable) {
      entries.push({
        ...base,
        stage: "corpus_gap",
        countedAsMiss: false,
      });
      continue;
    }

    if (row.sufficient) continue;
    if (!row.available) {
      entries.push({
        ...base,
        stage: "query_observation_loss",
        countedAsMiss: true,
      });
      continue;
    }
    if (info.abstained) {
      entries.push({
        ...base,
        stage: "support_abstention",
        countedAsMiss: true,
      });
      continue;
    }
    const missingFacets = item.requiredFacets.filter(
      (facet) =>
        !facet.accepted.some((citation) => row.returned.includes(citation)),
    );
    if (
      missingFacets.some(
        (facet) => !(info.facetsRequested as string[]).includes(facet.facet),
      )
    ) {
      entries.push({
        ...base,
        stage: "facet_dropped",
        countedAsMiss: true,
      });
      continue;
    }
    const missingAccepted = missingFacets.flatMap((facet) => facet.accepted);
    if (missingAccepted.some((citation) => !contextRow.eligible.includes(citation))) {
      entries.push({
        ...base,
        stage: "corpus_gap",
        countedAsMiss: false,
      });
      continue;
    }
    if (missingAccepted.some((citation) => !contextRow.routed.includes(citation))) {
      entries.push({
        ...base,
        stage: "candidate_omission",
        countedAsMiss: true,
      });
      continue;
    }
    const acceptedRunbooks = new Set(
      item.requiredFacets
        .flatMap((facet) => facet.accepted)
        .map(runbookOf),
    );
    const sibling = row.returned.some((citation) => {
      const facet = headingFacet(citation);
      return (
        facet !== null &&
        missingFacets.some((missing) => missing.facet === facet) &&
        !acceptedRunbooks.has(runbookOf(citation))
      );
    });
    entries.push({
      ...base,
      stage: sibling ? "label_equivalence" : "wrong_rank",
      countedAsMiss: true,
    });
  }

  const stages: Record<string, number> = {};
  for (const entry of entries)
    stages[entry.stage] = (stages[entry.stage] ?? 0) + 1;
  return {
    entries,
    stages,
    counts: {
      entries: entries.length,
      misses: entries.filter((entry) => entry.countedAsMiss).length,
      answerableMisses: entries.filter(
        (entry) => entry.countedAsMiss && entry.kind === "answerable",
      ).length,
      noMatchFalsePositives: entries.filter(
        (entry) => entry.countedAsMiss && entry.kind === "no_match",
      ).length,
      corpusGap: entries.filter((entry) => entry.stage === "corpus_gap").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Run directory and report writing
// ---------------------------------------------------------------------------

export async function ensureFreshRunDirectory(outDir: string): Promise<void> {
  if (existsSync(outDir))
    throw new Error(`Run directory already exists: ${outDir}`);
  await mkdir(outDir, { recursive: false });
}

export function assertDevelopmentSplit(split: string): "development" {
  if (split !== "development")
    throw new Error(
      "R4.3 opens only the development split. The sealed holdout belongs to R4.4 and requires a frozen candidate config.",
    );
  return "development";
}

export function assertHoldoutSplit(split: string): "holdout" {
  if (split !== "holdout")
    throw new Error("R4.4 opens only the sealed holdout split");
  return "holdout";
}

const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? "n/a" : `${(value * 100).toFixed(2)}%`;

const intervalText = (metric: Metric | null | undefined) => {
  if (!metric?.wilson) return "n/a";
  return `${percent(metric.wilson.lower)}–${percent(metric.wilson.upper)}`;
};

const metricCell = (metric: Metric | null | undefined) =>
  metric ? `${percent(metric.point)} (${metric.numerator}/${metric.denominator})` : "n/a";

const table = (rows: string[][]) => {
  const header = rows[0];
  if (!header) return "";
  return [header, header.map(() => "---"), ...rows.slice(1)]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");
};

const buildDecisionMarkdown = (input: {
  run: string;
  decision: RetrievalDecision;
  candidate: ArmSummary;
  keyword: ArmSummary;
  family: Record<string, FamilySummary>;
  ledger: ReturnType<typeof buildFailureLedger>;
  hashes: CohortContext["hashes"];
  counts: { scheduled: number; answerable: number; noMatch: number };
}) => {
  const { decision, candidate, keyword, family, ledger } = input;
  const outcome =
    decision.status === "retrieval_accepted"
      ? "proceed_to_freeze"
      : decision.status === "blocked"
        ? "stop (blocked)"
        : "stop (retrieval_rejected)";
  const checks = [
    ["Gate", "Value", "Numerator/denominator", "Threshold", "Result"],
    ...decision.checks.map((check) => [
      check.name,
      check.name === "p95LatencyMs" && typeof check.value === "number"
        ? `${check.value.toFixed(1)} ms`
        : check.name === "safetyViolations" && typeof check.value === "number"
          ? String(check.value)
          : typeof check.value === "boolean"
            ? String(check.value)
            : typeof check.value === "number"
              ? percent(check.value)
              : "n/a",
      check.name.startsWith("hitAt3")
        ? `${candidate.hitAt3.numerator}/${candidate.hitAt3.denominator}`
        : check.name.startsWith("macroSectionRecallAt3")
          ? `${candidate.macroSectionRecallAt3.numerator}/${candidate.macroSectionRecallAt3.denominator}`
          : check.name.startsWith("noMatchAbstention")
            ? `${candidate.noMatchAbstention.numerator}/${candidate.noMatchAbstention.denominator}`
            : check.name.startsWith("falseAbstention")
              ? `${candidate.falseAbstention.numerator}/${candidate.falseAbstention.denominator}`
              : check.name.startsWith("directPrecisionAt3")
                ? `${candidate.directPrecisionAt3.numerator}/${candidate.directPrecisionAt3.denominator}`
                : check.name.startsWith("reliability")
                  ? `${candidate.reliability.numerator}/${candidate.reliability.denominator}`
                  : "n/a",
      check.name === "p95LatencyMs" && typeof check.threshold === "number"
        ? `${check.threshold} ms`
        : check.name === "safetyViolations"
          ? String(check.threshold)
          : typeof check.threshold === "boolean"
            ? String(check.threshold)
            : typeof check.threshold === "number"
              ? check.threshold <= 1
                ? percent(check.threshold)
                : String(check.threshold)
              : String(check.threshold),
      check.pass ? "pass" : "**FAIL**",
    ]),
  ];
  const familyRows = [
    ["Family", "Cases", "Answerable", "Hit@3", "Macro recall", "Direct precision"],
    ...Object.entries(family).map(([name, value]) => [
      name,
      String(value.cases),
      String(value.answerable),
      metricCell(value.hitAt3),
      metricCell(value.macroSectionRecallAt3),
      metricCell(value.directPrecisionAt3),
    ]),
  ];
  return `# R4.3 — development screening

**Decision: \`${decision.status}\`.** The development exit is **\`${outcome}\`**.

This is screening on the exposed 80-case development cohort, not release
acceptance. No holdout case, score, or hash was opened to produce this report.
No route, facet, packer, support, corpus, label, or threshold was changed during
the run.

## Gates

${table(checks)}

Failing gates: ${decision.failing.length ? decision.failing.map((name) => `\`${name}\``).join(", ") : "none"}.
Blocked reasons: ${decision.blockedReasons.length ? decision.blockedReasons.map((name) => `\`${name}\``).join(", ") : "none"}.

## Primary metric

| Arm | Hit@3 | 95% Wilson | Macro recall | 95% Wilson | Direct precision | No-match abstention | 95% Wilson | False abstention | Reliability | p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Candidate | ${metricCell(candidate.hitAt3)} | ${intervalText(candidate.hitAt3)} | ${metricCell(candidate.macroSectionRecallAt3)} | ${intervalText(candidate.macroSectionRecallAt3)} | ${metricCell(candidate.directPrecisionAt3)} | ${metricCell(candidate.noMatchAbstention)} | ${intervalText(candidate.noMatchAbstention)} | ${metricCell(candidate.falseAbstention)} | ${metricCell(candidate.reliability)} | ${candidate.p95LatencyMs?.toFixed(1) ?? "n/a"} ms |
| Keyword | ${metricCell(keyword.hitAt3)} | ${intervalText(keyword.hitAt3)} | ${metricCell(keyword.macroSectionRecallAt3)} | ${intervalText(keyword.macroSectionRecallAt3)} | ${metricCell(keyword.directPrecisionAt3)} | ${metricCell(keyword.noMatchAbstention)} | ${intervalText(keyword.noMatchAbstention)} | ${metricCell(keyword.falseAbstention)} | ${metricCell(keyword.reliability)} | ${keyword.p95LatencyMs?.toFixed(1) ?? "n/a"} ms |

The macro-recall and direct-precision intervals are citation-weighted; the point
estimates are the macro means used by the gates. Every row carries its absolute
numerator and denominator.

## Per-family results

${table(familyRows)}

## Failure ledger

${ledger.counts.misses ? table([
    ["Stage", "Entries"],
    ...Object.entries(ledger.stages).map(([stage, count]) => [stage, String(count)]),
  ]) : "No misses or false positives."}

${ledger.counts.answerableMisses} answerable miss(es), ${ledger.counts.noMatchFalsePositives} no-match false positive(s), ${ledger.counts.corpusGap} corpus-gap case(s). Every miss carries exactly one stage in \`failure-ledger.json\`.

## Frozen inputs

| Artifact | SHA-256 |
| --- | --- |
| protocol | \`${input.hashes.protocol}\` |
| corpus | \`${input.hashes.corpus}\` |
| development cases | \`${input.hashes.cases}\` |
| development labels v2 | \`${input.hashes.labels}\` |
| development evidence | \`${input.hashes.evidence}\` |

## Limitations

- The development cohort is exposed and may be tuned on. This report screens the
  candidate; it is not the sealed-holdout acceptance decision.
- The development gate is 80% hit@3 and 80% macro recall. The acceptance gate is
  90% point plus a Wilson lower bound and is evaluated in R4.4.
- The Wilson bounds describe sampling uncertainty on this cohort. A point
  estimate is not a certification.
- The seeded corpus has 55 sections and six runbooks; provider-ineligible cases
  are reported as \`corpus_gap\` and excluded from no-match abstention, not scored
  as retrieval misses.
- An F04-style facet accepts independently sufficient sibling sections. Returning
  either sibling is a primary hit; the unreturned sibling remains in the
  citation-level recall denominator, so per-family macro recall can trail hit@3.
- \`p95LatencyMs\` is the per-case rerank time over the frozen candidate set in the
  offline scorer, the same basis as R3. It is not warm HTTP service latency.
`;
};

export async function runDevelopmentScreening(input: {
  outDir: string;
  cacheDir: string;
  scoresPath?: string;
}): Promise<{
  decision: RetrievalDecision;
  reportPath: string;
  ledgerPath: string;
  decisionPath: string;
}> {
  const context = await loadDevelopmentContext();
  await ensureFreshRunDirectory(input.outDir);

  const { inputHash, inferencePath } = await buildDevelopmentInference(
    context,
    input.outDir,
  );
  const scoresPath = join(input.outDir, "scores-original.json");
  const scores = input.scoresPath
    ? (JSON.parse(await readFile(input.scoresPath, "utf8")) as R4Scores)
    : scoreDevelopment({
        inferencePath,
        scoresPath,
        cacheDir: input.cacheDir,
      });
  if (scores.inputHash !== inputHash)
    throw new Error("Scores do not belong to this development inference input");
  if (!input.scoresPath) {
    // scoreDevelopment wrote the run-local scores file; verify it is the same
    // object that is about to be scored.
    const written = JSON.parse(await readFile(scoresPath, "utf8")) as R4Scores;
    if (written.inputHash !== inputHash)
      throw new Error("Run-local scores were written for another input");
  }

  const ranked = rankDevelopment(context, scores);
  const candidateReport = scoreTarget(
    context.index,
    context.cases,
    ranked.candidate,
  );
  const keywordReport = scoreTarget(
    context.index,
    context.cases,
    ranked.keyword,
  );
  const candidate = summarizeArm(context.cases, candidateReport);
  const keyword = summarizeArm(context.cases, keywordReport);
  const family = perFamilySummary(context.cases, candidateReport);
  const keywordFamily = perFamilySummary(context.cases, keywordReport);
  const ledger = buildFailureLedger(context, candidateReport, ranked.detail);

  const perFamilyHitAt3: Partial<Record<RetrievalFamily, Metric>> = {};
  for (const name of families) {
    const metric = family[name]?.hitAt3;
    if (metric) perFamilyHitAt3[name] = metric;
  }
  const decision = evaluateRetrievalDecision({
    stage: "development",
    hitAt3: candidate.hitAt3,
    macroSectionRecallAt3: candidate.macroSectionRecallAt3,
    noMatchAbstention: candidate.noMatchAbstention,
    falseAbstention: candidate.falseAbstention,
    directPrecisionAt3: candidate.directPrecisionAt3,
    keywordDirectPrecisionAt3: keyword.directPrecisionAt3,
    perFamilyHitAt3,
    routeCoverage: candidate.routeCoverage,
    reliability: candidate.reliability.point,
    p95LatencyMs: candidate.p95LatencyMs,
    safetyViolations: 0,
  });

  const run = basename(input.outDir);
  const report = {
    phase: "R4.3",
    run,
    generatedAt: new Date().toISOString(),
    split: "development",
    status: decision.status,
    primaryMetric: context.protocol.primaryMetric,
    candidateArm,
    profileVersion: "r4-v1",
    packingVersion: "r3.3-v1",
    supportVersion: "r3.4-v1",
    support: { minAnchorHits: 1 },
    inputs: {
      protocolHash: context.hashes.protocol,
      corpusHash: context.hashes.corpus,
      casesHash: context.hashes.cases,
      labelHash: context.hashes.labels,
      evidenceHash: context.hashes.evidence,
      inputHash,
      scoresHash: await sha256File(scoresPath),
    },
    counts: {
      scheduled: candidateReport.counts.scheduled,
      answerable: candidateReport.counts.eligibleAnswerable,
      noMatch: candidateReport.counts.noMatch,
      corpusGap: candidateReport.counts.corpusGap,
      providerExcluded: candidateReport.counts.providerExcluded,
      unavailable: candidateReport.counts.unavailable,
    },
    metrics: { candidate, keyword },
    perFamily: family,
    keywordPerFamily: keywordFamily,
    decision,
    ledger: {
      counts: ledger.counts,
      stages: ledger.stages,
    },
    rows: candidateReport.rows.map((row) => {
      const info = ranked.detail.find((item) => item.id === row.id)!;
      return {
        id: row.id,
        family: familyOf(row.id),
        kind: row.kind,
        returned: row.returned,
        scores: info.scores,
        accepted: context.rows.find((item) => item.case.id === row.id)?.accepted,
        missingFacets: info.missingFacets,
        facetsRequested: info.facetsRequested,
        facetsDropped: info.facetsDropped,
        supportReason: info.supportReason,
        abstained: info.abstained,
        route: {
          hints: info.routeHints,
          confident: info.routeConfident,
          reasons: info.routeReasons,
          weakTokenRejected: info.weakTokenRejected,
        },
        latencyMs: info.latencyMs,
        sufficient: row.sufficient,
        strictSufficient: row.strictSufficient,
        eligibleAnswerable: row.eligibleAnswerable,
        providerExcluded: row.providerExcluded,
        available: row.available,
        sectionRecall: row.sectionRecall,
        directPrecision: row.directPrecision,
        candidateRecall: row.candidateRecall,
        routeCoverage: row.routeCoverage,
      };
    }),
    keywordRows: keywordReport.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      returned: row.returned,
      sufficient: row.sufficient,
      sectionRecall: row.sectionRecall,
      directPrecision: row.directPrecision,
      available: row.available,
    })),
    notes: {
      metric:
        "sufficientGuidanceHit@3 requires every required facet to have an accepted citation in the returned three; scoreTarget owns the definition.",
      recallInterval:
        "macro recall and direct precision points are macro means; their Wilson intervals treat accepted/returned citations as the evidence units.",
      unavailable:
        "an output that is missing or errors is unavailable: it cannot satisfy abstention and counts against reliability.",
      equivalenceRecall:
        "an F04-style facet may accept two independently sufficient sibling sections. Returning either one is a primary hit, but the unreturned sibling stays in the citation-level recall denominator, so per-family macro recall can fall below hit@3 without a guidance failure.",
      latency:
        "p95LatencyMs is the per-case rerank time over the frozen candidate set in the offline scorer, matching the R3 measurement basis; it is not warm HTTP service latency.",
      noHoldout:
        "the driver reads only development artifacts and the frozen R3 corpus. The sealed R4 holdout is not opened in R4.3.",
      noTuning:
        "no route, facet, packing, support, corpus, label, gate, or prompt was changed while producing this report.",
    },
  };

  const reportPath = join(input.outDir, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });

  const ledgerPath = join(input.outDir, "failure-ledger.json");
  await writeFile(
    ledgerPath,
    JSON.stringify(
      {
        phase: "R4.3",
        run,
        generatedAt: report.generatedAt,
        split: "development",
        counts: ledger.counts,
        stages: ledger.stages,
        entries: ledger.entries,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );

  const decisionPath = join(input.outDir, "decision.md");
  await writeFile(
    decisionPath,
    buildDecisionMarkdown({
      run,
      decision,
      candidate,
      keyword,
      family,
      ledger,
      hashes: context.hashes,
      counts: {
        scheduled: candidateReport.counts.scheduled,
        answerable: candidateReport.counts.eligibleAnswerable,
        noMatch: candidateReport.counts.noMatch,
      },
    }),
    { flag: "wx" },
  );

  const manifest = {
    phase: "R4.3",
    run,
    generatedAt: report.generatedAt,
    gate: {
      status: decision.status,
      failing: decision.failing,
      blockedReasons: decision.blockedReasons,
    },
    files: {
      "inference-original.json": await sha256File(inferencePath),
      "scores-original.json": await sha256File(scoresPath),
      "report.json": await sha256File(reportPath),
      "failure-ledger.json": await sha256File(ledgerPath),
      "decision.md": await sha256File(decisionPath),
    },
  };
  await writeFile(
    join(input.outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { flag: "wx" },
  );

  return { decision, reportPath, ledgerPath, decisionPath };
}

const latencyDistribution = (values: readonly number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    count: sorted.length,
    minMs: sorted[0] ?? null,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1) ?? null,
    meanMs: sorted.length
      ? sorted.reduce((total, value) => total + value, 0) / sorted.length
      : null,
  };
};

const buildAcceptanceDecisionMarkdown = (input: {
  run: string;
  decision: RetrievalDecision;
  candidate: ArmSummary;
  keyword: ArmSummary;
  family: Record<string, FamilySummary>;
  paired: PairedComparison;
  ledger: ReturnType<typeof buildFailureLedger>;
  hashes: CohortContext["hashes"];
  configHash: string;
  sealHash: string;
  configPath: string;
  latency: ReturnType<typeof latencyDistribution>;
}) => {
  const { decision, candidate, keyword, family, paired, ledger } = input;
  const checks = [
    ["Gate", "Value", "Numerator/denominator", "Threshold", "Result"],
    ...decision.checks.map((check) => [
      check.name,
      check.name === "p95LatencyMs" && typeof check.value === "number"
        ? `${check.value.toFixed(1)} ms`
        : check.name === "safetyViolations" && typeof check.value === "number"
          ? String(check.value)
          : typeof check.value === "boolean"
            ? String(check.value)
            : typeof check.value === "number"
              ? percent(check.value)
              : "n/a",
      check.name.startsWith("hitAt3")
        ? `${candidate.hitAt3.numerator}/${candidate.hitAt3.denominator}`
        : check.name.startsWith("macroSectionRecallAt3")
          ? `${candidate.macroSectionRecallAt3.numerator}/${candidate.macroSectionRecallAt3.denominator}`
          : check.name.startsWith("noMatchAbstention")
            ? `${candidate.noMatchAbstention.numerator}/${candidate.noMatchAbstention.denominator}`
            : check.name.startsWith("falseAbstention")
              ? `${candidate.falseAbstention.numerator}/${candidate.falseAbstention.denominator}`
              : check.name.startsWith("directPrecisionAt3")
                ? `${candidate.directPrecisionAt3.numerator}/${candidate.directPrecisionAt3.denominator}`
                : check.name.startsWith("perFamilyHitAt3")
                  ? metricCell(
                      family[check.name.slice("perFamilyHitAt3.".length)]
                        ?.hitAt3,
                    )
                  : check.name.startsWith("reliability")
                    ? `${candidate.reliability.numerator}/${candidate.reliability.denominator}`
                    : "n/a",
      check.name === "p95LatencyMs" && typeof check.threshold === "number"
        ? `${check.threshold} ms`
        : check.name === "safetyViolations"
          ? String(check.threshold)
          : typeof check.threshold === "boolean"
            ? String(check.threshold)
            : typeof check.threshold === "number"
              ? check.threshold <= 1
                ? percent(check.threshold)
                : String(check.threshold)
              : String(check.threshold),
      check.pass ? "pass" : "**FAIL**",
    ]),
  ];
  const familyRows = [
    ["Family", "Cases", "Answerable", "Hit@3", "95% Wilson", "Macro recall", "Direct precision"],
    ...Object.entries(family).map(([name, value]) => [
      name,
      String(value.cases),
      String(value.answerable),
      metricCell(value.hitAt3),
      intervalText(value.hitAt3),
      metricCell(value.macroSectionRecallAt3),
      metricCell(value.directPrecisionAt3),
    ]),
  ];
  const postHoc = decision.status === "retrieval_rejected"
    ? `## Post-hoc note (observation only)

The single holdout run is consumed. The ledger attributes
${ledger.counts.answerableMisses} answerable miss(es) across
${Object.entries(ledger.stages)
  .map(([stage, count]) => `${stage} (${count})`)
  .join(", ")} and ${ledger.counts.noMatchFalsePositives} no-match false
positive(s). This note records what the one run showed. It does not authorize a
re-run, a threshold change, or a candidate change on this holdout.`
    : "";
  return `# R4.4 — sealed holdout decision

**Decision: \`${decision.status}\`.**

This is the single pre-registered run of the sealed 160-case holdout, analyzed
against the acceptance gates frozen in \`protocol.json\`. The candidate config was
written and hashed before the seal was opened. One run only; no re-scoring, no
threshold edit, no candidate change after the score exists.

## Gates

${table(checks)}

Failing gates: ${decision.failing.length ? decision.failing.map((name) => `\`${name}\``).join(", ") : "none"}.
Blocked reasons: ${decision.blockedReasons.length ? decision.blockedReasons.map((name) => `\`${name}\``).join(", ") : "none"}.

## Primary metric

| Arm | Hit@3 | 95% Wilson | Macro recall | 95% Wilson | Direct precision | No-match abstention | 95% Wilson | False abstention | Reliability | p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Candidate | ${metricCell(candidate.hitAt3)} | ${intervalText(candidate.hitAt3)} | ${metricCell(candidate.macroSectionRecallAt3)} | ${intervalText(candidate.macroSectionRecallAt3)} | ${metricCell(candidate.directPrecisionAt3)} | ${metricCell(candidate.noMatchAbstention)} | ${intervalText(candidate.noMatchAbstention)} | ${metricCell(candidate.falseAbstention)} | ${metricCell(candidate.reliability)} | ${candidate.p95LatencyMs?.toFixed(1) ?? "n/a"} ms |
| Keyword | ${metricCell(keyword.hitAt3)} | ${intervalText(keyword.hitAt3)} | ${metricCell(keyword.macroSectionRecallAt3)} | ${intervalText(keyword.macroSectionRecallAt3)} | ${metricCell(keyword.directPrecisionAt3)} | ${metricCell(keyword.noMatchAbstention)} | ${intervalText(keyword.noMatchAbstention)} | ${metricCell(keyword.falseAbstention)} | ${metricCell(keyword.reliability)} | ${keyword.p95LatencyMs?.toFixed(1) ?? "n/a"} ms |

Every row carries its absolute numerator and denominator. Macro-recall and
direct-precision intervals are citation-weighted; their point estimates are the
macro means used by the gates.

## Per-family results

${table(familyRows)}

## Paired keyword comparison

| Statistic | Value |
| --- | ---: |
| Eligible answerable pairs | ${paired.cases} |
| Both hit | ${paired.bothHit} |
| Candidate only | ${paired.candidateOnly} |
| Keyword only | ${paired.keywordOnly} |
| Neither | ${paired.neither} |
| Candidate hit rate | ${percent(paired.candidateRate)} |
| Keyword hit rate | ${percent(paired.keywordRate)} |
| Difference | ${percent(paired.difference)} |
| Exact McNemar two-sided p | ${paired.mcnemarExactP === null ? "n/a" : paired.mcnemarExactP.toFixed(4)} |
| Bootstrap 95% CI of difference | ${paired.bootstrap ? `${percent(paired.bootstrap.lower)} to ${percent(paired.bootstrap.upper)}` : "n/a"} |

${paired.basis}. Bootstrap resamples: ${paired.bootstrap?.resamples ?? 0},
seed ${paired.bootstrap?.seed ?? "n/a"}. The interval is decision support, not
proof of a five-point superiority.

## Failure ledger

${ledger.counts.misses ? table([
    ["Stage", "Entries"],
    ...Object.entries(ledger.stages).map(([stage, count]) => [stage, String(count)]),
  ]) : "No misses or false positives."}

${ledger.counts.answerableMisses} answerable miss(es), ${ledger.counts.noMatchFalsePositives} no-match false positive(s), ${ledger.counts.corpusGap} corpus-gap case(s). Every miss carries exactly one stage in \`failure-ledger.json\`.

## Latency and reliability

| Measure | Value |
| --- | ---: |
| Scheduled cases | ${candidate.reliability.denominator} |
| Usable outputs | ${candidate.reliability.numerator} |
| Rerank min | ${input.latency.minMs?.toFixed(1) ?? "n/a"} ms |
| Rerank p50 | ${input.latency.p50Ms?.toFixed(1) ?? "n/a"} ms |
| Rerank p95 | ${input.latency.p95Ms?.toFixed(1) ?? "n/a"} ms |
| Rerank max | ${input.latency.maxMs?.toFixed(1) ?? "n/a"} ms |
| Rerank mean | ${input.latency.meanMs?.toFixed(1) ?? "n/a"} ms |

\`p95LatencyMs\` is per-case rerank time over the frozen candidate set in the
offline scorer, the same basis as R3. It is not warm HTTP service latency.

## Measurement limitations

1. **Labels are clustered, so case-level Wilson bounds are anti-conservative.**
   The 120 answerable cases reduce to 10 required-facet/accepted-citation
   signatures, 12 cases per family. Effective independent units are
   approximately 10, not 120. \`wilsonLower95\` must not be presented as
   independent-case evidence.
2. **Per-family results are reported next to the pooled numbers.** A pooled pass
   with a family near the 0.70 floor is a weak acceptance.
3. **No-match abstention is structural, not discriminating.** All 40 no-match
   observations carry zero route hints and zero observed anchors, so the shipped
   support policy abstains by construction. The result confirms policy wiring,
   not near-miss discrimination.
4. **F04 accepts a less specific sibling.** All 12 F04 cases accept
   \`RB-F03-F04\` alongside \`RB-F04-F06\`, so F04 hit@3 and recall are lenient by up
   to 10% of the answerable set.
5. **The missing-runtime-fact bucket is corpus coverage.** Those rationales say
   the provider limit is not recorded in the corpus; they behave as
   missing-guidance cases.
6. **The weakest development cohort is not held out.** The three-case \`S\`
   cohort scored 2/3 in development and has no holdout cases; the per-family
   floor covers F01–F10 only.
7. **Some scenarios recur across splits.** Three near-identical development and
   holdout pairs in F06/F07 plus one duplicate derived query in F04 are recorded
   in the reviewer sign-off. They are below the 10% near-duplicate threshold.

The holdout is a decision instrument, not a certification. A 90% point gate at
120 clustered cases cannot certify a true 90% system at 95% confidence; Tier B
(~300 independent answerable cases) is out of scope for R4.

## Frozen inputs

| Artifact | SHA-256 |
| --- | --- |
| selected retrieval config | \`${input.configHash}\` |
| config path | \`${input.configPath}\` |
| protocol | \`${input.hashes.protocol}\` |
| corpus | \`${input.hashes.corpus}\` |
| holdout cases | \`${input.hashes.cases}\` |
| holdout labels v2 | \`${input.hashes.labels}\` |
| holdout evidence | \`${input.hashes.evidence}\` |
| holdout seal | \`${input.sealHash}\` |

${postHoc}

## Governance

- One run only. No re-scoring, no threshold edit, no candidate change after the
  holdout score exists.
- The sealed files under \`holdout/\` are immutable. A label defect discovered
  after this run consumes the holdout and requires a new sealed holdout.
- \`retrieval_rejected\` does not authorize reuse of this holdout. \`blocked\`
  records a reliability, safety, or credential failure and stops.
`;
};

export async function runHoldoutAcceptance(input: {
  outDir: string;
  configPath: string;
  cacheDir: string;
  scoresPath?: string;
}): Promise<{
  decision: RetrievalDecision;
  reportPath: string;
  ledgerPath: string;
  decisionPath: string;
  configHash: string;
}> {
  if (existsSync(input.outDir))
    throw new Error(`Run directory already exists: ${input.outDir}`);
  const holdout = await loadHoldoutContext(input.configPath);
  const context = holdout.context;
  await ensureFreshRunDirectory(input.outDir);

  const { inputHash, inferencePath } = await buildDevelopmentInference(
    context,
    input.outDir,
  );
  const scoresPath = join(input.outDir, "scores-original.json");
  const scores = input.scoresPath
    ? (JSON.parse(await readFile(input.scoresPath, "utf8")) as R4Scores)
    : scoreDevelopment({ inferencePath, scoresPath, cacheDir: input.cacheDir });
  if (scores.inputHash !== inputHash)
    throw new Error("Scores do not belong to this holdout inference input");
  if (!input.scoresPath) {
    const written = JSON.parse(await readFile(scoresPath, "utf8")) as R4Scores;
    if (written.inputHash !== inputHash)
      throw new Error("Run-local scores were written for another input");
  }

  const ranked = rankDevelopment(context, scores);
  const candidateReport = scoreTarget(
    context.index,
    context.cases,
    ranked.candidate,
  );
  const keywordReport = scoreTarget(
    context.index,
    context.cases,
    ranked.keyword,
  );
  const candidate = summarizeArm(context.cases, candidateReport);
  const keyword = summarizeArm(context.cases, keywordReport);
  const family = perFamilySummary(context.cases, candidateReport);
  const keywordFamily = perFamilySummary(context.cases, keywordReport);
  const ledger = buildFailureLedger(context, candidateReport, ranked.detail);
  const paired = pairedComparison(candidateReport, keywordReport);
  const latency = latencyDistribution(
    ranked.detail.map((item) => item.latencyMs),
  );

  const perFamilyHitAt3: Partial<Record<RetrievalFamily, Metric>> = {};
  for (const name of families) {
    const metric = family[name]?.hitAt3;
    if (metric) perFamilyHitAt3[name] = metric;
  }
  const decision = evaluateRetrievalDecision({
    stage: "acceptance",
    hitAt3: candidate.hitAt3,
    macroSectionRecallAt3: candidate.macroSectionRecallAt3,
    noMatchAbstention: candidate.noMatchAbstention,
    falseAbstention: candidate.falseAbstention,
    directPrecisionAt3: candidate.directPrecisionAt3,
    keywordDirectPrecisionAt3: keyword.directPrecisionAt3,
    perFamilyHitAt3,
    routeCoverage: candidate.routeCoverage,
    reliability: candidate.reliability.point,
    p95LatencyMs: candidate.p95LatencyMs,
    safetyViolations: 0,
  });

  const run = basename(input.outDir);
  const configPath = repoPath(resolve(input.configPath));
  const report = {
    phase: "R4.4",
    run,
    generatedAt: new Date().toISOString(),
    split: "holdout",
    status: decision.status,
    primaryMetric: context.protocol.primaryMetric,
    candidateArm,
    profileVersion: holdout.config.profileVersion,
    packingVersion: holdout.config.packingVersion,
    supportVersion: holdout.config.supportVersion,
    support: holdout.config.support,
    candidateConfig: {
      path: configPath,
      hash: holdout.configHash,
      values: holdout.config,
    },
    seal: {
      path: holdout.seal.sealPath,
      hash: holdout.seal.sealHash,
      corpusHash: holdout.seal.corpusHash,
      files: holdout.seal.files,
    },
    inputs: {
      protocolHash: context.hashes.protocol,
      corpusHash: context.hashes.corpus,
      casesHash: context.hashes.cases,
      labelHash: context.hashes.labels,
      evidenceHash: context.hashes.evidence,
      inputHash,
      scoresHash: await sha256File(scoresPath),
    },
    counts: {
      scheduled: candidateReport.counts.scheduled,
      answerable: candidateReport.counts.eligibleAnswerable,
      noMatch: candidateReport.counts.noMatch,
      corpusGap: candidateReport.counts.corpusGap,
      providerExcluded: candidateReport.counts.providerExcluded,
      unavailable: candidateReport.counts.unavailable,
    },
    metrics: { candidate, keyword },
    perFamily: family,
    keywordPerFamily: keywordFamily,
    paired,
    latency,
    decision,
    ledger: {
      counts: ledger.counts,
      stages: ledger.stages,
    },
    rows: candidateReport.rows.map((row) => {
      const info = ranked.detail.find((item) => item.id === row.id)!;
      return {
        id: row.id,
        family: familyOf(row.id),
        kind: row.kind,
        returned: row.returned,
        scores: info.scores,
        accepted: context.rows.find((item) => item.case.id === row.id)?.accepted,
        missingFacets: info.missingFacets,
        facetsRequested: info.facetsRequested,
        facetsDropped: info.facetsDropped,
        supportReason: info.supportReason,
        abstained: info.abstained,
        route: {
          hints: info.routeHints,
          confident: info.routeConfident,
          reasons: info.routeReasons,
          weakTokenRejected: info.weakTokenRejected,
        },
        latencyMs: info.latencyMs,
        sufficient: row.sufficient,
        strictSufficient: row.strictSufficient,
        eligibleAnswerable: row.eligibleAnswerable,
        providerExcluded: row.providerExcluded,
        available: row.available,
        sectionRecall: row.sectionRecall,
        directPrecision: row.directPrecision,
        candidateRecall: row.candidateRecall,
        routeCoverage: row.routeCoverage,
      };
    }),
    keywordRows: keywordReport.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      returned: row.returned,
      sufficient: row.sufficient,
      sectionRecall: row.sectionRecall,
      directPrecision: row.directPrecision,
      available: row.available,
    })),
    notes: {
      metric:
        "sufficientGuidanceHit@3 requires every required facet to have an accepted citation in the returned three; scoreTarget owns the definition.",
      recallInterval:
        "macro recall and direct precision points are macro means; their Wilson intervals treat accepted/returned citations as the evidence units.",
      clustering:
        "case-level Wilson bounds are anti-conservative because the 120 answerable cases cluster into 10 family-level label signatures.",
      unavailable:
        "an output that is missing or errors is unavailable: it cannot satisfy abstention and counts against reliability.",
      equivalenceRecall:
        "an F04-style facet may accept two independently sufficient sibling sections; returning either one is a primary hit, but the unreturned sibling stays in the citation-level recall denominator.",
      abstention:
        "all no-match cases carry zero route hints and zero observed anchors, so abstention confirms support-policy wiring rather than near-miss discrimination.",
      latency:
        "p95LatencyMs is the per-case rerank time over the frozen candidate set in the offline scorer, matching the R3 measurement basis; it is not warm HTTP service latency.",
      oneRun:
        "this is the single pre-registered holdout run; no re-scoring or candidate change is authorized after this score exists.",
      noTuning:
        "no route, facet, packing, support, corpus, label, gate, or prompt was changed while producing this report.",
    },
  };

  const reportPath = join(input.outDir, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });

  const ledgerPath = join(input.outDir, "failure-ledger.json");
  await writeFile(
    ledgerPath,
    JSON.stringify(
      {
        phase: "R4.4",
        run,
        generatedAt: report.generatedAt,
        split: "holdout",
        counts: ledger.counts,
        stages: ledger.stages,
        entries: ledger.entries,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );

  const decisionPath = join(input.outDir, "decision.md");
  await writeFile(
    decisionPath,
    buildAcceptanceDecisionMarkdown({
      run,
      decision,
      candidate,
      keyword,
      family,
      paired,
      ledger,
      hashes: context.hashes,
      configHash: holdout.configHash,
      sealHash: holdout.seal.sealHash,
      configPath,
      latency,
    }),
    { flag: "wx" },
  );

  const manifest = {
    phase: "R4.4",
    run,
    generatedAt: report.generatedAt,
    candidateConfigHash: holdout.configHash,
    sealHash: holdout.seal.sealHash,
    gate: {
      status: decision.status,
      failing: decision.failing,
      blockedReasons: decision.blockedReasons,
    },
    files: {
      "inference-original.json": await sha256File(inferencePath),
      "scores-original.json": await sha256File(scoresPath),
      "report.json": await sha256File(reportPath),
      "failure-ledger.json": await sha256File(ledgerPath),
      "decision.md": await sha256File(decisionPath),
    },
  };
  await writeFile(
    join(input.outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { flag: "wx" },
  );

  return {
    decision,
    reportPath,
    ledgerPath,
    decisionPath,
    configHash: holdout.configHash,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const { values } = parseArgs({
    options: {
      split: { type: "string" },
      out: { type: "string" },
      config: { type: "string" },
      "cache-dir": { type: "string" },
      scores: { type: "string" },
    },
    strict: true,
  });
  const split = values.split ?? "development";
  const cacheDir = resolve(
    values["cache-dir"] ??
      process.env.RUNBOOK_MINILM_CACHE_DIR ??
      join(repoRoot, ".tmp-turbo-user/r2-models"),
  );

  if (split === "development") {
    assertDevelopmentSplit(split);
    const result = await runDevelopmentScreening({
      outDir: resolve(values.out ?? defaultOutDir),
      cacheDir,
      ...(values.scores ? { scoresPath: resolve(values.scores) } : {}),
    });
    console.log(`decision=${result.decision.status}`);
    console.log(`report=${repoPath(result.reportPath)}`);
    if (result.decision.status !== "retrieval_accepted") process.exitCode = 1;
    return;
  }

  assertHoldoutSplit(split);
  if (!values.config)
    throw new Error("--config is required for the sealed holdout split");
  const result = await runHoldoutAcceptance({
    outDir: resolve(values.out ?? defaultHoldoutOutDir),
    configPath: resolve(values.config),
    cacheDir,
    ...(values.scores ? { scoresPath: resolve(values.scores) } : {}),
  });
  console.log(`decision=${result.decision.status}`);
  console.log(`configHash=${result.configHash}`);
  console.log(`report=${repoPath(result.reportPath)}`);
  if (result.decision.status !== "retrieval_accepted") process.exitCode = 1;
}

if (import.meta.main) await main();
