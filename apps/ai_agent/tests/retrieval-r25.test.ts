import { expect, test } from "bun:test";
import { eligibleR25, validateSelectionR25, auditDatasetR25 } from "../src/evaluation/r25-analysis.ts";
import { loadR2Corpus } from "../src/evaluation/retrieval-r2.ts";
import { generateR25 } from "../src/evaluation/r25-gemini.ts";

test("exhaustive candidates preserve metadata and stale exclusion without truncation", async () => {
  const corpus = await loadR2Corpus();
  const all = eligibleR25(corpus, { query: "diagnose" });
  expect(all.length).toBe(60);
  const telegram = eligibleR25(corpus, { query: "diagnose", providers: [" TELEGRAM "] });
  expect(telegram.length).toBeGreaterThan(24);
  expect(telegram.every(s => s.providers.includes("telegram") || s.providers.includes("generic"))).toBe(true);
  expect(eligibleR25([{ ...corpus[0]!, status: "stale" }], { query: "diagnose" })).toEqual([]);
  expect(() => eligibleR25(corpus, { query: "" })).toThrow();
  expect(() => eligibleR25(corpus, { query: "diagnose", limit: 4 })).toThrow();
});

test("Gemini preflight rejects excess tokens before generation and stops on quota errors", async () => {
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ totalTokens: 20000 }), { status: 200 });
  };
  await expect(generateR25("gemini-test", "fake", "input", ["a"], fetcher)).rejects.toThrow("token budget");
  expect(calls.length).toBe(1);
  expect(calls[0]).toEndWith(":countTokens");
  await expect(generateR25("gemini-test", "fake", "input", ["a"], async () => new Response("", { status: 429 }))).rejects.toThrow("429");
});

test("Gemini selection records usage and does not retain hidden reasoning", async () => {
  const fetcher = async (url: string) => new Response(JSON.stringify(url.endsWith(":countTokens") ? { totalTokens: 100 } : {
    candidates: [{ content: { parts: [{ text: "private", thought: true }, { text: '{"selected":["a"]}' }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, thoughtsTokenCount: 20, totalTokenCount: 130 },
  }));
  const result = await generateR25("gemini-test", "fake", "input", ["a"], fetcher);
  expect(result.selected).toEqual(["a"]);
  expect(result.usage.totalTokenCount).toBe(130);
  expect(JSON.stringify(result)).not.toContain("private");
});

test("reasoning selection rejects invented, duplicate and over-limit citations and permits none", () => {
  expect(validateSelectionR25({ selected: [] }, ["a"])).toEqual([]);
  expect(validateSelectionR25({ selected: ["a"] }, ["a"])).toEqual(["a"]);
  for (const raw of [{ selected: ["x"] }, { selected: ["a", "a"] }, { selected: ["a", "b", "c", "d"] }, { selected: [], reasoning: "private" }]) {
    expect(() => validateSelectionR25(raw, ["a", "b", "c", "d"])).toThrow();
  }
});

test("label corrections are versioned and require complete independent classifications", () => {
  const dataset = { version: "old", queries: [{ id: "q", relevantCitations: ["a"] }] };
  const packet = [{ id: "blind", query: "why", sections: [{ citation: "a" }, { citation: "b" }] }];
  const key = { blind: "q" };
  const review = { packetHash: "h", reviewer: "independent", independent: true, reviews: [{ id: "blind", sections: [{ citation: "a", relevance: "supporting", rationale: "Context only" }, { citation: "b", relevance: "direct", rationale: "Answers why" }] }] };
  const revised = auditDatasetR25(dataset, packet, key, review, "h");
  expect(revised.queries[0]!.relevantCitations).toEqual(["b"]);
  expect(dataset.queries[0]!.relevantCitations).toEqual(["a"]);
  expect(revised.version).toBe("r25-audited-v1");
  expect(() => auditDatasetR25(dataset, packet, key, { ...review, independent: false }, "h")).toThrow();
  expect(() => auditDatasetR25(dataset, packet, key, { ...review, reviews: [] }, "h")).toThrow();
  expect(() => auditDatasetR25(dataset, packet, key, review, "changed")).toThrow();
});
