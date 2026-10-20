// Observed-support gate for the structured retrieval arm.
//
// "No suitable guidance" is decided from observed support, not from a score
// cutoff: a confident evidence route, or enough distinct observed anchors in
// the selected heading/content, must back the packed result. Only anchors
// already derived from observed evidence are considered; case ids, labels,
// fixture-only controls, raw error bodies, PII, and secrets never enter here.
import type { StructuredRunbookSearchInput } from "./retrieval-profile.ts";
import type { RunbookMatch } from "./search-runbooks.ts";
import { isProceduralFacet, sectionFacet } from "./section-facets.ts";

export type SupportPolicy = { minAnchorHits: 1 | 2 };

export type SupportReason =
  | "no_candidates"
  | "no_procedural_section"
  | "no_observed_anchor"
  | "supported";

const defaultPolicy: SupportPolicy = { minAnchorHits: 1 };

// Distinct anchors that appear case-insensitively in the selected sections.
// Exported so the evaluation capture can record exactly what supported a match.
export function matchedObservedAnchors(
  matches: readonly RunbookMatch[],
  input: StructuredRunbookSearchInput,
): string[] {
  const haystack = matches.map((match) =>
    `${match.heading}\n${match.content}`.toLowerCase(),
  );
  const hits = new Set<string>();
  for (const anchor of input.anchors ?? []) {
    const normalized = anchor.trim().toLowerCase();
    if (normalized && haystack.some((text) => text.includes(normalized)))
      hits.add(normalized);
  }
  return [...hits];
}

export function decideSupport(
  matches: readonly RunbookMatch[],
  input: StructuredRunbookSearchInput,
  policy: SupportPolicy = defaultPolicy,
): { abstain: boolean; reason: SupportReason } {
  if (!matches.length) return { abstain: true, reason: "no_candidates" };
  if (!matches.some((match) => isProceduralFacet(sectionFacet(match.heading))))
    return { abstain: true, reason: "no_procedural_section" };
  if (input.route?.confident) return { abstain: false, reason: "supported" };
  return matchedObservedAnchors(matches, input).length >= policy.minAnchorHits
    ? { abstain: false, reason: "supported" }
    : { abstain: true, reason: "no_observed_anchor" };
}
