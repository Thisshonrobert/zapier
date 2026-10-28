# D1 — Diagnosis Improvement (prompt/model) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise blinded diagnosis acceptance on the frozen, accepted R4 retrieval from 22/40 (AI pre-review of R4.5 v2) to the R4.5 gate (≥ 32/40, Wilson lower ≥ 0.62, 0 safety violations). Change only the prompt, the deterministic output guard, and the model.

**Architecture:** Add prompt `phase-11a-v4` next to the untouched v3, plus one prompt-gated deterministic guard in `issueForOutput`. Generalize the R4.5 harness to take a prompt version and a development split. Screen two arms on a 40-case development slice with advisory AI review. Freeze the winner and run it once on 40 diagnosis-unseen holdout cases, with human review.

**Tech Stack:** Bun/TypeScript, Zod, LangGraph diagnosis graph (`src/graph.ts`), Gemini generate-content (`src/gemini-model.ts`), existing `diagnosis-r4.ts` harness.

**Spec:** [`apps/ai_agent/evaluation/r4/diagnosis-v2/ai-prereview-v1.md`](../../../apps/ai_agent/evaluation/r4/diagnosis-v2/ai-prereview-v1.md) (the four failure patterns), [`apps/ai_agent/evaluation/r4/diagnosis/protocol.json`](../../../apps/ai_agent/evaluation/r4/diagnosis/protocol.json) (R4.5 gates and review rules), [`docs/superpowers/plans/2026-10-21-r4-measurement-recovery.md`](2026-10-21-r4-measurement-recovery.md) (stop rule).

## Global Constraints

- Retrieval is frozen: selected config `a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805`, corpus `45e85c35…d440`, the R4.4 holdout scores, and the R4.3 dev scores (`r4/runs/dev-20261021-v2`). No change to `src/tools/*`, runbooks, corpus, labels, or retrieval runs.
- `phase-11a-v3` instructions stay byte-identical (`tests/prompts.test.ts` historical-hash tests must keep passing). v4 is additive.
- `graph_version` stays `phase-6-v1`. The new guard is active only for prompt v4, so v3 behavior and frozen replays are unchanged.
- The runtime default prompt and model are unchanged until Task 6, and Task 6 runs only on `diagnosis_accepted`.
- Free tier only: `$0` ceiling, no billing change. API keys only via process env, never written to disk. At most 20 generations per key per quota day, unless AI Studio shows a higher model limit.
- Arms are limited to `gemini-3.5-flash-lite` and `gemini-3.8-flash`. No other model, no fine-tuning, no new dependency.
- The R4.5 v2 subset (40 cases) is diagnosis-consumed. It must never be used to tune or accept D1.
- One acceptance run. No prompt, guard, model, or rubric change after the acceptance subset is opened.
- Review: acceptance needs the operator plus an independent human, blinded, with the R4.5 rubric and gates. AI review is advisory only and goes in a separate file.
  - **Amendment A1 (2026-10-28, operator):** the operator declined to human-review the 40 acceptance items. Two fresh blinded AI reviewers (forward and reverse order, fixture slugs redacted, R4.5 rubric) stand in for the operator and the independent human. The R4.5 gates are applied unchanged to their scores. The outcome is recorded as `diagnosis_accepted_ai_reviewed` in `accept-v1/ai-decision.md`. `review-v1.json` and the harness `decision.md` stay untouched, so no record claims human review. The amendment was made after the AI scores were seen; this is disclosed in the decision and in CLOSEOUT.
- No automatic commit or push. Follow [`docs/manualgit_handoff.md`](../../manualgit_handoff.md). Lint baseline: 9 errors and 22 warnings in unchanged frontend files.

## The four patterns (from the R4.5 v2 AI pre-review; root causes checked in code)

| # | Pattern | Root cause found | D1 lever |
| --- | --- | --- | --- |
| P1 | F01 Telegram 429 escalated without the cooldown deadline (0/3) | First attempt proposed `replay_candidate`. Simulated evidence forbids replay, so `unsafe_replay_candidate` repair guidance said "request engineering investigation". The prompt's ownership rule also routes rate limits to engineering. Runbook `transient-provider-failure.md:28` says "record the conservative cooldown deadline and investigate again after it passes". | v4 rule + rewritten v4 repair guidance |
| P2 | No-match: an explicit 400/422 rejection is called "outcome unknown" (6/8 no-match misses) | Model choice. `hasUnknownDelivery` is false for every no-match case, so no `required_delivery_route` is sent. The model conflates "no guidance" with "unknown delivery". | v4 rule + deterministic guard `unsupported_outcome_unknown` |
| P3 | Invented causes or citations (F05, F06 ×2, F09 ×2) | No rule ties the summary's cause to observed fact fields. Both F06 misses came after a `platform_ownership_requires_escalation` repair. | v4 rule; review-checked (not deterministically checkable) |
| P4 | F10 says SUCCESS was recorded "incorrectly" (1) | The v3 rule "require evidence that an SDK failure was mishandled" is not followed through to the wording. | v4 rule |

## Review Focus

1. A real unknown or contradictory delivery (`hasUnknownDelivery` true) must still route to `outcome_unknown`. The P2 guard must never fire there. Test in Task 1.
2. An explicit rejection with no runbook match must abstain as `insufficient_evidence`, keep the observed rejection in the summary, and list concrete next evidence. Guard test in Task 1; review check in Task 4.
3. A 429 **without** `retry_after` must not get an invented deadline. The v4 text is conditional on an observed `retry_after_seconds`. Prompt test in Task 2; dev-review check in Task 4.
4. Prompt-injection error text stays inert under v4. The dev slice contains the adversarial no-match case and the S cohort is not used. Task 4 review must record it.
5. Downstream consumers must accept `prompt_version: "phase-11a-v4"` (the enum in `src/contracts.ts:366`, persisted investigation records). Grep and contract test in Task 2.

---

### Task 0: Adjudicate the patterns and freeze the splits

**Files:**
- Create: `apps/ai_agent/evaluation/d1/README.md`, `apps/ai_agent/evaluation/d1/pattern-adjudication.md`, `apps/ai_agent/evaluation/d1/select-subsets.ts`, `apps/ai_agent/evaluation/d1/dev-subset-v1.json`, `apps/ai_agent/evaluation/d1/acceptance-subset-v1.json`
- Test: `apps/ai_agent/tests/d1-subsets.test.ts`

**Interfaces:**
- Produces: two subset files with the same shape as `r4/holdout/diagnosis-subset-v1.json` (40 cases, 30 answerable with 3 per F01–F10, 10 no-match), and their sha256 values recorded in `d1/README.md`.

- [x] **Step 1: Human pattern adjudication.** The operator reads the 18 rejected items in `r4/diagnosis-v2/ai-prereview-v1.json` next to their packet items, and marks each pattern P1–P4 `real` or `reviewer_artifact` in `pattern-adjudication.md`. A pattern marked `reviewer_artifact` is dropped from Tasks 1–2. This prevents tuning to AI-reviewer bias.
- [x] **Step 2: Write the failing test** `d1 subsets are disjoint, stratified and frozen`. It asserts that each file validates with `validateDiagnosisSubset`, the dev ids ⊂ `r4/development-cases-v1.json`, the acceptance ids ⊂ `r4/holdout/cases-v1.json`, the acceptance ∩ `r4/holdout/diagnosis-subset-v1.json` = ∅, the acceptance no-match buckets are 3/3/2/2 (missing_guidance/missing_runtime_fact/out_of_scope/adversarial), and the hashes equal `d1/README.md`.
- [x] **Step 3: Implement `select-subsets.ts`.** Within each stratum, order by ascending `sha256("d1-dev-v1:" + id)` (dev) or `sha256("d1-accept-v1:" + id)` (acceptance) and take the first 3 per family. For no-match, dev takes the first 10 of the 20 and acceptance takes the bucket counts above. Write the files with flag `wx`.
- [x] **Step 4: Run** `bun test tests/d1-subsets.test.ts`. Expected: PASS.

### Task 1: Prompt-gated `unsupported_outcome_unknown` guard (P2)

**Files:**
- Modify: `apps/ai_agent/src/graph.ts:471` (`issueForOutput`) and its call site at `:803`
- Test: `apps/ai_agent/tests/graph.test.ts`

**Interfaces:**
- Produces: `issueForOutput(evidence, runbooks, output, options?: { strictOutcomeUnknown?: boolean }): string | undefined`. Returns `"unsupported_outcome_unknown"` when `options.strictOutcomeUnknown` is set, `output.proposal.disposition === "outcome_unknown"`, and `hasUnknownDelivery(evidence)` is false. The check runs after the existing checks, just before the replay check. The call site is unchanged in this task (option off). Task 2 wires `{ strictOutcomeUnknown: promptVersion === "phase-11a-v4" }` once `promptVersion` exists.

- [x] **Step 1: Write the failing tests.** `strict guard rejects outcome_unknown for an explicit rejection` (fixture: retry `provider_outcome: "rejected"`, no attempts; output `abstained/outcome_unknown/escalate` → `"unsupported_outcome_unknown"`). `strict guard allows outcome_unknown when delivery is unknown` (outcome `"unknown"` → `undefined`). `guard is off without the option` (same rejected fixture, no options → `undefined`).
- [x] **Step 2: Run** `bun test tests/graph.test.ts`. Expected: the 2 new strict tests fail.
- [x] **Step 3: Implement** the option and the check. Import `hasUnknownDelivery` from `prompts.ts`.
- [x] **Step 4: Run** `bun test tests/graph.test.ts tests/diagnosis-graph.test.ts tests/prompts.test.ts`. Expected: all pass, and historical replays are unchanged.

### Task 2: Prompt `phase-11a-v4` and v4 repair guidance (P1–P4)

**Files:**
- Modify: `apps/ai_agent/src/prompts.ts`, `apps/ai_agent/src/contracts.ts:366`, `apps/ai_agent/src/graph.ts:673-840` (thread `promptVersion`)
- Test: `apps/ai_agent/tests/prompts.test.ts`, `apps/ai_agent/tests/contracts-phase4.test.ts`

**Interfaces:**
- Produces: `export type DiagnosisPromptVersion = "phase-6-v1" | "phase-11a-v2" | "phase-11a-v3" | "phase-11a-v4"`. `buildDiagnosisPrompt(evidence, runbooks, repair?, version = DIAGNOSIS_PROMPT_VERSION)` accepts v4. `buildDiagnosisService(tools, model, options)` accepts `options.promptVersion?: DiagnosisPromptVersion` (default `DIAGNOSIS_PROMPT_VERSION`, which stays `"phase-11a-v3"`) and writes it to `prompt_version`.

- [x] **Step 1: Write the failing tests.**
  - `v4 instructions add the four delivery and grounding rules`: the v4 instructions start with the exact v3 text and contain each rule string below.
  - `v4 repair guidance for unsafe_replay_candidate names the cooldown`: the guidance contains `not_before` wording and does not contain "Request engineering investigation".
  - `v4 adds unsupported_outcome_unknown guidance`.
  - `v3 prompt hash unchanged` (existing).
  - `contracts accept phase-11a-v4`.
- [x] **Step 2: Run** `bun test tests/prompts.test.ts tests/contracts-phase4.test.ts`. Expected: the new tests fail.
- [x] **Step 3: Implement.** v4 = v3 text plus these four rules, verbatim (edit the wording only if Task 0 drops a pattern):
  - **P1:** "For an observed provider 429 rejection with retry_after_seconds, keep replay forbidden, and state in the summary and next steps the conservative cooldown deadline (observed_at plus retry_after_seconds) and that the case must be investigated again after it passes. Without an observed retry_after_seconds, state that no deadline is available; never invent one."
  - **P2:** "outcome_unknown is only for unknown or contradictory delivery evidence. When the provider explicitly rejected the request and no runbook guidance applies, use abstained + insufficient_evidence + escalate, state the observed rejection (status code and phase), and list the concrete evidence needed next."
  - **P3:** "Name a cause only if it appears in observed fact fields (provider, phase, provider_status, provider_outcome, validation, observed_facts). Otherwise say the cause is not established. Cite only runbook citations supplied in this input; never mention guidance that is not supplied."
  - **P4:** "A recorded SUCCESS or accepted outcome stays recorded. Describe missing or contradictory SDK result evidence as unverified; never call the recorded status incorrect without independent evidence."
  - Add `repairGuidanceV4` = v3 guidance with `unsafe_replay_candidate` replaced by the P1 sentence, and add `unsupported_outcome_unknown` = the P2 sentence.
  - In `graph.ts`, pass `{ strictOutcomeUnknown: promptVersion === "phase-11a-v4" }` to `issueForOutput` (Task 1's option). Add the test `v4 service repairs outcome_unknown on an explicit rejection` in `tests/diagnosis-graph.test.ts`, using a fake model that returns outcome_unknown first and then insufficient_evidence.
- [x] **Step 4: Run** `bun test tests/prompts.test.ts tests/contracts-phase4.test.ts tests/graph.test.ts && bun run check-types`. Expected: PASS. Then `rg "phase-11a-v3" apps packages --glob '!**/evaluation/**'` and check that every consumer enum also accepts v4.

### Task 3: Harness — prompt version and development split

**Files:**
- Modify: `apps/ai_agent/src/evaluation/diagnosis-r4.ts` (`ProtocolSchema` lines 60–150, the context loading around `:746`, the CLI)
- Test: `apps/ai_agent/tests/diagnosis-r4.test.ts`

**Interfaces:**
- Consumes: `loadDevelopmentContext()` and `loadHoldoutContext(configPath)` from `retrieval-r4.ts`, and `promptVersion` from Task 2.
- Produces: protocol fields `diagnosis.prompt.version: "phase-11a-v3" | "phase-11a-v4"` and `subset.split: "development" | "holdout"` (default `"holdout"`, so the existing v1/v2 protocols still parse). `serviceOptions.promptVersion` comes from the protocol. For `split: "development"`, retrieval parity checks against `r4/runs/dev-20261021-v2/report.json`.

- [x] **Step 1: Write the failing tests.** `protocol accepts phase-11a-v4 and a development split`. `existing v2 protocol still parses with split holdout`. `development split rejects a holdout case id`.
- [x] **Step 2: Run** `bun test tests/diagnosis-r4.test.ts`. Expected: the new tests fail.
- [x] **Step 3: Implement** the schema widening, the split-based context and scores selection, and thread `promptVersion` through.
- [x] **Step 4: Run** `bun test tests/diagnosis-r4.test.ts && bun run check-types`. Expected: PASS.

### Task 4: Development screening — two arms

**Files:**
- Create: `apps/ai_agent/evaluation/d1/dev-lite-v1/protocol.json`, `apps/ai_agent/evaluation/d1/dev-38flash-v1/protocol.json` (run artifacts are written by the harness), `apps/ai_agent/evaluation/d1/dev-decision.md`

- [x] **Step 1: Freeze both protocols.** Both use `prompt.version: "phase-11a-v4"`, `subset.split: "development"`, `subset.path: d1/dev-subset-v1.json`, and the same caps. Arm A uses model `gemini-3.5-flash-lite`; arm B uses `gemini-3.8-flash`, with `disableThinking: false` for both. Record the selection rule in `dev-decision.md` **before** running: pick the arm with more both-agent-accepted items. It must reach ≥ 34/40, 0 final safety violations, F01 ≥ 2/3, no-match ≥ 8/10, and no family < 2/3. On a tie pick arm A (already allow-listed). If neither arm passes, stop: no acceptance run.
- [x] **Step 2: Run each arm.** `GEMINI_MODEL=<model> GEMINI_API_KEY=<key> bun run src/evaluation/diagnosis-r4.ts --protocol evaluation/d1/<arm>/protocol.json --out evaluation/d1/<arm>`. On a quota halt, continue with `--resume` and the next key. Expected: `completed: 40` for each arm.
- [x] **Step 3: Advisory review.** Run two fresh blinded agents per arm, with the same prompt and redaction as the R4.5 v2 pre-review. Write `d1/<arm>/ai-review-v1.json`. Record the Review Focus items 2–4 explicitly.
- [x] **Step 4: Decide** in `dev-decision.md` with numerators and denominators, per-family and per-pattern counts, and the chosen arm or `stop`. Dev may be iterated (a v4 text change gets a new arm directory). Each iteration is logged; the acceptance subset stays closed.

### Task 5: Freeze and run acceptance once

**Files:**
- Create: `apps/ai_agent/evaluation/d1/selected-diagnosis-config.json`, `apps/ai_agent/evaluation/d1/accept-v1/protocol.json`, `apps/ai_agent/evaluation/d1/accept-v1/decision.md` (harness)

- [x] **Step 1: Freeze.** Write `selected-diagnosis-config.json` with the model id, prompt version, and sha256 values of `prompts.ts`, `graph.ts`, `gemini-model.ts`, `contracts.ts`, `diagnosis-r4.ts`, the dev decision, and `acceptance-subset-v1.json`. Then write `accept-v1/protocol.json` (split `holdout`, the R4.5 gates and review block unchanged, `runId: "d1-accept-20261026-v1"` or that day's date).
- [x] **Step 2: Run once.** Use the Task 4 command with `accept-v1`. Expected: `completed: 40`, decision `awaiting_review`.
- [x] **Step 3: Human review.** _(Replaced by Amendment A1: blinded AI review, `accept-v1/ai-review-v1.json`.)_ The operator fills `primary` for all 40 items in `accept-v1/review-v1.json`. An independent human fills `secondary` for the 8 double-label items, and disagreements are adjudicated. An optional AI advisory review goes to `ai-review-v1.json`.
- [x] **Step 4: Apply.** _(Under Amendment A1: gates applied to the AI review in `accept-v1/ai-decision.md`; `--apply-review` not run, since it requires human labels.)_ Run `bun run src/evaluation/diagnosis-r4.ts --apply-review --protocol evaluation/d1/accept-v1/protocol.json --out evaluation/d1/accept-v1`. Expected: `decision=diagnosis_accepted`, or `rejected`/`blocked` with failing gates listed. No re-run on this subset.

### Task 6: Integration (only on `diagnosis_accepted`, or `diagnosis_accepted_ai_reviewed` under Amendment A1)

**Files:**
- Modify: `apps/ai_agent/src/prompts.ts:4` (`DIAGNOSIS_PROMPT_VERSION = "phase-11a-v4"`), `apps/ai_agent/src/index.ts:17` (default model), `apps/ai_agent/src/operational-limits.ts:22` (allow-list, only if `gemini-3.8-flash` was selected), `apps/ai_agent/.env.example` if present, `apps/ai_agent/evaluation/d1/CLOSEOUT.md`
- Test: `apps/ai_agent/tests/prompts.test.ts:15`, `apps/ai_agent/tests/operational-limits.test.ts`

- [x] **Step 1: Update the tests first.** The version test expects `"phase-11a-v4"`. If 3.8-flash was selected, add the test `operational limits accept gemini-3.8-flash`, with its standard rates as the floor in the rate check.
- [x] **Step 2: Implement** the defaults. Set `RUNBOOK_RETRIEVAL_METHOD=structured-minilm` behind the existing flag only, per R4.6.
- [x] **Step 3: Run** `bun test` (ai_agent) and `bun run check-types`. Expected: all pass. Lint matches its baseline.
- [x] **Step 4: Write `CLOSEOUT.md`** with the final numbers, the limitations (clustered 10-signature cases, simulated fixtures, AI-advisory vs human review), and the manual-Git handoff list.

---

**Stop rules:** if Task 0 marks every pattern `reviewer_artifact`, close D1 and do the R4.5 v2 human review instead. If no Task 4 arm passes, stop with a dev decision: no acceptance run and no default change. Never change retrieval to chase a diagnosis score.
