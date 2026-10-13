# Agentic experiment manual handoff

Implemented an isolated offline comparison using the existing production graph and Gemini adapter. No production wiring, dependency, runbook, diagnosis prompt or replay-policy change. Fresh held-out file contents were never opened. No staging, commit, push, branch change or merge was performed.

## Phase implementation

- `apps/ai_agent/src/evaluation/retrieval-agentic.ts`
- `apps/ai_agent/src/evaluation/agentic-experiment.ts`
- `apps/ai_agent/tests/retrieval-agentic.test.ts`
- `apps/ai_agent/tests/agentic-experiment.test.ts`
- `apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/freeze.json`
- `apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/manifest.json`
- `apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/report.json`
- `apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/report.md`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/freeze.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/manifest.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/report.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/report.md`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/freeze.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/manifest.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/report.json`
- `apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/report.md`

## Learning comments

None. The new source contains implementation explanations of trust boundaries, bounded selection and deadline handling; no separate learning-comment changes were requested or added.

## Documentation

- `apps/ai_agent/evaluation/agentic/README.md`
- `apps/ai_agent/evaluation/agentic/HANDOFF.md`
- `apps/ai_agent/evaluation/agentic/LIVE-RESULTS.md`

These are explicitly scoped experiment artifacts. No routine `docs/` maintenance or Antigravity work is required to complete this task.

## Excluded or uncertain

All paths below were already dirty/untracked at the start. They remain excluded. Fresh held-out entries were identified by Git status only; their contents were not read. Working-tree status and tracked diff scope were checked again after verification. No unrelated path was edited by this implementation.

- `graphify-out/.vocab.txt`
- `graphify-out/cache/last_query_stamp`
- `graphify-out/cache/semantic/pa567fc138e3a/42b6bf915e3861637d640aedc363be01f9372def65db989bfc60112b2f241977.json` (pre-existing deletion)
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
- `apps/ai_agent/evaluation/multi-query/README.md`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/manifest.json`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/report.json`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/report.md`
- `apps/ai_agent/src/evaluation/retrieval-multi-query.ts`
- `apps/ai_agent/tests/retrieval-multi-query.test.ts`
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

Ignored local test outputs under `.tmp-turbo-user/` are excluded. The earlier pre-deadline stub artifact was moved intact to `.tmp-turbo-user/agentic-predeadline-v1`; the final checked-in run is `stub-dev-v2`. Never stage an earlier run accidentally.

## Verification and findings

- Final focused/regression pass: **62 passed, 0 failed** across the two new test files plus `search-runbooks.test.ts`, `retrieval-experiment.test.ts`, `evaluation-report.test.ts`, and `model-experiment.test.ts`.
- `bun run check-types`: passed. Root Turbo covers declared scripts; the AI-agent compiler ran successfully. A direct AI-agent `tsc --noEmit` also passed during development.
- `bun run build`: passed. Frontend build was cached and replayed existing baseline-browser, SWC and Yarn/Corepack warnings; agent type build ran. No frontend modifications.
- `bun run lint`: failed with the documented unchanged frontend baseline, **9 errors and 22 warnings**. This is not a clean lint result. No AI-agent lint script is declared.
- Final checked-in default stub run: succeeded; both paired reports and section metrics reproduced with `--replay`, without model calls.
- Prettier check passed for all new source, tests and experiment documentation. A whole-tree `git diff --check` exited 1 while emitting LF/CRLF warnings for pre-existing generated Prisma edits; it is not reported as passing.
- Deadline rejection coverage exposed a timer-ordering race; the shared model budget now checks an absolute deadline immediately before invocation. The regression passes, including a model that ignores abort signals.
- Windows Bun dependency resolution required running focused checks outside the sandbox. No dependencies were installed and all models/providers in tests were stubbed.

Stub section recall/precision are unchanged at 66.67%/22.22%. No-match abstention regresses from 1/4 to 0/4 (`intent-no-match-4`). Coarse family coverage is 16/16, diagnosis acceptance is 2/16, reference grounding checks are 16/16, and evaluated safety violations are zero for both variants. B doubles paired model invocations, 16 to 32. There are 76 total stub generations including section probes, zero provider requests and $0 external spend. These synthetic outputs cannot establish real diagnosis quality, token usage, paid cost or live latency. Existing development inputs have already been inspected. No production adoption is justified by this run.

The user subsequently authorized live testing. The first attempt is preserved with explicit provider failures; its B quality score is incomplete. The paced second attempt completed all 76 generations and passed offline replay. All 44 planners chose current context, with zero searches or fallbacks; retrieval metrics were unchanged. Paired token usage increased from 55,897 to 82,804 (+48.1%), and paired calls doubled. Acceptance was 15/16 versus 16/16 with identical contexts, so the difference cannot demonstrate retrieval improvement. Total measured tokens were 184,553; dollar cost and independent semantic diagnosis quality are unmeasured. See `LIVE-RESULTS.md`. Safe HTTP diagnostics and shared generation pacing are covered by two additional offline regression tests. No more live calls are planned.

## Manual Git command

From the repository root, stage only these exact paths:

```powershell
rtk git add -- apps/ai_agent/src/evaluation/retrieval-agentic.ts apps/ai_agent/src/evaluation/agentic-experiment.ts apps/ai_agent/tests/retrieval-agentic.test.ts apps/ai_agent/tests/agentic-experiment.test.ts apps/ai_agent/evaluation/agentic/README.md apps/ai_agent/evaluation/agentic/HANDOFF.md apps/ai_agent/evaluation/agentic/LIVE-RESULTS.md apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/freeze.json apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/manifest.json apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/report.json apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/report.md apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/freeze.json apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/manifest.json apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/report.json apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/report.md apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/freeze.json apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/manifest.json apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/report.json apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/report.md
```

Suggested commit subject: `feat(ai-agent): add offline bounded agentic RAG experiment`

Graphify required: no. There is no production architectural change or major subsystem milestone. Stop after this handoff; the user owns Git integration. Any separately requested next implementation phase should use Sol at medium reasoning. No additional phase or live run was started after completing the authorized experiment.
