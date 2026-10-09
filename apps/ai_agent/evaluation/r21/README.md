# R2.1: separate retrieval experiment

R2.1 compares weighted keyword, BM25, semantic, hybrid and reranked hybrid against the unchanged R2 corpus. It adds no production wiring, dependencies, Phase 11/11A changes or diagnosis-model calls.

## Frozen dataset and configuration

`queries.json` contains 96 new section-labelled queries: 48 development and 48 held-out. Each split has nine answerable scenario groups and three no-match groups, with four queries per group. Groups do not cross splits, exact R2 queries are rejected, and no paired paraphrases are split between development and held-out. Held-out scenarios include group migration, stale-worker fencing, orphan identities, superseded evidence, SUCCESS progression gaps, registry mismatches, swallowed authentication rejection, server errors after sending, and prohibited secret verification.

These are author-labelled synthetic cases, not independently human-adjudicated incidents. Four queries within a scenario are correlated: the dataset represents 24 scenario groups, not 96 independent incidents. The held-out set tests new failure mechanisms and procedural questions, while sharing the fixed runbook corpus. Its results must not be used to revise this version's threshold or labels; revisions require a new dataset/config version and new held-out cases.

`config.json` freezes version `r21-v1`, the original corpus hash, the existing quantized MiniLM model revisions, semantic cutoff 0.2, hybrid candidate limit 12, and the reranker threshold grid. The corpus comes from R2's frozen `results/inputs.json`, preserving all 12 documents, 60 sections, metadata, citations and content hashes. No original runbook files are edited.

Reranker selection uses development macro Recall@3 plus no-match abstention. Ties prefer MRR, then less answerable abstention, then the smaller cutoff. This avoids selecting the most aggressive threshold from an equally good development plateau. Calibration timing is excluded from selection and recorded quality is deterministic. The semantic cutoff stays fixed to isolate the reranker experiment.

## R2 failure investigation

Read-only rescoring of the original R2 capture established:

| Original R2 held-out control | Recall@3 | No-match abstention | Answerable abstentions |
|---|---:|---:|---:|
| Sigmoid cutoff 0.3 | 0% | 100% | 14/16 |
| Sigmoid cutoff 0.0001 | 56.25% | 100% | 2/16 |
| No cutoff | 68.75% | 0% | 0/16 |

Original hybrid candidate Recall@12 was 81.25%. Development positive-query maximum candidate scores ranged from 0.9908 to 0.9997, whereas the held-out median was 0.0111. R2 searched only thresholds 0.1/0.3/0.5/0.7/0.9 and preferred the stricter threshold on ties. Its development score distribution did not represent the harder held-out queries. The 100% no-match figure measured only four actual no-match controls; it hid incorrectly abstaining on 14 answerable queries. These old held-out diagnostics justify the expanded development grid, not choosing a new threshold from the R2.1 held-out set.

Cross-encoder logits are relevance ranking scores. Sigmoid transformations are not calibrated relevance probabilities. R2.1 captures raw logits, tests a no-cutoff ranking control and the fixed old cutoff, and reports candidate losses separately from ranking and cutoff losses.

## Measured R2.1 results

See [the frozen report](runs/r21-v1-local/report.md) and [per-query diagnostics](runs/r21-v1-local/report.json).

Development selected cutoff **0.001**. Held-out Recall@3 is 48.61% keyword, 54.17% BM25, 45.83% semantic, 59.72% hybrid, and **62.5% reranked hybrid**. Reranked hybrid has 89.58% binary no-match accuracy, 76.92% no-match precision, 83.33% no-match abstention and 8.33% answerable abstention. Mean/p95 retrieval latency was 109.93/162.97 ms in the saved local CPU run.

The old cutoff 0.3 scores 41.67% recall and incorrectly abstains on 38.89% of answerable cases. No cutoff scores 68.06% recall but fails to abstain on all 12 no-match controls. Candidate Recall@12 is 84.72%; even without a cutoff, reranking loses relevant sections from those candidates. Lowering the cutoff resolves part of the R2 failure, not the candidate/ranking ceiling. None reaches the plan's 90% recall target. Keep production retrieval unchanged.

## Metric and timing definitions

- Recall@3: mean fraction of labelled relevant sections returned per answerable query. No-match controls are excluded from the denominator.
- MRR: reciprocal rank of the first relevant section, averaged over answerable queries.
- Expected no-match: no relevant section labels. Predicted no-match: zero returned excerpts.
- No-match accuracy: binary decision accuracy across all queries, including answerable queries. It does not measure excerpt relevance.
- No-match precision: correct no-match abstentions divided by all abstentions.
- No-match abstention: fraction of actual no-match queries returning nothing. Answerable abstention separately counts harmful empty results.
- Empty denominators produce `null`, not perfect scores.
- Mean and nearest-rank p95 latency include recorded query embedding/cross-encoder inference plus local ranking. Reranking measures the exact selected hybrid top-12 candidate set, not R2's calibration candidate union. One-time model loading and corpus embedding are separate. Rescoring reuses inference times while local ranking time varies.

## Run and rescore

From the repository root:

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r21.ts
```

Each run creates a new timestamped directory. `--output` can name another directory within the repository. The Node worker uses only the cached R2 model revisions (`local_files_only: true`) and has a ten-minute timeout. Missing cache files fail explicitly. No network or paid API fallback exists.

Rescore the frozen capture without inference:

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r21.ts --scores apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json --output .tmp-turbo-user/r21-rescore
```

Every run saves `config.json`, `dataset.json`, `inference-inputs.json`, `scores.json`, `report.json` and `report.md`. Inference inputs exclude labels and split/group identifiers; a dataset hash binds the separate labels to the score capture. Source/config/corpus/model hashes, complete semantic scores and exact candidate order are validated. Stored raw logits support threshold diagnostics without repeated model inference. Editing a frozen source/config/dataset requires a new matching inference capture; this version cannot silently rescore changed labels.

## Verification

21 focused retrieval tests passed, including frozen R2.1 replay and R2/R1/production-retrieval regression checks. Repository check-types and build passed. Root lint remains at the documented baseline of 9 errors and 22 warnings in unchanged frontend files. One focused independent review found no critical or important issues; independently recalculated quality metrics matched the report. Full diagnostics and review are ignored under `.tmp-turbo-user`.

## Phase implementation

Only these R2.1 files belong to this bundle:

- `apps/ai_agent/src/evaluation/retrieval-r21.ts`
- `apps/ai_agent/src/evaluation/r21-models.mjs`
- `apps/ai_agent/tests/retrieval-r21.test.ts`
- `apps/ai_agent/evaluation/r21/config.json`
- `apps/ai_agent/evaluation/r21/queries.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/config.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.md`

## Learning comments

None. Technical provenance/boundary comments are part of implementation.

## Documentation

- `apps/ai_agent/evaluation/r21/README.md`

## Excluded or uncertain

Existing R2 changes and all previously dirty Prisma, Graphify, semantic-judge calibration and unrelated `rtk/` outputs are excluded. The incoming paths below are excluded (pre-existing untracked directories are wholly excluded):

- `apps/ai_agent/package.json` (M)
- `apps/ai_agent/src/tools/search-runbooks.ts` (M)
- `bun.lock` (M)
- `graphify-out/cache/last_query_stamp` (M)
- `graphify-out/cache/semantic/pa567fc138e3a/42b6bf915e3861637d640aedc363be01f9372def65db989bfc60112b2f241977.json` (D)
- `packages/db/generated/prisma/browser.ts` (M)
- `packages/db/generated/prisma/client.ts` (M)
- `packages/db/generated/prisma/commonInputTypes.ts` (M)
- `packages/db/generated/prisma/internal/class.ts` (M)
- `packages/db/generated/prisma/internal/prismaNamespace.ts` (M)
- `packages/db/generated/prisma/internal/prismaNamespaceBrowser.ts` (M)
- `packages/db/generated/prisma/models.ts` (M)
- `packages/db/generated/prisma/models/User.ts` (M)
- `packages/db/generated/prisma/models/Zap.ts` (M)
- `packages/db/generated/prisma/models/ZapRun.ts` (M)
- `packages/db/generated/prisma/models/ZapRunExecution.ts` (M)
- `packages/db/generated/prisma/models/ZapRunRetry.ts` (M)
- `apps/ai_agent/evaluation/r2/` (??)
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.json` (??)
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.md` (??)
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.votes.json` (??)
- `apps/ai_agent/src/evaluation/r2-models.mjs` (??)
- `apps/ai_agent/src/evaluation/retrieval-r2.ts` (??)
- `apps/ai_agent/src/evaluation/run-r2.ts` (??)
- `apps/ai_agent/tests/retrieval-r2.test.ts` (??)
- `graphify-out/2026-09-30/` (??)
- `graphify-out/memory/query_20260923_064129_82e4530f_start_phase_3c_durable_dlq_publication_and_reconci.md` (??)
- `graphify-out/memory/query_20260927_180846_f1f93e82_oh_but_my_idea_for_this_prj_dlq_system_was_like_in.md` (??)
- `packages/db/generated/prisma/models/ReplayExecution.ts` (??)
- `packages/db/generated/prisma/models/ReplayExecutionAttempt.ts` (??)
- `packages/db/generated/prisma/models/ReplayFailure.ts` (??)
- `packages/db/generated/prisma/models/ReplayRequest.ts` (??)
- `packages/db/generated/prisma/models/TriageAccessAudit.ts` (??)
- `packages/db/generated/prisma/models/TriageApproval.ts` (??)
- `packages/db/generated/prisma/models/TriageDecisionNotification.ts` (??)
- `packages/db/generated/prisma/models/TriageProposal.ts` (??)
- `rtk/` (??)

The same inventory is saved in ignored `.tmp-turbo-user/r21-excluded.txt`. R2.1 depends on the existing R2 helper and frozen corpus; integrate that separate bundle before integrating R2.1. No Phase 11/11A, production, existing R2 or dependency files were edited for R2.1.

## Manual Git handoff

Review and stage only the exact paths below:

```powershell
rtk git add -- "apps/ai_agent/src/evaluation/retrieval-r21.ts" "apps/ai_agent/src/evaluation/r21-models.mjs" "apps/ai_agent/tests/retrieval-r21.test.ts" "apps/ai_agent/evaluation/r21/config.json" "apps/ai_agent/evaluation/r21/queries.json" "apps/ai_agent/evaluation/r21/README.md" "apps/ai_agent/evaluation/r21/runs/r21-v1-local/config.json" "apps/ai_agent/evaluation/r21/runs/r21-v1-local/dataset.json" "apps/ai_agent/evaluation/r21/runs/r21-v1-local/inference-inputs.json" "apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json" "apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.json" "apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.md"
```

Suggested subject: `feat(ai-agent): add isolated R2.1 retrieval calibration experiment`.

**Graphify required: no** for this bounded dataset/calibration follow-up with no production architecture change. R2's previously required milestone refresh remains separate. No Git integration was performed. Next separately authorized implementation should use Sol at medium reasoning; no subsequent phase starts automatically.
