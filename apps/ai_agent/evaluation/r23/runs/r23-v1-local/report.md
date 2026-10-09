# R2.3 reranker failure analysis

Fixed R2.2 candidate sets, unchanged 12-runbook /60-section corpus and r21-v1 labels. Same pinned q8 model and cutoff 0.001. One intervention: add the same runbook's existing Symptoms section before the target section.

| Input | Split | Recall@3 | MRR | Candidate R@12 /24 | No-match accuracy | No-match precision | No-match abstention | Answerable abstention | Paired rerank mean /p95 ms | Truncated pairs |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| original | development | 100.00% | 0.958 | 100.00% / 100.00% | 100.00% | 100.00% | 100.00% | 0.00% | 103.65 / 215.08 | 0/732 |
| original | held_out | 59.72% | 0.602 | 84.72% / 91.67% | 89.58% | 76.92% | 83.33% | 8.33% | 88.65 / 135.63 | 0/796 |
| runbook-context | development | 97.22% | 0.954 | 100.00% / 100.00% | 97.92% | 92.31% | 100.00% | 2.78% | 126.75 / 314.92 | 0/732 |
| runbook-context | held_out | 56.94% | 0.606 | 84.72% / 91.67% | 91.67% | 83.33% | 83.33% | 5.56% | 112.46 / 159.80 | 0/796 |

Development-selected input: **original**. Held-out Recall@3: **59.72%**; target 90%; shortfall 30.28% percentage points. Production ready: **no**. No thresholds were recalibrated. report.json preserves per-query raw score margins, rankings, candidate/cutoff/ranking losses, no-match confusion, overall abstention, token counts and pipeline latency estimates.

Recall is macro section recall over answerable queries, MRR uses first relevant rank; no-match accuracy covers all queries and precision covers predicted abstentions. Counts for loss reasons are gold-section occurrences, not independent incidents. Empty denominators yield null. p95 uses nearest rank.

## Reproduce

`rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r23.ts` creates a new local cached-model run. Replay with `--scores apps/ai_agent/evaluation/r23/runs/r23-v1-local/scores.json`; source/config/dataset/candidate and saved-score provenance are checked. Existing directories and baseline output paths are rejected.

## Before replacing production

- Fresh independent query groups after freezing the chosen method; repeated use of r21-v1 is exploratory.
- Production query/metadata contract, redaction and safety checks; downstream grounded diagnosis evidence and latency/cost acceptance.
- Separately scoped production integration; no near-target shortcut or automatic replacement.

## Limits

- Only two fixed input representations with existing model are compared; this is not a global best-model search.
- Candidate sets, corpus, labels and cutoff 0.001 stay fixed. Labels/splits are absent from the inference worker.
- Input representation is chosen on development only; reused held-out scenarios informed prior hypotheses, so results remain exploratory.
- Paired fresh reranker times alternate variant order per query. Pipeline latency combines fresh reranking with historical R2.2 embedding/candidate times; it is an estimate, not fresh end-to-end timing.
- Token counts/hashes are measured before truncation; counts above 512 flag affected pairs. These are input diagnostics, not relevance scores.
- No production retrieval, Phase 11/11A, downstream diagnosis, external API calls or new dependencies. Synthetic correlated scenario groups and author labels limit generalization.
