import { describe, expect, test } from "bun:test";

import { verifyTargetCorpus } from "../src/evaluation/retrieval-target.ts";

describe("target corpus drift", () => {
  test("rejects a corpus that differs from the frozen artifact", () => {
    const frozen = { corpusHash: "a".repeat(64), sections: [] };
    expect(() => verifyTargetCorpus([], frozen as never)).toThrow(
      "Target corpus changed",
    );
  });
});
