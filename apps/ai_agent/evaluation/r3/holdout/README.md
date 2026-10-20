# R3.5 independent holdout

This directory is the frozen 40-case independent holdout for R3 retrieval
acceptance. It was authored separately from the development cohort and the
retrieval implementation, then reviewed by an independent second reviewer
before freeze.

## Contents

| File | Purpose |
| --- | --- |
| `cases-v1.json` | 40 target cases (30 answerable, 10 no-match) |
| `labels-v1.json` | Reviewed facet labels and rationales |
| `evidence-v1.json` | Controlled-fixture evidence used to derive each structured query |
| `review-v1.json` | First independent second-review record (revisions requested) |
| `review-final-v1.json` | Final independent review after corrections (accepted) |
| `authoring-attestation-v1.json` | Blind-author attestation and applied corrections |
| `freeze-v1.json` | Hashes and provenance written before the acceptance run |
| `freeze-v1.json` | Hashes and provenance written before the acceptance run |
| `runs/` | Immutable acceptance runs |

## Composition

- 30 answerable cases, exactly three per taxonomy family F01-F10.
- 10 genuine no-match cases (`NM`).
- No case id, incident family, or paraphrase is reused from the development
  cohort or an earlier R2.5 run.
- F05 unsupported-handler and F10 hidden-SDK-error gaps are represented
  honestly; they are not softened to make retrieval look better.
- Access eligibility follows `eligibleRunbookSections`: a runbook declaring
  `generic` is provider-agnostic, and a section is eligible when its providers
  intersect the case providers or include `generic`. Every accepted holdout
  citation was asserted eligible under this rule before freeze.

## Freeze rule

`freeze-v1.json` pins the selected configuration, corpus, protocol, cases,
labels, evidence, and reviewer record by SHA-256. `--prepare-holdout` refuses to
run if any hash differs. The holdout is run once. No tuning, reranking, route
repair, or label adjustment is permitted after the run starts.

## Provenance

- Author: independent blind author, restricted to `docs/AI/runbooks/**`,
  `docs/AI/failure-taxonomy.md`, and the frozen corpus; no development cases,
  labels, scores, or rankings were visible.
- Reviewer: independent second reviewer, same access restriction, reviewed
  every case and label before freeze. `review-v1.json` records the attestation
  and the corrections applied.
