# Retrieval experiment decisions

## 2026-10-08 — intent-v3: REJECTED

Decision authorized by the user. Retain frozen `minilm-original` as the experimental baseline; production retrieval remains unchanged.

| Metric | Frozen MiniLM baseline | Intent conditioning |
| --- | ---: | ---: |
| Answerable development Recall@3 | 24/24 (100%) | 24/24 (100%) |
| No-match abstention | 3/4 (75%) | 1/4 (25%) |
| Mean reranking latency | 908.78 ms | 1117.52 ms (+22.97%) |
| Heading-based mismatch flags | 13 | 9 |

Reject conditioning: two additional false matches, a 50 percentage-point loss of abstention and increased measured latency, without positive recall improvement. Small samples and concurrent CPU verification limit generalization of the latency result. Reduced heading-based mismatch flags do not offset the no-match regression.

Evidence: [frozen report](runs/intent-v3/report.json), [experiment notes](README.md). The fresh held-out scenario dataset was not used. No thresholds, baseline sources or production behavior were changed.

Next authorized investigation: compare downstream incident diagnosis using gold-only passages, unchanged baseline top-three passages, and abstaining no-match controls. Evaluate root cause, evidence attribution and recommended action; do not infer downstream failure merely from low retrieval precision.
