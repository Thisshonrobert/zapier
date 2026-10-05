# Phase 12 calibration status

Version: phase12-calibration-status-v1. Reviewed 2026-10-05.

Implementation verified; the approved real-model pilot is captured and reproduced offline. Independent-human usefulness remains pending. Phase 12 is optional and advisory. These artifacts do not establish replay authority, calibrated human quality, or release confidence.

## Approved live pilot

The user explicitly approved the prepared payload and Google Gemini destination after the earlier automatic-review rejection. Eight `gemini-3.5-flash-lite` calls ran on four development-only synthetic pairs, without repairs, fallback, extra calls or held-out evaluation. `judge-live.json`, `.md` and `.votes.json` retain the actual outputs and typed failures. Both live and replay commands exit 1 because Q2 contains invalid output; this is not a clean successful quality run.

Q1 is inconclusive (`equal_quality`); Q2 is inconclusive (`invalid_output`); Q3 consistently chooses the cautious left answer; Q4 consistently chooses the concise left answer. Conclusive coverage is 2/4. The independent surrogate review agrees on 1/2 conclusive judgments (50%); Q4 is a consistent judge preference despite the surrogate's equal-quality assessment. This does not establish human agreement or eliminate verbosity bias.

Measured usage is 11,480 input and 1,400 output tokens (12,880 total); cost remains unpriced/null. Human labels remain null. See `surrogate-comparison.json` and `.md` for provenance, approval destination/body hashes, caveats and per-pair comparison.

Initial offline replay exposed loss of measured usage on failure throws. The focused fix preserves captured failure usage via `JudgeModelError`, with a regression that failed before the fix and passed afterward. `judge-live-replayed-fixed.json`, `.md` and `.votes.json` reproduce actual verdicts, reasons, invocation counts, votes and usage; newly measured latency is excluded. The earlier `judge-live-replayed.*` artifacts retain the pre-fix accounting result and must not be used as the verified replay.

Final verification after the fix: all 18 judge tests passed; the five-file regression run recorded 65 passes and one existing provider-outage test exceeding its default five-second timeout during concurrent root verification. That test passed in isolation in 703 ms with a 15-second test-harness ceiling. Root type check and build passed (agent compiled; frontend build cache reused). Root lint reproduced 9 existing errors and 22 warnings in unchanged frontend files. No full-suite or lint-pass claim is made.

## Independent agent review

`agent-review.json` records a blind AGENT/SURROGATE review of `human-review.md`, completed before inspecting scripted votes or judge preferences: Q1=B, Q2=inconclusive, Q3=A, Q4=inconclusive. Criterion rationales and source hashes are included. This is agent evidence, never human review.

`pairs.agent-labelled.json` is a separate versioned review envelope with `agent_winner`; every `human_winner` remains null. It intentionally is not runner-compatible: the strict runner schema rejects the additional agent field. It must not be supplied to the runner or counted as human calibration. `pairs.unlabelled.json`, `human-review.md`, and `provenance.json` were preserved. The original dataset's normalized SHA-256 matches `provenance.json`.

## Earlier offline verification (before the live pilot)

- Fresh focused verification: 65 tests passed, 0 failed across semantic-judge, evaluation-report, model-experiment, retrieval-experiment, and gemini-model; all provider transports in tests are stubbed.
- Source review verified ordered atomic criteria, swapped-order normalization, no tie verdict, explicit inconclusive/error handling, strict evidence references, bounded live mode, cancellation capture, hash-bound frozen replay, independent report denominators and advisory authority. No application-code changes were necessary.
- Scripted control reasons reproduced: `agreed`, `order_disagreement`, `equal_quality`; zero human labels. Captured votes replayed the same verdicts and invocation counts; callback latency was excluded from equality because it is freshly measured.
- A separate synthetic/test-only projection exercised the legacy `human_winner` counter mechanism on the three checked-in controls: labelled=3, conclusive=1, agreements=0, coverage=1/3. These deliberately scripted labels and votes are only a harness test, not agent-pilot or human-calibration results. Labels left exact judge prompts unchanged.
- All four pilot pairs pass the strict unlabelled dataset schema; agent-labelled content preserves the original evidence and answer content, and is rejected as a runner dataset as intended.
- Fresh root `bun run check-types` and `bun run build` exited 0 (agent compiled, frontend build cache reused). Fresh root lint exited 1 with 9 existing frontend errors and 22 warnings in unchanged source files, matching the prior baseline counts; do not describe lint as passing.
- Initial sandbox runs encountered Bun directory/dependency permission errors; approved local verification outside the sandbox resolved test/type/build execution. These local approvals did not authorize external model transfer.

Reproduction: `rtk proxy bun .tmp-turbo-user/phase12-offline-verification.ts`. Ignored local outputs are `.tmp-turbo-user/phase12-offline-control-verified.json`, `.md`, `.votes.json`, and `phase12-offline-verification-results.json`. They are explicitly scripted/test-only and are excluded from the phase bundle. No real-model judge report was created.

## Remaining gates

1. Obtain independent human A/B/inconclusive review of the anonymized pairs before revealing judge preferences; store reviewer/date/provenance and a separate human-labelled dataset. Agent labels cannot satisfy this gate. Judge results are now available, so a reviewer must avoid them to remain blind.
2. Compare actual human labels with actual real-model results and review disagreements, grounding, abstention, order sensitivity and verbosity behavior. Four preselected development-only pairs, including authored perturbations and same-family model outputs, cannot support representative or statistical claims. Do not tune against held-out cases or silently declare a usefulness threshold.
3. Review the invalid-output pair and surrogate disagreement before considering further assessment. No additional paid run or tuning is included in this capture. Approval and bounded capture/replay gates are now satisfied; earlier zero-call/blocked statements above and in `egress-preflight.json` describe the historical preapproval snapshot only.

No staging, commits, pushes, branch operations or Graphify regeneration were performed. Graphify required: yes for the completed, merged Phase 12 milestone; no refresh is authorized or appropriate now while calibration and clean updated-main prerequisites remain pending.
