import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  retrievalExperimentCases,
  runRetrievalExperiment,
} from "../src/evaluation/retrieval-experiment.ts";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";

const repositoryRunbooks = join(import.meta.dir, "../../../docs/AI/runbooks");

describe("R1 retrieval experiment", () => {
  test("compares bounded, citation-valid rankings and preserves the no-match control", async () => {
    const index = await loadRunbooks(repositoryRunbooks);

    const result = runRetrievalExperiment(index, retrievalExperimentCases);

    expect(result.variants).toHaveLength(2);
    expect(result.noMatchPassed).toBe(true);
    expect(result.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "weighted-keyword",
          development: expect.objectContaining({ queryCount: 6 }),
          heldOut: expect.objectContaining({ queryCount: 6 }),
          citationValid: true,
          bounded: true,
        }),
        expect.objectContaining({
          name: "bm25",
          development: expect.objectContaining({ queryCount: 6 }),
          heldOut: expect.objectContaining({ queryCount: 6 }),
          citationValid: true,
          bounded: true,
        }),
      ]),
    );
  });
});
