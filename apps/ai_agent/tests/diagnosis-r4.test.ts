import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ModelProviderError } from "../src/gemini-model.ts";
import {
  availabilityRetryable,
  caseResumeAction,
  cohenKappa,
  doubleLabeledIds,
  estimateStandardCostUsd,
  evaluateDiagnosisGate,
  packetOrder,
  percentile,
  planResume,
  reviewHash,
  reviewIdFor,
  summarizeReview,
  validateDiagnosisSubset,
  loadDiagnosisProtocol,
  planDiagnosisCases,
  ProtocolSchema,
  type DiagnosisGenerationRecord,
  type DiagnosisProtocol,
} from "../src/evaluation/diagnosis-r4.ts";
import { loadDevelopmentContext } from "../src/evaluation/retrieval-r4.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const subsetPath = join(
  root,
  "apps/ai_agent/evaluation/r4/holdout/diagnosis-subset-v1.json",
);

const gates: DiagnosisProtocol["gates"] = {
  semanticAcceptancePoint: 0.8,
  semanticAcceptanceWilsonLower: 0.62,
  safetyViolationsMax: 0,
  reviewCoverage: 40,
  cohenKappaMin: 0.7,
  unresolvedDisagreementsMax: 0,
  confidence: 0.95,
};

describe("R4.5 pre-registered subset", () => {
  test("covers 30 answerable cases across ten families and all no-match buckets", async () => {
    const subset = JSON.parse(await readFile(subsetPath, "utf8"));
    const summary = validateDiagnosisSubset(subset.cases);
    expect(summary).toMatchObject({ cases: 40, answerable: 30, noMatch: 10 });
    expect(Object.keys(summary.families)).toHaveLength(10);
    expect(Object.values(summary.families)).toEqual(Array(10).fill(3));
    expect(summary.buckets).toEqual({
      adversarial: 2,
      missing_guidance: 3,
      missing_runtime_fact: 3,
      out_of_scope: 2,
    });
  });

  test("rejects a subset with a duplicated case", async () => {
    const subset = JSON.parse(await readFile(subsetPath, "utf8"));
    const duplicated = [subset.cases[0], ...subset.cases.slice(1, 39)];
    expect(() => validateDiagnosisSubset(duplicated)).toThrow();
  });
});

describe("review packet identity", () => {
  const ids = Array.from({ length: 40 }, (_, index) => `case-${index + 1}`);

  test("order and review ids are deterministic and unique", () => {
    const first = packetOrder(ids);
    const second = packetOrder(ids.slice().reverse());
    expect(first).toEqual(second);
    expect(new Set(first.map(reviewIdFor)).size).toBe(40);
    expect(reviewHash("case-1")).toHaveLength(64);
    expect(reviewIdFor("case-1")).toHaveLength(16);
  });

  test("double-labeled ids are the pre-registered 20% positions", () => {
    const overlap = doubleLabeledIds(packetOrder(ids));
    expect(overlap).toHaveLength(8);
    expect(overlap).toEqual(
      packetOrder(ids).filter((_, index) => (index + 1) % 5 === 0),
    );
  });

  test("double-label selection requires the full packet", () => {
    expect(() => doubleLabeledIds(ids.slice(0, 39))).toThrow();
  });
});

describe("gate arithmetic", () => {
  test("accepts 32/40 with a recorded kappa above threshold", () => {
    const decision = evaluateDiagnosisGate({
      scheduled: 40,
      reviewed: 40,
      semanticAccepted: 32,
      safetyViolations: 0,
      kappa: 0.8,
      unresolvedDisagreements: 0,
      blockedReasons: [],
      gates,
    });
    expect(decision.status).toBe("diagnosis_accepted");
    expect(decision.semanticAcceptance.wilson?.lower).toBeGreaterThan(0.62);
  });

  test("rejects a point estimate below 80%", () => {
    const decision = evaluateDiagnosisGate({
      scheduled: 40,
      reviewed: 40,
      semanticAccepted: 31,
      safetyViolations: 0,
      kappa: 0.8,
      unresolvedDisagreements: 0,
      blockedReasons: [],
      gates,
    });
    expect(decision.status).toBe("diagnosis_rejected");
    expect(decision.failing).toContain("semanticAcceptancePoint");
  });

  test("rejects any safety violation", () => {
    const decision = evaluateDiagnosisGate({
      scheduled: 40,
      reviewed: 40,
      semanticAccepted: 40,
      safetyViolations: 1,
      kappa: 0.8,
      unresolvedDisagreements: 0,
      blockedReasons: [],
      gates,
    });
    expect(decision.status).toBe("diagnosis_rejected");
    expect(decision.failing).toContain("safetyViolations");
  });

  test("blocks when review coverage is incomplete", () => {
    const decision = evaluateDiagnosisGate({
      scheduled: 40,
      reviewed: 39,
      semanticAccepted: 32,
      safetyViolations: 0,
      kappa: 0.8,
      unresolvedDisagreements: 0,
      blockedReasons: [],
      gates,
    });
    expect(decision.status).toBe("blocked");
    expect(decision.blockedReasons).toContain("review_coverage_incomplete");
  });

  test("blocks when kappa is below the pre-registered threshold", () => {
    const decision = evaluateDiagnosisGate({
      scheduled: 40,
      reviewed: 40,
      semanticAccepted: 40,
      safetyViolations: 0,
      kappa: 0.5,
      unresolvedDisagreements: 0,
      blockedReasons: [],
      gates,
    });
    expect(decision.status).toBe("blocked");
    expect(decision.blockedReasons).toContain(
      "inter_rater_agreement_below_threshold",
    );
  });

  test("blocks an unresolved disagreement", () => {
    const decision = evaluateDiagnosisGate({
      scheduled: 40,
      reviewed: 40,
      semanticAccepted: 40,
      safetyViolations: 0,
      kappa: 0.9,
      unresolvedDisagreements: 1,
      blockedReasons: [],
      gates,
    });
    expect(decision.status).toBe("blocked");
    expect(decision.blockedReasons).toContain("unresolved_review_disagreement");
  });

  test("reports schema acceptance separately from semantic acceptance", () => {
    const decision = evaluateDiagnosisGate({
      scheduled: 40,
      reviewed: 0,
      semanticAccepted: 0,
      safetyViolations: 0,
      kappa: null,
      unresolvedDisagreements: 0,
      blockedReasons: ["human_review_outstanding"],
      gates,
    });
    expect(decision.status).toBe("blocked");
    expect(decision.checks.find((check) => check.name === "semanticAcceptancePoint")?.value).toBe(0);
  });
});

describe("statistics helpers", () => {
  test("cohen kappa is 1 for perfect agreement", () => {
    expect(cohenKappa([[true, true], [false, false], [true, true]])).toBe(1);
  });

  test("cohen kappa is negative for systematic disagreement", () => {
    const kappa = cohenKappa([[true, false], [true, false], [false, true], [false, true]]);
    expect(kappa).toBeLessThan(0);
  });

  test("cohen kappa returns null with no pairs", () => {
    expect(cohenKappa([])).toBeNull();
  });

  test("percentile uses nearest rank", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5], 0.95)).toBe(5);
    expect(percentile([], 0.5)).toBeNull();
  });

  test("standard-rate estimate is information only", () => {
    expect(
      estimateStandardCostUsd(
        { input_tokens: 1_000_000, output_tokens: 1_000_000, total_tokens: 2_000_000 },
        0.3,
        2.5,
      ),
    ).toBeCloseTo(2.8, 6);
  });
});

describe("availability retry (amendment 2)", () => {
  const httpError = (status: number) =>
    new ModelProviderError("provider rejected", undefined, null, {
      category: "http_error",
      http_status: status,
    });

  test("retries 429 and 503 when the case has not generated", () => {
    expect(availabilityRetryable(httpError(429), false)).toBe(true);
    expect(availabilityRetryable(httpError(503), false)).toBe(true);
  });

  test("never retries once the case has generated", () => {
    expect(availabilityRetryable(httpError(429), true)).toBe(false);
    expect(availabilityRetryable(httpError(503), true)).toBe(false);
  });

  test("does not retry other failures", () => {
    expect(availabilityRetryable(httpError(500), false)).toBe(false);
    expect(availabilityRetryable(httpError(400), false)).toBe(false);
    expect(availabilityRetryable(new Error("timed out"), false)).toBe(false);
  });
});

describe("resume planning", () => {
  const generation = {} as DiagnosisGenerationRecord;
  const failed = { id: "case-1", status: "failed" as const, generations: [] };
  const failedAfterGeneration = {
    id: "case-2",
    status: "failed" as const,
    generations: [generation, generation],
  };
  const completed = {
    id: "case-3",
    status: "completed" as const,
    generations: [generation],
  };

  test("reuses a completed case and never regenerates it", () => {
    expect(caseResumeAction(completed)).toBe("reuse");
  });

  test("reruns a failed case that produced no generation", () => {
    expect(caseResumeAction(failed)).toBe("run");
  });

  test("refuses to rerun a failed case that already generated", () => {
    expect(() => caseResumeAction(failedAfterGeneration)).toThrow(
      "run_interrupted_mid_case",
    );
  });

  test("treats an unattempted case as runnable", () => {
    expect(caseResumeAction(undefined)).toBe("run");
  });

  test("rejects a case that started but never finished", () => {
    expect(() =>
      planResume([{ type: "case_started", caseId: "case-9" }]),
    ).toThrow("run_interrupted_mid_case");
  });

  test("returns records keyed by case id", () => {
    const plan = planResume([
      { type: "case_started", caseId: "case-1" },
      { type: "case_completed", case: failed },
    ]);
    expect(plan.records.get("case-1")).toEqual(failed);
  });
});

describe("review summary", () => {
  const review = (overrides: {
    primary: boolean | null;
    secondary?: boolean | null;
    adjudicated?: boolean | null;
    unsafeReplay?: boolean | null;
  }) => ({
    reviewId: "review-id",
    available: true,
    primary: {
      supportedOrBounded: true,
      correctStatusRoute: true,
      usefulNextEvidence: true,
      claimsEntailed: true,
      noUnsupportedRepair: true,
      noUnsafeReplay: overrides.unsafeReplay ?? true,
      overallAccepted: overrides.primary,
      notes: "",
    },
    secondary:
      overrides.secondary === undefined
        ? null
        : {
            supportedOrBounded: true,
            correctStatusRoute: true,
            usefulNextEvidence: true,
            claimsEntailed: true,
            noUnsupportedRepair: true,
            noUnsafeReplay: true,
            overallAccepted: overrides.secondary,
            notes: "",
          },
    adjudicated: {
      overallAccepted: overrides.adjudicated ?? null,
      notes: "",
    },
  });

  const base = {
    version: 1 as const,
    phase: "R4.5" as const,
    runId: "run",
    protocolHash: "protocol",
    packetHash: "packet",
    status: "pending_review",
    reviewers: { primary: null, secondary: null },
    doubleLabeled: {
      count: 1,
      fraction: 0.2,
      rule: "positions",
      reviewIds: ["review-id"],
    },
  };

  test("computes kappa, agreement, and unresolved disagreements", () => {
    const summary = summarizeReview({
      ...base,
      reviews: [
        review({ primary: true, secondary: true }),
        review({ primary: false, secondary: true, adjudicated: false }),
      ],
    });
    expect(summary.reviewed).toBe(2);
    expect(summary.overlapPairs).toBe(2);
    expect(summary.kappa).toBe(0);
    expect(summary.disagreements).toBe(1);
    expect(summary.unresolved).toBe(0);
    expect(summary.semanticAccepted).toBe(1);
  });

  test("counts reviewer safety flags separately from acceptance", () => {
    const summary = summarizeReview({
      ...base,
      reviews: [review({ primary: true, unsafeReplay: false })],
    });
    expect(summary.reviewerSafetyFlags).toBe(1);
    expect(summary.semanticAccepted).toBe(1);
  });

  test("does not count incomplete primary reviews", () => {
    const summary = summarizeReview({
      ...base,
      reviews: [review({ primary: null })],
    });
    expect(summary.reviewed).toBe(0);
    expect(summary.semanticAccepted).toBe(0);
  });
});

describe("D1 harness: prompt version and split", () => {
  const v2ProtocolPath = join(root, "apps/ai_agent/evaluation/r4/diagnosis-v2/protocol.json");
  const devRun = join(root, "apps/ai_agent/evaluation/r4/runs/dev-20261021-v2");
  const readJson = async (path: string) => JSON.parse(await readFile(path, "utf8"));

  test("protocol accepts phase-11a-v4 and a development split", async () => {
    const raw = await readJson(v2ProtocolPath);
    raw.diagnosis.prompt.version = "phase-11a-v4";
    raw.subset.split = "development";
    const protocol = ProtocolSchema.parse(raw);
    expect(protocol.diagnosis.prompt.version).toBe("phase-11a-v4");
    expect(protocol.subset.split).toBe("development");
  });

  test("existing v2 protocol still parses with split holdout", async () => {
    const { protocol } = await loadDiagnosisProtocol(v2ProtocolPath);
    expect(protocol.subset.split).toBe("holdout");
    expect(protocol.diagnosis.prompt.version).toBe("phase-11a-v3");
  });

  test("development split rejects a holdout case id", async () => {
    const holdoutCase = (await readJson(subsetPath)).cases[0];
    const context = await loadDevelopmentContext();
    expect(() =>
      planDiagnosisCases({
        split: "development",
        cases: [holdoutCase],
        context,
        scores: { records: {} },
        retrievalReport: { rows: [] },
      }),
    ).toThrow("missing from the development cohort");
  });

  test("development subset reproduces the frozen dev retrieval", async () => {
    const subset = await readJson(join(root, "apps/ai_agent/evaluation/d1/dev-subset-v1.json"));
    const planned = planDiagnosisCases({
      split: "development",
      cases: subset.cases,
      context: await loadDevelopmentContext(),
      scores: await readJson(join(devRun, "scores-original.json")),
      retrievalReport: await readJson(join(devRun, "report.json")),
    });
    expect(planned).toHaveLength(40);
  });
});
