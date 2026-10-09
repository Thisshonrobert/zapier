import { expect, test } from "bun:test";
import { loadRunbooks, searchRunbooks } from "../src/tools/search-runbooks.ts";
import { defaultRunbookDirectory } from "../src/paths.ts";
import { createRunbookRetriever } from "../src/tools/runbook-retriever.ts";

const index = await loadRunbooks(defaultRunbookDirectory());
const input = { query: "Telegram rate limit evidence", providers: ["telegram"] };

test("default and rollback use exact keyword output without loading a model", async () => {
  const retriever = await createRunbookRetriever(index, {});
  expect(await retriever.search(input)).toEqual(searchRunbooks(index, input));
  await retriever.close();
  await expect(createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "typo" })).rejects.toThrow();
});

test("MiniLM scores all eligible original passages and preserves citation contracts", async () => {
  let count = 0;
  const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "minilm-original" }, async () => ({
    score: async (query, passages) => {
      expect(query).toBe(input.query);
      expect(passages.every(p => p.includes("\n"))).toBe(true);
      count = passages.length;
      return passages.map(() => 0);
    }, close: async () => {},
  }));
  const result = await retriever.search(input);
  expect(count).toBeGreaterThan(3);
  expect(count).toBe(index.filter(s => s.providers.includes("telegram") || s.providers.includes("generic")).length);
  expect(result).toHaveLength(3);
  expect(result.map(r => r.citation)).toEqual([...result.map(r => r.citation)].sort((a,b) => a.localeCompare(b)));
  for (const match of result) {
    expect(match.score).toBe(0.5);
    expect(match.canChangePolicy).toBe(false);
    expect(match.authority).toBe("untrusted_procedural_guidance");
    expect(match.contentHash).toBe(index.find(s => s.citation === match.citation)!.contentHash);
  }
  await retriever.close();
});

test("MiniLM abstention is never replaced by keyword overlap", async () => {
  expect(searchRunbooks(index, input).length).toBeGreaterThan(0);
  const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "minilm-original" }, async () => ({
    score: async (_, passages) => passages.map(() => -20), close: async () => {},
  }));
  expect(await retriever.search(input)).toEqual([]);
  expect(await retriever.search({ ...input, taxonomy: ["F03"], providers: ["nonexistent"] })).toEqual([]);
  await expect(retriever.search({ query: "" })).rejects.toThrow();
  await retriever.close();
});

test("invalid scores and model errors fail closed", async () => {
  for (const score of [async () => [NaN], async () => { throw new Error("unavailable"); }]) {
    const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "minilm-original" }, async () => ({ score, close: async () => {} }));
    await expect(retriever.search(input)).rejects.toThrow();
    await retriever.close();
  }
});

test("opt-in fails at startup when pinned local files are unavailable", async () => {
  await expect(createRunbookRetriever(index, {
    RUNBOOK_RETRIEVAL_METHOD: "minilm-original",
    RUNBOOK_MINILM_CACHE_DIR: "__missing_minilm_cache_for_test__",
  })).rejects.toThrow("MiniLM scoring unavailable");
});
