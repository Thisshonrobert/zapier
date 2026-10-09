# R2.2: candidate generation only

R2.2 reranks the full deduplicated union of the existing BM25 top 12 and dense top 12, bounded at 24 sections. R2.1 truncated that union's reciprocal-rank-fusion ordering to 12 before reranking. Everything before that truncation stays fixed: BM25 arithmetic, metadata/stale filters, dense cutoff 0.2, branch depths 12 and RRF constant 60. The same pinned q8 cross-encoder, tokenizer, CPU device, batches of 8 and sigmoid cutoff **0.001** return at most three sections. No threshold sweep or recalibration occurs.

This is an isolated evaluation module. It reuses the frozen R2 corpus and R2.1's `r21-v1` dataset: 12 runbooks, 60 sections, 96 unchanged labels and queries, 48 per split. Baseline files are pinned by byte hashes in `config.json`; baseline corpus/config/dataset/input/score provenance is checked before every run. The 31 protected baseline and dependency files remain unchanged. Production retrieval, Phase 11/11A and downstream diagnosis are untouched. Existing R2 dependencies are reused; no dependencies were added.

## Why this minimal change

Read-only inspection of R2.1 found eight missing gold sections across six held-out queries. Three were already present in a branch's top 12 but excluded by the final fused top-12 truncation. Five never entered either top-12 branch. Seven of eight had dense similarity above 0.2, so lowering that cutoff alone would address little of this bottleneck.

A diagnostic probe that fused full branch lists rather than their top 12 reduced candidate Recall@12 from 84.72% to 83.33%. That probe is not the R2.2 algorithm. The selected hypothesis retains the existing branch rankings and exposes already-generated candidates to the unchanged reranker. No lexical rewrites, query expansion, document diversification, new models or production adoption were implemented. [Investigation details](investigation.json) record the baseline missing citations and branch ranks.

## Results and interpretation

See the [frozen report](runs/r22-v1-local/report.md) and [per-query rankings](runs/r22-v1-local/report.json). Candidate Recall@12 remains 84.72% by construction; the full union reaches **91.67% candidate Recall@24**, recovering three missing gold sections. Held-out final Recall@3 decreases from **62.50% to 59.72%** and MRR from **0.611 to 0.602**. Development Recall@3 remains 100%. No-match confusion and all abstention metrics remain unchanged. This experiment does **not** justify adopting the larger pool: better candidate coverage did not improve final retrieval.

The report compares Recall@3, MRR, candidate recall, binary no-match accuracy/precision/confusion, no-match/answerable/overall abstention and mean/p95 latency on both splits. Recall is macro section recall over answerable queries; MRR uses first relevant returned rank. Empty denominators are null. Latency excludes model loading/corpus embedding and uses nearest-rank p95. Actual candidate counts, per-query raw logits, complete reranked order, recovered/missing gold, ranking losses and cutoff losses are preserved.

R2.1 held-out diagnostics informed this hypothesis. The reused held-out comparison is exploratory, not a fresh confirmatory evaluation; author-labelled synthetic queries are correlated within 24 scenario groups. No R2.2 parameter tuning or label changes occurred.

Expanding inputs also changes batch composition/padding while model settings remain fixed. Shared-candidate logits differed by up to 0.5067 in the measured run; the unchanged first batch of eight had zero drift. A [separate sensitivity control](runs/r22-v1-local/sensitivity.json) freezes baseline logits for shared candidates and uses R2.2 logits only for added candidates. It reproduces the same 59.72% Recall@3 and 0.602 MRR, with unchanged no-match decisions. This mixed capture is a counterfactual diagnostic, not a new inference run, and reports no measured latency.

R2.2 uses fresh local CPU timing while R2.1 uses historical saved timing. Host load, warm caches and batch padding make those timings unsuitable for a controlled speedup/slowdown claim. The report records actual timings and excludes setup; external API cost is zero.

## Reproduce

From the repository root:

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r22.ts
rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r22.ts --scores apps/ai_agent/evaluation/r22/runs/r22-v1-local/scores.json --output .tmp-turbo-user/r22-replay-new
rtk proxy bun apps/ai_agent/evaluation/r22/sensitivity.ts .tmp-turbo-user/r22-sensitivity-new.json
```

Live inference uses only locally cached pinned R2 models, with no network or paid fallback. Each inference run freezes config, dataset, inference inputs (without labels), source/config/dataset hashes, scores and both reports. Complete semantic and logit coverage and exact candidate identities/order are validated. Frozen replay requires the capture's sibling report and verifies its recorded score/config/input/dataset/source hashes. Changed finite logits are rejected. Existing output directories are rejected, and output is restricted to new R2.2 runs or ignored temporary directories. R2.1 directories cannot be an output target.

`manifest.json` records byte hashes for this bundle's code, tests, documentation and artifacts; it excludes itself. R2.2 depends on the existing R2/R2.1 modules and baseline files: integrate those separately first.

## Verification and handoff

26 focused tests passed across R2.2, R2.1, R2, R1 and production retrieval, including deterministic frozen replay, tampered score rejection and baseline overwrite prevention. Independent recalculation from raw captures matched metrics; semantic scores and all 96 top-12 candidate prefixes matched R2.1. Repository check-types and build passed. Lint fails with exactly the existing frontend baseline: 9 errors and 22 warnings; all 31 diagnostics match the documented baseline and their source files are unchanged.

One scoped independent review found a replay score-hash gap; it was fixed with sibling-report validation and a CLI regression test. The sensitivity control was reproduced without inference.

See [the exact file inventory and staging command](handoff.md). No staging, committing, pushing or branch changes were performed. **Graphify required: no** for this bounded isolated experiment. No next experiment starts automatically; use Sol at medium reasoning for a separately requested follow-up.
