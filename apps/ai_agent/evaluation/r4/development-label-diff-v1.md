# R4 development label re-adjudication diff

**Date:** 2026-10-21
**Source:** `apps/ai_agent/evaluation/r3/development-labels-v1.json` (version 1, 24 cases)
**Result:** `apps/ai_agent/evaluation/r4/development-labels-v2.json` (version 2, 24 cases)
**Cases:** `apps/ai_agent/evaluation/r4/development-cases-v1.json` (24 cases, accepted citations aligned to the v2 labels)
**Evidence:** `apps/ai_agent/evaluation/r4/development-evidence-v1.json` (24 entries copied from `production-selection/development-review-v3.json`; no evidence edited)

The R4 label rules accept every independently sufficient section. The R3 labels
accepted only the canonical runbook when two sibling runbooks covering the same
taxonomy were independently sufficient. This is the F04 label-equivalence fix
from the R3.5 failure ledger.

## Label changes

Only the two development cases whose family is F04 have changed.

### `f04-template-path-missing`

| Facet | R3 accepted | R4 accepted |
| --- | --- | --- |
| `investigation` | `RB-F04-F06@1.0.0#read-only-investigation` | `RB-F04-F06@1.0.0#read-only-investigation`, `RB-F03-F04@1.0.0#read-only-investigation` |
| `remediation` | `RB-F04-F06@1.0.0#allowed-remediation` | `RB-F04-F06@1.0.0#allowed-remediation`, `RB-F03-F04@1.0.0#allowed-remediation` |

Additions are independently sufficient:

- `RB-F03-F04@1.0.0#read-only-investigation` says to validate action inputs
  without returning values and to distinguish an absent field from an unknown
  worker-environment fallback. Its evidence section also names missing template
  paths.
- `RB-F03-F04@1.0.0#allowed-remediation` says to correct invalid workflow
  configuration through the owning application. A missing template path is
  invalid workflow configuration.

The canonical `RB-F04-F06` citations remain first. The rationale now carries one
line per citation, each line starting with its citation.

### `f04-invalid-destination`

| Facet | R3 accepted | R4 accepted |
| --- | --- | --- |
| `investigation` | `RB-F03-F04@1.0.0#read-only-investigation` | `RB-F03-F04@1.0.0#read-only-investigation`, `RB-F04-F06@1.0.0#read-only-investigation` |
| `remediation` | `RB-F03-F04@1.0.0#allowed-remediation` | `RB-F03-F04@1.0.0#allowed-remediation`, `RB-F04-F06@1.0.0#allowed-remediation` |

Additions are independently sufficient:

- `RB-F04-F06@1.0.0#read-only-investigation` says to run deterministic input
  validation. An invalid destination field is an input-validation finding.
- `RB-F04-F06@1.0.0#allowed-remediation` says to repair the producing data or
  workflow definition for future runs.

The canonical `RB-F03-F04` citations remain first. The rationale now carries one
line per citation, each line starting with its citation.

## Unchanged labels

The other 22 label rows are unchanged in content. All eight no-match rows keep
their existing rationale text; each already names the cause as missing corpus
guidance and none is provider-ineligible. No no-match row gained or lost a
facet.

## Checks applied

- Every multi-citation facet has one rationale line per accepted citation and
  each line starts with its citation.
- Every case has at most three required facets. The cohort maximum remains two.
- No facet has more than four accepted citations. The cohort maximum is two.
- Supporting citations do not overlap accepted citations.
- No accepted citation changed for any non-F04 case.
- No case input, kind, split, supporting list, or missing-runtime-facts list
  changed.
- The frozen corpus was not edited.

## Files

- `development-cases-v1.json` — 24 cases, 16 answerable and 8 no-match.
- `development-labels-v2.json` — version 2, 24 label rows.
- `development-evidence-v1.json` — 24 reused evidence entries.

No holdout file was created or opened. The remaining 56 development cases and
the 160-case holdout are not authored in this step.

## Addendum — R4.1 Steps 3–8 (2026-10-21)

The historical section above records only Steps 1–2. The cohort was later
completed by [`authoring/build-cohorts.ts`](authoring/build-cohorts.ts):

- Development: 24 baseline rows plus 56 newly authored rows = 80 cases
  (60 answerable, 20 no-match). The 22 unchanged baseline rows remain unchanged;
  the two F04 rows keep the equivalence additions documented above.
- Holdout: 160 cases (120 answerable, 40 no-match), 12 answerable per family,
  10 no-match per bucket.
- Evidence: one synthetic sanitized entry per new case. No R3.5 recovery or
  R3.5 holdout evidence was reused, and the frozen corpus was not edited.
- Labels: every accepted citation has a rationale line; F04 accepts both
  `RB-F04-F06@1.0.0#<section>` and `RB-F03-F04@1.0.0#<section>` for the same
  facet.
- Diagnosis subset: 40 pre-registered cases (30 answerable, 10 no-match).
- Audit: rule-based, AI-assisted; kappa 1.00 on a 32-case stratified sample and
  zero structural defects. This is not an independent human review; human
  sign-off remains outstanding before R4.4.
- Seal: `holdout/seal.json`, recorded in `protocol.json.holdoutSeal`.

The final development files are therefore 80 cases / 80 labels / 80 evidence
entries, not the 24-case counts in the historical sections above.
