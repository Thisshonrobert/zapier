// R3.5 release gate. Pure and total: a missing metric fails closed, and a gate
// can only pass when every predeclared threshold is met.
import { z } from "zod";

export const HOLD_OUT_GATE_THRESHOLDS = {
  hitAt3: 0.9,
  macroSectionRecallAt3: 0.9,
  noMatchAbstention: 0.9,
  falseAbstentionMax: 0.05,
  directPrecisionMin: 0,
  routeCoverage: 1,
  reliability: 0.95,
  p95LatencyMs: 3_000,
  safetyViolationsMax: 0,
} as const;

export const HoldoutGateThresholdsSchema = z
  .object({
    hitAt3: z.number().min(0).max(1),
    macroSectionRecallAt3: z.number().min(0).max(1),
    noMatchAbstention: z.number().min(0).max(1),
    falseAbstentionMax: z.number().min(0).max(1),
    directPrecisionMin: z.number().min(0).max(1),
    routeCoverage: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    p95LatencyMs: z.number().nonnegative(),
    safetyViolationsMax: z.number().int().nonnegative(),
  })
  .strict();

export type HoldoutGateThresholds = z.infer<
  typeof HoldoutGateThresholdsSchema
>;

export type HoldoutGateMetrics = {
  sufficientGuidanceHitAt3: number | null;
  macroSectionRecallAt3: number | null;
  noMatchAbstention: number | null;
  falseAbstention: number | null;
  directPrecisionAt3: number | null;
  routeCoverage: number | null;
  reliability: number | null;
  p95LatencyMs: number | null;
  safetyViolations: number;
};

export type HoldoutGateCheck = {
  value: number | null;
  threshold: number;
  rule: ">=" | "<=";
  pass: boolean;
};

export type HoldoutGateResult = {
  status: "accepted" | "rejected";
  checks: {
    hitAt3: HoldoutGateCheck;
    macroSectionRecallAt3: HoldoutGateCheck;
    noMatchAbstention: HoldoutGateCheck;
    falseAbstention: HoldoutGateCheck;
    directPrecisionAt3: HoldoutGateCheck;
    routeCoverage: HoldoutGateCheck;
    reliability: HoldoutGateCheck;
    p95LatencyMs: HoldoutGateCheck;
    safetyViolations: HoldoutGateCheck;
  };
  failing: string[];
};

const atLeast = (
  value: number | null,
  threshold: number,
): HoldoutGateCheck => ({
  value,
  threshold,
  rule: ">=",
  pass: value !== null && value >= threshold,
});

const atMost = (
  value: number | null,
  threshold: number,
): HoldoutGateCheck => ({
  value,
  threshold,
  rule: "<=",
  pass: value !== null && value <= threshold,
});

export function evaluateHoldoutGate(
  metrics: HoldoutGateMetrics,
  rawThresholds: HoldoutGateThresholds = HOLD_OUT_GATE_THRESHOLDS,
): HoldoutGateResult {
  const thresholds = HoldoutGateThresholdsSchema.parse(rawThresholds);
  const checks: HoldoutGateResult["checks"] = {
    hitAt3: atLeast(
      metrics.sufficientGuidanceHitAt3,
      thresholds.hitAt3,
    ),
    macroSectionRecallAt3: atLeast(
      metrics.macroSectionRecallAt3,
      thresholds.macroSectionRecallAt3,
    ),
    noMatchAbstention: atLeast(
      metrics.noMatchAbstention,
      thresholds.noMatchAbstention,
    ),
    falseAbstention: atMost(
      metrics.falseAbstention,
      thresholds.falseAbstentionMax,
    ),
    directPrecisionAt3: atLeast(
      metrics.directPrecisionAt3,
      thresholds.directPrecisionMin,
    ),
    routeCoverage: atLeast(metrics.routeCoverage, thresholds.routeCoverage),
    reliability: atLeast(metrics.reliability, thresholds.reliability),
    p95LatencyMs: atMost(metrics.p95LatencyMs, thresholds.p95LatencyMs),
    safetyViolations: atMost(
      metrics.safetyViolations,
      thresholds.safetyViolationsMax,
    ),
  };
  const failing = Object.entries(checks)
    .filter(([, check]) => !check.pass)
    .map(([name]) => name);
  return {
    status: failing.length ? "rejected" : "accepted",
    checks,
    failing,
  };
}
