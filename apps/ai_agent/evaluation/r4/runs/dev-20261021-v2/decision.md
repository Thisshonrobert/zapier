# R4.3 — development screening

**Decision: `retrieval_accepted`.** The development exit is **`proceed_to_freeze`**.

This is screening on the exposed 80-case development cohort, not release
acceptance. No holdout case, score, or hash was opened to produce this report.
No route, facet, packer, support, corpus, label, or threshold was changed during
the run.

## Gates

| Gate | Value | Numerator/denominator | Threshold | Result |
| --- | --- | --- | --- | --- |
| credentialFailure | false | n/a | false | pass |
| safetyViolations | 0 | n/a | 0 | pass |
| reliability | 100.00% | 80/80 | 95.00% | pass |
| hitAt3 | 96.67% | 58/60 | 80.00% | pass |
| macroSectionRecallAt3 | 92.50% | 157/176 | 80.00% | pass |
| directPrecisionAt3 | 87.22% | 157/180 | 19.44% | pass |
| noMatchAbstention | 100.00% | 20/20 | 90.00% | pass |
| falseAbstention | 0.00% | 0/60 | 5.00% | pass |
| routeCoverage | 100.00% | n/a | 100.00% | pass |
| p95LatencyMs | 2175.4 ms | n/a | 3000 ms | pass |

Failing gates: none.
Blocked reasons: none.

## Primary metric

| Arm | Hit@3 | 95% Wilson | Macro recall | 95% Wilson | Direct precision | No-match abstention | 95% Wilson | False abstention | Reliability | p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Candidate | 96.67% (58/60) | 88.64%–99.08% | 92.50% (157/176) | 83.76%–92.98% | 87.22% (157/180) | 100.00% (20/20) | 83.89%–100.00% | 0.00% (0/60) | 100.00% (80/80) | 2175.4 ms |
| Keyword | 3.33% (2/60) | 0.92%–11.36% | 21.81% (35/176) | 14.66%–26.40% | 19.44% (35/180) | 0.00% (0/20) | 0.00%–16.11% | 0.00% (0/60) | 100.00% (80/80) | 0.7 ms |

The macro-recall and direct-precision intervals are citation-weighted; the point
estimates are the macro means used by the gates. Every row carries its absolute
numerator and denominator.

## Per-family results

| Family | Cases | Answerable | Hit@3 | Macro recall | Direct precision |
| --- | --- | --- | --- | --- | --- |
| F01 | 6 | 6 | 100.00% (6/6) | 100.00% (16/16) | 88.89% (16/18) |
| F02 | 6 | 6 | 100.00% (6/6) | 100.00% (17/17) | 94.44% (17/18) |
| F03 | 6 | 6 | 100.00% (6/6) | 100.00% (14/14) | 77.78% (14/18) |
| F04 | 6 | 6 | 100.00% (6/6) | 50.00% (16/32) | 88.89% (16/18) |
| F05 | 6 | 6 | 100.00% (6/6) | 100.00% (16/16) | 88.89% (16/18) |
| F06 | 6 | 6 | 100.00% (6/6) | 100.00% (18/18) | 100.00% (18/18) |
| F07 | 6 | 6 | 100.00% (6/6) | 100.00% (17/17) | 94.44% (17/18) |
| F08 | 5 | 5 | 100.00% (5/5) | 100.00% (12/12) | 80.00% (12/15) |
| F09 | 5 | 5 | 100.00% (5/5) | 100.00% (14/14) | 93.33% (14/15) |
| F10 | 5 | 5 | 80.00% (4/5) | 80.00% (12/14) | 80.00% (12/15) |
| S | 3 | 3 | 66.67% (2/3) | 83.33% (5/6) | 55.56% (5/9) |

## Failure ledger

| Stage | Entries |
| --- | --- |
| facet_dropped | 2 |

2 answerable miss(es), 0 no-match false positive(s), 0 corpus-gap case(s). Every miss carries exactly one stage in `failure-ledger.json`.

## Frozen inputs

| Artifact | SHA-256 |
| --- | --- |
| protocol | `d47669b7f567a2436d13a0a7bc127898e9ad774f4082c047091e7dcdfc391b5e` |
| corpus | `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440` |
| development cases | `753d9b2b8f12275c5d90a8d9b7cbef2a3d724019561031ce796f8090015cb677` |
| development labels v2 | `2c581e331781aa3c84baf579984f9cb1739c92b796c71a443796db0863e38c61` |
| development evidence | `d91ade93af6554614321fdcc58d4ab5f5e5a3e06387e54577575513f6b748724` |

## Limitations

- The development cohort is exposed and may be tuned on. This report screens the
  candidate; it is not the sealed-holdout acceptance decision.
- The development gate is 80% hit@3 and 80% macro recall. The acceptance gate is
  90% point plus a Wilson lower bound and is evaluated in R4.4.
- The Wilson bounds describe sampling uncertainty on this cohort. A point
  estimate is not a certification.
- The seeded corpus has 55 sections and six runbooks; provider-ineligible cases
  are reported as `corpus_gap` and excluded from no-match abstention, not scored
  as retrieval misses.
- An F04-style facet accepts independently sufficient sibling sections. Returning
  either sibling is a primary hit; the unreturned sibling remains in the
  citation-level recall denominator, so per-family macro recall can trail hit@3.
- `p95LatencyMs` is the per-case rerank time over the frozen candidate set in the
  offline scorer, the same basis as R3. It is not warm HTTP service latency.
