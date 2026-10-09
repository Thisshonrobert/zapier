# R2.2 candidate generation experiment

Single change: rerank the full deduplicated top-12 BM25 + top-12 dense union (at most 24), instead of its fused top 12. Same RRF ordering, semantic cutoff 0.2, reranker and selected cutoff 0.001. No calibration. Dataset r21-v1 and 12-runbook / 60-section corpus are frozen.

| Split | Experiment | Recall@3 | MRR | Candidate R@12 | Candidate R@24 | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Overall abstention | Mean / p95 ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| development | R2.1 | 100.00% | 0.958 | 100.00% | n/a | 100.00% | 100.00% | 100.00% | 0.00% | 25.00% | 132.65 / 247.54 |
| development | R2.2 | 100.00% | 0.958 | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% | 0.00% | 25.00% | 227.76 / 508.12 |
| held_out | R2.1 | 62.50% | 0.611 | 84.72% | n/a | 89.58% | 76.92% | 83.33% | 8.33% | 27.08% | 109.93 / 162.97 |
| held_out | R2.2 | 59.72% | 0.602 | 84.72% | 91.67% | 89.58% | 76.92% | 83.33% | 8.33% | 27.08% | 267.00 / 478.08 |

Recall is macro section recall over answerable queries. MRR uses first relevant rank. No-match confusion treats abstention as positive; accuracy includes all queries, precision is correct no-match abstentions / all abstentions. Empty denominators are null. Latency uses mean and nearest-rank p95. Candidate Recall@12 must remain identical; Recall@24 measures wider-pool coverage. report.json includes confusion counts, deltas, complete candidate/reranked orders, raw logits, added/recovered/missing sections, ranking losses and cutoff losses per query.

## Reproduce

`rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r22.ts` runs locally cached pinned models into a new directory. Add `--scores apps/ai_agent/evaluation/r22/runs/r22-v1-local/scores.json` for no-inference replay. Existing output directories are rejected.

## Limits

- Exploratory paired comparison: R2.1 held-out diagnostics informed this hypothesis; these are reused labels, not a fresh confirmatory test set. No configuration sweep or cutoff recalibration.
- Author-labelled synthetic queries in 24 correlated scenario groups. Corpus and all 96 labels/splits are unchanged.
- R2.2 latency is fresh CPU inference; R2.1 latency is its historical saved run. Hardware/load/cache variation prevents a controlled latency claim. Replay retains inference timings and remeasures final sorting only.
- R2.1 timing includes reranking and a local retrieval pass; R2.2 timing includes embedding, actual candidate generation, reranking and final sorting. Setup times are excluded and recorded separately.
- Reranker revision, q8 precision, CPU device, batch size 8, tokenization and sigmoid cutoff 0.001 remain fixed; expanding inputs changes cost and may change outputs. Sigmoid scores are not calibrated probabilities.
- No production retrieval, Phase 11/11A, downstream diagnosis, external API calls or replay authority changes. External cost USD 0.
