# R2.5 recovery manual handoff

Recommendation: retain production retrieval. This bounded run completed its stopping policy but did not complete the 96-question comparison. The original continuation guard, historical captures, MiniLM method freeze and unrelated dirty files are preserved. No staging, commits, pushes, branch changes or Graphify regeneration occurred.

## Evidence and unfinished work

- 39/96 questions successful: all 36 answerable development questions and three development no-match questions. Gemini audited answerable development recall: 83.33%; MiniLM: 99.07%, on identical candidates/questions. This is a 15.74 percentage point regression.
- Both historical failures recovered; one new question succeeded. The next question failed HTTP 503 twice. The explicit one-retry cap stopped recovery. One unresolved question and 56 unattempted questions remain; all 48 held-out questions are unattempted. These are unavailable outcomes, never abstentions.
- Five new generation requests, ten new HTTP requests; cumulative upper bounds: 43 generation attempts, 86 HTTP requests. No quota error was observed, and no further calls followed the stop.
- Successful tokens: 191,818 total, 15,163 new. Prompt tokens: 190,542; output tokens: 1,276. Thought-token field, failed usage and billing/cost are unknown. New conservative reservation: 100,000 tokens. Recovery wall time: 182,672 ms.
- Successful latency across combined captures: mean 3,831 ms, p95 15,288 ms; this excludes pacing and failed attempts, which are captured separately.
- Three available no-match cases abstained; nine development no-match cases are unavailable. Complete no-match and held-out quality remain unknown. Benchmark output availability is 40.625%; this includes unattempted questions and is not a provider uptime estimate.
- The new method-promotion gate is not met. No method was promoted, no fresh scenarios were generated and no new semantic downstream evaluation was performed. Existing fresh labels were not read/tuned against. Earlier downstream evidence covers contracts and safety only.

## Verification

- Scoped R2.5 suite: 12 tests passed / 55 assertions, including recovery transient retry, historical retry cap, quota stop, pacing, attempt/token/deadline limits, invalid output and empty selection.
- Recovery preview checked frozen source/continuation hashes, both progress journals, both failures, prior partial report and identical MiniLM/Gemini eligible candidates before live calls.
- Offline recovery replay reproduced provenance, journals, request accounting and metrics. Zero API calls.
- Existing MiniLM freeze read-only verification passed.
- Direct ai_agent TypeScript check and root check-types: exit 0. Root build: exit 0, with cached frontend package-manager warnings and no configured ai_agent build output.
- Root lint: exit 1 with 9 errors / 22 warnings in unchanged frontend files, matching the previously documented counts. Root lint does not lint these evaluation modules. This is not a passing lint claim.
- Root `git diff --check`: exit 1 for pre-existing trailing whitespace in generated Prisma browser/client/namespace files. Those files were not changed by recovery and remain excluded.
- A 184-file snapshot showed zero changed files before the intentional README update. Final snapshot verification permits only that README edit. All pre-existing captures and unrelated dirty files remained unchanged.

## Phase implementation

- `apps/ai_agent/src/evaluation/r25-recover.ts`
- `apps/ai_agent/tests/r25-recovery.test.ts`
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

These are the exact additions from this continuation. Earlier R2–R2.5 sources/artifacts and MiniLM dependency edits remain prerequisites requiring their prior handoffs; this command does not silently stage them.

## Learning comments

None added.

## Documentation

- `apps/ai_agent/evaluation/r25/RECOVERY.md`
- `apps/ai_agent/evaluation/r25/RECOVERY-HANDOFF.md`
- `apps/ai_agent/evaluation/r25/README.md`

## Excluded or uncertain

Every other current dirty path is listed below. Prior R2–R2.5 work belongs to earlier handoffs. Recovery preview-v1 is superseded by verified preview-v2 and is preserved but excluded. Prisma, Graphify, semantic-judge artifacts and the pre-existing rtk directory are unrelated. Ignored local ledgers/scripts are not staged.

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
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/failure.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/manifest.json`
- `apps/ai_agent/evaluation/r25/runs/reasoning-v1/progress.jsonl`
- `apps/ai_agent/evaluation/r25/section-descriptions-v1.json`
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
- `apps/ai_agent/src/evaluation/retrieval-r2.ts`
- `apps/ai_agent/src/evaluation/retrieval-r21.ts`
- `apps/ai_agent/src/evaluation/retrieval-r22.ts`
- `apps/ai_agent/src/evaluation/retrieval-r23.ts`
- `apps/ai_agent/src/evaluation/retrieval-r24.ts`
- `apps/ai_agent/src/evaluation/retrieval-r25.ts`
- `apps/ai_agent/src/evaluation/run-r2.ts`
- `apps/ai_agent/src/tools/search-runbooks.ts`
- `apps/ai_agent/tests/r25-descriptions.test.ts`
- `apps/ai_agent/tests/r25-freeze.test.ts`
- `apps/ai_agent/tests/retrieval-r2.test.ts`
- `apps/ai_agent/tests/retrieval-r21.test.ts`
- `apps/ai_agent/tests/retrieval-r22.test.ts`
- `apps/ai_agent/tests/retrieval-r23.test.ts`
- `apps/ai_agent/tests/retrieval-r24.test.ts`
- `apps/ai_agent/tests/retrieval-r25.test.ts`
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

## Exact manual staging command

```powershell
git add -- "apps/ai_agent/src/evaluation/r25-recover.ts" "apps/ai_agent/tests/r25-recovery.test.ts" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-preview-v2/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-preview-v2/manifest.json" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/assessment.json" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/attempts.jsonl" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/http.jsonl" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/inference-inputs.json" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/manifest.json" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/progress.jsonl" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/recommendation.json" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/report.json" "apps/ai_agent/evaluation/r25/runs/reasoning-recovery-v1/selections.json" "apps/ai_agent/evaluation/r25/RECOVERY.md" "apps/ai_agent/evaluation/r25/RECOVERY-HANDOFF.md" "apps/ai_agent/evaluation/r25/README.md"
```

Suggested commit subject: `eval(ai-agent): bound Gemini recovery and record incomplete comparison`.

Graphify required: no. Next implementation model/effort, if a separately scoped recovery is requested: Sol, medium. Inspect this run first; do not restart or extend this exhausted policy automatically. The immediate recommendation is to stop provider calls and retain production retrieval.
