# R3.5r.3 — development screening

**Status: `failed`.**

Generated from the frozen recovery protocol revision 3 and the development v2
cohort. This is screening, not release acceptance. No candidate behavior was
changed to produce this report.

## Gate

| Gate | Value | Threshold | Result |
| --- | --- | --- | --- |
| dev24SufficientGuidanceHitAt3 | 81.25% | 80.00% | pass |
| dev24MacroSectionRecallAt3 | 84.38% | 80.00% | pass |
| dev32SufficientGuidanceHitAt3 | 77.27% | 80.00% | **FAIL** |
| dev32MacroSectionRecallAt3 | 84.85% | 80.00% | pass |
| dev32NoMatchAbstention | 100.00% | 90.00% | pass |
| dev32FalseAbstention | 0.00% | 5.00% | pass |
| directPrecisionDev24 | 47.92% | 22.92% | pass |
| directPrecisionDev32 | 59.09% | 24.24% | pass |
| facetInvariant | true | true | pass |
| typedRouteAudit | true | true | pass |
| equivalenceProvenance | true | true | pass |
| routeCoverage | 100.00% | 100.00% | pass |

Failing checks: `dev32SufficientGuidanceHitAt3`.

## Cohort results

| Cohort | Arm | hit@3 | Macro recall | Direct precision | No-match abstention | False abstention | Strict hit@3 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| dev-24 | candidate | 81.25% | 84.38% | 47.92% | 100.00% | 0.00% | 81.25% |
| dev-24 | keyword | 12.50% | 37.50% | 22.92% | 0.00% | 0.00% | 12.50% |
| dev-32 | candidate | 77.27% | 84.85% | 59.09% | 100.00% | 0.00% | 77.27% |
| dev-32 | keyword | 9.09% | 34.47% | 24.24% | 0.00% | 0.00% | 9.09% |

Strict-label sensitivity is reported beside the primary metric; a primary minus
strict gap above 0.10 is a labelling risk (dev-32 gap:
0.00%).

## Integrity

| Check | Result |
| --- | ---: |
| Facet invariant | pass |
| Typed-route audit | pass |
| Equivalence provenance | pass |
| Freeze integrity | pass |
| No consumed holdout data | pass |

## Failure ledger

| Case | Family | Kind | Bucket | Returned | Missing facets | Requested facets |
| --- | --- | --- | --- | --- | --- | --- |
| `f04-template-path-missing` | F04 | answerable | label_equivalence | RB-F03-F04@1.0.0#read-only-investigation, RB-F03-F04@1.0.0#verification-rollback-or-escalation, RB-F03-F04@1.0.0#allowed-remediation | investigation, remediation | investigation, remediation, verification |
| `f10-sdk-error-recorded-success` | F10 | answerable | facet_derivation | RB-F09-F10@1.0.0#verification-rollback-or-escalation, RB-F07@1.0.0#read-only-investigation, RB-F07@1.0.0#allowed-remediation | investigation, forbidden | investigation, remediation, verification |
| `s03-sensitive-fields-present` | S | answerable | facet_derivation | RB-F03-F04@1.0.0#read-only-investigation, RB-F03-F04@1.0.0#verification-rollback-or-escalation, RB-F03-F04@1.0.0#allowed-remediation | forbidden | investigation, remediation, verification |
| `f04-sibling-destination-repair` | F04 | answerable | label_equivalence | RB-F04-F06@1.0.0#read-only-investigation, RB-F03-F04@1.0.0#allowed-remediation, RB-F03-F04@1.0.0#verification-rollback-or-escalation | verification | investigation, remediation, verification |
| `f03-f04-credential-and-template-overlap` | F03 | answerable | label_equivalence | RB-F04-F06@1.0.0#read-only-investigation, RB-F03-F04@1.0.0#verification-rollback-or-escalation, RB-F03-F04@1.0.0#allowed-remediation | investigation | investigation, remediation, verification |

## Frozen inputs

| Artifact | SHA-256 |
| --- | --- |
| corpus sections | `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440` |
| development cases v2 | `57557fa3c41df2a1aa3af2e8fc9cd446efff125c617b53c3e14e2b7d32544adf` |
| development labels v2 | `cb4b9caecd5243a31eca57abbb6d452311a84ad3983a42a73a8c91e2c0545793` |
| recovery protocol | `f4ee2f19cf13a40ad20211fac71ae297715bfd277fbb618f8dcc18b0935f20ad` |
| development evidence v2 | `a16bb6345029bb3e8c89bfefce388fdf186852f8b2520b051fe42c7dd01b3409` |
| pinned review source | `0c7fba48fc0dc1ec86c23bd93d5d04f6c9ef131a4542ca953ca6a32878b7c585` |

## Limitations

- Pinned evidence is the reviewed production-selection capture; extension evidence was authored at R3.5r.3 to close the missing-evidence gap in R3.5r.1 and was not part of that independent review.
- The extension evidence was written after the extension labels were frozen and before any extension ranking or score existed.
- The evaluation remains a development screening; it does not establish holdout transfer.
- The development cohort is exposed and may be tuned on; these values screen the
  candidate and are not release acceptance.
- The 80% development gate is a screening gate. It is not the 90% release gate.
