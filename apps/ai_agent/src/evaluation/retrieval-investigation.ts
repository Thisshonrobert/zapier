// Development-only interventions. Production and the original frozen experiments
// remain unchanged. No labels, scenario IDs, or expected diagnoses are inputs here.
import type {
  RunbookIndex,
  RunbookMatch,
  RunbookSearchInput,
} from "../tools/search-runbooks.ts";
import { searchRunbooks } from "../tools/search-runbooks.ts";
import { classifyIntent } from "./retrieval-intent.ts";

export const interventions = [
  "baseline",
  "soft-intent",
  "focused-query",
  "relevance",
  "focused-relevance",
] as const;
export type Intervention = (typeof interventions)[number];
const headings: Record<string, readonly string[]> = {
  EVIDENCE_GATHERING: ["Evidence needed"],
  ROOT_CAUSE: ["Symptoms", "Read-only investigation"],
  REMEDIATION: ["Allowed remediation", "Verification, rollback, or escalation"],
  CONSTRAINTS: ["Forbidden actions", "Replay and approval"],
};
const noise = new Set(
  "a an and are for is of or the to with in on how what which should i do did can when from including after before as it be by that this any actions action evidence collect needed repair allowed forbidden failure incident distinguish why unknown supported support status not applicable".split(
    " ",
  ),
);
export function informativeTerms(query: string) {
  return [...new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? [])].filter(
    (t) => t.length > 2 && !noise.has(t),
  );
}

// Small vocabulary equivalences, not procedural prefixes or asserted facts.
// Preserve the original query; normalize fixture underscores and add only terms
// licensed by wording already present. No case-specific taxonomy or provider inference.
const equivalents = [
  [/\bthrottl(?:e|ed|ing)\b/i, "rate limit"],
  [/\binterpolat(?:e|ion)\b/i, "template parser"],
  [/\bauthentication\b/i, "credentials"],
  [/\bresend\b/i, "repeat delivery"],
  [/\backnowledg(?:e)?ment\b/i, "receipt"],
] as const;
export function evidenceQueries(input: RunbookSearchInput) {
  const normalized = input.query.replaceAll("_", " ");
  const focus = informativeTerms(normalized).join(" ");
  const additions = equivalents
    .filter(([pattern]) => pattern.test(normalized))
    .map(([, value]) => value)
    .join(" ");
  return [
    ...new Set([input.query, `${focus} ${additions}`.trim()].filter(Boolean)),
  ].map((query) => ({ ...input, query: query.slice(0, 500) }));
}

export function retrieveInvestigation(
  index: RunbookIndex,
  input: RunbookSearchInput,
  variant: Intervention,
): RunbookMatch[] {
  const baseline = searchRunbooks(index, input); // Reuse all validation and access constraints.
  if (variant === "baseline") return baseline;
  const limit = input.limit ?? 3;
  if (variant === "soft-intent") {
    const intent = classifyIntent(input.query);
    // Inferred intent only breaks near ties; it can never exclude a passage.
    return index
      .flatMap((s) => searchRunbooks([s], input))
      .map((m) => ({
        ...m,
        score:
          m.score + (intent && headings[intent]?.includes(m.heading) ? 0.5 : 0),
      }))
      .sort((a, b) => b.score - a.score || a.citation.localeCompare(b.citation))
      .slice(0, limit);
  }
  let matches = baseline;
  if (variant === "focused-query" || variant === "focused-relevance") {
    const queries = evidenceQueries(input);
    const focused = searchRunbooks(index, queries.at(-1)!);
    // Preserve incident-specific initial evidence. A vocabulary variant can fill
    // a vacant slot or replace only the last slot, never displace the first two.
    const kept = baseline.slice(0, Math.max(0, limit - 1));
    const novel = focused.find(
      (m) => !kept.some((b) => b.citation === m.citation),
    );
    matches = [
      ...kept,
      ...(novel ? [novel] : baseline.slice(kept.length)),
    ].slice(0, limit);
  }
  if (variant === "relevance" || variant === "focused-relevance") {
    const queryTerms = informativeTerms(input.query);
    // Hypothesis: require two informative observed terms in one passage. Record
    // false abstentions: this is an experimental cutoff, not a production policy.
    if (
      !matches.some((m) => {
        const passage = new Set(informativeTerms(`${m.heading} ${m.content}`));
        return queryTerms.filter((t) => passage.has(t)).length >= 2;
      })
    )
      return [];
  }
  return matches;
}

export function traceRetrieval(
  index: RunbookIndex,
  input: RunbookSearchInput,
  relevant: readonly string[],
  variant: Intervention,
) {
  const final = retrieveInvestigation(index, input, variant);
  return relevant.map((citation) => {
    const section = index.find((s) => s.citation === citation);
    const eligible =
      section &&
      (!input.taxonomy?.length ||
        section.taxonomy.some((t) =>
          input.taxonomy!.some((v) => v.toLowerCase() === t.toLowerCase()),
        )) &&
      (!input.providers?.length ||
        section.providers.includes("generic") ||
        section.providers.some((p) =>
          input.providers!.some((v) => v.toLowerCase() === p),
        ));
    const candidateQueries =
      variant === "focused-query" || variant === "focused-relevance"
        ? evidenceQueries(input)
        : [input];
    const generated =
      section &&
      eligible &&
      candidateQueries.some((q) => searchRunbooks([section], q).length);
    const ranked = generated
      ? retrieveInvestigation(
          index,
          input,
          variant === "relevance"
            ? "baseline"
            : variant === "focused-relevance"
              ? "focused-query"
              : variant,
        )
      : [];
    const beforeAbstention = ranked.some((m) => m.citation === citation);
    return {
      citation,
      inCorpus: Boolean(section),
      providerEligible: Boolean(eligible),
      originalCandidate: Boolean(
        section && searchRunbooks([section], input).length,
      ),
      variantCandidate: Boolean(generated),
      survivesIntentFilter: Boolean(generated),
      beforeAbstention,
      finalContext: final.some((m) => m.citation === citation),
      lostAt: !section
        ? "corpus"
        : !eligible
          ? "provider-eligibility"
          : !generated
            ? "candidate-generation"
            : !beforeAbstention
              ? "ranking"
              : final.some((m) => m.citation === citation)
                ? null
                : "abstention",
    };
  });
}

// Oracle annotations are deliberately supplied through a separate interface;
// retrieveInvestigation and planners never receive them. Enforce existing access.
export function oracleContext(
  index: RunbookIndex,
  input: RunbookSearchInput,
  citations: readonly string[],
): RunbookMatch[] {
  searchRunbooks(index, input);
  if (
    citations.length > (input.limit ?? 3) ||
    new Set(citations).size !== citations.length
  )
    throw new Error("Invalid oracle selection");
  return citations.map((citation) => {
    const section = index.find((s) => s.citation === citation);
    if (!section) throw new Error("Oracle passage absent from corpus");
    const match = searchRunbooks([section], {
      ...input,
      query: section.heading,
    })[0];
    if (!match) throw new Error("Oracle passage ineligible");
    return match;
  });
}
