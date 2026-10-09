# R2.1 retrieval experiment

96 queries (48/48), 24 disjoint scenario groups, unchanged 12-runbook /60-section corpus. Frozen version: r21-v1. No external calls/cost.

Development-selected reranker sigmoid cutoff: 0.001. Selection objective: macro Recall@3 + no-match abstention; ties prefer MRR, less answerable abstention, then smaller cutoff. Held-out labels do not select thresholds.

| Variant | Recall@3 | MRR | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Mean /p95 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| weighted-keyword | 48.6% | 0.421 | 75.0% | n/a | 0.0% | 0.0% | 0.84 / 1.17 |
| bm25 | 54.2% | 0.514 | 75.0% | n/a | 0.0% | 0.0% | 5.49 / 9.24 |
| semantic | 45.8% | 0.431 | 85.4% | 100.0% | 41.7% | 0.0% | 16.92 / 63.00 |
| hybrid | 59.7% | 0.528 | 75.0% | n/a | 0.0% | 0.0% | 21.55 / 67.07 |
| hybrid-reranked | 62.5% | 0.611 | 89.6% | 76.9% | 83.3% | 8.3% | 109.93 / 162.97 |

## Reranker controls (held-out, diagnostic only)

- Cutoff 0: Recall@3 68.1%, no-match abstention 0.0%, answerable abstention 0.0%.
- Cutoff 0.3: Recall@3 41.7%, no-match abstention 100.0%, answerable abstention 38.9%.

Candidate Recall@12: development 100.0%; held_out 84.7%. report.json records raw logits, full calibration grid, per-query ranks and both controls. Ranking/candidate losses and threshold losses are reported separately.

## Metric definitions

An expected no-match has zero labelled relevant sections. A predicted no-match returns zero excerpts. No-match accuracy is the binary decision accuracy across all queries; precision is correct no-match abstentions divided by all abstentions. No-match abstention is the fraction of no-match queries returning nothing; answerable abstention measures the opposite error. Zero-denominator metrics are null, not 100%. Recall@3 is macro section recall over answerable queries only; MRR uses first relevant rank.

## Reproduce

`rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r21.ts` creates a new run directory. For no-model rescoring, pass `--scores apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json`. Corpus, config, input/source hashes and candidate identities are validated. Dataset labels are separately frozen and never sent to inference.

## Limits

- Author-labelled synthetic queries; held-out scenario groups are disjoint, not independently human-adjudicated. Four queries per scenario are correlated; report has 24 scenario groups, not 96 independent incidents.
- Fixed R2 corpus and semantic cutoff; only reranker score cutoff is recalibrated. Sigmoid scores are not relevance probabilities.
- Mean/p95 latency combines recorded query inference and local ranking; cross-encoder timing is the actual selected top-12 candidates, excludes one-time model/corpus setup. Rescoring does not rerun inference.
- No downstream diagnosis, Gemini calls, customer data, action providers, production adoption or replay authority.

Production retrieval remains unchanged.
