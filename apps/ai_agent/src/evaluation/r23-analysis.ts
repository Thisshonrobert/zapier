import type { RunbookIndex } from "../tools/search-runbooks.ts";
import { validateScores } from "./retrieval-r2.ts";
export const r23Variants = ["original", "runbook-context"] as const;
export type R23Variant = (typeof r23Variants)[number];
export function passageR23(
  index: RunbookIndex,
  section: RunbookIndex[number],
  variant: R23Variant,
) {
  const original = `${section.heading}\n${section.content}`;
  if (variant === "original") return original;
  const context = index.find(
    (s) =>
      s.id === section.id &&
      s.version === section.version &&
      /symptoms/i.test(s.heading),
  );
  return context && context.citation !== section.citation
    ? `Runbook context: ${context.content}\nSection: ${original}`
    : original;
}
export function diagnoseR23(
  relevant: readonly string[],
  candidates: readonly string[],
  logits: Record<string, number>,
) {
  validateScores(logits, candidates, -Number.MAX_VALUE, Number.MAX_VALUE);
  const ranking = candidates
    .map((citation) => ({
      citation,
      logit: logits[citation]!,
      score: 1 / (1 + Math.exp(-logits[citation]!)),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.citation < b.citation ? -1 : a.citation > b.citation ? 1 : 0),
    );
  const returned = ranking
    .filter((r) => r.score >= 0.001)
    .slice(0, 3)
    .map((r) => r.citation);
  const bestDistractor = ranking.find((r) => !relevant.includes(r.citation));
  const gold = relevant.map((citation) => {
    const position = ranking.findIndex((r) => r.citation === citation);
    const item = ranking[position];
    return {
      citation,
      rank: item ? position + 1 : null,
      logit: item?.logit ?? null,
      score: item?.score ?? null,
      marginVsBestDistractor:
        item && bestDistractor ? item.logit - bestDistractor.logit : null,
      bestDistractor: bestDistractor?.citation ?? null,
      reason: !item
        ? "candidate"
        : item.score < 0.001
          ? "cutoff"
          : returned.includes(citation)
            ? "returned"
            : "ranking",
    };
  });
  return { returned, ranking, gold };
}
