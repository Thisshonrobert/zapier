# Manual handoff — development retrieval investigation

No staging, commit, push, branch switch, pull or Graphify update was performed. Read README.md for findings and the exact live proposal. Paid execution and semantic diagnosis validation remain pending approval.

## Verification

- Focused suite: **42 passed, 0 failed**, 374 assertions across seven retrieval/evaluation files. The initial two failing reproductions were observed before interventions.
- Required root `bun run check-types`: passed (declared ai_agent and shared UI tasks).
- Required root `bun run build`: passed; frontend build was cached, ai_agent TypeScript validation executed. Existing Turbo warning: ai_agent build emits no configured output files.
- Required root `bun run lint`: failed with **9 errors and 22 warnings in unchanged frontend files**, matching the documented baseline totals. No lint script is declared by ai_agent; this is not a claim that all new files passed ESLint. Full current diagnostics: `.tmp-turbo-user/retrieval-investigation-lint.log`. Exact historical per-diagnostic equality was not independently available, so no stronger baseline-equivalence claim is made.
- Bun commands required sandbox escalation because of runtime directory access errors. Full test/type/build logs are in `.tmp-turbo-user/retrieval-investigation-{tests,types,build}.log`.
- Final offline parity passed for 28 direct questions, 28 projected questions and 16 incident contexts, with frozen input/source hashes and unchanged corpus checked. The 32 stub oracle diagnoses verify plumbing only.

## Phase implementation

- `apps/ai_agent/src/evaluation/retrieval-investigation.ts`
- `apps/ai_agent/src/evaluation/investigate-retrieval.ts`
- `apps/ai_agent/src/evaluation/oracle-diagnosis.ts`
- `apps/ai_agent/tests/retrieval-investigation.test.ts`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/report.md`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/manifest.json`

The source comments explain experiment constraints and are part of implementation; no separate learning comments were added. offline-v4 is the final artifact snapshot.

## Learning comments

None.

## Documentation

- `apps/ai_agent/evaluation/retrieval-investigation/README.md`
- `apps/ai_agent/evaluation/retrieval-investigation/HANDOFF.md`

## Excluded or uncertain

The following exact paths were dirty or untracked at handoff and are excluded. Most predated this task. New offline-v1/v2/v3 artifacts are intermediate snapshots retained unchanged. Generated Prisma, Graphify, fresh evaluation and unrelated semantic-judge files were not opened for content or modified; original untracked experiment sources/tests and artifacts remain outside this task's staging scope. Git status names were inspected to preserve the dirty tree. This inventory does not approve any of these files for inclusion.

- `graphify-out/.vocab.txt`
- `graphify-out/cache/last_query_stamp`
- `graphify-out/cache/semantic/pa567fc138e3a/42b6bf915e3861637d640aedc363be01f9372def65db989bfc60112b2f241977.json`
- `packages/db/generated/prisma/browser.ts`
- `packages/db/generated/prisma/client.ts`
- `packages/db/generated/prisma/commonInputTypes.ts`
- `packages/db/generated/prisma/internal/class.ts`
- `packages/db/generated/prisma/internal/prismaNamespace.ts`
- `packages/db/generated/prisma/internal/prismaNamespaceBrowser.ts`
- `packages/db/generated/prisma/models.ts`
- `packages/db/generated/prisma/models/User.ts`
- `packages/db/generated/prisma/models/Zap.ts`
- `packages/db/generated/prisma/models/ZapRun.ts`
- `packages/db/generated/prisma/models/ZapRunExecution.ts`
- `packages/db/generated/prisma/models/ZapRunRetry.ts`
- `apps/ai_agent/evaluation/agentic/HANDOFF.md`
- `apps/ai_agent/evaluation/agentic/LIVE-RESULTS.md`
- `apps/ai_agent/evaluation/agentic/README.md`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/freeze.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/manifest.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/report.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/report.md`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/freeze.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/manifest.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/report.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/report.md`
- `apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/freeze.json`
- `apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/manifest.json`
- `apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/report.json`
- `apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/report.md`
- `apps/ai_agent/evaluation/multi-query/README.md`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/manifest.json`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/report.json`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/report.md`
- `apps/ai_agent/evaluation/r25/fresh-label-rationales-v1.json`
- `apps/ai_agent/evaluation/r25/fresh-scenarios-author-v1.json`
- `apps/ai_agent/evaluation/r25/fresh-scenarios-v1.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/dataset.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/freeze.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/inference-inputs.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/report.json`
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/scores.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v1/manifest.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v1/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v2/manifest.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v2/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/manifest.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/report.md`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.json`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.md`
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.votes.json`
- `apps/ai_agent/src/evaluation/agentic-experiment.ts`
- `apps/ai_agent/src/evaluation/retrieval-agentic.ts`
- `apps/ai_agent/src/evaluation/retrieval-multi-query.ts`
- `apps/ai_agent/tests/agentic-experiment.test.ts`
- `apps/ai_agent/tests/retrieval-agentic.test.ts`
- `apps/ai_agent/tests/retrieval-multi-query.test.ts`
- `graphify-out/2026-09-30/.graphify_analysis.json`
- `graphify-out/2026-09-30/.graphify_labels.json`
- `graphify-out/2026-09-30/GRAPH_REPORT.md`
- `graphify-out/2026-09-30/cost.json`
- `graphify-out/2026-09-30/graph.json`
- `graphify-out/2026-09-30/manifest.json`
- `graphify-out/memory/query_20260923_064129_82e4530f_start_phase_3c_durable_dlq_publication_and_reconci.md`
- `graphify-out/memory/query_20260927_180846_f1f93e82_oh_but_my_idea_for_this_prj_dlq_system_was_like_in.md`
- `packages/db/generated/prisma/models/ReplayExecution.ts`
- `packages/db/generated/prisma/models/ReplayExecutionAttempt.ts`
- `packages/db/generated/prisma/models/ReplayFailure.ts`
- `packages/db/generated/prisma/models/ReplayRequest.ts`
- `packages/db/generated/prisma/models/TriageAccessAudit.ts`
- `packages/db/generated/prisma/models/TriageApproval.ts`
- `packages/db/generated/prisma/models/TriageDecisionNotification.ts`
- `packages/db/generated/prisma/models/TriageProposal.ts`
- `rtk/history.db`

## Exact manual staging command

Run only when ready to integrate this offline work; the paid experiment is still pending approval. Existing untracked experiment modules imported by these changes are dependencies of this patch and must be integrated through their own reviewed scope first or together through a separately reviewed bundle. This command deliberately does not silently stage those pre-existing files.

```powershell
git add -- "apps/ai_agent/src/evaluation/retrieval-investigation.ts" "apps/ai_agent/src/evaluation/investigate-retrieval.ts" "apps/ai_agent/src/evaluation/oracle-diagnosis.ts" "apps/ai_agent/tests/retrieval-investigation.test.ts" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/report.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/report.md" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/manifest.json" "apps/ai_agent/evaluation/retrieval-investigation/README.md" "apps/ai_agent/evaluation/retrieval-investigation/HANDOFF.md"
```

Suggested commit subject: `Investigate development retrieval failures and add bounded oracle comparison`.

Graphify required: no. No production architecture changed. Stop after this handoff. Suggested model for the separately approved live comparison: Sol, medium effort, single agent.
