# R4.4 — sealed holdout decision

**Decision: `retrieval_accepted`.**

This is the single pre-registered run of the sealed 160-case holdout, analyzed
against the acceptance gates frozen in `protocol.json`. The candidate config was
written and hashed before the seal was opened. One run only; no re-scoring, no
threshold edit, no candidate change after the score exists.

## Gates

| Gate | Value | Numerator/denominator | Threshold | Result |
| --- | --- | --- | --- | --- |
| credentialFailure | false | n/a | false | pass |
| safetyViolations | 0 | n/a | 0 | pass |
| reliability | 100.00% | 160/160 | 95.00% | pass |
| hitAt3.point | 100.00% | 120/120 | 90.00% | pass |
| hitAt3.wilsonLower95 | 96.90% | 120/120 | 82.00% | pass |
| macroSectionRecallAt3.point | 95.00% | 360/396 | 90.00% | pass |
| macroSectionRecallAt3.wilsonLower95 | 87.67% | 360/396 | 82.00% | pass |
| noMatchAbstention.point | 100.00% | 40/40 | 90.00% | pass |
| noMatchAbstention.wilsonLower95 | 91.24% | 40/40 | 75.00% | pass |
| falseAbstention.point | 0.00% | 0/120 | 5.00% | pass |
| directPrecisionAt3 | 100.00% | 360/360 | 18.06% | pass |
| routeCoverage | 100.00% | n/a | 100.00% | pass |
| p95LatencyMs | 1910.1 ms | n/a | 3000 ms | pass |
| perFamilyHitAt3.F01 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F02 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F03 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F04 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F05 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F06 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F07 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F08 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F09 | 100.00% | 100.00% (12/12) | 70.00% | pass |
| perFamilyHitAt3.F10 | 100.00% | 100.00% (12/12) | 70.00% | pass |

Failing gates: none.
Blocked reasons: none.

## Primary metric

| Arm | Hit@3 | 95% Wilson | Macro recall | 95% Wilson | Direct precision | No-match abstention | 95% Wilson | False abstention | Reliability | p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Candidate | 100.00% (120/120) | 96.90%–100.00% | 95.00% (360/396) | 87.67%–93.36% | 100.00% (360/360) | 100.00% (40/40) | 91.24%–100.00% | 0.00% (0/120) | 100.00% (160/160) | 1910.1 ms |
| Keyword | 0.00% (0/120) | 0.00%–3.10% | 16.25% (65/396) | 13.09%–20.38% | 18.06% (65/360) | 0.00% (0/40) | 0.00%–8.76% | 0.00% (0/120) | 100.00% (160/160) | 0.7 ms |

Every row carries its absolute numerator and denominator. Macro-recall and
direct-precision intervals are citation-weighted; their point estimates are the
macro means used by the gates.

## Per-family results

| Family | Cases | Answerable | Hit@3 | 95% Wilson | Macro recall | Direct precision |
| --- | --- | --- | --- | --- | --- | --- |
| F01 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |
| F02 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |
| F03 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |
| F04 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 50.00% (36/72) | 100.00% (36/36) |
| F05 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |
| F06 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |
| F07 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |
| F08 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |
| F09 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |
| F10 | 12 | 12 | 100.00% (12/12) | 75.75%–100.00% | 100.00% (36/36) | 100.00% (36/36) |

## Paired keyword comparison

| Statistic | Value |
| --- | ---: |
| Eligible answerable pairs | 120 |
| Both hit | 0 |
| Candidate only | 120 |
| Keyword only | 0 |
| Neither | 0 |
| Candidate hit rate | 100.00% |
| Keyword hit rate | 0.00% |
| Difference | 100.00% |
| Exact McNemar two-sided p | 0.0000 |
| Bootstrap 95% CI of difference | 100.00% to 100.00% |

paired sufficient-guidance hits over eligible answerable cases; exact McNemar two-sided p; percentile bootstrap of the hit-rate difference. Bootstrap resamples: 10000,
seed 20261021. The interval is decision support, not
proof of a five-point superiority.

## Failure ledger

No misses or false positives.

0 answerable miss(es), 0 no-match false positive(s), 0 corpus-gap case(s). Every miss carries exactly one stage in `failure-ledger.json`.

## Latency and reliability

| Measure | Value |
| --- | ---: |
| Scheduled cases | 160 |
| Usable outputs | 160 |
| Rerank min | 1105.9 ms |
| Rerank p50 | 1693.4 ms |
| Rerank p95 | 1911.2 ms |
| Rerank max | 2090.7 ms |
| Rerank mean | 1578.0 ms |

`p95LatencyMs` is per-case rerank time over the frozen candidate set in the
offline scorer, the same basis as R3. It is not warm HTTP service latency.

## Measurement limitations

1. **Labels are clustered, so case-level Wilson bounds are anti-conservative.**
   The 120 answerable cases reduce to 10 required-facet/accepted-citation
   signatures, 12 cases per family. Effective independent units are
   approximately 10, not 120. `wilsonLower95` must not be presented as
   independent-case evidence.
2. **Per-family results are reported next to the pooled numbers.** A pooled pass
   with a family near the 0.70 floor is a weak acceptance.
3. **No-match abstention is structural, not discriminating.** All 40 no-match
   observations carry zero route hints and zero observed anchors, so the shipped
   support policy abstains by construction. The result confirms policy wiring,
   not near-miss discrimination.
4. **F04 accepts a less specific sibling.** All 12 F04 cases accept
   `RB-F03-F04` alongside `RB-F04-F06`, so F04 hit@3 and recall are lenient by up
   to 10% of the answerable set.
5. **The missing-runtime-fact bucket is corpus coverage.** Those rationales say
   the provider limit is not recorded in the corpus; they behave as
   missing-guidance cases.
6. **The weakest development cohort is not held out.** The three-case `S`
   cohort scored 2/3 in development and has no holdout cases; the per-family
   floor covers F01–F10 only.
7. **Some scenarios recur across splits.** Three near-identical development and
   holdout pairs in F06/F07 plus one duplicate derived query in F04 are recorded
   in the reviewer sign-off. They are below the 10% near-duplicate threshold.

The holdout is a decision instrument, not a certification. A 90% point gate at
120 clustered cases cannot certify a true 90% system at 95% confidence; Tier B
(~300 independent answerable cases) is out of scope for R4.

## Frozen inputs

| Artifact | SHA-256 |
| --- | --- |
| selected retrieval config | `a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805` |
| config path | `apps/ai_agent/evaluation/r4/selected-retrieval-config.json` |
| protocol | `d47669b7f567a2436d13a0a7bc127898e9ad774f4082c047091e7dcdfc391b5e` |
| corpus | `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440` |
| holdout cases | `a8f5794ab778ddbbd7de0a10181854fb8b2d611439a3a4f688192e314e44bebd` |
| holdout labels v2 | `04b0eeec534244e131cf37aedf85213164e47d6d62deb289c5261883a085f6f4` |
| holdout evidence | `8fdc05be0b36b03f1fec97bb34eedd8e981b719e94df869e6e07d59d6e3d83b8` |
| holdout seal | `8d6cb47c3032e0ae051ad83c2009d007b644162d95f7f8e44d24ec61f558c886` |



## Governance

- One run only. No re-scoring, no threshold edit, no candidate change after the
  holdout score exists.
- The sealed files under `holdout/` are immutable. A label defect discovered
  after this run consumes the holdout and requires a new sealed holdout.
- `retrieval_rejected` does not authorize reuse of this holdout. `blocked`
  records a reliability, safety, or credential failure and stops.
