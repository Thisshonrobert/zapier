// Route-filtered MiniLM ranking. The route narrows the eligible candidate set;
// it never adds a candidate, changes a score, or supplies a gold label.
import {
  eligibleRunbookSections,
  toRunbookMatch,
  type RunbookIndex,
  type RunbookMatch,
} from "./search-runbooks.ts";
import type {
  EvidenceRoute,
  StructuredRunbookSearchInput,
} from "./retrieval-profile.ts";

export function rankRouteOnly(
  index: RunbookIndex,
  input: StructuredRunbookSearchInput,
  logits: Record<string, number>,
): {
  matches: RunbookMatch[];
  route: EvidenceRoute;
  routeExcluded: string[];
} {
  const eligible = eligibleRunbookSections(index, input);
  const hints = input.route?.confident
    ? new Set(input.route.hints.map((hint) => hint.toLowerCase()))
    : null;
  const routed = hints
    ? eligible.filter((section) =>
        section.taxonomy.some((taxonomy) => hints.has(taxonomy.toLowerCase())),
      )
    : eligible;
  const routedCitations = new Set(routed.map((section) => section.citation));
  const excluded = eligible
    .filter((section) => !routedCitations.has(section.citation))
    .map((section) => section.citation);
  if (routed.some((section) => !Number.isFinite(logits[section.citation])))
    throw new Error("Invalid MiniLM scores");
  const matches = routed
    .map((section) => ({
      section,
      score: 1 / (1 + Math.exp(-logits[section.citation]!)),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.section.citation.localeCompare(right.section.citation),
    )
    .slice(0, input.limit ?? 3)
    .map(({ section, score }) => toRunbookMatch(section, score));
  return {
    matches,
    route: input.route ?? { hints: [], confident: false, reasons: [] },
    routeExcluded: excluded,
  };
}
