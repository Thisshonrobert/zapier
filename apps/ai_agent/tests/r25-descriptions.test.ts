import { expect, test } from "bun:test";
import { descriptivePassagesR25 } from "../src/evaluation/r25-descriptions.ts";
test("descriptions cover the corpus exactly and never substitute citation content", () => {
  const corpus = [{ citation: "a", heading: "Evidence", content: "Captured status", contentHash: "original" }];
  expect(descriptivePassagesR25(corpus, { a: "Provider failure evidence" })).toEqual({ a: "Section description: Provider failure evidence\nEvidence\nCaptured status" });
  expect(corpus[0]!.contentHash).toBe("original");
  expect(() => descriptivePassagesR25(corpus, {})).toThrow();
  expect(() => descriptivePassagesR25(corpus, { a: "valid", b: "extra" })).toThrow();
  expect(() => descriptivePassagesR25(corpus, { a: "" })).toThrow();
});
