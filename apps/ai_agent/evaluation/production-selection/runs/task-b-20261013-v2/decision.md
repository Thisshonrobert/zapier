# Task B development selection decision

Status: **no_candidate_passes**.

User-authorized agent labels. Synthetic exposed development evidence, not independent acceptance. The frozen cohort counts are below. No production behavior changed.

Scheduled cases: 24; answerable: 16; no direct procedure: 8; corpus gaps: 0.

| Method | Cutoff | Recall@3 | Direct precision | No-match abstention | False abstention | Warm p95 ms | Gate failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| keyword | 0 | 33.33% | 22.92% | 0.00% | 0.00% | 0.4 | recall, no_match_abstention |
| bm25 | 0 | 30.21% | 20.83% | 0.00% | 0.00% | 4.9 | recall, no_match_abstention, direct_precision_regression |
| semantic | 0 | 20.83% | 12.50% | 0.00% | 0.00% | 73.4 | recall, no_match_abstention, direct_precision_regression |
| hybrid | 0 | 31.25% | 18.75% | 0.00% | 0.00% | 77.1 | recall, no_match_abstention, direct_precision_regression |
| hybrid-reranked | 0 | 31.25% | 18.75% | 0.00% | 0.00% | 600.9 | recall, no_match_abstention, direct_precision_regression |
| hybrid-reranked | 0.00001 | 31.25% | 18.75% | 0.00% | 0.00% | 600.8 | recall, no_match_abstention, direct_precision_regression |
| hybrid-reranked | 0.0001 | 31.25% | 18.75% | 0.00% | 0.00% | 600.9 | recall, no_match_abstention, direct_precision_regression |
| hybrid-reranked | 0.001 | 31.25% | 18.75% | 0.00% | 0.00% | 600.8 | recall, no_match_abstention, direct_precision_regression |
| hybrid-reranked | 0.01 | 28.13% | 16.67% | 12.50% | 6.25% | 601.1 | recall, no_match_abstention, false_abstention, direct_precision_regression |
| hybrid-reranked | 0.05 | 28.13% | 17.71% | 50.00% | 18.75% | 602.8 | recall, no_match_abstention, false_abstention, direct_precision_regression |
| hybrid-reranked | 0.1 | 25.00% | 18.75% | 50.00% | 18.75% | 600.8 | recall, no_match_abstention, false_abstention, direct_precision_regression |
| hybrid-reranked | 0.3 | 18.75% | 16.67% | 100.00% | 50.00% | 600.9 | recall, false_abstention, direct_precision_regression |
| hybrid-reranked | 0.5 | 9.38% | 8.33% | 100.00% | 68.75% | 600.9 | recall, false_abstention, direct_precision_regression |
| hybrid-reranked | 0.7 | 6.25% | 3.13% | 100.00% | 81.25% | 600.8 | recall, false_abstention, direct_precision_regression |
| hybrid-reranked | 0.9 | 0.00% | 0.00% | 100.00% | 93.75% | 600.9 | recall, false_abstention, direct_precision_regression |
| minilm-original | 0.001 | 30.21% | 18.75% | 0.00% | 0.00% | 261.5 | recall, no_match_abstention, direct_precision_regression |

Reports preserve absolute denominators, per-case ranked citations/scores, supporting hits, unavailability, access exclusions, sufficient-answer coverage, paired scenario regressions and loss stages. The development sample is too small and exposed to establish independent release confidence.

Thresholds were frozen before this matrix; only the hybrid reranker cutoff is calibrated on development. Original exhaustive MiniLM remains .001. Dense/hybrid semantic threshold is .2. Zero targeted query/corpus interventions and no optional HyDE/PageIndex pilot were used.

**No candidate passes.** Stop this selection round; do not promote the least-bad method or silently expand the search budget.

Sequential Node/ONNX capture uses local pinned q8 models, batch 8 and 512 reranker tokens. Captured warm timings are reused across cutoff sweeps. Cold startup/corpus embedding are separate in report.json; resource snapshots are separate artifacts. Concurrent load and full diagnosis latency were not evaluated. New negative fixture details include explicit simulated observations and do not assert that production persistence captures provider response bodies.

Rollback/default remains keyword. Task C, runtime integration and frontend validation have not run. Graphify required: no for this offline comparison.
