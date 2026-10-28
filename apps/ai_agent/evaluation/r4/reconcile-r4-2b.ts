// R4.2b reconciliation. It compares the route hints, confidence, and requested
// facets produced by the current tree against the frozen R4.0 baseline capture
// on the 24-case R3 development cohort.
//
// Read-only: no retriever, model, or holdout is opened. The baseline capture is
// the only input compared; route/facet derivation is deterministic.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DiagnosisEvidence } from "../../src/contracts.ts";
import { loadTargetCases } from "../../src/evaluation/retrieval-target.ts";
import { buildStructuredRetrievalInput } from "../../src/tools/retrieval-profile.ts";

const evaluationDirectory = join(import.meta.dir, "..");
const baselinePath = join(
  import.meta.dir,
  "runs/baseline-reconciliation-20261021-v1/capture/route-audit.json",
);

type BaselineCase = {
  id: string;
  hints: string[];
  confident: boolean;
  requestedFacets: string[];
};

const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as {
  inputHash: string;
  cases: BaselineCase[];
};

const review = JSON.parse(
  readFileSync(
    join(evaluationDirectory, "production-selection/development-review-v3.json"),
    "utf8",
  ),
) as { cases: Array<{ id: string; evidence: DiagnosisEvidence }> };
const evidenceById = new Map(
  review.cases.map((item) => [item.id, item.evidence]),
);

const cases = await loadTargetCases(
  join(evaluationDirectory, "r3/development-cases-v1.json"),
);

const changes = cases.flatMap((item) => {
  const before = baseline.cases.find((row) => row.id === item.id);
  if (!before) throw new Error(`Baseline is missing ${item.id}`);
  const profile = buildStructuredRetrievalInput(evidenceById.get(item.id)!);
  const after = {
    hints: profile.route?.hints ?? [],
    confident: profile.route?.confident ?? false,
    requestedFacets: [...(profile.requestedFacets ?? [])],
    droppedFacets: [...(profile.trace?.facetSelection.dropped ?? [])],
    weakTokenRejected: [...(profile.trace?.weakTokenRejected ?? [])],
  };
  const same =
    JSON.stringify(before.hints) === JSON.stringify(after.hints) &&
    before.confident === after.confident &&
    JSON.stringify(before.requestedFacets) ===
      JSON.stringify(after.requestedFacets);
  return same
    ? []
    : [
        {
          id: item.id,
          before: {
            hints: before.hints,
            confident: before.confident,
            requestedFacets: before.requestedFacets,
          },
          after,
          changes: {
            hints:
              JSON.stringify(before.hints) !== JSON.stringify(after.hints),
            confident: before.confident !== after.confident,
            requestedFacets:
              JSON.stringify(before.requestedFacets) !==
              JSON.stringify(after.requestedFacets),
          },
        },
      ];
});

const record = {
  version: 1,
  phase: "R4.2b",
  createdAt: new Date().toISOString(),
  baselineInputHash: baseline.inputHash,
  cohort: "apps/ai_agent/evaluation/r3/development-cases-v1.json (24 cases)",
  compared: ["hints", "confident", "requestedFacets"],
  unchanged: cases.length - changes.length,
  changed: changes.length,
  changes,
};

const target = join(import.meta.dir, "runs/r4-2b-reconciliation.json");
await Bun.write(target, `${JSON.stringify(record, null, 2)}\n`);
console.log(
  JSON.stringify({
    compared: cases.length,
    unchanged: record.unchanged,
    changed: record.changed,
  }),
);
console.log(`wrote ${target}`);
