import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  TargetCaseSchema,
  TargetLabelFileSchema,
  TargetLabelFileV2Schema,
  loadTargetCases,
  loadTargetLabels,
  loadTargetLabelsV2,
  rationaleLines,
  scoreTarget,
  targetLabelHash,
  verifyTargetCorpus,
  type FrozenCorpus,
  type TargetCase,
  type TargetOutput,
} from "../src/evaluation/retrieval-target.ts";
import {
  eligibleRunbookSections,
  loadRunbooks,
  type RunbookIndex,
} from "../src/tools/search-runbooks.ts";
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

describe("strict-label sensitivity", () => {
  test("uses the first listed accepted citation as the canonical label", () => {
    const cases: TargetCase[] = [
      {
        ...base,
        id: "strict",
        kind: "answerable",
        input,
        requiredFacets: [
          {
            facet: "evidence",
            accepted: ["RB-A@1.0.0#a", "RB-A@1.0.0#b"],
          },
        ],
      },
    ];
    const outputs: TargetOutput[] = [
      { id: "strict", returned: ["RB-A@1.0.0#b", "RB-A@1.0.0#c"], latencyMs: 1 },
    ];
    const report = scoreTarget(index, cases, outputs);

    expect(report.rows[0]?.sufficient).toBe(true);
    expect(report.rows[0]?.strictSufficient).toBe(false);
    expect(report.rows[0]?.canonicalAccepted).toEqual(["RB-A@1.0.0#a"]);
    expect(report.metrics.sufficientGuidanceHitAt3).toBe(1);
    expect(report.metrics.strictSufficientGuidanceHitAt3).toBe(0);
    expect(report.metrics.strictLabelGap).toBe(1);
  });

  test("credits the strict row when the canonical citation is returned", () => {
    const cases: TargetCase[] = [
      {
        ...base,
        id: "strict-hit",
        kind: "answerable",
        input,
        requiredFacets: [
          {
            facet: "evidence",
            accepted: ["RB-A@1.0.0#a", "RB-A@1.0.0#b"],
          },
        ],
      },
    ];
    const outputs: TargetOutput[] = [
      { id: "strict-hit", returned: ["RB-A@1.0.0#a"], latencyMs: 1 },
    ];
    const report = scoreTarget(index, cases, outputs);
    expect(report.metrics.strictSufficientGuidanceHitAt3).toBe(1);
    expect(report.metrics.strictMacroSectionRecallAt3).toBe(1);
  });
});

describe("R4 label equivalence schema", () => {
  test("a facet may accept four equivalent sections", () => {
    const parsed = TargetCaseSchema.parse({
      id: "synthetic-equivalence",
      split: "development",
      kind: "answerable",
      input: { query: "missing template path", limit: 3 },
      requiredFacets: [
        {
          facet: "remediation",
          accepted: ["RB-A#a", "RB-A#b", "RB-B#c", "RB-B#d"],
        },
      ],
      supporting: [],
      missingRuntimeFacts: [],
    });
    expect(parsed.requiredFacets[0]?.accepted).toHaveLength(4);
  });

  test("v1 labels still parse", () => {
    const v1LabelFixture = {
      version: 1,
      cases: [
        {
          id: "synthetic-v1",
          requiredFacets: [
            { facet: "remediation", accepted: ["RB-A#a"], rationale: "sufficient" },
          ],
          supporting: [],
          missingRuntimeFacts: [],
          noMatchRationale: null,
        },
      ],
    };
    expect(() => TargetLabelFileSchema.parse(v1LabelFixture)).not.toThrow();
    expect(() => TargetLabelFileV2Schema.parse(v1LabelFixture)).toThrow();
  });

  test("v2 labels require one rationale line per citation", () => {
    expect(() =>
      TargetLabelFileV2Schema.parse({
        version: 2,
        cases: [
          {
            id: "synthetic-equivalence",
            requiredFacets: [
              {
                facet: "remediation",
                accepted: ["RB-A#a", "RB-B#b"],
                rationale: "only one line",
              },
            ],
            supporting: [],
            missingRuntimeFacts: [],
            noMatchRationale: null,
          },
        ],
      }),
    ).toThrow();
  });

  test("v2 labels accept four citations with four rationale lines", () => {
    const parsed = TargetLabelFileV2Schema.parse({
      version: 2,
      cases: [
        {
          id: "synthetic-equivalence",
          requiredFacets: [
            {
              facet: "remediation",
              accepted: ["RB-A#a", "RB-A#b", "RB-B#c", "RB-B#d"],
              rationale:
                "RB-A#a: independently sufficient.\nRB-A#b: independently sufficient.\nRB-B#c: independently sufficient.\nRB-B#d: independently sufficient.",
            },
          ],
          supporting: [],
          missingRuntimeFacts: [],
          noMatchRationale: null,
        },
      ],
    });
    expect(parsed.cases[0]?.requiredFacets[0]?.accepted).toHaveLength(4);
  });

  test("the second equivalent F04 development citation scores sufficient", async () => {
    const r4 = join(import.meta.dir, "../evaluation/r4");
    const cases = await loadTargetCases(join(r4, "development-cases-v1.json"));
    const item = cases.find(
      (candidate) => candidate.id === "f04-template-path-missing",
    )!;
    const investigation = item.requiredFacets.find(
      (facet) => facet.facet === "investigation",
    )!;
    const remediation = item.requiredFacets.find(
      (facet) => facet.facet === "remediation",
    )!;
    const index = await loadRunbooks(
      join(import.meta.dir, "../../../docs/AI/runbooks"),
    );
    const report = scoreTarget(
      index,
      [item],
      [
        {
          id: item.id,
          returned: [investigation.accepted[1]!, remediation.accepted[0]!],
          latencyMs: 1,
        },
      ],
    );

    expect(investigation.accepted).toHaveLength(2);
    expect(report.rows[0]?.sufficient).toBe(true);
    expect(report.rows[0]?.strictSufficient).toBe(false);
    expect(report.metrics.sufficientGuidanceHitAt3).toBe(1);
  });

  test("the R4 development labels parse as v2", async () => {
    const r4 = join(import.meta.dir, "../evaluation/r4");
    const labels = await loadTargetLabelsV2(
      join(r4, "development-labels-v2.json"),
    );
    expect(labels.version).toBe(2);
    expect(labels.cases).toHaveLength(80);
  });
});

describe("development v2 cohort", () => {
  const recovery = join(r3, "recovery");

  test("cases validate and compose dev-32", async () => {
    const cases = await loadTargetCases(join(recovery, "development-cases-v2.json"));
    expect(cases).toHaveLength(32);
    expect(cases.filter((item) => item.kind === "answerable")).toHaveLength(22);
    expect(cases.filter((item) => item.kind === "no_match")).toHaveLength(10);
    expect(cases.every((item) => item.input.limit === 3)).toBe(true);
    expect(cases.every((item) => item.split === "development")).toBe(true);
  });

  test("labels validate as exactly {version, cases}", async () => {
    const path = join(recovery, "development-labels-v2.json");
    const labels = await loadTargetLabels(path);
    const raw = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;

    expect(Object.keys(raw).sort()).toEqual(["cases", "version"]);
    expect(labels.cases).toHaveLength(32);
    expect(targetLabelHash(labels)).toBe(
      "5a0f75659aa3e86498be441bb3cf2935cf98ba26eecdb58c5dd7eba6ddb061e6",
    );
  });

  test("the multi-citation facet carries one line per citation", async () => {
    const labels = await loadTargetLabels(
      join(recovery, "development-labels-v2.json"),
    );
    const facet = labels.cases
      .find((item) => item.id === "f04-sibling-destination-repair")!
      .requiredFacets.find((item) => item.facet === "remediation")!;
    const lines = rationaleLines(facet.rationale);

    expect(facet.accepted).toHaveLength(2);
    expect(lines).toHaveLength(2);
    for (const citation of facet.accepted)
      expect(lines.some((line) => line.startsWith(citation))).toBe(true);
    expect(facet.accepted[0]).toBe("RB-F04-F06@1.0.0#allowed-remediation");
  });

  test("rejects a missing per-citation rationale line and a fifth citation", () => {
    const label = (accepted: string[], rationale: string) => ({
      version: 1,
      cases: [
        {
          id: "probe",
          requiredFacets: [{ facet: "remediation", accepted, rationale }],
          supporting: [],
          missingRuntimeFacts: [],
          noMatchRationale: null,
        },
      ],
    });

    expect(
      TargetLabelFileSchema.safeParse(
        label(["RB-A@1.0.0#a", "RB-A@1.0.0#b"], "Only one line."),
      ).success,
    ).toBe(false);
    expect(
      TargetLabelFileSchema.safeParse(
        label(
          ["RB-A@1.0.0#a", "RB-A@1.0.0#b"],
          "RB-A@1.0.0#a: sufficient.\nRB-A@1.0.0#b: sufficient.",
        ),
      ).success,
    ).toBe(true);
    expect(
      TargetLabelFileSchema.safeParse(
        label(
          ["RB-A@1.0.0#a", "RB-A@1.0.0#b", "RB-A@1.0.0#c", "RB-A@1.0.0#d"],
          "RB-A@1.0.0#a: sufficient.\nRB-A@1.0.0#b: sufficient.\nRB-A@1.0.0#c: sufficient.\nRB-A@1.0.0#d: sufficient.",
        ),
      ).success,
    ).toBe(true);
    expect(
      TargetLabelFileSchema.safeParse(
        label(
          [
            "RB-A@1.0.0#a",
            "RB-A@1.0.0#b",
            "RB-A@1.0.0#c",
            "RB-A@1.0.0#d",
            "RB-A@1.0.0#e",
          ],
          "RB-A@1.0.0#a: sufficient.\nRB-A@1.0.0#b: sufficient.\nRB-A@1.0.0#c: sufficient.\nRB-A@1.0.0#d: sufficient.\nRB-A@1.0.0#e: sufficient.",
        ),
      ).success,
    ).toBe(false);
  });

  test("every accepted v2 citation exists and is provider-eligible", async () => {
    const index = await loadRunbooks(
      join(import.meta.dir, "../../../docs/AI/runbooks"),
    );
    const known = new Set(index.map((section) => section.citation));
    const cases = await loadTargetCases(
      join(recovery, "development-cases-v2.json"),
    );
    const labels = await loadTargetLabels(
      join(recovery, "development-labels-v2.json"),
    );
    const labelById = new Map(labels.cases.map((item) => [item.id, item]));
    let accepted = 0;

    for (const item of cases.filter((candidate) => candidate.kind === "answerable")) {
      const eligible = new Set(
        eligibleRunbookSections(index, item.input).map(
          (section) => section.citation,
        ),
      );
      const label = labelById.get(item.id);
      expect(label).toBeDefined();
      for (const facet of label!.requiredFacets) {
        for (const citation of facet.accepted) {
          accepted += 1;
          expect(known.has(citation)).toBe(true);
          expect(eligible.has(citation)).toBe(true);
        }
      }
    }
    expect(accepted).toBeGreaterThan(0);
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
