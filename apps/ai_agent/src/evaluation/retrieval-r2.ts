import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { z } from "zod";
import {
  loadRunbooks,
  parseRunbook,
  searchRunbooks,
  type RunbookIndex,
  type RunbookMatch,
  type RunbookSearchInput,
} from "../tools/search-runbooks.ts";

export const r2Directory = fileURLToPath(
  new URL("../../evaluation/r2/", import.meta.url),
);
const baseDirectory = fileURLToPath(
  new URL("../../../../docs/AI/runbooks/", import.meta.url),
);
const extraFiles = [
  "telegram-cooldown.md",
  "telegram-destination.md",
  "email-rejection.md",
  "email-uncertain.md",
  "ordering-gap.md",
  "dlq-publication.md",
];
export const variants = [
  "weighted-keyword",
  "bm25",
  "semantic",
  "hybrid",
  "hybrid-reranked",
] as const;
export type Variant = (typeof variants)[number];
export type Scores = Record<string, number>;
export const QuerySchema = z
  .object({
    id: z.string().min(1).max(64),
    split: z.enum(["development", "held_out"]),
    kind: z.enum(["exact", "paraphrase", "ambiguous", "no_match"]),
    query: z.string().min(1).max(500),
    taxonomy: z.array(z.string()).max(10),
    providers: z.array(z.string()).max(10),
    relevantCitations: z.array(z.string()).max(8),
  })
  .strict();
export type Query = z.infer<typeof QuerySchema>;

export async function loadR2Corpus(): Promise<RunbookIndex> {
  const sections = [...(await loadRunbooks(baseDirectory))];
  for (const filename of extraFiles) {
    const path = join(r2Directory, "runbooks", filename);
    if ((await stat(path)).size > 65_536)
      throw new Error("R2 document too large");
    sections.push(...parseRunbook(await readFile(path, "utf8"), filename));
  }
  if (
    sections.length > 64 ||
    new Set(sections.map((s) => s.citation)).size !== sections.length
  )
    throw new Error("R2 corpus has duplicate citations or exceeds 64 sections");
  return sections;
}

export async function loadR2Queries(index: RunbookIndex): Promise<Query[]> {
  const queries = z
    .array(QuerySchema)
    .min(30)
    .max(50)
    .parse(
      JSON.parse(await readFile(join(r2Directory, "queries.json"), "utf8")),
    );
  const citations = new Set(index.map((s) => s.citation));
  if (
    new Set(queries.map((q) => q.id)).size !== queries.length ||
    new Set(queries.map((q) => q.query)).size !== queries.length
  )
    throw new Error("Duplicate R2 query or id");
  for (const q of queries) {
    if (
      (q.kind === "no_match") !== (q.relevantCitations.length === 0) ||
      new Set(q.relevantCitations).size !== q.relevantCitations.length ||
      q.relevantCitations.some((c) => !citations.has(c))
    )
      throw new Error(`Invalid R2 section labels: ${q.id}`);
    if (
      q.relevantCitations.some(
        (c) => !eligible(index, q).some((s) => s.citation === c),
      )
    )
      throw new Error(`Filtered R2 gold label: ${q.id}`);
  }
  for (const split of ["development", "held_out"]) {
    if (
      !queries.some((q) => q.split === split && q.kind === "no_match") ||
      !queries.some((q) => q.split === split && q.kind !== "no_match")
    )
      throw new Error("R2 split missing controls");
  }
  return queries;
}

function eligible(index: RunbookIndex, input: RunbookSearchInput) {
  // Reuse the production trust-boundary validation even for nonlexical variants.
  searchRunbooks([], input);
  const taxonomy =
    input.taxonomy?.map((v) => v.trim().toLowerCase()).filter(Boolean) ?? [];
  const providers =
    input.providers?.map((v) => v.trim().toLowerCase()).filter(Boolean) ?? [];
  return index.filter(
    (s) =>
      s.status === "current" &&
      (!taxonomy.length ||
        s.taxonomy.some((t) => taxonomy.includes(t.toLowerCase()))) &&
      (!providers.length ||
        s.providers.includes("generic") ||
        s.providers.some((p) => providers.includes(p))),
  );
}
const ignored = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "is",
  "of",
  "or",
  "the",
  "to",
  "with",
]);
const terms = (text: string) =>
  (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => !ignored.has(t));
type Ranked = { section: RunbookIndex[number]; score: number };
const sort = (rows: Ranked[]) =>
  rows.sort(
    (a, b) =>
      b.score - a.score ||
      (a.section.citation < b.section.citation
        ? -1
        : a.section.citation > b.section.citation
          ? 1
          : 0),
  );

function lexical(index: RunbookIndex, query: string, bm25: boolean): Ranked[] {
  const docs = index.map((s) => terms(`${s.heading} ${s.content}`));
  const average =
    docs.reduce((sum, d) => sum + d.length, 0) / (docs.length || 1);
  const tokens = [...new Set(terms(query))];
  return sort(
    index.map((section, i) => ({
      section,
      score: tokens.reduce((sum, t) => {
        if (!bm25)
          return (
            sum +
            (section.headingTerms.has(t) ? 3 : 0) +
            (section.contentTerms.has(t) ? 1 : 0) +
            (section.taxonomy.some((v) => v.toLowerCase() === t) ? 5 : 0) +
            (section.providers.includes(t) ? 2 : 0)
          );
        const doc = docs[i]!;
        const tf = doc.filter((v) => v === t).length;
        const df = docs.filter((d) => d.includes(t)).length;
        return (
          sum +
          (tf
            ? (Math.log(1 + (docs.length - df + 0.5) / (df + 0.5)) * tf * 2.2) /
              (tf + 1.2 * (0.25 + (0.75 * doc.length) / average))
            : 0)
        );
      }, 0),
    })),
  ).filter((r) => r.score > 0);
}

export function validateScores(
  scores: Scores,
  citations: readonly string[],
  minimum = -1,
  maximum = 1,
) {
  if (
    Object.keys(scores).length !== citations.length ||
    citations.some(
      (c) =>
        !Number.isFinite(scores[c]) ||
        scores[c]! < minimum ||
        scores[c]! > maximum,
    )
  )
    throw new Error("Incomplete, unknown, or invalid model scores");
}

export function rankR2(
  index: RunbookIndex,
  input: RunbookSearchInput,
  variant: Variant,
  semantic: Scores = {},
  rerank: Scores = {},
  thresholds = { semantic: 0.4, rerank: 0.5 },
  candidateLimit = 3,
): RunbookMatch[] {
  if (
    ![3, 12].includes(candidateLimit) ||
    (candidateLimit === 12 && variant !== "hybrid")
  )
    throw new RangeError("Only hybrid candidate retrieval may exceed three");
  if (
    !Number.isFinite(thresholds.semantic) ||
    thresholds.semantic < -1 ||
    thresholds.semantic > 1 ||
    !Number.isFinite(thresholds.rerank) ||
    thresholds.rerank < 0 ||
    thresholds.rerank > 1
  )
    throw new RangeError("Invalid threshold");
  const corpus = eligible(index, input);
  let rows: Ranked[];
  if (variant === "weighted-keyword" || variant === "bm25")
    rows = lexical(corpus, input.query, variant === "bm25");
  else {
    if (corpus.some((s) => !Number.isFinite(semantic[s.citation])))
      throw new Error("Missing semantic score");
    const dense = sort(
      corpus
        .map((section) => ({ section, score: semantic[section.citation]! }))
        .filter((r) => r.score >= thresholds.semantic),
    );
    if (variant === "semantic") rows = dense;
    else {
      const fused = new Map<string, Ranked>();
      for (const list of [lexical(corpus, input.query, true), dense]) {
        list.slice(0, 12).forEach((r, i) => {
          const previous = fused.get(r.section.citation);
          fused.set(r.section.citation, {
            section: r.section,
            score: (previous?.score ?? 0) + 1 / (60 + i + 1),
          });
        });
      }
      rows = sort([...fused.values()]).slice(0, 12);
      if (variant === "hybrid-reranked") {
        if (
          rows.some(
            (r) =>
              !Number.isFinite(rerank[r.section.citation]) ||
              rerank[r.section.citation]! < 0 ||
              rerank[r.section.citation]! > 1,
          )
        )
          throw new Error("Missing or invalid reranker score");
        rows = sort(
          rows
            .map((r) => ({ ...r, score: rerank[r.section.citation]! }))
            .filter((r) => r.score >= thresholds.rerank),
        );
      }
    }
  }
  return rows
    .slice(0, candidateLimit === 12 ? 12 : (input.limit ?? 3))
    .map(({ section: s, score }) => ({
      runbookId: s.id,
      version: s.version,
      citation: s.citation,
      heading: s.heading,
      content: s.content,
      contentHash: s.contentHash,
      taxonomy: s.taxonomy,
      providers: s.providers,
      simulated: true,
      authority: "untrusted_procedural_guidance",
      canChangePolicy: false,
      score: Math.max(0, score),
    }));
}

export function summarizeR2(
  rows: readonly {
    relevant: readonly string[];
    returned: readonly string[];
    latencyMs: number;
  }[],
) {
  const positive = rows.filter((r) => r.relevant.length);
  const negative = rows.filter((r) => !r.relevant.length);
  const mean = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return {
    queryCount: rows.length,
    relevantQueryCount: positive.length,
    noMatchQueryCount: negative.length,
    recallAt3: mean(
      positive.map(
        (r) =>
          r.relevant.filter((c) => r.returned.includes(c)).length /
          r.relevant.length,
      ),
    ),
    mrr: mean(
      positive.map((r) => {
        const i = r.returned.findIndex((c) => r.relevant.includes(c));
        return i < 0 ? 0 : 1 / (i + 1);
      }),
    ),
    noMatchAccuracy: mean(negative.map((r) => (r.returned.length ? 0 : 1))),
    averageLatencyMs: mean(rows.map((r) => r.latencyMs)),
  };
}

export function calibrateR2(
  index: RunbookIndex,
  queries: readonly Query[],
  scores: Record<string, Scores>,
  reranks: Record<string, Scores>,
) {
  const dev = queries.filter((q) => q.split === "development");
  const pick = (variant: Variant, values: number[]) =>
    values
      .map((value) => {
        const thresholds = {
          semantic: variant === "semantic" ? value : 0.4,
          rerank: variant === "hybrid-reranked" ? value : 0.5,
        };
        const metrics = summarizeR2(
          dev.map((q) => ({
            relevant: q.relevantCitations,
            returned: rankR2(
              index,
              q,
              variant,
              scores[q.id],
              reranks[q.id],
              thresholds,
            ).map((m) => m.citation),
            latencyMs: 0,
          })),
        );
        return {
          value,
          objective: (metrics.recallAt3 ?? 0) + (metrics.noMatchAccuracy ?? 0),
          mrr: metrics.mrr ?? 0,
        };
      })
      .sort(
        (a, b) =>
          b.objective - a.objective || b.mrr - a.mrr || b.value - a.value,
      )[0]!.value;
  const semantic = pick("semantic", [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
  // Rerank inputs are captured for the candidate union across all thresholds.
  const candidates = [0.1, 0.3, 0.5, 0.7, 0.9]
    .map((rerank) => {
      const metrics = summarizeR2(
        dev.map((q) => ({
          relevant: q.relevantCitations,
          returned: rankR2(
            index,
            q,
            "hybrid-reranked",
            scores[q.id],
            reranks[q.id],
            { semantic, rerank },
          ).map((m) => m.citation),
          latencyMs: 0,
        })),
      );
      return {
        rerank,
        objective: (metrics.recallAt3 ?? 0) + (metrics.noMatchAccuracy ?? 0),
        mrr: metrics.mrr ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.objective - a.objective || b.mrr - a.mrr || b.rerank - a.rerank,
    );
  return { semantic, rerank: candidates[0]!.rerank };
}
