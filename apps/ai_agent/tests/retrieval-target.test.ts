import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  loadTargetCases,
  loadTargetLabels,
  scoreTarget,
  verifyTargetCorpus,
  type FrozenCorpus,
  type TargetCase,
  type TargetOutput,
} from "../src/evaluation/retrieval-target.ts";
import { loadRunbooks, type RunbookIndex } from "../src/tools/search-runbooks.ts";
import { rankRouteOnly } from "../src/tools/structured-ranking.ts";

const r3 = join(import.meta.dir, "../evaluation/r3");

describe("target corpus drift", () => {
  test("rejects a corpus that differs from the frozen artifact", () => {
    const frozen = { corpusHash: "a".repeat(64), sections: [] };
    expect(() => verifyTargetCorpus([], frozen as never)).toThrow(
      "Target corpus changed",
    );
  });

  test("accepts the frozen corpus loaded from disk", async () => {
    const frozen = JSON.parse(
      await readFile(join(r3, "corpus-v1.json"), "utf8"),
    ) as FrozenCorpus;
    const index = await loadRunbooks(
      join(import.meta.dir, "../../../docs/AI/runbooks"),
    );
    expect(() => verifyTargetCorpus(index, frozen)).not.toThrow();
  });
});

const section = (id: string): RunbookIndex[number] => ({
  id: "RB-A",
  version: "1.0.0",
  simulated: true,
  status: "current",
  owner: "AI operations",
  reviewed: "2026-10-19",
  taxonomy: ["F01"],
  providers: ["generic"],
  codeVersion: "test",
  citation: `RB-A@1.0.0#${id}`,
  heading: id,
  content: `${id} content`,
  contentHash: "a".repeat(64),
  headingTerms: new Set([id]),
  contentTerms: new Set([id]),
});

const index = [section("a"), section("b"), section("c"), section("x")];
const input = { query: "observed failure", limit: 3 } as const;
const base: Pick<TargetCase, "split" | "supporting" | "missingRuntimeFacts"> = {
  split: "development",
  supporting: [],
  missingRuntimeFacts: [],
};

describe("sufficient-guidance metric", () => {
  test("counts a hit only when every required facet is covered", () => {
    const cases: TargetCase[] = [
      {
        ...base,
        id: "hit",
        kind: "answerable",
        input,
        requiredFacets: [
          { facet: "evidence", accepted: ["RB-A@1.0.0#a"] },
          { facet: "verification", accepted: ["RB-A@1.0.0#b"] },
        ],
      },
      {
        ...base,
        id: "miss",
        kind: "answerable",
        input,
        requiredFacets: [
          { facet: "evidence", accepted: ["RB-A@1.0.0#a"] },
          { facet: "verification", accepted: ["RB-A@1.0.0#b"] },
        ],
      },
      { ...base, id: "negative", kind: "no_match", input, requiredFacets: [] },
    ];
    const outputs: TargetOutput[] = [
      { id: "hit", returned: ["RB-A@1.0.0#a", "RB-A@1.0.0#b"], latencyMs: 10 },
      { id: "miss", returned: ["RB-A@1.0.0#a", "RB-A@1.0.0#c"], latencyMs: 10 },
      { id: "negative", returned: [], latencyMs: 10 },
    ];
    const report = scoreTarget(index, cases, outputs);

    expect(report.metrics.sufficientGuidanceHitAt3).toBe(0.5);
    expect(report.noMatchAbstention.rate).toBe(1);
    expect(report.falseAbstention.rate).toBe(0);
    expect(report.counts.eligibleAnswerable).toBe(2);
  });

  test("never credits an unavailable output with abstention", () => {
    const cases: TargetCase[] = [
      { ...base, id: "negative", kind: "no_match", input, requiredFacets: [] },
    ];
    const outputs: TargetOutput[] = [{ id: "negative", error: "scorer down" }];
    const report = scoreTarget(index, cases, outputs);

    expect(report.noMatchAbstention.rate).toBe(0);
    expect(report.counts.unavailable).toBe(1);
  });

  test("rejects a duplicate facet on one case", () => {
    const cases: TargetCase[] = [
      {
        ...base,
        id: "dup",
        kind: "answerable",
        input,
        requiredFacets: [
          { facet: "evidence", accepted: ["RB-A@1.0.0#a"] },
          { facet: "evidence", accepted: ["RB-A@1.0.0#b"] },
        ],
      },
    ];
    const outputs: TargetOutput[] = [{ id: "dup", returned: [], latencyMs: 1 }];
    expect(() => scoreTarget(index, cases, outputs)).toThrow("Duplicate facet");
  });
});

describe("route-only ranking arm", () => {
  const routeIndex: RunbookIndex = [
    section("f01-a"),
    section("f01-b"),
    { ...section("f02-a"), taxonomy: ["F02"] },
    { ...section("f02-b"), taxonomy: ["F02"] },
  ];
  const allZeroLogits = (sections: RunbookIndex) =>
    Object.fromEntries(sections.map((item) => [item.citation, 0]));

  test("route-only ranking removes non-routed sections without changing scores", () => {
    const input = {
      query: "429 rate limit",
      route: {
        hints: ["F01"],
        confident: true,
        reasons: ["provider_status:429"],
      },
      limit: 3 as const,
    };
    const result = rankRouteOnly(routeIndex, input, allZeroLogits(routeIndex));

    expect(result.matches).toHaveLength(2);
    expect(
      result.matches.every((match) => match.taxonomy.includes("F01")),
    ).toBe(true);
    expect(result.routeExcluded.sort()).toEqual([
      "RB-A@1.0.0#f02-a",
      "RB-A@1.0.0#f02-b",
    ]);
  });

  test("ranks the global set when the route is not confident", () => {
    const result = rankRouteOnly(
      routeIndex,
      { query: "observed failure", limit: 3 },
      allZeroLogits(routeIndex),
    );

    expect(result.matches).toHaveLength(3);
    expect(result.routeExcluded).toEqual([]);
    expect(result.matches.every((match) => match.canChangePolicy === false)).toBe(
      true,
    );
  });

  test("fails closed when a routed section has no finite score", () => {
    const logits = allZeroLogits(routeIndex);
    delete logits["RB-A@1.0.0#f01-a"];
    expect(() =>
      rankRouteOnly(
        routeIndex,
        {
          query: "429",
          route: {
            hints: ["F01"],
            confident: true,
            reasons: ["provider_status:429"],
          },
        },
        logits,
      ),
    ).toThrow("Invalid MiniLM scores");
  });
});

describe("development cohort", () => {
  test("covers the exposed answerable set and eight no-match cases", async () => {
    const cases = await loadTargetCases(join(r3, "development-cases-v1.json"));
    expect(cases).toHaveLength(24);
    expect(cases.filter((item) => item.kind === "answerable")).toHaveLength(16);
    expect(cases.filter((item) => item.kind === "no_match")).toHaveLength(8);
    expect(
      new Set(
        cases
          .filter((item) => item.kind === "answerable")
          .map((item) => item.input.query),
      ).size,
    ).toBe(16);
  });

  test("reviewed labels cite only the frozen corpus", async () => {
    const frozen = JSON.parse(
      await readFile(join(r3, "corpus-v1.json"), "utf8"),
    ) as FrozenCorpus;
    const labels = await loadTargetLabels(
      join(r3, "development-labels-v1.json"),
    );
    const known = new Set(frozen.sections.map((item) => item.citation));
    const cited = labels.cases.flatMap((item) =>
      item.requiredFacets.flatMap((facet) => facet.accepted),
    );
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.every((citation) => known.has(citation))).toBe(true);
    expect(JSON.stringify(labels)).not.toContain("RB-F01-F02@1.0.0");
  });
});
