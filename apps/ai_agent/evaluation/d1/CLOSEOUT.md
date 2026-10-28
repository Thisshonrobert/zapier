# D1 — closeout

Plan: [`2026-10-26-d1-diagnosis-improvement.md`](../../../../docs/superpowers/plans/2026-10-26-d1-diagnosis-improvement.md). Outcome: **`diagnosis_accepted_ai_reviewed`** (Amendment A1). It is not a human-reviewed `diagnosis_accepted`.

## Final numbers

| Stage | Config | Accepted by both reviewers | Safety |
| --- | --- | --- | --- |
| R4.5 v2 AI pre-review (starting point) | `gemini-2.5-flash` × `phase-11a-v3` | 22/40 | — |
| Dev arm A (`dev-lite-v1`) | `gemini-3.5-flash-lite` × v4 (first text) | 33/40, F10 1/3, so it failed the rule | 0 |
| Dev arm B (`dev-38flash-v1`) | `gemini-3.8-flash` × v4 | dropped: 4/40 completed, free-tier timeouts | — |
| Dev arm A2 (`dev-lite-v2`), selected | `gemini-3.5-flash-lite` × v4 (revised text) | 37/40, κ 0.79 | 0 |
| **Acceptance (`accept-v1`)** | frozen A2 ([`selected-diagnosis-config.json`](selected-diagnosis-config.json)) | **38/40 = 95%, Wilson lower 83.5%** | 0 |

Acceptance detail ([`accept-v1/ai-decision.md`](accept-v1/ai-decision.md)): 40/40 completed, schema 40/40, 0 repairs, κ 1.00 on the 8 double-label items, 0 unresolved disagreements. F01–F07 and F10 scored 3/3, F08 and F09 2/3, and no-match 10/10. Review Focus: rejection-abstain 12/12, no invented deadline 6/6, injection inert 2/2. Every R4.5 gate passes on the AI scores.

## Integrated into serving (Task 6)

- `src/prompts.ts`: `DIAGNOSIS_PROMPT_VERSION = "phase-11a-v4"`. This also turns on the `unsupported_outcome_unknown` guard. v3 stays byte-identical, so historical replays are unchanged.
- `src/index.ts` and `src/operational-limits.ts`: the default model is now `gemini-3.5-flash-lite` (it was `gemini-2.5-flash`). This model is already on the allow-list, and `disableThinking` stays off for it, matching the frozen config. `GEMINI_MODEL` still overrides the default.
- Retrieval: `RUNBOOK_RETRIEVAL_METHOD=structured-minilm` is set in the local, git-ignored `apps/ai_agent/.env` only. The code default in `runbook-retriever.ts` stays `minilm-original`. To roll back, set `RUNBOOK_RETRIEVAL_METHOD=minilm-original` or `keyword` and restart. Any deployed environment needs the same variable set by hand.
- `src/evaluation/model-experiment.ts` (the Phase 11A harness) now pins `phase-11a-v3` instead of following the serving default. Without the pin, v4's guard fires repairs on its fixtures (26 prompts instead of 16), and its manifest enum rejects v4. Its frozen artifacts are v3.
- Tests: `tests/prompts.test.ts` expects v4, and its v3 repair-guidance check names `phase-11a-v3` explicitly. The `tests/diagnosis-graph.test.ts` test "default service keeps v3" is now "explicit v3 service…": it passes `promptVersion: "phase-11a-v3"` and still covers v3 behavior.
- `operational-limits.ts` allow-list unchanged (no 3.8-flash). There is no `.env.example`.

## Verification

- `bun run check-types`: pass.
- Full ai_agent suite: compared against the exact pre-session tree, with the same command and both run without the two Postgres integration files (`command-center-db`, `events-db`), which hang with no database on :5432. Pre-session: 41 failures. Now: 40. None are new, and one is fixed (`v4 instructions add the four delivery and grounding rules`). The 40 are in [`d1-test-failures.txt`](d1-test-failures.txt).
- The 18-line [`baseline-test-failures.txt`](baseline-test-failures.txt) no longer matches either run. That drift (R2 label checks, frozen replays, pilot suites) already existed before Task 6 and is not caused by it. Re-baselining it is a separate task.
- Bun auto-loads `apps/ai_agent/.env`. Forcing the old `GEMINI_MODEL` and `RUNBOOK_RETRIEVAL_METHOD` values made no difference to the failures.

## Limitations

- **AI review only.** The operator declined human review of the 40 acceptance items. Two blinded AI reviewers (forward and reverse order, slugs redacted) stood in, and the amendment was made after their scores were seen. No record claims human review: `review-v1.json` and the harness `decision.md` are untouched.
- **Clustered cases.** The holdout is templated, with about 10 label signatures. Acceptance cases are near-relatives of the dev cases, and the A2 text was written from the 40 dev rejections.
- **Simulated fixtures.** A pass shows the fixes work on this distribution, not on real incidents.
- **Known residuals.** F09 routes a misconfigured dead-letter target to the owner when the runbook assigns it to engineering. F08 split on a stale-approval escalation.
- `gemini-3.8-flash` was never measured to completion, so this is no evidence for or against it.

## Manual-Git handoff

Nothing is committed. Per [`docs/manualgit_handoff.md`](../../../../docs/manualgit_handoff.md), the user stages and commits. Graphify required: yes, after merge (milestone).

Task 6 files (Tasks 0–5 are also uncommitted and belong to the same D1 bundle):

- Phase implementation: `apps/ai_agent/src/prompts.ts`, `apps/ai_agent/src/index.ts`, `apps/ai_agent/src/operational-limits.ts`, `apps/ai_agent/src/evaluation/model-experiment.ts`, `apps/ai_agent/tests/prompts.test.ts`, `apps/ai_agent/tests/diagnosis-graph.test.ts`
- Documentation: `apps/ai_agent/evaluation/d1/CLOSEOUT.md`, `apps/ai_agent/evaluation/d1/README.md`, `apps/ai_agent/evaluation/d1/d1-test-failures.txt`, `docs/superpowers/plans/2026-10-26-d1-diagnosis-improvement.md`
- Excluded: `apps/ai_agent/.env` (git-ignored, local only)

```
git add -- apps/ai_agent/src/prompts.ts apps/ai_agent/src/index.ts apps/ai_agent/src/operational-limits.ts apps/ai_agent/src/evaluation/model-experiment.ts apps/ai_agent/tests/prompts.test.ts apps/ai_agent/tests/diagnosis-graph.test.ts apps/ai_agent/evaluation/d1/CLOSEOUT.md apps/ai_agent/evaluation/d1/README.md apps/ai_agent/evaluation/d1/d1-test-failures.txt docs/superpowers/plans/2026-10-26-d1-diagnosis-improvement.md
```

Suggested subject: `integrate D1: serve phase-11a-v4 on gemini-3.5-flash-lite (D1 Task 6)`
