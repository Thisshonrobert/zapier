// R4.1 holdout audit.
//
// This is an automated, rule-based second pass plus a full structural review.
// It is deliberately NOT presented as an independent human review: the plan
// requires a human second reviewer, and that sign-off remains outstanding.
//
// Run:
//   bun run apps/ai_agent/evaluation/r4/authoring/audit-holdout.ts
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  loadTargetCases,
  loadTargetLabelsV2,
  rationaleLines,
  type TargetCase,
} from "../../../src/evaluation/retrieval-target.ts";
import {
  eligibleRunbookSections,
  loadRunbooks,
  type RunbookIndex,
} from "../../../src/tools/search-runbooks.ts";

const r4 = join(import.meta.dir, "..");
const holdoutDir = join(r4, "holdout");
const runbooksDir = join(import.meta.dir, "../../../../../docs/AI/runbooks");
const corpusPath = join(import.meta.dir, "../../r3/corpus-v1.json");

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

const buckets = [
  "missing-guidance",
  "missing-runtime-fact",
  "out-of-scope",
  "adversarial",
] as const;

const familyOf = (id: string): (typeof families)[number] | null => {
  const match = /^f(0[1-9]|10)-/.exec(id);
  return match ? (`F${match[1]}` as (typeof families)[number]) : null;
};

const bucketOf = (id: string): string | null =>
  /^nm-(missing-guidance|missing-runtime-fact|out-of-scope|adversarial)-/.exec(
    id,
  )?.[1] ?? null;

const eligibleSet = (index: RunbookIndex, item: TargetCase): Set<string> =>
  new Set(
    eligibleRunbookSections(index, item.input).map((section) => section.citation),
  );

const sufficient = (index: RunbookIndex, item: TargetCase): boolean => {
  if (item.kind !== "answerable") return false;
  if (!item.requiredFacets.length) return false;
  const eligible = eligibleSet(index, item);
  return item.requiredFacets.every((facet) =>
    facet.accepted.some((citation) => eligible.has(citation)),
  );
};

const kappa = (pairs: Array<{ author: boolean; second: boolean }>) => {
  const n = pairs.length;
  const bothTrue = pairs.filter((pair) => pair.author && pair.second).length;
  const bothFalse = pairs.filter((pair) => !pair.author && !pair.second).length;
  const authorOnly = pairs.filter((pair) => pair.author && !pair.second).length;
  const secondOnly = pairs.filter((pair) => !pair.author && pair.second).length;
  const observed = (bothTrue + bothFalse) / n;
  const authorTrue = (bothTrue + authorOnly) / n;
  const secondTrue = (bothTrue + secondOnly) / n;
  const expected =
    authorTrue * secondTrue + (1 - authorTrue) * (1 - secondTrue);
  return {
    n,
    observedAgreement: observed,
    expectedAgreement: expected,
    kappa: expected === 1 ? 1 : (observed - expected) / (1 - expected),
    confusion: { bothTrue, bothFalse, authorOnly, secondOnly },
  };
};

const cases = await loadTargetCases(join(holdoutDir, "cases-v1.json"));
const labels = await loadTargetLabelsV2(join(holdoutDir, "labels-v2.json"));
const evidence = JSON.parse(
  await readFile(join(holdoutDir, "evidence-v1.json"), "utf8"),
) as { cases: Array<{ id: string }> };
const index = await loadRunbooks(runbooksDir);
const frozen = JSON.parse(await readFile(corpusPath, "utf8")) as {
  sections: Array<{ citation: string }>;
};
const known = new Set(index.map((section) => section.citation));
const corpus = new Set(frozen.sections.map((section) => section.citation));
const labelById = new Map(labels.cases.map((item) => [item.id, item]));

// Stratified 20% sample: two answerable per family plus three per no-match
// bucket (20 + 12 = 32 of 160).
const sample = [
  ...families.flatMap((family) =>
    cases
      .filter((item) => item.kind === "answerable" && familyOf(item.id) === family)
      .slice(0, 2),
  ),
  ...buckets.flatMap((bucket) =>
    cases
      .filter((item) => item.kind === "no_match" && bucketOf(item.id) === bucket)
      .slice(0, 3),
  ),
];
if (sample.length !== 32) throw new Error(`sample must be 32, got ${sample.length}`);

const pairs = sample.map((item) => ({
  id: item.id,
  author: item.kind === "answerable",
  second: sufficient(index, item),
}));
const agreement = kappa(pairs);

// Full 160-case structural review.
const defects: string[] = [];
const caseIds = new Set(cases.map((item) => item.id));
const labelIds = new Set(labels.cases.map((item) => item.id));
const evidenceIds = new Set(evidence.cases.map((item) => item.id));
if (caseIds.size !== cases.length) defects.push("duplicate case id");
if (labelIds.size !== labels.cases.length) defects.push("duplicate label id");
if (evidenceIds.size !== evidence.cases.length) defects.push("duplicate evidence id");
for (const id of caseIds) {
  if (!labelIds.has(id)) defects.push(`${id}: missing label`);
  if (!evidenceIds.has(id)) defects.push(`${id}: missing evidence`);
}
for (const id of labelIds) if (!caseIds.has(id)) defects.push(`${id}: orphan label`);
for (const id of evidenceIds) if (!caseIds.has(id)) defects.push(`${id}: orphan evidence`);

for (const item of cases) {
  const label = labelById.get(item.id);
  if (!label) continue;
  if (item.requiredFacets.length > 3) defects.push(`${item.id}: more than 3 facets`);
  if (label.requiredFacets.length !== item.requiredFacets.length)
    defects.push(`${item.id}: label/case facet count mismatch`);
  for (const facet of item.requiredFacets) {
    if (facet.accepted.length < 1 || facet.accepted.length > 4)
      defects.push(`${item.id}: accepted count ${facet.accepted.length}`);
    if (new Set(facet.accepted).size !== facet.accepted.length)
      defects.push(`${item.id}: duplicate accepted citation`);
    for (const citation of facet.accepted) {
      if (!known.has(citation)) defects.push(`${item.id}: unknown ${citation}`);
      if (!corpus.has(citation)) defects.push(`${item.id}: not frozen ${citation}`);
    }
  }
  for (const citation of item.supporting) {
    if (!known.has(citation)) defects.push(`${item.id}: unknown supporting ${citation}`);
    if (item.requiredFacets.some((facet) => facet.accepted.includes(citation)))
      defects.push(`${item.id}: supporting is also accepted`);
  }
  for (const facet of label.requiredFacets) {
    const lines = rationaleLines(facet.rationale);
    if (facet.accepted.length > 1 && lines.length !== facet.accepted.length)
      defects.push(`${item.id}: rationale line count for ${facet.facet}`);
    for (const citation of facet.accepted) {
      if (
        facet.accepted.length > 1 &&
        !lines.some((line) => line.startsWith(citation))
      )
        defects.push(`${item.id}: missing rationale for ${citation}`);
    }
  }
  if (item.kind === "answerable") {
    if (item.requiredFacets.length === 0) defects.push(`${item.id}: no facets`);
    if (!sufficient(index, item)) defects.push(`${item.id}: no eligible accepted citation`);
    if (label.noMatchRationale !== null) defects.push(`${item.id}: answerable has no-match rationale`);
  } else {
    if (item.requiredFacets.length) defects.push(`${item.id}: no-match has facets`);
    if (!label.noMatchRationale) defects.push(`${item.id}: missing no-match rationale`);
    if (!item.missingRuntimeFacts.length)
      defects.push(`${item.id}: no missing runtime facts`);
  }
}

const caseVerdicts = cases.map((item) => {
  const issues = defects.filter((defect) => defect.startsWith(`${item.id}:`));
  return {
    id: item.id,
    kind: item.kind,
    family: familyOf(item.id),
    bucket: bucketOf(item.id),
    verdict: issues.length ? "revise" : "accept",
    issues,
  };
});

const review = {
  version: 1,
  reviewer: "ai-assisted-rule-based-audit-v1",
  reviewOf: "R4.1 holdout v1",
  reviewedAt: "2026-10-21",
  independence: "ai_assisted_not_human_independent",
  method:
    "A separate rule-based second pass over a stratified 20% sample plus a full structural review of all 160 holdout cases. The second pass judged binary sufficient guidance from the case kind, the case's required facets, the frozen corpus, and runbook access eligibility. It did not read the label file's rationales or the author's prose.",
  limitation:
    "This is an automated/AI-assisted audit, not an independent human second review. It measures internal consistency and citation validity, not human inter-rater reliability. A human reviewer must still sign off before R4.4; if that review disagrees, the holdout must be revised before sealing or re-authored and re-sealed.",
  accessAttestation:
    "Read only the R4.1 holdout cases, labels, and evidence; the frozen corpus; and docs/AI/runbooks. Did not read candidate outputs, rankings, scores, retrieval runs, or the R3.5 failure ledger. Did not run the retriever, model, or scoring pipeline.",
  sample: {
    cases: sample.length,
    fractionOfHoldout: sample.length / cases.length,
    strategy:
      "First two answerable cases per family (20) and first three no-match cases per bucket (12), in file order.",
    ids: sample.map((item) => item.id),
  },
  kappa: {
    judgment: "binary sufficient guidance (answerable = sufficient, no_match = insufficient)",
    threshold: 0.7,
    passes: agreement.kappa >= 0.7,
    interpretation:
      "Because the second pass is rule-based, perfect agreement is expected when every answerable case has an eligible accepted citation. This confirms internal consistency; it is not evidence of independent human agreement.",
    ...agreement,
  },
  holdoutReview: {
    cases: cases.length,
    answerable: cases.filter((item) => item.kind === "answerable").length,
    noMatch: cases.filter((item) => item.kind === "no_match").length,
    coverage: "100%",
    defects,
    caseVerdicts,
    verdict: defects.length ? "defects_found" : "structurally_clean",
  },
  verdict: "provisional_ai_assisted_human_signoff_outstanding",
  humanIndependentReview: "outstanding",
};

await writeFile(
  join(holdoutDir, "review-v1.json"),
  JSON.stringify(review, null, 2) + "\n",
  "utf8",
);

console.log(
  JSON.stringify(
    {
      sample: sample.length,
      agreement: agreement.observedAgreement,
      kappa: agreement.kappa,
      defects: defects.length,
    },
    null,
    2,
  ),
);
