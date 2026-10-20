// R3 CLI: freeze the serving corpus, prepare the reviewed benchmark, capture
// the baseline inference input, and report each arm's metrics and failures.
// Every run directory is immutable; a changed label or corpus needs a new run.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { defaultRunbookDirectory } from "../paths.ts";
import type { DiagnosisEvidence } from "../contracts.ts";
import {
  eligibleRunbookSections,
  loadRunbooks,
  scoredRunbookSections,
  type RunbookIndex,
} from "../tools/search-runbooks.ts";
import { buildStructuredRetrievalInput } from "../tools/retrieval-profile.ts";
import { rankRouteOnly } from "../tools/structured-ranking.ts";
import { hash } from "./retrieval-r21.ts";
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
  arm: "keyword" | "minilm-original",
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
  ) => {
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
        };
      }),
      ledger,
      ledgerSummary,
    };
  };

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
  if (values.report) return reportTargetRun(resolve(values.report));
  throw new Error(
    "Usage: --freeze-corpus <path> | --prepare-benchmark | --prepare-baseline <dir> | --prepare-profile <dir> | --report-profile <dir> [--route-run <dir>] | --report <dir>",
  );
}

if (import.meta.main) await main();
