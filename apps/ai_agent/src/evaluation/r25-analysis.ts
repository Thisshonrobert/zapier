import { z } from "zod";
import { searchRunbooks, type RunbookIndex, type RunbookSearchInput } from "../tools/search-runbooks.ts";

export function eligibleR25(index: RunbookIndex, input: RunbookSearchInput) {
  searchRunbooks([], input);
  const normalize = (values: readonly string[] = []) => values.map(v => v.trim().toLowerCase()).filter(Boolean);
  const taxonomy = normalize(input.taxonomy), providers = normalize(input.providers);
  return index.filter(s => s.status === "current" &&
    (!taxonomy.length || s.taxonomy.some(t => taxonomy.includes(t.toLowerCase()))) &&
    (!providers.length || s.providers.includes("generic") || s.providers.some(p => providers.includes(p))))
    .sort((a, b) => a.citation.localeCompare(b.citation));
}

export function validateSelectionR25(raw: unknown, candidates: readonly string[]) {
  const { selected } = z.object({ selected: z.array(z.string()).max(3) }).strict().parse(raw);
  if (new Set(selected).size !== selected.length || selected.some(c => !candidates.includes(c)))
    throw new Error("Invalid candidate selection");
  return selected;
}

const ReviewSchema = z.object({
  packetHash: z.string(), reviewer: z.string().min(1), independent: z.literal(true),
  reviews: z.array(z.object({ id: z.string(), sections: z.array(z.object({
    citation: z.string(), relevance: z.enum(["direct", "supporting", "irrelevant"]), rationale: z.string().min(1).max(2000),
  }).strict()) }).strict()),
}).strict();

export function auditDatasetR25<T extends { version: string; queries: { id: string; relevantCitations: string[] }[] }>(
  dataset: T,
  packet: readonly { id: string; sections: readonly { citation: string }[] }[],
  key: Record<string, string>, raw: unknown, packetHash: string,
) {
  const review = ReviewSchema.parse(raw);
  if (review.packetHash !== packetHash || review.reviews.length !== packet.length ||
      new Set(review.reviews.map(r => r.id)).size !== packet.length)
    throw new Error("Incomplete or changed review packet");
  const labels = new Map<string, string[]>();
  for (const p of packet) {
    const r = review.reviews.find(r => r.id === p.id);
    if (!r || !key[p.id] || r.sections.length !== p.sections.length ||
        new Set(r.sections.map(s => s.citation)).size !== p.sections.length ||
        r.sections.some(s => !p.sections.some(c => c.citation === s.citation)))
      throw new Error("Incomplete section adjudication");
    labels.set(key[p.id]!, r.sections.filter(s => s.relevance === "direct").map(s => s.citation).sort());
  }
  return { ...dataset, version: "r25-audited-v1", queries: dataset.queries.map(q => ({
    ...q, relevantCitations: labels.get(q.id) ?? [...q.relevantCitations],
  })) };
}
