// Independent reviewer audit for R4.1 sealed holdout / R4.4 sign-off.
// Read-only: loads cases, labels, evidence, and the frozen corpus; runs only the
// label-side profile helpers that the scored driver uses. No reranker, no
// retrieval score, no candidate output.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ControlledFixtureEvidenceSchema } from "../../../src/contracts.ts";
import {
  loadTargetCases,
  loadTargetLabelsV2,
  loadFrozenCorpus,
  type TargetCase,
} from "../../../src/evaluation/retrieval-target.ts";
import { buildStructuredRetrievalInput } from "../../../src/tools/retrieval-profile.ts";
import {
  eligibleRunbookSections,
  loadRunbooks,
} from "../../../src/tools/search-runbooks.ts";
import { routeCandidates } from "../../../src/tools/structured-ranking.ts";

const repo = join(import.meta.dir, "..", "..", "..", "..", "..");
const r4 = join(repo, "apps/ai_agent/evaluation/r4");
const holdoutDir = join(r4, "holdout");

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const seal = JSON.parse(await readFile(join(holdoutDir, "seal.json"), "utf8"));
const sealProblems: string[] = [];
for (const [key, entry] of Object.entries<{ path: string; hash: string; bytes: number }>(seal.files)) {
  const bytes = await readFile(join(repo, entry.path));
  if (sha(bytes) !== entry.hash) sealProblems.push(`${key}: hash mismatch`);
  if (bytes.byteLength !== entry.bytes) sealProblems.push(`${key}: byte length mismatch`);
}
const sealBytes = await readFile(join(holdoutDir, "seal.json"));
const protocol = JSON.parse(await readFile(join(r4, "protocol.json"), "utf8"));
if (sha(sealBytes) !== protocol.holdoutSeal.hash) sealProblems.push("protocol holdoutSeal.hash mismatch");
// protocol.corpus.corpusHash is the canonical sections hash, not the raw file hash.

const index = await loadRunbooks(join(repo, "docs/AI/runbooks"));
const frozen = await loadFrozenCorpus(join(repo, "apps/ai_agent/evaluation/r3/corpus-v1.json"));
if (frozen.corpusHash !== protocol.corpus.corpusHash) sealProblems.push("frozen corpus hash differs from protocol");

const [cases, labels, evidenceRaw, devCases, devEvidenceRaw] = await Promise.all([
  loadTargetCases(join(holdoutDir, "cases-v1.json")),
  loadTargetLabelsV2(join(holdoutDir, "labels-v2.json")),
  readFile(join(holdoutDir, "evidence-v1.json"), "utf8"),
  loadTargetCases(join(r4, "development-cases-v1.json")),
  readFile(join(r4, "development-evidence-v1.json"), "utf8"),
]);
const parseEvidence = (raw: string) =>
  new Map(
    (JSON.parse(raw) as { cases: Array<{ id: string; evidence: unknown }> }).cases.map(
      (entry) => [entry.id, ControlledFixtureEvidenceSchema.parse(entry.evidence)],
    ),
  );
const evidence = parseEvidence(evidenceRaw);
const devEvidence = parseEvidence(devEvidenceRaw);
const labelById = new Map(labels.cases.map((entry) => [entry.id, entry]));

const familyOf = (id: string) => /^f(0[1-9]|10)-/.exec(id)?.[1] ? `F${/^f(0[1-9]|10)-/.exec(id)![1]}` : "no-match";
const bucketOf = (id: string) =>
  /^nm-(missing-guidance|missing-runtime-fact|out-of-scope|adversarial)-/.exec(id)?.[1] ?? null;
const tokens = (text: string) =>
  new Set(text.toLowerCase().replace(/[^a-z0-9._-]+/g, " ").split(/\s+/).filter((t) => t.length > 2));

type Row = {
  id: string;
  family: string;
  kind: TargetCase["kind"];
  bucket: string | null;
  facets: string[];
  requested: string[];
  missingFacets: string[];
  accepted: number;
  maxAccepted: number;
  ineligibleFacets: string[];
  unroutedAccepted: string[];
  routeHints: string[];
  routeConfident: boolean;
  eligible: number;
  routed: number;
  anchors: number;
  profileQuery: string;
  queryOverlap: number;
  labelIssues: string[];
};

const rows: Row[] = cases.map((item) => {
  const label = labelById.get(item.id);
  if (!label) throw new Error(`missing label ${item.id}`);
  const ev = evidence.get(item.id);
  if (!ev) throw new Error(`missing evidence ${item.id}`);
  const profile = buildStructuredRetrievalInput(ev);
  const eligible = eligibleRunbookSections(index, profile).map((s) => s.citation);
  const routed = routeCandidates(index, profile).candidates.map((s) => s.citation);
  const requested = [...(profile.requestedFacets ?? [])];
  const facets = label.requiredFacets.map((facet) => facet.facet);
  const ineligibleFacets = label.requiredFacets
    .filter((facet) => !facet.accepted.some((citation) => eligible.includes(citation)))
    .map((facet) => facet.facet);
  const unroutedAccepted = label.requiredFacets
    .flatMap((facet) => facet.accepted)
    .filter((citation) => eligible.includes(citation) && !routed.includes(citation));
  const missingFacets = facets.filter((facet) => !requested.includes(facet));
  const pTokens = tokens(profile.query);
  const aTokens = tokens(item.input.query);
  const shared = [...pTokens].filter((token) => aTokens.has(token)).length;
  const queryOverlap = shared / Math.max(1, Math.min(pTokens.size, aTokens.size));

  const labelIssues: string[] = [];
  if (item.kind === "answerable") {
    for (const facet of ineligibleFacets)
      labelIssues.push(`facet ${facet} has no eligible accepted citation`);
    for (const facet of missingFacets)
      labelIssues.push(`facet ${facet} is not requested by the runtime profile`);
    for (const citation of unroutedAccepted)
      labelIssues.push(`accepted ${citation} is not routed`);
    if (!label.requiredFacets.length) labelIssues.push("answerable case has no required facets");
  } else if (item.kind === "no_match") {
    if (profile.route?.hints.length) labelIssues.push(`no-match has route hints ${profile.route.hints}`);
    if (profile.route?.confident) labelIssues.push("no-match has a confident route");
    if (label.requiredFacets.length) labelIssues.push("no-match carries required facets");
    if (!label.noMatchRationale) labelIssues.push("no-match has no rationale");
  }

  return {
    id: item.id,
    family: familyOf(item.id),
    kind: item.kind,
    bucket: bucketOf(item.id),
    facets,
    requested,
    missingFacets,
    accepted: label.requiredFacets.flatMap((facet) => facet.accepted).length,
    maxAccepted: Math.max(...label.requiredFacets.map((facet) => facet.accepted.length), 0),
    ineligibleFacets,
    unroutedAccepted,
    routeHints: profile.route?.hints ?? [],
    routeConfident: Boolean(profile.route?.confident),
    eligible: eligible.length,
    routed: routed.length,
    anchors: profile.anchors?.length ?? 0,
    profileQuery: profile.query,
    queryOverlap,
    labelIssues,
  };
});

const answerable = rows.filter((row) => row.kind === "answerable");
const noMatch = rows.filter((row) => row.kind === "no_match");



const fingerprint = (item: TargetCase) =>
  sha(
    Buffer.from(
      JSON.stringify({
        input: item.input,
        requiredFacets: item.requiredFacets,
        supporting: item.supporting,
        missingRuntimeFacts: item.missingRuntimeFacts,
      }),
    ),
  );
const fpCount = new Map<string, string[]>();
for (const item of [...devCases, ...cases]) {
  const key = fingerprint(item);
  fpCount.set(key, [...(fpCount.get(key) ?? []), item.id]);
}
const duplicateFingerprints = [...fpCount.values()].filter((ids) => ids.length > 1);

const jaccard = (a: Set<string>, b: Set<string>) => {
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / Math.max(1, new Set([...a, ...b]).size);
};
const devProfiles = devCases.map((item) => {
  const ev = devEvidence.get(item.id);
  if (!ev) throw new Error(`missing dev evidence ${item.id}`);
  return { id: item.id, profile: buildStructuredRetrievalInput(ev) };
});
const nearAcross: Array<{ a: string; b: string; score: number }> = [];
for (const holdout of rows) {
  const hTokens = tokens(holdout.profileQuery);
  for (const dev of devProfiles) {
    const score = jaccard(hTokens, tokens(dev.profile.query));
    if (score >= 0.85)
      nearAcross.push({ a: holdout.id, b: dev.id, score: Number(score.toFixed(3)) });
  }
}
const nearWithin: Array<{ a: string; b: string; score: number }> = [];
for (let i = 0; i < rows.length; i += 1)
  for (let j = i + 1; j < rows.length; j += 1) {
    const score = jaccard(tokens(rows[i]!.profileQuery), tokens(rows[j]!.profileQuery));
    if (score >= 0.85)
      nearWithin.push({ a: rows[i]!.id, b: rows[j]!.id, score: Number(score.toFixed(3)) });
  }

const group = <T>(items: T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[key(item)] = (acc[key(item)] ?? 0) + 1;
    return acc;
  }, {});

const report = {
  seal: { problems: sealProblems, verified: sealProblems.length === 0 },
  counts: {
    cases: cases.length,
    answerable: answerable.length,
    noMatch: noMatch.length,
    families: group(answerable, (row) => row.family),
    buckets: group(noMatch, (row) => row.bucket ?? "?"),
  },
  labels: {
    facetHistogram: group(rows, (row) => row.facets.join("+") || "(none)"),
    acceptedPerCase: group(rows, (row) => String(row.accepted)),
    maxAcceptedPerFacet: Math.max(...rows.map((row) => row.maxAccepted)),
    casesWithLabelIssues: rows
      .filter((row) => row.labelIssues.length > 0)
      .map((row) => ({ id: row.id, kind: row.kind, issues: row.labelIssues })),
    answerableAllEligible: answerable.filter((row) => row.ineligibleFacets.length === 0).length,
    answerableAllFacetsRequested: answerable.filter((row) => row.missingFacets.length === 0).length,
    answerableAllAcceptedRouted: answerable.filter((row) => row.unroutedAccepted.length === 0).length,
    noMatchConfidentRoutes: noMatch.filter((row) => row.routeConfident).map((row) => row.id),
    noMatchWithEligibleSections: noMatch.filter((row) => row.eligible > 0).length,
  },
  duplicates: {
    exact: duplicateFingerprints,
    nearAcrossSplits: nearAcross.slice(0, 20),
    nearWithinHoldout: nearWithin.slice(0, 20),
  },
  queryCoherenceBelow50: rows
    .filter((row) => row.queryOverlap < 0.5)
    .map((row) => ({ id: row.id, overlap: Number(row.queryOverlap.toFixed(2)) })),
  perCase: rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    facets: row.facets,
    requested: row.requested,
    accepted: row.accepted,
    eligible: row.eligible,
    routed: row.routed,
    anchors: row.anchors,
    route: row.routeHints.join(",") || null,
    issues: row.labelIssues,
  })),
};
console.log(JSON.stringify(report, null, 2));
