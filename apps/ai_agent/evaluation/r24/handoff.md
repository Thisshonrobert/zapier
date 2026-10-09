# R2.3/R2.4 manual Git handoff

Verified isolated experiments; no production replacement qualifies. The R2/R2.1/R2.2 dependencies remain separate frozen bundles. No staging/committing/pushing/branch changes were performed.

## Phase implementation

- `apps/ai_agent/evaluation/r23/config.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/config.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/report.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/scores.json`
- `apps/ai_agent/evaluation/r24/cache-model.mjs`
- `apps/ai_agent/evaluation/r24/comparison.json`
- `apps/ai_agent/evaluation/r24/config.json`
- `apps/ai_agent/evaluation/r24/manifest.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/config.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/report.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/scores.json`
- `apps/ai_agent/src/evaluation/r23-analysis.ts`
- `apps/ai_agent/src/evaluation/r23-models.mjs`
- `apps/ai_agent/src/evaluation/r24-analysis.ts`
- `apps/ai_agent/src/evaluation/r24-models.mjs`
- `apps/ai_agent/src/evaluation/retrieval-r23.ts`
- `apps/ai_agent/src/evaluation/retrieval-r24.ts`
- `apps/ai_agent/tests/retrieval-r23.test.ts`
- `apps/ai_agent/tests/retrieval-r24.test.ts`

## Learning comments

None. Technical provenance/isolation comments are implementation.

## Documentation

- `apps/ai_agent/evaluation/r23/README.md`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/report.md`
- `apps/ai_agent/evaluation/r24/README.md`
- `apps/ai_agent/evaluation/r24/comparison.md`
- `apps/ai_agent/evaluation/r24/handoff.md`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/report.md`

## Excluded or uncertain

All pre-existing R2/R2.1/R2.2, production helper/dependency, Prisma, Graphify, judge and RTK changes are excluded. Exact incoming dirty paths follow. Ignored models/cache (~279MB weights), metadata, progress/verification/review scripts and replay outputs under `.tmp-turbo-user` are excluded.

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
- `apps/ai_agent/evaluation/r2/README.md` (??)
- `apps/ai_agent/evaluation/r2/handoff.md` (??)
- `apps/ai_agent/evaluation/r2/queries.json` (??)
- `apps/ai_agent/evaluation/r2/results/diagnosis-progress.json` (??)
- `apps/ai_agent/evaluation/r2/results/inputs.json` (??)
- `apps/ai_agent/evaluation/r2/results/report.json` (??)
- `apps/ai_agent/evaluation/r2/results/report.md` (??)
- `apps/ai_agent/evaluation/r2/results/scores.json` (??)
- `apps/ai_agent/evaluation/r2/runbooks/dlq-publication.md` (??)
- `apps/ai_agent/evaluation/r2/runbooks/email-rejection.md` (??)
- `apps/ai_agent/evaluation/r2/runbooks/email-uncertain.md` (??)
- `apps/ai_agent/evaluation/r2/runbooks/ordering-gap.md` (??)
- `apps/ai_agent/evaluation/r2/runbooks/telegram-cooldown.md` (??)
- `apps/ai_agent/evaluation/r2/runbooks/telegram-destination.md` (??)
- `apps/ai_agent/evaluation/r21/README.md` (??)
- `apps/ai_agent/evaluation/r21/config.json` (??)
- `apps/ai_agent/evaluation/r21/queries.json` (??)
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/config.json` (??)
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/dataset.json` (??)
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/inference-inputs.json` (??)
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.json` (??)
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.md` (??)
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json` (??)
- `apps/ai_agent/evaluation/r22/README.md` (??)
- `apps/ai_agent/evaluation/r22/config.json` (??)
- `apps/ai_agent/evaluation/r22/handoff.md` (??)
- `apps/ai_agent/evaluation/r22/investigation.json` (??)
- `apps/ai_agent/evaluation/r22/manifest.json` (??)
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/config.json` (??)
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/dataset.json` (??)
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/inference-inputs.json` (??)
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/report.json` (??)
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/report.md` (??)
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/scores.json` (??)
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/sensitivity.json` (??)
- `apps/ai_agent/evaluation/r22/sensitivity.ts` (??)
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.json` (??)
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.md` (??)
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.votes.json` (??)
- `apps/ai_agent/src/evaluation/r2-models.mjs` (??)
- `apps/ai_agent/src/evaluation/r21-models.mjs` (??)
- `apps/ai_agent/src/evaluation/r22-candidates.ts` (??)
- `apps/ai_agent/src/evaluation/r22-models.mjs` (??)
- `apps/ai_agent/src/evaluation/retrieval-r2.ts` (??)
- `apps/ai_agent/src/evaluation/retrieval-r21.ts` (??)
- `apps/ai_agent/src/evaluation/retrieval-r22.ts` (??)
- `apps/ai_agent/src/evaluation/run-r2.ts` (??)
- `apps/ai_agent/tests/retrieval-r2.test.ts` (??)
- `apps/ai_agent/tests/retrieval-r21.test.ts` (??)
- `apps/ai_agent/tests/retrieval-r22.test.ts` (??)
- `graphify-out/2026-09-30/.graphify_analysis.json` (??)
- `graphify-out/2026-09-30/.graphify_labels.json` (??)
- `graphify-out/2026-09-30/GRAPH_REPORT.md` (??)
- `graphify-out/2026-09-30/cost.json` (??)
- `graphify-out/2026-09-30/graph.json` (??)
- `graphify-out/2026-09-30/manifest.json` (??)
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
- `rtk/history.db` (??)

## Verification

Repository type-check/build passed. Root lint matches all 31 documented diagnostics in unchanged frontend files (9 errors/22 warnings). Raw-score metric recalculation and byte hashes matched. One scoped independent review found no actionable issues. Full 33-test retrieval verification is recorded in ignored `.tmp-turbo-user/r23-r24-tests-final.log`; an initial old R2 replay hit its 5s harness timeout under load, so the final suite uses 30s without editing frozen baseline tests.

## Exact staging command

```powershell
rtk git add -- "apps/ai_agent/evaluation/r23/README.md" "apps/ai_agent/evaluation/r23/config.json" "apps/ai_agent/evaluation/r23/runs/r23-v1-local/config.json" "apps/ai_agent/evaluation/r23/runs/r23-v1-local/dataset.json" "apps/ai_agent/evaluation/r23/runs/r23-v1-local/inference-inputs.json" "apps/ai_agent/evaluation/r23/runs/r23-v1-local/report.json" "apps/ai_agent/evaluation/r23/runs/r23-v1-local/report.md" "apps/ai_agent/evaluation/r23/runs/r23-v1-local/scores.json" "apps/ai_agent/evaluation/r24/README.md" "apps/ai_agent/evaluation/r24/cache-model.mjs" "apps/ai_agent/evaluation/r24/comparison.json" "apps/ai_agent/evaluation/r24/comparison.md" "apps/ai_agent/evaluation/r24/config.json" "apps/ai_agent/evaluation/r24/handoff.md" "apps/ai_agent/evaluation/r24/manifest.json" "apps/ai_agent/evaluation/r24/runs/r24-v1-local/config.json" "apps/ai_agent/evaluation/r24/runs/r24-v1-local/dataset.json" "apps/ai_agent/evaluation/r24/runs/r24-v1-local/inference-inputs.json" "apps/ai_agent/evaluation/r24/runs/r24-v1-local/report.json" "apps/ai_agent/evaluation/r24/runs/r24-v1-local/report.md" "apps/ai_agent/evaluation/r24/runs/r24-v1-local/scores.json" "apps/ai_agent/src/evaluation/r23-analysis.ts" "apps/ai_agent/src/evaluation/r23-models.mjs" "apps/ai_agent/src/evaluation/r24-analysis.ts" "apps/ai_agent/src/evaluation/r24-models.mjs" "apps/ai_agent/src/evaluation/retrieval-r23.ts" "apps/ai_agent/src/evaluation/retrieval-r24.ts" "apps/ai_agent/tests/retrieval-r23.test.ts" "apps/ai_agent/tests/retrieval-r24.test.ts"
```

Suggested subject: `feat(ai-agent): add isolated reranker diagnostics and model comparison`.

**Graphify required: no** for these bounded experiment phases without production architecture changes. Earlier milestone obligations remain separate. Stop for manual review/staging/commit/push/merge. No next experiment starts automatically. A separately requested follow-up should use Sol at medium reasoning.
