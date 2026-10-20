// Route-filtered MiniLM ranking with optional facet-aware packing. The route
// narrows the eligible candidate set; it never adds a candidate, changes a
// score, or supplies a gold label.
import { packByFacet } from "./facet-pack.ts";
import {
  eligibleRunbookSections,
  toRunbookMatch,
  type RunbookIndex,
  type RunbookMatch,
} from "./search-runbooks.ts";
import { sectionFacet } from "./section-facets.ts";
import type {
  EvidenceRoute,
  RequestedFacet,
  StructuredRunbookSearchInput,
} from "./retrieval-profile.ts";

const noRoute: EvidenceRoute = { hints: [], confident: false, reasons: [] };

const byScoreThenCitation = (
  left: { section: RunbookIndex[number]; score: number },
  right: { section: RunbookIndex[number]; score: number },
) =>
  right.score - left.score ||
  left.section.citation.localeCompare(right.section.citation);

export function routeCandidates(
  index: RunbookIndex,
  input: StructuredRunbookSearchInput,
): {
  candidates: RunbookIndex;
  route: EvidenceRoute;
  routeExcluded: string[];
} {
  const eligible = eligibleRunbookSections(index, input);
  const hints = input.route?.confident
    ? new Set(input.route.hints.map((hint) => hint.toLowerCase()))
    : null;
  const candidates = hints
    ? eligible.filter((section) =>
        section.taxonomy.some((taxonomy) =>
          hints.has(taxonomy.toLowerCase()),
        ),
      )
    : eligible;
  const routedCitations = new Set(
    candidates.map((section) => section.citation),
  );
  return {
    candidates,
    route: input.route ?? noRoute,
    routeExcluded: eligible
      .filter((section) => !routedCitations.has(section.citation))
      .map((section) => section.citation),
  };
}

function scoredSections(
  candidates: RunbookIndex,
  logits: Record<string, number>,
): Array<{ section: RunbookIndex[number]; score: number }> {
  if (candidates.some((section) => !Number.isFinite(logits[section.citation])))
    throw new Error("Invalid MiniLM scores");
  return candidates
    .map((section) => ({
      section,
      score: 1 / (1 + Math.exp(-logits[section.citation]!)),
    }))
    .sort(byScoreThenCitation);
}

export function rankRouteOnly(
  index: RunbookIndex,
  input: StructuredRunbookSearchInput,
  logits: Record<string, number>,
): {
  matches: RunbookMatch[];
  route: EvidenceRoute;
  routeExcluded: string[];
} {
  const { candidates, route, routeExcluded } = routeCandidates(index, input);
  const matches = scoredSections(candidates, logits)
    .slice(0, input.limit ?? 3)
    .map(({ section, score }) => toRunbookMatch(section, score));
  return { matches, route, routeExcluded };
}

export function rankStructured(
  index: RunbookIndex,
  input: StructuredRunbookSearchInput,
  logits: Record<string, number>,
): {
  matches: RunbookMatch[];
  route: EvidenceRoute;
  facetsRequested: RequestedFacet[];
  facetsCovered: RequestedFacet[];
} {
  const { candidates, route } = routeCandidates(index, input);
  const limit = input.limit ?? 3;
  const ranked = scoredSections(candidates, logits).map(({ section, score }) =>
    toRunbookMatch(section, score),
  );
  const facetsRequested = [...(input.requestedFacets ?? [])];
  const matches = facetsRequested.length
    ? packByFacet(ranked, facetsRequested, limit)
    : ranked.slice(0, limit);
  return {
    matches,
    route,
    facetsRequested,
    facetsCovered: facetsRequested.filter((facet) =>
      matches.some((match) => sectionFacet(match.heading) === facet),
    ),
  };
}
