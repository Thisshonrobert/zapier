import { expect, test } from "bun:test";
import { loadRunbooks, searchRunbooks } from "../src/tools/search-runbooks.ts";
import { defaultRunbookDirectory } from "../src/paths.ts";
import { createRunbookRetriever } from "../src/tools/runbook-retriever.ts";

const index = await loadRunbooks(defaultRunbookDirectory());
const input = { query: "Telegram rate limit evidence", providers: ["telegram"] };

test("explicit rollback uses exact keyword output without loading a model", async () => {
  const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "keyword" });
  expect(await retriever.search(input)).toEqual(searchRunbooks(index, input));
  await retriever.close();
  await expect(createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "typo" })).rejects.toThrow();
});

test("default uses original MiniLM without rewriting the observed query", async () => {
  let scored = false;
  const retriever = await createRunbookRetriever(index, {}, async () => ({
    score: async (query, passages) => {
      expect(query).toBe(input.query);
      scored = true;
      return passages.map(() => -20);
    }, close: async () => {},
  }));
  expect(await retriever.search(input)).toEqual([]);
  expect(scored).toBe(true);
  await retriever.close();
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

test("structured-minilm packs requested facets and preserves the match contract", async () => {
  const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "structured-minilm" }, async () => ({
    score: async (_query, passages) => passages.map(() => 0),
    close: async () => {},
  }));
  const result = await retriever.search({
    query: "429",
    providers: ["telegram"],
    route: { hints: ["F01"], confident: true, reasons: ["provider_status:429"] },
    requestedFacets: ["evidence", "verification"],
    limit: 3,
  });
  expect(result.length).toBeLessThanOrEqual(3);
  expect(result.some((match) => match.heading === "Evidence needed")).toBe(true);
  expect(result.some((match) => match.heading === "Verification, rollback, or escalation")).toBe(true);
  expect(result.every((match) => match.canChangePolicy === false)).toBe(true);
  await retriever.close();
});

test("structured-minilm ranks without facet reservation when no facet is requested", async () => {
  const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "structured-minilm" }, async () => ({
    score: async (_query, passages) => passages.map(() => 0),
    close: async () => {},
  }));
  const result = await retriever.search({ ...input, route: { hints: ["F01"], confident: true, reasons: [] } });
  expect(result).toHaveLength(3);
  expect(result.map((match) => match.citation)).toEqual(
    [...result.map((match) => match.citation)].sort((left, right) => left.localeCompare(right)),
  );
  await retriever.close();
});

test("structured abstention is never replaced by keyword overlap", async () => {
  expect(searchRunbooks(index, input).length).toBeGreaterThan(0);
  const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "structured-minilm" }, async () => ({
    score: async (_, passages) => passages.map(() => 0), close: async () => {},
  }));
  expect(await retriever.search(input)).toEqual([]);
  await retriever.close();
});

test("structured-minilm never falls back to keyword and fails closed on bad scores", async () => {
  const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "structured-minilm" }, async () => ({
    score: async (_, passages) => passages.map(() => Number.NaN), close: async () => {},
  }));
  await expect(retriever.search(input)).rejects.toThrow("Invalid MiniLM scores");
  await retriever.close();

  const empty = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "structured-minilm" }, async () => ({
    score: async (_, passages) => passages.map(() => -20), close: async () => {},
  }));
  expect(searchRunbooks(index, input).length).toBeGreaterThan(0);
  expect(await empty.search(input)).toEqual([]);
  expect(await empty.search({ ...input, taxonomy: ["F03"], providers: ["nonexistent"] })).toEqual([]);
  await empty.close();
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
