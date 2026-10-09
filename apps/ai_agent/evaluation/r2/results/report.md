# R2 expanded retrieval experiment

12 runbooks, 60 sections, 40 labelled queries (20 development, 20 held-out).

| Variant | Dev Recall@3 | Held-out Recall@3 | Held-out MRR | Held-out no-match | Mean held-out ms |
|---|---:|---:|---:|---:|---:|
| weighted-keyword | 84.4% | 18.8% | 0.146 | 0.0% | 0.32 |
| bm25 | 87.5% | 31.3% | 0.219 | 0.0% | 2.40 |
| semantic | 78.1% | 56.3% | 0.521 | 100.0% | 24.52 |
| hybrid | 90.6% | 53.1% | 0.437 | 0.0% | 26.82 |
| hybrid-reranked | 87.5% | 0.0% | 0.000 | 100.0% | 145.35 |

Thresholds selected on development only: cosine 0.2, reranker sigmoid 0.3. Retrieval external cost: $0. Local model loading: 12024 ms; corpus encoding: 570 ms.

## Downstream grounded diagnosis and abstention

Mode: live model on controlled fixtures. Model: gemini-3.5-flash-lite. Calls: 20/20; accounted tokens: 70188/120000; monetary cost: unmeasured.

| Variant | Completed | Evidence grounding | Safe routing | Accepted taxonomy |
|---|---:|---:|---:|---:|
| weighted-keyword | 4/4 | 4/4 | 4/4 | 4/4 |
| bm25 | 4/4 | 4/4 | 4/4 | 4/4 |
| semantic | 4/4 | 4/4 | 4/4 | 4/4 |
| hybrid | 4/4 | 4/4 | 4/4 | 4/4 |
| hybrid-reranked | 4/4 | 4/4 | 4/4 | 4/4 |

Actual abstentions are recorded per variant in report.json. Stop reason: none. Inspect report.json for each case's safety and quality diagnostics. Evidence-grounding counts validate references; they do not measure semantic grounding. All variants share evidence, cases, graph, prompt and model. Labels never enter retrieval or diagnosis prompts.

## Recommendation and limits

Keep production weighted-keyword retrieval. This small simulated experiment cannot establish production adoption or replay eligibility.

- Section labels are author-assigned, not independently adjudicated.
- Held-out queries are authored separately but share scenarios with development; no statistical significance claim.
- CPU timings include query encoding and bounded calibration-candidate reranking, exclude one-time setup; cached scores rescore rankings without rerunning inference.
- Downstream pilot has four controlled incomplete-evidence cases per variant; external action providers are absent. Paid model monetary cost is unknown; token usage is recorded.
- Public global runbooks contain no customer data; owner access remains in the existing graph and production retrieval path is unchanged.
- Similarity and relevance scores cannot change deterministic replay policy.

## Reproduce

From the repository root:

`rtk proxy bun --env-file=apps/ai_agent/.env apps/ai_agent/src/evaluation/run-r2.ts --live`

Omit --live for retrieval only. Reuse captured scores without model downloads:

`rtk proxy bun apps/ai_agent/src/evaluation/run-r2.ts --scores apps/ai_agent/evaluation/r2/results/scores.json --output .tmp-turbo-user/r2-rescore`

Model implementations follow the pinned [embedding model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2) and [cross-encoder model card](https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2); the runtime is an experiment-only development dependency.
