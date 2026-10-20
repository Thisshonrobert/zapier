// Deterministic facet-aware packing for the three returned guidance slots.
//
// Scores decide which section represents a facet; the requested facet order
// decides which facets are represented. Packing never adds a candidate, never
// changes a score, and never repeats a citation.
import type { RunbookMatch } from "./search-runbooks.ts";
import {
  isProceduralFacet,
  sectionFacet,
  type SectionFacet,
} from "./section-facets.ts";

const byScoreThenCitation = (left: RunbookMatch, right: RunbookMatch) =>
  right.score - left.score || left.citation.localeCompare(right.citation);

export function packByFacet(
  matches: readonly RunbookMatch[],
  requested: readonly SectionFacet[],
  limit = 3,
): RunbookMatch[] {
  if (limit <= 0) return [];
  const ranked = matches
    .filter((match) => isProceduralFacet(sectionFacet(match.heading)))
    .sort(byScoreThenCitation);
  const chosen: RunbookMatch[] = [];
  const used = new Set<string>();
  const take = (match: RunbookMatch) => {
    chosen.push(match);
    used.add(match.citation);
  };

  // One section per requested facet first, so complementary guidance is not
  // displaced by three near-duplicate high scores.
  for (const facet of requested) {
    if (chosen.length >= limit) break;
    const match = ranked.find(
      (candidate) =>
        !used.has(candidate.citation) &&
        sectionFacet(candidate.heading) === facet,
    );
    if (match) take(match);
  }

  for (const match of ranked) {
    if (chosen.length >= limit) break;
    if (!used.has(match.citation)) take(match);
  }

  return chosen.sort(byScoreThenCitation).slice(0, limit);
}
