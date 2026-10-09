# R2 study archive — 2026-10-09

The user requested one commit preserving R2 through R2.5, rejected interventions, partial/failed runs, downstream diagnosis checks and the opt-in MiniLM integration before studying and making further changes. This is an experiment archive, not a release or a completed evaluation claim. Historical per-task handoffs remain records of their original scope; this document supersedes their separate staging instructions and their statements that dependencies/earlier experiments are uncommitted. Original frozen sources, configurations, inputs and captures are preserved.

Production remains keyword by default. MiniLM is an opt-in candidate only. No deployment environment change, replay enablement, fresh-set access, paid model invocation, push or branch switch is part of this archive commit. Transformers 3.8.1 and its lockfile are included as development dependencies; production-only packaging remains unresolved. Model binaries stay in the ignored local cache and are not committed.

## What was learned

- Original MiniLM is a cross-encoder. Exhaustive scoring considers every eligible section, then applies the fixed cutoff and top-three bound.
- On reused old held-out queries with audited labels, original exhaustive MiniLM macro section Recall@3 was 76.39%, versus keyword 46.76%. This misses the revised 80% target and does not establish independent production acceptance. Original historical targets and reports remain unchanged.
- Intent conditioning is rejected: development no-match abstention dropped 75% to 25%, measured mean latency increased 22.97%, and positive recall stayed 100% in both arms. The rejection ledger is already in parent commit 754419f.
- The paired downstream test completed 30 live synthetic calls earlier. One noisy-context unsafe replay proposal was rejected by the graph. Correct taxonomy/action counts and unsupported prose concerns are retained; the experiment does not prove uniform noise safety.
- Runtime integration matches 28 saved development rankings/scores on the original corpus. On the six-runbook production corpus, both methods recalled 24/24 positive gold passages, and no-match abstention was 3/4 MiniLM versus 1/4 keyword. These are reused synthetic development questions.
- R2.5 reasoning recovery was incomplete. Partial captures and failed attempts are preserved as unavailable outcomes, not invented successes or abstentions.

## Verification and limitations

The full AI-agent suite on this workspace reported 221 passes, 7 skips and 4 failures. Three database tests used null pools without a configured database; V4 artifact replay reported an unchanged pre-R2 cases.json hash mismatch. The archive preserves these failures rather than altering old artifacts or declaring the full suite green. The R2-focused suite passed 74 tests with one optional PostgreSQL skip and zero failures across 15 files. Scoped TypeScript verification and root build passed. Root lint retains its known 9 errors/22 warnings in unchanged frontend code. No new live inference or fresh evaluation was run to produce this commit. Detailed results are recorded in R2-ARCHIVE-SCOPE.json.

## Phase implementation

- `apps/ai_agent/evaluation/R2-ARCHIVE-SCOPE.json`
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
- `apps/ai_agent/evaluation/r2/queries.json`
- `apps/ai_agent/evaluation/r2/results/diagnosis-progress.json`
- `apps/ai_agent/evaluation/r2/results/inputs.json`
- `apps/ai_agent/evaluation/r2/results/report.json`
- `apps/ai_agent/evaluation/r2/results/scores.json`
- `apps/ai_agent/evaluation/r21/config.json`
- `apps/ai_agent/evaluation/r21/queries.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/config.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.json`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json`
- `apps/ai_agent/evaluation/r22/config.json`
- `apps/ai_agent/evaluation/r22/investigation.json`
- `apps/ai_agent/evaluation/r22/manifest.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/config.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/dataset.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/inference-inputs.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/report.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/scores.json`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/sensitivity.json`
- `apps/ai_agent/evaluation/r22/sensitivity.ts`
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
- `apps/ai_agent/evaluation/r25/corpus-only.json`
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
- `apps/ai_agent/evaluation/retrieval-integration/runs/dev-v2/report.json`
- `apps/ai_agent/evaluation/retrieval-integration/runs/dev-v2/verification.json`
- `apps/ai_agent/evaluation/retrieval-integration/verify-dev.mjs`
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
- `apps/ai_agent/src/graph.ts`
- `apps/ai_agent/src/index.ts`
- `apps/ai_agent/src/runner.ts`
- `apps/ai_agent/src/tools/minilm-process.mjs`
- `apps/ai_agent/src/tools/runbook-retriever.ts`
- `apps/ai_agent/src/tools/search-runbooks.ts`
- `apps/ai_agent/tests/diagnosis-graph.test.ts`
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
- `apps/ai_agent/tests/runbook-retriever.test.ts`
- `bun.lock`

## Learning comments

None added for this archive. Existing implementation comments are preserved.

## Documentation

- `apps/ai_agent/evaluation/R2-ARCHIVE.md`
- `apps/ai_agent/evaluation/downstream-noise/HANDOFF.md`
- `apps/ai_agent/evaluation/downstream-noise/README.md`
- `apps/ai_agent/evaluation/intent-dev/README.md`
- `apps/ai_agent/evaluation/r2/README.md`
- `apps/ai_agent/evaluation/r2/handoff.md`
- `apps/ai_agent/evaluation/r2/results/report.md`
- `apps/ai_agent/evaluation/r2/runbooks/dlq-publication.md`
- `apps/ai_agent/evaluation/r2/runbooks/email-rejection.md`
- `apps/ai_agent/evaluation/r2/runbooks/email-uncertain.md`
- `apps/ai_agent/evaluation/r2/runbooks/ordering-gap.md`
- `apps/ai_agent/evaluation/r2/runbooks/telegram-cooldown.md`
- `apps/ai_agent/evaluation/r2/runbooks/telegram-destination.md`
- `apps/ai_agent/evaluation/r21/README.md`
- `apps/ai_agent/evaluation/r21/runs/r21-v1-local/report.md`
- `apps/ai_agent/evaluation/r22/README.md`
- `apps/ai_agent/evaluation/r22/handoff.md`
- `apps/ai_agent/evaluation/r22/runs/r22-v1-local/report.md`
- `apps/ai_agent/evaluation/r23/README.md`
- `apps/ai_agent/evaluation/r23/runs/r23-v1-local/report.md`
- `apps/ai_agent/evaluation/r24/README.md`
- `apps/ai_agent/evaluation/r24/comparison.md`
- `apps/ai_agent/evaluation/r24/handoff.md`
- `apps/ai_agent/evaluation/r24/runs/r24-v1-local/report.md`
- `apps/ai_agent/evaluation/r25/HANDOFF.md`
- `apps/ai_agent/evaluation/r25/README.md`
- `apps/ai_agent/evaluation/r25/RECOVERY-HANDOFF.md`
- `apps/ai_agent/evaluation/r25/RECOVERY.md`
- `apps/ai_agent/evaluation/retrieval-integration/HANDOFF.md`
- `apps/ai_agent/evaluation/retrieval-integration/README.md`
- `docs/ai-dlq-master-plan.md`

## Excluded or uncertain

Protected fresh scenario inputs, labels and their captures stay local and untracked under the earlier no-access/no-leak instruction. Their contents were not opened or scanned. Old reused held-out experiment artifacts are included. Prisma generation, Graphify outputs, semantic-judge calibration and rtk output files are unrelated and excluded. Partial and superseded R2 runs are intentionally included for study, not treated as current accepted results.

- `apps/ai_agent/evaluation/r25/fresh-label-rationales-v1.json`
- `apps/ai_agent/evaluation/r25/fresh-scenarios-author-v1.json`
- `apps/ai_agent/evaluation/r25/fresh-scenarios-v1.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/dataset.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/freeze.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/scores.json`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.json`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.md`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.votes.json`
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

## Exact scope and Git integration

R2-ARCHIVE-SCOPE.json lists every selected path and its byte hash. The ignored .tmp-turbo-user/r2-archive-paths.nul contains the exact NUL-delimited file list, without directory staging or globs. Equivalent scoped command:

```powershell
git add --pathspec-from-file=.tmp-turbo-user/r2-archive-paths.nul --pathspec-file-nul
```

Suggested commit subject: `test(ai-agent): archive R2 retrieval experiments and MiniLM candidate`.

Graphify required: no for this archive; no architectural work or graph regeneration was performed. Stop after the local commit. Further implementation is deferred until the user requests it after study; no automatic follow-up or experiment is scheduled. Next implementation effort, if requested: Sol, medium reasoning.
