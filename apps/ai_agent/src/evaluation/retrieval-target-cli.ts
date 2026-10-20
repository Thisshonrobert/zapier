// R3 CLI: freeze the serving corpus, prepare the reviewed benchmark, capture
// the baseline inference input, and report each arm's metrics and failures.
// Every run directory is immutable; a changed label or corpus needs a new run.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { defaultRunbookDirectory } from "../paths.ts";
import {
  ControlledFixtureEvidenceSchema,
  type DiagnosisEvidence,
} from "../contracts.ts";
import {
  eligibleRunbookSections,
  loadRunbooks,
  scoredRunbookSections,
  type RunbookIndex,
} from "../tools/search-runbooks.ts";
import { buildStructuredRetrievalInput } from "../tools/retrieval-profile.ts";
import type { SupportPolicy } from "../tools/retrieval-support.ts";
import { rankRouteOnly, rankStructured, routeCandidates } from "../tools/structured-ranking.ts";
import { hash } from "./retrieval-r21.ts";
import {
  evaluateHoldoutGate,
  HOLD_OUT_GATE_THRESHOLDS,
  type HoldoutGateThresholds,
} from "./holdout-gate.ts";
import {
  canonicalSections,
  corpusHash,
  loadFrozenCorpus,
  loadTargetCases,
  loadTargetLabels,
  prepareTargetBenchmark,
  scoreTarget,
  targetLabelHash,
  verifyTargetCorpus,
  type TargetCase,
  type TargetOutput,
} from "./retrieval-target.ts";

const source = "docs/AI/runbooks";
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const r3Dir = join(repoRoot, "apps/ai_agent/evaluation/r3");
const r23ConfigPath = join(repoRoot, "apps/ai_agent/evaluation/r23/config.json");
const holdoutDir = join(r3Dir, "holdout");
const selectedConfigPath = join(r3Dir, "selected-retrieval-config.json");
const baselineReportPath = join(
  r3Dir,
  "runs",
  "baseline-20261019-v1",
  "report.json",
);

const sha256 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function sha256File(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export async function freezeTargetCorpus(
  outPath: string,
): Promise<{ corpusHash: string; sections: number }> {
  const index = await loadRunbooks(defaultRunbookDirectory());
  const sections = canonicalSections(index);
  const corpusHashValue = corpusHash(sections);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    JSON.stringify(
      { version: 1, source, corpusHash: corpusHashValue, sections },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  return { corpusHash: corpusHashValue, sections: sections.length };
}

async function loadRuntimeIndex(): Promise<RunbookIndex> {
  const index = await loadRunbooks(defaultRunbookDirectory());
  verifyTargetCorpus(index, await loadFrozenCorpus(join(r3Dir, "corpus-v1.json")));
  return index;
}

// ---- benchmark preparation -------------------------------------------------

export async function prepareBenchmark(): Promise<void> {
  const result = await prepareTargetBenchmark(r3Dir);
  console.log(`${result.cases} cases`);
  console.log(result.labelHash);
}

// ---- baseline capture ------------------------------------------------------

export async function prepareBaseline(outDir: string): Promise<void> {
  const index = await loadRuntimeIndex();
  const cases = await loadTargetCases(join(r3Dir, "development-cases-v1.json"));
  const frozen = await loadFrozenCorpus(join(r3Dir, "corpus-v1.json"));
  const r23 = JSON.parse(await readFile(r23ConfigPath, "utf8")) as {
    models: { reranker: unknown };
  };
  const config = {
    models: { reranker: r23.models.reranker },
    variants: ["original"],
    batchSize: 8,
    maxLength: 512,
  };
  const queries = cases.map((item) => {
    const eligible = [...eligibleRunbookSections(index, item.input)].sort((a, b) =>
      a.citation.localeCompare(b.citation),
    );
    const passages: Record<string, string> = {};
    for (const section of eligible)
      passages[section.citation] = `${section.heading}\n${section.content}`;
    return {
      id: item.id,
      query: item.input.query,
      candidates: eligible.map((section) => section.citation),
      passages: { original: passages },
    };
  });
  const payload = { config, queries };
  const inputHash = hash(payload);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "inference-original.json"),
    JSON.stringify({ inputHash, ...payload }, null, 2) + "\n",
    { flag: "wx" },
  );
  const labels = await loadTargetLabels(
    join(r3Dir, "development-labels-v1.json"),
  );
  const manifest = {
    generatedAt: new Date().toISOString(),
    corpusHash: frozen.corpusHash,
    protocolHash: await sha256File(join(r3Dir, "protocol.json")),
    labelHash: targetLabelHash(labels),
    inputHash,
    cases: cases.length,
    candidates: queries.map((query) => ({
      id: query.id,
      candidates: query.candidates.length,
    })),
  };
  await writeFile(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(`${queries.length} queries`);
  console.log(inputHash);
}

// ---- structured profile arms (R3.2) ---------------------------------------

const reviewPath = join(
  repoRoot,
  "apps/ai_agent/evaluation/production-selection/development-review-v3.json",
);

type ReviewEvidenceCase = {
  id: string;
  kind: "answerable" | "no_match";
  evidence: DiagnosisEvidence;
};

type ProfileScores = {
  inputHash: string;
  records: Record<
    string,
    { original: { logits: Record<string, number>; rerankMs: number } }
  >;
};

async function loadProfileContext() {
  const index = await loadRuntimeIndex();
  const cases = await loadTargetCases(join(r3Dir, "development-cases-v1.json"));
  const frozen = await loadFrozenCorpus(join(r3Dir, "corpus-v1.json"));
  const labels = await loadTargetLabels(
    join(r3Dir, "development-labels-v1.json"),
  );
  const review = JSON.parse(await readFile(reviewPath, "utf8")) as {
    cases: ReviewEvidenceCase[];
  };
  const evidenceById = new Map(
    review.cases.map((item) => [item.id, item.evidence]),
  );
  for (const item of cases)
    if (!evidenceById.has(item.id))
      throw new Error(`Missing observed evidence for ${item.id}`);
  return { index, cases, frozen, labels, evidenceById };
}

function routedCitations(
  index: RunbookIndex,
  input: ReturnType<typeof buildStructuredRetrievalInput>,
) {
  const eligible = eligibleRunbookSections(index, input);
  const hints = input.route?.confident
    ? new Set(input.route.hints.map((hint) => hint.toLowerCase()))
    : null;
  const routed = hints
    ? eligible.filter((section) =>
        section.taxonomy.some((taxonomy) => hints.has(taxonomy.toLowerCase())),
      )
    : eligible;
  const routedSet = new Set(routed.map((section) => section.citation));
  return {
    eligible,
    routed,
    routeExcluded: eligible
      .filter((section) => !routedSet.has(section.citation))
      .map((section) => section.citation),
  };
}

export async function prepareProfile(outDir: string): Promise<void> {
  const { index, cases, frozen, labels, evidenceById } =
    await loadProfileContext();
  const r23 = JSON.parse(await readFile(r23ConfigPath, "utf8")) as {
    models: { reranker: unknown };
  };
  const config = {
    models: { reranker: r23.models.reranker },
    variants: ["original"],
    batchSize: 8,
    maxLength: 512,
  };
  const profiles = new Map(
    cases.map((item) => [
      item.id,
      buildStructuredRetrievalInput(evidenceById.get(item.id)!),
    ]),
  );
  const queries = cases.map((item) => {
    const profile = profiles.get(item.id)!;
    const eligible = [...eligibleRunbookSections(index, profile)].sort(
      (left, right) => left.citation.localeCompare(right.citation),
    );
    const passages: Record<string, string> = {};
    for (const section of eligible)
      passages[section.citation] = `${section.heading}\n${section.content}`;
    return {
      id: item.id,
      query: profile.query,
      candidates: eligible.map((section) => section.citation),
      passages: { original: passages },
    };
  });
  const payload = { config, queries };
  const inputHash = hash(payload);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "inference-original.json"),
    JSON.stringify({ inputHash, ...payload }, null, 2) + "\n",
    { flag: "wx" },
  );

  const routeRows = cases.map((item) => {
    const profile = profiles.get(item.id)!;
    const { eligible, routed, routeExcluded } = routedCitations(index, profile);
    const eligibleCitations = new Set(
      eligible.map((section) => section.citation),
    );
    const accepted = [
      ...new Set(item.requiredFacets.flatMap((facet) => facet.accepted)),
    ];
    const eligibleAccepted = accepted.filter((citation) =>
      eligibleCitations.has(citation),
    );
    const unroutedAccepted = eligibleAccepted.filter((citation) =>
      routeExcluded.includes(citation),
    );
    return {
      id: item.id,
      kind: item.kind,
      hints: profile.route?.hints ?? [],
      confident: profile.route?.confident ?? false,
      reasons: profile.route?.reasons ?? [],
      requestedFacets: profile.requestedFacets ?? [],
      anchors: profile.anchors ?? [],
      eligible: eligible.length,
      routed: routed.length,
      routeExcluded,
      accepted: eligibleAccepted.length,
      accessExcluded: accepted.length - eligibleAccepted.length,
      covered: eligibleAccepted.length - unroutedAccepted.length,
      unroutedAccepted,
    };
  });
  const answerable = routeRows.filter((row) => row.kind === "answerable");
  const accepted = answerable.reduce((total, row) => total + row.accepted, 0);
  const covered = answerable.reduce((total, row) => total + row.covered, 0);
  const routeCoverage = accepted ? covered / accepted : 1;
  const routeAudit = {
    version: "r3.2-v1",
    corpusHash: frozen.corpusHash,
    labelHash: targetLabelHash(labels),
    inputHash,
    routeCoverage,
    accepted,
    covered,
    cases: routeRows,
  };
  await writeFile(
    join(outDir, "route-audit.json"),
    JSON.stringify(routeAudit, null, 2) + "\n",
    { flag: "wx" },
  );
  const manifest = {
    generatedAt: new Date().toISOString(),
    profileVersion: "r3.2-v1",
    corpusHash: frozen.corpusHash,
    protocolHash: await sha256File(join(r3Dir, "protocol.json")),
    labelHash: targetLabelHash(labels),
    inputHash,
    cases: cases.length,
    routeCoverage,
    selectedArm: routeCoverage === 1 ? "profile-route" : "profile-global",
    candidates: queries.map((query) => ({
      id: query.id,
      candidates: query.candidates.length,
    })),
  };
  await writeFile(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(`${queries.length} queries`);
  console.log(inputHash);
  console.log(`routeCoverage=${routeCoverage}`);
}

export async function reportProfile(
  globalDir: string,
  routeDir: string,
): Promise<void> {
  const { index, cases, frozen, labels, evidenceById } =
    await loadProfileContext();
  const inference = JSON.parse(
    await readFile(join(globalDir, "inference-original.json"), "utf8"),
  ) as { inputHash: string };
  const scores = JSON.parse(
    await readFile(join(globalDir, "scores-original.json"), "utf8"),
  ) as ProfileScores;
  const routeAudit = JSON.parse(
    await readFile(join(globalDir, "route-audit.json"), "utf8"),
  ) as {
    routeCoverage: number;
    accepted: number;
    covered: number;
    cases: Array<{ id: string; routeExcluded: string[] }>;
  };
  if (scores.inputHash !== inference.inputHash)
    throw new Error("Scores do not belong to this inference input");

  const globalOutputs: TargetOutput[] = [];
  const routeOutputs: TargetOutput[] = [];
  const routeExcludedById = new Map<string, string[]>();
  cases.forEach((item) => {
    const profile = buildStructuredRetrievalInput(evidenceById.get(item.id)!);
    const record = scores.records[item.id]?.original;
    if (!record) throw new Error(`Missing scores for ${item.id}`);
    const candidates = Object.keys(record.logits).sort();
    const globalResult = rankRouteOnly(
      index,
      { ...profile, route: undefined },
      record.logits,
    );
    const routeResult = rankRouteOnly(index, profile, record.logits);
    const routedCandidates = candidates.filter(
      (citation) => !routeResult.routeExcluded.includes(citation),
    );
    globalOutputs.push({
      id: item.id,
      returned: globalResult.matches.map((match) => match.citation),
      latencyMs: record.rerankMs,
      candidates,
      routeExcluded: [],
    });
    routeOutputs.push({
      id: item.id,
      returned: routeResult.matches.map((match) => match.citation),
      latencyMs: record.rerankMs,
      candidates: routedCandidates,
      routeExcluded: routeResult.routeExcluded,
    });
    routeExcludedById.set(item.id, routeResult.routeExcluded);
  });

  const globalScored = scoreTarget(index, cases, globalOutputs);
  const routeScored = scoreTarget(index, cases, routeOutputs);
  const withArmDetail = (
    scored: ReturnType<typeof scoreTarget>,
    outputs: TargetOutput[],
  ) => ({
    ...scored,
    rows: scored.rows.map((row) => {
      const output = outputs.find((item) => item.id === row.id)!;
      const item = cases.find((candidate) => candidate.id === row.id)!;
      return {
        ...row,
        requiredFacets: item.requiredFacets.map((facet) => facet.facet),
        routeExcluded: routeExcludedById.get(row.id) ?? [],
        latencyMs: "latencyMs" in output ? output.latencyMs : 0,
      };
    }),
  });
  const routeCoverageOk =
    routeAudit.routeCoverage === 1 &&
    routeScored.rows
      .filter((row) => row.eligibleAnswerable)
      .every((row) => row.routeCoverage === 1);
  const routeGate = {
    threshold: 1,
    routeCoverage: routeAudit.routeCoverage,
    accepted: routeAudit.accepted,
    covered: routeAudit.covered,
    status: routeCoverageOk ? "enabled" : "disabled",
    selectedArm: routeCoverageOk ? "profile-route" : "profile-global",
  };
  const base = {
    generatedAt: new Date().toISOString(),
    profileVersion: "r3.2-v1",
    corpusHash: frozen.corpusHash,
    labelHash: targetLabelHash(labels),
    protocolHash: await sha256File(join(r3Dir, "protocol.json")),
    inputHash: inference.inputHash,
    scoresHash: await sha256File(join(globalDir, "scores-original.json")),
    routeGate,
    routeAudit: routeAudit.cases,
    notes: {
      sharedLogits:
        "both arms consume the same scores-original.json; only the route candidate set changes",
      noCutoff:
        "the structured arms rank by sigmoid score without the minilm-original .001 floor",
    },
  };
  const report = {
    ...base,
    arms: {
      "profile-global": withArmDetail(globalScored, globalOutputs),
      "profile-route": withArmDetail(routeScored, routeOutputs),
    },
  };
  await writeFile(
    join(globalDir, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
    { flag: "wx" },
  );
  await mkdir(routeDir, { recursive: true });
  await writeFile(
    join(routeDir, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: base.generatedAt,
        profileVersion: base.profileVersion,
        corpusHash: base.corpusHash,
        labelHash: base.labelHash,
        protocolHash: base.protocolHash,
        inputHash: base.inputHash,
        scoresHash: base.scoresHash,
        routeGate,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  await writeFile(
    join(routeDir, "report.json"),
    JSON.stringify(
      { ...base, arm: "profile-route", armReport: report.arms["profile-route"] },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  for (const [arm, value] of Object.entries(report.arms)) {
    console.log(
      `${arm}: hit@3=${value.metrics.sufficientGuidanceHitAt3} ` +
        `recall=${value.metrics.macroSectionRecallAt3} ` +
        `precision=${value.metrics.directPrecisionAt3} ` +
        `routeCoverage=${value.metrics.routeCoverage} ` +
        `abstention=${value.noMatchAbstention.rate}`,
    );
  }
  console.log(`routeGate=${routeGate.status} (${routeGate.selectedArm})`);
}

// ---- facet-packed arm (R3.3) ----------------------------------------------

export async function reportFacets(
  outDir: string,
  scoresDir: string,
  routeDir: string,
): Promise<void> {
  const { index, cases, frozen, labels, evidenceById } =
    await loadProfileContext();
  const inference = JSON.parse(
    await readFile(join(scoresDir, "inference-original.json"), "utf8"),
  ) as { inputHash: string };
  const scores = JSON.parse(
    await readFile(join(scoresDir, "scores-original.json"), "utf8"),
  ) as ProfileScores;
  const routeManifest = JSON.parse(
    await readFile(join(routeDir, "manifest.json"), "utf8"),
  ) as {
    routeGate?: {
      status?: string;
      selectedArm?: string;
      routeCoverage?: number;
      accepted?: number;
      covered?: number;
    };
  };
  if (scores.inputHash !== inference.inputHash)
    throw new Error("Scores do not belong to this inference input");
  if (routeManifest.routeGate?.selectedArm !== "profile-route")
    throw new Error("Facet packing requires the selected profile-route arm");

  const facetOutputs: TargetOutput[] = [];
  const keywordOutputs: TargetOutput[] = [];
  const facetInfo = new Map<string, ArmInfo>();
  const facetDetail = new Map<string, Record<string, unknown>>();
  const keywordInfo = new Map<string, ArmInfo>();

  for (const item of cases) {
    const profile = buildStructuredRetrievalInput(evidenceById.get(item.id)!);
    const record = scores.records[item.id]?.original;
    if (!record) throw new Error(`Missing scores for ${item.id}`);
    const { candidates, routeExcluded } = routeCandidates(index, profile);
    const candidatesByCitation = candidates.map(
      (section) => section.citation,
    );
    const packed = rankStructured(index, profile, record.logits);
    const returned = packed.matches.map((match) => match.citation);
    facetOutputs.push({
      id: item.id,
      returned,
      latencyMs: record.rerankMs,
      candidates: candidatesByCitation,
      routeExcluded,
    });
    facetInfo.set(item.id, {
      returned,
      candidates: candidatesByCitation,
      scored: candidatesByCitation,
      routeExcluded,
      scores: Object.fromEntries(
        packed.matches.map((match) => [match.citation, match.score]),
      ),
    });
    const missingFacets = item.requiredFacets
      .filter(
        (facet) =>
          !facet.accepted.some((citation) => returned.includes(citation)),
      )
      .map((facet) => facet.facet);
    facetDetail.set(item.id, {
      facetsRequested: packed.facetsRequested,
      facetsCovered: packed.facetsCovered,
      missingFacets,
      missingAccepted: item.requiredFacets
        .filter((facet) => missingFacets.includes(facet.facet))
        .flatMap((facet) => facet.accepted),
    });

    const started = performance.now();
    const keywordScored = scoredRunbookSections(index, item.input);
    const keywordLatency = performance.now() - started;
    const keywordReturned = keywordScored
      .slice(0, item.input.limit ?? 3)
      .map((entry) => entry.section.citation);
    const keywordCandidates = eligibleRunbookSections(index, item.input).map(
      (section) => section.citation,
    );
    keywordOutputs.push({
      id: item.id,
      returned: keywordReturned,
      latencyMs: keywordLatency,
      candidates: keywordCandidates,
      routeExcluded: [],
    });
    keywordInfo.set(item.id, {
      returned: keywordReturned,
      candidates: keywordCandidates,
      scored: keywordScored.map((entry) => entry.section.citation),
      routeExcluded: [],
      scores: Object.fromEntries(
        keywordScored.map((entry) => [entry.section.citation, entry.score]),
      ),
    });
  }

  const facetArm = buildTargetArm(
    index,
    cases,
    "structured",
    facetOutputs,
    facetInfo,
    (id) => facetDetail.get(id) ?? {},
  );
  const keywordArm = buildTargetArm(
    index,
    cases,
    "keyword",
    keywordOutputs,
    keywordInfo,
  );

  const hit = facetArm.metrics.sufficientGuidanceHitAt3 ?? 0;
  const recall = facetArm.metrics.macroSectionRecallAt3 ?? 0;
  const precision = facetArm.metrics.directPrecisionAt3 ?? 0;
  const keywordPrecision = keywordArm.metrics.directPrecisionAt3 ?? 0;
  const abstention = facetArm.falseAbstention.rate ?? 0;
  const checks = {
    hitAt3: { value: hit, threshold: 0.8, pass: hit >= 0.8 },
    macroSectionRecallAt3: {
      value: recall,
      threshold: 0.8,
      pass: recall >= 0.8,
    },
    directPrecisionAt3: {
      value: precision,
      keywordControl: keywordPrecision,
      pass: precision >= keywordPrecision,
    },
    falseAbstention: {
      value: abstention,
      threshold: 0.05,
      pass: abstention <= 0.05,
    },
  };
  const gate = {
    ...checks,
    status: Object.values(checks).every((check) => check.pass)
      ? "passed"
      : "failed",
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    packingVersion: "r3.3-v1",
    corpusHash: frozen.corpusHash,
    labelHash: targetLabelHash(labels),
    protocolHash: await sha256File(join(r3Dir, "protocol.json")),
    inputHash: inference.inputHash,
    scoresHash: await sha256File(join(scoresDir, "scores-original.json")),
    routeGate: routeManifest.routeGate,
    selectedArm: "profile-route-facets",
    notes: {
      sharedLogits:
        "facet packing consumes the same scores-original.json as the selected R3.2 profile-route arm; only top-three selection changes",
      noCutoff:
        "the structured arm ranks by sigmoid score without the minilm-original .001 floor",
      noMatchLedger:
        "R3.3 has no support gate yet; no-match cases that still return sections are recorded as cutoff_rejection until R3.4",
    },
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { flag: "wx" },
  );
  await writeFile(
    join(outDir, "report.json"),
    JSON.stringify(
      {
        ...manifest,
        gate,
        arms: { keyword: keywordArm, "profile-route-facets": facetArm },
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    `profile-route-facets: hit@3=${hit} recall=${recall} precision=${precision} ` +
      `keywordPrecision=${keywordPrecision} falseAbstention=${abstention}`,
  );
  console.log(`phaseGate=${gate.status}`);
}

// ---- calibrated support arm (R3.4) ----------------------------------------

const supportSelectionOrder = [
  "no-match abstention >= 90%",
  "false abstention <= 5%",
  "highest sufficient-guidance hit@3",
  "highest macro section recall@3",
  "lower p95 latency",
] as const;

type SupportSetting = {
  policy: SupportPolicy;
  arm: ReturnType<typeof buildTargetArm>;
  cases: Array<Record<string, unknown>>;
};

function buildKeywordControl(index: RunbookIndex, cases: readonly TargetCase[]) {
  const outputs: TargetOutput[] = [];
  const info = new Map<string, ArmInfo>();
  for (const item of cases) {
    const started = performance.now();
    const keywordScored = scoredRunbookSections(index, item.input);
    const latency = performance.now() - started;
    const returned = keywordScored
      .slice(0, item.input.limit ?? 3)
      .map((entry) => entry.section.citation);
    const candidates = eligibleRunbookSections(index, item.input).map(
      (section) => section.citation,
    );
    outputs.push({
      id: item.id,
      returned,
      latencyMs: latency,
      candidates,
      routeExcluded: [],
    });
    info.set(item.id, {
      returned,
      candidates,
      scored: keywordScored.map((entry) => entry.section.citation),
      routeExcluded: [],
      scores: Object.fromEntries(
        keywordScored.map((entry) => [entry.section.citation, entry.score]),
      ),
    });
  }
  return buildTargetArm(index, cases, "keyword", outputs, info);
}

function selectSupportSetting(
  settings: readonly SupportSetting[],
): SupportSetting {
  const abstentionEligible = settings.filter(
    (setting) => (setting.arm.noMatchAbstention.rate ?? 0) >= 0.9,
  );
  const abstentionPool = abstentionEligible.length
    ? abstentionEligible
    : settings;
  const falseAbstentionEligible = abstentionPool.filter(
    (setting) => (setting.arm.falseAbstention.rate ?? 1) <= 0.05,
  );
  const pool = falseAbstentionEligible.length
    ? falseAbstentionEligible
    : abstentionPool;
  return [...pool].sort(
    (left, right) =>
      (right.arm.metrics.sufficientGuidanceHitAt3 ?? 0) -
        (left.arm.metrics.sufficientGuidanceHitAt3 ?? 0) ||
      (right.arm.metrics.macroSectionRecallAt3 ?? 0) -
        (left.arm.metrics.macroSectionRecallAt3 ?? 0) ||
      (left.arm.p95LatencyMs ?? 0) - (right.arm.p95LatencyMs ?? 0),
  )[0]!;
}

export async function reportSupport(
  outDir: string,
  scoresDir: string,
  routeDir: string,
): Promise<void> {
  const { index, cases, frozen, labels, evidenceById } =
    await loadProfileContext();
  const inference = JSON.parse(
    await readFile(join(scoresDir, "inference-original.json"), "utf8"),
  ) as { inputHash: string };
  const scores = JSON.parse(
    await readFile(join(scoresDir, "scores-original.json"), "utf8"),
  ) as ProfileScores;
  const routeManifest = JSON.parse(
    await readFile(join(routeDir, "manifest.json"), "utf8"),
  ) as {
    routeGate?: {
      status?: string;
      selectedArm?: string;
      routeCoverage?: number;
      accepted?: number;
      covered?: number;
    };
  };
  if (scores.inputHash !== inference.inputHash)
    throw new Error("Scores do not belong to this inference input");
  if (routeManifest.routeGate?.selectedArm !== "profile-route")
    throw new Error("The support gate requires the selected profile-route arm");

  const keywordArm = buildKeywordControl(index, cases);
  const settings: SupportSetting[] = [];
  const policies: SupportPolicy[] = [
    { minAnchorHits: 1 },
    { minAnchorHits: 2 },
  ];

  for (const policy of policies) {
    const outputs: TargetOutput[] = [];
    const info = new Map<string, ArmInfo>();
    const detail = new Map<string, Record<string, unknown>>();

    for (const item of cases) {
      const profile = buildStructuredRetrievalInput(evidenceById.get(item.id)!);
      const record = scores.records[item.id]?.original;
      if (!record) throw new Error(`Missing scores for ${item.id}`);
      const { candidates, routeExcluded } = routeCandidates(index, profile);
      const candidatesByCitation = candidates.map(
        (section) => section.citation,
      );
      const packed = rankStructured(index, profile, record.logits, policy);
      const returned = packed.matches.map((match) => match.citation);
      outputs.push({
        id: item.id,
        returned,
        latencyMs: record.rerankMs,
        candidates: candidatesByCitation,
        routeExcluded,
      });
      info.set(item.id, {
        returned,
        candidates: candidatesByCitation,
        scored: candidatesByCitation,
        routeExcluded,
        scores: Object.fromEntries(
          packed.matches.map((match) => [match.citation, match.score]),
        ),
      });
      const missingFacets = item.requiredFacets
        .filter(
          (facet) =>
            !facet.accepted.some((citation) => returned.includes(citation)),
        )
        .map((facet) => facet.facet);
      detail.set(item.id, {
        support: { minAnchorHits: policy.minAnchorHits },
        supportReason: packed.supportReason,
        abstained: packed.abstained,
        anchors: profile.anchors ?? [],
        matchedAnchors: packed.matchedAnchors,
        facetsRequested: packed.facetsRequested,
        facetsCovered: packed.facetsCovered,
        missingFacets,
        missingAccepted: item.requiredFacets
          .filter((facet) => missingFacets.includes(facet.facet))
          .flatMap((facet) => facet.accepted),
      });
    }

    const arm = buildTargetArm(
      index,
      cases,
      "structured",
      outputs,
      info,
      (id) => detail.get(id) ?? {},
    );
    settings.push({
      policy,
      arm,
      cases: cases.map((item) => {
        const value = detail.get(item.id)!;
        return {
          id: item.id,
          kind: item.kind,
          supportReason: value.supportReason,
          abstained: value.abstained,
          anchors: value.anchors,
          matchedAnchors: value.matchedAnchors,
          missingFacets: value.missingFacets,
        };
      }),
    });
  }

  const selected = selectSupportSetting(settings);
  const selectedArm = selected.arm;
  const tied =
    settings.length > 1 &&
    settings.every(
      (setting) =>
        setting.arm.metrics.sufficientGuidanceHitAt3 ===
          selectedArm.metrics.sufficientGuidanceHitAt3 &&
        setting.arm.metrics.macroSectionRecallAt3 ===
          selectedArm.metrics.macroSectionRecallAt3 &&
        setting.arm.noMatchAbstention.rate ===
          selectedArm.noMatchAbstention.rate &&
        setting.arm.falseAbstention.rate ===
          selectedArm.falseAbstention.rate &&
        setting.arm.p95LatencyMs === selectedArm.p95LatencyMs,
    );

  const noMatchAbstentionPass =
    (selectedArm.noMatchAbstention.rate ?? 0) >= 0.9;
  const falseAbstentionPass =
    (selectedArm.falseAbstention.rate ?? 1) <= 0.05;
  const gate = {
    noMatchAbstention: {
      ...selectedArm.noMatchAbstention,
      threshold: 0.9,
      pass: noMatchAbstentionPass,
    },
    falseAbstention: {
      ...selectedArm.falseAbstention,
      threshold: 0.05,
      pass: falseAbstentionPass,
    },
    status:
      noMatchAbstentionPass && falseAbstentionPass ? "passed" : "failed",
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    supportVersion: "r3.4-v1",
    corpusHash: frozen.corpusHash,
    labelHash: targetLabelHash(labels),
    protocolHash: await sha256File(join(r3Dir, "protocol.json")),
    inputHash: inference.inputHash,
    scoresHash: await sha256File(join(scoresDir, "scores-original.json")),
    routeGate: routeManifest.routeGate,
    selectedArm: "profile-route-facets-support",
    support: {
      selected: { minAnchorHits: selected.policy.minAnchorHits },
      policies: [1, 2],
      selectionOrder: supportSelectionOrder,
      tie: tied,
    },
    gate: { status: gate.status },
    notes: {
      sharedRoute:
        "the support arm reuses the frozen R3.2 profile-route decision; no route rule was retuned",
      sharedLogits:
        "facet packing and support reuse the same scores-original.json as the selected R3.2 profile-route arm",
      noCutoff:
        "the structured arm ranks by sigmoid score without the minilm-original .001 floor",
      support:
        "abstention is decided from route confidence or distinct observed anchors, never from a score threshold",
    },
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { flag: "wx" },
  );
  await writeFile(
    join(outDir, "report.json"),
    JSON.stringify(
      {
        ...manifest,
        gate,
        support: {
          ...manifest.support,
          selectedReason: tied
            ? "all selection criteria tied; minAnchorHits:1 is the predeclared Task 12 default"
            : "first setting by the predeclared selection order",
          settings: settings.map((setting) => ({
            minAnchorHits: setting.policy.minAnchorHits,
            sufficientGuidanceHitAt3:
              setting.arm.metrics.sufficientGuidanceHitAt3,
            macroSectionRecallAt3:
              setting.arm.metrics.macroSectionRecallAt3,
            directPrecisionAt3: setting.arm.metrics.directPrecisionAt3,
            noMatchAbstention: setting.arm.noMatchAbstention,
            falseAbstention: setting.arm.falseAbstention,
            p95LatencyMs: setting.arm.p95LatencyMs,
            ledgerSummary: setting.arm.ledgerSummary,
            cases: setting.cases,
          })),
        },
        arms: {
          keyword: keywordArm,
          "profile-route-facets-support": selectedArm,
        },
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    `profile-route-facets-support: minAnchorHits=${selected.policy.minAnchorHits} ` +
      `hit@3=${selectedArm.metrics.sufficientGuidanceHitAt3} ` +
      `recall=${selectedArm.metrics.macroSectionRecallAt3} ` +
      `precision=${selectedArm.metrics.directPrecisionAt3} ` +
      `abstention=${selectedArm.noMatchAbstention.rate} ` +
      `falseAbstention=${selectedArm.falseAbstention.rate}`,
  );
  console.log(`phaseGate=${gate.status}`);
}

// ---- R3.5 holdout freeze and acceptance ------------------------------------

const holdoutFamilies = [
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
  "NM",
] as const;

type HoldoutFamily = (typeof holdoutFamilies)[number];

const holdoutCategory = (id: string): HoldoutFamily => {
  const match = /^f(0[1-9]|10)-/.exec(id);
  return match ? (`F${match[1]}` as HoldoutFamily) : "NM";
};

type SelectedRetrievalConfig = {
  version: number;
  phase: string;
  status: string;
  retrievalMethod: string;
  routeEnabled: boolean;
  support: { minAnchorHits: 1 | 2 };
  versions: Record<string, string>;
  arms: {
    candidate: string;
    route: string;
    packing: string;
    baseline: string;
  };
  corpusHash: string;
  labelHash: string;
  protocolHash: string;
  development: {
    run: string;
    cases: number;
    answerable: number;
    noMatch: number;
    inputHash: string;
    scoresHash: string;
  };
  model: {
    id: string;
    revision: string;
    quantization: string;
    maxLength: number;
    batchSize: number;
    device: string;
  };
  prompt: { id: string; version: string; sourceHash: string };
  releaseGate: {
    sufficientGuidanceHitAt3: number;
    macroSectionRecallAt3: number;
    noMatchAbstention: number;
    falseAbstentionMax: number;
    directPrecisionNotBelow: string;
    reliability: number;
    p95LatencyMs: number;
    safetyViolationsMax: number;
  };
};

type HoldoutEvidenceFile = {
  version: number;
  cases: Array<{ id: string; evidence: DiagnosisEvidence }>;
};

type HoldoutFreeze = {
  version: 1;
  status: "frozen_before_run";
  frozenAt: string;
  config: { path: string; hash: string };
  corpus: { path: string; hash: string };
  protocol: { path: string; hash: string };
  holdout: {
    cases: {
      path: string;
      hash: string;
      count: number;
      answerable: number;
      noMatch: number;
      perCategory: Record<string, number>;
    };
    labels: { path: string; hash: string };
    evidence: { path: string; hash: string };
    review: { path: string; hash: string; verdict: string };
    authoring: { path: string; hash: string };
  };
  freezeRule: string;
};

type HoldoutContext = {
  config: SelectedRetrievalConfig;
  index: RunbookIndex;
  frozen: Awaited<ReturnType<typeof loadFrozenCorpus>>;
  cases: TargetCase[];
  labels: Awaited<ReturnType<typeof loadTargetLabels>>;
  evidenceById: Map<string, DiagnosisEvidence>;
  profiles: Map<string, ReturnType<typeof buildStructuredRetrievalInput>>;
  freeze: HoldoutFreeze | null;
  casesPath: string;
  labelsPath: string;
  evidencePath: string;
  reviewPath: string;
  authoringPath: string;
  freezePath: string;
};

const repoPath = (path: string) =>
  relative(repoRoot, path).replaceAll("\\", "/");

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, "utf8")) as T;

const meanOf = (values: readonly number[]): number | null =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;

async function loadSelectedConfig(): Promise<SelectedRetrievalConfig> {
  const config = await readJson<SelectedRetrievalConfig>(selectedConfigPath);
  if (config.version !== 1) throw new Error("Selected config version");
  if (config.phase !== "R3.5") throw new Error("Selected config phase");
  if (config.status !== "frozen_before_holdout")
    throw new Error("Selected config is not frozen before the holdout");
  if (config.retrievalMethod !== "structured-minilm")
    throw new Error("Selected config retrieval method");
  if (config.routeEnabled !== true) throw new Error("Selected config route");
  if (![1, 2].includes(config.support?.minAnchorHits))
    throw new Error("Selected config support policy");
  if (config.arms.candidate !== "profile-route-facets-support")
    throw new Error("Selected config candidate arm");
  if (config.arms.route !== "profile-route")
    throw new Error("Selected config route arm");
  if (config.arms.packing !== "profile-route-facets")
    throw new Error("Selected config packing arm");
  if (config.arms.baseline !== "keyword")
    throw new Error("Selected config baseline arm");

  const r23 = await readJson<{
    models: { reranker: { id: string; revision: string; dtype: string } };
  }>(r23ConfigPath);
  if (config.model.id !== r23.models.reranker.id)
    throw new Error("Selected config model id");
  if (config.model.revision !== r23.models.reranker.revision)
    throw new Error("Selected config model revision");
  if (config.model.quantization !== r23.models.reranker.dtype)
    throw new Error("Selected config model quantization");
  return config;
}

function validateHoldoutSet(
  index: RunbookIndex,
  cases: readonly TargetCase[],
  labels: Awaited<ReturnType<typeof loadTargetLabels>>,
  evidenceById: ReadonlyMap<string, DiagnosisEvidence>,
  devCases: readonly TargetCase[],
): void {
  if (cases.length !== 40) throw new Error("Holdout must have 40 cases");
  if (new Set(cases.map((item) => item.id)).size !== cases.length)
    throw new Error("Duplicate holdout case id");
  if (cases.filter((item) => item.kind === "answerable").length !== 30)
    throw new Error("Holdout must have 30 answerable cases");
  if (cases.filter((item) => item.kind === "no_match").length !== 10)
    throw new Error("Holdout must have 10 no-match cases");

  const perCategory: Record<string, number> = {};
  for (const item of cases) {
    const family = holdoutCategory(item.id);
    perCategory[family] = (perCategory[family] ?? 0) + 1;
  }
  for (const family of holdoutFamilies.slice(0, 10)) {
    if (perCategory[family] !== 3)
      throw new Error(`Holdout family ${family} must have three cases`);
  }
  if (perCategory.NM !== 10)
    throw new Error("Holdout no-match family must have ten cases");

  const devIds = new Set(devCases.map((item) => item.id));
  if (cases.some((item) => devIds.has(item.id)))
    throw new Error("Holdout reuses a development case id");

  const labelById = new Map(labels.cases.map((item) => [item.id, item]));
  if (labelById.size !== labels.cases.length)
    throw new Error("Duplicate holdout label id");
  if (labels.cases.length !== cases.length)
    throw new Error("Holdout labels do not match the case count");

  const known = new Set(index.map((section) => section.citation));
  for (const item of cases) {
    const label = labelById.get(item.id);
    if (!label) throw new Error(`Missing holdout label for ${item.id}`);
    if (
      JSON.stringify(label.supporting) !== JSON.stringify(item.supporting) ||
      JSON.stringify(label.missingRuntimeFacts) !==
        JSON.stringify(item.missingRuntimeFacts)
    )
      throw new Error(`Holdout label drift for ${item.id}`);
    if (item.kind === "no_match") {
      if (item.requiredFacets.length)
        throw new Error(`No-match case has facets: ${item.id}`);
      if (!label.noMatchRationale)
        throw new Error(`No-match case has no rationale: ${item.id}`);
      continue;
    }
    if (!item.requiredFacets.length)
      throw new Error(`Answerable case has no facet: ${item.id}`);
    if (item.requiredFacets.length > 3)
      throw new Error(`Answerable case has too many facets: ${item.id}`);
    if (
      new Set(item.requiredFacets.map((facet) => facet.facet)).size !==
      item.requiredFacets.length
    )
      throw new Error(`Duplicate facet: ${item.id}`);
    const eligible = new Set(
      eligibleRunbookSections(index, item.input).map(
        (section) => section.citation,
      ),
    );
    const accepted: string[] = [];
    for (const facet of item.requiredFacets) {
      if (!facet.accepted.length)
        throw new Error(`Empty accepted facet on ${item.id}`);
      for (const citation of facet.accepted) {
        if (!known.has(citation))
          throw new Error(`Unknown accepted citation on ${item.id}`);
        if (citation.startsWith("RB-F01-F02@1.0.0#"))
          throw new Error(`Retired F01/F02 citation on ${item.id}`);
        if (!eligible.has(citation))
          throw new Error(`Ineligible accepted citation on ${item.id}`);
        accepted.push(citation);
      }
    }
    for (const citation of item.supporting) {
      if (!known.has(citation))
        throw new Error(`Unknown supporting citation on ${item.id}`);
      if (accepted.includes(citation))
        throw new Error(`Supporting citation is also accepted on ${item.id}`);
    }
    if (!evidenceById.has(item.id))
      throw new Error(`Missing holdout evidence for ${item.id}`);
  }
  if (evidenceById.size !== cases.length)
    throw new Error("Holdout evidence has extra cases");
}

async function loadHoldoutContext(
  requireFreeze: boolean,
): Promise<HoldoutContext> {
  const config = await loadSelectedConfig();
  const index = await loadRuntimeIndex();
  const frozen = await loadFrozenCorpus(join(r3Dir, "corpus-v1.json"));
  if (config.corpusHash !== frozen.corpusHash)
    throw new Error("Selected config corpus hash does not match");
  const protocolHash = await sha256File(join(r3Dir, "protocol.json"));
  if (config.protocolHash !== protocolHash)
    throw new Error("Selected config protocol hash does not match");
  const devLabels = await loadTargetLabels(
    join(r3Dir, "development-labels-v1.json"),
  );
  if (config.labelHash !== targetLabelHash(devLabels))
    throw new Error("Selected config development label hash does not match");
  const devCases = await loadTargetCases(
    join(r3Dir, "development-cases-v1.json"),
  );

  const casesPath = join(holdoutDir, "cases-v1.json");
  const labelsPath = join(holdoutDir, "labels-v1.json");
  const evidencePath = join(holdoutDir, "evidence-v1.json");
  const reviewPath = join(holdoutDir, "review-final-v1.json");
  const authoringPath = join(holdoutDir, "authoring-attestation-v1.json");
  const freezePath = join(holdoutDir, "freeze-v1.json");

  const cases = await loadTargetCases(casesPath);
  const labels = await loadTargetLabels(labelsPath);
  const evidenceFile = await readJson<HoldoutEvidenceFile>(evidencePath);
  if (evidenceFile.version !== 1)
    throw new Error("Holdout evidence version");
  const evidenceById = new Map<string, DiagnosisEvidence>();
  for (const entry of evidenceFile.cases) {
    if (evidenceById.has(entry.id))
      throw new Error(`Duplicate holdout evidence: ${entry.id}`);
    evidenceById.set(
      entry.id,
      ControlledFixtureEvidenceSchema.parse(entry.evidence),
    );
  }
  validateHoldoutSet(index, cases, labels, evidenceById, devCases);

  const profiles = new Map(
    cases.map((item) => [
      item.id,
      buildStructuredRetrievalInput(evidenceById.get(item.id)!),
    ]),
  );

  const review = await readJson<{ verdict?: string }>(reviewPath);
  if (review.verdict !== "accepted")
    throw new Error("Final holdout review is not accepted");

  let freeze: HoldoutFreeze | null = null;
  try {
    freeze = await readJson<HoldoutFreeze>(freezePath);
  } catch (error) {
    if (requireFreeze)
      throw new Error(
        `Holdout is not frozen: ${(error as Error).message}`,
      );
  }
  if (freeze) {
    if (freeze.version !== 1 || freeze.status !== "frozen_before_run")
      throw new Error("Holdout freeze status");
    const checks: Array<[string, string, string]> = [
      ["config", freeze.config.hash, await sha256File(selectedConfigPath)],
      ["corpus", freeze.corpus.hash, frozen.corpusHash],
      ["protocol", freeze.protocol.hash, protocolHash],
      ["cases", freeze.holdout.cases.hash, await sha256File(casesPath)],
      ["labels", freeze.holdout.labels.hash, await sha256File(labelsPath)],
      ["evidence", freeze.holdout.evidence.hash, await sha256File(evidencePath)],
      ["review", freeze.holdout.review.hash, await sha256File(reviewPath)],
      [
        "authoring",
        freeze.holdout.authoring.hash,
        await sha256File(authoringPath),
      ],
    ];
    for (const [name, expected, actual] of checks)
      if (expected !== actual)
        throw new Error(`Holdout ${name} hash changed; create a new holdout`);
  }

  return {
    config,
    index,
    frozen,
    cases,
    labels,
    evidenceById,
    profiles,
    freeze,
    casesPath,
    labelsPath,
    evidencePath,
    reviewPath,
    authoringPath,
    freezePath,
  };
}

export async function freezeHoldout(dir: string): Promise<void> {
  const context = await loadHoldoutContext(false);
  const casesPath = join(dir, "cases-v1.json");
  const labelsPath = join(dir, "labels-v1.json");
  const evidencePath = join(dir, "evidence-v1.json");
  const reviewPath = join(dir, "review-final-v1.json");
  const authoringPath = join(dir, "authoring-attestation-v1.json");
  for (const path of [casesPath, labelsPath, evidencePath, reviewPath, authoringPath])
    await readFile(path);
  if (
    (await sha256File(casesPath)) !== (await sha256File(context.casesPath)) ||
    (await sha256File(labelsPath)) !== (await sha256File(context.labelsPath)) ||
    (await sha256File(evidencePath)) !==
      (await sha256File(context.evidencePath))
  )
    throw new Error("Holdout source files are not the validated artifacts");
  const review = await readJson<{ verdict?: string }>(reviewPath);
  if (review.verdict !== "accepted")
    throw new Error("Final holdout review is not accepted");
  const perCategory: Record<string, number> = {};
  for (const item of context.cases)
    perCategory[holdoutCategory(item.id)] =
      (perCategory[holdoutCategory(item.id)] ?? 0) + 1;
  const freeze: HoldoutFreeze = {
    version: 1,
    status: "frozen_before_run",
    frozenAt: new Date().toISOString(),
    config: { path: repoPath(selectedConfigPath), hash: await sha256File(selectedConfigPath) },
    corpus: { path: repoPath(join(r3Dir, "corpus-v1.json")), hash: context.frozen.corpusHash },
    protocol: {
      path: repoPath(join(r3Dir, "protocol.json")),
      hash: await sha256File(join(r3Dir, "protocol.json")),
    },
    holdout: {
      cases: {
        path: repoPath(casesPath),
        hash: await sha256File(casesPath),
        count: context.cases.length,
        answerable: context.cases.filter((item) => item.kind === "answerable")
          .length,
        noMatch: context.cases.filter((item) => item.kind === "no_match").length,
        perCategory,
      },
      labels: { path: repoPath(labelsPath), hash: await sha256File(labelsPath) },
      evidence: {
        path: repoPath(evidencePath),
        hash: await sha256File(evidencePath),
      },
      review: {
        path: repoPath(reviewPath),
        hash: await sha256File(reviewPath),
        verdict: review.verdict ?? "unknown",
      },
      authoring: {
        path: repoPath(authoringPath),
        hash: await sha256File(authoringPath),
      },
    },
    freezeRule:
      "Written before the single acceptance run. Any change to the config, corpus, protocol, cases, labels, evidence, or review invalidates the run.",
  };
  await writeFile(
    join(dir, "freeze-v1.json"),
    JSON.stringify(freeze, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(`frozen ${freeze.holdout.cases.count} cases`);
  console.log(freeze.holdout.cases.hash);
  console.log(freeze.holdout.labels.hash);
}

export async function prepareHoldout(outDir: string): Promise<void> {
  const context = await loadHoldoutContext(true);
  const config = {
    models: {
      reranker: {
        id: context.config.model.id,
        revision: context.config.model.revision,
        dtype: context.config.model.quantization,
      },
    },
    variants: ["original"],
    batchSize: context.config.model.batchSize,
    maxLength: context.config.model.maxLength,
  };
  const queries = context.cases.map((item) => {
    const profile = context.profiles.get(item.id)!;
    const eligible = [...eligibleRunbookSections(context.index, profile)].sort(
      (left, right) => left.citation.localeCompare(right.citation),
    );
    const passages: Record<string, string> = {};
    for (const section of eligible)
      passages[section.citation] = `${section.heading}\n${section.content}`;
    return {
      id: item.id,
      query: profile.query,
      candidates: eligible.map((section) => section.citation),
      passages: { original: passages },
    };
  });
  const payload = { config, queries };
  const inputHash = hash(payload);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "inference-original.json"),
    JSON.stringify({ inputHash, ...payload }, null, 2) + "\n",
    { flag: "wx" },
  );
  const perCategory: Record<string, number> = {};
  for (const item of context.cases)
    perCategory[holdoutCategory(item.id)] =
      (perCategory[holdoutCategory(item.id)] ?? 0) + 1;
  const manifest = {
    phase: "R3.5",
    generatedAt: new Date().toISOString(),
    selectedConfig: {
      path: repoPath(selectedConfigPath),
      hash: await sha256File(selectedConfigPath),
    },
    freeze: {
      path: repoPath(context.freezePath),
      hash: await sha256File(context.freezePath),
    },
    corpusHash: context.frozen.corpusHash,
    protocolHash: await sha256File(join(r3Dir, "protocol.json")),
    holdout: {
      cases: context.cases.length,
      answerable: context.cases.filter((item) => item.kind === "answerable")
        .length,
      noMatch: context.cases.filter((item) => item.kind === "no_match").length,
      perCategory,
      casesHash: await sha256File(context.casesPath),
      labelsHash: await sha256File(context.labelsPath),
      evidenceHash: await sha256File(context.evidencePath),
    },
    model: context.config.model,
    prompt: context.config.prompt,
    arms: context.config.arms,
    support: context.config.support,
    inputHash,
    candidates: queries.map((query) => ({
      id: query.id,
      candidates: query.candidates.length,
    })),
  };
  await writeFile(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(`${queries.length} queries`);
  console.log(inputHash);
}

type HoldoutRow = {
  id: string;
  kind: string;
  sufficient: boolean;
  eligibleAnswerable: boolean;
  available: boolean;
  sectionRecall: number | null;
  directPrecision: number;
  returned: string[];
  abstained?: boolean;
  supportReason?: string;
  facetsRequested?: string[];
  facetsCovered?: string[];
  missingFacets?: string[];
};

function holdoutFamilyResults(
  cases: readonly TargetCase[],
  candidateRows: readonly HoldoutRow[],
  keywordRows: readonly HoldoutRow[],
) {
  const byId = new Map(cases.map((item) => [item.id, item]));
  const candidateById = new Map(candidateRows.map((row) => [row.id, row]));
  const keywordById = new Map(keywordRows.map((row) => [row.id, row]));
  const results: Record<string, Record<string, unknown>> = {};
  for (const family of holdoutFamilies) {
    const familyCases = cases.filter(
      (item) => holdoutCategory(item.id) === family,
    );
    const candidates = familyCases.map((item) => candidateById.get(item.id)!);
    const keywords = familyCases.map((item) => keywordById.get(item.id)!);
    const answerable = candidates.filter((row) => row.kind === "answerable");
    const noMatch = candidates.filter((row) => row.kind === "no_match");
    results[family] = {
      scheduled: familyCases.length,
      answerable: answerable.length,
      noMatch: noMatch.length,
      hitAt3:
        answerable.length
          ? {
              numerator: answerable.filter((row) => row.sufficient).length,
              denominator: answerable.length,
              rate:
                answerable.filter((row) => row.sufficient).length /
                answerable.length,
            }
          : null,
      macroSectionRecallAt3: meanOf(
        answerable.map((row) => row.sectionRecall ?? 0),
      ),
      directPrecisionAt3: meanOf(
        answerable.map((row) => row.directPrecision),
      ),
      keywordDirectPrecisionAt3: meanOf(
        keywords
          .filter((row) => row.kind === "answerable")
          .map((row) => row.directPrecision),
      ),
      noMatchAbstention:
        noMatch.length
          ? {
              numerator: noMatch.filter(
                (row) => row.available && row.returned.length === 0,
              ).length,
              denominator: noMatch.length,
              rate:
                noMatch.filter(
                  (row) => row.available && row.returned.length === 0,
                ).length / noMatch.length,
            }
          : null,
      falseAbstention:
        answerable.length
          ? {
              numerator: answerable.filter(
                (row) => row.available && row.returned.length === 0,
              ).length,
              denominator: answerable.length,
              rate:
                answerable.filter(
                  (row) => row.available && row.returned.length === 0,
                ).length / answerable.length,
            }
          : null,
      misses: answerable
        .filter((row) => !row.sufficient)
        .map((row) => ({
          id: row.id,
          requiredFacets: byId.get(row.id)!.requiredFacets.map(
            (facet) => facet.facet,
          ),
          returned: row.returned,
          missingFacets: row.missingFacets ?? [],
        })),
      noMatchReturned: noMatch
        .filter((row) => row.returned.length > 0)
        .map((row) => ({ id: row.id, returned: row.returned })),
    };
  }
  return results;
}

export async function reportHoldout(runDir: string): Promise<void> {
  const context = await loadHoldoutContext(true);
  const inference = await readJson<{
    inputHash: string;
    queries: Array<{ id: string; candidates: string[] }>;
  }>(join(runDir, "inference-original.json"));
  const scores = await readJson<ProfileScores & {
    models?: { reranker?: { id?: string; revision?: string } };
  }>(join(runDir, "scores-original.json"));
  if (scores.inputHash !== inference.inputHash)
    throw new Error("Scores do not belong to this inference input");
  if (
    scores.models?.reranker?.id !== context.config.model.id ||
    scores.models?.reranker?.revision !== context.config.model.revision
  )
    throw new Error("Scores were produced by a different model");
  const runManifest = await readJson<{
    freeze?: { hash?: string };
    inputHash?: string;
  }>(join(runDir, "manifest.json"));
  if (runManifest.inputHash !== inference.inputHash)
    throw new Error("Run manifest does not match the inference input");
  if (runManifest.freeze?.hash !== (await sha256File(context.freezePath)))
    throw new Error("Run manifest does not match the frozen holdout");

  const candidateOutputs: TargetOutput[] = [];
  const keywordOutputs: TargetOutput[] = [];
  const candidateInfo = new Map<string, ArmInfo>();
  const keywordInfo = new Map<string, ArmInfo>();
  const candidateDetail = new Map<string, Record<string, unknown>>();

  for (const item of context.cases) {
    const profile = context.profiles.get(item.id)!;
    const record = scores.records[item.id]?.original;
    if (!record) throw new Error(`Missing holdout scores for ${item.id}`);
    const { candidates, routeExcluded } = routeCandidates(
      context.index,
      profile,
    );
    const candidateCitations = candidates.map(
      (section) => section.citation,
    );
    const packed = rankStructured(
      context.index,
      profile,
      record.logits,
      { minAnchorHits: context.config.support.minAnchorHits },
    );
    const returned = packed.matches.map((match) => match.citation);
    candidateOutputs.push({
      id: item.id,
      returned,
      latencyMs: record.rerankMs,
      candidates: candidateCitations,
      routeExcluded,
    });
    candidateInfo.set(item.id, {
      returned,
      candidates: candidateCitations,
      scored: candidateCitations,
      routeExcluded,
      scores: Object.fromEntries(
        packed.matches.map((match) => [match.citation, match.score]),
      ),
    });
    const missingFacets = item.requiredFacets
      .filter(
        (facet) =>
          !facet.accepted.some((citation) => returned.includes(citation)),
      )
      .map((facet) => facet.facet);
    candidateDetail.set(item.id, {
      route: {
        hints: packed.route.hints,
        confident: packed.route.confident,
        reasons: packed.route.reasons,
      },
      support: {
        minAnchorHits: context.config.support.minAnchorHits,
        reason: packed.supportReason,
        abstained: packed.abstained,
        anchors: profile.anchors ?? [],
        matchedAnchors: packed.matchedAnchors,
      },
      facetsRequested: packed.facetsRequested,
      facetsCovered: packed.facetsCovered,
      missingFacets,
      missingAccepted: item.requiredFacets
        .filter((facet) => missingFacets.includes(facet.facet))
        .flatMap((facet) => facet.accepted),
    });

    const started = performance.now();
    const keywordScored = scoredRunbookSections(context.index, item.input);
    const keywordLatency = performance.now() - started;
    const keywordReturned = keywordScored
      .slice(0, item.input.limit ?? 3)
      .map((entry) => entry.section.citation);
    const keywordCandidates = eligibleRunbookSections(
      context.index,
      item.input,
    ).map((section) => section.citation);
    keywordOutputs.push({
      id: item.id,
      returned: keywordReturned,
      latencyMs: keywordLatency,
      candidates: keywordCandidates,
      routeExcluded: [],
    });
    keywordInfo.set(item.id, {
      returned: keywordReturned,
      candidates: keywordCandidates,
      scored: keywordScored.map((entry) => entry.section.citation),
      routeExcluded: [],
      scores: Object.fromEntries(
        keywordScored.map((entry) => [entry.section.citation, entry.score]),
      ),
    });
  }

  const candidateArm = buildTargetArm(
    context.index,
    context.cases,
    "structured",
    candidateOutputs,
    candidateInfo,
    (id) => candidateDetail.get(id) ?? {},
  );
  const keywordArm = buildTargetArm(
    context.index,
    context.cases,
    "keyword",
    keywordOutputs,
    keywordInfo,
  );
  const baseline = await readJson<{
    arms: {
      keyword: {
        metrics: { directPrecisionAt3?: number | null };
      };
    };
  }>(baselineReportPath);
  const baselinePrecision = baseline.arms.keyword.metrics.directPrecisionAt3;
  if (baselinePrecision === null || baselinePrecision === undefined)
    throw new Error("Frozen baseline precision is missing");

  const metrics = {
    sufficientGuidanceHitAt3:
      candidateArm.metrics.sufficientGuidanceHitAt3,
    macroSectionRecallAt3: candidateArm.metrics.macroSectionRecallAt3,
    noMatchAbstention: candidateArm.noMatchAbstention.rate,
    falseAbstention: candidateArm.falseAbstention.rate,
    directPrecisionAt3: candidateArm.metrics.directPrecisionAt3,
    routeCoverage: candidateArm.metrics.routeCoverage,
    reliability: candidateArm.reliability.rate,
    p95LatencyMs: candidateArm.p95LatencyMs ?? null,
    safetyViolations: 0,
  };
  const thresholds: HoldoutGateThresholds = {
    hitAt3: context.config.releaseGate.sufficientGuidanceHitAt3,
    macroSectionRecallAt3:
      context.config.releaseGate.macroSectionRecallAt3,
    noMatchAbstention: context.config.releaseGate.noMatchAbstention,
    falseAbstentionMax: context.config.releaseGate.falseAbstentionMax,
    directPrecisionMin: baselinePrecision,
    routeCoverage: HOLD_OUT_GATE_THRESHOLDS.routeCoverage,
    reliability: context.config.releaseGate.reliability,
    p95LatencyMs: context.config.releaseGate.p95LatencyMs,
    safetyViolationsMax: context.config.releaseGate.safetyViolationsMax,
  };
  const gate = evaluateHoldoutGate(metrics, thresholds);
  const perFamily = holdoutFamilyResults(
    context.cases,
    candidateArm.rows as HoldoutRow[],
    keywordArm.rows as HoldoutRow[],
  );
  const report = {
    phase: "R3.5",
    run: basename(runDir),
    generatedAt: new Date().toISOString(),
    status: gate.status,
    selectedConfig: {
      path: repoPath(selectedConfigPath),
      hash: await sha256File(selectedConfigPath),
    },
    freeze: {
      path: repoPath(context.freezePath),
      hash: await sha256File(context.freezePath),
    },
    corpusHash: context.frozen.corpusHash,
    protocolHash: await sha256File(join(r3Dir, "protocol.json")),
    holdout: {
      cases: context.cases.length,
      answerable: context.cases.filter((item) => item.kind === "answerable")
        .length,
      noMatch: context.cases.filter((item) => item.kind === "no_match").length,
      casesHash: await sha256File(context.casesPath),
      labelsHash: await sha256File(context.labelsPath),
      evidenceHash: await sha256File(context.evidencePath),
    },
    model: context.config.model,
    prompt: context.config.prompt,
    inputHash: inference.inputHash,
    scoresHash: await sha256File(join(runDir, "scores-original.json")),
    baseline: {
      run: "baseline-20261019-v1",
      directPrecisionAt3: baselinePrecision,
      holdoutKeywordDirectPrecisionAt3:
        keywordArm.metrics.directPrecisionAt3,
    },
    gate: { ...gate, thresholds },
    metrics,
    denominators: {
      scheduled: context.cases.length,
      answerable: candidateArm.counts.eligibleAnswerable,
      noMatch: candidateArm.counts.noMatch,
      reliable: candidateArm.reliability.numerator,
      sufficientGuidanceHits:
        candidateArm.metrics.sufficientGuidanceHitAt3 === null
          ? 0
          : Math.round(
              candidateArm.metrics.sufficientGuidanceHitAt3 *
                candidateArm.counts.eligibleAnswerable,
            ),
      noMatchAbstentions: candidateArm.noMatchAbstention.numerator,
      falseAbstentions: candidateArm.falseAbstention.numerator,
    },
    perFamily,
    arms: {
      keyword: keywordArm,
      [context.config.arms.candidate]: candidateArm,
    },
    notes: {
      metric:
        "sufficientGuidanceHit@3 requires every reviewed facet to have an accepted citation in the returned three",
      latency:
        "per-case latencyMs is offline batch scoring time (rerankMs) over the frozen candidate set, not warm service latency",
      safety:
        "retrieval returns corpus sections only; unknown or ineligible citations fail the scorer. No repair or replay text is generated in this run.",
      noTuning:
        "this is the single frozen-candidate run; the holdout and config were not changed after seeing these numbers",
    },
  };
  await writeFile(
    join(runDir, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(
    `${context.config.arms.candidate}: hit@3=${metrics.sufficientGuidanceHitAt3} ` +
      `recall=${metrics.macroSectionRecallAt3} ` +
      `precision=${metrics.directPrecisionAt3} ` +
      `abstention=${metrics.noMatchAbstention} ` +
      `falseAbstention=${metrics.falseAbstention} ` +
      `routeCoverage=${metrics.routeCoverage} ` +
      `p95=${metrics.p95LatencyMs}ms`,
  );
  console.log(`holdoutGate=${gate.status}`);
  if (gate.failing.length) console.log(`failing=${gate.failing.join(",")}`);
}

// ---- reporting -------------------------------------------------------------

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

const headingOf = (citation: string) => citation.slice(citation.indexOf("#") + 1);
const facetOf = (citation: string) => facetByHeading[headingOf(citation)] ?? "other";

type ArmInfo = {
  returned: string[];
  candidates: string[];
  scored: string[];
  routeExcluded: string[];
  scores: Record<string, number>;
};

type LedgerEntry = { id: string; bucket: string | null };

function ledgerBucket(
  item: TargetCase,
  arm: "keyword" | "minilm-original" | "structured",
  info: ArmInfo,
  eligibleAnswerable: boolean,
  sufficient: boolean,
): LedgerEntry {
  if (item.kind === "no_match")
    return { id: item.id, bucket: info.returned.length ? "cutoff_rejection" : null };
  if (!eligibleAnswerable)
    return { id: item.id, bucket: "no_suitable_corpus_guidance" };
  if (sufficient) return { id: item.id, bucket: null };

  const returned = new Set(info.returned);
  const candidates = new Set(info.candidates);
  const scored = new Set(info.scored);
  const routeExcluded = new Set(info.routeExcluded);
  const causes: string[] = [];
  for (const facet of item.requiredFacets) {
    if (facet.accepted.some((citation) => returned.has(citation))) continue;
    if (!facet.accepted.some((citation) => candidates.has(citation)))
      causes.push("candidate_omission");
    else if (facet.accepted.some((citation) => routeExcluded.has(citation)))
      causes.push("route_exclusion");
    else if (!facet.accepted.some((citation) => scored.has(citation)))
      causes.push(arm === "keyword" ? "query_observation" : "cutoff_rejection");
    else causes.push("rank");
  }
  for (const cause of ["candidate_omission", "route_exclusion", "cutoff_rejection", "query_observation"])
    if (causes.includes(cause)) return { id: item.id, bucket: cause };

  const facets = info.returned.map(facetOf);
  const collision = facets.some(
    (facet, position) => facets.indexOf(facet) !== position,
  );
  return { id: item.id, bucket: collision ? "facet_packing" : "wrong_rank" };
}

function buildTargetArm(
  index: RunbookIndex,
  cases: readonly TargetCase[],
  arm: "keyword" | "minilm-original" | "structured",
  outputs: TargetOutput[],
  info: Map<string, ArmInfo>,
  decorate?: (id: string) => Record<string, unknown>,
) {
  const latencyById = new Map(
    outputs.map((output) => [
      output.id,
      "latencyMs" in output ? output.latencyMs : 0,
    ]),
  );
  const scored = scoreTarget(index, cases, outputs);
  const rowById = new Map(scored.rows.map((row) => [row.id, row]));
  const ledger = cases.map((item) =>
    ledgerBucket(
      item,
      arm,
      info.get(item.id)!,
      rowById.get(item.id)!.eligibleAnswerable,
      rowById.get(item.id)!.sufficient,
    ),
  );
  const ledgerSummary: Record<string, number> = {};
  for (const entry of ledger)
    if (entry.bucket)
      ledgerSummary[entry.bucket] = (ledgerSummary[entry.bucket] ?? 0) + 1;
  return {
    ...scored,
    rows: scored.rows.map((row) => {
      const detail = info.get(row.id)!;
      const single = cases.find((item) => item.id === row.id)!;
      return {
        id: row.id,
        kind: row.kind,
        requiredFacets: single.requiredFacets.map((facet) => facet.facet),
        returned: row.returned,
        scores: detail.scores,
        candidates: detail.candidates.length,
        routeExcluded: detail.routeExcluded,
        latencyMs: latencyById.get(row.id) ?? 0,
        sufficient: row.sufficient,
        eligibleAnswerable: row.eligibleAnswerable,
        providerExcluded: row.providerExcluded,
        available: row.available,
        sectionRecall: row.sectionRecall,
        directPrecision: row.directPrecision,
        ...(decorate?.(row.id) ?? {}),
      };
    }),
    ledger,
    ledgerSummary,
  };
}

export async function reportTargetRun(runDir: string): Promise<void> {
  const index = await loadRuntimeIndex();
  const cases = await loadTargetCases(join(r3Dir, "development-cases-v1.json"));
  const frozen = await loadFrozenCorpus(join(r3Dir, "corpus-v1.json"));
  const labels = await loadTargetLabels(join(r3Dir, "development-labels-v1.json"));
  const inference = JSON.parse(
    await readFile(join(runDir, "inference-original.json"), "utf8"),
  ) as { inputHash: string; queries: Array<{ id: string; candidates: string[] }> };
  const scores = JSON.parse(
    await readFile(join(runDir, "scores-original.json"), "utf8"),
  ) as { records: Record<string, { original: { logits: Record<string, number>; rerankMs: number } }> };

  const keywordOutputs: TargetOutput[] = [];
  const minilmOutputs: TargetOutput[] = [];
  const keywordInfo = new Map<string, ArmInfo>();
  const minilmInfo = new Map<string, ArmInfo>();

  cases.forEach((item, position) => {
    const candidates = inference.queries[position]!.candidates;
    const started = performance.now();
    const keywordScored = scoredRunbookSections(index, item.input);
    const keywordLatency = performance.now() - started;
    const keywordReturned = keywordScored
      .slice(0, item.input.limit ?? 3)
      .map((entry) => entry.section.citation);
    keywordOutputs.push({
      id: item.id,
      returned: keywordReturned,
      latencyMs: keywordLatency,
      candidates,
      routeExcluded: [],
    });
    keywordInfo.set(item.id, {
      returned: keywordReturned,
      candidates,
      scored: keywordScored.map((entry) => entry.section.citation),
      routeExcluded: [],
      scores: Object.fromEntries(
        keywordScored.map((entry) => [entry.section.citation, entry.score]),
      ),
    });

    const record = scores.records[item.id]?.original;
    if (!record) throw new Error(`Missing scores for ${item.id}`);
    const entries = Object.entries(record.logits).map(([citation, logit]) => ({
      citation,
      score: 1 / (1 + Math.exp(-logit)),
    }));
    const surfaced = entries
      .filter((entry) => entry.score >= 0.001)
      .sort((a, b) => b.score - a.score || a.citation.localeCompare(b.citation));
    const minilmReturned = surfaced.slice(0, 3).map((entry) => entry.citation);
    minilmOutputs.push({
      id: item.id,
      returned: minilmReturned,
      latencyMs: record.rerankMs,
      candidates: entries.map((entry) => entry.citation),
      routeExcluded: [],
    });
    minilmInfo.set(item.id, {
      returned: minilmReturned,
      candidates: entries.map((entry) => entry.citation),
      scored: surfaced.map((entry) => entry.citation),
      routeExcluded: [],
      scores: Object.fromEntries(entries.map((entry) => [entry.citation, entry.score])),
    });
  });

  const buildArm = (
    arm: "keyword" | "minilm-original",
    outputs: TargetOutput[],
    info: Map<string, ArmInfo>,
  ) => buildTargetArm(index, cases, arm, outputs, info);

  const report = {
    run: runDir.split(/[\\/]/).pop(),
    generatedAt: new Date().toISOString(),
    corpusHash: frozen.corpusHash,
    labelHash: targetLabelHash(labels),
    protocolHash: await sha256File(join(r3Dir, "protocol.json")),
    inputHash: inference.inputHash,
    configHash: sha256(inference),
    notes: {
      metric: "sufficientGuidanceHitAt3 requires every reviewed facet covered in the top three",
      minilmLatency:
        "per-case latencyMs is offline batch scoring time (rerankMs) over the frozen candidate set, not warm service latency",
    },
    arms: {
      keyword: buildArm("keyword", keywordOutputs, keywordInfo),
      "minilm-original": buildArm("minilm-original", minilmOutputs, minilmInfo),
    },
  };
  await writeFile(
    join(runDir, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  for (const [arm, value] of Object.entries(report.arms)) {
    console.log(
      `${arm}: hit@3=${value.metrics.sufficientGuidanceHitAt3} ` +
        `recall=${value.metrics.macroSectionRecallAt3} ` +
        `precision=${value.metrics.directPrecisionAt3} ` +
        `abstention=${value.noMatchAbstention.rate} ` +
        `falseAbstention=${value.falseAbstention.rate} ` +
        `p95=${value.p95LatencyMs}ms`,
    );
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      "freeze-corpus": { type: "string" },
      "prepare-benchmark": { type: "boolean" },
      "prepare-baseline": { type: "string" },
      "prepare-profile": { type: "string" },
      "report-profile": { type: "string" },
      "report-facets": { type: "string" },
      "report-support": { type: "string" },
      "freeze-holdout": { type: "string" },
      "prepare-holdout": { type: "string" },
      "report-holdout": { type: "string" },
      "scores-run": { type: "string" },
      "route-run": { type: "string" },
      report: { type: "string" },
    },
    strict: true,
  });
  if (values["freeze-corpus"]) {
    const { corpusHash: hashValue, sections } = await freezeTargetCorpus(
      resolve(values["freeze-corpus"]),
    );
    console.log(`${sections} sections`);
    console.log(hashValue);
    return;
  }
  if (values["prepare-benchmark"]) return prepareBenchmark();
  if (values["prepare-baseline"])
    return prepareBaseline(resolve(values["prepare-baseline"]));
  if (values["prepare-profile"])
    return prepareProfile(resolve(values["prepare-profile"]));
  if (values["report-profile"])
    return reportProfile(
      resolve(values["report-profile"]),
      resolve(
        values["route-run"] ??
          join(r3Dir, "runs", "profile-route-20261019-v1"),
      ),
    );
  if (values["report-facets"])
    return reportFacets(
      resolve(values["report-facets"]),
      resolve(
        values["scores-run"] ??
          join(r3Dir, "runs", "profile-global-20261019-v1"),
      ),
      resolve(
        values["route-run"] ?? join(r3Dir, "runs", "profile-route-20261019-v1"),
      ),
    );
  if (values["report-support"])
    return reportSupport(
      resolve(values["report-support"]),
      resolve(
        values["scores-run"] ??
          join(r3Dir, "runs", "profile-global-20261019-v1"),
      ),
      resolve(
        values["route-run"] ?? join(r3Dir, "runs", "profile-route-20261019-v1"),
      ),
    );
  if (values["freeze-holdout"])
    return freezeHoldout(resolve(values["freeze-holdout"]));
  if (values["prepare-holdout"])
    return prepareHoldout(resolve(values["prepare-holdout"]));
  if (values["report-holdout"])
    return reportHoldout(resolve(values["report-holdout"]));
  if (values.report) return reportTargetRun(resolve(values.report));
  throw new Error(
    "Usage: --freeze-corpus <path> | --prepare-benchmark | --prepare-baseline <dir> | --prepare-profile <dir> | --report-profile <dir> [--route-run <dir>] | --report-facets <dir> [--scores-run <dir>] [--route-run <dir>] | --report-support <dir> [--scores-run <dir>] [--route-run <dir>] | --freeze-holdout <dir> | --prepare-holdout <dir> | --report-holdout <dir> | --report <dir>",
  );
}

if (import.meta.main) await main();
