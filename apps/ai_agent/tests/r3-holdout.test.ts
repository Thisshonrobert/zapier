import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  evaluateHoldoutGate,
  type HoldoutGateMetrics,
  type HoldoutGateThresholds,
} from "../src/evaluation/holdout-gate.ts";
import {
  loadFrozenCorpus,
  loadTargetCases,
  loadTargetLabels,
  targetLabelHash,
  type FrozenCorpus,
} from "../src/evaluation/retrieval-target.ts";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";

const r3 = join(import.meta.dir, "../evaluation/r3");
const holdout = join(r3, "holdout");
const families = ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10"];

const sha256File = async (path: string) =>
  createHash("sha256").update(await readFile(path)).digest("hex");

const categoryOf = (id: string) => {
  const match = /^f(0[1-9]|10)-/.exec(id);
  return match ? `F${match[1]}` : "NM";
};

const passingMetrics: HoldoutGateMetrics = {
  sufficientGuidanceHitAt3: 0.9,
  macroSectionRecallAt3: 0.9,
  noMatchAbstention: 0.9,
  falseAbstention: 0.05,
  directPrecisionAt3: 0.5,
  routeCoverage: 1,
  reliability: 0.95,
  p95LatencyMs: 3_000,
  safetyViolations: 0,
};

const thresholds: HoldoutGateThresholds = {
  hitAt3: 0.9,
  macroSectionRecallAt3: 0.9,
  noMatchAbstention: 0.9,
  falseAbstentionMax: 0.05,
  directPrecisionMin: 0.229,
  routeCoverage: 1,
  reliability: 0.95,
  p95LatencyMs: 3_000,
  safetyViolationsMax: 0,
};

describe("R3.5 holdout composition", () => {
  test("has 40 cases: 30 answerable, 10 no-match, three per family", async () => {
    const cases = await loadTargetCases(join(holdout, "cases-v1.json"));
    expect(cases).toHaveLength(40);
    expect(cases.filter((item) => item.kind === "answerable")).toHaveLength(30);
    expect(cases.filter((item) => item.kind === "no_match")).toHaveLength(10);
    expect(new Set(cases.map((item) => item.id)).size).toBe(40);
    const counts: Record<string, number> = {};
    for (const item of cases)
      counts[categoryOf(item.id)] = (counts[categoryOf(item.id)] ?? 0) + 1;
    for (const family of families) expect(counts[family]).toBe(3);
    expect(counts.NM).toBe(10);
  });

  test("does not reuse a development case id", async () => {
    const development = await loadTargetCases(
      join(r3, "development-cases-v1.json"),
    );
    const cases = await loadTargetCases(join(holdout, "cases-v1.json"));
    const developmentIds = new Set(development.map((item) => item.id));
    expect(cases.some((item) => developmentIds.has(item.id))).toBe(false);
  });

  test("labels agree with cases and no-match labels carry a rationale", async () => {
    const cases = await loadTargetCases(join(holdout, "cases-v1.json"));
    const labels = await loadTargetLabels(join(holdout, "labels-v1.json"));
    const byId = new Map(labels.cases.map((item) => [item.id, item]));
    expect(labels.cases).toHaveLength(40);
    for (const item of cases) {
      const label = byId.get(item.id);
      expect(label).toBeDefined();
      expect(label!.supporting).toEqual(item.supporting);
      expect(label!.missingRuntimeFacts).toEqual(item.missingRuntimeFacts);
      if (item.kind === "no_match") {
        expect(item.requiredFacets).toEqual([]);
        expect(label!.noMatchRationale).toBeTruthy();
      } else {
        expect(item.requiredFacets.length).toBeGreaterThan(0);
        expect(item.requiredFacets.length).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("R3.5 freeze", () => {
  test("selected config pins the frozen corpus, protocol, and development labels", async () => {
    const config = JSON.parse(
      await readFile(join(r3, "selected-retrieval-config.json"), "utf8"),
    ) as {
      status: string;
      corpusHash: string;
      labelHash: string;
      protocolHash: string;
      model: { id: string; revision: string; quantization: string };
    };
    const corpus = (await loadFrozenCorpus(join(r3, "corpus-v1.json"))) as FrozenCorpus;
    const labels = await loadTargetLabels(
      join(r3, "development-labels-v1.json"),
    );
    const protocolHash = await sha256File(join(r3, "protocol.json"));
    expect(config.status).toBe("frozen_before_holdout");
    expect(config.corpusHash).toBe(corpus.corpusHash);
    expect(config.labelHash).toBe(targetLabelHash(labels));
    expect(config.protocolHash).toBe(protocolHash);
  });

  test("freeze manifest matches the frozen holdout bytes", async () => {
    const freeze = JSON.parse(
      await readFile(join(holdout, "freeze-v1.json"), "utf8"),
    ) as {
      status: string;
      holdout: {
        cases: { hash: string; count: number };
        labels: { hash: string };
        evidence: { hash: string };
        review: { hash: string; verdict: string };
      };
    };
    expect(freeze.status).toBe("frozen_before_run");
    expect(freeze.holdout.cases.hash).toBe(
      await sha256File(join(holdout, "cases-v1.json")),
    );
    expect(freeze.holdout.labels.hash).toBe(
      await sha256File(join(holdout, "labels-v1.json")),
    );
    expect(freeze.holdout.evidence.hash).toBe(
      await sha256File(join(holdout, "evidence-v1.json")),
    );
    expect(freeze.holdout.review.hash).toBe(
      await sha256File(join(holdout, "review-final-v1.json")),
    );
    expect(freeze.holdout.review.verdict).toBe("accepted");
    expect(freeze.holdout.cases.count).toBe(40);
  });

  test("every accepted holdout citation is in the frozen corpus", async () => {
    const cases = await loadTargetCases(join(holdout, "cases-v1.json"));
    const index = await loadRunbooks(
      join(import.meta.dir, "../../../docs/AI/runbooks"),
    );
    const known = new Set(index.map((section) => section.citation));
    for (const item of cases)
      for (const facet of item.requiredFacets)
        for (const citation of facet.accepted) expect(known.has(citation)).toBe(true);
  });
});

describe("R3.5 release gate", () => {
  test("accepts only when every threshold is met", () => {
    expect(evaluateHoldoutGate(passingMetrics, thresholds).status).toBe(
      "accepted",
    );
  });

  test("rejects a hit@3 below 90%", () => {
    const result = evaluateHoldoutGate(
      { ...passingMetrics, sufficientGuidanceHitAt3: 0.899 },
      thresholds,
    );
    expect(result.status).toBe("rejected");
    expect(result.failing).toContain("hitAt3");
  });

  test("rejects false abstention above 5% and precision below baseline", () => {
    const result = evaluateHoldoutGate(
      {
        ...passingMetrics,
        falseAbstention: 0.051,
        directPrecisionAt3: 0.228,
      },
      thresholds,
    );
    expect(result.failing).toEqual(
      expect.arrayContaining(["falseAbstention", "directPrecisionAt3"]),
    );
  });

  test("rejects a missing metric, route exclusion, and slow p95", () => {
    const result = evaluateHoldoutGate(
      {
        ...passingMetrics,
        macroSectionRecallAt3: null,
        routeCoverage: 0.99,
        p95LatencyMs: 3_001,
      },
      thresholds,
    );
    expect(result.failing).toEqual(
      expect.arrayContaining([
        "macroSectionRecallAt3",
        "routeCoverage",
        "p95LatencyMs",
      ]),
    );
  });
});
