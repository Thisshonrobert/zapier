# D1 — diagnosis improvement (prompt/model)

Plan: [`docs/superpowers/plans/2026-10-26-d1-diagnosis-improvement.md`](../../../../docs/superpowers/plans/2026-10-26-d1-diagnosis-improvement.md).

Retrieval is frozen (R4.4 `retrieval_accepted`, config `a56ae39c…c2805`). D1 changes only the prompt, the prompt-gated output guard, and the model.

## Current phase

| Task | State |
| --- | --- |
| 0 — pattern adjudication + frozen splits | splits frozen; adjudicated (P1–P4 real) ([`pattern-adjudication.md`](pattern-adjudication.md)) |
| 1 — `unsupported_outcome_unknown` guard | complete (option off until prompt v4 wires it in Task 2) |
| 2 — prompt `phase-11a-v4` | complete: prompts 6/6, diagnosis-graph 21/21, check-types pass; full-suite failures identical to the pre-D1 baseline (18/18) |
| 3 — harness: prompt version + dev split | complete: diagnosis-r4 33/33 (incl. 40/40 offline dev retrieval parity), check-types pass; regression diff identical except 2 DB integration tests that need Postgres on :5432 (not running) |
| 4 — dev screening (3.5-flash-lite vs 3.8-flash) | complete: **arm A2 selected** (3.5-flash-lite, revised v4; 37/40 both-agent accepted, 0 safety, no-match 10/10, every family ≥ 2/3). Arm A failed 33/40; arm B dropped ([`dev-decision.md`](dev-decision.md)) |
| 5 — acceptance run + human review | run complete (`accept-v1`: 40/40, schema 40/40, 0 safety, 0 repairs). AI advisory review ([`accept-v1/ai-review-v1.json`](accept-v1/ai-review-v1.json)): 38/40 both-agent accepted (Wilson lower 83.5%), κ on 8 double-label items 1.00, 0 safety flags. **Decision `diagnosis_accepted_ai_reviewed`** under Amendment A1 ([`accept-v1/ai-decision.md`](accept-v1/ai-decision.md)); no human review |
| 6 — integration | complete: serving default `phase-11a-v4` × `gemini-3.5-flash-lite`, `structured-minilm` via local `.env` only ([`CLOSEOUT.md`](CLOSEOUT.md)) |

## Frozen subsets

Generated once by [`select-subsets.ts`](select-subsets.ts) (writes with `wx`; never regenerate). Hashes are in [`subsets-manifest.json`](subsets-manifest.json) and verified by `tests/d1-subsets.test.ts`.

| File | Source | Cases | sha256 |
| --- | --- | --- | --- |
| `dev-subset-v1.json` | R4 development cohort, seed `d1-dev-v1:` | 30 answerable (3 × F01–F10) + 10 no-match (3/3/2/2) | `246947d49a31fcd5a35fb941cad54cbe190970a3327c7da3e7a3ec87f700d68e` |
| `acceptance-subset-v1.json` | R4 sealed holdout minus the 40 R4.5-consumed cases, seed `d1-accept-v1:` | same strata | `5f8faf6c6672758063e0b698b5de77e441a9e710e1fae2ec768a106f815bbe12` |

The dev slice excludes the S cohort and the legacy `nmNN` no-match ids, which have no bucket. The acceptance subset is disjoint from the R4.5 subset. It may be opened only once, after the Task 5 freeze.

**Limitation:** the holdout cases are templated (≈ 10 label signatures). Acceptance cases are near-relatives of the dev and R4.5 cases, so a pass shows the fixes work on this distribution, not that they generalize to real incidents.

## Regression baseline

The full ai_agent suite has 18 failures that already existed before D1, in older evaluation suites that check saved results against the source files. They are listed in [`baseline-test-failures.txt`](baseline-test-failures.txt). After Task 2, [`d1-test-failures.txt`](d1-test-failures.txt) is identical. Re-check after each later task:

```
bun test 2>&1 | grep -E "^\(fail\)" | sed 's/ \[[0-9.]*ms\]//' | sort > evaluation/d1/d1-test-failures.txt
diff evaluation/d1/baseline-test-failures.txt evaluation/d1/d1-test-failures.txt && echo IDENTICAL
```

Note: the R4.5 v1/v2 harness runs hash `graph.ts`, `prompts.ts` and `contracts.ts`. Those changed in D1, so those closed runs can no longer be resumed. That is expected, because both are complete or closed.
