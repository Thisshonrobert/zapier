import { metrics } from "./retrieval-r21.ts";
import { diagnoseR23 } from "./r23-analysis.ts";
export type R24Row = {
  split: string;
  relevant: readonly string[];
  candidates: readonly string[];
  logits: Record<string, number>;
  latencyMs: number;
};
export function rowsAtR24(rows: readonly R24Row[], threshold: number) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw new Error("Invalid cutoff");
  return rows.map((row) => ({
    ...row,
    returned: diagnoseR23(row.relevant, row.candidates, row.logits)
      .ranking.filter((r) => r.score >= threshold)
      .slice(0, 3)
      .map((r) => r.citation),
  }));
}
export function selectR24(
  rows: readonly R24Row[],
  thresholds: readonly number[],
) {
  const development = rows.filter((r) => r.split === "development");
  if (
    !development.length ||
    !thresholds.length ||
    new Set(thresholds).size !== thresholds.length
  )
    throw new Error("Invalid calibration data/grid");
  const grid = thresholds.map((threshold) => {
    const measured = metrics(rowsAtR24(development, threshold));
    return {
      threshold,
      metrics: measured,
      objective:
        (measured.recallAt3 ?? 0) + (measured.noMatchAbstentionRate ?? 0),
    };
  });
  const selected = [...grid].sort(
    (a, b) =>
      b.objective - a.objective ||
      (b.metrics.mrr ?? 0) - (a.metrics.mrr ?? 0) ||
      (a.metrics.answerableAbstentionRate ?? 0) -
        (b.metrics.answerableAbstentionRate ?? 0) ||
      a.threshold - b.threshold,
  )[0]!;
  return { threshold: selected.threshold, grid };
}
