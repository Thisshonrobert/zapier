# Integration-only handoff

Feature flag prepared, keyword remains default. No environment change, external inference, fresh-set access, staging, commit, push or branch switch occurred in this task. Intent-conditioning rejection commit 754419f is already separate. No production readiness or independent 80% acceptance claim is made.

## Phase implementation

- `apps/ai_agent/src/graph.ts`
- `apps/ai_agent/src/index.ts`
- `apps/ai_agent/src/runner.ts`
- `apps/ai_agent/src/tools/runbook-retriever.ts`
- `apps/ai_agent/src/tools/minilm-process.mjs`
- `apps/ai_agent/tests/runbook-retriever.test.ts`
- `apps/ai_agent/tests/diagnosis-graph.test.ts`
- `apps/ai_agent/evaluation/retrieval-integration/verify-dev.mjs`
- `apps/ai_agent/evaluation/retrieval-integration/runs/dev-v2/report.json`
- `apps/ai_agent/evaluation/retrieval-integration/runs/dev-v2/verification.json`

The graph accepts async retrieval and validates its resolved output. The durable executor receives the selected retriever from startup and closes its local process during shutdown. Existing synchronous fixture/demo/replay tools stay compatible. Node subprocess scores original eligible passages; model bytes/revision, bounds and cutoff are pinned. Keyword is the explicit rollback, never an implicit response to MiniLM abstention or failure.

## Learning comments

None. Comments in implementation files explain runtime ownership, queue bounds and frozen validation reuse; no learning-only files were added.

## Documentation

- `apps/ai_agent/evaluation/retrieval-integration/README.md`
- `apps/ai_agent/evaluation/retrieval-integration/HANDOFF.md`

## Verification

33 focused tests passed, one optional PostgreSQL test skipped, zero failures (combined suite plus newly added missing-model test). Root type check and build passed; frontend build was cached and replayed existing SWC/package-manager warnings. Root lint failed with 9 errors/22 warnings in unchanged frontend files. Diff review found no substantive whitespace diagnostics in this integration; Git reports existing CRLF conversion warnings. Native Bun-to-Node smoke verified all 28 frozen development rankings/scores with the original corpus. Smaller production corpus: positive recall 24/24 for both methods; no-match 3/4 MiniLM versus 1/4 keyword. Five-second scoring deadline/kill and one in-flight request are enforced; production concurrency/load and actual incident-derived query quality remain unvalidated.

## Excluded or uncertain

All paths below are outside this integration-only staging scope. Earlier experiments, package/lock changes, baseline search source change, master-plan edit, generated Prisma and Graphify outputs predate this task. dev-v1 is the intermediate Node smoke report; final dev-v2 is the provenance-verified Bun run. Tracked change paths and statistics were inspected for scope, integration diffs were reviewed, and the full tracked diff was archived in ignored .tmp-turbo-user/retrieval-integration-reviewed-tracked.diff; no untracked fresh dataset contents were read. Filenames are listed solely to exclude them from staging.

- `apps/ai_agent/evaluation/downstream-noise/HANDOFF.md`
- `apps/ai_agent/evaluation/downstream-noise/README.md`
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/impact-summary.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/manifest.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/progress.jsonl`
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/qualitative-review.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/report.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/verification.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/prepare-v1/manifest.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/prepared-v2/manifest.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/prepared-v3/manifest.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/replay-v1/manifest.json`
- `apps/ai_agent/evaluation/downstream-noise/runs/replay-v1/progress.jsonl`
- `apps/ai_agent/evaluation/downstream-noise/runs/replay-v1/report.json`
- `apps/ai_agent/evaluation/downstream-noise/summarize.mjs`
- `apps/ai_agent/evaluation/intent-dev/README.md`
- `apps/ai_agent/evaluation/intent-dev/benchmark.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v1/benchmark.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v1/development-audit.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v2/benchmark.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v2/development-audit.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v2/inference-inputs.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v2/report.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v2/scores.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v3/benchmark.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v3/development-audit.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v3/inference-inputs.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v3/report.json`
- `apps/ai_agent/evaluation/intent-dev/runs/intent-v3/scores.json`
- `apps/ai_agent/evaluation/r2/README.md`
- `apps/ai_agent/evaluation/r2/handoff.md`
- `apps/ai_agent/evaluation/r2/queries.json`
- `apps/ai_agent/evaluation/r2/results/diagnosis-progress.json`
- `apps/ai_agent/evaluation/r2/results/inputs.json`
- `apps/ai_agent/evaluation/r2/results/report.json`
- `apps/ai_agent/evaluation/r2/results/report.md`
- `apps/ai_agent/evaluation/r2/results/scores.json`
- `apps/ai_agent/evaluation/r2/runbooks/dlq-publication.md`
- `apps/ai_agent/evaluation/r2/runbooks/email-rejection.md`
- `apps/ai_agent/evaluation/r2/runbooks/email-uncertain.md`
- `apps/ai_agent/evaluation/r2/runbooks/ordering-gap.md`
- `apps/ai_agent/evaluation/r2/runbooks/telegram-cooldown.md`
- `apps/ai_agent/evaluation/r2/runbooks/telegram-destination.md`
- `apps/ai_agent/evaluation/r21/README.md`
- `apps/ai_agent/evaluation/r21/config.json`
- `apps/ai_agent/evaluation/r21/queries.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/config.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.md`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json`
- `apps/ai_agent/evaluation/r22/README.md`
- `apps/ai_agent/evaluation/r22/config.json`
- `apps/ai_agent/evaluation/r22/handoff.md`
- `apps/ai_agent/evaluation/r22/investigation.json`
- `apps/ai_agent/evaluation/r22/manifest.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/config.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/report.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/report.md`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/scores.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/sensitivity.json`
- `apps/ai_agent/evaluation/r22/sensitivity.ts`
- `apps/ai_agent/evaluation/r23/README.md`
- `apps/ai_agent/evaluation/r23/config.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/config.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/report.json`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/report.md`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/scores.json`
- `apps/ai_agent/evaluation/r24/README.md`
- `apps/ai_agent/evaluation/r24/cache-model.mjs`
- `apps/ai_agent/evaluation/r24/comparison.json`
- `apps/ai_agent/evaluation/r24/comparison.md`
- `apps/ai_agent/evaluation/r24/config.json`
- `apps/ai_agent/evaluation/r24/handoff.md`
- `apps/ai_agent/evaluation/r24/manifest.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/config.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/report.json`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/report.md`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/scores.json`
- `apps/ai_agent/evaluation/r25/HANDOFF.md`
- `apps/ai_agent/evaluation/r25/README.md`
- `apps/ai_agent/evaluation/r25/RECOVERY-HANDOFF.md`
- `apps/ai_agent/evaluation/r25/RECOVERY.md`
- `apps/ai_agent/evaluation/r25/corpus-only.json`
- `apps/ai_agent/evaluation/r25/fresh-label-rationales-v1.json`
- `apps/ai_agent/evaluation/r25/fresh-scenarios-author-v1.json`
- `apps/ai_agent/evaluation/r25/fresh-scenarios-v1.json`
- `apps/ai_agent/evaluation/r25/method-freeze.json`
- `apps/ai_agent/evaluation/r25/method-selection.json`
- `apps/ai_agent/evaluation/r25/runs/audit-v1/audit-independent.json`
- `apps/ai_agent/evaluation/r25/runs/audit-v1/audit-key.json`
- `apps/ai_agent/evaluation/r25/runs/audit-v1/audit-packet.json`
- `apps/ai_agent/evaluation/r25/runs/audit-v1/audit-template.json`
- `apps/ai_agent/evaluation/r25/runs/audit-v1/baseline-freeze.json`
- `apps/ai_agent/evaluation/r25/runs/audit-v1/corrections.json`
- `apps/ai_agent/evaluation/r25/runs/descriptions-v1/descriptions.json`
- `apps/ai_agent/evaluation/r25/runs/descriptions-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/descriptions-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/descriptions-v1/scores.json`
- `apps/ai_agent/evaluation/r25/runs/downstream-contract-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/downstream-contract-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/downstream-contract-v1/scores.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/audit.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/dataset-audited.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/dataset-original.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/scores.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v2/audit.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v2/dataset-audited.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v2/dataset-original.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v2/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v2/report.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v2/scores.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/dataset.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/freeze.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/scores.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-continuation-v1/failure.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-continuation-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-continuation-v1/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-continuation-v1/progress.jsonl`
- `apps/ai_agent/evaluation/r25/runs/reasoning-partial-report-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-partial-report-v2/report.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-partial-report-v3/report.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-preview-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-preview-v1/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-preview-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-preview-v1/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-preview-v2/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-preview-v2/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/assessment.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/attempts.jsonl`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/http.jsonl`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/progress.jsonl`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/recommendation.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/selections.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/failure.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/progress.jsonl`
- `apps/ai_agent/evaluation/r25/section-descriptions-v1.json`
- `apps/ai_agent/evaluation/retrieval-integration/runs/dev-v1/report.json`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.json`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.md`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.votes.json`
- `apps/ai_agent/package.json`
- `apps/ai_agent/src/evaluation/downstream-noise.ts`
- `apps/ai_agent/src/evaluation/r2-models.mjs`
- `apps/ai_agent/src/evaluation/r21-models.mjs`
- `apps/ai_agent/src/evaluation/r22-candidates.ts`
- `apps/ai_agent/src/evaluation/r22-models.mjs`
- `apps/ai_agent/src/evaluation/r23-analysis.ts`
- `apps/ai_agent/src/evaluation/r23-models.mjs`
- `apps/ai_agent/src/evaluation/r24-analysis.ts`
- `apps/ai_agent/src/evaluation/r24-models.mjs`
- `apps/ai_agent/src/evaluation/r25-analysis.ts`
- `apps/ai_agent/src/evaluation/r25-continue.ts`
- `apps/ai_agent/src/evaluation/r25-descriptions.ts`
- `apps/ai_agent/src/evaluation/r25-downstream.ts`
- `apps/ai_agent/src/evaluation/r25-freeze.ts`
- `apps/ai_agent/src/evaluation/r25-fresh.ts`
- `apps/ai_agent/src/evaluation/r25-gemini.ts`
- `apps/ai_agent/src/evaluation/r25-models.mjs`
- `apps/ai_agent/src/evaluation/r25-partial.ts`
- `apps/ai_agent/src/evaluation/r25-reasoning-replay.ts`
- `apps/ai_agent/src/evaluation/r25-reasoning.ts`
- `apps/ai_agent/src/evaluation/r25-recover.ts`
- `apps/ai_agent/src/evaluation/retrieval-intent.ts`
- `apps/ai_agent/src/evaluation/retrieval-r2.ts`
- `apps/ai_agent/src/evaluation/retrieval-r21.ts`
- `apps/ai_agent/src/evaluation/retrieval-r22.ts`
- `apps/ai_agent/src/evaluation/retrieval-r23.ts`
- `apps/ai_agent/src/evaluation/retrieval-r24.ts`
- `apps/ai_agent/src/evaluation/retrieval-r25.ts`
- `apps/ai_agent/src/evaluation/run-r2.ts`
- `apps/ai_agent/src/tools/search-runbooks.ts`
- `apps/ai_agent/tests/downstream-noise.test.ts`
- `apps/ai_agent/tests/r25-descriptions.test.ts`
- `apps/ai_agent/tests/r25-freeze.test.ts`
- `apps/ai_agent/tests/r25-recovery.test.ts`
- `apps/ai_agent/tests/retrieval-intent.test.ts`
- `apps/ai_agent/tests/retrieval-r2.test.ts`
- `apps/ai_agent/tests/retrieval-r21.test.ts`
- `apps/ai_agent/tests/retrieval-r22.test.ts`
- `apps/ai_agent/tests/retrieval-r23.test.ts`
- `apps/ai_agent/tests/retrieval-r24.test.ts`
- `apps/ai_agent/tests/retrieval-r25.test.ts`
- `bun.lock`
- `docs/ai-dlq-master-plan.md`
- `graphify-out/.vocab.txt`
- `graphify-out/2026-09-30/.graphify_analysis.json`
- `graphify-out/2026-09-30/.graphify_labels.json`
- `graphify-out/2026-09-30/GRAPH_REPORT.md`
- `graphify-out/2026-09-30/cost.json`
- `graphify-out/2026-09-30/graph.json`
- `graphify-out/2026-09-30/manifest.json`
- `graphify-out/cache/last_query_stamp`
- `graphify-out/cache/semantic/pa567fc138e3a/42b6bf915e3861637d640aedc363be01f9372def65db989bfc60112b2f241977.json`
- `graphify-out/memory/query_20260923_064129_82e4530f_start_phase_3c_durable_dlq_publication_and_reconci.md`
- `graphify-out/memory/query_20260927_180846_f1f93e82_oh_but_my_idea_for_this_prj_dlq_system_was_like_in.md`
- `packages/db/generated/prisma/browser.ts`
- `packages/db/generated/prisma/client.ts`
- `packages/db/generated/prisma/commonInputTypes.ts`
- `packages/db/generated/prisma/internal/class.ts`
- `packages/db/generated/prisma/internal/prismaNamespace.ts`
- `packages/db/generated/prisma/internal/prismaNamespaceBrowser.ts`
- `packages/db/generated/prisma/models.ts`
- `packages/db/generated/prisma/models/ReplayExecution.ts`
- `packages/db/generated/prisma/models/ReplayExecutionAttempt.ts`
- `packages/db/generated/prisma/models/ReplayFailure.ts`
- `packages/db/generated/prisma/models/ReplayRequest.ts`
- `packages/db/generated/prisma/models/TriageAccessAudit.ts`
- `packages/db/generated/prisma/models/TriageApproval.ts`
- `packages/db/generated/prisma/models/TriageDecisionNotification.ts`
- `packages/db/generated/prisma/models/TriageProposal.ts`
- `packages/db/generated/prisma/models/User.ts`
- `packages/db/generated/prisma/models/Zap.ts`
- `packages/db/generated/prisma/models/ZapRun.ts`
- `packages/db/generated/prisma/models/ZapRunExecution.ts`
- `packages/db/generated/prisma/models/ZapRunRetry.ts`
- `rtk/history.db`

## Manual Git handoff

This exact command stages only this task:

```powershell
git add -- "apps/ai_agent/src/graph.ts" "apps/ai_agent/src/index.ts" "apps/ai_agent/src/runner.ts" "apps/ai_agent/src/tools/runbook-retriever.ts" "apps/ai_agent/src/tools/minilm-process.mjs" "apps/ai_agent/tests/runbook-retriever.test.ts" "apps/ai_agent/tests/diagnosis-graph.test.ts" "apps/ai_agent/evaluation/retrieval-integration/verify-dev.mjs" "apps/ai_agent/evaluation/retrieval-integration/runs/dev-v2/report.json" "apps/ai_agent/evaluation/retrieval-integration/runs/dev-v2/verification.json" "apps/ai_agent/evaluation/retrieval-integration/README.md" "apps/ai_agent/evaluation/retrieval-integration/HANDOFF.md"
```

Suggested subject: `feat(ai-agent): prepare opt-in MiniLM runbook retrieval`

**Prerequisite limitation:** this integration-only commit is not a self-contained rollout bundle. The existing Transformers 3.8.1 dependency/package-lock additions and development experiment artifacts remain uncommitted and deliberately excluded. The runtime opt-in requires that dependency installed and the pinned cache provisioned; verify packaging before enabling it in a deployment. The verification script additionally imports excluded historical experiment helpers and reads their saved development artifacts. Integrate those earlier scopes separately after review; do not broadly stage the dirty repository or alter the frozen baseline hashes to mask a packaging conflict.

## Antigravity handoff

Reconcile master-plan optional R2 status with the user's 2026-10-09 authorization for an opt-in integration candidate. Record keyword-default, local-only model, missing independent acceptance and packaging prerequisites. Routine docs outside apps/ai_agent were not edited by Codex. **Graphify required: no** for this bounded retrieval option; no services, shared contracts, schemas or buses were restructured. No graph refresh was run.

Next validation phase: GPT-6 Sol, medium reasoning. Keep it scoped to actual incident-derived query/diagnosis comparisons and deployment packaging; accessing the fresh set requires explicit authorization. Stop after this handoff for manual Git integration.
