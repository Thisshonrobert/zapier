import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  loadR2Corpus,
  loadR2Queries,
  rankR2,
  summarizeR2,
  validateScores,
  calibrateR2,
} from "../src/evaluation/retrieval-r2.ts";

test("R2 has 12 useful runbooks and 40 valid section labels with disjoint splits", async () => {
  const index = await loadR2Corpus();
  const queries = await loadR2Queries(index);
  expect(new Set(index.map((s) => s.id)).size).toBe(12);
  expect(queries).toHaveLength(40);
  expect(queries.filter((q) => q.split === "held_out")).toHaveLength(20);
});

test("all variants share filters, exclude stale sections, bound excerpts, and preserve hashes", async () => {
  const corpus = await loadR2Corpus();
  const stale = { ...corpus[0]!, status: "stale" as const };
  const index = [stale, ...corpus.slice(1)];
  const query = {
    query: "Telegram rate limit",
    taxonomy: ["F01"],
    providers: ["telegram"],
  };
  const scores = Object.fromEntries(corpus.map((s) => [s.citation, 0.9]));
  for (const variant of [
    "weighted-keyword",
    "bm25",
    "semantic",
    "hybrid",
    "hybrid-reranked",
  ] as const) {
    const result = rankR2(index, query, variant, scores, scores, {
      semantic: 0.5,
      rerank: 0.5,
    });
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.some((s) => s.citation === stale.citation)).toBe(false);
    for (const match of result) {
      expect(match.taxonomy).toContain("F01");
      expect(match.authority).toBe("untrusted_procedural_guidance");
      expect(match.canChangePolicy).toBe(false);
      expect(match.contentHash).toBe(
        index.find((s) => s.citation === match.citation)!.contentHash,
      );
    }
  }
  expect(() =>
    rankR2(index, { query: "x".repeat(501) }, "semantic", scores),
  ).toThrow();
  expect(() =>
    rankR2(
      index,
      { query: "hello", providers: Array(11).fill("a") },
      "semantic",
      scores,
    ),
  ).toThrow();
});

test("R2 uses fractional section recall, excludes no-match from MRR, and reports false positives", () => {
  const result = summarizeR2([
    { relevant: ["a", "b"], returned: ["c", "b", "d"], latencyMs: 2 },
    { relevant: [], returned: ["c"], latencyMs: 4 },
  ]);
  expect(result.recallAt3).toBe(0.5);
  expect(result.mrr).toBe(0.5);
  expect(result.noMatchAccuracy).toBe(0);
  expect(result.averageLatencyMs).toBe(3);
});

test("semantic abstention and larger candidate reranking are deterministic and reject invalid scores", async () => {
  const index = await loadR2Corpus();
  const query = { query: "quantum orchard" };
  const scores = Object.fromEntries(index.map((s) => [s.citation, 0.1]));
  expect(
    rankR2(
      index,
      query,
      "semantic",
      scores,
      {},
      { semantic: 0.5, rerank: 0.5 },
    ),
  ).toEqual([]);
  const high = Object.fromEntries(index.map((s) => [s.citation, 0.9]));
  const hybrid = rankR2(
    index,
    query,
    "hybrid",
    high,
    {},
    { semantic: 0.5, rerank: 0.5 },
    12,
  );
  expect(hybrid).toHaveLength(12);
  const rerank = { ...scores, [hybrid[8]!.citation]: 0.99 };
  expect(
    rankR2(index, query, "hybrid-reranked", high, rerank, {
      semantic: 0.5,
      rerank: 0.5,
    })[0]?.citation,
  ).toBe(hybrid[8]!.citation);
  expect(() => validateScores({ a: NaN }, ["a"])).toThrow();
  expect(() => validateScores({}, ["a"])).toThrow();
  expect(() => validateScores({ a: 0.2, fabricated: 0.8 }, ["a"])).toThrow();
});

test("threshold calibration never reads held-out labels or scores", async () => {
  const index = await loadR2Corpus();
  const queries = await loadR2Queries(index);
  const dev = queries.filter((q) => q.split === "development");
  const semantic = Object.fromEntries(
    dev.map((q) => [
      q.id,
      Object.fromEntries(
        index.map((s) => [
          s.citation,
          q.relevantCitations.includes(s.citation) ? 0.8 : 0.1,
        ]),
      ),
    ]),
  );
  const rerank = Object.fromEntries(
    dev.map((q) => [
      q.id,
      Object.fromEntries(
        index.map((s) => [
          s.citation,
          q.relevantCitations.includes(s.citation) ? 0.95 : 0.05,
        ]),
      ),
    ]),
  );
  const first = calibrateR2(index, queries, semantic, rerank);
  const changed = queries.map((q) =>
    q.split === "held_out"
      ? { ...q, relevantCitations: ["fabricated-label"] }
      : q,
  );
  expect(calibrateR2(index, changed, semantic, rerank)).toEqual(first);
});

test("frozen R2 replay preserves diagnoses without model calls and rejects changed labels", async () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const results = "apps/ai_agent/evaluation/r2/results";
  const output = `.tmp-turbo-user/r2-replay-test-${crypto.randomUUID()}`;
  await mkdir(join(root, output), { recursive: true });
  const run = (report: string) =>
    execFileSync(
      process.execPath,
      [
        "apps/ai_agent/src/evaluation/run-r2.ts",
        "--scores",
        `${results}/scores.json`,
        "--diagnosis-report",
        report,
        "--output",
        output,
      ],
      { cwd: root, stdio: "pipe", timeout: 30_000 },
    );
  const saved = JSON.parse(
    await readFile(join(root, results, "report.json"), "utf8"),
  );
  run(`${results}/report.json`);
  const replayed = JSON.parse(
    await readFile(join(root, output, "report.json"), "utf8"),
  );
  expect(replayed.diagnosis.invocations).toBe(saved.diagnosis.invocations);
  expect(replayed.diagnosis.accountedTokens).toBe(
    saved.diagnosis.accountedTokens,
  );
  expect(
    replayed.diagnosis.downstream.map(
      (d: { abstained: number }) => d.abstained,
    ),
  ).toEqual([2, 2, 2, 2, 2]);
  expect(
    replayed.rankings.map(
      (r: { heldOut: { recallAt3: number } }) => r.heldOut.recallAt3,
    ),
  ).toEqual(
    saved.rankings.map(
      (r: { heldOut: { recallAt3: number } }) => r.heldOut.recallAt3,
    ),
  );
  const invalid = `${output}/changed-labels.json`;
  await writeFile(
    join(root, invalid),
    JSON.stringify({ ...saved, labelsHash: "0".repeat(64) }),
  );
  expect(() => run(invalid)).toThrow();
});
