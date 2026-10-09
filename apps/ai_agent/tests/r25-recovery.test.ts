import { expect, test } from "bun:test";
import { recoverR25, recoveryPolicyR25 } from "../src/evaluation/r25-recover.ts";

const query = (id: string) => ({ id, query: "synthetic question", candidates: ["section"], passages: { section: "simulated runbook" } });
const record = { selected: ["section"], usage: { totalTokenCount: 10 }, reservedTokens: 20, latencyMs: 1 };
const clock = () => { let now = 0; return { now: () => now, sleep: async (ms: number) => { now += ms; } }; };

test("recovery retries transient failures once, paces starts and preserves successes", async () => {
  const time = clock(), starts: number[] = [];
  const prior = { done: record };
  const result = await recoverR25([query("done"), query("new")], prior, [], async () => {
    starts.push(time.now());
    if (starts.length === 1) throw new Error("Gemini HTTP 503");
    return record;
  }, time);
  expect(starts).toEqual([30000, 90000]);
  expect(prior).toEqual({ done: record });
  expect(result.records).toEqual({ done: record, new: record });
  expect(result.attempts.length).toBe(2);
  expect(result.stopReason).toBe("complete");
});

test("quota exhaustion stops without retry or invented abstention", async () => {
  let calls = 0;
  const result = await recoverR25([query("one"), query("two")], {}, [], async () => {
    calls++; throw new Error("Gemini HTTP 429");
  }, clock());
  expect(calls).toBe(1);
  expect(result.records).toEqual({});
  expect(result.stopReason).toBe("quota exhausted");
  expect(result.attempts[0]?.category).toBe("Gemini HTTP 429");
});

test("historical failure has only one additional attempt and exhausted retries stop", async () => {
  let calls = 0;
  const result = await recoverR25([query("failed"), query("later")], {}, ["failed"], async () => {
    calls++; throw new Error("Gemini HTTP 503");
  }, clock());
  expect(calls).toBe(1);
  expect(result.stopReason).toBe("retry limit exhausted");
});

test("attempt, token and deadline budgets stop before another call", async () => {
  const queries = Array.from({ length: 74 }, (_, i) => query(String(i)));
  const result = await recoverR25(queries, {}, [], async () => record, clock());
  expect(result.attempts.length).toBe(recoveryPolicyR25.maxAttempts);
  expect(result.reservedTokens).toBe(1440000);
  expect(result.stopReason).toBe("attempt/token budget exhausted");
  const time = clock();
  const expired = await recoverR25([query("a")], {}, [], async () => record,
    { now: time.now, sleep: async () => { await time.sleep(3600000); } });
  expect(expired.attempts).toHaveLength(0);
  expect(expired.stopReason).toBe("deadline exhausted");
});

test("invalid responses stop without retry; successful empty selection remains an abstention", async () => {
  const invalid = await recoverR25([query("a")], {}, [], async () => { throw new Error("Gemini malformed selection"); }, clock());
  expect(invalid.attempts).toHaveLength(1);
  expect(invalid.records).toEqual({});
  expect(invalid.stopReason).toBe("non-retryable failure");
  const empty = await recoverR25([query("a")], {}, [], async () => ({ ...record, selected: [] }), clock());
  expect(empty.records.a?.selected).toEqual([]);
  expect(empty.stopReason).toBe("complete");
});
