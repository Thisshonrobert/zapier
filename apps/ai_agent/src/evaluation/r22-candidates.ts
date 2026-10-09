import { searchRunbooks, type RunbookIndex, type RunbookSearchInput } from "../tools/search-runbooks.ts";
import type { Scores } from "./retrieval-r2.ts";

// Frozen R2 BM25/eligibility/RRF arithmetic, isolated so r21-v1 stays untouched.
// The only algorithm change is retaining the branch union (<=24), not its top 12.
export function candidatesR22(index: RunbookIndex, input: RunbookSearchInput, semantic: Scores) {
  searchRunbooks([], input);
  const taxonomy = input.taxonomy?.map(v => v.trim().toLowerCase()).filter(Boolean) ?? [];
  const providers = input.providers?.map(v => v.trim().toLowerCase()).filter(Boolean) ?? [];
  const corpus = index.filter(s => s.status === "current" &&
    (!taxonomy.length || s.taxonomy.some(t => taxonomy.includes(t.toLowerCase()))) &&
    (!providers.length || s.providers.includes("generic") || s.providers.some(p => providers.includes(p))));
  if (corpus.some(s => !Number.isFinite(semantic[s.citation]))) throw new Error("Missing semantic score");
  const ignored = new Set(["a", "an", "and", "are", "for", "is", "of", "or", "the", "to", "with"]);
  const terms = (text: string) => (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(t => !ignored.has(t));
  type Ranked = { section: RunbookIndex[number]; score: number };
  const sort = (rows: Ranked[]) => rows.sort((a, b) => b.score - a.score ||
    (a.section.citation < b.section.citation ? -1 : a.section.citation > b.section.citation ? 1 : 0));
  const docs = corpus.map(s => terms(`${s.heading} ${s.content}`));
  const average = docs.reduce((sum, d) => sum + d.length, 0) / (docs.length || 1);
  const tokens = [...new Set(terms(input.query))];
  const lexical = sort(corpus.map((section, i) => ({ section, score: tokens.reduce((sum, t) => {
    const doc = docs[i]!;
    const tf = doc.filter(v => v === t).length;
    const df = docs.filter(d => d.includes(t)).length;
    return sum + (tf ? (Math.log(1 + (docs.length - df + 0.5) / (df + 0.5)) * tf * 2.2) /
      (tf + 1.2 * (0.25 + (0.75 * doc.length) / average)) : 0);
  }, 0) }))).filter(r => r.score > 0);
  const dense = sort(corpus.map(section => ({ section, score: semantic[section.citation]! })).filter(r => r.score >= 0.2));
  const fused = new Map<string, Ranked>();
  for (const list of [lexical, dense]) {
    list.slice(0, 12).forEach((r, i) => {
      fused.set(r.section.citation, { section: r.section, score: (fused.get(r.section.citation)?.score ?? 0) + 1 / (60 + i + 1) });
    });
  }
  return sort([...fused.values()]).map(r => ({ ...r.section, score: r.score }));
}
