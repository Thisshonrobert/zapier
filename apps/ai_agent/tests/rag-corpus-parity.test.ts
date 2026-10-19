import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  canonicalSections,
  loadFrozenCorpus,
} from "../src/evaluation/retrieval-target.ts";
import { defaultRunbookDirectory } from "../src/paths.ts";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";

const artifact = join(import.meta.dir, "../evaluation/r3/corpus-v1.json");

describe("frozen target-recovery corpus", () => {
  test("matches the six runbooks actually served", async () => {
    const frozen = await loadFrozenCorpus(artifact);
    const index = await loadRunbooks(defaultRunbookDirectory());
    const sections = canonicalSections(index);

    expect(index).toHaveLength(55);
    expect(sections).toEqual(frozen.sections);
    expect(index.filter((section) => section.id === "RB-F01-F02")).toHaveLength(10);
    expect(frozen.corpusHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
