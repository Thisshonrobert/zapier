# R2.4 fixed-pool BGE-base comparison

Pinned model Xenova/bge-reranker-base@280bcc27a84e0b898c251e06fddb25171bd9b101, q8 CPU, unchanged R2.2 candidate sets and original passage text. Development-selected sigmoid cutoff: **0.01**. No held-out threshold selection.

| Split | Recall@3 | MRR | Candidate R@12 /24 | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Rerank mean /p95 ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| development | 91.67% | 0.870 | 100.00% / 100.00% | 95.83% | 85.71% | 100.00% | 5.56% | 1132.75 / 3375.12 |
| held_out | 58.33% | 0.565 | 84.72% / 91.67% | 95.83% | 85.71% | 100.00% | 5.56% | 827.41 / 1290.97 |

Held-out recall target 90%; shortfall 31.67 percentage points. Production ready: **no**. Full calibration grid, controls at 0 and .001, rankings, logits, tokenization diagnostics and no-match confusion/overall abstention are preserved in report.json. Recall is macro section recall over answerable queries; MRR uses first relevant rank. No-match accuracy includes answerable queries; precision measures predicted abstentions. Null indicates empty denominators. p95 uses nearest rank.

## Reproduce

`rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r24.ts` runs verified local pinned cache only. Replay with `--scores apps/ai_agent/evaluation/r24/runs/r24-v1-local/scores.json`. Existing outputs and baseline paths are rejected; config/input/dataset/source/candidate and saved score provenance is validated.

## Limits

- BGE-base q8 is the only additional model tested; no claim of global best retrieval.
- R2.3 context intervention was rejected. R2.4 changes reranker family and calibrates its score cutoff on development only; old cutoff .001 and zero cutoff remain controls.
- Candidate pool, ordering, passage text, dataset and corpus remain frozen. Labels/splits are absent from the inference process.
- Reported latency is fresh reranker inference only (tokenization included), not end-to-end retrieval; historical R2.1/R2.2 pipeline timing is not directly comparable.
- Public pinned model download is one-time setup in ignored cache, not an API inference service. Model bytes/tokenizer/config hashes are frozen and live runs are local-only. External inference cost USD 0.
- No production retrieval, Phase 11/11A, downstream diagnosis or dependency edits. Author-labelled correlated synthetic groups do not establish deployment readiness.
