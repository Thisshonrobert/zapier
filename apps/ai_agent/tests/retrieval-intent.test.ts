import { expect, test } from "bun:test";
import {
  classifyIntent,
  conditionQuery,
  intentMetrics,
  validateBenchmark,
} from "../src/evaluation/retrieval-intent.ts";

test("query classification follows requested task rather than incident vocabulary", () => {
  expect(
    classifyIntent("What evidence should I collect before credential repair?"),
  ).toBe("EVIDENCE_GATHERING");
  expect(
    classifyIntent("Which repair is allowed after collecting evidence?"),
  ).toBe("REMEDIATION");
  expect(classifyIntent("What actions are forbidden after a timeout?")).toBe(
    "CONSTRAINTS",
  );
  expect(classifyIntent("Why did interpolation produce an empty value?")).toBe(
    "ROOT_CAUSE",
  );
  expect(classifyIntent("Telegram failed")).toBeNull();
  expect(conditionQuery("Telegram failed")).toBe("Telegram failed");
});

test("precision exposes wrong-intent extras even at perfect recall", () => {
  const result = intentMetrics([
    { relevant: ["gold"], returned: ["gold", "repair"], latencyMs: 0 },
  ]);
  expect(result.recallAt3).toBe(1);
  expect(result.precisionAt3).toBe(0.5);
});

test("benchmark rejects held-out records and labels not supported by passages", () => {
  const q = {
    id: "a",
    split: "development",
    intent: "EVIDENCE_GATHERING",
    query: "What evidence should I collect?",
    providers: [],
    taxonomy: [],
    relevantCitations: ["c"],
    support: { c: "captured status" },
  };
  expect(() =>
    validateBenchmark([q], { c: "Evidence needed\ncaptured status" }),
  ).not.toThrow();
  expect(() =>
    validateBenchmark([{ ...q, split: "held_out" }], { c: "captured status" }),
  ).toThrow();
  expect(() =>
    validateBenchmark([q], { c: "Allowed remediation\nrepair it" }),
  ).toThrow();
});
