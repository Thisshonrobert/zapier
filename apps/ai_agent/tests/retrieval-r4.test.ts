// R4.1 benchmark validation.
//
// These tests validate the authored development and sealed-holdout artifacts
// without running the retriever, a candidate, or a scoring report. The only
// scoreTarget call is the synthetic F04 equivalence check required by the plan.
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  TargetCaseSchema,
  loadTargetCases,
  loadTargetLabelsV2,
  rationaleLines,
  scoreTarget,
  type TargetCase,
} from "../src/evaluation/retrieval-target.ts";
import {
  assertDevelopmentSplit,
  assertHoldoutSplit,
  ensureFreshRunDirectory,
  evaluateRetrievalDecision,
  loadSelectedRetrievalConfig,
  metricRow,
  pairedComparison,
  summarizeArm,
  verifyHoldoutSeal,
  wilsonInterval,
  type RetrievalDecisionInput,
} from "../src/evaluation/retrieval-r4.ts";
import {
  eligibleRunbookSections,
  loadRunbooks,
} from "../src/tools/search-runbooks.ts";

const r4 = join(import.meta.dir, "../evaluation/r4");
const holdoutDir = join(r4, "holdout");
const runbooksDir = join(import.meta.dir, "../../../docs/AI/runbooks");
const corpusPath = join(
  import.meta.dir,
  "../evaluation/r3/corpus-v1.json",
);

const devCasesPath = join(r4, "development-cases-v1.json");
const devLabelsPath = join(r4, "development-labels-v2.json");
const devEvidencePath = join(r4, "development-evidence-v1.json");
const protocolPath = join(r4, "protocol.json");
const selectedConfigPath = join(r4, "selected-retrieval-config.json");
const developmentRunManifestPath = join(
  r4,
  "runs",
  "dev-20261021-v2",
  "manifest.json",
);
const holdoutCasesPath = join(holdoutDir, "cases-v1.json");
const holdoutLabelsPath = join(holdoutDir, "labels-v2.json");
const holdoutEvidencePath = join(holdoutDir, "evidence-v1.json");
const diagnosisPath = join(holdoutDir, "diagnosis-subset-v1.json");
const fingerprintsPath = join(holdoutDir, "fingerprints-v1.json");
const sealPath = join(holdoutDir, "seal.json");

const families = [
  "F01",
  "F02",
  "F03",
  "F04",
  "F05",
  "F06",
  "F07",
  "F08",
  "F09",
  "F10",
] as const;

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, "utf8"));

const familyOf = (id: string): (typeof families)[number] | null => {
  const match = /^f(0[1-9]|10)-/.exec(id);
  return match ? (`F${match[1]}` as (typeof families)[number]) : null;
};

const bucketOf = (id: string): string | null =>
  /^nm-(missing-guidance|missing-runtime-fact|out-of-scope|adversarial)-/.exec(
    id,
  )?.[1] ?? null;

// Id-free normalized content. The case id, split, and kind are deliberately
// excluded so identical content in two splits is still a duplicate.
const fingerprint = (item: TargetCase): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        input: item.input,
        requiredFacets: item.requiredFacets,
        supporting: item.supporting,
        missingRuntimeFacts: item.missingRuntimeFacts,
      }),
    )
    .digest("hex");

const loadEvidenceIds = async (path: string): Promise<string[]> => {
  const raw = (await readJson(path)) as { cases?: Array<{ id: string }> };
  if (!Array.isArray(raw.cases)) throw new Error(`${path}: missing cases`);
  return raw.cases.map((item) => item.id);
};

describe("R4 label files", () => {
  test("development and holdout labels parse as v2", async () => {
    const development = await loadTargetLabelsV2(devLabelsPath);
    const holdout = await loadTargetLabelsV2(holdoutLabelsPath);
    expect(development.version).toBe(2);
    expect(holdout.version).toBe(2);
    expect(development.cases).toHaveLength(80);
    expect(holdout.cases).toHaveLength(160);
  });

  test("label ids match case ids exactly on both splits", async () => {
    const development = await loadTargetLabelsV2(devLabelsPath);
    const holdout = await loadTargetLabelsV2(holdoutLabelsPath);
    const devCases = await loadTargetCases(devCasesPath);
    const holdoutCases = await loadTargetCases(holdoutCasesPath);

    expect(development.cases.map((item) => item.id).sort()).toEqual(
      devCases.map((item) => item.id).sort(),
    );
    expect(holdout.cases.map((item) => item.id).sort()).toEqual(
      holdoutCases.map((item) => item.id).sort(),
    );
  });
});

describe("R4 case cohorts", () => {
  test("development and holdout cases parse and have the planned counts", async () => {
    const development = await loadTargetCases(devCasesPath);
    const holdout = await loadTargetCases(holdoutCasesPath);

    expect(development).toHaveLength(80);
    expect(development.filter((item) => item.kind === "answerable")).toHaveLength(60);
    expect(development.filter((item) => item.kind === "no_match")).toHaveLength(20);
    expect(holdout).toHaveLength(160);
    expect(holdout.filter((item) => item.kind === "answerable")).toHaveLength(120);
    expect(holdout.filter((item) => item.kind === "no_match")).toHaveLength(40);

    expect(development.every((item) => item.split === "development")).toBe(true);
    expect(holdout.every((item) => item.split === "holdout")).toBe(true);
    expect(development.every((item) => item.input.limit === 3)).toBe(true);
    expect(holdout.every((item) => item.input.limit === 3)).toBe(true);
  });

  test("development has at least five answerable cases per family", async () => {
    const development = await loadTargetCases(devCasesPath);
    for (const family of families) {
      const count = development.filter(
        (item) =>
          item.kind === "answerable" && familyOf(item.id) === family,
      ).length;
      expect(count).toBeGreaterThanOrEqual(5);
    }
  });

  test("holdout has twelve answerable cases per family", async () => {
    const holdout = await loadTargetCases(holdoutCasesPath);
    for (const family of families) {
      const count = holdout.filter(
        (item) => item.kind === "answerable" && familyOf(item.id) === family,
      ).length;
      expect(count).toBe(12);
    }
  });

  test("holdout no-match buckets are equal and complete", async () => {
    const holdout = await loadTargetCases(holdoutCasesPath);
    const buckets = new Map<string, number>();
    for (const item of holdout.filter((candidate) => candidate.kind === "no_match")) {
      const bucket = bucketOf(item.id);
      expect(bucket).not.toBeNull();
      buckets.set(bucket!, (buckets.get(bucket!) ?? 0) + 1);
    }
    expect([...buckets.keys()].sort()).toEqual([
      "adversarial",
      "missing-guidance",
      "missing-runtime-fact",
      "out-of-scope",
    ]);
    for (const bucket of buckets.values()) expect(bucket).toBe(10);
  });

  test("every case has exactly one matching evidence entry", async () => {
    const development = await loadTargetCases(devCasesPath);
    const holdout = await loadTargetCases(holdoutCasesPath);
    const devEvidenceIds = await loadEvidenceIds(devEvidencePath);
    const holdoutEvidenceIds = await loadEvidenceIds(holdoutEvidencePath);

    expect(devEvidenceIds.sort()).toEqual(development.map((item) => item.id).sort());
    expect(holdoutEvidenceIds.sort()).toEqual(holdout.map((item) => item.id).sort());
    expect(new Set(devEvidenceIds).size).toBe(devEvidenceIds.length);
    expect(new Set(holdoutEvidenceIds).size).toBe(holdoutEvidenceIds.length);
  });
});

describe("R4 labels and citations", () => {
  test("every citation exists in the frozen corpus and the serving runbooks", async () => {
    const index = await loadRunbooks(runbooksDir);
    const serving = new Set(index.map((section) => section.citation));
    const frozen = (await readJson(corpusPath)) as {
      sections: Array<{ citation: string }>;
    };
    const corpus = new Set(frozen.sections.map((section) => section.citation));
    const cases = [
      ...(await loadTargetCases(devCasesPath)),
      ...(await loadTargetCases(holdoutCasesPath)),
    ];

    for (const item of cases) {
      const citations = [
        ...item.requiredFacets.flatMap((facet) => facet.accepted),
        ...item.supporting,
      ];
      for (const citation of citations) {
        expect({ id: item.id, citation, serving: serving.has(citation) }).toEqual({
          id: item.id,
          citation,
          serving: true,
        });
        expect({ id: item.id, citation, corpus: corpus.has(citation) }).toEqual({
          id: item.id,
          citation,
          corpus: true,
        });
      }
    }
  });

  test("no case exceeds three facets or four accepted citations per facet", async () => {
    const cases = [
      ...(await loadTargetCases(devCasesPath)),
      ...(await loadTargetCases(holdoutCasesPath)),
    ];
    for (const item of cases) {
      expect(item.requiredFacets.length).toBeLessThanOrEqual(3);
      for (const facet of item.requiredFacets) {
        expect(facet.accepted.length).toBeGreaterThan(0);
        expect(facet.accepted.length).toBeLessThanOrEqual(4);
        expect(new Set(facet.accepted).size).toBe(facet.accepted.length);
      }
    }
  });

  test("every multi-citation facet has one rationale line per citation", async () => {
    const labels = [
      ...(await loadTargetLabelsV2(devLabelsPath)).cases,
      ...(await loadTargetLabelsV2(holdoutLabelsPath)).cases,
    ];
    for (const item of labels) {
      for (const facet of item.requiredFacets) {
        const lines = rationaleLines(facet.rationale);
        expect(lines.length).toBeGreaterThanOrEqual(1);
        if (facet.accepted.length === 1) continue;
        expect({ id: item.id, facet: facet.facet, lines: lines.length }).toEqual({
          id: item.id,
          facet: facet.facet,
          lines: facet.accepted.length,
        });
        for (const citation of facet.accepted) {
          expect({
            id: item.id,
            facet: facet.facet,
            citation,
            named: lines.some((line) => line.startsWith(citation)),
          }).toEqual({
            id: item.id,
            facet: facet.facet,
            citation,
            named: true,
          });
        }
      }
    }
  });

  test("a case with no eligible accepted citation per facet is corpus_gap", async () => {
    const index = await loadRunbooks(runbooksDir);
    const cases = [
      ...(await loadTargetCases(devCasesPath)),
      ...(await loadTargetCases(holdoutCasesPath)),
    ];
    for (const item of cases) {
      if (item.kind === "no_match") {
        expect(item.requiredFacets).toHaveLength(0);
        continue;
      }
      const eligible = new Set(
        eligibleRunbookSections(index, item.input).map(
          (section) => section.citation,
        ),
      );
      const covered = item.requiredFacets.every((facet) =>
        facet.accepted.some((citation) => eligible.has(citation)),
      );
      if (item.kind === "answerable") {
        expect({ id: item.id, covered }).toEqual({ id: item.id, covered: true });
      } else {
        expect({ id: item.id, covered }).toEqual({ id: item.id, covered: false });
      }
    }
  });

  test("no-match cases carry a rationale and no direct labels", async () => {
    const labels = [
      ...(await loadTargetLabelsV2(devLabelsPath)).cases,
      ...(await loadTargetLabelsV2(holdoutLabelsPath)).cases,
    ];
    const cases = [
      ...(await loadTargetCases(devCasesPath)),
      ...(await loadTargetCases(holdoutCasesPath)),
    ];
    const noMatchCases = cases.filter((item) => item.kind === "no_match");
    const labelById = new Map(labels.map((item) => [item.id, item]));

    expect(noMatchCases.length).toBe(60);
    for (const item of noMatchCases) {
      const label = labelById.get(item.id);
      expect(label).toBeDefined();
      expect(label!.requiredFacets).toHaveLength(0);
      expect(label!.noMatchRationale).toBeTruthy();
      expect(item.missingRuntimeFacts.length).toBeGreaterThan(0);
    }
    for (const item of cases.filter((candidate) => candidate.kind === "answerable")) {
      const label = labelById.get(item.id);
      expect(label!.noMatchRationale).toBeNull();
      expect(label!.requiredFacets.length).toBeGreaterThan(0);
    }
  });

  test("the F04 sibling citation scores as sufficient on either return", async () => {
    const index = await loadRunbooks(runbooksDir);
    const holdout = await loadTargetCases(holdoutCasesPath);
    const item = holdout.find(
      (candidate) => candidate.id === "f04-email-missing-subject-template",
    )!;
    expect(item).toBeDefined();
    expect(item.requiredFacets.every((facet) => facet.accepted.length === 2)).toBe(
      true,
    );
    const returned = item.requiredFacets.map((facet) => facet.accepted[1]!);
    const report = scoreTarget(index, [item], [
      { id: item.id, returned, latencyMs: 1 },
    ]);
    expect(report.rows[0]?.sufficient).toBe(true);
    expect(report.rows[0]?.strictSufficient).toBe(false);
    expect(report.metrics.sufficientGuidanceHitAt3).toBe(1);
  });
});

describe("R4 fingerprints and diagnosis subset", () => {
  test("fingerprints are unique across both splits and written to the holdout", async () => {
    const development = await loadTargetCases(devCasesPath);
    const holdout = await loadTargetCases(holdoutCasesPath);
    const records = [...development, ...holdout].map((item) => ({
      id: item.id,
      split: item.split,
      fingerprint: fingerprint(item),
    }));
    const unique = new Set(records.map((record) => record.fingerprint));
    expect(unique.size).toBe(records.length);

    await writeFile(
      fingerprintsPath,
      JSON.stringify(
        {
          version: 1,
          algorithm: "sha256",
          normalization:
            "UTF-8 JSON of {input, requiredFacets, supporting, missingRuntimeFacts}; id, split, and kind excluded",
          cases: records,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    const written = (await readJson(fingerprintsPath)) as {
      cases: Array<{ id: string; fingerprint: string }>;
    };
    expect(written.cases).toHaveLength(240);
    expect(new Set(written.cases.map((item) => item.id)).size).toBe(240);
  });

  test("the pre-registered diagnosis subset covers every family and no-match cause", async () => {
    const subset = (await readJson(diagnosisPath)) as {
      version: number;
      cases: Array<{ id: string; kind: "answerable" | "no_match"; family?: string; bucket?: string }>;
    };
    const holdout = await loadTargetCases(holdoutCasesPath);
    const known = new Set(holdout.map((item) => item.id));

    expect(subset.version).toBe(1);
    expect(subset.cases).toHaveLength(40);
    expect(new Set(subset.cases.map((item) => item.id)).size).toBe(40);
    const answerable = subset.cases.filter((item) => item.kind === "answerable");
    const noMatch = subset.cases.filter((item) => item.kind === "no_match");
    expect(answerable).toHaveLength(30);
    expect(noMatch).toHaveLength(10);
    expect(subset.cases.every((item) => known.has(item.id))).toBe(true);

    for (const family of families) {
      expect(answerable.filter((item) => item.family === family)).toHaveLength(3);
    }
    expect(new Set(noMatch.map((item) => item.bucket))).toEqual(
      new Set(["missing_guidance", "missing_runtime_fact", "out_of_scope", "adversarial"]),
    );
    for (const item of noMatch) {
      expect(bucketOf(item.id)?.replaceAll("-", "_")).toBe(item.bucket);
    }
  });

  test("sealed holdout hashes match the raw sealed files", async () => {
    if (!existsSync(sealPath)) return;
    const seal = (await readJson(sealPath)) as {
      hashMethod: string;
      files: Record<string, { path: string; hash: string }>;
    };
    expect(seal.hashMethod).toContain("sha256");
    for (const entry of Object.values(seal.files)) {
      const bytes = await readFile(join(import.meta.dir, "../../..", entry.path));
      const hash = createHash("sha256").update(bytes).digest("hex");
      expect({ path: entry.path, hash }).toEqual({ path: entry.path, hash: entry.hash });
    }
  });
});

describe("R4 schema strictness", () => {
  test("case schema rejects a fourth facet", () => {
    expect(() =>
      TargetCaseSchema.parse({
        id: "synthetic-four-facets",
        split: "development",
        kind: "answerable",
        input: { query: "q", limit: 3 },
        requiredFacets: [
          { facet: "symptoms", accepted: ["RB-A#a"] },
          { facet: "investigation", accepted: ["RB-A#a"] },
          { facet: "remediation", accepted: ["RB-A#a"] },
          { facet: "verification", accepted: ["RB-A#a"] },
        ],
        supporting: [],
        missingRuntimeFacts: [],
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// R4.3 driver: Wilson intervals, decision rule, run-directory immutability
// ---------------------------------------------------------------------------

const passingDecision = (): RetrievalDecisionInput => ({
  stage: "acceptance",
  // 112/120 = 93.33%; Wilson lower is about 87.3%, above the 82% gate.
  hitAt3: metricRow(112, 120),
  macroSectionRecallAt3: metricRow(112, 120, { point: 0.92 }),
  noMatchAbstention: metricRow(38, 40),
  falseAbstention: metricRow(2, 120),
  directPrecisionAt3: metricRow(96, 120, { point: 0.8 }),
  keywordDirectPrecisionAt3: metricRow(84, 120, { point: 0.7 }),
  perFamilyHitAt3: Object.fromEntries(
    families.map((family) => [family, metricRow(8, 10)]),
  ),
  routeCoverage: 1,
  reliability: 0.99,
  p95LatencyMs: 1000,
  safetyViolations: 0,
});

describe("R4.3 Wilson interval", () => {
  test("Wilson interval matches a known example", () => {
    const interval = wilsonInterval(24, 30);
    expect(interval.lower).toBeCloseTo(0.627, 2);
    expect(interval.upper).toBeCloseTo(0.905, 2);
  });

  test("an empty denominator has no interval and a full denominator stays bounded", () => {
    expect(wilsonInterval(0, 0)).toEqual({
      lower: null,
      upper: null,
      confidence: 0.95,
    });
    const full = wilsonInterval(10, 10);
    expect(full.lower).toBeGreaterThan(0);
    expect(full.upper).toBe(1);
  });
});

describe("R4.3 decision rule", () => {
  test("returns retrieval_accepted only when every retrieval gate passes", () => {
    const decision = evaluateRetrievalDecision(passingDecision());
    expect(decision.status).toBe("retrieval_accepted");
    expect(decision.failing).toEqual([]);
    expect(decision.blockedReasons).toEqual([]);
  });

  test("a failed Wilson bound rejects the retrieval decision", () => {
    const decision = evaluateRetrievalDecision({
      ...passingDecision(),
      // 100/120 = 83.3%; Wilson lower is about 75.6%, below the 82% gate.
      hitAt3: metricRow(100, 120),
    });
    expect(decision.status).toBe("retrieval_rejected");
    expect(decision.failing).toContain("hitAt3.wilsonLower95");
  });

  test("a single family below 70% returns retrieval_rejected", () => {
    const decision = evaluateRetrievalDecision({
      ...passingDecision(),
      perFamilyHitAt3: {
        ...passingDecision().perFamilyHitAt3,
        F05: metricRow(6, 10),
      },
    });
    expect(decision.status).toBe("retrieval_rejected");
    expect(decision.failing).toContain("perFamilyHitAt3.F05");
  });

  test("a safety violation returns blocked", () => {
    const decision = evaluateRetrievalDecision({
      ...passingDecision(),
      safetyViolations: 1,
    });
    expect(decision.status).toBe("blocked");
    expect(decision.blockedReasons).toContain("safetyViolations");
  });
});

describe("R4.3 run directory", () => {
  test("the driver refuses to overwrite an existing run directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "r4-driver-"));
    const outDir = join(root, "dev-20261021-v1");
    try {
      await ensureFreshRunDirectory(outDir);
      await expect(ensureFreshRunDirectory(outDir)).rejects.toThrow(
        /already exists/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("the R4.3 driver accepts only the development split", () => {
    expect(assertDevelopmentSplit("development")).toBe("development");
    expect(() => assertDevelopmentSplit("holdout")).toThrow(/only the development split/);
  });
});

describe("R4.3 unavailable outputs and metric rows", () => {
  const unavailableCases = async (): Promise<{
    index: Awaited<ReturnType<typeof loadRunbooks>>;
    cases: TargetCase[];
  }> => {
    const index = await loadRunbooks(runbooksDir);
    const eligible = eligibleRunbookSections(index, { query: "q", limit: 3 });
    const citation = eligible[0]!.citation;
    return {
      index,
      cases: [
        {
          id: "synthetic-answerable",
          split: "development",
          kind: "answerable",
          input: { query: "q", limit: 3 },
          requiredFacets: [{ facet: "remediation", accepted: [citation] }],
          supporting: [],
          missingRuntimeFacts: [],
        },
        {
          id: "synthetic-no-match",
          split: "development",
          kind: "no_match",
          input: { query: "q", limit: 3 },
          requiredFacets: [],
          supporting: [],
          missingRuntimeFacts: ["missing_fact"],
        },
      ],
    };
  };

  test("unavailable outputs count as failures, not successful abstentions", async () => {
    const { index, cases } = await unavailableCases();
    const report = scoreTarget(index, cases, [
      { id: "synthetic-answerable", error: "unavailable" },
      { id: "synthetic-no-match", error: "unavailable" },
    ]);
    const summary = summarizeArm(cases, report);

    expect(summary.reliability.numerator).toBe(0);
    expect(summary.reliability.denominator).toBe(2);
    expect(summary.noMatchAbstention.numerator).toBe(0);
    expect(summary.noMatchAbstention.denominator).toBe(1);
    expect(summary.falseAbstention.numerator).toBe(0);
    expect(summary.hitAt3.point).toBe(0);
  });

  test("every metric row carries a numerator and denominator", async () => {
    const { index, cases } = await unavailableCases();
    const report = scoreTarget(index, cases, [
      { id: "synthetic-answerable", returned: [], latencyMs: 1 },
      { id: "synthetic-no-match", returned: [], latencyMs: 1 },
    ]);
    const summary = summarizeArm(cases, report);
    const metrics = [
      summary.hitAt3,
      summary.macroSectionRecallAt3,
      summary.directPrecisionAt3,
      summary.noMatchAbstention,
      summary.falseAbstention,
      summary.reliability,
    ];
    for (const metric of metrics) {
      expect(Number.isInteger(metric.numerator)).toBe(true);
      expect(Number.isInteger(metric.denominator)).toBe(true);
      expect(metric.denominator).toBeGreaterThanOrEqual(metric.numerator);
      expect(metric.denominator).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// R4.4 candidate freeze, seal, and paired comparison
// ---------------------------------------------------------------------------

describe("R4.4 holdout freeze", () => {
  test("the driver accepts only the sealed holdout split", () => {
    expect(assertHoldoutSplit("holdout")).toBe("holdout");
    expect(() => assertHoldoutSplit("development")).toThrow(
      /only the sealed holdout split/,
    );
  });

  test("selected config pins the accepted development run and sealed holdout", async () => {
    const protocol = (await readJson(protocolPath)) as {
      corpus: { sectionsHash: string };
      holdoutSeal: { hash: string };
    };
    const { config, configHash } =
      await loadSelectedRetrievalConfig(selectedConfigPath);
    const developmentLabelHash = createHash("sha256")
      .update(await readFile(devLabelsPath))
      .digest("hex");
    const developmentRunHash = createHash("sha256")
      .update(await readFile(developmentRunManifestPath))
      .digest("hex");

    expect(configHash).toHaveLength(64);
    expect(config.protocolHash).toBe(
      createHash("sha256").update(await readFile(protocolPath)).digest("hex"),
    );
    expect(config.corpusHash).toBe(protocol.corpus.sectionsHash);
    expect(config.developmentLabelHash).toBe(developmentLabelHash);
    expect(config.developmentRunHash).toBe(developmentRunHash);
    expect(config.holdoutSealHash).toBe(protocol.holdoutSeal.hash);
    expect(config.model.quantization).toBe("q8");
    expect(config.support.minAnchorHits).toBe(1);
  });

  test("the seal verifies every sealed file and rejects a wrong hash", async () => {
    const protocol = (await readJson(protocolPath)) as {
      corpus: { sectionsHash: string };
      holdoutSeal: { hash: string };
    };
    const verification = await verifyHoldoutSeal({
      expectedSealHash: protocol.holdoutSeal.hash,
      corpusHash: protocol.corpus.sectionsHash,
    });

    expect(verification.sealHash).toBe(protocol.holdoutSeal.hash);
    expect(Object.keys(verification.files)).toHaveLength(7);
    await expect(
      verifyHoldoutSeal({
        expectedSealHash: "0".repeat(64),
        corpusHash: protocol.corpus.sectionsHash,
      }),
    ).rejects.toThrow(/seal hash mismatch/);
  });
});

describe("R4.4 paired keyword comparison", () => {
  test("counts discordant pairs and reports an exact McNemar p", async () => {
    const index = await loadRunbooks(runbooksDir);
    const citation = eligibleRunbookSections(index, {
      query: "q",
      limit: 3,
    })[0]!.citation;
    const cases: TargetCase[] = ["a", "b"].map((suffix) => ({
      id: `synthetic-${suffix}`,
      split: "development",
      kind: "answerable",
      input: { query: "q", limit: 3 },
      requiredFacets: [{ facet: "remediation", accepted: [citation] }],
      supporting: [],
      missingRuntimeFacts: [],
    }));
    const candidate = scoreTarget(index, cases, [
      { id: "synthetic-a", returned: [citation], latencyMs: 1 },
      { id: "synthetic-b", returned: [], latencyMs: 1 },
    ]);
    const keyword = scoreTarget(index, cases, [
      { id: "synthetic-a", returned: [citation], latencyMs: 1 },
      { id: "synthetic-b", returned: [citation], latencyMs: 1 },
    ]);
    const paired = pairedComparison(candidate, keyword);

    expect(paired.cases).toBe(2);
    expect(paired.bothHit).toBe(1);
    expect(paired.candidateOnly).toBe(0);
    expect(paired.keywordOnly).toBe(1);
    expect(paired.neither).toBe(0);
    expect(paired.difference).toBe(-0.5);
    expect(paired.mcnemarExactP).toBe(1);
    expect(paired.bootstrap?.lower).not.toBeNull();
    expect(paired.bootstrap?.upper).not.toBeNull();
  });
});
