# R3 â€” retrieval target recovery

**Status: R3.5 rejected; R3.5-recovery development screening failed.** The frozen
R3.5 candidate failed the independent holdout (`decision.md`). The R3.5-recovery
candidate did not pass `dev-24`/`dev-32` screening either: see
[`recovery/screening-report.md`](recovery/screening-report.md) and
[`recovery/runs/dev-20261020-v5`](recovery/runs/dev-20261020-v5). No candidate
was promoted, no gate was lowered, and holdout v2 has not been commissioned.
The R3.4 status below records the last completed development screening. The serving corpus is frozen in `corpus-v1.json` (55 sections, six runbooks, `transient-provider-failure` 1.1.0) with hash `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440`, guarded by `tests/rag-corpus-parity.test.ts`. Gates and cohort rules are frozen in `protocol.json` before any score. The 24-case development cohort and its re-adjudicated facet labels are frozen in `development-cases-v1.json` and `development-labels-v1.json` (label hash `a30fd42160326bd6daa02238be50ad0c0cccab23d5ef5372fcae99e7fd49c752`). The true baseline is recorded in `runs/baseline-20261019-v1/`; the selected R3.2 route arm in `runs/profile-route-20261019-v1/`; the R3.3 facet-packed arm in `runs/profile-route-facets-20261019-v1/`; the R3.4 support arm in `runs/profile-route-facets-support-20261019-v1/`.

The R3.5r.3 screening-instrument defects recorded in the
[revision-4 report](recovery/screening-report-revision-4.md) (accepted citations
read from the cases file; family-based packer coverage) were repaired afterwards
as a documentation-only record: see
[`recovery/instrument-repair-r3.5r.3.md`](recovery/instrument-repair-r3.5r.3.md).
That record reports an offline diagnostic recomputation, not a new screening run
or a gate result. The structured-minilm / R3.5r.3 line remains rejected and
closed: no candidate was promoted, no revision 5 is authorised, and holdout v2
has not been commissioned.

## Development results (screening, not acceptance)

| Arm | Sufficient-guidance hit@3 | Macro section recall@3 | Direct precision@3 | No-match abstention |
| --- | ---: | ---: | ---: | ---: |
| keyword | 12.5% (2/16) | 37.5% | 22.9% | 0% (0/8) |
| `minilm-original` | 25.0% (4/16) | 50.0% | 27.1% | 0% (0/8) |
| `profile-route` (R3.2) | 31.25% (5/16) | 62.5% | 33.3% | 0% (0/8) |
| `profile-route-facets` (R3.3) | 81.25% (13/16) | 87.5% | 50.0% | 0% (0/8) |
| `profile-route-facets-support` (R3.4) | 81.25% (13/16) | 87.5% | 50.0% | 100% (8/8) |

R3.3 passes its four development checks: hit@3 and macro recall are above 80%, direct precision is above the same-corpus keyword control (22.9%), and false abstention is 0%. No-match abstention is 0% in the R3.3 arm by design â€” R3.3 has no support gate and deliberately has no absolute score cutoff; R3.4 adds the gate. The three remaining misses (`f04-template-path-missing`, `f10-sdk-error-recorded-success`, `s03-sensitive-fields-present`) return the requested facet from a neighbouring routed runbook, not the accepted citation; the report records their missing facets and accepted citations. These 80% figures screen the method and are not release acceptance.

R3.4 replaces score-cutoff abstention with the observed-support gate in `src/tools/retrieval-support.ts`. Both predeclared settings (`minAnchorHits: 1` and `2`) abstain on all eight no-match cases (8/8, 100%) and never abstain on an answerable case (0/16, 0%). Every selection criterion ties, so `minAnchorHits: 1` is retained as the predeclared Task 12 default. All eight abstentions are `no_observed_anchor`: no no-match case has a confident route or a matching observed anchor in its packed top three. Because the gate short-circuits on route confidence, the three answerable misses and the R3.3 metrics are unchanged. The support-arm gate passes, and the per-case support reason, `abstained`, matched anchors, missing facets, and ledger are recorded in `runs/profile-route-facets-support-20261019-v1/`.

R3 is the third retrieval evaluation round. R1 compared baseline retrieval. R2 and its follow-ups (R2.1â€“R2.5) compared ranking variants on corpora, queries, and labels that changed between rounds. R3 fixes the measurement first, applies four predeclared changes, and accepts or rejects the result once.

## Why another round

The previous rounds did not fail for lack of a retriever. They failed because the serving corpus (55 sections, six runbooks, `transient-provider-failure` 1.1.0) was not the measured corpus (54 sections, 1.0.0), the review labels still cite the retired version, the provider filter removes almost nothing, runtime never passes taxonomy, the top three collide on one facet, and no-match is decided by a `.001` sigmoid floor.

## The four predeclared changes

1. Structured evidence profile â€” query built from observed fields, fixture-only tokens removed, discriminative anchors retained.
2. Evidence-derived route â€” taxonomy hints from observed facts only; never from labels or case ids.
3. Facet-aware packing â€” one section per required guidance facet before score-filling.
4. Calibrated support gate â€” abstain on absent observed support, not on a score cutoff.

No new dependency, model, vector database, BM25 serving path, HyDE, PageIndex, reranker, or LLM planner.

## Cohorts

| Cohort | Cases | Make-up | Opened |
| --- | ---: | --- | --- |
| Development | 24 | 16 answerable + 8 no-match, from `../production-selection/development-review-v3.json` | R3.1 |
| Independent holdout | 40 | 30 answerable + 10 no-match, independently authored | Once, R3.5 |

## Gates

| Gate | Development screening | Independent release |
| --- | ---: | ---: |
| Sufficient-guidance hit@3 | 80% | 90% |
| Macro section recall@3 | 80% | 90% |
| No-match abstention | 90% | 90% |
| False abstention | â‰¤ 5% | â‰¤ 5% |
| Direct precision | â‰¥ keyword control | â‰¥ frozen baseline |
| Reliability | 95% | 95% |
| Warm retrieval p95 | 3 s | 3 s |
| Diagnosis acceptance | 80% | 80% |

The 80% development figure screens. It is not release acceptance and must never be reported as reaching the 90% target.

## Phases

| Phase | Name | Exit gate |
| --- | --- | --- |
| R3.0 | Freeze the yardstick | 55 sections, stable hash, parity test passes |
| R3.1 | Trustworthy benchmark and true baseline | labels valid, baseline recorded |
| R3.2 | Structured profile and evidence route | legacy query identical, route coverage 100% or route disabled |
| R3.3 | Facet-aware packing | dev hit@3 â‰¥ 80%, recall â‰¥ 80%, precision â‰¥ keyword, false abstention â‰¤ 5% |
| R3.4 | Calibrated support gate | abstention â‰¥ 90%, false abstention â‰¤ 5% |
| R3.5 | Freeze and independent acceptance | 90% recall, 90% abstention, decision recorded |
| R3.6 | Diagnosis validation | 80% acceptance or explicit `blocked` |
| R3.7 | Integration and closeout | typecheck/build pass, rollback proven |

## Artifacts

`protocol.json`, `corpus-v1.json`, `development-cases-v1.json`, `development-labels-v1.json`, `selected-retrieval-config.json`, `decision.md`, and immutable `runs/`, `holdout/`, `diagnosis/`, `diagnosis-holdout/` directories. Every run is immutable; a changed input means a new run directory.

## Documents

- Phase program: [`docs/superpowers/plans/2026-10-19-r3-retrieval-recovery.md`](../../../../docs/superpowers/plans/2026-10-19-r3-retrieval-recovery.md)
- Task-level code and test bodies: [`docs/superpowers/plans/2026-10-19-rag-target-recovery.md`](../../../../docs/superpowers/plans/2026-10-19-rag-target-recovery.md)
- Prior rounds: [`../r25/README.md`](../r25/README.md), [`../production-selection/README.md`](../production-selection/README.md), [`../RAG-DIAGNOSIS-CLOSEOUT.md`](../RAG-DIAGNOSIS-CLOSEOUT.md)

## Boundaries

Read-only retrieval only. No replay, approval, or write authority. Historical runs are never rewritten. Generated Prisma and Graphify working-tree changes are excluded. No automatic Git integration; follow [`docs/manualgit_handoff.md`](../../../../docs/manualgit_handoff.md).


