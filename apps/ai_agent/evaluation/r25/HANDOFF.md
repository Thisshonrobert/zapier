# R2.5 manual handoff

See README.md for findings and limitations. Production code and configuration were not changed by R2.5. Gemini comparison and fresh semantic downstream evaluation remain incomplete; this is a diagnostic experiment bundle.

## Verification

- R2.5 scoped tests: 7 passed, 34 assertions.
- Downstream diagnosis checks/graph and search regression: 27 passed, 95 assertions; one PostgreSQL integration test skipped.
- Root check-types and direct ai_agent TypeScript check: exit 0.
- Root build: exit 0; cached frontend logs include pre-existing lockfile/package-manager warnings and ai_agent has no configured build output.
- Root lint: exit 1, existing 9 errors/22 warnings in unchanged frontend files. No new lint claim is made for experiment modules (root lint does not include an ai_agent lint task).
- Exhaustive-v2, descriptions-v1 and fresh-v1 saved scores passed strict offline replay. Read-only freeze consistency check passed after adding capture/source/config rejection checks. Four downstream recorded-output contract/safety cases passed; no new semantic-model measurement.
- Separate blind review completed. Final code review found one P2 freeze-provenance gap, fixed and covered by a regression test. No critical findings.

## Phase implementation

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
- `apps/ai_agent/evaluation/r25/runs/reasoning-partial-report-v3/report.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-preview-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-preview-v1/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/failure.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/progress.jsonl`
- `apps/ai_agent/evaluation/r25/section-descriptions-v1.json`
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
- `apps/ai_agent/src/evaluation/retrieval-r25.ts`
- `apps/ai_agent/tests/r25-descriptions.test.ts`
- `apps/ai_agent/tests/r25-freeze.test.ts`
- `apps/ai_agent/tests/retrieval-r25.test.ts`

## Learning comments

None added.

## Documentation

- `apps/ai_agent/evaluation/r25/HANDOFF.md`
- `apps/ai_agent/evaluation/r25/README.md`

These are scoped evaluation artifacts, not changes to general repository documentation.

## Excluded or uncertain

The following exact dirty paths are outside this staging proposal. Prior R2–R2.4 experiment files and the pre-existing MiniLM dependency changes are prerequisites; their separate bundle must be resolved before R2.5 integration. Earlier provisional R2.5 captures are preserved but excluded. Prisma, Graphify and semantic-judge files are unrelated. graphify-out/.vocab.txt became dirty during the session without an intentional R2.5 edit; preserve and inspect separately. The full tracked diff was inspected/saved in the ignored local ledger; no tracked changes belong to this R2.5 bundle.

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
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/audit.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/dataset-audited.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/dataset-original.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/exhaustive-v1/scores.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-partial-report-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-partial-report-v2/report.json`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.json`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.md`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.votes.json`
- `apps/ai_agent/package.json`
- `apps/ai_agent/src/evaluation/r2-models.mjs`
- `apps/ai_agent/src/evaluation/r21-models.mjs`
- `apps/ai_agent/src/evaluation/r22-candidates.ts`
- `apps/ai_agent/src/evaluation/r22-models.mjs`
- `apps/ai_agent/src/evaluation/r23-analysis.ts`
- `apps/ai_agent/src/evaluation/r23-models.mjs`
- `apps/ai_agent/src/evaluation/r24-analysis.ts`
- `apps/ai_agent/src/evaluation/r24-models.mjs`
- `apps/ai_agent/src/evaluation/retrieval-r2.ts`
- `apps/ai_agent/src/evaluation/retrieval-r21.ts`
- `apps/ai_agent/src/evaluation/retrieval-r22.ts`
- `apps/ai_agent/src/evaluation/retrieval-r23.ts`
- `apps/ai_agent/src/evaluation/retrieval-r24.ts`
- `apps/ai_agent/src/evaluation/run-r2.ts`
- `apps/ai_agent/src/tools/search-runbooks.ts`
- `apps/ai_agent/tests/retrieval-r2.test.ts`
- `apps/ai_agent/tests/retrieval-r21.test.ts`
- `apps/ai_agent/tests/retrieval-r22.test.ts`
- `apps/ai_agent/tests/retrieval-r23.test.ts`
- `apps/ai_agent/tests/retrieval-r24.test.ts`
- `bun.lock`
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

## Exact proposed staging command

Run only after resolving the prerequisite prior experiment bundle. This lists files individually and excludes unrelated changes. No staging, commit, push, branch switch or merge has been performed.

```powershell
rtk proxy git add -- "apps/ai_agent/evaluation/r25/HANDOFF.md" "apps/ai_agent/evaluation/r25/README.md" "apps/ai_agent/evaluation/r25/corpus-only.json" "apps/ai_agent/evaluation/r25/fresh-label-rationales-v1.json" "apps/ai_agent/evaluation/r25/fresh-scenarios-author-v1.json" "apps/ai_agent/evaluation/r25/fresh-scenarios-v1.json" "apps/ai_agent/evaluation/r25/method-freeze.json" "apps/ai_agent/evaluation/r25/method-selection.json" "apps/ai_agent/evaluation/r25/runs/audit-v1/audit-independent.json" "apps/ai_agent/evaluation/r25/runs/audit-v1/audit-key.json" "apps/ai_agent/evaluation/r25/runs/audit-v1/audit-packet.json" "apps/ai_agent/evaluation/r25/runs/audit-v1/audit-template.json" "apps/ai_agent/evaluation/r25/runs/audit-v1/baseline-freeze.json" "apps/ai_agent/evaluation/r25/runs/audit-v1/corrections.json" "apps/ai_agent/evaluation/r25/runs/descriptions-v1/descriptions.json" "apps/ai_agent/evaluation/r25/runs/descriptions-v1/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/descriptions-v1/report.json" "apps/ai_agent/evaluation/r25/runs/descriptions-v1/scores.json" "apps/ai_agent/evaluation/r25/runs/downstream-contract-v1/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/downstream-contract-v1/report.json" "apps/ai_agent/evaluation/r25/runs/downstream-contract-v1/scores.json" "apps/ai_agent/evaluation/r25/runs/exhaustive-v2/audit.json" "apps/ai_agent/evaluation/r25/runs/exhaustive-v2/dataset-audited.json" "apps/ai_agent/evaluation/r25/runs/exhaustive-v2/dataset-original.json" "apps/ai_agent/evaluation/r25/runs/exhaustive-v2/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/exhaustive-v2/report.json" "apps/ai_agent/evaluation/r25/runs/exhaustive-v2/scores.json" "apps/ai_agent/evaluation/r25/runs/fresh-v1/dataset.json" "apps/ai_agent/evaluation/r25/runs/fresh-v1/freeze.json" "apps/ai_agent/evaluation/r25/runs/fresh-v1/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/fresh-v1/report.json" "apps/ai_agent/evaluation/r25/runs/fresh-v1/scores.json" "apps/ai_agent/evaluation/r25/runs/reasoning-continuation-v1/failure.json" "apps/ai_agent/evaluation/r25/runs/reasoning-continuation-v1/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/reasoning-continuation-v1/manifest.json" "apps/ai_agent/evaluation/r25/runs/reasoning-continuation-v1/progress.jsonl" "apps/ai_agent/evaluation/r25/runs/reasoning-partial-report-v3/report.json" "apps/ai_agent/evaluation/r25/runs/reasoning-preview-v1/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/reasoning-preview-v1/manifest.json" "apps/ai_agent/evaluation/r25/runs/reasoning-v1/failure.json" "apps/ai_agent/evaluation/r25/runs/reasoning-v1/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/reasoning-v1/manifest.json" "apps/ai_agent/evaluation/r25/runs/reasoning-v1/progress.jsonl" "apps/ai_agent/evaluation/r25/section-descriptions-v1.json" "apps/ai_agent/src/evaluation/r25-analysis.ts" "apps/ai_agent/src/evaluation/r25-continue.ts" "apps/ai_agent/src/evaluation/r25-descriptions.ts" "apps/ai_agent/src/evaluation/r25-downstream.ts" "apps/ai_agent/src/evaluation/r25-freeze.ts" "apps/ai_agent/src/evaluation/r25-fresh.ts" "apps/ai_agent/src/evaluation/r25-gemini.ts" "apps/ai_agent/src/evaluation/r25-models.mjs" "apps/ai_agent/src/evaluation/r25-partial.ts" "apps/ai_agent/src/evaluation/r25-reasoning-replay.ts" "apps/ai_agent/src/evaluation/r25-reasoning.ts" "apps/ai_agent/src/evaluation/retrieval-r25.ts" "apps/ai_agent/tests/r25-descriptions.test.ts" "apps/ai_agent/tests/r25-freeze.test.ts" "apps/ai_agent/tests/retrieval-r25.test.ts"
```

Suggested commit subject: `eval(ai-agent): audit and freeze R2.5 retrieval diagnostics`.

Graphify required: no. Next bounded implementation model/effort: Sol, medium. Complete the reasoning comparison under an explicit free-tier quota policy and validate fresh semantic diagnosis before any adoption decision; do not retune the frozen method against fresh labels.
