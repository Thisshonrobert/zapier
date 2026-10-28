# R3.5r.3 revision 4 - development screening report

**Status: `failed`. Do not freeze the candidate. Do not commission holdout v2.**

Date: 2026-10-20
Phase: R3.5r.3 revision 4 (development screening, `dev-24` and `dev-32`)
Candidate: `profile-route-facets-support-r3.5r`, profile `r3.5r-v1`,
`structured-minilm`, route enabled, support `minAnchorHits: 1`, packing `r3.3-v1`
Protocol: `protocol-r3.5r.json` revision 4 (`f4ee2f19...`)
Labels: `development-labels-v3.json` (`cb4b9cae...`), predecessor `v2` (`5a0f7565...`)
Run: [`runs/dev-20261020-v6`](./runs/dev-20261020-v6) (one shot, no rerun)

## 1. Gate result

| Gate | Value | Threshold | Result |
| --- | ---: | ---: | --- |
| `dev-24` hit@3 | 81.25% (13/16) | 80% | pass |
| `dev-24` macro section recall@3 | 84.38% | 80% | pass |
| `dev-32` hit@3 | 77.27% (17/22) | 80% | **FAIL** |
| `dev-32` macro section recall@3 | 84.85% | 80% | pass |
| `dev-32` no-match abstention | 100.00% (10/10) | 90% | pass |
| `dev-32` false abstention | 0.00% (0/22) | <= 5% | pass |
| Direct precision `dev-24` | 47.92% | >= keyword 22.92% | pass |
| Direct precision `dev-32` | 59.09% | >= keyword 24.24% | pass |
| Facet invariant | true | true | pass |
| Typed-route audit | true | true | pass |
| Equivalence provenance | true | true | pass |
| Route coverage | 100.00% | 100% | pass |

One of eight screening checks fails: `dev32SufficientGuidanceHitAt3`. Macro
recall is a mean of per-case section ratios (`retrieval-target.ts:408`), so it
has no integer absolute count; the absolute unit in this line is cases
(13/16 and 17/22), and facet-level misses are enumerated in the ledger.

## 2. Pre-registered prediction vs actual

| Metric | Predicted | Actual | Delta |
| --- | ---: | ---: | --- |
| `dev-24` hit@3 | 81.25% (13/16) | 81.25% (13/16) | exact |
| `dev-24` macro recall@3 | 87.50% | 84.38% | -3.13 pts |
| `dev-32` hit@3 | 81.82% (18/22) | 77.27% (17/22) | **-1 case** |
| `dev-32` macro recall@3 | 88.64% | 84.85% | -3.79 pts |
| Strict-label hit@3 | 77.27% | 77.27% | exact (not informative, see S4) |

Predicted `dev-24` misses (`f04-template-path-missing`,
`f10-sdk-error-recorded-success`, `s03-sensitive-fields-present`) all
materialised. The single additional miss is
`f04-sibling-destination-repair` - the case D2 was introduced to fix.

The prediction was wrong in the direction that matters: it assumed the accepted
equivalence would be credited. It was not, for a structural reason (S4), not a
ranking reason alone.

## 3. The miss

`f04-sibling-destination-repair` (F04, answerable, bucket `label_equivalence`):

- Returned: `RB-F04-F06#read-only-investigation`, `RB-F03-F04#allowed-remediation`,
  `RB-F03-F04#verification-rollback-or-escalation`
- Missing: `verification`

The returned verification section is the D2 sibling citation. The scorer does
not accept it, because the citation the metric accepts for this case's
`verification` facet is `RB-F04-F06#verification-rollback-or-escalation`, which
was not returned. Independently reproduced against the frozen artefacts:

```
sufficient: false, sectionRecall: 0.5
canonicalAccepted: [F04-F06 read-only, F04-F06 allowed-remediation, F04-F06 verification]
```

So the packer preferred the sibling family section in slot 3 over the
family-canonical section that the metric requires.

## 4. Blocking instrument finding - the label equivalence is not scored

S1. `loadRecoveryContext` derives its accepted set from the **cases** file, not
the labels file: `const accepted = uniq(item.requiredFacets.flatMap(f => f.accepted))`
where `item` comes from `development-cases-v2.json`
(`recovery-screening.ts:217`).

S2. `scoreTarget` computes `sufficient`, `sectionRecall`, `canonicalAccepted`
and the strict arm from those same case objects (`retrieval-target.ts:293-362`).

S3. `development-labels-v3.json` therefore feeds only `equivalenceProvenance`, a
boolean that was already true on v2 and remains true on v3. The helper
`labelFacetCovered` (`recovery-screening.ts:150`) is defined and never called.

S4. Consequence: `strictLabelGap` is structurally 0.00% in every run this
cohort has produced - v5 reported 0.00% and v6 reports 0.00%. The earlier
reading of that gap as "the pass is not labelling-widened" was wrong in its
premise: the strict arm cannot differ from the primary arm while the labels
file is unscored.

S5. The two artefacts duplicate the same `requiredFacets` data with different
hashes in the freeze block (`expected.cases` vs `expected.labels`). Revision 4
edited the copy that no metric reads. Any revision confined to the labels file
is unmeasurable by construction: a protocol design defect, not a candidate
defect.

S6. Secondary defect, same root: the packer credits facet coverage by family
while the metric requires citation-exact membership. For this case the run's own
`detail` reports `facetsCovered: [investigation, remediation, verification]`
alongside `missingFacets: [verification]`. The report is internally
contradictory, and the packer can stop packing a facet it has not satisfied
under the metric's definition. This is why the failure initially reads as a
capability miss when it is partly an objective-mismatch miss.

Reviewer error of record: the sufficiency judgement recorded before this run
assessed the citation's content and admissibility, and did not verify which
artefact the scorer reads. Had S1 been checked at that gate, the run should have
been blocked as unmeasurable rather than authorised.

## 5. Failure ledger

| Case | Family | Kind | Bucket | Missing facets |
| --- | --- | --- | --- | --- |
| `f04-template-path-missing` | F04 | answerable | label_equivalence | investigation, remediation |
| `f10-sdk-error-recorded-success` | F10 | answerable | facet_derivation | investigation, forbidden |
| `s03-sensitive-fields-present` | S | answerable | facet_derivation | forbidden |
| `f04-sibling-destination-repair` | F04 | answerable | label_equivalence | verification |
| `f03-f04-credential-and-template-overlap` | F03 | answerable | label_equivalence | investigation |

`f10` and `s03` request `investigation, remediation, verification` while their
labels need `forbidden`; the derived demand never asks for it. `f10` also loses
`investigation` because the returned F07 section is not an accepted F10
citation.

## 6. Integrity and deviations

| Check | Result |
| --- | --- |
| Facet invariant | pass |
| Typed-route audit | pass |
| Equivalence provenance | pass |
| Freeze integrity (protocol, cases, labels, corpus, review) | pass |
| No consumed holdout data | pass |

Deviation D-1: the run was executed while
`development-labels-v3.constituents.json` still carried
`status: pending_second_review` and `reviewer: null`. Phase C was gated on that
signature. The run is therefore not protocol-compliant, and had it passed it
could not have been cited as a compliant pass. It failed, so the close-out
stands; the label row is deliberately left unsigned, because signing after
seeing the score would be retrospective approval and the artefact is not scored.

## 7. Disposition

The gate failed exactly once, as predeclared. Under stop rules 4 and 14 the
structured-minilm recovery line is **closed as a recorded negative result**:

- no revision 5, and no post-run tuning of demands, signals, labels,
  equivalence, packing, gates, thresholds or exclusions;
- candidate not frozen; holdout v2 not commissioned;
- this outcome is recorded here, not by editing the pre-registered protocol or
  label artefacts, which stay append-only.

What this run does **not** establish: that the sibling verification citation is
insufficient guidance (its effect was unmeasurable, S4), or that structured
minilm cannot satisfy the label (the 17/22 ceiling is produced by a packer whose
coverage objective differs from the metric, S6).

What it does establish: the screening instrument cannot test a label-equivalence
revision, and its `strictLabelGap` safeguard is inert. Any successor line must
first collapse the cases/labels duplication into one scored source of truth,
define packer coverage by the metric's acceptance rule, and pre-register that
repair before any cohort data is read. That is a new line, and it is not
authorised by this close-out.
