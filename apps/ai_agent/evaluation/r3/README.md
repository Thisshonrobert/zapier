# R3 — retrieval target recovery

**Status: R3.1 baseline recorded.** The serving corpus is frozen in `corpus-v1.json` (55 sections, six runbooks, `transient-provider-failure` 1.1.0) with hash `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440`, guarded by `tests/rag-corpus-parity.test.ts`. Gates and cohort rules are frozen in `protocol.json` before any score. The 24-case development cohort and its re-adjudicated facet labels are frozen in `development-cases-v1.json` and `development-labels-v1.json` (label hash `a30fd42160326bd6daa02238be50ad0c0cccab23d5ef5372fcae99e7fd49c752`). The true baseline is recorded in `runs/baseline-20261019-v1/`.

## Baseline (development screening, not acceptance)

| Arm | Sufficient-guidance hit@3 | Macro section recall@3 | Direct precision@3 | No-match abstention |
| --- | ---: | ---: | ---: | ---: |
| keyword | 12.5% (2/16) | 37.5% | 22.9% | 0% (0/8) |
| `minilm-original` | 25.0% (4/16) | 50.0% | 27.1% | 0% (0/8) |

Both arms rank non-procedural sections (`Simulated example`, `Sources`, repeated same-facet sections) into the top three; the `.001` floor never abstains. This is the expected baseline failure, not a method result. R3.2–R3.4 are the predeclared changes measured against it. The offline `minilm` latency in the report is batch scoring time, not warm service latency.

R3 is the third retrieval evaluation round. R1 compared baseline retrieval. R2 and its follow-ups (R2.1–R2.5) compared ranking variants on corpora, queries, and labels that changed between rounds. R3 fixes the measurement first, applies four predeclared changes, and accepts or rejects the result once.

## Why another round

The previous rounds did not fail for lack of a retriever. They failed because the serving corpus (55 sections, six runbooks, `transient-provider-failure` 1.1.0) was not the measured corpus (54 sections, 1.0.0), the review labels still cite the retired version, the provider filter removes almost nothing, runtime never passes taxonomy, the top three collide on one facet, and no-match is decided by a `.001` sigmoid floor.

## The four predeclared changes

1. Structured evidence profile — query built from observed fields, fixture-only tokens removed, discriminative anchors retained.
2. Evidence-derived route — taxonomy hints from observed facts only; never from labels or case ids.
3. Facet-aware packing — one section per required guidance facet before score-filling.
4. Calibrated support gate — abstain on absent observed support, not on a score cutoff.

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
| False abstention | ≤ 5% | ≤ 5% |
| Direct precision | ≥ keyword control | ≥ frozen baseline |
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
| R3.3 | Facet-aware packing | dev hit@3 ≥ 80%, recall ≥ 80%, precision ≥ keyword, false abstention ≤ 5% |
| R3.4 | Calibrated support gate | abstention ≥ 90%, false abstention ≤ 5% |
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
