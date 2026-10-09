# Optional R2: expanded retrieval experiment

Completed as an isolated, simulated comparison on 2026-10-07. Production retrieval remains weighted keyword. This experiment grants no replay or deployment authority.

Read [results/report.md](results/report.md) for the measured comparison and [results/report.json](results/report.json) for per-query rankings and downstream checks. The model cards linked in the report describe the local embedding and cross-encoder implementations. `@huggingface/transformers@3.8.1` is a development dependency; native inference runs under Node, while diagnosis uses the existing Bun graph.

## Frozen evidence

- `queries.json`: 40 author-labelled queries, split into 20 development and 20 held-out cases, including eight no-match controls and eight multi-section ambiguous cases. Labels are section citations, not whole runbooks.
- `runbooks/*.md`: six additional simulated runbooks addressing cooldowns, Telegram destinations, email rejection/unknown outcomes, predecessor ordering and outbox reconciliation. The experiment also loads the existing six allowlisted runbooks. The production allowlist is unchanged.
- `results/inputs.json`: complete frozen corpus, queries, labels, diagnosis fixtures and sanitized evidence bundles.
- `results/scores.json`: real local cosine and cross-encoder scores, pinned model revisions and measured inference timings. It contains no fixture relevance labels used by inference.
- `results/report.json`: hashes, selected development thresholds, metrics and all 20 captured live diagnosis responses with existing safety/quality checks. Monetary Gemini cost is unknown; token usage is recorded. Each generation includes a token-count preflight (20 generations, 40 successful provider HTTP requests).
- `results/diagnosis-progress.json`: original incremental capture; aggregate reporting labels were corrected when rescoring `report.json`. Raw observations remain unchanged.

## Running and rescoring

From the repository root, run local inference with:

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/run-r2.ts
```

This downloads the two public pinned models into ignored `.tmp-turbo-user/r2-models` and overwrites the default results directory. Use `--output .tmp-turbo-user/r2-new-run` to preserve the checked-in capture. CPU inference and candidate calibration are bounded; model worker timeout is ten minutes. No customer data, DB access, Kafka intake or action providers are involved.

For an explicitly approved paid diagnosis pilot, use the existing `GEMINI_API_KEY` and `GEMINI_MODEL` configuration with `--live`. Calls are serial, paced at least 13 seconds apart, with no repairs, a maximum of 20 diagnosis generations and 120,000 accounted tokens. Each call reserves 6,000 tokens and enforces that bound through token-count preflight; unknown usage keeps the reservation. A provider failure stops further generations. All variants share four controlled cases, evidence, graph, model and prompt. The pilot is too small to establish diagnosis-quality gains or live eligibility.

Rescore the complete frozen experiment without downloading models or sending API requests:

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/run-r2.ts --scores apps/ai_agent/evaluation/r2/results/scores.json --diagnosis-report apps/ai_agent/evaluation/r2/results/report.json --output .tmp-turbo-user/r2-rescore
```

Rescoring checks input/model-score/label hashes, fixture identity, evidence and retrieved matches before recalculating downstream metrics. Held-out labels never select thresholds. Recall@3 is macro section recall; MRR uses the first relevant section. No-match queries have a separate denominator. Reranker times include the union of candidate sets captured across development threshold choices; they are conservative comparison measurements rather than production top-12 latency estimates.

## Result interpretation

The semantic variant achieved the highest held-out section recall, 56.25%, while excluding all four held-out no-match controls. Reranking achieved 0% held-out recall at the development-selected threshold; do not tune it against those held-out cases. None meets the plan's 90% retrieval recall target. Keep production retrieval unchanged. All five downstream variants grounded their references and safely routed all four fixtures, with two actual abstentions each. These checks establish reference integrity and routing safety, not semantic correctness or meaningful improvement across variants.
