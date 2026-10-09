# R2 phase-bundle handoff

Optional R2 was separately authorized and completed on 2026-10-07. No production retrieval adoption, replay eligibility, Git integration or Graphify regeneration was performed.

## Results

12 runbooks / 60 sections / 40 labelled queries. Held-out Recall@3: keyword 18.75%, BM25 31.25%, semantic 56.25%, hybrid 53.125%, reranked hybrid 0%. Semantic and reranked hybrid excluded all four held-out no-match queries; other variants excluded none. None meets the 90% retrieval target. All five variants passed reference-grounding and routing safety checks on four synthetic downstream fixtures, including two actual abstentions each. Live model: gemini-3.5-flash-lite; 20 diagnosis generations / 40 successful HTTP requests; 70188 measured tokens. Monetary cost is unmeasured.

Verification: 34 focused tests passed, one existing PostgreSQL integration test skipped. Repository check-types and build passed. Root lint retained 9 errors /22 warnings in unchanged frontend sources, matching the documented baseline. One focused independent review found a reporting label error; it was corrected and frozen captures were rescored without additional provider calls. Replay/hash checks passed. Full logs and review are ignored under .tmp-turbo-user.

## Phase implementation

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
- `apps/ai_agent/package.json`
- `apps/ai_agent/src/evaluation/r2-models.mjs`
- `apps/ai_agent/src/evaluation/retrieval-r2.ts`
- `apps/ai_agent/src/evaluation/run-r2.ts`
- `apps/ai_agent/src/tools/search-runbooks.ts`
- `apps/ai_agent/tests/retrieval-r2.test.ts`
- `bun.lock`

Technical safety/provenance comments are part of implementation; no separate learning comments were added.

## Learning comments

None.

## Documentation

- `apps/ai_agent/evaluation/r2/README.md`
- `apps/ai_agent/evaluation/r2/handoff.md`

## Excluded or uncertain

These paths were present before this request and remain outside the R2 bundle:

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
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.json` (??)
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.md` (??)
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.votes.json` (??)
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

Pre-existing untracked directories above are wholly excluded. Ignored .tmp-turbo-user logs, model downloads, fixture generator and review report are also excluded. No generated Prisma, Graphify cache, query memory, earlier semantic-judge calibration or unrelated rtk directory belongs in this phase bundle.

## Manual Git handoff

Run only this exact scoped staging command after reviewing the files:

```powershell
rtk git add -- "apps/ai_agent/evaluation/r2/README.md" "apps/ai_agent/evaluation/r2/handoff.md" "apps/ai_agent/evaluation/r2/queries.json" "apps/ai_agent/evaluation/r2/results/diagnosis-progress.json" "apps/ai_agent/evaluation/r2/results/inputs.json" "apps/ai_agent/evaluation/r2/results/report.json" "apps/ai_agent/evaluation/r2/results/report.md" "apps/ai_agent/evaluation/r2/results/scores.json" "apps/ai_agent/evaluation/r2/runbooks/dlq-publication.md" "apps/ai_agent/evaluation/r2/runbooks/email-rejection.md" "apps/ai_agent/evaluation/r2/runbooks/email-uncertain.md" "apps/ai_agent/evaluation/r2/runbooks/ordering-gap.md" "apps/ai_agent/evaluation/r2/runbooks/telegram-cooldown.md" "apps/ai_agent/evaluation/r2/runbooks/telegram-destination.md" "apps/ai_agent/package.json" "apps/ai_agent/src/evaluation/r2-models.mjs" "apps/ai_agent/src/evaluation/retrieval-r2.ts" "apps/ai_agent/src/evaluation/run-r2.ts" "apps/ai_agent/src/tools/search-runbooks.ts" "apps/ai_agent/tests/retrieval-r2.test.ts" "bun.lock"
```

Suggested commit subject: `feat(ai-agent): complete isolated R2 retrieval comparison`. The user stages, commits, pushes and merges; there is no R2 manualPullRequest manifest authorizing automatic integration.

**Graphify required: yes**, as a completed implementation milestone. Regenerate only after the phase bundle is merged and the user explicitly confirms a clean, updated main branch (or a clean worktree based on it). Keep the Graphify commit separate.

## Documentation/ops handoff

For Antigravity: update the master-plan R2 status and relevant documentation to record the measured experiment, failed 90% retrieval target, no production adoption and four-case downstream pilot limitation. Preserve the independently deferred Phase 14B, Phase 15, replay readiness and existing production retriever. Handle Graphify only under the milestone policy after merge confirmation.

Next separately authorized implementation: use Sol at medium reasoning. Phase 15 remains deferred; no next phase is started automatically.
