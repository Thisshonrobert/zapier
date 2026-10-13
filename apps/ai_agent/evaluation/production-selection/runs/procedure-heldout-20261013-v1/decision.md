# Fixed procedure-question held-out comparison

Decision: **retrieval_gates_failed_no_promotion**. Production remains unchanged.

Fixed prefix and .001 cutoff; 75% recall target accepted by the user before testing. No label, filter, passage or threshold tuning.

| Corpus | Cohort | Arm | Eligible positives | Recall@3 | Labelled precision@3 | Negative abstention | False abstention | Scoring p95 ms | Excluded positives |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| historical (60) | reused | keyword | 36 | 46.76% | 23.61% | 0/12 | 0/36 | 1.4 | 0 |
| historical (60) | reused | original | 36 | 76.39% | 38.89% | 10/12 | 1/36 | 439.1 | 0 |
| historical (60) | reused | procedure | 36 | 55.09% | 28.47% | 1/12 | 0/36 | 511.2 | 0 |
| historical (60) | fresh | keyword | 24 | 71.18% | 23.96% | 0/8 | 0/24 | 1.7 | 0 |
| historical (60) | fresh | original | 24 | 73.96% | 26.04% | 7/8 | 0/24 | 746.7 | 0 |
| historical (60) | fresh | procedure | 24 | 67.01% | 21.87% | 0/8 | 0/24 | 818.7 | 0 |
| production (54) | reused | keyword | 25 | 41.33% | 19.82% | 0/12 | 0/25 | 1.1 | 11 |
| production (54) | reused | original | 25 | 79.33% | 36.94% | 12/12 | 0/25 | 1192.4 | 11 |
| production (54) | reused | procedure | 25 | 54.00% | 26.13% | 2/12 | 0/25 | 534.0 | 11 |
| production (54) | fresh | keyword | 12 | 53.47% | 25.00% | 0/8 | 0/12 | 0.8 | 12 |
| production (54) | fresh | original | 12 | 50.69% | 23.33% | 7/8 | 0/12 | 620.7 | 12 |
| production (54) | fresh | procedure | 12 | 39.58% | 18.33% | 0/8 | 0/12 | 643.9 | 12 |

historical/reused procedure failures: recall, no_match_abstention.
historical/fresh procedure failures: recall, no_match_abstention, labelled_precision_regression.
production/reused procedure failures: recall, no_match_abstention.
production/fresh procedure failures: recall, no_match_abstention, labelled_precision_regression.

Recall is macro section coverage under the unchanged historical labels, not the Task B any-sufficient-procedure metric. Corpus-ineligible positive cases remain in all-case metrics and are excluded only from eligible metrics; they never become negatives. Labelled precision is a diagnostic lower bound where labels are incomplete.

Original historical logits were re-run and matched saved scores exactly. Timing covers local model scoring, not end-to-end service latency or concurrency. Historical cohorts contain authored search questions and exposed synthetic cases; they do not establish independent incident-path or semantic diagnosis acceptance. Zero API calls or external spend.
