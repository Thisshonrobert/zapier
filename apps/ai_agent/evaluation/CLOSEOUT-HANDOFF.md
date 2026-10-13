# Manual closeout handoff — 13 October 2026

The [decision record](RAG-DIAGNOSIS-CLOSEOUT.md) closes this investigation. Production behavior stays unchanged; MiniLM remains opt-in, causal prompts and repair acceptance experimental. No new experiment or Git action is required from the agent. All commands below are for later manual use and were not executed during this closeout unless explicitly identified as today's audit.

## Reproducibility and exact evidence locations

From the repository root, the existing tracked R2 archive and HEAD `b8aca2348fc1954d627a5462950112dbae785519` supply the baseline dependencies. Preserve this repository plus the exact new files listed below; copying only the latest report would omit imported untracked modules and saved inputs.

| Evidence | Exact artifact locations under apps/ai_agent/evaluation/ |
| --- | --- |
| R2 baseline, scope and verification | `R2-ARCHIVE.md`, `R2-ARCHIVE-SCOPE.json`; `r25/runs/exhaustive-v2/report.json`; `intent-dev/runs/intent-v3/report.json`; `downstream-noise/runs/live-v1/qualitative-review.json` and `verification.json` |
| MiniLM integration | `retrieval-integration/README.md`, `runs/dev-v2/report.json`, `runs/dev-v2/verification.json`, `verify-dev.mjs` (all under retrieval-integration/) |
| Multi-query / metadata | `multi-query/README.md`, `multi-query/runs/dev-v1/manifest.json`, `report.json`, `report.md` |
| Agentic retrieval | `agentic/LIVE-RESULTS.md`, `agentic/HANDOFF.md`; all four artifacts in each of `agentic/runs/stub-dev-v2/`, `live-dev-20261012-v1/`, `live-dev-20261012-v2/` |
| Offline cause investigation / oracle preparation | `retrieval-investigation/README.md`, `HANDOFF.md`; `runs/offline-v4/manifest.json`, `report.json`, `report.md` (all under retrieval-investigation/) |
| Completed free oracle pilot | `retrieval-investigation/runs/free-oracle-pilot-20261013-v1/report.md`, `report.json`, `manifest.json`, `plan.json`, saved attempts/results, blind review/mapping/packets, `requests.jsonl` |
| Causal v1 partial and completed allocation | `causal-diagnosis/README.md`; `runs/free-causal-pilot-20261013-v1/report.md`, original `report.json`, `report-final.json`, `measurements.json`, `continuation.json`, `plan.json`, request/results (all under causal-diagnosis/) |
| Causal v2 preparation and execution | `causal-diagnosis/runs/prepared-causal-v2-20261013/report-live.md`, `report.md`, `plan.json`, `execution-manifest.json`, `offline-review-final-2.json`, `verification.json`, type/build/lint logs, saved attempts/results |
| Repair acceptance | `repair-acceptance/runs/offline-20261013-v1/report.md`, `report.json`, `verification.json`, 14 saved raw/assessment pairs, 19 control pairs, `focused.log`, `check-types.log`, `build.log`, `lint.log` |
| Today's audit and exact archive scope | `CLOSEOUT-VERIFICATION.json`, `CLOSEOUT-SCOPE.json` |

The four new closeout files are the only durable edits made today. Ignored `.tmp-turbo-user/closeout-*.mjs` and inventory files are local audit workpapers, excluded from Git and not runtime dependencies. Frozen experiment files were not rewritten.

## Existing offline commands — reference only

These commands already exist in experiment READMEs and use new output paths. None was rerun for this closeout. Use the recorded commands exactly; existing output directories are refused.

```powershell
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/retrieval-multi-query.ts --output .tmp-turbo-user/multi-query-reproduction
rtk proxy bun run apps/ai_agent/src/evaluation/agentic-experiment.ts --output .tmp-turbo-user/agentic-reproduction
rtk proxy bun run apps/ai_agent/src/evaluation/agentic-experiment.ts --replay .tmp-turbo-user/agentic-reproduction
rtk proxy bun run apps/ai_agent/src/evaluation/investigate-retrieval.ts --output apps/ai_agent/evaluation/retrieval-investigation/runs/offline-unique
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/retrieval-intent.ts --output .tmp-turbo-user/intent-replay --scores apps/ai_agent/evaluation/intent-dev/runs/intent-v3/scores.json
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/retrieval-intent.ts --output .tmp-turbo-user/intent-reproduction
```

Multi-query, investigation and stub agentic execution/replay need no model weights, credentials or provider requests. Intent score replay needs saved scores; local intent inference needs the existing ignored `.tmp-turbo-user/r2-models` cache and installed existing dependencies. Remote model access is disabled.

The documented MiniLM command is `rtk proxy bun apps/ai_agent/evaluation/retrieval-integration/verify-dev.mjs`. It uses the existing ignored cache or its first positional cache argument, but writes exclusive-create `retrieval-integration/runs/dev-v2/report.json`, which already exists. **Do not rerun it against this archive or invent an output flag.** Saved parity/results remain available; arranging a new run would require separate scope. Required local runtime: Node on PATH, existing Transformers 3.8.1 dev dependency (production-only installation is insufficient), pinned q8 files at `<cache>/Xenova/ms-marco-MiniLM-L-6-v2/a09144355adeed5f58c8ed011d209bf8ee5a1fec/`: `config.json`, `tokenizer.json`, `tokenizer_config.json`, `onnx/model_quantized.onnx`. Their hashes are checked by the existing subprocess. Model binaries are not archived in Git; a clean checkout without the local cache cannot perform inference. Do not enable the opt-in setting as part of preservation.

Repair pilot and preservation helpers have fixed frozen output locations; some write `verification.json` or `execution-manifest.json`. They are retained as historical implementation, **not rerun instructions**. `verify-prepared.ts` also reads a local account confirmation; it is not a credential-free offline check. No missing generalized repair replay command is invented.

## Commands capable of external calls — do not execute

The documented agentic `--live` command invokes Gemini; causal-pilot `--execute --confirmation ...` invokes Gemini/token preflight and uses local account confirmation. Supplying `--env-file=apps/ai_agent/.env` reads credentials. Oracle/causal execution APIs and model-cache download utilities are also outside this offline closeout. Historical authorization does not authorize another allocation. Preserve sanitized access/request records, but keep the uninspected oracle free-tier confirmation local and excluded. Saved outputs, source/plan provenance and offline analysis do not require credentials, an active subscription or reproducing billing verification.

## Verification: what was checked today

Today's dependency/byte-hash audit is in `CLOSEOUT-VERIFICATION.json`. It checks 11 scoped manifest/report records plus V4 cases provenance: **280 exact matches, 5 LF-normalized matches, 6 historical source mismatches, 1 protected confirmation deliberately not read**. No missing checked artifact or unresolved selected relative import was found. All selected experiment source/test/helper relative imports resolve to an included untracked file or an existing tracked prerequisite; the manifest records each edge. Baseline tracked dependencies and saved input paths must accompany the archive.

The six source mismatches are old records compared with current sources: `agentic-experiment.ts` in stub-v2/live-v1, `oracle-pilot.ts` in the oracle manifest and causal-v1 measurements, and `causal-diagnosis.ts` / `causal-pilot.ts` in causal-v1 measurements. Later reports document pacing/diagnostic and v2 instruction/runner work. Latest live-v2 agentic, v2 prepared/execution and repair source hashes match; that does not reconstruct the old runner byte-for-byte. Old saved outputs remain preserved and are preferable to rerunning current source to claim identical old generations. Exact expected/actual hashes are retained. Aggregate corpus hashes are retained in original manifests; this audit did not independently recompute their semantic serialization.

V4 `phase-11a-baseline-v4/cases.json`: expected LF hash `4d34b56a6460c918ef4aa64ad02b4d29b7706eeec3b1dfa0e64bef3365c46efb`; current CRLF byte hash `ddb53386f26d3f13efe1a838d1df8655d8bdd51f13b69754457768a29f72ce76`. LF normalization matches exactly; the frozen file was not altered. The other four LF-only matches are the saved repair build, type, focused and lint logs. A normalization match is **not** byte identity.

## Historical verification — not newly executed

| Existing record | Recorded result / limitation |
| --- | --- |
| R2-ARCHIVE.md / R2-ARCHIVE-SCOPE.json | Full agent suite 221 passed, 7 skipped, 4 failed: three null-pool DB tests without database configuration plus V4 hash mismatch. R2 focused: 74 passed, one optional PostgreSQL skip, zero failed; scoped types/build passed. |
| Multi-query README | 19 focused passed; types/build passed. |
| Agentic LIVE-RESULTS / HANDOFF | 62 focused passed; types/build passed; existing offline replay passed. |
| Retrieval-investigation HANDOFF | 42 focused passed; types/build passed; direct/projected/incident parity checked. |
| Free oracle pilot report | 22 focused passed; types/build passed. |
| Causal v2 verification.json | 26 final focused passed; broader 52 passed, one PostgreSQL restart skip, one V4 hash failure; types/build passed. Its preparation-era unmeasured-model statement is superseded by report-live.md, not edited. |
| Repair verification.json and logs | 21 new tests passed; focused 74 passed, one PostgreSQL restart skip, one V4 hash failure. Root types/build exited 0. |

Required root commands from `docs/tooling_Verification.md` are `rtk proxy bun run check-types`, `rtk proxy bun run lint`, `rtk proxy bun run build`. They were **not newly executed** for this artifact-only closeout. Latest relevant verified sources match the saved records, so no new code/source change requires another suite. Every cited root lint record is a **failure**: 9 frontend errors and 22 warnings in reported unchanged files, not a clean lint result. Some handoffs establish only matching totals, not exact historical diagnostic equality; this closeout does not strengthen that claim. AI-agent declares no lint task. Cached frontend builds replay warnings and do not establish a fresh frontend build. DB skips/failures leave those integration checks unverified. No unrelated code/frozen file was repaired to turn checks green.

## Archive inclusion and intermediate runs

This combined archive supersedes the older handoffs' separate staging lists. Include all listed source/tests, their untracked experiment dependencies, and all listed saved runs. **Include** retrieval offline-v1/v2/v3 as historical intermediate snapshots; only offline-v4 supplies the decision measurements. **Include** agentic stub-v2 and failed live-v1, causal v1 partial report/continuation/failure and all v2 preparation reviews; they preserve operational failures and preparation provenance, not additional accepted quality results. The already tracked R2 archive preserves its older rejected/partial runs. No fresh or unrelated output is silently included.

The JSON scope lists exact paths and current hashes; the categories below cover every initial uncommitted path. No separate learning-comment files were found. Source explanations belong to phase implementation. Tracked dirty paths are solely unrelated Prisma/Graphify changes: status and diff numstat were inspected, contents excluded under the user's read restriction. New experiment contents were inspected through reports, scoped manifests, imports and dependencies rather than dumping generated captures.

## Phase implementation

- `apps/ai_agent/evaluation/CLOSEOUT-SCOPE.json`
- `apps/ai_agent/evaluation/CLOSEOUT-VERIFICATION.json`
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
- `apps/ai_agent/evaluation/causal-diagnosis/review-v2.ts`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/access.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/attempt-1.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/attempt-2.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/attempt-4.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/continuation.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/measurements.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/plan.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/report-final.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/report.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/report.md`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/requests.jsonl`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/result-1.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/result-2.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/result-3.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/result-4.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/started-1.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/started-2.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/started-3.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/started-4.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/access.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-1.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-2.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-3.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-4.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-5.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-6.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/build.log`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/check-types.log`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/execution-authorization.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/execution-manifest.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/lint.log`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/offline-review-final-2.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/offline-review-final.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/offline-review.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/plan.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/report-live.md`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/report.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/report.md`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/requests.jsonl`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-1.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-2.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-3.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-4.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-5.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-6.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-1.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-2.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-3.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-4.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-5.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-6.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/summarize-live.ts`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/verification.json`
- `apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/verify-prepared.ts`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/manifest.json`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/report.json`
- `apps/ai_agent/evaluation/multi-query/runs/dev-v1/report.md`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/build.log`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-1-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-1-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-2-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-2-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-3-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-3-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-4-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-4-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-1-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-1-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-2-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-2-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-3-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-3-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-4-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-4-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-5-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-5-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-6-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-6-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/check-types.log`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-1-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-1-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-10-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-10-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-11-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-11-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-12-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-12-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-13-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-13-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-14-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-14-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-15-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-15-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-16-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-16-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-17-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-17-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-18-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-18-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-19-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-19-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-2-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-2-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-3-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-3-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-4-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-4-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-5-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-5-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-6-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-6-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-7-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-7-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-8-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-8-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-9-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-9-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/focused.log`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/lint.log`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-1-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-1-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-2-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-2-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-3-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-3-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-4-assessment.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-4-raw.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/report.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/report.md`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/started.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/verification.json`
- `apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/verify-preservation.ts`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/attempt-1.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/attempt-2.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/attempt-3.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/attempt-4.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/binding.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/blind-mapping.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/blind-packets.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/blind-review.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/manifest.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/plan.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/report.md`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/requests.jsonl`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/result-1.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/result-2.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/result-3.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/result-4.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/slot-1.started.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/slot-2.started.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/slot-3.started.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/slot-4.started.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v1/manifest.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v1/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v2/manifest.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v2/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/manifest.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/report.md`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/manifest.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/report.json`
- `apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/report.md`
- `apps/ai_agent/src/evaluation/agentic-experiment.ts`
- `apps/ai_agent/src/evaluation/causal-diagnosis.ts`
- `apps/ai_agent/src/evaluation/causal-pilot.ts`
- `apps/ai_agent/src/evaluation/investigate-retrieval.ts`
- `apps/ai_agent/src/evaluation/oracle-diagnosis.ts`
- `apps/ai_agent/src/evaluation/oracle-pilot.ts`
- `apps/ai_agent/src/evaluation/repair-acceptance-controls.ts`
- `apps/ai_agent/src/evaluation/repair-acceptance-pilot.ts`
- `apps/ai_agent/src/evaluation/repair-acceptance.ts`
- `apps/ai_agent/src/evaluation/retrieval-agentic.ts`
- `apps/ai_agent/src/evaluation/retrieval-investigation.ts`
- `apps/ai_agent/src/evaluation/retrieval-multi-query.ts`
- `apps/ai_agent/tests/agentic-experiment.test.ts`
- `apps/ai_agent/tests/causal-consistency.test.ts`
- `apps/ai_agent/tests/causal-diagnosis.test.ts`
- `apps/ai_agent/tests/oracle-pilot.test.ts`
- `apps/ai_agent/tests/repair-acceptance.test.ts`
- `apps/ai_agent/tests/retrieval-agentic.test.ts`
- `apps/ai_agent/tests/retrieval-investigation.test.ts`
- `apps/ai_agent/tests/retrieval-multi-query.test.ts`

## Learning comments

None added. Implementation comments are included with their source files above.

## Documentation

- `apps/ai_agent/evaluation/CLOSEOUT-HANDOFF.md`
- `apps/ai_agent/evaluation/RAG-DIAGNOSIS-CLOSEOUT.md`
- `apps/ai_agent/evaluation/agentic/HANDOFF.md`
- `apps/ai_agent/evaluation/agentic/LIVE-RESULTS.md`
- `apps/ai_agent/evaluation/agentic/README.md`
- `apps/ai_agent/evaluation/causal-diagnosis/README.md`
- `apps/ai_agent/evaluation/multi-query/README.md`
- `apps/ai_agent/evaluation/retrieval-investigation/HANDOFF.md`
- `apps/ai_agent/evaluation/retrieval-investigation/README.md`

## Excluded or uncertain

- `graphify-out/.vocab.txt` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/cache/last_query_stamp` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/cache/semantic/pa567fc138e3a/42b6bf915e3861637d640aedc363be01f9372def65db989bfc60112b2f241977.json` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `packages/db/generated/prisma/browser.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/client.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/commonInputTypes.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/internal/class.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/internal/prismaNamespace.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/internal/prismaNamespaceBrowser.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/User.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/Zap.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/ZapRun.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/ZapRunExecution.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/ZapRunRetry.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `apps/ai_agent/evaluation/r25/fresh-label-rationales-v1.json` — Protected fresh held-out; status-only inventory, content not read.
- `apps/ai_agent/evaluation/r25/fresh-scenarios-author-v1.json` — Protected fresh held-out; status-only inventory, content not read.
- `apps/ai_agent/evaluation/r25/fresh-scenarios-v1.json` — Protected fresh held-out; status-only inventory, content not read.
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/dataset.json` — Protected fresh held-out; status-only inventory, content not read.
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/freeze.json` — Protected fresh held-out; status-only inventory, content not read.
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/inference-inputs.json` — Protected fresh held-out; status-only inventory, content not read.
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/report.json` — Protected fresh held-out; status-only inventory, content not read.
- `apps/ai_agent/evaluation/r25/runs/fresh-v1/scores.json` — Protected fresh held-out; status-only inventory, content not read.
- `apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/free-tier-confirmation.json` — Account/free-tier authorization prerequisite retained locally; not read or proposed for staging. Not needed for saved-output analysis.
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.json` — Unrelated semantic-judge calibration or tooling output; excluded.
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.md` — Unrelated semantic-judge calibration or tooling output; excluded.
- `apps/ai_agent/evaluation/semantic-judge/calibration/2026-10-05T07-52-56.040Z-1e4f259f-1670-47af-91d6-ddd2cc1fa561/judge-live-replayed.votes.json` — Unrelated semantic-judge calibration or tooling output; excluded.
- `graphify-out/2026-09-30/.graphify_analysis.json` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/2026-09-30/.graphify_labels.json` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/2026-09-30/GRAPH_REPORT.md` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/2026-09-30/cost.json` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/2026-09-30/graph.json` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/2026-09-30/manifest.json` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/memory/query_20260923_064129_82e4530f_start_phase_3c_durable_dlq_publication_and_reconci.md` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `graphify-out/memory/query_20260927_180846_f1f93e82_oh_but_my_idea_for_this_prj_dlq_system_was_like_in.md` — Unrelated generated/cache/query-memory changes, including deletion; content not read.
- `packages/db/generated/prisma/models/ReplayExecution.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/ReplayExecutionAttempt.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/ReplayFailure.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/ReplayRequest.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/TriageAccessAudit.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/TriageApproval.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/TriageDecisionNotification.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `packages/db/generated/prisma/models/TriageProposal.ts` — Unrelated generated Prisma; status/numstat only, content not read.
- `rtk/history.db` — Unrelated semantic-judge calibration or tooling output; excluded.

Ignored local caches/audit workpapers and earlier ignored verification logs remain local. Essential latest causal and repair verification logs are explicitly included above. The protected account-confirmation exclusion limits live access/billing reconstruction; it does not block offline saved-output analysis. No credentials or model binaries belong in the staging command.

## Exact manual Git handoff

From the repository root, these bounded commands enumerate the same 207 selected files as CLOSEOUT-SCOPE.json. Multiple explicit commands avoid a very long Windows command line. Review the list before running; no staging, commit, push, pull, merge or branch change has been executed.

```powershell
rtk git add -- "apps/ai_agent/evaluation/CLOSEOUT-HANDOFF.md" "apps/ai_agent/evaluation/CLOSEOUT-SCOPE.json" "apps/ai_agent/evaluation/CLOSEOUT-VERIFICATION.json" "apps/ai_agent/evaluation/RAG-DIAGNOSIS-CLOSEOUT.md" "apps/ai_agent/evaluation/agentic/HANDOFF.md" "apps/ai_agent/evaluation/agentic/LIVE-RESULTS.md" "apps/ai_agent/evaluation/agentic/README.md" "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/freeze.json" "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/manifest.json" "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/report.json" "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v1/report.md" "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/freeze.json" "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/manifest.json" "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/report.json" "apps/ai_agent/evaluation/agentic/runs/live-dev-20261012-v2/report.md" "apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/freeze.json" "apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/manifest.json" "apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/report.json" "apps/ai_agent/evaluation/agentic/runs/stub-dev-v2/report.md" "apps/ai_agent/evaluation/causal-diagnosis/README.md" "apps/ai_agent/evaluation/causal-diagnosis/review-v2.ts" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/access.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/attempt-1.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/attempt-2.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/attempt-4.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/continuation.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/measurements.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/plan.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/report-final.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/report.json"
rtk git add -- "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/report.md" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/requests.jsonl" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/result-1.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/result-2.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/result-3.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/result-4.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/started-1.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/started-2.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/started-3.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/started-4.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/access.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-1.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-2.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-3.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-4.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-5.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/attempt-6.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/build.log" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/check-types.log" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/execution-authorization.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/execution-manifest.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/lint.log" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/offline-review-final-2.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/offline-review-final.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/offline-review.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/plan.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/report-live.md" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/report.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/report.md" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/requests.jsonl"
rtk git add -- "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-1.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-2.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-3.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-4.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-5.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/result-6.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-1.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-2.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-3.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-4.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-5.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/started-6.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/summarize-live.ts" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/verification.json" "apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013/verify-prepared.ts" "apps/ai_agent/evaluation/multi-query/README.md" "apps/ai_agent/evaluation/multi-query/runs/dev-v1/manifest.json" "apps/ai_agent/evaluation/multi-query/runs/dev-v1/report.json" "apps/ai_agent/evaluation/multi-query/runs/dev-v1/report.md" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/build.log" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-1-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-1-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-2-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-2-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-3-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-3-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-4-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v1-4-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-1-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-1-raw.json"
rtk git add -- "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-2-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-2-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-3-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-3-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-4-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-4-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-5-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-5-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-6-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/causal-v2-6-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/check-types.log" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-1-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-1-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-10-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-10-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-11-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-11-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-12-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-12-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-13-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-13-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-14-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-14-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-15-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-15-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-16-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-16-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-17-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-17-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-18-assessment.json"
rtk git add -- "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-18-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-19-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-19-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-2-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-2-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-3-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-3-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-4-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-4-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-5-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-5-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-6-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-6-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-7-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-7-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-8-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-8-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-9-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/control-9-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/focused.log" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/lint.log" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-1-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-1-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-2-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-2-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-3-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-3-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-4-assessment.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/oracle-4-raw.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/report.json"
rtk git add -- "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/report.md" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/started.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/verification.json" "apps/ai_agent/evaluation/repair-acceptance/runs/offline-20261013-v1/verify-preservation.ts" "apps/ai_agent/evaluation/retrieval-investigation/HANDOFF.md" "apps/ai_agent/evaluation/retrieval-investigation/README.md" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/attempt-1.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/attempt-2.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/attempt-3.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/attempt-4.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/binding.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/blind-mapping.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/blind-packets.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/blind-review.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/manifest.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/plan.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/report.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/report.md" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/requests.jsonl" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/result-1.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/result-2.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/result-3.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/result-4.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/slot-1.started.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/slot-2.started.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/slot-3.started.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/slot-4.started.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v1/manifest.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v1/report.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v2/manifest.json"
rtk git add -- "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v2/report.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/manifest.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/report.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v3/report.md" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/manifest.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/report.json" "apps/ai_agent/evaluation/retrieval-investigation/runs/offline-v4/report.md" "apps/ai_agent/src/evaluation/agentic-experiment.ts" "apps/ai_agent/src/evaluation/causal-diagnosis.ts" "apps/ai_agent/src/evaluation/causal-pilot.ts" "apps/ai_agent/src/evaluation/investigate-retrieval.ts" "apps/ai_agent/src/evaluation/oracle-diagnosis.ts" "apps/ai_agent/src/evaluation/oracle-pilot.ts" "apps/ai_agent/src/evaluation/repair-acceptance-controls.ts" "apps/ai_agent/src/evaluation/repair-acceptance-pilot.ts" "apps/ai_agent/src/evaluation/repair-acceptance.ts" "apps/ai_agent/src/evaluation/retrieval-agentic.ts" "apps/ai_agent/src/evaluation/retrieval-investigation.ts" "apps/ai_agent/src/evaluation/retrieval-multi-query.ts" "apps/ai_agent/tests/agentic-experiment.test.ts" "apps/ai_agent/tests/causal-consistency.test.ts" "apps/ai_agent/tests/causal-diagnosis.test.ts" "apps/ai_agent/tests/oracle-pilot.test.ts" "apps/ai_agent/tests/repair-acceptance.test.ts" "apps/ai_agent/tests/retrieval-agentic.test.ts" "apps/ai_agent/tests/retrieval-investigation.test.ts" "apps/ai_agent/tests/retrieval-multi-query.test.ts"
```

Suggested commit subject: `chore(ai-agent): archive RAG and diagnosis investigation closeout`.

Graphify required: **no**, according to `docs/graphify.md`; no major architecture change or implementation milestone was introduced by closing these experiments. Preserve all excluded edits. Stop after this handoff. Any future separately authorized implementation: Sol, medium effort, one agent; the decision record contains at most three conditional backlog items and starts none.
