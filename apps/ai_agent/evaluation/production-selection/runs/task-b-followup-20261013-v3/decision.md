# Task B bounded follow-up decision

Status: **no_candidate_passes**.

Score-blind sufficiency audit precedes two query interventions. All variants use the same v3 labels, eligible corpus and pinned models. Original .001 cutoff is preserved; hybrid cutoff calibration remains development-only. No-direct-procedure abstention is the same user-selected scope for positives and negatives.

| Query | Method | Cutoff | Recall@3 | Direct precision | No-match abstention | False abstention | Gate failures |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| production | keyword | 0 | 62.50% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| production | bm25 | 0 | 62.50% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| production | semantic | 0 | 37.50% | 12.50% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| production | hybrid | 0 | 56.25% | 18.75% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| production | hybrid-reranked | 0 | 56.25% | 20.83% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.00001 | 56.25% | 20.83% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.0001 | 56.25% | 20.83% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.001 | 56.25% | 20.83% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.01 | 50.00% | 18.75% | 12.50% | 6.25% | recall, no_match_abstention, false_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.05 | 50.00% | 20.83% | 50.00% | 18.75% | recall, no_match_abstention, false_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.1 | 43.75% | 25.00% | 50.00% | 18.75% | recall, no_match_abstention, false_abstention |
| production | hybrid-reranked | 0.3 | 31.25% | 16.67% | 100.00% | 50.00% | recall, false_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.5 | 12.50% | 8.33% | 100.00% | 68.75% | recall, false_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.7 | 6.25% | 3.13% | 100.00% | 81.25% | recall, false_abstention, direct_precision_regression |
| production | hybrid-reranked | 0.9 | 0.00% | 0.00% | 100.00% | 93.75% | recall, false_abstention, direct_precision_regression |
| production | minilm-original | 0.001 | 62.50% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| normalized-observations | keyword | 0 | 62.50% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| normalized-observations | bm25 | 0 | 62.50% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| normalized-observations | semantic | 0 | 56.25% | 18.75% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| normalized-observations | hybrid | 0 | 56.25% | 18.75% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| normalized-observations | hybrid-reranked | 0 | 62.50% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| normalized-observations | hybrid-reranked | 0.00001 | 62.50% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| normalized-observations | hybrid-reranked | 0.0001 | 62.50% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| normalized-observations | hybrid-reranked | 0.001 | 56.25% | 20.83% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| normalized-observations | hybrid-reranked | 0.01 | 56.25% | 20.83% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| normalized-observations | hybrid-reranked | 0.05 | 56.25% | 25.00% | 12.50% | 18.75% | recall, no_match_abstention, false_abstention |
| normalized-observations | hybrid-reranked | 0.1 | 43.75% | 21.88% | 37.50% | 18.75% | recall, no_match_abstention, false_abstention, direct_precision_regression |
| normalized-observations | hybrid-reranked | 0.3 | 31.25% | 18.75% | 87.50% | 37.50% | recall, no_match_abstention, false_abstention, direct_precision_regression |
| normalized-observations | hybrid-reranked | 0.5 | 18.75% | 11.46% | 100.00% | 62.50% | recall, false_abstention, direct_precision_regression |
| normalized-observations | hybrid-reranked | 0.7 | 0.00% | 0.00% | 100.00% | 75.00% | recall, false_abstention, direct_precision_regression |
| normalized-observations | hybrid-reranked | 0.9 | 0.00% | 0.00% | 100.00% | 93.75% | recall, false_abstention, direct_precision_regression |
| normalized-observations | minilm-original | 0.001 | 68.75% | 25.00% | 0.00% | 0.00% | recall, no_match_abstention |
| procedure-question | keyword | 0 | 43.75% | 14.58% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| procedure-question | bm25 | 0 | 31.25% | 10.42% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| procedure-question | semantic | 0 | 43.75% | 14.58% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| procedure-question | hybrid | 0 | 43.75% | 14.58% | 0.00% | 0.00% | recall, no_match_abstention, direct_precision_regression |
| procedure-question | hybrid-reranked | 0 | 68.75% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| procedure-question | hybrid-reranked | 0.00001 | 68.75% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| procedure-question | hybrid-reranked | 0.0001 | 68.75% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| procedure-question | hybrid-reranked | 0.001 | 68.75% | 22.92% | 0.00% | 0.00% | recall, no_match_abstention |
| procedure-question | hybrid-reranked | 0.01 | 56.25% | 20.83% | 0.00% | 6.25% | recall, no_match_abstention, false_abstention, direct_precision_regression |
| procedure-question | hybrid-reranked | 0.05 | 50.00% | 27.08% | 0.00% | 31.25% | recall, no_match_abstention, false_abstention |
| procedure-question | hybrid-reranked | 0.1 | 43.75% | 25.00% | 12.50% | 37.50% | recall, no_match_abstention, false_abstention |
| procedure-question | hybrid-reranked | 0.3 | 18.75% | 14.58% | 100.00% | 62.50% | recall, false_abstention, direct_precision_regression |
| procedure-question | hybrid-reranked | 0.5 | 6.25% | 6.25% | 100.00% | 68.75% | recall, false_abstention, direct_precision_regression |
| procedure-question | hybrid-reranked | 0.7 | 6.25% | 6.25% | 100.00% | 81.25% | recall, false_abstention, direct_precision_regression |
| procedure-question | hybrid-reranked | 0.9 | 6.25% | 6.25% | 100.00% | 87.50% | recall, false_abstention, direct_precision_regression |
| procedure-question | minilm-original | 0.001 | 75.00% | 25.00% | 0.00% | 0.00% | recall, no_match_abstention |

No configuration passes all gates. Two interventions consumed; stop this follow-up without promoting the least-bad method or changing release gates.

Historical v2 scores remain unchanged. Any recall shift from correcting sufficient alternatives is a measurement correction, not retrieval improvement. Query improvements are measured against the re-scored v3 unchanged production query. Agent annotations, synthetic evidence and the small exposed cohort limit conclusions. External model calls/spending: zero. Task C, runtime integration and frontend validation did not run. Graphify required: no.
