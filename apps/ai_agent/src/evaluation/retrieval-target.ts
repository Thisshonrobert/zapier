// R3 target-recovery measurement: the frozen serving corpus, strict label
// validation, and the sufficient-guidance metric. Nothing may be measured
// before the corpus boundary passes; a runbook edit must fail closed instead
// of silently changing a score.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import {
  eligibleRunbookSections,
  type RunbookIndex,
  type RunbookSearchInput,
} from "../tools/search-runbooks.ts";

export type FrozenSection = Omit<
  RunbookIndex[number],
  "headingTerms" | "contentTerms"
>;

export type FrozenCorpus = {
  version: 1;
  source: string;
  corpusHash: string;
  sections: FrozenSection[];
};

export const corpusHash = (sections: readonly FrozenSection[]) =>
  createHash("sha256").update(JSON.stringify(sections)).digest("hex");

export function canonicalSections(index: RunbookIndex): FrozenSection[] {
  return index.map(({ headingTerms, contentTerms, ...section }) => section);
}

export async function loadFrozenCorpus(path: string): Promise<FrozenCorpus> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as FrozenCorpus;
  if (parsed.version !== 1 || !Array.isArray(parsed.sections)) {
    throw new Error("Frozen corpus artifact is not readable");
  }
  if (parsed.corpusHash !== corpusHash(parsed.sections)) {
    throw new Error("Frozen corpus artifact hash does not match its sections");
  }
  return parsed;
}

export function verifyTargetCorpus(
  index: RunbookIndex,
  frozen: FrozenCorpus,
): void {
  const sections = canonicalSections(index);
  const actualHash = corpusHash(sections);
  if (
    actualHash !== frozen.corpusHash ||
    JSON.stringify(sections) !== JSON.stringify(frozen.sections)
  ) {
    throw new Error("Target corpus changed; create a new protocol");
  }
}

// ---------------------------------------------------------------------------
// Case and output schemas
// ---------------------------------------------------------------------------

export const TargetInputSchema = z
  .object({
    query: z.string().min(1).max(500),
    taxonomy: z.array(z.string()).optional(),
    providers: z.array(z.string()).optional(),
    limit: z.literal(3).optional(),
  })
  .strict();

export const FacetSchema = z.enum([
  "symptoms",
  "evidence",
  "investigation",
  "remediation",
  "forbidden",
  "replay",
  "verification",
]);

export type TargetFacet = z.infer<typeof FacetSchema>;

const RequiredFacetSchema = z
  .object({
    facet: FacetSchema,
    // Up to four independently sufficient sections may answer one facet.
    accepted: z.array(z.string().min(1)).min(1).max(4),
  })
  .strict();

export const TargetCaseSchema = z
  .object({
    id: z.string().min(1),
    split: z.enum(["development", "holdout"]),
    kind: z.enum(["answerable", "no_match", "corpus_gap"]),
    input: TargetInputSchema,
    requiredFacets: z.array(RequiredFacetSchema).max(3),
    supporting: z.array(z.string().min(1)),
    missingRuntimeFacts: z.array(z.string().min(1)),
  })
  .strict();

export type TargetCase = z.infer<typeof TargetCaseSchema>;

export const TargetOutputSchema = z.union([
  z
    .object({
      id: z.string().min(1),
      returned: z.array(z.string().min(1)).max(3),
      latencyMs: z.number().finite().nonnegative(),
      candidates: z.array(z.string().min(1)).optional(),
      routeExcluded: z.array(z.string().min(1)).optional(),
    })
    .strict(),
  z.object({ id: z.string().min(1), error: z.string().min(1) }).strict(),
]);

export type TargetOutput = z.infer<typeof TargetOutputSchema>;

export async function loadTargetCases(path: string): Promise<TargetCase[]> {
  return TargetCaseSchema.array().parse(JSON.parse(await readFile(path, "utf8")));
}

// ---------------------------------------------------------------------------
// Reviewed label file (source of truth for the frozen label hash)
// ---------------------------------------------------------------------------

// Equivalence provenance is line-based: a multi-citation facet carries one
// reviewer rationale line per accepted citation, and each line names its
// citation. Single-citation facets keep the existing free-form rationale.
export const rationaleLines = (rationale: string): string[] =>
  rationale
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const LabelFacetSchema = z
  .object({
    facet: FacetSchema,
    accepted: z.array(z.string().min(1)).min(1).max(4),
    rationale: z.string().min(1),
  })
  .strict()
  .superRefine((facet, context) => {
    if (facet.accepted.length < 2) return;
    const lines = rationaleLines(facet.rationale);
    if (lines.length !== facet.accepted.length) {
      context.addIssue({
        code: "custom",
        message: "Multi-citation facet needs one rationale line per citation",
        path: ["rationale"],
      });
      return;
    }
    for (const citation of facet.accepted) {
      if (!lines.some((line) => line.startsWith(citation))) {
        context.addIssue({
          code: "custom",
          message: `Missing rationale line for ${citation}`,
          path: ["rationale"],
        });
      }
    }
  });

const LabelCaseSchema = z
  .object({
    id: z.string().min(1),
    requiredFacets: z.array(LabelFacetSchema).max(3),
    supporting: z.array(z.string().min(1)),
    missingRuntimeFacts: z.array(z.string().min(1)),
    noMatchRationale: z.string().min(1).nullable(),
  })
  .strict();

export const TargetLabelFileSchema = z
  .object({
    version: z.literal(1),
    cases: z.array(LabelCaseSchema),
  })
  .strict();

// v2 keeps the v1 case/label shape and adds no required field. It exists so an
// R4 label file can be identified as authored under the equivalence rules:
// every independently sufficient citation is accepted, up to four per facet.
export const TargetLabelFileV2Schema = z
  .object({
    version: z.literal(2),
    cases: z.array(LabelCaseSchema),
  })
  .strict();

export type TargetLabelFile = z.infer<typeof TargetLabelFileSchema>;
export type TargetLabelFileV2 = z.infer<typeof TargetLabelFileV2Schema>;
export type TargetLabelCase = z.infer<typeof LabelCaseSchema>;

export async function loadTargetLabels(path: string): Promise<TargetLabelFile> {
  return TargetLabelFileSchema.parse(JSON.parse(await readFile(path, "utf8")));
}

export async function loadTargetLabelsV2(
  path: string,
): Promise<TargetLabelFileV2> {
  return TargetLabelFileV2Schema.parse(
    JSON.parse(await readFile(path, "utf8")),
  );
}

export const targetLabelHash = (labels: TargetLabelFile | TargetLabelFileV2) =>
  createHash("sha256").update(JSON.stringify(labels)).digest("hex");

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const fraction = (numerator: number, denominator: number) => ({
  numerator,
  denominator,
  rate: denominator ? numerator / denominator : null,
});

const reviewFile = fileURLToPath(
  new URL(
    "../../evaluation/production-selection/development-review-v3.json",
    import.meta.url,
  ),
);

const ReviewSchema = z.object({
  cases: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum(["answerable", "no_match"]),
      input: TargetInputSchema,
      supporting: z.array(z.string()),
      missingRuntimeFacts: z.array(z.string()),
    }),
  ),
});

// The retired 54-section review cites RB-F01-F02@1.0.0; the serving corpus
// serves 1.1.0. Only that runbook changed version.
export function remapCitation(citation: string): string {
  return citation.startsWith("RB-F01-F02@1.0.0#")
    ? citation.replace("@1.0.0#", "@1.1.0#")
    : citation;
}

export function scoreTarget(
  index: RunbookIndex,
  rawCases: readonly TargetCase[],
  rawOutputs: readonly TargetOutput[],
) {
  const cases = TargetCaseSchema.array().parse(rawCases);
  const outputs = TargetOutputSchema.array().parse(rawOutputs);
  if (new Set(cases.map((item) => item.id)).size !== cases.length)
    throw new Error("Duplicate target case");
  if (new Set(outputs.map((item) => item.id)).size !== outputs.length)
    throw new Error("Duplicate target output");
  if (outputs.some((output) => !cases.some((item) => item.id === output.id)))
    throw new Error("Unknown target output");
  const known = new Set(index.map((section) => section.citation));

  const rows = cases.map((item) => {
    const output = outputs.find((candidate) => candidate.id === item.id);
    const available = Boolean(output && "returned" in output);
    const returned = output && "returned" in output ? output.returned : [];
    if (new Set(returned).size !== returned.length)
      throw new Error(`Duplicate returned citation: ${item.id}`);
    if (returned.some((citation) => !known.has(citation)))
      throw new Error(`Unknown returned citation: ${item.id}`);
    const eligible = new Set(
      eligibleRunbookSections(index, item.input).map((section) => section.citation),
    );
    if (returned.some((citation) => !eligible.has(citation)))
      throw new Error(`Ineligible returned citation: ${item.id}`);

    if (item.kind !== "answerable") {
      if (item.requiredFacets.length)
        throw new Error(`Direct labels on ${item.kind} case: ${item.id}`);
      if (item.supporting.some((citation) => !known.has(citation)))
        throw new Error(`Unknown supporting citation: ${item.id}`);
      return {
        id: item.id,
        kind: item.kind,
        available,
        returned,
        eligibleAnswerable: false,
        sufficient: false,
        sectionRecall: null as number | null,
        strictSufficient: false,
        strictSectionRecall: null as number | null,
        canonicalAccepted: [] as string[],
        directPrecision: 0,
        candidateRecall: null as number | null,
        routeCoverage: null as number | null,
        providerExcluded: false,
        accepted: 0,
      };
    }
    if (!item.requiredFacets.length)
      throw new Error(`Answerable case has no required facet: ${item.id}`);

    const facetNames = item.requiredFacets.map((facet) => facet.facet);
    if (new Set(facetNames).size !== facetNames.length)
      throw new Error(`Duplicate facet: ${item.id}`);

    const feasible = item.requiredFacets.map((facet) => {
      if (new Set(facet.accepted).size !== facet.accepted.length)
        throw new Error(`Duplicate accepted citation: ${item.id}`);
      if (facet.accepted.some((citation) => !known.has(citation)))
        throw new Error(`Unknown accepted citation: ${item.id}`);
      return {
        ...facet,
        accepted: facet.accepted.filter((citation) => eligible.has(citation)),
      };
    });
    const accepted = [...new Set(feasible.flatMap((facet) => facet.accepted))];
    if (item.supporting.some((citation) => !known.has(citation)))
      throw new Error(`Unknown supporting citation: ${item.id}`);
    if (item.supporting.some((citation) => accepted.includes(citation)))
      throw new Error(`Supporting citation is also accepted: ${item.id}`);

    const eligibleAnswerable = feasible.every((facet) => facet.accepted.length > 0);
    if (!eligibleAnswerable) {
      return {
        id: item.id,
        kind: item.kind,
        available,
        returned,
        eligibleAnswerable: false,
        sufficient: false,
        sectionRecall: null as number | null,
        strictSufficient: false,
        strictSectionRecall: null as number | null,
        canonicalAccepted: [] as string[],
        directPrecision: 0,
        candidateRecall: null as number | null,
        routeCoverage: null as number | null,
        providerExcluded: true,
        accepted: accepted.length,
      };
    }

    const hits = accepted.filter((citation) => returned.includes(citation));
    const facetsCovered = feasible.filter((facet) =>
      facet.accepted.some((citation) => returned.includes(citation)),
    );
    // Strict-label sensitivity: one canonical citation per facet, defined as
    // the first listed accepted citation. Provider-excluded citations are
    // already removed by the eligibility filter above.
    const canonicalAccepted = feasible.map((facet) => facet.accepted[0]!);
    const strictFacetsCovered = feasible.filter((facet) =>
      returned.includes(facet.accepted[0]!),
    );
    const candidates = output && "returned" in output ? output.candidates : undefined;
    if (candidates?.some((citation) => !known.has(citation)))
      throw new Error(`Unknown candidate citation: ${item.id}`);
    const routeExcluded = (output && "returned" in output ? output.routeExcluded : []) ?? [];
    if (routeExcluded.some((citation) => !known.has(citation)))
      throw new Error(`Unknown route exclusion: ${item.id}`);
    const candidateHits = candidates
      ? accepted.filter((citation) => candidates.includes(citation)).length
      : accepted.length;
    const routeExcludedAccepted = accepted.filter((citation) =>
      routeExcluded.includes(citation),
    ).length;

    return {
      id: item.id,
      kind: item.kind,
      available,
      returned,
      eligibleAnswerable: true,
      sufficient: facetsCovered.length === feasible.length,
      sectionRecall: hits.length / accepted.length,
      strictSufficient: strictFacetsCovered.length === feasible.length,
      strictSectionRecall: canonicalAccepted.length
        ? strictFacetsCovered.length / canonicalAccepted.length
        : null,
      canonicalAccepted,
      directPrecision: returned.length ? hits.length / returned.length : 0,
      candidateRecall: candidateHits / accepted.length,
      routeCoverage: accepted.length
        ? (accepted.length - routeExcludedAccepted) / accepted.length
        : 1,
      providerExcluded: false,
      accepted: accepted.length,
    };
  });

  const positives = rows.filter((row) => row.eligibleAnswerable);
  const negatives = rows.filter((row) => row.kind === "no_match");
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const mean = (values: number[]) =>
    values.length ? sum(values) / values.length : null;
  const latencies = rows
    .flatMap((row) => {
      const output = outputs.find((item) => item.id === row.id);
      return output && "latencyMs" in output ? [output.latencyMs] : [];
    })
    .sort((left, right) => left - right);
  const sufficientRate = fraction(
    positives.filter((row) => row.sufficient).length,
    positives.length,
  ).rate;
  const strictSufficientRate = fraction(
    positives.filter((row) => row.strictSufficient).length,
    positives.length,
  ).rate;

  return {
    rows,
    counts: {
      scheduled: rows.length,
      eligibleAnswerable: positives.length,
      noMatch: negatives.length,
      corpusGap: rows.filter((row) => row.kind === "corpus_gap").length,
      providerExcluded: rows.filter((row) => row.providerExcluded).length,
      unavailable: rows.filter((row) => !row.available).length,
    },
    metrics: {
      sufficientGuidanceHitAt3: sufficientRate,
      macroSectionRecallAt3: mean(positives.map((row) => row.sectionRecall ?? 0)),
      strictSufficientGuidanceHitAt3: strictSufficientRate,
      strictMacroSectionRecallAt3: mean(
        positives.map((row) => row.strictSectionRecall ?? 0),
      ),
      strictLabelGap:
        sufficientRate !== null && strictSufficientRate !== null
          ? sufficientRate - strictSufficientRate
          : null,
      directPrecisionAt3: mean(positives.map((row) => row.directPrecision)),
      candidateRecall: mean(positives.map((row) => row.candidateRecall ?? 1)),
      routeCoverage: mean(positives.map((row) => row.routeCoverage ?? 1)),
    },
    noMatchAbstention: fraction(
      negatives.filter((row) => row.available && row.returned.length === 0).length,
      negatives.length,
    ),
    falseAbstention: fraction(
      positives.filter((row) => row.available && row.returned.length === 0).length,
      positives.length,
    ),
    reliability: fraction(
      rows.filter((row) => row.available).length,
      rows.length,
    ),
    allIncidentCoverage: fraction(
      rows.filter(
        (row) =>
          row.sufficient ||
          (row.kind === "no_match" && row.available && row.returned.length === 0),
      ).length,
      rows.length,
    ),
    p95LatencyMs: latencies.length
      ? latencies[Math.ceil(latencies.length * 0.95) - 1]
      : null,
  };
}

// ---------------------------------------------------------------------------
// Benchmark preparation: inputs from the exposed review, labels reviewed blind
// ---------------------------------------------------------------------------

export async function prepareTargetBenchmark(
  outDir: string,
): Promise<{ labelHash: string; cases: number }> {
  const corpusPath = join(outDir, "corpus-v1.json");
  const labelsPath = join(outDir, "development-labels-v1.json");
  const casesPath = join(outDir, "development-cases-v1.json");
  const packetPath = join(outDir, "development-review-packet-v1.json");

  const frozen = await loadFrozenCorpus(corpusPath);
  const known = new Set(frozen.sections.map((section) => section.citation));
  const labels = await loadTargetLabels(labelsPath);
  const review = ReviewSchema.parse(
    JSON.parse(await readFile(reviewFile, "utf8")),
  );

  if (new Set(labels.cases.map((item) => item.id)).size !== labels.cases.length)
    throw new Error("Duplicate label case id");
  if (labels.cases.length !== review.cases.length)
    throw new Error("Label file does not cover the development cohort");
  const labelById = new Map(labels.cases.map((item) => [item.id, item]));

  const cases: TargetCase[] = review.cases.map((reviewCase) => {
    const label = labelById.get(reviewCase.id);
    if (!label) throw new Error(`Missing reviewed label: ${reviewCase.id}`);
    const supporting = reviewCase.supporting.map(remapCitation);
    if (supporting.some((citation) => !known.has(citation)))
      throw new Error(`Unknown supporting citation: ${reviewCase.id}`);
    if (
      JSON.stringify(label.supporting) !== JSON.stringify(supporting) ||
      JSON.stringify(label.missingRuntimeFacts) !==
        JSON.stringify(reviewCase.missingRuntimeFacts)
    )
      throw new Error(`Label disagrees with cohort: ${reviewCase.id}`);

    const requiredFacets = label.requiredFacets.map((facet) => {
      if (new Set(facet.accepted).size !== facet.accepted.length)
        throw new Error(`Duplicate accepted citation: ${reviewCase.id}`);
      if (facet.accepted.some((citation) => !known.has(citation)))
        throw new Error(`Unknown accepted citation: ${reviewCase.id}`);
      return { facet: facet.facet, accepted: facet.accepted };
    });
    const names = requiredFacets.map((facet) => facet.facet);
    if (new Set(names).size !== names.length)
      throw new Error(`Duplicate facet: ${reviewCase.id}`);
    if (requiredFacets.some((facet) =>
      facet.accepted.some((citation) => supporting.includes(citation)),
    ))
      throw new Error(`Supporting citation is also accepted: ${reviewCase.id}`);

    if (reviewCase.kind === "answerable") {
      if (!requiredFacets.length)
        throw new Error(`Answerable case has no reviewed facet: ${reviewCase.id}`);
    } else {
      if (requiredFacets.length)
        throw new Error(`Direct labels on ${reviewCase.kind} case: ${reviewCase.id}`);
      if (!label.noMatchRationale)
        throw new Error(`No-match case lacks a rationale: ${reviewCase.id}`);
    }

    return {
      id: reviewCase.id,
      split: "development",
      kind: reviewCase.kind,
      input: reviewCase.input,
      requiredFacets,
      supporting,
      missingRuntimeFacts: reviewCase.missingRuntimeFacts,
    };
  });

  TargetCaseSchema.array().parse(cases);
  await mkdir(dirname(casesPath), { recursive: true });
  await writeFile(casesPath, JSON.stringify(cases, null, 2) + "\n", "utf8");

  // Score-blind review packet: every frozen section for every case, no scores.
  const packet = cases.map((item) => ({
    id: item.id,
    kind: item.kind,
    input: item.input,
    sections: frozen.sections,
  }));
  await writeFile(packetPath, JSON.stringify(packet, null, 2) + "\n", "utf8");

  return { labelHash: targetLabelHash(labels), cases: cases.length };
}
