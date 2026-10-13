# Experimental diagnosis consistency v2 — 13 October 2026

Status: **prepared, not executed**. Zero external requests, generation requests, token preflights or paid spending. Diagnosis is not yet ready for retrieval experiments. Offline checks validate the reporting logic and runner bounds; v2 model behavior and preservation of justified correction remain unmeasured.

## Confirmed findings and remaining hypotheses

The frozen v1 candidate's ambiguous response explicitly says delivery was rejected, retains low-confidence F03, requests investigation, and nevertheless returns `abstained + outcome_unknown + escalate`. The relevant structured observation is `failureContext.facts.retry.provider_outcome = rejected`; the controlled fixture also records rejection. Execution history is unavailable, rather than reporting unknown or an accepted/rejected conflict. Missing destination validity, bot permissions and provider status describe unresolved causes, not a contrary delivery observation.

The reproducible acceptance gap is in `graph.ts:issueForOutput`: it checks mapping/status, citation membership, disclosure, unknown/conflicting outcomes routed as known, platform ownership and replay prerequisites. It has no reciprocal check for a known outcome incorrectly marked unknown. `prompts.ts:hasUnknownDelivery` uses retry, current-execution and attempt outcomes; its unknown/conflict precedence is reused unchanged. No production validation was altered.

The production specific-cause instruction couples unsupported causes to `unknown`/`insufficient_evidence`. V1 replaces that instruction with family/investigation guidance, but still allowed the model to conflate cause uncertainty with delivery uncertainty. The observed conflation and validation gap are confirmed. The precise prompt sentence, relative instruction salience, or model stochastic behavior responsible for that single output remains a hypothesis; offline tests cannot identify it. No live account, destination format, bot membership or credential cause was established for the ambiguous case.

| Dimension | Ambiguous resolver capture | Confirmed format capture | Response-lost capture |
| --- | --- | --- | --- |
| Delivery observation | Structured rejection | Structured rejection | Explicit unknown |
| Fault family | Bounded family investigation; no proven specific credential/permission/configuration cause | Independent controlled-fixture format finding | Delivery ambiguity; retain only supported cause/family |
| Specific cause | Competing destination, permission and credential hypotheses | Format defect within synthetic provenance | Delivery receipt absent; error/SUCCESS cannot resolve it |
| Appropriate action | Targeted investigation; no unsupported correction | Cited bounded correction; no invented replacement or historical configuration | Outcome reconciliation; defect knowledge cannot override delivery route |
| Replay | Not authorized; fixture and existing prerequisites prohibit eligibility | Correction does not authorize replay | Blocked pending reconciliation and existing prerequisites |

The frozen candidate confirmed-defect generation failed with HTTP 503. Its repair preservation is still unmeasured. The current control has a separate `destination_format_invalid` fixture observation; the error wording alone would not establish the defect.

## Experimental changes

- `apps/ai_agent/src/evaluation/causal-diagnosis.ts`: adds `experimental-causal-v2`, preserving the exact v1 builder. V2 keeps v1's three ownership/validation/cause-clause replacements, replaces the experimental explanation as a whole, and explicitly separates delivery, family, cause, action and replay. It does not accumulate another appended patch. No case IDs or expected labels enter instructions.
- The same helper adds `diagnosisConsistencyIssues`: existing disposition/status/kind mappings plus unknown/conflicting delivery precedence and the reciprocal known-outcome check. It reads only routed structured fields, not error strings, aggregate fixture delivery text, SUCCESS, taxonomy, unavailable cause fields or runbooks. Recognized known outcomes are accepted, rejected, not_attempted, not_delivered and not_applicable, including the existing controlled-fixture enum; missing/custom values do not establish known delivery. With wholly absent outcomes, the checker does not invent an outcome or require blanket abstention. It reports violations without changing the object.
- `apps/ai_agent/src/evaluation/causal-pilot.ts`: opt-in `--candidate-v2`, development-split guard, three pairs in alternating order, identical inputs/settings, both advisory checks after preserving the initial sanitized generated object, and no v2 continuation after a stop. V1's original four-slot plan and prompts remain reproducible.
- `apps/ai_agent/src/evaluation/oracle-pilot.ts`: existing experimental provider-audit helper accepts an explicit six-generation ceiling; its default four-generation ceiling remains intact. Endpoint restrictions, separate preflight auditing, actual generation-start spacing and blocking provider-error behavior are reused.
- `apps/ai_agent/tests/causal-consistency.test.ts`: behavioral regressions for the frozen contradiction, valid low-certainty investigation, separately supported bounded repair, wrong defect citation, unknown delivery overriding defect/SUCCESS/error wording, missing outcomes, accepted/rejected conflict, contract mappings, six-slot execution, raw-response preservation, provider stop, no resume, separate token preflight counting and hard generation ceiling. Existing tests also cover blocked input validation, defect removal, disclosure and replay prerequisites.
- `apps/ai_agent/evaluation/causal-diagnosis/review-v2.ts`: offline re-evaluation and provenance writer. New artifacts are confined to this prepared run directory: exact `plan.json`, review JSON records, this report and verification logs. `offline-review-final-2.json` is the final source-hash record; earlier reviews are retained as preparation snapshots.

The consistency check, narrow `repairEvidenceIssue`, service acceptance and semantic review are separate signals. They do not prove taxonomy accuracy, summary truth, appropriate replacement values, all credential/permission repair policies, or general factual correctness. Passing consistency never grants replay eligibility. The existing Phase 11 evaluator is not replaced or duplicated; this is an additional experimental advisory check within the explicitly requested comparison. No concrete master-plan conflict found.

## Offline verification

Initial new-test run failed because the new evaluator export did not exist. After implementation, the final focused causal/consistency/oracle run passed **26 tests, 0 failures**. The broader diagnosis regression run had **52 passes, 1 PostgreSQL skip, 1 existing V4 artifact-hash failure**, across six files, before the final enum-coverage regression was added. The hash failure concerns unchanged `phase-11a-baseline-v4/cases.json`; CRLF-to-LF normalization exactly matches the frozen manifest. Hash evidence is in `offline-review-final-2.json`; no frozen artifact was changed.

Required repository checks were executed: `bun run check-types` passed; `bun run build` passed. Both passed again after adding the final development-split guard. The frontend build came from cache and replayed existing package-manager/SWC and baseline-browser-mapping warnings; AI-agent checks executed. `bun run lint` failed with **9 errors and 22 warnings in unchanged frontend files**. There is no AI-agent lint task. Detailed diagnostics are saved locally in this directory. Sandbox dependency-link access required escalation for offline commands; no provider requests were involved.

Offline re-evaluation applies the same checks to all four frozen v1 slots: current ambiguous output has unsupported repair, candidate ambiguous output has `known_delivery_marked_unknown`, candidate confirmed output remains a preserved generation failure with checks unmeasured, and current confirmed output passes these two narrow checks. Original service acceptance remains recorded separately. All frozen v1 file hashes are recorded and v1 plan reproduction passes.

## Prepared six-generation comparison

| Slots | Exact development case | Pair order |
| --- | --- | --- |
| 1–2 | `f03-permission-ambiguous` | current → candidate v2 |
| 3–4 | `f04-invalid-destination` | candidate v2 → current |
| 5–6 | `f07-provider-response-lost` | current → candidate v2 |

One initial generation per case/variant, **six maximum**. Inputs use existing V6 development captures, verified source/corpus hashes and reconstructed weighted-keyword retrieval parity. Within each pair: model, evidence, retrieval query, passage order/text/citations/hashes, response schema and generation settings are identical. Only instructions differ. Exact current/candidate instructions and input strings are in `plan.json`; per-pair hashes and equality checks are in the final offline review. Labels never enter a model request. No held-out or fresh inputs/labels/results were used.

The model is `gemini-3.5-flash-lite`, `generate-content` API, unchanged provider defaults and exact existing JSON schema. Each call has a 48,000-character prompt cap, **64,000 total tokens**, **4,096 output tokens**, a 15-second deadline including preflight, and a 120-second whole-run deadline. `countTokens` must leave room for the full output ceiling: at most **59,904 preflight input tokens**. Upper generation budget: 384,000 total / 24,576 output tokens across six slots; actual usage must be recorded, and unavailable usage remains null. Token preflights are separately audited: up to six preflights plus six initial generation HTTP requests, never treated as twelve generations.

Sequential execution enforces at least **10 seconds between actual generation starts**, in addition to the runner spacing. Each attempt is written immediately before checks; each final result/failure is written immediately after processing. Failures remain failures. A blocking preflight/provider/network error stops the run; v2 refuses continuation and any repeated started slots. No repair, retry, planner, judge, fallback, replacement or smoke-test generation is configured.

Free-tier prerequisites for a later, separately authorized run:

1. Explicit authorization for this exact new six-slot allocation and use of the selected existing account/key/model.
2. Current account evidence binds `GEMINI_API_KEY` by hash to project `gen-lang-client-0124525712`, this exact model, free tier and free generation. The default confirmation expires after one hour. A prior saved assertion is not new verification; do not enable reuse without explicit authorization. Free-tier eligibility and availability have **not** been checked during this work.
3. An intact saved plan, unchanged source captures/corpus/schema/settings, a new untouched request allocation, and an approved confirmation file. Use the first planned generation to observe availability; no additional generation is allowed for checking it. Abort if the account/model would require paid access.

Offline preparation used:

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/causal-pilot.ts --candidate-v2 --output apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013
```

**Not executed; requires separate authorization and free-tier confirmation:**

```powershell
rtk proxy bun --env-file=apps/ai_agent/.env apps/ai_agent/src/evaluation/causal-pilot.ts --candidate-v2 --output apps/ai_agent/evaluation/causal-diagnosis/runs/prepared-causal-v2-20261013 --execute --confirmation <current-free-tier-confirmation.json>
```

Review the resulting raw outputs manually for observation versus hypothesis, fault-family support, specific-cause certainty, conditional procedure, cited defect provenance, absent replacement values, disclosure and replay restrictions. Neither six single samples nor service/check acceptance establishes reliability.

## Recommendation and scope

Hold HyDE/PageIndex and other retrieval experiments until the explicitly reviewed comparison has measured all three candidate outputs, including the repair-preservation control. V2 is only a hypothesis about better instructions; no live-model fix or production-readiness claim follows from offline checks. If an authorized run hits a blocking error, report the preserved incomplete comparison without replacement generations.

Production prompts, contracts, graph, retrieval, runbooks, labels, dependencies, generated Prisma files, fresh evaluation data and unrelated services were not modified. Pre-existing edits remain excluded. No staging, commits, pushes, merges, branch changes or Graphify operations. **Graphify required: no.** A later bounded diagnosis experiment should use Sol at medium effort; no next phase was started.
