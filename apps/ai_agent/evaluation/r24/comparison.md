# Retrieval comparison after R2.3/R2.4

Best tested supported baseline remains **R2.1 reranked hybrid at cutoff 0.001: 62.50% Recall@3**, 27.50 percentage points below the plan target. No production replacement is recommended. This is a bounded exploratory search among measured methods, not a universal best-retriever claim.

| Method | Status | Recall@3 | MRR | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Overall abstention | Mean /p95 ms | Timing scope |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| R2.1 weighted-keyword | baseline | 48.61% | 0.421 | 75.00% | n/a | 0.00% | 0.00% | 0.00% | 0.84 / 1.17 | historical retrieval pipeline |
| R2.1 bm25 | baseline | 54.17% | 0.514 | 75.00% | n/a | 0.00% | 0.00% | 0.00% | 5.49 / 9.24 | historical retrieval pipeline |
| R2.1 semantic | baseline | 45.83% | 0.431 | 85.42% | 100.00% | 41.67% | 0.00% | 10.42% | 16.92 / 63.00 | historical retrieval pipeline |
| R2.1 hybrid | baseline | 59.72% | 0.528 | 75.00% | n/a | 0.00% | 0.00% | 0.00% | 21.55 / 67.07 | historical retrieval pipeline |
| R2.1 hybrid-reranked | baseline | 62.50% | 0.611 | 89.58% | 76.92% | 83.33% | 8.33% | 27.08% | 109.93 / 162.97 | historical retrieval pipeline |
| R2.2 full-union MiniLM | rejected pool expansion | 59.72% | 0.602 | 89.58% | 76.92% | 83.33% | 8.33% | 27.08% | 267.00 / 478.08 | historical retrieval pipeline |
| R2.3 original | development selected | 59.72% | 0.602 | 89.58% | 76.92% | 83.33% | 8.33% | 27.08% | 88.65 / 135.63 | fresh reranker only |
| R2.3 runbook-context | development rejected | 56.94% | 0.606 | 91.67% | 83.33% | 83.33% | 5.56% | 25.00% | 112.46 / 159.80 | fresh reranker only |
| R2.4 BGE-base cutoff 0.01 | development-selected cutoff | 58.33% | 0.565 | 95.83% | 85.71% | 100.00% | 5.56% | 29.17% | 827.41 / 1290.97 | fresh reranker only |
| R2.4 BGE-base cutoff 0.001 | diagnostic only, not selected | 62.50% | 0.602 | 95.83% | 100.00% | 83.33% | 0.00% | 20.83% | 827.41 / 1290.97 | fresh reranker only |
| R2.1 MiniLM zero cutoff | diagnostic only, no-match regression | 68.06% | 0.667 | 75.00% | n/a | 0.00% | 0.00% | 0.00% | 109.66 / 162.89 | historical retrieval pipeline |

Candidate Recall@12 remains 84.72%; R2.2/R2.3/R2.4 use the frozen full-union pool with Recall@24 91.67%. Better candidate coverage did not translate to better final ranking. Cutoff-zero controls sacrifice no-match abstention; held-out diagnostics must not replace development selection. BGE-base at cutoff .001 is a useful diagnostic, not a selected winner.

R2.3 ruled out truncation (<200 tokens) and rejected added runbook Symptoms context. R2.4 BGE-base, selected on development at .01, reached 58.33% held-out recall; without a cutoff it still reached only 62.50%. These findings do not support another pool increase or another cutoff chosen from held-out scores.

All labels/corpus remain frozen; reused held-out groups are exploratory. “Distractors” are unlabelled sections, not independently adjudicated irrelevance. Before adoption, freeze a proposed method, obtain fresh independent groups, meet 90% top-three recall with no-match/safety checks, validate the production query contract and downstream grounding, and assess end-to-end latency/cost. No implementation can manufacture trustworthy 90% evidence by fitting the old held-out labels.

Reranker-only timings and historical pipeline timings have different scopes and host loads; avoid ratio-based performance claims. Full raw-score/hash evidence and replay controls are linked in the phase READMEs.
