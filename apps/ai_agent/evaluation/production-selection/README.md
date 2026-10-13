# Production selection — Tasks A/B

## Authorized Task B follow-up — 13 October 2026

After requesting Task C, the user selected **resolve Task B failures first** and an external model ceiling of **$0**. No Task C generation or independent acceptance run occurred. A score-blind subagent audit corrected the development annotations in `development-review-v3.json`: tasks asking for **any** direct procedure no longer require several independently sufficient procedures together; conditional repairs assuming unobserved defects were demoted to supporting. IDs, evidence, production queries, corpus, provider eligibility and all eight negative cases remain unchanged. This is a measurement correction on exposed development data, not evidence of retrieval improvement.

`runs/task-b-followup-20261013-v3/` freezes the corrected labels before re-scoring the unchanged production query and two one-factor query interventions. Underscore normalization retains observed words/numbers; the procedure-question intervention adds the same task to every incident without asserting a cause or changing eligibility. The old intent-prefix rejection used already explicit human questions; this bounded follow-up tests omitted procedural intent in actual incident queries under the user-selected direct-procedure scope. Original MiniLM .001 and all numerical gates are unchanged. Each hybrid sweep is compared with the unchanged production keyword precision, not a weakened variant baseline.

**Result: no candidate passes.** Original MiniLM's corrected-label Recall@3 is 62.5% (10/16) on the unchanged query, 68.75% (11/16) with underscore normalization and 75% (12/16) with the procedure question. All three abstain on 0/8 negatives. Supporting guidance still outranks or out-scores incident-specific procedures; a single cutoff fails to preserve answerable coverage while abstaining. Two intervention slots were consumed and no optional pilot was used. Stop this follow-up; no method is accepted and runtime remains unchanged.

The follow-up decision/report separates v3 baseline measurement from query effects, preserves all 48 configurations and paired scenario deltas, records per-case returned citations/scores and supporting hits, and binds query/config/model/label/source hashes. V2 metrics are immutable and must not be pooled with the corrected labels. The v3 macro metric credits any independently sufficient direct-procedure alternative; it does not claim complete coverage of every procedure or semantic diagnosis quality. Sequential local Node/ONNX inference and resource snapshots are recorded; concurrency and full investigation latency remain unmeasured. `result-manifest.json` hashes all generated outputs.

Verification: 16 focused tests passed, direct/root type checks and root build passed; frontend build output was cached. Lint retains the exact saved nine-error, 22-warning baseline in unchanged files. The ignored `task-b-followup-handoff.md` contains exact scoped staging paths and exclusions. External generations and model spend: zero. Task C, production integration and frontend validation were not performed. Graphify required: **no**. Any successor requires a new bounded scope; use one Sol agent at medium effort.

Reproduction requires a new output directory and the already cached pinned model files:

```powershell
rtk proxy bun run apps/ai_agent/evaluation/production-selection/runs/task-b-followup-20261013-v3/followup-driver.mjs --mode prepare --review apps/ai_agent/evaluation/production-selection/development-review-v3.json --out apps/ai_agent/evaluation/production-selection/runs/<new-followup-id>
rtk proxy node apps/ai_agent/src/evaluation/r21-models.mjs apps/ai_agent/evaluation/production-selection/runs/<new-followup-id>/inference-hybrid-followup.json apps/ai_agent/evaluation/production-selection/runs/<new-followup-id>/scores-hybrid-followup.json
rtk proxy node apps/ai_agent/src/evaluation/r23-models.mjs apps/ai_agent/evaluation/production-selection/runs/<new-followup-id>/inference-original-followup.json apps/ai_agent/evaluation/production-selection/runs/<new-followup-id>/scores-original-followup.json
rtk proxy bun run apps/ai_agent/evaluation/production-selection/runs/<new-followup-id>/followup-driver.mjs --mode report --out apps/ai_agent/evaluation/production-selection/runs/<new-followup-id>
```

## Task B outcome — 13 October 2026

The user authorized a subagent to adjudicate development labels and then selected a consistent **no direct procedural answer** definition, with supporting guidance reported separately. `scope-revision-v2.json` records this amendment; it leaves all numerical gates and independent release requirements unchanged. `development-review-v1.json` preserves the original scope conflict. `development-review-v2.json` re-reviews every case under the amended definition and adds eight controls. These are agent-reviewed synthetic development fixtures, not human or independent acceptance evidence.

The frozen `runs/task-b-20261013-v2/` comparison contains 16 answerable incidents and eight no-direct-procedure incidents, 54 unchanged deployable sections, and 1,296 section judgments. The parent harness verified every evidence bundle/query against the actual graph function, exact original evidence/input preservation, corpus/review hashes, complete section judgments and relevance labels. All negative sections are provider-eligible. Some added safe aggregate facts are explicitly simulated; they do not claim that normal persisted evidence exposes provider bodies or payload values.

**Result: no candidate passes.** Keyword macro section Recall@3 is 33.33%, original exhaustive MiniLM 30.21%; both abstain on 0/8 negatives. Hybrid cutoff .3 abstains on 8/8 negatives but falsely abstains on 8/16 positives. All 16 configurations fail at least one gate. The newly scoped labels and production incident queries differ from historical direct-query benchmarks; scores must not be pooled or described as a universal ranking of methods.

`decision.md`/`decision.json` provide the rejection decision; `report.json` preserves ranked scores, eligibility, supporting hits, absolute denominators, reliability and paired scenario regressions; `failure-ledger.json` separates measured ranking/candidate/cutoff losses and unavailable outputs. Query-observation loss still needs manual semantic inspection; diagnosis was not run. `freeze.json` binds source/config/label/corpus/model hashes before inference. `inference-*.json` have no evaluator labels. `scores-*.json` come from unchanged local R2.1/R2.3 implementations, with resource snapshots collected separately. Outputs are hashed in `result-manifest.json`.

No targeted query/corpus intervention, HyDE/PageIndex pilot, external call, paid generation, dependency change, default change or Git integration occurred. Task B ends with the explicit no-candidate-passes result. Tasks C–E do not proceed without a separately scoped successor. Keyword remains the conservative operational default, without a quality certification.

Verification: 14 focused tests passed; direct AI-agent and root type checks passed; root build passed with cached frontend output and existing warnings. Root lint failed with nine existing errors and 22 warnings; exact diagnostic comparison against the saved Task A log and unchanged-source checks are in the ignored Task B handoff. The root tasks alone do not prove frontend or full-stack readiness.

To reproduce in a **new** run directory after reviewing the scope/labels:

```powershell
rtk proxy bun run apps/ai_agent/src/evaluation/retrieval-selection.ts --review apps/ai_agent/evaluation/production-selection/development-review-v2.json --output apps/ai_agent/evaluation/production-selection/runs/<new-run-id>
rtk proxy node apps/ai_agent/src/evaluation/r21-models.mjs apps/ai_agent/evaluation/production-selection/runs/<new-run-id>/inference-hybrid.json apps/ai_agent/evaluation/production-selection/runs/<new-run-id>/scores-hybrid.json
rtk proxy node apps/ai_agent/src/evaluation/r23-models.mjs apps/ai_agent/evaluation/production-selection/runs/<new-run-id>/inference-original.json apps/ai_agent/evaluation/production-selection/runs/<new-run-id>/scores-original.json
rtk proxy bun run apps/ai_agent/src/evaluation/retrieval-selection.ts --report --output apps/ai_agent/evaluation/production-selection/runs/<new-run-id>
```

Original MiniLM retains .001; the calibrated hybrid grid is frozen before inference. Existing local q8 model assets are required; the CLI does not fetch weights. Stop if any provenance check fails. Concurrent load and full investigation latency remain unmeasured; no broad release confidence follows from this exposed 24-case sample. Graphify required: **no** for this offline result. Use Sol at medium effort for any separately authorized next scope.

## Historical Task A preparation (preserved)

The 13 October 2026 plan was reviewed and Task A started in the existing checkout with explicit user consent. `protocol.json` records the proposed release scope and gates before comparisons. The historical master-plan development target remains 80%; independent release acceptance here retains 90%. Runtime changes are conditional on independent acceptance. No master-plan target or historical evidence was rewritten.

## Prepared evidence

`runs/task-a-20261013-v1/` contains 16 exposed synthetic development incidents, two rejected authorization/staleness controls and the exact six-runbook, 54-section deployment corpus. Incident inputs come from the actual `graph.retrievalInput`; parity with the existing sanitized capture was checked. Rejected controls are separate from retrieval quality denominators.

- `manifest.json`: preparation-time Git state (including pre-existing work and newly created Task A files), source/config/input/corpus hashes and artifact hashes.
- `development-inputs.json`: sanitized incident evidence, exact production query, eligible citations and missing runtime facts.
- `corpus.json`: versioned current deployment sections, citation/hash metadata and provider restrictions.
- `review-packet.json`: every corpus section for every incident, with eligibility marked, without method scores.
- `label-rationales-template.json`: pending human annotation, direct/supporting/irrelevant rationale per section and alternative sufficient answer sets.
- `keyword-capture.json`: unchanged keyword output and retrieval timing. Failure attribution is explicitly pending label adjudication.

No quality result, acceptance decision, live generation, paid call, dependency change, runtime/default change or frontend demonstration is established by this preparation. The keyword capture is an offline diagnostic capture, not the Task B comparison matrix. Existing fresh R2.5 question/label payloads were not opened.

## Remaining Task A gates

Review the packet independently of keyword rankings. Annotate direct answers and supporting guidance separately. Each sufficient alternative must have at most three indispensable sections. Distinguish genuine no-match, missing corpus guidance and provider-ineligible answers; missing facts do not automatically imply no-match. Human-adjudicate disputed labels before freezing them.

The existing capture has no adjudicated retrieval no-match cohort. Add sanitized development cases for genuine no-match and any missing challenge categories, including adversarial runbook text, before claiming benchmark coverage. The two rejected controls are not substitutes for no-match cases. Historical direct questions may be retained only as a separate diagnostic cohort.

Complete the seven-stage failure ledger from the plan after labels are adjudicated; `pending_label_adjudication` in the current capture is a placeholder, not a diagnosed failure stage. Record observation loss and missing runtime facts separately. Version/re-freeze any narrowly justified corpus correction before comparison. Task A is **prepared, not complete**; Task B is not started.

`scoreSelection` reuses existing eligibility and macro-recall helpers. It reports eligible recall, complete sufficient-answer coverage, access exclusions, supporting hits, all-incident coverage and availability separately. Missing/failed outputs remain scheduled; they never receive successful negative-abstention credit. Malformed, fabricated or ineligible citations and impossible labels are rejected. Preparation rechecks provenance and refuses existing output directories.

## Reproduction

Use a new directory; frozen directories are never overwritten:

```powershell
rtk proxy bun test apps/ai_agent/tests/retrieval-selection.test.ts
rtk proxy bun run apps/ai_agent/src/evaluation/retrieval-selection.ts --output apps/ai_agent/evaluation/production-selection/runs/<new-run-id>
```

Verification: six focused tests passed, root type checks passed, direct AI-agent type check passed, root build passed (frontend result replayed from Turbo cache with existing Next/Yarn/Corepack warnings). Re-running preparation against the existing directory was rejected with `EEXIST`. Root lint failed with nine errors and 22 warnings in unchanged frontend files; counts match the documented baseline, but this is not a green lint result. Existing generated Prisma diffs also contain whitespace diagnostics. Detailed scope and verification are recorded in the ignored handoff report. These checks do not establish live or frontend readiness.

Graphify required: **no** for this preparatory offline harness. After completed integration/full-stack validation, the plan requires a milestone refresh following merge and confirmation of clean updated main. Continue implementation with one Sol agent at medium effort; routine milestone documentation can be handed to Antigravity.
