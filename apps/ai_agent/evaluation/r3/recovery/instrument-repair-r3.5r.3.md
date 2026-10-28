# R3.5r.3 screening-instrument repair

**Status: documentation record only. The structured-minilm / R3.5r.3 line
remains closed.** This record describes the repair made after
[`screening-report-revision-4.md`](./screening-report-revision-4.md), not a new
screening result. It does not reopen the line, authorise a revision 5, freeze the
candidate, or commission holdout v2.

Date: 2026-10-20
Phase: R3.5r.3 screening-instrument repair (post-run, documentation only)
Frozen failure of record: [`runs/dev-20261020-v6`](./runs/dev-20261020-v6) and
[`screening-report-revision-4.md`](./screening-report-revision-4.md)

## 1. What was wrong

Revision 4 recorded two instrument defects (S1-S6 in the report):

1. `loadRecoveryContext` derived accepted citations from the **cases** file
   (`development-cases-v2.json`), so `development-labels-v3.json` was not the
   scored source. It fed only `equivalenceProvenance`.
2. The packer's reported `facetsCovered` credited a facet by heading family while
   the metric required citation-exact membership. A case could therefore report a
   facet as covered and list the same facet as missing.

Together these made a label-equivalence revision unmeasurable and made the
`strictLabelGap` safeguard inert.

## 2. The repair

- **One scored source.** `development-labels-v3.json` is now the single scored
  source of accepted citations. The cases file still supplies each case's id,
  kind, input, and evidence linkage; its `requiredFacets` are not read by the
  scored path.
- **Coverage follows the metric.** `rankStructured` now accepts the metric's
  accepted-citation map. When it is supplied, `facetsCovered` means "a returned
  citation is accepted for this facet", exactly as the sufficiency metric does.
  Heading-family matching remains only as a fallback when no label map is
  supplied.
- **No ranking change.** The label map is used for the reported coverage
  diagnostic only; it is not passed into `packByFacet`. Returned citations are
  unchanged by the coverage half of the repair.

The frozen protocol, cases, labels, evidence, corpus, review source, and the
revision-4 report were not edited.

## 3. Exact changed files

| File | Change |
| --- | --- |
| `apps/ai_agent/src/evaluation/recovery-screening.ts` | Added `scoredCasesFromLabels`. `loadRecoveryContext` now builds scored cases from the labels file and uses them for rows, accepted sets, route coverage, metrics, and the acceptance map passed to the packer. Removed the unused `labelFacetCovered` helper. |
| `apps/ai_agent/src/tools/structured-ranking.ts` | Added an optional `ReadonlyMap<RequestedFacet, readonly string[]>` argument to `rankStructured`; `facetsCovered` uses citation-exact accepted membership when provided and falls back to `sectionFacet(heading)` only when no map is supplied. |
| `apps/ai_agent/tests/recovery-screening.test.ts` | Added regression tests for the scored label source, the known v3/cases difference, metric movement when a label citation is mutated, and a non-zero `strictLabelGap`. |

Not changed: `protocol-r3.5r.json`, `development-cases-v2.json`,
`development-labels-v3.json`, `development-evidence-v2.json`,
`screening-report-revision-4.md`, the revision-4 run directory, or any holdout
artefact.

## 4. Verification

Run from `apps/ai_agent`:

| Command | Result |
| --- | --- |
| `bun test tests/recovery-screening.test.ts` | 11 pass, 0 fail, 57 `expect()` calls, 433 ms |
| `bun test tests/retrieval-target.test.ts tests/retrieval-profile.test.ts` | 49 pass, 0 fail, 4,384 `expect()` calls, 318 ms |
| `bun run check-types` | `tsc --noEmit` completed with no diagnostics |

Run from the repository root:

| Command | Result |
| --- | --- |
| `bun run check-types` | 2 successful, 2 total (ai_agent and `@repo/ui`; `@repo/ui` from cache), 8.064 s |

No screening run, model inference, gate evaluation, or holdout access was used
for these checks. Root lint and build were not rerun for this documentation-only
record; no frontend or runtime source changed.

## 5. Offline diagnostic deltas

**Diagnostic only. These are not pass/fail results and no gate was evaluated.**
The deltas below were recomputed from the frozen revision-4 candidate per-case
rows in `runs/dev-20261020-v6/report.json` and the v3 accepted sets. No model
inference, new screening run, or new run directory was produced.

Returned citations are identical to revision 4 in all 32 cases. The label-source
repair changes how those frozen returns are read, not what the candidate returned.

| Metric | Revision-4 instrument (cases source) | Repaired instrument (labels v3 source) | Delta |
| --- | ---: | ---: | ---: |
| `dev-24` hit@3 | 81.25% (13/16) | 81.25% (13/16) | 0 |
| `dev-24` macro section recall@3 | 84.38% | 84.38% | 0 |
| `dev-24` direct precision@3 | 47.92% | 47.92% | 0 |
| `dev-24` strict hit@3 | 81.25% | 81.25% | 0 |
| `dev-24` strict label gap | 0.00 pts | 0.00 pts | 0 |
| `dev-32` hit@3 | 77.27% (17/22) | 81.82% (18/22) | +1 case (+4.55 pts) |
| `dev-32` macro section recall@3 | 84.85% | 85.30% | +0.45 pts |
| `dev-32` direct precision@3 | 59.09% | 60.61% | +1.52 pts |
| `dev-32` no-match abstention | 100.00% (10/10) | 100.00% (10/10) | 0 |
| `dev-32` false abstention | 0.00% (0/22) | 0.00% (0/22) | 0 |
| `dev-32` strict hit@3 | 77.27% (17/22) | 77.27% (17/22) | 0 |
| `dev-32` strict macro section recall@3 | 84.09% | 84.09% | 0 |
| `dev-32` strict label gap | 0.00 pts | 4.55 pts | +4.55 pts |

The entire metric movement is the one extension case whose accepted set differs
between the cases and labels files:

| Case | Revision-4 sufficient | Repaired sufficient | Revision-4 section recall | Repaired section recall | Revision-4 direct precision | Repaired direct precision |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `f04-sibling-destination-repair` | false | true | 0.50 | 0.60 | 0.67 | 1.00 |

The citation-exact coverage predicate removes the reported coverage/missing
contradiction. Cases whose returned section was only a family match now report
the facet as uncovered, matching the metric:

| Case | Revision-4 `facetsCovered` | Repaired `facetsCovered` | Revision-4 missing | Repaired missing |
| --- | --- | --- | --- | --- |
| `f04-template-path-missing` | investigation, remediation, verification | verification | investigation, remediation | investigation, remediation |
| `f10-sdk-error-recorded-success` | investigation, remediation, verification | remediation, verification | investigation, forbidden | investigation, forbidden |
| `f03-f04-credential-and-template-overlap` | investigation, remediation, verification | remediation, verification | investigation | investigation |
| `f04-sibling-destination-repair` | investigation, remediation, verification | investigation, remediation, verification | verification | none |

For `f04-sibling-destination-repair`, coverage stays all three because the v3
labels accept the returned sibling verification citation. The contradiction is
resolved by the label source, not by dropping coverage.

These numbers show what the repaired instrument reads on the frozen revision-4
returns. They do not establish that the candidate passed, that the method is
accepted, or that holdout transfer exists. In particular, the `dev-32` hit figure
crossing the numeric 80% development threshold is not a gate result here: no gate
was run, and a replayed number cannot reopen a closed line.

## 6. What this record does not do

- It is not a new screening run and does not create a new run directory.
- It does not reopen or authorise the closed structured-minilm / R3.5r.3 line.
- It does not authorise a revision 5, candidate freeze, gate change, or holdout v2.
- It does not rewrite, re-sign, or retrospectively approve any frozen artefact.
  The `development-labels-v3.constituents.json` row remains unsigned as recorded
  in revision-4 deviation D-1.
- It does not update Graphify; no milestone merge has occurred.

The disposition in
[`screening-report-revision-4.md`](./screening-report-revision-4.md) section 7
stands unchanged.
