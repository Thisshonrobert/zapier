# Phase 11A manual handoff after experiment v3

## Gemini 3.5 Flash-Lite / v4 follow-up (2026-10-03)

The user explicitly changed the model and requested a check. A one-case smoke passed,
then one full development capture completed without provider errors. The v4 baseline
accounts for all 18 cases, both controls zero-call, 20 calls/four repairs, 57,755 tokens
and unknown dollar cost. Valid diagnoses are 13/16; accepted diagnoses 8/16 (50%);
retrieval 16/16; evaluated final-result safety violations zero; 30/30 probes. Three
invalid final diagnoses leave capture incomplete and the gate FAIL. No pass is claimed.

### Phase implementation

New sanitized v4 capture and comparison artifacts:

- `apps/ai_agent/evaluation/phase-11a-baseline-v4/cases.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/contexts.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/corpus.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/invocations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/manifest.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/observations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/report.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/report.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/comparison-v3-v4.json`

No implementation or test source was changed in this follow-up. The successful smoke
is kept separately in ignored local experiments and is not spliced into v4.

### Learning comments

No comment-only changes or new learning comments.

### Documentation

- `apps/ai_agent/evaluation/phase-11a-baseline-v4/README.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v4/comparison-v3-v4.md`
- `apps/ai_agent/evaluation/phase-11a-generation-access.md`
- `apps/ai_agent/evaluation/phase-11a-reproduction.md`
- `apps/ai_agent/evaluation/phase-11a-handoff.md`

### Excluded or uncertain

All pre-existing unrelated paths listed below remain excluded. Environment files,
local captures/journals and ignored source/audit support remain excluded. A matching
13-file source snapshot was preserved under `.tmp-turbo-user/phase11a-35-initial-source/`.
No Git integration or Graphify refresh was performed.

### Verification and required scope decision

- The v4 eight capture/report copies were byte-identical to the local capture. All 13
  manifest source hashes matched both current source and the preserved snapshot.
- Offline v4 evaluation reproduced exactly with expected exit 1 for its incomplete gate;
  comparison to v3 used the existing helper with identical case/corpus inputs. No regression
  versus incomplete v3 was found; changing model/API/pacing together prevents attribution.
- V1/v2/v3, dataset and Phase 11 controls remain frozen. Source checks/tests were not
  repeated merely for copying new artifacts; the latest implementation checks remain
  95 passed/one PostgreSQL skip, type check/build passed, known frontend lint baseline.
- Manual review found an apparent conflict between Phase 6 owner-configuration routing,
  Phase 11's frozen legacy escalation labels, and Phase 11A's ban on simulated replay
  candidates. Further implementation stopped as required by AGENTS.md. A concrete proposed
  versioned advisory acceptance contract is in v4 README; no proposed change is implemented.
- The original 80%/90% targets, model-forbidden controls and all safety restrictions remain
  unchanged. New-contract scoring would require user approval and explicit versioning, not
  relabeling this frozen v4 result as a pass.

This turn changes 14 files; the complete pending Phase 11A bundle now contains 62 exact
paths in the staging command below. Graphify required: no for this evaluation-only follow-up;
the full phase milestone still requires its post-merge refresh. Next model/effort: Sol at
medium, after the user resolves the documented contract scope. Do not start another paid
capture or change the evaluator while that decision is pending.

## Generation-access follow-up (2026-10-03)

The user authorized a real-model improvement loop. Both configured Flash-Lite API modes
returned HTTP 404 and were stopped; seven Interactions calls and twelve generateContent
calls are journaled, with no completed diagnoses. A separate minimal generation diagnostic
also returned 404 / NOT_FOUND. Metadata/model-list reads returned 200. The generation
cause is unresolved, an explicit next-model choice is pending, and the gate remains unmet.
See `apps/ai_agent/evaluation/phase-11a-generation-access.md` for exact measured limits.

### Phase implementation

- `apps/ai_agent/src/gemini-model.ts`: explicit generateContent protocol in the existing
  adapter, same schema/output cap, candidate validation, thought exclusion and token usage.
- `apps/ai_agent/src/evaluation/model-experiment.ts`: explicit API flag and endpoint provenance;
  stop after blocking HTTP errors while accounting for all cases, preserving failures and
  leaving controls zero-call. No automatic model/API fallback.
- `apps/ai_agent/tests/gemini-model.test.ts`: two protocol/usage/incomplete-response regression tests.
- `apps/ai_agent/tests/model-experiment.test.ts`: protocol provenance/reproduction and terminal-error
  stop/accounting regressions. Pre-existing tests remain intact.

### Learning comments

No separate comment-only files. Comments explain protocol normalization and legacy bounds;
all pre-existing phase/learning edits remain listed in their original sections below.

### Documentation

- `apps/ai_agent/evaluation/phase-11a-generation-access.md`
- `apps/ai_agent/evaluation/phase-11a-reproduction.md`
- `apps/ai_agent/evaluation/phase-11a-handoff.md`

### Excluded or uncertain

All unrelated paths listed below remain excluded. Also exclude interrupted local progress
journals, environment files, ignored model-metadata diagnostics and source snapshots under
`.tmp-turbo-user/phase11a-interactions-before/` and
`.tmp-turbo-user/phase11a-generate-content-before/`. Each source snapshot preserved all 13
recorded source paths before the next behavior change. No new sanitized baseline exists
because neither attempt produced a complete experiment. No Git integration was performed.

### Verification

- 95 offline tests passed, one PostgreSQL integration test skipped, zero failed across seven files.
  Protocol and stop-on-error tests were observed failing before their implementation.
- Root check-types/build passed after a literal-type correction in the new test. Root lint
  reports the same nine frontend errors and 22 warnings; frontend source is unchanged.
- Historical frozen files and dataset/control fixtures remain unchanged; v3 evaluation still
  reproduces its existing incomplete gate. No current-model quality measurement is claimed.
- Pending full phase bundle: 51 files; the exact staging command below now includes this new
  generation-access report. Suggested subject remains the scoped Phase 11A bundle subject.
- Graphify required: no for this bounded adapter/runner follow-up. The full pending Phase 11A
  milestone still requires its post-merge refresh. Next model/effort: Sol at medium for a healthy
  development capture and diagnosis review after the user makes an explicit model choice.

## Pacing follow-up (2026-10-03)

This follow-up updates the existing runner only; no further live capture was made.
The configured model was confirmed as `gemini-2.5-flash-lite` by explicitly loading
the ignored agent environment file and printing only the model ID and credential-presence
boolean. No credential value was displayed or copied.

### Phase implementation

- `apps/ai_agent/src/evaluation/model-experiment.ts`: shared 13,000-ms default request-start
  interval, recorded bound and `--min-call-interval-ms` override; legacy captures retain
  their original settings. Pacing includes graph repairs and obeys cancellation/run limits.
- `apps/ai_agent/src/graph.ts`: optional pre-invocation hook runs under the investigation
  signal before the provider-call timeout starts. Production defaults are unchanged.
- `apps/ai_agent/tests/model-experiment.test.ts`: three offline regression tests covering
  pacing, repairs, call deadlines, cancellation, total deadline and legacy manifests.

### Learning comments

No separate comment-only files. The implementation files include short pacing and
legacy-artifact rationale only; retained pre-existing learning comments remain in place.

### Documentation

- `apps/ai_agent/evaluation/phase-11a-reproduction.md`: explicit agent `.env` loading,
  pacing controls, quota readiness, optional bounded smoke/full-capture commands,
  separate safety/quality criteria and development-only improvement steps.
- `apps/ai_agent/evaluation/phase-11a-handoff.md`: this follow-up's exact scope and results.

### Excluded or uncertain

The pre-existing unrelated paths listed below remain excluded, along with ignored
experiment/local outputs and `.tmp-turbo-user/` source snapshots/audits. All other pending
Phase 11A changes listed below predate this follow-up. The user's environment-file edit
is local configuration and must not be staged. No staging or Git integration was performed.

### Verification

- Focused offline suite: 91 passed, one PostgreSQL integration test skipped, zero failed
  across seven files. The three new pacing tests were observed failing before implementation.
- Required root type check and build passed after permitting access to Turbo's user config;
  frontend build was cached with its pre-existing warnings.
- Root lint failed with the existing frontend baseline: nine errors and 22 warnings.
  The reported source locations/rules match the diagnostic list below; frontend source
  remains unchanged. This is a failing check, not a lint pass.
- Frozen v3 evaluation reproduces offline, with expected exit 1 for its incomplete gate.
  The historical v2/v3 comparison independently reproduces using matching preserved sources.
  All 36 frozen baseline/control/dataset files were verified unchanged.
- Matching v3 source was preserved before edits under ignored
  `.tmp-turbo-user/phase11a-v3-source/`; all 13 recorded hashes matched. The updated reproduction
  guide uses that tree for the historical source-verified comparison.
- No new diagnosis-quality measurement or gate pass is claimed. Full development quality
  still requires >=13/16 accepted diagnoses and >=15/16 retrieval hits, complete capture,
  both zero-call controls and zero safety violations. Prompts, labels and safety policy
  were not changed to manufacture acceptance.

The full-bundle exact staging command below already contains all five follow-up paths;
use that scoped phase handoff when integrating the pending Phase 11A bundle.
Graphify required: no for this small pacing follow-up; the pending full Phase 11A milestone
still requires its post-merge refresh as described below. Suggested next model/effort:
Sol at medium for diagnosis-quality investigation after a separately authorized healthy capture.

## Original v3 bundle handoff

The full pending Phase 11A bundle contains 50 exact files. V1/v2 and the dataset/control files remain frozen; all 24 recorded file hashes matched after v3. This turn changes 21 files: seven code/test files, two existing reproduction/handoff documents and twelve new v3 artifacts. Pre-existing Phase 11A implementation and approved master-plan fixture extension are included below explicitly; unrelated edits are excluded. No stage, commit, push, branch switch, pull or Graphify regeneration was performed.

## This turn's exact scope

- `apps/ai_agent/src/graph.ts`
- `apps/ai_agent/src/prompts.ts`
- `apps/ai_agent/src/gemini-model.ts`
- `apps/ai_agent/src/tools/search-runbooks.ts`
- `apps/ai_agent/tests/gemini-model.test.ts`
- `apps/ai_agent/tests/search-runbooks.test.ts`
- `apps/ai_agent/tests/model-experiment.test.ts`
- `apps/ai_agent/evaluation/phase-11a-reproduction.md`
- `apps/ai_agent/evaluation/phase-11a-handoff.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/cases.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/comparison-v2-v3.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/contexts.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/corpus.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/invocations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/manifest.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/observations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/report.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/report.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/reproduce-comparison.ts`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/README.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/comparison-v2-v3.md`

## Phase implementation

- `apps/ai_agent/src/contracts.ts`
- `apps/ai_agent/src/evaluation/checks.ts`
- `apps/ai_agent/src/evaluation/experiment.ts`
- `apps/ai_agent/src/evaluation/fixture-tools.ts`
- `apps/ai_agent/src/evaluation/model-experiment.ts`
- `apps/ai_agent/src/gemini-model.ts`
- `apps/ai_agent/src/graph.ts`
- `apps/ai_agent/src/prompts.ts`
- `apps/ai_agent/src/tools/search-runbooks.ts`
- `apps/ai_agent/tests/evaluation-report.test.ts`
- `apps/ai_agent/tests/gemini-model.test.ts`
- `apps/ai_agent/tests/model-experiment.test.ts`
- `apps/ai_agent/tests/search-runbooks.test.ts`
- `apps/ai_agent/evaluation/.gitignore`
- `apps/ai_agent/evaluation/phase-11a-baseline/cases.json`
- `apps/ai_agent/evaluation/phase-11a-baseline/contexts.json`
- `apps/ai_agent/evaluation/phase-11a-baseline/corpus.json`
- `apps/ai_agent/evaluation/phase-11a-baseline/invocations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline/manifest.json`
- `apps/ai_agent/evaluation/phase-11a-baseline/observations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline/report.json`
- `apps/ai_agent/evaluation/phase-11a-baseline/report.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/cases.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/comparison-v1-v2.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/contexts.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/corpus.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/invocations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/manifest.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/observations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/report.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/report.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/reproduce-comparison.ts`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/cases.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/comparison-v2-v3.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/contexts.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/corpus.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/invocations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/manifest.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/observations.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/report.json`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/report.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/reproduce-comparison.ts`

The graph file contains retained pre-existing learning diagrams; v3 adds only the retrieval sanitation rationale. Adapter/tests include concise implementation and regression rationale, with no teaching session or learner checkpoint. V1/v2 experiment files are unchanged pre-existing phase artifacts. Model-experiment, fixture tools, contracts and evaluator changes outside the seven v3 code/test files were already present when this turn began.

## Learning comments

No separate comment-only file changed. Retained diagrams in graph.ts are listed once under Phase implementation.

## Documentation

- `docs/ai-dlq-master-plan.md`
- `apps/ai_agent/evaluation/phase-11a-reproduction.md`
- `apps/ai_agent/evaluation/phase-11a-handoff.md`
- `apps/ai_agent/evaluation/phase-11a-baseline/README.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/README.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v2/comparison-v1-v2.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/README.md`
- `apps/ai_agent/evaluation/phase-11a-baseline-v3/comparison-v2-v3.md`

The master-plan change is the pre-existing, user-approved simulated fixture contract extension; this turn did not edit the master plan or later phases. V1/v2 READMEs/comparison are frozen. The v3 documentation reports the measured failures and limits.

## Excluded or uncertain

- `.claude/settings.local.json`
- `graphify-out/2026-09-30/.graphify_analysis.json`
- `graphify-out/2026-09-30/.graphify_labels.json`
- `graphify-out/2026-09-30/GRAPH_REPORT.md`
- `graphify-out/2026-09-30/cost.json`
- `graphify-out/2026-09-30/graph.json`
- `graphify-out/2026-09-30/manifest.json`
- `graphify-out/cache/last_query_stamp`
- `graphify-out/cache/semantic/pa567fc138e3a/42b6bf915e3861637d640aedc363be01f9372def65db989bfc60112b2f241977.json`
- `graphify-out/cache/stat-index.json`
- `graphify-out/memory/query_20260923_064129_82e4530f_start_phase_3c_durable_dlq_publication_and_reconci.md`
- `graphify-out/memory/query_20260927_180846_f1f93e82_oh_but_my_idea_for_this_prj_dlq_system_was_like_in.md`
- `rtk/history.db`

All listed exclusions are pre-existing/unrelated cache, generated Graphify, query memory, local tool settings or RTK history. Also exclude ignored apps/ai_agent/evaluation/experiments/, apps/ai_agent/evaluation/local/ and .tmp-turbo-user/ support files, including matching v1/v2 snapshots, local audits and progress journals. Preserve the verified v2 source snapshot locally for cross-version reproduction; never include environment files or provider bodies.

## Verification and measured result

- Before live execution: focused offline tests 94 passed, 1 PostgreSQL restart test skipped, 0 failed across 10 files. No paid calls in tests. Phase 11 control equality regression passed.
- Required root check-types and build passed. Build reused unchanged frontend cache and its existing warning logs. The initial sandbox type-check attempt could not read Turbo configuration; the authorized normal-host run passed.
- Root lint failed: unchanged frontend baseline 9 errors / 22 warnings. Frontend source has no diff. Parsed diagnostics match the previous baseline: **yes**. Exact diagnostic rows appear below.
- Single v3 run: same model gemini-2.5-flash, cases, labels, corpus, bounds and denominators; 18/18 case records, 16 calls, zero repairs/timeouts, both controls zero-call.
- Retrieval 16/16 (100%) meets >=15/16. Valid diagnoses 3/16 and acceptance 1/16 (6.25%) miss their goals. Thirteen model API HTTP 429 failures leave capture incomplete. Exact rate/quota cause is unknown because response bodies were discarded. No automatic provider retry or second paid run.
- Evaluated final-result safety violations 0; contract probes 30/30; completeness/safety gate FAIL. The CLI exit status is not a quality-target gate.
- Token total and cost remain unknown/null; 14,913 tokens are known from three successful calls, and 13 failures have unknown usage. Fast rejections do not establish faster diagnosis.
- Eight sanitized v3 capture/report files were copied byte-identically. V2 and v3 independently reproduced with all 13 source hashes checked for each; comparison uses existing logic. Offline v3 evaluate exit 1 with reproduced:true is expected for incomplete capture.
- Six prior accepted cases fail capture; eleven broader regressions are listed in comparison-v2-v3.json. F05 abstention and F08/F09 parsing improvements remain unmeasured due to HTTP rejection. First-text extraction is unchanged; multiple blocks remain an unproven v2 hypothesis.
- F01/F02 still fail legacy replay expectations. No live prerequisites were invented, replay restrictions remain unchanged, and no held-out model run, action/replay, production trace ingestion or repeated-trial metric was performed.

### Exact frontend lint diagnostics

```text
apps/frontend/src/app/connections/page.tsx:158:27 warning Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element @next/next/no-img-element
apps/frontend/src/app/login/page.tsx:98:35 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any
apps/frontend/src/app/signup/page.tsx:78:35 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any
apps/frontend/src/app/store/zapStore.ts:2:10 warning 'metadata' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/app/store/zapStore.ts:4:26 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any
apps/frontend/src/app/store/zapStore.ts:9:14 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any
apps/frontend/src/app/zap/create/custom/CustomAction.tsx:116:19 warning Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element @next/next/no-img-element
apps/frontend/src/app/zap/create/custom/CustomAction.tsx:179:21 warning Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element @next/next/no-img-element
apps/frontend/src/app/zap/create/custom/CustonTrigger.tsx:115:19 warning Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element @next/next/no-img-element
apps/frontend/src/app/zap/create/custom/CustonTrigger.tsx:171:21 warning Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element @next/next/no-img-element
apps/frontend/src/app/zap/create/custom/CustonTrigger.tsx:25:47 warning 'id' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/app/zap/create/custom/CustonTrigger.tsx:33:48 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any
apps/frontend/src/app/zap/create/custom/CustonTrigger.tsx:3:45 warning 'useReactFlow' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/app/zap/create/page.tsx:8:8 warning 'Node' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/hooks/useZaps.ts:21:7 error Error: Calling setState synchronously within an effect can trigger cascading renders
apps/frontend/src/hooks/useZaps.ts:41:7 error Error: Calling setState synchronously within an effect can trigger cascading renders
apps/frontend/src/hooks/useZaps.ts:63:7 error Error: Calling setState synchronously within an effect can trigger cascading renders
apps/frontend/src/mycomponents/Appbar.tsx:10:3 warning 'DropdownMenuGroup' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:12:3 warning 'DropdownMenuLabel' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:13:3 warning 'DropdownMenuPortal' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:14:3 warning 'DropdownMenuSeparator' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:16:3 warning 'DropdownMenuSub' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:17:3 warning 'DropdownMenuSubContent' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:18:3 warning 'DropdownMenuSubTrigger' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:2:17 warning 'use' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:2:22 warning 'useState' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:2:32 warning 'useEffect' is defined but never used @typescript-eslint/no-unused-vars
apps/frontend/src/mycomponents/Appbar.tsx:45:8 warning Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element @next/next/no-img-element
apps/frontend/src/mycomponents/Input.tsx:10:17 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any
apps/frontend/src/mycomponents/app/AppShell.tsx:21:7 warning Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element @next/next/no-img-element
apps/frontend/src/mycomponents/buttons/DarkButton.tsx:4:5 warning 'size' is assigned a value but never used @typescript-eslint/no-unused-vars
```

## Exact manual staging command

From C:/Users/thiss/Desktop/dev/zapier, after reviewing this exact pending phase bundle:

```powershell
git add -- `
  "apps/ai_agent/src/contracts.ts" `
  "apps/ai_agent/src/evaluation/checks.ts" `
  "apps/ai_agent/src/evaluation/experiment.ts" `
  "apps/ai_agent/src/evaluation/fixture-tools.ts" `
  "apps/ai_agent/src/evaluation/model-experiment.ts" `
  "apps/ai_agent/src/gemini-model.ts" `
  "apps/ai_agent/src/graph.ts" `
  "apps/ai_agent/src/prompts.ts" `
  "apps/ai_agent/src/tools/search-runbooks.ts" `
  "apps/ai_agent/tests/evaluation-report.test.ts" `
  "apps/ai_agent/tests/gemini-model.test.ts" `
  "apps/ai_agent/tests/model-experiment.test.ts" `
  "apps/ai_agent/tests/search-runbooks.test.ts" `
  "apps/ai_agent/evaluation/.gitignore" `
  "apps/ai_agent/evaluation/phase-11a-baseline/cases.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline/contexts.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline/corpus.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline/invocations.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline/manifest.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline/observations.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline/report.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline/report.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/cases.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/comparison-v1-v2.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/contexts.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/corpus.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/invocations.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/manifest.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/observations.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/report.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/report.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/reproduce-comparison.ts" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/cases.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/comparison-v2-v3.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/contexts.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/corpus.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/invocations.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/manifest.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/observations.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/report.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/report.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/reproduce-comparison.ts" `
  "docs/ai-dlq-master-plan.md" `
  "apps/ai_agent/evaluation/phase-11a-reproduction.md" `
  "apps/ai_agent/evaluation/phase-11a-generation-access.md" `
  "apps/ai_agent/evaluation/phase-11a-handoff.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline/README.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/README.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v2/comparison-v1-v2.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/README.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v3/comparison-v2-v3.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/cases.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/contexts.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/corpus.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/invocations.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/manifest.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/observations.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/report.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/report.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/comparison-v3-v4.json" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/README.md" `
  "apps/ai_agent/evaluation/phase-11a-baseline-v4/comparison-v3-v4.md"
```

Suggested commit subject: `feat(ai-agent): capture model baselines and improve bounded retrieval`

The user stages, commits, pushes and creates/merges the phase-bundle PR manually. Stop at this handoff. Graphify required: **yes** for the complete pending Phase 11A implementation milestone, only after the bundle is merged and the user confirms a clean, updated default branch. **No additional Graphify refresh is required for this small v3 follow-up alone.** Existing generated/cache/query-memory files stay excluded. A milestone refresh then uses a separate Graphify commit.

Next separately authorized implementation/review: **Sol, medium**. No additional live run, paid retry, held-out evaluation, pass@k/pass^k, tuning or next phase is authorized by this handoff.
