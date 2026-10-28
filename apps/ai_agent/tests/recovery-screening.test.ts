import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  evaluateDevelopmentGate,
  loadRecoveryContext,
  scoredCasesFromLabels,
  type RecoveryArmMetrics,
} from "../src/evaluation/recovery-screening.ts";
import {
  loadTargetCases,
  loadTargetLabels,
  scoreTarget,
  type TargetCase,
  type TargetOutput,
} from "../src/evaluation/retrieval-target.ts";

const recoveryDir = join(
  import.meta.dir,
  "../evaluation/r3/recovery",
);
const casesPath = join(recoveryDir, "development-cases-v2.json");
const labelsPath = join(recoveryDir, "development-labels-v3.json");

type FacetLike = { facet: string; accepted: readonly string[] };

const acceptedSets = (facets: readonly FacetLike[]) =>
  facets.map((facet) => ({
    facet: facet.facet,
    accepted: [...facet.accepted].sort(),
  }));

const outputsFrom = (cases: readonly TargetCase[]): TargetOutput[] =>
  cases.map((item) => ({
    id: item.id,
    returned:
      item.kind === "answerable"
        ? item.requiredFacets.map((facet) => facet.accepted[0]!)
        : [],
    latencyMs: 1,
  }));

const metrics = (overrides: Partial<RecoveryArmMetrics> = {}): RecoveryArmMetrics => ({
  hitAt3: 0.85,
  macroSectionRecallAt3: 0.85,
  directPrecisionAt3: 0.5,
  noMatchAbstention: 1,
  falseAbstention: 0,
  strictHitAt3: 0.85,
  strictMacroSectionRecallAt3: 0.85,
  strictLabelGap: 0,
  routeCoverage: 1,
  reliability: 1,
  p95LatencyMs: 100,
  counts: {
    scheduled: 32,
    eligibleAnswerable: 22,
    noMatch: 10,
    unavailable: 0,
    providerExcluded: 0,
  },
  ...overrides,
});

describe("R3.5r.3 recovery cohort", () => {
  test("loads 32 cases, 24 pinned + 8 extension evidence bundles", async () => {
    const context = await loadRecoveryContext();
    expect(context.cases).toHaveLength(32);
    expect(context.rows).toHaveLength(32);
    expect(context.rows.slice(0, 24).every((row) => row.evidence !== undefined)).toBe(
      true,
    );
    expect(context.rows.slice(24).every((row) => row.evidence !== undefined)).toBe(
      true,
    );
    expect(context.hashes.corpus).toBe(
      "45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440",
    );
    expect(context.hashes.labels).toBe(
      "cb4b9caecd5243a31eca57abbb6d452311a84ad3983a42a73a8c91e2c0545793",
    );
    expect(context.hashes.protocol).toBe(
      "f4ee2f19cf13a40ad20211fac71ae297715bfd277fbb618f8dcc18b0935f20ad",
    );
  });

  test("all accepted development citations are route-eligible", async () => {
    const context = await loadRecoveryContext();
    const answerable = context.rows.filter((row) => row.case.kind === "answerable");
    expect(answerable.length).toBe(22);
    for (const row of answerable) expect(row.routeCoverage).toBe(1);
  });

  test("facet, typed-route, and equivalence invariants hold", async () => {
    const context = await loadRecoveryContext();
    expect(context.rows.every((row) => row.facetInvariant)).toBe(true);
    expect(context.rows.every((row) => row.typedRoute)).toBe(true);
    expect(context.rows.every((row) => row.equivalenceProvenance)).toBe(true);
  });

  test("f04 sibling verification equivalence keeps the strict canonical citation first", async () => {
    const context = await loadRecoveryContext();
    const row = context.rows.find(
      (candidate) => candidate.case.id === "f04-sibling-destination-repair",
    );
    expect(row).toBeDefined();
    expect(row!.equivalenceProvenance).toBe(true);
    const verification = row!.label.requiredFacets.find(
      (facet) => facet.facet === "verification",
    );
    expect(verification?.accepted[0]).toBe(
      "RB-F04-F06@1.0.0#verification-rollback-or-escalation",
    );
    expect(verification?.accepted[1]).toBe(
      "RB-F03-F04@1.0.0#verification-rollback-or-escalation",
    );
  });
});

describe("R3.5r.3 scored label source", () => {
  test("labels and cases carry identical accepted sets except the known v3 row", async () => {
    const cases = await loadTargetCases(casesPath);
    const labels = await loadTargetLabels(labelsPath);
    expect(cases).toHaveLength(32);
    expect(labels.cases).toHaveLength(32);
    const labelById = new Map(labels.cases.map((item) => [item.id, item]));

    const differing = cases
      .filter((item) => {
        const label = labelById.get(item.id)!;
        return (
          JSON.stringify(acceptedSets(item.requiredFacets)) !==
          JSON.stringify(acceptedSets(label.requiredFacets))
        );
      })
      .map((item) => item.id);

    expect(differing).toEqual(["f04-sibling-destination-repair"]);
  });

  test("loadRecoveryContext scores the labels file, not the cases file", async () => {
    const cases = await loadTargetCases(casesPath);
    const labels = await loadTargetLabels(labelsPath);
    const context = await loadRecoveryContext();
    const expected = scoredCasesFromLabels(cases, labels);

    expect(
      context.cases.map((item) => ({
        id: item.id,
        requiredFacets: acceptedSets(item.requiredFacets),
      })),
    ).toEqual(
      expected.map((item) => ({
        id: item.id,
        requiredFacets: acceptedSets(item.requiredFacets),
      })),
    );

    const row = context.rows.find(
      (candidate) => candidate.case.id === "f04-sibling-destination-repair",
    )!;
    const verification = row.case.requiredFacets.find(
      (facet) => facet.facet === "verification",
    )!;
    expect(verification.accepted).toEqual([
      "RB-F04-F06@1.0.0#verification-rollback-or-escalation",
      "RB-F03-F04@1.0.0#verification-rollback-or-escalation",
    ]);
  });

  test("mutating an accepted citation in memory moves hit@3, recall, and strictHit@3", async () => {
    const context = await loadRecoveryContext();
    const cases = await loadTargetCases(casesPath);
    const labels = await loadTargetLabels(labelsPath);
    const scored = scoredCasesFromLabels(cases, labels);
    const outputs = outputsFrom(scored);
    const baseline = scoreTarget(context.index, scored, outputs);

    const targetId = "f01-rate-limit-rejected";
    const targetRow = context.rows.find(
      (candidate) => candidate.case.id === targetId,
    )!;
    const originalFacet = targetRow.label.requiredFacets.find(
      (facet) => facet.facet === "remediation",
    )!;
    const alternate = targetRow.eligible.find(
      (citation) =>
        !originalFacet.accepted.includes(citation) &&
        !targetRow.label.supporting.includes(citation),
    );
    expect(alternate).toBeDefined();

    const mutatedLabels = structuredClone(labels);
    const mutatedFacet = mutatedLabels.cases
      .find((item) => item.id === targetId)!
      .requiredFacets.find((facet) => facet.facet === "remediation")!;
    mutatedFacet.accepted = [alternate!];

    const mutated = scoreTarget(
      context.index,
      scoredCasesFromLabels(cases, mutatedLabels),
      outputs,
    );

    expect(baseline.metrics.sufficientGuidanceHitAt3).toBe(1);
    expect(mutated.metrics.sufficientGuidanceHitAt3).toBeLessThan(
      baseline.metrics.sufficientGuidanceHitAt3!,
    );
    expect(mutated.metrics.macroSectionRecallAt3).toBeLessThan(
      baseline.metrics.macroSectionRecallAt3!,
    );
    expect(mutated.metrics.strictSufficientGuidanceHitAt3).toBeLessThan(
      baseline.metrics.strictSufficientGuidanceHitAt3!,
    );
  });

  test("strictLabelGap is not hard-wired to zero", async () => {
    const context = await loadRecoveryContext();
    const cases = await loadTargetCases(casesPath);
    const labels = await loadTargetLabels(labelsPath);
    const scored = scoredCasesFromLabels(cases, labels);
    const targetId = "f04-sibling-destination-repair";
    const target = scored.find((item) => item.id === targetId)!;
    const verification = target.requiredFacets.find(
      (facet) => facet.facet === "verification",
    )!;
    expect(verification.accepted).toHaveLength(2);
    const equivalence = verification.accepted[1]!;

    const outputs: TargetOutput[] = scored.map((item) => ({
      id: item.id,
      returned:
        item.kind === "answerable"
          ? item.requiredFacets.map((facet) =>
              item.id === targetId && facet.facet === "verification"
                ? equivalence
                : facet.accepted[0]!,
            )
          : [],
      latencyMs: 1,
    }));
    const report = scoreTarget(context.index, scored, outputs);

    expect(report.metrics.sufficientGuidanceHitAt3).toBe(1);
    expect(report.metrics.strictLabelGap ?? 0).toBeGreaterThan(0);
    expect(report.metrics.strictSufficientGuidanceHitAt3 ?? 0).toBeLessThan(
      report.metrics.sufficientGuidanceHitAt3!,
    );
  });
});

describe("R3.5r.3 development gate", () => {
  const passing = () =>
    evaluateDevelopmentGate({
      dev24: metrics(),
      dev24Keyword: metrics({ directPrecisionAt3: 0.2 }),
      dev32: metrics(),
      dev32Keyword: metrics({ directPrecisionAt3: 0.2 }),
      facetInvariant: true,
      typedRoute: true,
      equivalenceProvenance: true,
      routeCoverage: 1,
    });

  test("passes only when every screening threshold is met", () => {
    expect(passing().status).toBe("passed");
    expect(passing().failing).toEqual([]);
  });

  test("fails a dev-24 hit@3 below 80%", () => {
    const gate = evaluateDevelopmentGate({
      dev24: metrics({ hitAt3: 0.79 }),
      dev24Keyword: metrics({ directPrecisionAt3: 0.2 }),
      dev32: metrics(),
      dev32Keyword: metrics({ directPrecisionAt3: 0.2 }),
      facetInvariant: true,
      typedRoute: true,
      equivalenceProvenance: true,
      routeCoverage: 1,
    });
    expect(gate.status).toBe("failed");
    expect(gate.failing).toContain("dev24SufficientGuidanceHitAt3");
  });

  test("fails a dev-32 false abstention above 5% and a broken mechanism invariant", () => {
    const gate = evaluateDevelopmentGate({
      dev24: metrics(),
      dev24Keyword: metrics({ directPrecisionAt3: 0.2 }),
      dev32: metrics({ falseAbstention: 0.06 }),
      dev32Keyword: metrics({ directPrecisionAt3: 0.2 }),
      facetInvariant: false,
      typedRoute: true,
      equivalenceProvenance: true,
      routeCoverage: 0.99,
    });
    expect(gate.status).toBe("failed");
    expect(gate.failing).toEqual(
      expect.arrayContaining([
        "dev32FalseAbstention",
        "facetInvariant",
        "routeCoverage",
      ]),
    );
  });
});
