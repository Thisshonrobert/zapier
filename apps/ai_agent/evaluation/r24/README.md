# R2.4: bounded reranker model comparison

After R2.3 ruled out token truncation and rejected added runbook context, R2.4 tests one additional model on the unchanged R2.2 candidate sets and original heading/content passage text. It uses public `Xenova/bge-reranker-base`, pinned revision `280bcc27a84e0b898c251e06fddb25171bd9b101`, q8 CPU, batch size 8 and max length 512. The 279,301,077-byte quantized weight file and tokenizer/config files are byte-hashed. No production dependencies are added.

The [publisher's model card](https://huggingface.co/BAAI/bge-reranker-base) and [Transformers.js-compatible conversion](https://huggingface.co/Xenova/bge-reranker-base) establish availability, not superiority for this corpus. The [MS MARCO model documentation](https://www.sbert.net/docs/cross_encoder/pretrained_models.html) describes the original model's passage-ranking training setting. A mismatch with procedural runbook relevance is a hypothesis, not a proven cause.

## Result

Development selects sigmoid cutoff **0.01** from the frozen grid, using Recall@3 plus no-match abstention; ties prefer MRR, lower answerable abstention and lower cutoff. Held-out labels/scores are excluded from calibration. Scores from different models are not treated as calibrated relevance probabilities.

At that selected cutoff, held-out Recall@3 is **58.33%**, MRR **0.565**, no-match abstention **100%**, answerable abstention **5.56%** and no-match accuracy **95.83%**. Mean/p95 CPU reranker time is **827.41/1290.97 ms** in this run. Candidate Recall@12/24 remains 84.72%/91.67%. Of 48 held-out labelled gold-section occurrences, 27 are returned, 5 are absent from the pool, 15 fail the cutoff and 1 loses top-three ranking.

The fixed 0.001 diagnostic control reaches 62.50% recall, matching R2.1, with zero answerable abstentions and 83.33% no-match abstention. It was **not selected on development** and must not be promoted using these reused held-out results. Zero cutoff still reaches only 62.50% and fails all held-out no-match controls: removing the cutoff alone does not resolve ranking misses.

R2.1's MiniLM hybrid reranker at its development-selected cutoff 0.001 remains the strongest tested baseline by selected-cutoff held-out Recall@3: **62.50%**, still **27.50 percentage points below** the 90% target. This is a comparison among the methods tested here, not a global best-retriever claim. No tested method qualifies for production replacement. “Near target” is not an alternative acceptance gate.

See [the model report](runs/r24-v1-local/report.md), [all rankings and calibration controls](runs/r24-v1-local/report.json) and [the consolidated method comparison](comparison.md).

## Reproduce

From the repository root, prepare the pinned public model once, then run locally:

```powershell
rtk proxy node apps/ai_agent/evaluation/r24/cache-model.mjs
rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r24.ts
rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r24.ts --scores apps/ai_agent/evaluation/r24/runs/r24-v1-local/scores.json --output .tmp-turbo-user/r24-replay-new
```

Only the explicit cache preparation command downloads public files. Inference verifies cached bytes and uses `local_files_only: true`; missing or changed files fail without network/API fallback. Weights reside in ignored `.tmp-turbo-user/r24-models` and are excluded from Git. Setup/download time is excluded from query timing. External inference cost is zero; CPU time/storage cost is not priced.

Config, dataset, candidate identities/order, passage inputs, tokenizer hashes/counts, source hashes, raw logits, calibration grid, per-query gold margins/rank losses, no-match confusion and timing are frozen as artifacts. Saved replay validates recorded scores against its sibling report and refuses changed finite logits, existing outputs or baseline destinations. Baseline R2/R2.1/R2.2/R2.3 files stay intact.

## Acceptance and limits

All results reuse r21-v1 synthetic scenario groups; they are exploratory. Before replacement, a chosen method needs a fresh independent evaluation after freezing it, at least the plan's 90% top-three recall target, preserved no-match/safety behavior, production query/metadata/redaction contract checks, grounded downstream diagnosis evidence, and agreed cost/latency acceptance. None of those requirements is waived by an isolated retrieval score.

The model timing measures fresh reranking only; R2.1's historical 109.93 ms mean measures its retrieval pipeline. R2.3's paired original reranker measured 88.65 ms mean, but R2.4 ran separately under different load, so model timing is descriptive rather than a controlled performance benchmark. Production, Phase 11/11A and diagnosis are untouched.

Verification logs and the scoped review are ignored under `.tmp-turbo-user`. See [exact file inventory and manual staging command](handoff.md). **Graphify required: no.** No Git actions or automatic next experiment were performed. A separately requested follow-up should use Sol at medium reasoning.
